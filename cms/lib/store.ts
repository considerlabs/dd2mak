import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { hashPassword } from "./password";

export type Role = "writer" | "reviewer";

export type User = {
  id: string;
  login: string;
  name: string;
  role: Role;
  passwordHash: string;
};

export type ChannelId = "wordpress" | "tistory" | "naver";

export type ChannelResult = {
  ok: boolean;
  url?: string;
  id?: string;
  error?: string;
};

export type Post = {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string;
  excerpt: string;
  status: "draft" | "pending" | "publish";
  authorId: string;
  source: string;
  reviewedAt: string;
  caution: string;
  aiDraft: boolean;
  wpPostId: number | null;
  channelResults: Partial<Record<ChannelId, ChannelResult>>;
  research: ResearchBrief | null;
  createdAt: string;
  updatedAt: string;
};

export type ResearchBrief = {
  keyword: string;
  fit: "적합" | "보통" | "비추천";
  score: number;
  summary: string;
  reasons: string[];
  angles: string[];
  caution: string[];
  nextActions: string[];
  honeyScore?: number;
  limGrade?: string;
  competition?: string;
  categoryHint?: string;
  updatedAt: string;
};

export type PipelineBrief = ResearchBrief | null;

export type Settings = {
  provider: "anthropic" | "openai" | "gemini" | "cursor";
  keys: Record<string, string>;
  wpUrl: string;
  wpUser: string;
  wpAppPassword: string;
  channels: {
    wordpress: { enabled: boolean; url: string; user: string; appPassword: string };
    tistory: { enabled: boolean; blogName: string; accessToken: string };
    naver: { enabled: boolean; blogId: string; accessToken: string };
  };
  analyze: {
    naverClientId: string;
    naverClientSecret: string;
  };
  copilot: {
    enabled: boolean;
    tenantId: string;
    clientId: string;
    clientSecret: string;
    apiBaseUrl: string;
    siteName: string;
    siteUrl: string;
    categories: string;
    audience: string;
    notes: string;
  };
};

export type Store = {
  users: User[];
  posts: Post[];
  settings: Settings;
  pipelineBrief: PipelineBrief;
};

const PRIMARY_FILE = join(process.cwd(), "data", "store.json");
const FALLBACK_FILE = join(tmpdir(), "dd2mak-store.json");
/** Vercel 등 읽기 전용 배포본에 쓰기가 막히면 /tmp로 전환(인스턴스 재시작 시 초기화됨) */
let activeFile = PRIMARY_FILE;

function normalizeStoredWpUrl(url: string) {
  return url
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/wp-admin(?:\/.*)?$/i, "")
    .replace(/\/wp-login\.php(?:\?.*)?$/i, "")
    .replace(/\/+$/, "");
}

function seed(): Store {
  const wpUrl = process.env.WP_URL || "http://localhost:3011";
  const wpUser = process.env.WP_USER || "admin";
  const wpAppPassword = process.env.WP_APP_PASSWORD || "";
  return {
    users: [
      { id: "u-writer", login: "writer", name: "작성자", role: "writer", passwordHash: hashPassword("writer") },
      { id: "u-reviewer", login: "reviewer", name: "검수자", role: "reviewer", passwordHash: hashPassword("reviewer") },
      { id: "u-admin", login: "admin", name: "관리자", role: "reviewer", passwordHash: hashPassword("admin") },
    ],
    posts: [],
    settings: {
      provider: "anthropic",
      keys: { anthropic: "", openai: "", gemini: "", cursor: "" },
      wpUrl,
      wpUser,
      wpAppPassword,
      channels: {
        wordpress: { enabled: true, url: wpUrl, user: wpUser, appPassword: wpAppPassword },
        tistory: { enabled: false, blogName: "", accessToken: "" },
        naver: { enabled: false, blogId: "", accessToken: "" },
      },
      analyze: {
        naverClientId: process.env.NAVER_CLIENT_ID || "",
        naverClientSecret: process.env.NAVER_CLIENT_SECRET || "",
      },
      copilot: {
        enabled: true,
        tenantId: process.env.COPILOT_TENANT_ID || "",
        clientId: process.env.COPILOT_CLIENT_ID || "",
        clientSecret: process.env.COPILOT_CLIENT_SECRET || "",
        apiBaseUrl: process.env.COPILOT_API_URL || "",
        siteName: "시니어 정보 서비스",
        siteUrl: wpUrl,
        categories: "건강관리, 복지혜택, 일자리·재취업, 연금·재무, 여가·배움, 디지털 생활",
        audience: "50~70대 시니어 및 가족 돌봄 제공자",
        notes: "쉬운 문장, 행동형 제목, 공공·복지 정보는 출처 확인이 중요합니다.",
      },
    },
    pipelineBrief: null,
  };
}

function migrate(raw: Partial<Store> & { settings?: Partial<Settings> }): Store {
  const data = raw as Store;
  const seeded = seed().settings;
  const s = data.settings || seeded;
  const rawWpUrl = s.channels?.wordpress?.url || s.wpUrl || seeded.wpUrl;
  const channels = {
    wordpress: {
      enabled: s.channels?.wordpress?.enabled ?? true,
      url: normalizeStoredWpUrl(rawWpUrl),
      user: s.channels?.wordpress?.user || s.wpUser || seeded.wpUser,
      appPassword: s.channels?.wordpress?.appPassword || s.wpAppPassword || seeded.wpAppPassword,
    },
    tistory: {
      enabled: Boolean(s.channels?.tistory?.enabled),
      blogName: s.channels?.tistory?.blogName || "",
      accessToken: s.channels?.tistory?.accessToken || "",
    },
    naver: {
      enabled: Boolean(s.channels?.naver?.enabled),
      blogId: s.channels?.naver?.blogId || "",
      accessToken: s.channels?.naver?.accessToken || "",
    },
  };
  data.settings = {
    ...seeded,
    ...s,
    wpUrl: channels.wordpress.url,
    wpUser: channels.wordpress.user,
    wpAppPassword: channels.wordpress.appPassword,
    channels,
    analyze: {
      naverClientId: s.analyze?.naverClientId || seeded.analyze.naverClientId,
      naverClientSecret: s.analyze?.naverClientSecret || seeded.analyze.naverClientSecret,
    },
    copilot: {
      enabled: s.copilot?.enabled ?? seeded.copilot.enabled,
      tenantId: s.copilot?.tenantId || seeded.copilot.tenantId,
      clientId: s.copilot?.clientId || seeded.copilot.clientId,
      clientSecret: s.copilot?.clientSecret || "",
      apiBaseUrl: s.copilot?.apiBaseUrl || seeded.copilot.apiBaseUrl,
      siteName: s.copilot?.siteName || seeded.copilot.siteName,
      siteUrl: s.copilot?.siteUrl || seeded.copilot.siteUrl,
      categories: s.copilot?.categories || seeded.copilot.categories,
      audience: s.copilot?.audience || seeded.copilot.audience,
      notes: s.copilot?.notes || seeded.copilot.notes,
    },
  };
  data.posts = (data.posts || []).map((p) => ({
    ...p,
    excerpt: p.excerpt || "",
    channelResults: p.channelResults || {},
    research: p.research || null,
  }));
  if (data.pipelineBrief === undefined) data.pipelineBrief = null;
  return data;
}

export function readStore(): Store {
  const file = existsSync(activeFile) ? activeFile : existsSync(FALLBACK_FILE) ? FALLBACK_FILE : activeFile;
  if (!existsSync(file)) {
    const data = seed();
    writeStore(data);
    return data;
  }
  return migrate(JSON.parse(readFileSync(file, "utf8")) as Partial<Store>);
}

function writeToFile(file: string, data: Store) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, file);
}

export function writeStore(data: Store) {
  try {
    writeToFile(activeFile, data);
  } catch {
    activeFile = FALLBACK_FILE;
    writeToFile(activeFile, data);
  }
}

export function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
