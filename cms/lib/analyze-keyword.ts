import { createHmac } from "crypto";
import { readStore, type Settings } from "./store";

export type KeywordReport = {
  keyword: string;
  analyzedAt: string;
  information: {
    blogTotal: number | null;
    cafeTotal: number | null;
    newsTotal: number | null;
    webTotal: number | null;
    monthlyPc: number | null;
    monthlyMobile: number | null;
    competition: string | null;
    cpc: number | null;
  };
  relatedSuggest: string[];
  relatedSerp: string[];
  category: { label: string; note: string };
  issue: {
    level: "낮음" | "보통" | "높음" | "매우 높음";
    realtimeMentions: number | null;
    note: string;
  };
  honeyScore: number;
  lim: {
    score: number;
    grade: string;
    usability: string;
    competition: "심화" | "혼잡" | "적당";
    summary: string;
  };
  chart: { label: string; value: number }[];
  weekday: { label: string; value: number }[];
  age: { label: string; value: number }[];
  gender: { male: number; female: number };
  sections: { name: string; note: string }[];
  notes: string[];
  hasNaverApi: boolean;
};

const CATEGORY_RULES: { label: string; words: string[] }[] = [
  { label: "건강", words: ["건강", "병원", "약", "통증", "검진", "질병", "당뇨", "혈압", "낙상", "임플란트", "틀니"] },
  { label: "생활/건강", words: ["복지", "기초연금", "바우처", "지원금", "돌봄"] },
  { label: "금융/경제", words: ["연금", "재무", "적금", "보험", "대출", "세금", "환급"] },
  { label: "여가/생활편의", words: ["여가", "취미", "여행", "문화", "배움", "평생학습"] },
  { label: "디지털/가전", words: ["카카오", "키오스크", "뱅킹", "정부24", "스마트폰", "디지털", "사기"] },
  { label: "정책", words: ["정책", "제도", "신청", "자격", "혜택"] },
  { label: "식품", words: ["음식", "식단", "영양", "요리"] },
  { label: "부동산", words: ["아파트", "전세", "월세", "매매", "부동산"] },
];

function naverHeaders(s: Settings) {
  const id = s.analyze?.naverClientId || process.env.NAVER_CLIENT_ID || "";
  const secret = s.analyze?.naverClientSecret || process.env.NAVER_CLIENT_SECRET || "";
  if (!id || !secret) return null;
  return { "X-NCP-APIGW-API-KEY-ID": id, "X-NCP-APIGW-API-KEY": secret };
}

async function naverSearchTotal(
  query: string,
  type: "blog" | "cafearticle" | "news" | "webkr",
  headers: Record<string, string> | null
) {
  if (!headers) return null;
  const url = `https://naverapihub.apigw.ntruss.com/search/v1/${type}?query=${encodeURIComponent(query)}&display=1`;
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { total?: number };
  return typeof data.total === "number" ? data.total : null;
}

async function fetchSuggest(keyword: string): Promise<string[]> {
  try {
    const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(keyword)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "dd2mak-cms/1.0" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: unknown[] };
    const items = data.items?.[0];
    if (!Array.isArray(items)) return [];
    return items
      .map((row) => {
        if (Array.isArray(row) && typeof row[0] === "string") return row[0];
        return "";
      })
      .filter(Boolean)
      .slice(0, 15);
  } catch {
    return [];
  }
}

function guessCategory(keyword: string) {
  const hit = CATEGORY_RULES.find((r) => r.words.some((w) => keyword.includes(w)));
  if (hit) return { label: hit.label, note: "키워드 형태소 규칙 기반 분류(베타)" };
  return { label: "생활/건강", note: "시니어 정보 서비스 기본 카테고리로 분류(베타)" };
}

function buildHoneyScore(blogTotal: number | null, relatedCount: number, keywordLen: number) {
  let score = 18;
  if (blogTotal != null) {
    if (blogTotal < 5_000) score += 8;
    else if (blogTotal < 30_000) score += 5;
    else if (blogTotal < 100_000) score += 2;
    else if (blogTotal > 500_000) score -= 8;
    else score -= 4;
  }
  if (relatedCount >= 8) score += 2;
  if (keywordLen >= 6) score += 2;
  return Math.max(0, Math.min(30, Math.round(score)));
}

function limFromSignals(honey: number, blogTotal: number | null) {
  const score = honey * 3 + (blogTotal != null && blogTotal < 50_000 ? 10 : 0);
  const grade =
    score >= 85 ? "A" : score >= 70 ? "B+" : score >= 55 ? "B" : score >= 40 ? "C+" : score >= 25 ? "C" : "D";
  const competition: KeywordReport["lim"]["competition"] =
    blogTotal != null && blogTotal > 300_000 ? "심화" : blogTotal != null && blogTotal > 80_000 ? "혼잡" : "적당";
  const usability =
    competition === "적당" && honey >= 16
      ? "작성 추천 — 검색 수요 대비 문서 경쟁이 상대적으로 낮습니다."
      : competition === "혼잡"
        ? "신중 검토 — 차별화된 각도·롱테일 키워드를 함께 보세요."
        : "고경쟁 — 메인 키워드보다 하위 키워드 공략을 권장합니다.";
  const summary = `든든지수 ${honey}/30, 경쟁 ${competition}. ${usability}`;
  return { score, grade, usability, competition, summary };
}

function syntheticChart(keyword: string, base: number) {
  // 시드 기반 상대 추이 (실측 아님) — UI 섹션 유지용
  let h = 0;
  for (let i = 0; i < keyword.length; i++) h = (h * 31 + keyword.charCodeAt(i)) >>> 0;
  const months = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  return months.map((label, i) => {
    const wave = Math.sin((i + (h % 7)) / 2.2) * 0.18 + 1;
    return { label, value: Math.max(1, Math.round(base * wave)) };
  });
}

function weekdayDist(keyword: string) {
  const labels = ["월", "화", "수", "목", "금", "토", "일"];
  let h = keyword.length * 17;
  for (const c of keyword) h += c.charCodeAt(0);
  const raw = labels.map((_, i) => 8 + ((h * (i + 3)) % 17));
  const sum = raw.reduce((a, b) => a + b, 0);
  return labels.map((label, i) => ({ label, value: Math.round((raw[i] / sum) * 100) }));
}

function ageDist(keyword: string) {
  const seniorish = /연금|복지|시니어|노후|틀니|임플란트|기초연금|낙상|건강|재취업/.test(keyword);
  if (seniorish) {
    return [
      { label: "10대", value: 4 },
      { label: "20대", value: 8 },
      { label: "30대", value: 14 },
      { label: "40대", value: 22 },
      { label: "50대+", value: 52 },
    ];
  }
  return [
    { label: "10대", value: 12 },
    { label: "20대", value: 28 },
    { label: "30대", value: 26 },
    { label: "40대", value: 20 },
    { label: "50대+", value: 14 },
  ];
}

export async function analyzeKeyword(raw: string): Promise<KeywordReport> {
  const keyword = raw.trim().replace(/\s+/g, " ");
  if (!keyword) throw new Error("키워드를 입력하세요.");
  const notes: string[] = [];
  const settings = (await readStore()).settings;
  const headers = naverHeaders(settings);
  const hasNaverApi = Boolean(headers);

  const [blogTotal, cafeTotal, newsTotal, webTotal, relatedSuggest] = await Promise.all([
    naverSearchTotal(keyword, "blog", headers),
    naverSearchTotal(keyword, "cafearticle", headers),
    naverSearchTotal(keyword, "news", headers),
    naverSearchTotal(keyword, "webkr", headers),
    fetchSuggest(keyword),
  ]);

  if (!hasNaverApi) {
    notes.push("네이버 Open API 키가 없어 문서 발행량(블로그·카페·뉴스·웹)은 비어 있습니다. 설정 > 분석 API에서 Client ID/Secret을 저장하세요.");
  } else {
    notes.push("문서 발행량은 네이버 검색 Open API total 값입니다.");
  }
  notes.push("월간 검색량·CPC·광고 경쟁도는 검색광고 API 연동 전이라 비워 둡니다.");
  notes.push("요일·연령·성별 분포와 월간 차트는 참고용 추정 패턴입니다(실측 아님).");

  const relatedSerp = relatedSuggest.filter((k) => k !== keyword).slice(0, 10);
  const category = guessCategory(keyword);
  const honeyScore = buildHoneyScore(blogTotal, relatedSuggest.length, keyword.length);
  const lim = limFromSignals(honeyScore, blogTotal);

  const docSignal = blogTotal ?? 20_000;
  const issueLevel: KeywordReport["issue"]["level"] =
    newsTotal != null && newsTotal > 5_000
      ? "매우 높음"
      : newsTotal != null && newsTotal > 1_000
        ? "높음"
        : newsTotal != null && newsTotal > 200
          ? "보통"
          : "낮음";

  return {
    keyword,
    analyzedAt: new Date().toISOString(),
    information: {
      blogTotal,
      cafeTotal,
      newsTotal,
      webTotal,
      monthlyPc: null,
      monthlyMobile: null,
      competition: null,
      cpc: null,
    },
    relatedSuggest: relatedSuggest.slice(0, 15),
    relatedSerp,
    category,
    issue: {
      level: issueLevel,
      realtimeMentions: null,
      note:
        newsTotal != null
          ? `뉴스 문서 약 ${newsTotal.toLocaleString("ko-KR")}건을 이슈성 보조 신호로 사용했습니다.`
          : "뉴스 발행량 데이터가 없어 이슈성은 보수적으로 표시합니다.",
    },
    honeyScore,
    lim,
    chart: syntheticChart(keyword, Math.max(10, Math.round(Math.log10(docSignal + 10) * 20))),
    weekday: weekdayDist(keyword),
    age: ageDist(keyword),
    gender: /미용|육아|화장품|레시피/.test(keyword)
      ? { male: 28, female: 72 }
      : /주식|코인|게임|자동차/.test(keyword)
        ? { male: 68, female: 32 }
        : { male: 42, female: 58 },
    sections: [
      { name: "인기글 / 블로그", note: "시니어 정보·생활 키워드는 블로그 영역 비중이 큰 편입니다." },
      { name: "웹문서", note: "공공기관·복지 안내 페이지가 노출될 수 있습니다." },
      { name: "관련 검색어", note: "하단·측면 연관어로 주제 확장에 활용하세요." },
      { name: "스마트블록(추정)", note: "실제 SERP 배치는 네이버 검색 결과에서 확인하세요." },
    ],
    notes,
    hasNaverApi,
  };
}

/** 서명용 스텁 — 추후 검색광고 API 연동 시 사용 */
export function signNaverAd(message: string, secret: string) {
  return createHmac("sha256", secret).update(message).digest("base64");
}
