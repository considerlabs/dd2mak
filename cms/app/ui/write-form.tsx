"use client";

import { useActionState, useState } from "react";
import { writerAction } from "@/app/actions";
import { CategorySelect } from "@/app/ui/category-select";
import { SubmitButton, secondaryBtn } from "@/app/ui/submit-button";
import { plainCharCount } from "@/lib/content";
import type { Post } from "@/lib/store";
import type { CategoryTree } from "@/lib/content";
import Link from "next/link";

export function WriteForm({
  post,
  readOnly,
  tree,
}: {
  post?: Post;
  readOnly?: boolean;
  tree: CategoryTree;
}) {
  const [state, action] = useActionState(writerAction, null);
  const [title, setTitle] = useState(post?.title || "");
  const [keywords, setKeywords] = useState(post?.keywords || "");
  const count = plainCharCount(post?.content || "");
  const research = post?.research || null;

  return (
    <div className="space-y-4">
      {research ? (
        <section className="card border-primary/20 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">이 글의 주제 선정</p>
              <p className="mt-1 text-sm font-semibold">
                {research.keyword}
                <span
                  className={`ml-2 badge ${
                    research.fit === "적합"
                      ? "badge-publish"
                      : research.fit === "비추천"
                        ? "badge-pending"
                        : "badge-primary"
                  }`}
                >
                  {research.fit} · {research.score}
                </span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{research.summary}</p>
            </div>
            <Link
              href={`/analyze/copilot?q=${encodeURIComponent(research.keyword)}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Copilot 다시 보기
            </Link>
          </div>
          {research.angles.length > 0 && !readOnly ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">추천 각도 · 클릭하면 제목에 반영</p>
              <div className="flex flex-wrap gap-2">
                {research.angles.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className="rounded-full border border-border bg-[#f8fafc] px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
                    onClick={() => setTitle(a.slice(0, 80))}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {research.caution.length > 0 ? (
            <p className="mt-3 text-xs text-amber-800">주의: {research.caution.slice(0, 2).join(" · ")}</p>
          ) : null}
        </section>
      ) : !readOnly ? (
        <section className="rounded-xl border border-dashed border-border bg-[#f8fafc] px-4 py-3 text-sm text-muted-foreground">
          키워드 분석·적합도 진단을 거치면 이 글에 주제 요약이 붙습니다.{" "}
          <Link href="/analyze/keyword" className="font-semibold text-primary hover:underline">
            키워드 분석부터 시작
          </Link>
        </section>
      ) : null}

      <form action={action} className="card p-6">
        {state?.error ? <p className="mb-3 text-sm text-destructive">{state.error}</p> : null}
        <input type="hidden" name="id" value={post?.id || ""} />
        <div className="mb-3">
          <CategorySelect key={post?.id || "new-cat"} tree={tree} value={post?.category || ""} readOnly={readOnly} />
        </div>
        <div className="mb-3">
          <label htmlFor="keywords">키워드</label>
          <input
            id="keywords"
            name="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            readOnly={readOnly}
            placeholder="예: 낙상 예방, 실내 조명"
          />
        </div>
        <label htmlFor="title">제목</label>
        <input
          id="title"
          name="title"
          className="mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          readOnly={readOnly}
        />
        <label htmlFor="content">본문</label>
        <textarea
          id="content"
          name="content"
          className="mb-2"
          defaultValue={post?.content || ""}
          readOnly={readOnly}
          key={post?.id ? `${post.id}-content` : "new-content"}
        />
        <p className="mb-4 text-xs text-muted-foreground">글자 수(태그 제외): {count}자 · 목표 약 2,000자</p>

        {post?.excerpt ? (
          <div className="mb-5 rounded-xl border border-border bg-[#f8fafc] px-4 py-3">
            <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">자동 요약</p>
            <p className="text-sm leading-relaxed text-foreground">{post.excerpt}</p>
          </div>
        ) : readOnly ? null : (
          <p className="mb-5 text-xs text-muted-foreground">
            요약은 AI 초안 생성·검수 제출 시 본문 기준으로 자동 생성됩니다.
          </p>
        )}

        {readOnly ? null : (
          <div className="flex flex-wrap gap-2">
            <SubmitButton name="intent" value="generate" className={secondaryBtn}>
              AI 초안 만들기
            </SubmitButton>
            <SubmitButton name="intent" value="save" className={secondaryBtn}>
              임시 저장
            </SubmitButton>
            <SubmitButton name="intent" value="submit">
              검수 제출
            </SubmitButton>
          </div>
        )}
      </form>
    </div>
  );
}
