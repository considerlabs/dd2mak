import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { categoryLabel } from "@/lib/content";
import { readStore } from "@/lib/store";
import { getWpCategoryTree } from "@/lib/wordpress";

export default async function ReviewListPage() {
  const session = await getSession();
  if (session?.role === "writer") redirect("/write");
  const store = await readStore();
  const tree = await getWpCategoryTree();
  const posts = store.posts.filter((p) => p.status === "pending");

  function authorName(id: string) {
    return store.users.find((u) => u.id === id)?.name || "-";
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="page-title">검수 대기</h1>
        <p className="page-desc">제출된 글을 보완한 뒤 발행 채널을 선택해 발행합니다.</p>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">대기 목록</h2>
            <p className="text-xs text-muted-foreground">{posts.length}건의 글이 검수를 기다립니다.</p>
          </div>
          <span className="badge badge-pending">{posts.length}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>작성자</th>
                <th>카테고리</th>
                <th>제출일</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td className="!py-12 text-center text-muted-foreground" colSpan={5}>
                    검수 대기 중인 글이 없습니다.
                  </td>
                </tr>
              ) : (
                posts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link className="font-semibold hover:text-primary" href={`/review/${p.id}`}>
                        {p.title || "(제목 없음)"}
                      </Link>
                    </td>
                    <td className="text-muted-foreground">{authorName(p.authorId)}</td>
                    <td className="text-muted-foreground">{categoryLabel(p.category, tree)}</td>
                    <td className="text-muted-foreground">{p.updatedAt.slice(0, 10)}</td>
                    <td>
                      <Link href={`/review/${p.id}`} className="btn-primary !h-8 !px-3 text-xs">
                        검수
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
