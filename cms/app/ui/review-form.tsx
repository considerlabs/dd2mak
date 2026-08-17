"use client";

import { useActionState } from "react";
import { publishAction, saveReviewAction } from "@/app/actions";
import { SubmitButton, secondaryBtn } from "@/app/ui/submit-button";
import { CATEGORIES, CHANNEL_LABEL, plainCharCount } from "@/lib/content";
import type { ChannelId, Post } from "@/lib/store";

const CHANNELS: ChannelId[] = ["wordpress", "tistory", "naver"];

export function ReviewForm({ post, ready }: { post: Post; ready: Record<ChannelId, boolean> }) {
  const pending = post.status === "pending";
  const [state, action] = useActionState(
    async (_p: { error?: string } | null, data: FormData) => {
      const intent = String(data.get("intent") || "");
      if (intent === "publish") return publishAction(data);
      return saveReviewAction(data);
    },
    null
  );

  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-white p-5">
      {state?.error ? <p className="mb-3 text-sm text-red-600">{state.error}</p> : null}
      {"ok" in (state || {}) ? <p className="mb-3 text-sm text-green-700">저장했습니다.</p> : null}
      <input type="hidden" name="id" value={post.id} />
      <p className="mb-3 text-sm text-zinc-500">카테고리: {CATEGORIES[post.category] || post.category}</p>
      <label htmlFor="title">제목</label>
      <input id="title" name="title" className="mb-3" defaultValue={post.title} />
      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="source">정보 출처</label>
          <input id="source" name="source" defaultValue={post.source} />
        </div>
        <div>
          <label htmlFor="reviewedAt">최종 검수일</label>
          <input id="reviewedAt" name="reviewedAt" type="date" defaultValue={post.reviewedAt || new Date().toISOString().slice(0, 10)} />
        </div>
      </div>
      <label htmlFor="caution">주의 문구</label>
      <textarea id="caution" name="caution" className="mb-3 min-h-20" defaultValue={post.caution} />
      <label className="mb-3 flex items-center gap-2 font-normal">
        <input type="checkbox" name="aiDraft" value="1" defaultChecked={post.aiDraft} className="h-4 w-4" />
        AI 초안 표시 유지
      </label>
      <label htmlFor="excerpt">요약</label>
      <input id="excerpt" name="excerpt" className="mb-3" defaultValue={post.excerpt || ""} />
      <label htmlFor="content">본문</label>
      <textarea id="content" name="content" className="mb-2" defaultValue={post.content} />
      <p className="mb-4 text-xs text-zinc-500">글자 수(태그 제외): {plainCharCount(post.content)}자</p>

      {Object.keys(post.channelResults || {}).length > 0 ? (
        <div className="mb-4 rounded-md bg-zinc-50 p-3 text-sm">
          <p className="mb-1 font-medium">채널 발행 결과</p>
          {CHANNELS.map((id) => {
            const r = post.channelResults[id];
            if (!r) return null;
            return (
              <p key={id} className={r.ok ? "text-green-700" : "text-red-600"}>
                {CHANNEL_LABEL[id]}: {r.ok ? "성공" : r.error || "실패"}
                {r.url ? (
                  <>
                    {" "}
                    <a className="underline" href={r.url} target="_blank" rel="noreferrer">
                      글 보기
                    </a>
                  </>
                ) : null}
              </p>
            );
          })}
        </div>
      ) : null}

      {pending ? (
        <fieldset className="mb-4 rounded-md border border-zinc-200 p-3">
          <legend className="px-1 text-sm font-medium">발행 채널</legend>
          <p className="mb-2 text-xs text-zinc-500">워드프레스는 기본 선택입니다. 연결한 채널을 추가로 체크하면 동시에 발행합니다.</p>
          {CHANNELS.map((id) => (
            <label key={id} className="mb-1 flex items-center gap-2 font-normal">
              <input
                type="checkbox"
                name="channels"
                value={id}
                defaultChecked={id === "wordpress"}
                disabled={!ready[id]}
                className="h-4 w-4"
              />
              {CHANNEL_LABEL[id]}
              {ready[id] ? null : <span className="text-xs text-zinc-400">· 설정에서 연결 필요</span>}
            </label>
          ))}
        </fieldset>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <SubmitButton name="intent" value="save" className={secondaryBtn}>
          검수 내용 저장
        </SubmitButton>
        {pending ? <SubmitButton name="intent" value="publish">선택한 채널에 발행</SubmitButton> : null}
      </div>
    </form>
  );
}
