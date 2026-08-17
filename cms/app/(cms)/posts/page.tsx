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
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">작성한 글</h1>
          <p className="page-desc">{mine ? "내가 작성한 글 목록입니다." : "작성된 글 전체 목록입니다."}</p>
        </div>
        <Link
          href="/write"
          className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-[0_14px_28px_-16px_rgba(91,33,182,0.75)] hover:bg-primary/92"
        >
          글 작성
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {[
          ["", "전체"],
          ["draft", "작성 중"],
          ["pending", "검수 대기"],
          ["publish", "발행됨"],
        ].map(([value, label]) => (
          <Link
            key={value || "all"}
            href={value ? `/posts?status=${value}` : "/posts"}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === value ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">제목</th>
              {mine ? null : <th className="px-4 py-2.5 font-medium">작성자</th>}
              <th className="px-4 py-2.5 font-medium">카테고리</th>
              <th className="px-4 py-2.5 font-medium">상태</th>
              <th className="px-4 py-2.5 font-medium">수정일</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={mine ? 4 : 5}>
                  글이 없습니다.
                </td>
              </tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id} className="border-t border-border/70">
                  <td className="px-4 py-2.5">
                    <Link className="font-medium hover:text-primary" href={href(p.id, p.status)}>
                      {p.title || "(제목 없음)"}
                    </Link>
                  </td>
                  {mine ? null : <td className="px-4 py-2.5 text-muted-foreground">{authorName(p.authorId)}</td>}
                  <td className="px-4 py-2.5 text-muted-foreground">{CATEGORIES[p.category] || p.category}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-primary">{STATUS_LABEL[p.status]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.updatedAt.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
