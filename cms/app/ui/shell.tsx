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

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-900">
      <aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col border-r border-zinc-200 bg-white">
        <Link href="/posts" className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">
          블로그 관리
        </Link>
        <SideNav reviewer={reviewer} pendingCount={pendingCount} />
        <div className="border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500">
          <p className="font-medium text-zinc-800">{user?.name}</p>
          <p className="mb-2">{user?.role === "writer" ? "작성자" : "관리자"}</p>
          <form action={logoutAction}>
            <button className="text-zinc-600 hover:text-zinc-900" type="submit">
              로그아웃
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-6 py-5">{children}</div>
      </main>
    </div>
  );
}
