import { CHANNEL_LABEL } from "./content";
import type { ChannelId, ChannelResult, Post } from "./store";
import { readStore } from "./store";
import { publishToWordPress } from "./wordpress";

export function configuredChannels() {
  const { channels } = readStore().settings;
  return {
    wordpress: Boolean(channels.wordpress.enabled && channels.wordpress.url && channels.wordpress.user && channels.wordpress.appPassword),
    tistory: Boolean(channels.tistory.enabled && channels.tistory.blogName && channels.tistory.accessToken),
    naver: Boolean(channels.naver.enabled && channels.naver.accessToken),
  };
}

export async function publishToChannels(post: Post, selected: ChannelId[]) {
  const results: Partial<Record<ChannelId, ChannelResult>> = { ...post.channelResults };
  const ready = configuredChannels();
  if (selected.length === 0) throw new Error("발행할 채널을 하나 이상 선택하세요.");

  for (const id of selected) {
    if (!ready[id]) {
      results[id] = { ok: false, error: `${CHANNEL_LABEL[id]} 설정이 없습니다. 설정 화면에서 채널을 연결하세요.` };
      continue;
    }
    try {
      if (id === "wordpress") {
        const wpId = await publishToWordPress(post);
        const base = readStore().settings.channels.wordpress.url.replace(/\/$/, "");
        results.wordpress = { ok: true, id: String(wpId), url: `${base}/?p=${wpId}` };
      } else if (id === "tistory") {
        results.tistory = await publishToTistory(post);
      } else if (id === "naver") {
        results.naver = await publishToNaver(post);
      }
    } catch (e) {
      results[id] = { ok: false, error: e instanceof Error ? e.message : "발행 실패" };
    }
  }
  return results;
}

async function publishToTistory(post: Post): Promise<ChannelResult> {
  const { blogName, accessToken } = readStore().settings.channels.tistory;
  const body = new URLSearchParams({
    access_token: accessToken,
    output: "json",
    blogName,
    title: post.title,
    content: post.content,
    visibility: "3",
    tag: post.keywords,
  });
  const res = await fetch("https://www.tistory.com/apis/post/write", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await readJson(res);
  const status = String(data?.tistory?.status || res.status);
  if (status !== "200") {
    throw new Error(data?.tistory?.error_message || data?.tistory?.item?.error_message || `티스토리 발행 실패 (${status})`);
  }
  return {
    ok: true,
    id: String(data.tistory.postId || ""),
    url: data.tistory.url || `https://${blogName}.tistory.com/${data.tistory.postId}`,
  };
}

async function publishToNaver(post: Post): Promise<ChannelResult> {
  const { accessToken, blogId } = readStore().settings.channels.naver;
  const body = new URLSearchParams({
    title: post.title,
    contents: post.content,
  });
  if (blogId) body.set("blogId", blogId);
  const res = await fetch("https://openapi.naver.com/blog/writePost.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    },
    body,
  });
  const data = await readJson(res);
  if (!res.ok || data?.message?.error) {
    throw new Error(data?.message?.error?.msg || data?.errorMessage || `네이버 블로그 발행 실패 (${res.status})`);
  }
  const url = data?.message?.result?.postUrl || data?.result?.postUrl || "";
  return { ok: true, id: String(data?.message?.result?.postNo || ""), url };
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`응답이 JSON이 아닙니다 (${res.status}). API 권한·만료를 확인하세요.`);
  }
}
