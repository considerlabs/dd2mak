import { WriteForm } from "@/app/ui/write-form";
import { PipelineSteps } from "@/app/ui/pipeline-steps";
import { getWpCategoryTree } from "@/lib/wordpress";
import { readStore, writeStore } from "@/lib/store";

/** 새 글 작성은 항상 빈 화면. 이전 파이프라인/초안 잔여 데이터는 쓰지 않는다. */
export default async function WritePage() {
  const tree = await getWpCategoryTree();
  const store = await readStore();
  if (store.pipelineBrief) {
    store.pipelineBrief = null;
    await writeStore(store);
  }

  return (
    <>
      <h1 className="page-title mb-2">글 작성</h1>
      <p className="page-desc mb-4">새 글을 작성합니다. 이전 초안은 &quot;작성한 글&quot;에서 이어서 수정하세요.</p>
      <PipelineSteps current="write" />
      <WriteForm key="new-write" tree={tree} />
    </>
  );
}
