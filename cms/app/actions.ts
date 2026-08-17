"use server";

import { redirect } from "next/navigation";
import { generateArticle, pingProvider } from "@/lib/ai";
import { clearSession, requireReviewer, requireUser, setSession, verifyPassword } from "@/lib/auth";
import { CHANNEL_LABEL } from "@/lib/content";
import { publishToChannels } from "@/lib/channels";
import { newId, nowIso, readStore, writeStore, type ChannelId, type Post } from "@/lib/store";

function form(data: FormData, key: string) {
  return String(data.get(key) || "").trim();
}

export async function loginAction(data: FormData) {
  const login = form(data, "login");
  const password = form(data, "password");
  const user = readStore().users.find((u) => u.login === login);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }
  await setSession(user);
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function generateAction(data: FormData) {
  const session = await requireUser();
  const category = form(data, "category");
  const keywords = form(data, "keywords");
  const postId = form(data, "id");
  if (!category || !keywords) return { error: "카테고리와 키워드를 입력하세요." };
  try {
    const ai = await generateArticle(category, keywords);
    const store = readStore();
    const existing = postId ? store.posts.find((p) => p.id === postId) : null;
    if (existing) {
      if (existing.authorId !== session.id || existing.status !== "draft") {
        return { error: "이 글을 저장할 수 없습니다." };
      }
      existing.title = ai.title;
      existing.content = ai.content;
      existing.category = category;
      existing.keywords = keywords;
      existing.aiDraft = true;
      existing.updatedAt = nowIso();
      writeStore(store);
      redirect(`/write/${existing.id}`);
    }
    const post: Post = {
      id: newId("p"),
      title: ai.title,
      content: ai.content,
      category,
      keywords,
      excerpt: "",
      status: "draft",
      authorId: session.id,
      source: "",
      reviewedAt: "",
      caution: "",
      aiDraft: true,
      wpPostId: null,
      channelResults: {},
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.posts.unshift(post);
    writeStore(store);
    redirect(`/write/${post.id}`);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "초안 생성에 실패했습니다." };
  }
}

function saveDraftInternal(
  sessionId: string,
  postId: string,
  title: string,
  content: string,
  category: string,
  keywords: string,
  excerpt: string
) {
  if (!title) return { error: "제목을 입력하세요." } as const;
  const store = readStore();
  if (postId) {
    const post = store.posts.find((p) => p.id === postId);
    if (!post || post.authorId !== sessionId || post.status !== "draft") {
      return { error: "이 글을 저장할 수 없습니다." } as const;
    }
    post.title = title;
    post.content = content;
    post.category = category;
    post.keywords = keywords;
    post.excerpt = excerpt;
    post.updatedAt = nowIso();
    writeStore(store);
    return { id: post.id } as const;
  }
  const post: Post = {
    id: newId("p"),
    title,
    content,
    category,
    keywords,
    excerpt,
    status: "draft",
    authorId: sessionId,
    source: "",
    reviewedAt: "",
    caution: "",
    aiDraft: false,
    wpPostId: null,
    channelResults: {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store.posts.unshift(post);
  writeStore(store);
  return { id: post.id } as const;
}

export async function saveDraftAction(data: FormData) {
  const session = await requireUser();
  const result = saveDraftInternal(
    session.id,
    form(data, "id"),
    form(data, "title"),
    form(data, "content"),
    form(data, "category"),
    form(data, "keywords"),
    form(data, "excerpt")
  );
  if ("error" in result) return result;
  redirect(`/write/${result.id}`);
}

export async function submitAction(data: FormData) {
  const session = await requireUser();
  const result = saveDraftInternal(
    session.id,
    form(data, "id"),
    form(data, "title"),
    form(data, "content"),
    form(data, "category"),
    form(data, "keywords"),
    form(data, "excerpt")
  );
  if ("error" in result) return result;
  const store = readStore();
  const post = store.posts.find((p) => p.id === result.id);
  if (!post || post.authorId !== session.id || post.status !== "draft") {
    return { error: "제출할 수 없는 글입니다." };
  }
  post.status = "pending";
  post.updatedAt = nowIso();
  writeStore(store);
  redirect("/posts");
}

export async function saveReviewAction(data: FormData) {
  await requireReviewer();
  const id = form(data, "id");
  const store = readStore();
  const post = store.posts.find((p) => p.id === id);
  if (!post || (post.status !== "pending" && post.status !== "publish")) {
    return { error: "검수할 수 없는 글입니다." };
  }
  const title = form(data, "title");
  if (!title) return { error: "제목을 입력하세요." };
  post.title = title;
  post.content = form(data, "content");
  post.excerpt = form(data, "excerpt");
  post.source = form(data, "source");
  post.reviewedAt = form(data, "reviewedAt");
  post.caution = form(data, "caution");
  post.aiDraft = data.get("aiDraft") === "1";
  post.updatedAt = nowIso();
  writeStore(store);
  return { ok: true };
}

export async function publishAction(data: FormData) {
  await requireReviewer();
  const saved = await saveReviewAction(data);
  if (saved && "error" in saved) return saved;
  const id = form(data, "id");
  const store = readStore();
  const post = store.posts.find((p) => p.id === id);
  if (!post || post.status !== "pending") return { error: "발행할 수 없는 글입니다." };
  const selected = data
    .getAll("channels")
    .map(String)
    .filter((id): id is ChannelId => id === "wordpress" || id === "tistory" || id === "naver");
  if (selected.length === 0) return { error: "발행할 채널을 하나 이상 선택하세요." };
  let results;
  try {
    results = await publishToChannels(post, selected);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "발행에 실패했습니다." };
  }
  post.channelResults = { ...post.channelResults, ...results };
  const wpId = Number(results.wordpress?.id);
  if (results.wordpress?.ok && Number.isFinite(wpId) && wpId > 0) post.wpPostId = wpId;
  const ok = selected.filter((id) => results[id]?.ok);
  post.updatedAt = nowIso();
  if (ok.length === 0) {
    writeStore(store);
    return {
      error: selected
        .map((id) => `${CHANNEL_LABEL[id]}: ${results[id]?.error || "실패"}`)
        .join(" · "),
    };
  }
  post.status = "publish";
  writeStore(store);
  redirect(`/published/${post.id}`);
}

export async function saveSettingsAction(data: FormData): Promise<{ error?: string; message?: string }> {
  await requireReviewer();
  const store = readStore();
  const provider = form(data, "provider") as typeof store.settings.provider;
  store.settings.provider = ["anthropic", "openai", "gemini", "cursor"].includes(provider)
    ? provider
    : "anthropic";
  for (const id of ["anthropic", "openai", "gemini", "cursor"]) {
    const incoming = form(data, `key_${id}`);
    if (incoming && !incoming.includes("*")) store.settings.keys[id] = incoming;
  }
  const wp = store.settings.channels.wordpress;
  wp.enabled = data.get("ch_wordpress") === "1";
  wp.url = form(data, "wpUrl") || wp.url;
  wp.user = form(data, "wpUser") || wp.user;
  const wpPass = form(data, "wpAppPassword");
  if (wpPass && !wpPass.includes("*")) wp.appPassword = wpPass;
  store.settings.wpUrl = wp.url;
  store.settings.wpUser = wp.user;
  store.settings.wpAppPassword = wp.appPassword;

  const tistory = store.settings.channels.tistory;
  tistory.enabled = data.get("ch_tistory") === "1";
  tistory.blogName = form(data, "tistoryBlogName") || tistory.blogName;
  const tistoryToken = form(data, "tistoryAccessToken");
  if (tistoryToken && !tistoryToken.includes("*")) tistory.accessToken = tistoryToken;

  const naver = store.settings.channels.naver;
  naver.enabled = data.get("ch_naver") === "1";
  naver.blogId = form(data, "naverBlogId") || naver.blogId;
  const naverToken = form(data, "naverAccessToken");
  if (naverToken && !naverToken.includes("*")) naver.accessToken = naverToken;

  writeStore(store);
  return { message: "저장했습니다." };
}

export async function pingAction(data: FormData) {
  await requireReviewer();
  const provider = form(data, "provider");
  try {
    await pingProvider(provider);
    return { ok: true, message: "연결에 성공했습니다." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "연결 실패" };
  }
}

export async function writerAction(_prev: { error?: string } | null, data: FormData) {
  const intent = form(data, "intent");
  if (intent === "generate") return generateAction(data);
  if (intent === "save") return saveDraftAction(data);
  if (intent === "submit") return submitAction(data);
  return { error: "알 수 없는 작업입니다." };
}
