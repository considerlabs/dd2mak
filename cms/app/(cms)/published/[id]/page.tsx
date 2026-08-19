import { notFound, redirect } from "next/navigation";
import { ReviewForm } from "@/app/ui/review-form";
import { getSession } from "@/lib/auth";
import { categoryLabel } from "@/lib/content";
import { configuredChannels } from "@/lib/channels";
import { readStore } from "@/lib/store";
import { getWpCategoryTree } from "@/lib/wordpress";

export default async function PublishedEditPage({ params }: PageProps<"/published/[id]">) {
  const session = await getSession();
  if (session?.role === "writer") redirect("/write");
  const { id } = await params;
  const post = (await readStore()).posts.find((p) => p.id === id && p.status === "publish");
  if (!post) notFound();
  const tree = await getWpCategoryTree();
  return (
    <>
      <h1 className="page-title mb-5">발행된 글</h1>
      <ReviewForm
        post={post}
        ready={await configuredChannels()}
        categoryDisplay={categoryLabel(post.category, tree)}
      />
    </>
  );
}
