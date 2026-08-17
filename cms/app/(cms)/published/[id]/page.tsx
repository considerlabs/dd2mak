import { notFound, redirect } from "next/navigation";
import { ReviewForm } from "@/app/ui/review-form";
import { getSession } from "@/lib/auth";
import { configuredChannels } from "@/lib/channels";
import { readStore } from "@/lib/store";

export default async function PublishedEditPage({ params }: PageProps<"/published/[id]">) {
  const session = await getSession();
  if (session?.role === "writer") redirect("/write");
  const { id } = await params;
  const post = readStore().posts.find((p) => p.id === id && p.status === "publish");
  if (!post) notFound();
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold">발행된 글</h1>
      <ReviewForm post={post} ready={configuredChannels()} />
    </>
  );
}
