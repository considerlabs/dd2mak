import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
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
  createdAt: string;
  updatedAt: string;
};

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
};

export type Store = {
  users: User[];
  posts: Post[];
  settings: Settings;
};

const FILE = join(process.cwd(), "data", "store.json");

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
    },
  };
}

function migrate(data: Store): Store {
  const seeded = seed().settings;
  const s = data.settings || seeded;
  const channels = {
    wordpress: {
      enabled: true,
      url: s.channels?.wordpress?.url || s.wpUrl || seeded.wpUrl,
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
  };
  data.posts = (data.posts || []).map((p) => ({
    ...p,
    excerpt: p.excerpt || "",
    channelResults: p.channelResults || {},
  }));
  return data;
}

export function readStore(): Store {
  if (!existsSync(FILE)) {
    const data = seed();
    writeStore(data);
    return data;
  }
  return migrate(JSON.parse(readFileSync(FILE, "utf8")) as Store);
}

export function writeStore(data: Store) {
  mkdirSync(dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, FILE);
}

export function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
