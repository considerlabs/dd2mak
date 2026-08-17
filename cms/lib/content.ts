export const CATEGORIES: Record<string, string> = {
  health: "건강관리",
  welfare: "복지혜택",
  jobs: "일자리·재취업",
  finance: "연금·재무",
  leisure: "여가·배움",
  digital: "디지털 생활",
};

export type CategoryNode = { slug: string; name: string };
export type CategoryTree = {
  parents: CategoryNode[];
  children: Record<string, CategoryNode[]>;
};

export const CATEGORY_TREE: CategoryTree = {
  parents: Object.entries(CATEGORIES).map(([slug, name]) => ({ slug, name })),
  children: {
    health: [
      { slug: "fall-prevention", name: "낙상 예방" },
      { slug: "checkup", name: "건강검진" },
      { slug: "medication", name: "복약 관리" },
    ],
    welfare: [
      { slug: "basic-pension", name: "기초연금" },
      { slug: "dental", name: "임플란트·틀니" },
      { slug: "transport", name: "교통·통신" },
      { slug: "energy-voucher", name: "에너지 바우처" },
    ],
    jobs: [
      { slug: "job-listings", name: "채용정보" },
      { slug: "senior-jobs", name: "노인일자리" },
      { slug: "reemployment-edu", name: "재취업 교육" },
    ],
    finance: [
      { slug: "national-pension", name: "국민연금" },
      { slug: "retirement-finance", name: "노후 재무" },
    ],
    leisure: [
      { slug: "lifelong-learning", name: "평생학습" },
      { slug: "hobby", name: "취미·여가" },
    ],
    digital: [
      { slug: "kakaotalk", name: "카카오톡" },
      { slug: "kiosk", name: "키오스크" },
      { slug: "mobile-banking", name: "모바일뱅킹" },
      { slug: "gov24", name: "정부24" },
      { slug: "scam-prevention", name: "사기 예방" },
    ],
  },
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "작성 중",
  pending: "검수 대기",
  publish: "발행됨",
};

export const CHANNEL_LABEL: Record<string, string> = {
  wordpress: "워드프레스",
  tistory: "티스토리",
  naver: "네이버 블로그",
};

export function categoryLabel(slug: string, extras: { slug: string; name: string }[] = []) {
  if (CATEGORIES[slug]) return CATEGORIES[slug];
  for (const kids of Object.values(CATEGORY_TREE.children)) {
    const hit = kids.find((k) => k.slug === slug);
    if (hit) return hit.name;
  }
  return extras.find((c) => c.slug === slug)?.name || slug;
}

export const SYSTEM_PROMPT = `당신은 한국어 블로그 필자입니다.
카테고리와 키워드에 맞춰 읽기 쉬운 블로그 글을 씁니다.
제목은 질문형이 아니라 행동형·구체적 한 줄입니다.
본문은 HTML 없이 쓰되 소제목은 ## 로 3~6개 둡니다.
본문 분량은 한글 기준 약 2,000자(공백 포함, 목표 1,800~2,200자)입니다.
확인되지 않은 수치·사실은 지어내지 마세요. 확인이 필요하면 [확인 필요]를 남기세요.
첫 줄은 제목만, 빈 줄 다음부터 본문만 출력하세요.`;

export function parseAiOutput(raw: string) {
  let text = raw.trim().replace(/^```(?:html|markdown)?\s*/i, "").replace(/```$/, "");
  const lines = text.split(/\r\n|\n|\r/);
  while (lines.length && lines[0].trim() === "") lines.shift();
  let title = (lines.shift() || "").replace(/^#+\s*/, "").replace(/^["“”]|["“”]$/g, "").trim();
  let content = lines.join("\n").trim();
  content = content.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  content = content.replace(/\n{2,}/g, "</p>\n<p>");
  if (content && !content.startsWith("<h2>")) content = `<p>${content}</p>`;
  return { title, content };
}

export function plainCharCount(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
}
