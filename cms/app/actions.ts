"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateArticle, generateExcerpt, pingProvider } from "@/lib/ai";
import { clearSession, requireReviewer, requireUser, setSession, verifyPassword } from "@/lib/auth";
import { CHANNEL_LABEL } from "@/lib/content";
import { publishToChannels } from "@/lib/channels";
import { buildWriteHref } from "@/lib/pipeline";
import {
  newId,
  nowIso,
  readStore,
  writeStore,
  type ChannelId,
  type Post,
  type ResearchBrief,
} from "@/lib/store";
import { normalizeWpBaseUrl } from "@/lib/wordpress";

function form(data: FormData, key: string) {
  return String(data.get(key) || "").trim();
}

export async function loginAction(data: FormData) {
  const login = form(data, "login");
  const password = form(data, "password");
  const user = (await readStore()).users.find((u) => u.login === login);
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
    const excerpt = await generateExcerpt(ai.title, ai.content);
    const store = await readStore();
    const existing = postId ? store.posts.find((p) => p.id === postId) : null;
    if (existing) {
      if (existing.authorId !== session.id || existing.status !== "draft") {
        return { error: "이 글을 저장할 수 없습니다." };
      }
      existing.title = ai.title;
      existing.content = ai.content;
      existing.excerpt = excerpt;
      existing.category = category;
      existing.keywords = keywords;
      existing.aiDraft = true;
      existing.updatedAt = nowIso();
      if (store.pipelineBrief && !existing.research) existing.research = store.pipelineBrief;
      await writeStore(store);
      redirect(`/write/${existing.id}`);
    }
    const post: Post = {
      id: newId("p"),
      title: ai.title,
      content: ai.content,
      category,
      keywords,
      excerpt,
      status: "draft",
      authorId: session.id,
      source: "",
      reviewedAt: "",
      caution: "",
      aiDraft: true,
      wpPostId: null,
      channelResults: {},
      research: store.pipelineBrief,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.posts.unshift(post);
    await writeStore(store);
    redirect(`/write/${post.id}`);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "초안 생성에 실패했습니다." };
  }
}

async function saveDraftInternal(
  sessionId: string,
  postId: string,
  title: string,
  content: string,
  category: string,
  keywords: string
) {
  if (!title) return { error: "제목을 입력하세요." } as const;
  const store = await readStore();
  if (postId) {
    const post = store.posts.find((p) => p.id === postId);
    if (!post || post.authorId !== sessionId || post.status !== "draft") {
      return { error: "이 글을 저장할 수 없습니다." } as const;
    }
    post.title = title;
    post.content = content;
    post.category = category;
    post.keywords = keywords;
    post.updatedAt = nowIso();
    if (store.pipelineBrief && !post.research) post.research = store.pipelineBrief;
    await writeStore(store);
    return { id: post.id } as const;
  }
  const post: Post = {
    id: newId("p"),
    title,
    content,
    category,
    keywords,
    excerpt: "",
    status: "draft",
    authorId: sessionId,
    source: "",
    reviewedAt: "",
    caution: "",
    aiDraft: false,
    wpPostId: null,
    channelResults: {},
    research: store.pipelineBrief,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store.posts.unshift(post);
  await writeStore(store);
  return { id: post.id } as const;
}

export async function saveDraftAction(data: FormData) {
  const session = await requireUser();
  const result = await saveDraftInternal(
    session.id,
    form(data, "id"),
    form(data, "title"),
    form(data, "content"),
    form(data, "category"),
    form(data, "keywords")
  );
  if ("error" in result) return result;
  redirect(`/write/${result.id}`);
}

export async function submitAction(data: FormData) {
  const session = await requireUser();
  const result = await saveDraftInternal(
    session.id,
    form(data, "id"),
    form(data, "title"),
    form(data, "content"),
    form(data, "category"),
    form(data, "keywords")
  );
  if ("error" in result) return result;
  const store = await readStore();
  const post = store.posts.find((p) => p.id === result.id);
  if (!post || post.authorId !== session.id || post.status !== "draft") {
    return { error: "제출할 수 없는 글입니다." };
  }
  if (!post.content.trim()) return { error: "본문을 입력하세요." };
  post.excerpt = await generateExcerpt(post.title, post.content);
  post.status = "pending";
  post.updatedAt = nowIso();
  await writeStore(store);
  redirect("/posts");
}

export async function saveReviewAction(data: FormData) {
  await requireReviewer();
  const id = form(data, "id");
  const store = await readStore();
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
  await writeStore(store);
  return { ok: true };
}

export async function publishAction(data: FormData) {
  await requireReviewer();
  const saved = await saveReviewAction(data);
  if (saved && "error" in saved) return saved;
  const id = form(data, "id");
  const store = await readStore();
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
    await writeStore(store);
    return {
      error: selected
        .map((id) => `${CHANNEL_LABEL[id]}: ${results[id]?.error || "실패"}`)
        .join(" · "),
    };
  }
  post.status = "publish";
  await writeStore(store);
  redirect(`/published/${post.id}`);
}

export async function saveSettingsAction(data: FormData): Promise<{ error?: string; message?: string }> {
  await requireReviewer();
  const store = await readStore();
  const section = form(data, "section") || "all";

  if (section === "ai" || section === "all") {
    const provider = form(data, "provider") as typeof store.settings.provider;
    store.settings.provider = ["anthropic", "openai", "gemini", "cursor"].includes(provider)
      ? provider
      : "anthropic";
    for (const id of ["anthropic", "openai", "gemini", "cursor"]) {
      const incoming = form(data, `key_${id}`);
      if (incoming && !incoming.includes("*")) store.settings.keys[id] = incoming;
    }
  }

  if (section === "channels" || section === "channel_wordpress" || section === "all") {
    const wp = store.settings.channels.wordpress;
    wp.enabled = data.get("ch_wordpress") === "1";
    const nextWpUrl = form(data, "wpUrl");
    if (nextWpUrl) wp.url = normalizeWpBaseUrl(nextWpUrl);
    const nextWpUser = form(data, "wpUser");
    if (nextWpUser) wp.user = nextWpUser;
    const wpPass = form(data, "wpAppPassword");
    if (wpPass && !wpPass.includes("*")) wp.appPassword = wpPass;
    store.settings.wpUrl = wp.url;
    store.settings.wpUser = wp.user;
    store.settings.wpAppPassword = wp.appPassword;
  }

  if (section === "channels" || section === "channel_tistory" || section === "all") {
    const tistory = store.settings.channels.tistory;
    tistory.enabled = data.get("ch_tistory") === "1";
    if (data.has("tistoryBlogName")) tistory.blogName = form(data, "tistoryBlogName");
    const tistoryToken = form(data, "tistoryAccessToken");
    if (tistoryToken && !tistoryToken.includes("*")) tistory.accessToken = tistoryToken;
  }

  if (section === "channels" || section === "channel_naver" || section === "all") {
    const naver = store.settings.channels.naver;
    naver.enabled = data.get("ch_naver") === "1";
    if (data.has("naverBlogId")) naver.blogId = form(data, "naverBlogId");
    const naverToken = form(data, "naverAccessToken");
    if (naverToken && !naverToken.includes("*")) naver.accessToken = naverToken;
  }

  if (section === "analyze" || section === "all") {
    const analyze = store.settings.analyze || { naverClientId: "", naverClientSecret: "" };
    const clientId = form(data, "naverClientId");
    const clientSecret = form(data, "naverClientSecret");
    if (clientId && !clientId.includes("*")) analyze.naverClientId = clientId;
    if (clientSecret && !clientSecret.includes("*")) analyze.naverClientSecret = clientSecret;
    if (data.has("naverClientId") && !clientId) analyze.naverClientId = "";
    store.settings.analyze = analyze;
  }

  if (section === "copilot" || section === "copilot_api" || section === "all") {
    const seeded = {
      enabled: true,
      tenantId: "",
      clientId: "",
      clientSecret: "",
      apiBaseUrl: "",
      siteName: "",
      siteUrl: "",
      categories: "",
      audience: "",
      notes: "",
    };
    const prev = store.settings.copilot || seeded;
    const incomingSecret = form(data, "copilotClientSecret");
    const clientSecret =
      incomingSecret && !incomingSecret.includes("*") ? incomingSecret : prev.clientSecret || "";

    store.settings.copilot = {
      enabled: data.has("copilotEnabled") ? data.get("copilotEnabled") === "1" : prev.enabled !== false,
      tenantId: data.has("copilotTenantId") ? form(data, "copilotTenantId") || prev.tenantId : prev.tenantId,
      clientId: data.has("copilotClientId") ? form(data, "copilotClientId") || prev.clientId : prev.clientId,
      clientSecret,
      apiBaseUrl: prev.apiBaseUrl || process.env.COPILOT_API_URL || "",
      siteName: data.has("copilotSiteName") ? form(data, "copilotSiteName") || prev.siteName : prev.siteName,
      siteUrl: data.has("copilotSiteUrl") ? form(data, "copilotSiteUrl") || prev.siteUrl : prev.siteUrl,
      categories: data.has("copilotCategories")
        ? form(data, "copilotCategories") || prev.categories
        : prev.categories,
      audience: data.has("copilotAudience") ? form(data, "copilotAudience") || prev.audience : prev.audience,
      notes: data.has("copilotNotes") ? form(data, "copilotNotes") || prev.notes : prev.notes,
    };
  }

  await writeStore(store);
  revalidatePath("/settings");
  revalidatePath("/review");
  revalidatePath("/", "layout");
  const messages: Record<string, string> = {
    ai: "AI 설정을 저장했습니다.",
    channels: "채널 설정을 저장했습니다.",
    channel_wordpress: "워드프레스 설정을 저장했습니다.",
    channel_tistory: "티스토리 설정을 저장했습니다.",
    channel_naver: "네이버 블로그 설정을 저장했습니다.",
    analyze: "분석 API 설정을 저장했습니다.",
    copilot: "Copilot AI 설정을 저장했습니다.",
    copilot_api: "Copilot AI 키를 저장했습니다.",
  };
  return { message: messages[section] || "저장했습니다." };
}

export async function pingAction(data: FormData) {
  await requireReviewer();
  const scope = form(data, "scope");
  try {
    if (scope === "copilot") {
      const { pingCopilot } = await import("@/lib/copilot");
      await pingCopilot();
      return { ok: true, message: "Copilot AI API 연결에 성공했습니다." };
    }
    const provider = form(data, "provider");
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

/** Copilot 결과(이미 화면에 있는 값)를 파이프라인에 저장하고 글 작성으로 이동 */
export async function continueToWriteAction(data: FormData) {
  await requireUser();
  const keyword = form(data, "keyword");
  const fit = form(data, "fit");
  const angle = form(data, "angle");
  if (!keyword) return { error: "키워드가 없습니다." };
  if (fit !== "적합" && fit !== "보통" && fit !== "비추천") {
    return { error: "적합도 정보가 없습니다. Copilot 진단을 먼저 실행하세요." };
  }
  if (fit === "비추천") {
    return { error: "비추천 키워드입니다. 연관·하위 키워드로 다시 진단해 주세요." };
  }

  const parseList = (key: string) => {
    try {
      const raw = form(data, key);
      if (!raw) return [] as string[];
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.map(String).slice(0, 8) : [];
    } catch {
      return [] as string[];
    }
  };

  const brief: ResearchBrief = {
    keyword,
    fit,
    score: Math.max(0, Math.min(100, Number(form(data, "score")) || 0)),
    summary: form(data, "summary"),
    reasons: parseList("reasons"),
    angles: parseList("angles"),
    caution: parseList("caution"),
    nextActions: parseList("nextActions"),
    honeyScore: Number(form(data, "honeyScore")) || undefined,
    limGrade: form(data, "limGrade") || undefined,
    competition: form(data, "competition") || undefined,
    categoryHint: form(data, "categoryHint") || undefined,
    updatedAt: nowIso(),
  };

  const store = await readStore();
  store.pipelineBrief = brief;
  await writeStore(store);
  redirect(buildWriteHref(keyword, { fit: brief.fit, score: brief.score, angle: angle || undefined }));
}
