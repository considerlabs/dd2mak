import { analyzeKeyword } from "./analyze-keyword";
import { readStore } from "./store";

export type CopilotAdvice = {
  keyword: string;
  fit: "적합" | "보통" | "비추천";
  score: number;
  summary: string;
  reasons: string[];
  angles: string[];
  caution: string[];
  nextActions: string[];
  site: {
    name: string;
    url: string;
    categories: string;
    audience: string;
  };
  keywordSignals: {
    category: string;
    honeyScore: number;
    limGrade: string;
    competition: string;
  };
  raw?: string;
  analyzedAt: string;
};

type CopilotAuth = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
};

function resolveCopilotAuth(): CopilotAuth & {
  copilot: NonNullable<ReturnType<typeof readStore>["settings"]["copilot"]>;
} {
  const copilot = readStore().settings.copilot;
  if (!copilot) throw new Error("Copilot AI 설정이 없습니다.");
  return {
    tenantId: (copilot.tenantId || "").trim(),
    clientId: (copilot.clientId || "").trim(),
    clientSecret: (copilot.clientSecret || "").trim(),
    apiBaseUrl: (copilot.apiBaseUrl || process.env.COPILOT_API_URL || "").trim().replace(/\/$/, ""),
    copilot,
  };
}

function requireCredentials(auth: CopilotAuth) {
  if (!auth.tenantId) throw new Error("테넌트 ID가 없습니다. 설정 > Copilot AI에서 등록하세요.");
  if (!auth.clientId) throw new Error("애플리케이션 ID(Client ID)가 없습니다. 설정 > Copilot AI에서 등록하세요.");
  if (!auth.clientSecret) throw new Error("클라이언트 암호가 없습니다. 설정 > Copilot AI에서 등록하세요.");
}

function tokenEndpoint(tenantId: string) {
  if (process.env.COPILOT_TOKEN_URL) return process.env.COPILOT_TOKEN_URL.trim();
  return `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
}

/** 발급 자격증명으로 토큰 발급이 되는지 확인 (엔드포인트 URL 불필요) */
export async function pingCopilot() {
  const auth = resolveCopilotAuth();
  requireCredentials(auth);

  const scope = (process.env.COPILOT_API_SCOPE || `api://${auth.clientId}/.default`).trim();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: auth.clientId,
    client_secret: auth.clientSecret,
    scope,
  });

  const res = await fetch(tokenEndpoint(auth.tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
  });
  const raw = await res.text();
  let json: { access_token?: string; error?: string; error_description?: string } = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`토큰 응답이 JSON이 아닙니다 (${res.status}). Tenant ID를 확인하세요.`);
  }
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description ||
        json.error ||
        `자격증명 확인 실패 (${res.status}). Tenant ID · Client ID · Secret을 다시 확인하세요.`
    );
  }
}

function overlapScore(keyword: string, categories: string, audience: string) {
  const hay = `${categories} ${audience}`.toLowerCase();
  const parts = keyword
    .toLowerCase()
    .split(/[\s,/|]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  if (!parts.length) return 0;
  const hit = parts.filter((p) => hay.includes(p)).length;
  return hit / parts.length;
}

function buildLocalAdvice(
  keyword: string,
  copilot: NonNullable<ReturnType<typeof readStore>["settings"]["copilot"]>,
  kw: Awaited<ReturnType<typeof analyzeKeyword>>
): Omit<CopilotAdvice, "analyzedAt" | "raw"> {
  const overlap = overlapScore(keyword, copilot.categories, copilot.audience);
  const honey = kw.honeyScore;
  const competition = kw.lim.competition;

  let score = Math.round(40 + overlap * 35 + (honey / 30) * 20);
  if (competition === "심화" || competition === "혼잡") score -= 12;
  if (competition === "적당") score += 6;
  if (kw.lim.grade.startsWith("A") || kw.lim.grade.startsWith("B")) score += 5;
  score = Math.max(0, Math.min(100, score));

  const fit: CopilotAdvice["fit"] = score >= 70 ? "적합" : score >= 45 ? "보통" : "비추천";

  const reasons: string[] = [];
  if (overlap >= 0.4) reasons.push(`사이트 카테고리·독자와 키워드 겹침이 있습니다 (${Math.round(overlap * 100)}%).`);
  else reasons.push("사이트 카테고리와 키워드 직접 겹침이 적어 각도 조정이 필요합니다.");
  reasons.push(`든든지수(추정) ${honey}/30, LIM ${kw.lim.grade}, 경쟁 ${competition}.`);
  if (kw.information.blogTotal != null) {
    reasons.push(`블로그 문서량(추정) ${kw.information.blogTotal.toLocaleString("ko-KR")}건.`);
  }

  const angles = [
    `${copilot.audience || "독자"}가 바로 확인할 수 있는 ‘${keyword}’ 체크리스트`,
    `${kw.category.label} 관점에서 보는 ${keyword} 핵심 요약`,
    `자주 하는 실수와 주의점 — ${keyword}`,
  ];

  const caution = [
    "공공·복지·의료 정보는 출처와 기준일을 본문에 명시하세요.",
    competition === "심화" || competition === "혼잡"
      ? "경쟁이 높아 롱테일·상황형 키워드로 좁히는 편이 낫습니다."
      : "수치·혜택은 공식 안내와 교차 확인하세요.",
  ];

  const nextActions =
    fit === "비추천"
      ? ["연관·하위 키워드로 다시 진단", "사이트 카테고리에 더 가까운 검색어로 변경"]
      : ["선택한 각도로 글 작성 진행", "검수 시 출처·주의 문구 확인"];

  const summary =
    fit === "적합"
      ? `‘${keyword}’는 ${copilot.siteName || "사이트"} 속성과 잘 맞습니다. 초안 작성으로 이어가도 좋습니다.`
      : fit === "보통"
        ? `‘${keyword}’는 조건부 적합입니다. 각도를 좁혀 작성하는 것을 권합니다.`
        : `‘${keyword}’는 현재 사이트 속성과 거리가 있습니다. 다른 키워드를 검토하세요.`;

  return {
    keyword,
    fit,
    score,
    summary,
    reasons: reasons.slice(0, 6),
    angles: angles.slice(0, 6),
    caution: caution.slice(0, 6),
    nextActions: nextActions.slice(0, 6),
    site: {
      name: copilot.siteName,
      url: copilot.siteUrl,
      categories: copilot.categories,
      audience: copilot.audience,
    },
    keywordSignals: {
      category: kw.category.label,
      honeyScore: kw.honeyScore,
      limGrade: kw.lim.grade,
      competition: kw.lim.competition,
    },
  };
}

type CopilotPayload = {
  fit?: string;
  score?: number;
  summary?: string;
  reasons?: string[];
  angles?: string[];
  caution?: string[];
  nextActions?: string[];
};

function parseAdvice(data: unknown): CopilotPayload {
  if (!data || typeof data !== "object") throw new Error("Copilot 응답이 비어 있습니다.");
  const root = data as Record<string, unknown>;
  const nested =
    (root.data && typeof root.data === "object" ? root.data : null) ||
    (root.result && typeof root.result === "object" ? root.result : null) ||
    (root.advice && typeof root.advice === "object" ? root.advice : null) ||
    root;
  return nested as CopilotPayload;
}

async function runRemoteCopilot(
  auth: CopilotAuth,
  keyword: string,
  copilot: NonNullable<ReturnType<typeof readStore>["settings"]["copilot"]>,
  kw: Awaited<ReturnType<typeof analyzeKeyword>>
): Promise<CopilotAdvice> {
  const scope = (process.env.COPILOT_API_SCOPE || `api://${auth.clientId}/.default`).trim();
  const tokenRes = await fetch(tokenEndpoint(auth.tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: auth.clientId,
      client_secret: auth.clientSecret,
      scope,
    }),
    cache: "no-store",
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error_description?: string };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description || "Copilot 토큰 발급에 실패했습니다.");
  }

  const res = await fetch(auth.apiBaseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      "X-Tenant-Id": auth.tenantId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      keyword,
      tenantId: auth.tenantId,
      site: {
        name: copilot.siteName,
        url: copilot.siteUrl,
        categories: copilot.categories,
        audience: copilot.audience,
        notes: copilot.notes,
      },
      signals: {
        category: kw.category.label,
        honeyScore: kw.honeyScore,
        limGrade: kw.lim.grade,
        competition: kw.lim.competition,
        blogTotal: kw.information.blogTotal,
        newsTotal: kw.information.newsTotal,
      },
    }),
    cache: "no-store",
  });
  const rawText = await res.text();
  let json: unknown = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(`Copilot 응답이 JSON이 아닙니다 (${res.status}).`);
  }
  if (!res.ok) {
    const errObj = json as { message?: string; error?: string } | null;
    throw new Error(errObj?.message || errObj?.error || `Copilot AI 호출 실패 (${res.status})`);
  }

  const parsed = parseAdvice(json);
  const fit = parsed.fit === "적합" || parsed.fit === "비추천" || parsed.fit === "보통" ? parsed.fit : "보통";
  const score = Math.max(0, Math.min(100, Number(parsed.score) || 50));

  return {
    keyword,
    fit,
    score,
    summary: parsed.summary || "사이트 속성과 키워드를 비교한 결과입니다.",
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 6) : [],
    angles: Array.isArray(parsed.angles) ? parsed.angles.slice(0, 6) : [],
    caution: Array.isArray(parsed.caution) ? parsed.caution.slice(0, 6) : [],
    nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions.slice(0, 6) : [],
    site: {
      name: copilot.siteName,
      url: copilot.siteUrl,
      categories: copilot.categories,
      audience: copilot.audience,
    },
    keywordSignals: {
      category: kw.category.label,
      honeyScore: kw.honeyScore,
      limGrade: kw.lim.grade,
      competition: kw.lim.competition,
    },
    raw: rawText.slice(0, 2000),
    analyzedAt: new Date().toISOString(),
  };
}

export async function runCopilot(keywordRaw: string): Promise<CopilotAdvice> {
  const keyword = keywordRaw.trim();
  if (!keyword) throw new Error("분석할 키워드를 입력하세요.");

  const auth = resolveCopilotAuth();
  const { copilot } = auth;
  if (!copilot.enabled) {
    throw new Error("Copilot AI가 꺼져 있습니다. 설정 > Copilot AI에서 활성화하세요.");
  }
  requireCredentials(auth);
  if (!copilot.siteName || !copilot.categories) {
    throw new Error("사이트 속성이 비어 있습니다. 설정 > Copilot AI에서 사이트 정보를 저장하세요.");
  }

  const kw = await analyzeKeyword(keyword);

  // 서버 환경변수로 엔드포인트가 있을 때만 원격 호출. 없으면 사이트 속성+키워드 신호로 진단.
  if (auth.apiBaseUrl) {
    return runRemoteCopilot(auth, keyword, copilot, kw);
  }

  return {
    ...buildLocalAdvice(keyword, copilot, kw),
    analyzedAt: new Date().toISOString(),
  };
}
