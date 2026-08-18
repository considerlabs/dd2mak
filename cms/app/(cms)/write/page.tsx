import { WriteForm } from "@/app/ui/write-form";
import { PipelineSteps } from "@/app/ui/pipeline-steps";
import { getWpCategoryTree } from "@/lib/wordpress";
import { readStore } from "@/lib/store";

export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ keywords?: string; fit?: string; score?: string; angle?: string; from?: string }>;
}) {
  const tree = await getWpCategoryTree();
  const params = await searchParams;
  const keywords = typeof params.keywords === "string" ? params.keywords.trim() : "";
  const angle = typeof params.angle === "string" ? params.angle.trim() : "";
  const store = readStore();
  const brief =
    store.pipelineBrief && (!keywords || store.pipelineBrief.keyword === keywords)
      ? store.pipelineBrief
      : store.pipelineBrief && keywords
        ? { ...store.pipelineBrief, keyword: keywords }
        : null;

  const seed =
    keywords || brief
      ? {
          id: "",
          title: "",
          content: "",
          category: "",
          keywords: keywords || brief?.keyword || "",
          excerpt: "",
          status: "draft" as const,
          authorId: "",
          source: "",
          reviewedAt: "",
          caution: "",
          aiDraft: false,
          wpPostId: null,
          channelResults: {},
          research: brief,
          createdAt: "",
          updatedAt: "",
        }
      : undefined;

  return (
    <>
      <h1 className="page-title mb-2">글 작성</h1>
      <p className="page-desc mb-4">적합도 진단을 거친 키워드로 초안을 작성합니다.</p>
      <PipelineSteps current="write" keyword={keywords || brief?.keyword || undefined} />
      <WriteForm tree={tree} post={seed} brief={brief} angleHint={angle} />
    </>
  );
}
