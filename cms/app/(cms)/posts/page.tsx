import Link from "next/link";
import { getSession } from "@/lib/auth";
import { categoryLabel, STATUS_LABEL } from "@/lib/content";
import { readStore } from "@/lib/store";
import { StatusBadge } from "@/app/ui/status-badge";
import { getWpCategoryTree } from "@/lib/wordpress";

export default async function PostsPage({ searchParams }: PageProps<"/posts">) {
  const session = await getSession();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const store = await readStore();
  const tree = await getWpCategoryTree();
  const mine = session?.role === "writer";
  let posts = mine ? store.posts.filter((p) => p.authorId === session.id) : store.posts;
  if (status && ["draft", "pending", "publish"].includes(status)) {
    posts = posts.filter((p) => p.status === status);
  }
  if (q) {
    const needle = q.toLowerCase();
    posts = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.keywords.toLowerCase().includes(needle) ||
        categoryLabel(p.category, tree).toLowerCase().includes(needle)
    );
  }

  function href(id: string, st: string) {
    if (mine || st === "draft") return `/write/${id}`;
    if (st === "pending") return `/review/${id}`;
    return `/published/${id}`;
  }

  function authorName(id: string) {
    return store.users.find((u) => u.id === id)?.name || "-";
  }

  const tabs = [
    ["", "전체"],
    ["draft", "작성 중"],
    ["pending", "검수 대기"],
    ["publish", "발행됨"],
  ] as const;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">작성한 글</h1>
          <p className="page-desc">{mine ? "내가 작성한 글 목록입니다." : "작성된 글 전체 목록입니다."}</p>
        </div>
        <Link href="/write" className="btn-primary">
          글 작성
        </Link>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 pt-2">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(([value, label]) => {
              const active = status === value;
              const hrefTab = value ? `/posts?status=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}` : q ? `/posts?q=${encodeURIComponent(q)}` : "/posts";
              return (
                <Link
                  key={value || "all"}
                  href={hrefTab}
                  className={`relative px-3 py-3 text-sm font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                  {active ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" /> : null}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          <form action="/posts" method="get" className="relative min-w-[220px] flex-1">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="제목·키워드 검색"
              className="toolbar-input"
            />
          </form>
          <Link href="/write" className="btn-primary shrink-0">
            + 새 글
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>제목</th>
                {mine ? null : <th>작성자</th>}
                <th>카테고리</th>
                <th>상태</th>
                <th>수정일</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td className="!py-12 text-center text-muted-foreground" colSpan={mine ? 5 : 6}>
                    {q ? "검색 결과가 없습니다." : "글이 없습니다."}
                  </td>
                </tr>
              ) : (
                posts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link className="font-semibold hover:text-primary" href={href(p.id, p.status)}>
                        {p.title || "(제목 없음)"}
                      </Link>
                    </td>
                    {mine ? null : <td className="text-muted-foreground">{authorName(p.authorId)}</td>}
                    <td className="text-muted-foreground">{categoryLabel(p.category, tree)}</td>
                    <td>
                      <StatusBadge status={p.status} label={STATUS_LABEL[p.status]} />
                    </td>
                    <td className="text-muted-foreground">{p.updatedAt.slice(0, 10)}</td>
                    <td>
                      <Link href={href(p.id, p.status)} className="btn-secondary !h-8 !px-3 text-xs">
                        열기
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
