import type { Post } from "./store";
import { CATEGORY_TREE, type CategoryNode, type CategoryTree } from "./content";
import { readStore } from "./store";

/** 애플리케이션 비밀번호의 표시용 공백 제거 */
export function normalizeWpAppPassword(password: string) {
  return password.replace(/\s+/g, "").trim();
}

function authHeader(user: string, appPassword: string) {
  return "Basic " + Buffer.from(`${user}:${normalizeWpAppPassword(appPassword)}`).toString("base64");
}

function explainWpAuthError(status: number, data: { code?: string; message?: string } | null) {
  const code = data?.code || "";
  const msg = data?.message || "";
  if (
    status === 401 ||
    status === 403 ||
    code === "rest_not_logged_in" ||
    code === "rest_cannot_create" ||
    code === "rest_forbidden" ||
    /허용하지 않았|로그인 상태가 아닙|not allowed|not logged/i.test(msg)
  ) {
    return "워드프레스 인증에 실패했습니다. 사이트 로그인 비밀번호가 아니라, WP 관리자 → 사용자 → 프로필에서 '애플리케이션 비밀번호'를 새로 만든 뒤 설정 > 발행 채널에 저장하세요.";
  }
  return msg || `워드프레스 요청 실패 (${status})`;
}

/** 사이트 루트 URL로 정규화 (/wp-admin, /wp-login.php 제거) */
export function normalizeWpBaseUrl(url: string) {
  return url
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/wp-admin(?:\/.*)?$/i, "")
    .replace(/\/wp-login\.php(?:\?.*)?$/i, "")
    .replace(/\/+$/, "");
}

function fallbackTree(): CategoryTree {
  return CATEGORY_TREE;
}

async function wpCredentials() {
  const settings = (await readStore()).settings;
  const ch = settings.channels.wordpress;
  return {
    url: ch.url || settings.wpUrl,
    user: ch.user || settings.wpUser,
    appPassword: ch.appPassword || settings.wpAppPassword,
  };
}

export async function pingWordPress() {
  const { url, user, appPassword } = await wpCredentials();
  if (!url || !user || !appPassword) {
    throw new Error("워드프레스 URL·사용자명·애플리케이션 비밀번호를 먼저 저장하세요.");
  }
  const base = normalizeWpBaseUrl(url);
  const res = await fetch(`${base}/wp-json/wp/v2/users/me?context=edit`, {
    headers: { Authorization: authHeader(user, appPassword) },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as
    | { code?: string; message?: string; name?: string; capabilities?: Record<string, boolean> }
    | null;
  if (!res.ok) throw new Error(explainWpAuthError(res.status, data));
  if (data?.capabilities && data.capabilities.publish_posts === false) {
    throw new Error(
      "이 워드프레스 계정에는 글 발행 권한이 없습니다. 편집자 이상 계정으로 애플리케이션 비밀번호를 만드세요.",
    );
  }
  return data?.name || user;
}

export async function getWpCategoryTree(): Promise<CategoryTree> {
  const fallback = fallbackTree();
  const { url: wpUrl } = await wpCredentials();
  if (!wpUrl) return fallback;
  const base = normalizeWpBaseUrl(wpUrl);
  try {
    // 카테고리 목록은 공개 API — 앱 비밀번호와 무관하게 실제 WP 트리를 씀
    const res = await fetch(`${base}/wp-json/wp/v2/categories?per_page=100&hide_empty=false`, {
      cache: "no-store",
    });
    if (!res.ok) return fallback;
    const rows = (await res.json()) as { id: number; slug: string; name: string; parent: number }[];
    const totalPages = Number(res.headers.get("X-WP-TotalPages") || "1");
    for (let page = 2; page <= totalPages && page <= 20; page++) {
      const more = await fetch(
        `${base}/wp-json/wp/v2/categories?per_page=100&hide_empty=false&page=${page}`,
        { cache: "no-store" },
      );
      if (!more.ok) break;
      rows.push(...((await more.json()) as typeof rows));
    }
    const byId = new Map(rows.filter((c) => c.slug !== "uncategorized").map((c) => [c.id, c]));
    const parents: CategoryNode[] = [];
    const children: Record<string, CategoryNode[]> = {};
    for (const term of byId.values()) {
      if (term.parent === 0) {
        parents.push({ slug: term.slug, name: term.name });
      } else if (byId.has(term.parent)) {
        const parentSlug = byId.get(term.parent)!.slug;
        (children[parentSlug] ||= []).push({ slug: term.slug, name: term.name });
      }
    }
    // 하위가 없는 상위 카테고리는 글작성 선택지에서 제외
    const parentsWithChildren = parents.filter((p) => (children[p.slug] || []).length > 0);
    if (!parentsWithChildren.length) return fallback;
    return { parents: parentsWithChildren, children };
  } catch {
    return fallback;
  }
}

export async function publishToWordPress(post: Post) {
  const { url: wpUrl, user: wpUser, appPassword: wpAppPassword } = await wpCredentials();
  if (!wpUrl || !wpUser || !wpAppPassword) {
    throw new Error("워드프레스 연결 정보가 없습니다. 설정에서 URL·계정·애플리케이션 비밀번호를 저장하세요.");
  }
  const base = normalizeWpBaseUrl(wpUrl);
  const headers = {
    Authorization: authHeader(wpUser, wpAppPassword),
    "Content-Type": "application/json",
  };

  const catRes = await fetch(`${base}/wp-json/wp/v2/categories?slug=${encodeURIComponent(post.category)}`, { headers });
  if (!catRes.ok) throw new Error(`카테고리 조회 실패 (${catRes.status})`);
  const cats = (await catRes.json()) as { id: number }[];
  const categoryId = cats[0]?.id;
  if (!categoryId) throw new Error(`워드프레스에 '${post.category}' 카테고리가 없습니다.`);

  const body = {
    title: post.title,
    content: post.content,
    excerpt: post.excerpt || "",
    status: "publish",
    categories: [categoryId],
  };

  const url = post.wpPostId
    ? `${base}/wp-json/wp/v2/posts/${post.wpPostId}`
    : `${base}/wp-json/wp/v2/posts`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(explainWpAuthError(res.status, data));
  return data.id as number;
}
