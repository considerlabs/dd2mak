import type { Post } from "./store";
import { CATEGORY_TREE, type CategoryNode, type CategoryTree } from "./content";
import { readStore } from "./store";

function authHeader(user: string, appPassword: string) {
  return "Basic " + Buffer.from(`${user}:${appPassword}`).toString("base64");
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

export async function getWpCategoryTree(): Promise<CategoryTree> {
  const fallback = fallbackTree();
  const settings = (await readStore()).settings;
  const ch = settings.channels.wordpress;
  const wpUrl = ch.url || settings.wpUrl;
  const wpUser = ch.user || settings.wpUser;
  const wpAppPassword = ch.appPassword || settings.wpAppPassword;
  if (!wpUrl || !wpUser || !wpAppPassword) return fallback;
  const base = normalizeWpBaseUrl(wpUrl);
  try {
    const res = await fetch(`${base}/wp-json/wp/v2/categories?per_page=100&hide_empty=false`, {
      headers: { Authorization: authHeader(wpUser, wpAppPassword) },
      cache: "no-store",
    });
    if (!res.ok) return fallback;
    const rows = (await res.json()) as { id: number; slug: string; name: string; parent: number }[];
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
    return parents.length
      ? { parents, children: Object.keys(children).length ? children : CATEGORY_TREE.children }
      : fallback;
  } catch {
    return fallback;
  }
}

export async function publishToWordPress(post: Post) {
  const settings = (await readStore()).settings;
  const ch = settings.channels.wordpress;
  const wpUrl = ch.url || settings.wpUrl;
  const wpUser = ch.user || settings.wpUser;
  const wpAppPassword = ch.appPassword || settings.wpAppPassword;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `워드프레스 발행 실패 (${res.status})`);
  return data.id as number;
}
