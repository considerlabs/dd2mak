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
      className={className || "btn-primary disabled:opacity-60"}
    >
      {pending ? "처리 중…" : children}
    </button>
  );
}

export const secondaryBtn = "btn-secondary disabled:opacity-60";
