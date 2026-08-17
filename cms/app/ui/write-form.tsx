"use client";

import { useActionState } from "react";
import { writerAction } from "@/app/actions";
import { CategorySelect } from "@/app/ui/category-select";
import { SubmitButton, secondaryBtn } from "@/app/ui/submit-button";
import { plainCharCount } from "@/lib/content";
import type { Post } from "@/lib/store";
import type { CategoryTree } from "@/lib/content";

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
  const count = plainCharCount(post?.content || "");

  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-white p-5">
      {state?.error ? <p className="mb-3 text-sm text-red-600">{state.error}</p> : null}
      <input type="hidden" name="id" value={post?.id || ""} />
      <div className="mb-3">
        <CategorySelect tree={tree} value={post?.category} readOnly={readOnly} />
      </div>
      <div className="mb-3">
        <label htmlFor="keywords">키워드</label>
        <input id="keywords" name="keywords" defaultValue={post?.keywords || ""} readOnly={readOnly} placeholder="예: 낙상 예방, 실내 조명" />
      </div>
      <label htmlFor="title">제목</label>
      <input id="title" name="title" className="mb-3" defaultValue={post?.title || ""} readOnly={readOnly} />
      <label htmlFor="excerpt">요약</label>
      <input id="excerpt" name="excerpt" className="mb-3" defaultValue={post?.excerpt || ""} readOnly={readOnly} placeholder="목록에 보일 한두 줄 요약" />
      <label htmlFor="content">본문</label>
      <textarea id="content" name="content" className="mb-2" defaultValue={post?.content || ""} readOnly={readOnly} />
      <p className="mb-4 text-xs text-zinc-500">글자 수(태그 제외): {count}자 · 목표 약 2,000자</p>
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
  );
}
