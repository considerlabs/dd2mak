"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";
import { SubmitButton } from "@/app/ui/submit-button";

export default function LoginPage() {
  const [state, action] = useActionState(
    async (_prev: { error?: string } | null, data: FormData) => loginAction(data),
    null
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <form action={action} className="w-full max-w-sm rounded-md border border-zinc-200 bg-white p-6">
        <h1 className="mb-1 text-lg font-semibold">블로그 관리</h1>
        <p className="mb-5 text-sm text-zinc-500">글 작성 · 검수 · 발행</p>
        {state?.error ? <p className="mb-3 text-sm text-red-600">{state.error}</p> : null}
        <label htmlFor="login">아이디</label>
        <input id="login" name="login" className="mb-3" autoComplete="username" />
        <label htmlFor="password">비밀번호</label>
        <input id="password" name="password" type="password" className="mb-5" autoComplete="current-password" />
        <SubmitButton>로그인</SubmitButton>
        <p className="mt-4 text-xs text-zinc-500">
          writer / writer
          <br />
          reviewer / reviewer
        </p>
      </form>
    </div>
  );
}
