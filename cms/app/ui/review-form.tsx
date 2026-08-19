"use client";

import { useActionState } from "react";
import { publishAction, saveReviewAction } from "@/app/actions";
import { SubmitButton, secondaryBtn } from "@/app/ui/submit-button";
import { CATEGORIES, CHANNEL_LABEL, plainCharCount } from "@/lib/content";
import type { ChannelId, Post } from "@/lib/store";

const CHANNELS: ChannelId[] = ["wordpress", "tistory", "naver"];

function friendlyChannelError(error?: string) {
  if (!error) return "실패";
  if (/허용하지 않았|로그인 상태가 아닙|인증에 실패|rest_cannot_create|rest_not_logged_in|not allowed|not logged/i.test(error)) {
    return "워드프레스 인증 실패 — 사이트 로그인 비밀번호가 아닙니다. 설정 → 발행 채널에서 '애플리케이션 비밀번호'를 저장한 뒤 다시 발행하세요.";
  }
  return error;
}

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
    <div className="space-y-4">
      {post.research ? (
        <section className="card border-primary/20 p-5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">왜 이 키워드인가</p>
          <p className="mt-1 text-sm font-semibold">
            {post.research.keyword}
            <span
              className={`ml-2 badge ${
                post.research.fit === "적합"
                  ? "badge-publish"
                  : post.research.fit === "비추천"
                    ? "badge-pending"
                    : "badge-primary"
              }`}
            >
              {post.research.fit} · {post.research.score}
            </span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{post.research.summary}</p>
          {post.research.reasons.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {post.research.reasons.slice(0, 3).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
          {post.research.caution.length > 0 ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              검수 포인트: {post.research.caution.join(" · ")}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-muted-foreground">
            출처·수치·주의 문구를 확인한 뒤 발행하세요.
            {post.research.honeyScore != null
              ? ` · 든든지수 ${post.research.honeyScore}/30 · ${post.research.limGrade || ""} ${post.research.competition || ""}`
              : ""}
          </p>
        </section>
      ) : null}

      <form action={action} className="card p-6">
      {state?.error ? <p className="mb-3 text-sm text-destructive">{state.error}</p> : null}
      {"ok" in (state || {}) ? <p className="mb-3 text-sm text-success">저장했습니다.</p> : null}
      <input type="hidden" name="id" value={post.id} />
      <p className="mb-3 text-sm text-muted-foreground">카테고리: {CATEGORIES[post.category] || post.category}</p>
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
      <label htmlFor="excerpt">요약 <span className="font-normal text-muted-foreground">(본문 기반 자동 생성 · 필요 시 수정)</span></label>
      <input id="excerpt" name="excerpt" className="mb-3" defaultValue={post.excerpt || ""} />
      <label htmlFor="content">본문</label>
      <textarea id="content" name="content" className="mb-2" defaultValue={post.content} />
      <p className="mb-4 text-xs text-muted-foreground">글자 수(태그 제외): {plainCharCount(post.content)}자</p>

      {Object.keys(post.channelResults || {}).length > 0 ? (
        <div className="mb-4 rounded-lg bg-muted/70 p-3 text-sm">
          <p className="mb-1 font-medium">채널 발행 결과</p>
          {CHANNELS.map((id) => {
            const r = post.channelResults[id];
            if (!r) return null;
            return (
              <p key={id} className={r.ok ? "text-success" : "text-destructive"}>
                {CHANNEL_LABEL[id]}: {r.ok ? "성공" : friendlyChannelError(r.error)}
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
        <fieldset className="mb-4 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium">발행 채널</legend>
          <p className="mb-2 text-xs text-muted-foreground">워드프레스는 기본 선택입니다. 연결한 채널을 추가로 체크하면 동시에 발행합니다.</p>
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
              {ready[id] ? null : <span className="text-xs text-muted-foreground">· 설정에서 연결 필요</span>}
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
    </div>
  );
}
