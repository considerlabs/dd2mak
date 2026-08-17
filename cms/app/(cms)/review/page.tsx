import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CATEGORIES } from "@/lib/content";
import { readStore } from "@/lib/store";

export default async function ReviewListPage() {
  const session = await getSession();
  if (session?.role === "writer") redirect("/write");
  const store = readStore();
  const posts = store.posts.filter((p) => p.status === "pending");

  function authorName(id: string) {
    return store.users.find((u) => u.id === id)?.name || "-";
  }

  return (
    <>
      <h1 className="page-title">검수 대기</h1>
      <p className="page-desc mb-5">제출된 글을 보완한 뒤 발행 채널을 선택해 발행합니다.</p>
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">제목</th>
              <th className="px-4 py-2.5 font-medium">작성자</th>
              <th className="px-4 py-2.5 font-medium">카테고리</th>
              <th className="px-4 py-2.5 font-medium">제출일</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={4}>
                  검수 대기 중인 글이 없습니다.
                </td>
              </tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id} className="border-t border-border/70">
                  <td className="px-4 py-2.5">
                    <Link className="font-medium hover:text-primary" href={`/review/${p.id}`}>
                      {p.title || "(제목 없음)"}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{authorName(p.authorId)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{CATEGORIES[p.category] || p.category}</td>
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
