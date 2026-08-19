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
    <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 left-1/2 h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(91,33,182,0.12)_0%,transparent_70%)]" />
        <div className="absolute right-0 bottom-0 h-[320px] w-[420px] rounded-full bg-[radial-gradient(ellipse,rgba(124,58,237,0.1)_0%,transparent_70%)]" />
      </div>
      <form action={action} className="card w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">블로그 관리</h1>
            <p className="text-xs text-muted-foreground">글 작성 · 검수 · 발행</p>
          </div>
        </div>
        {state?.error ? (
          <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-destructive">{state.error}</p>
        ) : null}
        <label htmlFor="login">아이디</label>
        <input id="login" name="login" className="mb-3" autoComplete="username" />
        <label htmlFor="password">비밀번호</label>
        <input id="password" name="password" type="password" className="mb-6" autoComplete="current-password" />
        <SubmitButton>로그인</SubmitButton>
      </form>
    </div>
  );
}
