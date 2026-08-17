import Link from "next/link";
import { getSession } from "@/lib/auth";
import { CATEGORIES, STATUS_LABEL } from "@/lib/content";
import { readStore } from "@/lib/store";

export default async function PostsPage({ searchParams }: PageProps<"/posts">) {
  const session = await getSession();
  const { status } = await searchParams;
  const store = readStore();
  const mine = session?.role === "writer";
  let posts = mine ? store.posts.filter((p) => p.authorId === session.id) : store.posts;
  const filter = typeof status === "string" ? status : "";
  if (filter && ["draft", "pending", "publish"].includes(filter)) {
    posts = posts.filter((p) => p.status === filter);
  }

  function href(id: string, st: string) {
    if (mine || st === "draft") return `/write/${id}`;
    if (st === "pending") return `/review/${id}`;
    return `/published/${id}`;
  }

  function authorName(id: string) {
    return store.users.find((u) => u.id === id)?.name || "-";
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">작성한 글</h1>
          <p className="text-sm text-zinc-500">{mine ? "내가 작성한 글 목록입니다." : "작성된 글 전체 목록입니다."}</p>
        </div>
        <Link className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 text-sm text-white" href="/write">
          글 작성
        </Link>
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {[
          ["", "전체"],
          ["draft", "작성 중"],
          ["pending", "검수 대기"],
          ["publish", "발행됨"],
        ].map(([value, label]) => (
          <Link
            key={value || "all"}
            href={value ? `/posts?status=${value}` : "/posts"}
            className={`rounded-md px-2.5 py-1 text-sm ${filter === value ? "bg-zinc-900 text-white" : "bg-white text-zinc-700"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <table className="w-full overflow-hidden rounded-md border border-zinc-200 bg-white text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">제목</th>
            {mine ? null : <th className="px-3 py-2 font-medium">작성자</th>}
            <th className="px-3 py-2 font-medium">카테고리</th>
            <th className="px-3 py-2 font-medium">상태</th>
            <th className="px-3 py-2 font-medium">수정일</th>
          </tr>
        </thead>
        <tbody>
          {posts.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-zinc-500" colSpan={mine ? 4 : 5}>
                글이 없습니다.
              </td>
            </tr>
          ) : (
            posts.map((p) => (
              <tr key={p.id} className="border-t border-zinc-100">
                <td className="px-3 py-2">
                  <Link className="text-zinc-900 hover:underline" href={href(p.id, p.status)}>
                    {p.title || "(제목 없음)"}
                  </Link>
                </td>
                {mine ? null : <td className="px-3 py-2 text-zinc-600">{authorName(p.authorId)}</td>}
                <td className="px-3 py-2 text-zinc-600">{CATEGORIES[p.category] || p.category}</td>
                <td className="px-3 py-2 text-zinc-600">{STATUS_LABEL[p.status]}</td>
                <td className="px-3 py-2 text-zinc-600">{p.updatedAt.slice(0, 10)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
