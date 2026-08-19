import type { ResearchBrief } from "@/lib/store";

export type { ResearchBrief };
export type PipelineFit = ResearchBrief["fit"];

export function buildWriteHref(keyword: string, opts?: { fit?: string; score?: number; angle?: string }) {
  // 호환용: 새 글 작성은 /write 고정. 파이프라인 이어가기는 continueToWriteAction이 초안을 만든다.
  void keyword;
  void opts;
  return "/write";
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
