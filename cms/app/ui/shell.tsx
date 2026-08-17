import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { SideNav } from "@/app/ui/side-nav";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const store = readStore();
  const user = session ? store.users.find((u) => u.id === session.id) : null;
  const reviewer = Boolean(user && user.role !== "writer");
  const pendingCount = store.posts.filter((p) => p.status === "pending").length;
  const roleLabel = user?.role === "writer" ? "작성자" : "관리자";

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-24 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(91,33,182,0.1)_0%,transparent_70%)]" />
        <div className="absolute top-24 right-0 h-[360px] w-[420px] rounded-full bg-[radial-gradient(ellipse,rgba(124,58,237,0.08)_0%,transparent_70%)]" />
      </div>

      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_20px_-10px_rgba(91,33,182,0.65)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
          <span className="text-[15px] font-bold tracking-tight">블로그 관리</span>
        </Link>
        <SideNav reviewer={reviewer} pendingCount={pendingCount} />
        <div className="mt-auto border-t border-sidebar-border px-4 py-4">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="mb-2 text-xs text-muted-foreground">{roleLabel}</p>
          <form action={logoutAction}>
            <button className="text-xs text-muted-foreground hover:text-primary" type="submit">
              로그아웃
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="flex h-14 items-center justify-end px-6">
            <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card px-2.5 py-1.5">
              <span className="flex size-6 items-center justify-center rounded-md bg-muted text-[11px] font-bold text-primary">
                {user?.name?.slice(0, 1) || "?"}
              </span>
              <span className="text-sm">{user?.name}</span>
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
