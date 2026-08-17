"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  name,
  value,
  className,
}: {
  children: React.ReactNode;
  name?: string;
  value?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={
        className ||
        "inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-[0_14px_28px_-16px_rgba(91,33,182,0.75)] hover:bg-primary/92 disabled:opacity-60"
      }
    >
      {pending ? "처리 중…" : children}
    </button>
  );
}

export const secondaryBtn =
  "inline-flex h-9 items-center rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground hover:bg-muted";
