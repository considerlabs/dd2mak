import { notFound } from "next/navigation";
import { WriteForm } from "@/app/ui/write-form";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";
import { getWpCategoryTree } from "@/lib/wordpress";

export default async function WriteEditPage({ params }: PageProps<"/write/[id]">) {
  const { id } = await params;
  const session = await getSession();
  const post = readStore().posts.find((p) => p.id === id);
  if (!post || !session || post.authorId !== session.id) notFound();
  const readOnly = post.status !== "draft";
  const tree = await getWpCategoryTree();

  return (
    <>
      <h1 className="page-title mb-5">{readOnly ? "글 보기" : "글 수정"}</h1>
      <WriteForm post={post} readOnly={readOnly} tree={tree} />
    </>
  );
}
