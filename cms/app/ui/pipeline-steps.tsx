import Link from "next/link";
import { PIPELINE_STEPS } from "@/lib/pipeline";

type StepId = (typeof PIPELINE_STEPS)[number]["id"];

export function PipelineSteps({
  current,
  keyword,
}: {
  current: StepId;
  keyword?: string;
}) {
  const q = keyword?.trim() || "";
  const idx = PIPELINE_STEPS.findIndex((s) => s.id === current);

  function hrefFor(id: StepId, base: string) {
    if (!q) return base;
    if (id === "keyword") return `/analyze/keyword?q=${encodeURIComponent(q)}`;
    if (id === "copilot") return `/analyze/copilot?q=${encodeURIComponent(q)}&from=keyword`;
    if (id === "write") return `/write?keywords=${encodeURIComponent(q)}&from=pipeline`;
    return base;
  }

  return (
    <ol className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-sm)]">
      {PIPELINE_STEPS.map((step, i) => {
        const active = step.id === current;
        const done = i < idx;
        const href = hrefFor(step.id, step.href);
        return (
          <li key={step.id} className="flex items-center gap-2">
            {i > 0 ? <span className="text-muted-foreground">→</span> : null}
            <Link
              href={href}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:bg-[#f8fafc] hover:text-foreground"
              }`}
            >
              <span className="opacity-70">{i + 1}</span>
              {step.label}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
