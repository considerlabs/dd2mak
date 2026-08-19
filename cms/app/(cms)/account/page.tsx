import { redirect } from "next/navigation";
import { AccountForm } from "@/app/ui/account-form";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await readStore();
  const user = store.users.find((u) => u.id === session.id);
  if (!user) redirect("/login");

  const roleLabel = user.role === "writer" ? "작성자" : "관리자";
  const roleHint =
    user.role === "writer"
      ? "글 작성·제출 권한이 있습니다."
      : "검수·발행·설정 권한이 있습니다.";

  return (
    <>
      <div className="mb-6">
        <h1 className="page-title">내 정보</h1>
        <p className="page-desc">계정 정보 확인과 비밀번호·세션을 관리합니다.</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-4">
        <section className="card overflow-hidden">
          <div className="flex items-center gap-4 border-b border-border bg-gradient-to-br from-primary/[0.06] to-transparent px-6 py-5">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-[var(--shadow-primary)]">
              {user.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold tracking-tight">{user.name}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">@{user.login}</p>
            </div>
            <span className="ml-auto shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-primary">
              {roleLabel}
            </span>
          </div>

          <dl className="divide-y divide-border">
            <div className="flex items-baseline justify-between gap-4 px-6 py-4">
              <dt className="text-sm text-muted-foreground">이름</dt>
              <dd className="text-sm font-semibold text-foreground">{user.name}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 px-6 py-4">
              <dt className="text-sm text-muted-foreground">계정 ID</dt>
              <dd className="font-mono text-sm font-semibold text-foreground">{user.login}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 px-6 py-4">
              <dt className="text-sm text-muted-foreground">역할</dt>
              <dd className="text-right">
                <p className="text-sm font-semibold text-foreground">{roleLabel}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{roleHint}</p>
              </dd>
            </div>
          </dl>
        </section>

        <AccountForm />
      </div>
    </>
  );
}
