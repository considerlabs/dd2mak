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
      className={className || "h-8 rounded-md bg-zinc-900 px-3 text-sm text-white disabled:opacity-60"}
    >
      {pending ? "처리 중…" : children}
    </button>
  );
}

export const secondaryBtn =
  "h-8 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-800 hover:bg-zinc-50";
