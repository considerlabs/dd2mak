"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions";
import { SubmitButton } from "@/app/ui/submit-button";

export function AccountForm() {
  const [state, action] = useActionState(
    async (_p: { error?: string; message?: string } | null, data: FormData) => changePasswordAction(data),
    null
  );

  return (
    <form action={action} className="card max-w-md p-6" key={state?.message || "form"}>
      <div className="mb-5">
        <h2 className="text-sm font-semibold">비밀번호 변경</h2>
        <p className="mt-1 text-xs text-muted-foreground">현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿉니다.</p>
      </div>

      {state?.error ? (
        <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}
      {state?.message ? (
        <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success">{state.message}</p>
      ) : null}

      <label htmlFor="currentPassword">현재 비밀번호</label>
      <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" className="mb-3" required />

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
  );
}
