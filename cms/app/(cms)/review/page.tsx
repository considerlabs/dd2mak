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
      <h1 className="mb-1 text-lg font-semibold">검수 대기</h1>
      <p className="mb-4 text-sm text-zinc-500">제출된 글을 보완한 뒤 발행 채널을 선택해 발행합니다.</p>
      <table className="w-full overflow-hidden rounded-md border border-zinc-200 bg-white text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">제목</th>
            <th className="px-3 py-2 font-medium">작성자</th>
            <th className="px-3 py-2 font-medium">카테고리</th>
            <th className="px-3 py-2 font-medium">제출일</th>
          </tr>
        </thead>
        <tbody>
          {posts.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-zinc-500" colSpan={4}>
                검수 대기 중인 글이 없습니다.
              </td>
            </tr>
          ) : (
            posts.map((p) => (
              <tr key={p.id} className="border-t border-zinc-100">
                <td className="px-3 py-2">
                  <Link className="text-zinc-900 hover:underline" href={`/review/${p.id}`}>
                    {p.title || "(제목 없음)"}
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-600">{authorName(p.authorId)}</td>
                <td className="px-3 py-2 text-zinc-600">{CATEGORIES[p.category] || p.category}</td>
                <td className="px-3 py-2 text-zinc-600">{p.updatedAt.slice(0, 10)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
