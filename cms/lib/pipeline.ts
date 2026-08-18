import type { ResearchBrief } from "@/lib/store";

export type { ResearchBrief };
export type PipelineFit = ResearchBrief["fit"];

export function buildWriteHref(keyword: string, opts?: { fit?: string; score?: number; angle?: string }) {
  const params = new URLSearchParams();
  params.set("keywords", keyword);
  params.set("from", "pipeline");
  if (opts?.fit) params.set("fit", opts.fit);
  if (opts?.score != null) params.set("score", String(opts.score));
  if (opts?.angle) params.set("angle", opts.angle);
  return `/write?${params.toString()}`;
}

export function buildCopilotHref(keyword: string) {
  return `/analyze/copilot?q=${encodeURIComponent(keyword)}&from=keyword`;
}

export const PIPELINE_STEPS = [
  { id: "keyword", label: "키워드 분석", href: "/analyze/keyword" },
  { id: "copilot", label: "적합도 진단", href: "/analyze/copilot" },
  { id: "write", label: "글 작성", href: "/write" },
  { id: "review", label: "검수·발행", href: "/review" },
] as const;
