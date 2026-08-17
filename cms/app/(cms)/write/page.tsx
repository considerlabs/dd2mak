import { WriteForm } from "@/app/ui/write-form";
import { getWpCategoryTree } from "@/lib/wordpress";

export default async function WritePage() {
  const tree = await getWpCategoryTree();
  return (
    <>
      <h1 className="page-title mb-5">글 작성</h1>
      <WriteForm tree={tree} />
    </>
  );
}
