import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { SideNav } from "@/app/ui/side-nav";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const store = await readStore();
  const user = session ? store.users.find((u) => u.id === session.id) : null;
  const reviewer = Boolean(user && user.role !== "writer");
  const pendingCount = store.posts.filter((p) => p.status === "pending").length;
  const roleLabel = user?.role === "writer" ? "작성자" : "관리자";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 z-30 flex h-screen w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <Link href="/" className="flex items-center gap-3 px-5 py-5">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-primary)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
          <span>
            <span className="block text-[15px] font-bold tracking-tight">블로그 관리</span>
            <span className="block text-[11px] text-muted-foreground">dd2mak CMS</span>
          </span>
        </Link>

        <form action="/posts" method="get" className="px-4 pb-3">
          <label className="relative mb-0 block">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              name="q"
              type="search"
              placeholder="글 검색…"
              className="toolbar-input h-10 w-full bg-[#f8fafc] text-sm placeholder:text-slate-400"
            />
          </label>
        </form>

        <SideNav reviewer={reviewer} pendingCount={pendingCount} />

        <div className="mt-auto border-t border-sidebar-border px-4 py-4">
          <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-[#f8fafc] px-2.5 py-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-primary">
              {user?.name?.slice(0, 1) || "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="text-xs font-medium text-muted-foreground hover:text-primary" type="submit">
              로그아웃
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-card/90 backdrop-blur-md">
          <div className="flex h-[64px] items-center justify-between gap-4 px-7">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">콘텐츠</p>
              <p className="truncate text-sm font-semibold text-foreground">작성 · 검수 · 발행 워크플로</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/write" className="btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                글 작성
              </Link>
              <div className="ml-1 flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 shadow-[var(--shadow-sm)]">
                <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-primary">
                  {user?.name?.slice(0, 1) || "?"}
                </span>
                <span className="hidden text-sm font-medium sm:inline">{user?.name}</span>
              </div>
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-7 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
