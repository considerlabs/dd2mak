"use client";

import { useActionState } from "react";
import { changePasswordAction, logoutAction } from "@/app/actions";
import { SubmitButton, secondaryBtn } from "@/app/ui/submit-button";

export function AccountForm() {
  const [state, action] = useActionState(
    async (_p: { error?: string; message?: string } | null, data: FormData) => changePasswordAction(data),
    null
  );

  return (
    <div className="space-y-4">
      <form action={action} className="card p-6" key={state?.message || "form"}>
        <div className="mb-5">
          <h2 className="text-sm font-semibold">보안</h2>
          <p className="mt-1 text-xs text-muted-foreground">현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿉니다.</p>
        </div>

        {state?.error ? (
          <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-destructive">{state.error}</p>
        ) : null}
        {state?.message ? (
          <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success">{state.message}</p>
        ) : null}

        <label htmlFor="currentPassword">현재 비밀번호</label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          className="mb-3"
          required
        />

        <label htmlFor="newPassword">새 비밀번호</label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          className="mb-3"
          required
        />

        <label htmlFor="confirmPassword">새 비밀번호 확인</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          className="mb-5"
          required
        />

        <SubmitButton>비밀번호 변경</SubmitButton>
      </form>

      <div className="card p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">세션</h2>
          <p className="mt-1 text-xs text-muted-foreground">이 기기에서 계정 접속을 종료합니다.</p>
        </div>
        <form action={logoutAction}>
          <SubmitButton className={secondaryBtn}>로그아웃</SubmitButton>
        </form>
      </div>
    </div>
  );
}
