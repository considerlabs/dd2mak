export const CATEGORIES: Record<string, string> = {
  health: "건강·병원",
  money: "돈·연금·복지",
  care: "돌봄·안전",
  life: "배움·여가",
  work: "재취업·일자리",
  housing: "주거·자산 관리",
  news: "커뮤니티·소식",
};

export type CategoryNode = { slug: string; name: string };
export type CategoryTree = {
  parents: CategoryNode[];
  children: Record<string, CategoryNode[]>;
};

/** 예전 시드 상위 카테고리 — CMS 선택지에서 제외 */
export const LEGACY_CATEGORY_SLUGS = ["welfare", "jobs", "finance", "leisure", "digital"] as const;

const CATEGORY_CHILDREN: Record<string, CategoryNode[]> = {
  health: [
    { slug: "checkup", name: "건강검진" },
    { slug: "wellness", name: "건강식·운동·수면" },
    { slug: "national-checkup", name: "국가건강검진" },
    { slug: "cancer-screening", name: "국가암검진 5종" },
    { slug: "fall-prevention", name: "낙상 예방" },
    { slug: "chronic-disease", name: "만성질환 관리" },
    { slug: "health-insurance", name: "병원비 보장·실비" },
    { slug: "medication", name: "약 복용·상호작용" },
    { slug: "dementia", name: "치매검사·예방" },
    { slug: "herbal-alternative", name: "한방·대체치료" },
  ],
  money: [
    { slug: "national-pension", name: "국민연금 (노령연금)" },
    { slug: "basic-pension", name: "기초연금" },
    { slug: "debt-credit", name: "부채 정리·신용회복" },
    { slug: "insurance-reduction", name: "사회보험료 감면·경감" },
    { slug: "senior-finance", name: "시니어 금융상품 비교" },
    { slug: "medical-aid", name: "의료급여·긴급복지지원" },
    { slug: "home-pension", name: "주택연금·역모기지" },
    { slug: "inheritance-tax", name: "증여·상속·기부" },
  ],
  care: [
    { slug: "tailored-care", name: "노인맞춤돌봄서비스" },
    { slug: "longterm-care", name: "노인장기요양보험" },
    { slug: "elder-abuse", name: "노인학대 예방·신고" },
    { slug: "live-alone-iot", name: "독거노인 IoT" },
    { slug: "voice-phishing", name: "보이스피싱 예방" },
    { slug: "home-care", name: "재가돌봄·주야간보호" },
    { slug: "disaster", name: "재난약자 지원" },
    { slug: "dementia-family", name: "치매 가족 지원" },
  ],
  life: [
    { slug: "senior-community", name: "경로당·지역 커뮤니티" },
    { slug: "welfare-center-6", name: "노인복지관 6대 사업" },
    { slug: "free-culture", name: "무료 여행·문화" },
    { slug: "digital-learning", name: "시니어 디지털 학습" },
    { slug: "senior-university", name: "시니어대학·평생교육원" },
    { slug: "hobby", name: "취미·동호회" },
  ],
  work: [
    { slug: "senior-jobs", name: "노인일자리사업" },
    { slug: "saeil-center", name: "새일센터·일경험" },
    { slug: "one-person", name: "시니어 1인 기업" },
    { slug: "worknet", name: "워크넷 우대 채용관" },
    { slug: "senior-platform", name: "재취업 플랫폼 비교" },
    { slug: "return-farm", name: "창업·귀농·귀촌" },
    { slug: "retirement-irp", name: "퇴직금·IRP 인출" },
  ],
  housing: [
    { slug: "housing-bond", name: "국민주택채권 환급" },
    { slug: "downsizing", name: "다운사이징 3단계" },
    { slug: "rental-housing", name: "매입임대·장기전세" },
    { slug: "silver-town", name: "실버타운·코호트주택" },
    { slug: "safe-home", name: "안전홈(집수리)" },
    { slug: "asset-trust", name: "재산관리 신탁·후견" },
    { slug: "home-pension-guide", name: "주택연금 가이드" },
  ],
  news: [
    { slug: "faq", name: "FAQ 100선" },
    { slug: "hot-issue", name: "시니어 핫이슈" },
    { slug: "events", name: "이벤트·설문·퀴즈" },
    { slug: "policy-briefing", name: "정책 브리핑" },
    { slug: "card-news", name: "카드뉴스·영상" },
  ],
};

export const CATEGORY_TREE: CategoryTree = {
  parents: Object.entries(CATEGORIES).map(([slug, name]) => ({ slug, name })),
  children: CATEGORY_CHILDREN,
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

export function categoryLabel(slug: string, tree?: CategoryTree, extras: { slug: string; name: string }[] = []) {
  if (!slug) return "(카테고리 없음)";
  if (tree) {
    for (const parent of tree.parents) {
      if (parent.slug === slug) return parent.name;
      const kids = tree.children[parent.slug] || [];
      const hit = kids.find((k) => k.slug === slug);
      if (hit) return `${parent.name} › ${hit.name}`;
    }
    for (const [parentSlug, kids] of Object.entries(tree.children)) {
      const hit = kids.find((k) => k.slug === slug);
      if (hit) {
        const parentName =
          tree.parents.find((p) => p.slug === parentSlug)?.name ||
          CATEGORIES[parentSlug] ||
          parentSlug;
        return `${parentName} › ${hit.name}`;
      }
    }
  }
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
  const text = raw.trim().replace(/^```(?:html|markdown)?\s*/i, "").replace(/```$/, "");
  const lines = text.split(/\r\n|\n|\r/);
  while (lines.length && lines[0].trim() === "") lines.shift();
  const title = (lines.shift() || "").replace(/^#+\s*/, "").replace(/^["“”]|["“”]$/g, "").trim();
  let content = lines.join("\n").trim();
  content = content.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  content = content.replace(/\n{2,}/g, "</p>\n<p>");
  if (content && !content.startsWith("<h2>")) content = `<p>${content}</p>`;
  return { title, content };
}

export function plainCharCount(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
}

export function plainText(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** API 없이 본문 앞부분을 요약으로 쓰는 폴백 */
export function fallbackExcerpt(content: string, maxLen = 120) {
  const text = plainText(content);
  if (!text) return "";
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export const EXCERPT_PROMPT = `당신은 한국어 블로그 편집자입니다.
주어진 글의 본문만 보고 목록·미리보기에 쓸 요약을 만듭니다.
규칙:
- 한두 문장, 한글 기준 80~120자 이내
- 본문에 없는 사실을 추가하지 마세요
- 따옴표·머리말·라벨 없이 요약 문장만 출력하세요`;
