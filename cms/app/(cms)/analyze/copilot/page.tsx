import Link from "next/link";
import { CopilotContinueForm } from "@/app/ui/copilot-continue-form";
import { PipelineSteps } from "@/app/ui/pipeline-steps";
import { runCopilot } from "@/lib/copilot";
import { readStore } from "@/lib/store";

export default async function CopilotPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const keyword = typeof q === "string" ? q.trim() : "";
  const copilot = (await readStore()).settings.copilot;
  const hasCopilotKey = Boolean(
    (copilot?.tenantId || "").trim() && (copilot?.clientId || "").trim() && (copilot?.clientSecret || "").trim()
  );
  let advice = null as Awaited<ReturnType<typeof runCopilot>> | null;
  let error = "";

  if (keyword) {
    try {
      advice = await runCopilot(keyword);
    } catch (e) {
      error = e instanceof Error ? e.message : "Copilot 분석에 실패했습니다.";
    }
  }

  const fitColor =
    advice?.fit === "적합"
      ? "from-emerald-600 to-teal-500"
      : advice?.fit === "비추천"
        ? "from-rose-600 to-orange-500"
        : "from-primary to-accent";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Copilot AI</h1>
          <p className="page-desc">등록한 사이트 속성으로 키워드 적합도를 조언합니다.</p>
        </div>
        <Link href="/settings" className="btn-secondary text-xs">
          Copilot 설정
        </Link>
      </div>

      <PipelineSteps current="copilot" keyword={keyword || undefined} />

      <div className="card mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className={`badge ${copilot?.enabled !== false ? "badge-publish" : "badge-draft"}`}>
            {copilot?.enabled !== false ? "활성화" : "비활성"}
          </span>
          <span className={`badge ${hasCopilotKey ? "badge-publish" : "badge-pending"}`}>
            {hasCopilotKey ? "API 연결됨" : "API 미설정"}
          </span>
          <span className="text-muted-foreground">
            {copilot?.siteName || "사이트명 미설정"}
            {copilot?.categories ? ` · ${copilot.categories}` : ""}
          </span>
        </div>
        <form action="/analyze/copilot" method="get" className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={keyword}
            placeholder="예: 기초연금 수급 자격"
            className="min-w-[220px] flex-1"
            required
          />
          <button type="submit" className="btn-primary">
            Copilot 진단
          </button>
          {keyword ? (
            <Link href={`/analyze/keyword?q=${encodeURIComponent(keyword)}`} className="btn-secondary">
              키워드 분석
            </Link>
          ) : null}
        </form>
      </div>

      {error ? <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      {!keyword && !error ? (
        <div className="card p-8 text-center text-sm text-muted-foreground">
          <p>키워드를 입력하면 사이트 카테고리·독자 기준으로 적합도·콘텐츠 각도·주의점을 제안합니다.</p>
          <p className="mt-2 text-xs">
            설정 &gt; Copilot AI에서 테넌트 ID · Client ID · Client Secret과 사이트 속성을 저장하세요.
          </p>
        </div>
      ) : null}

      {advice ? (
        <div className="space-y-4">
          <section
            className={`overflow-hidden rounded-[var(--radius)] bg-gradient-to-br ${fitColor} p-6 text-white shadow-[var(--shadow-primary)]`}
          >
            <p className="text-sm text-white/80">키워드 적합도</p>
            <div className="mt-1 flex flex-wrap items-end gap-4">
              <h2 className="text-3xl font-extrabold tracking-tight">{advice.fit}</h2>
              <p className="text-4xl font-extrabold">{advice.score}</p>
              <p className="pb-1 text-sm text-white/85">/ 100 · {advice.keyword}</p>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/90">{advice.summary}</p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card p-4">
              <p className="text-xs text-muted-foreground">사이트</p>
              <p className="mt-1 text-sm font-semibold">{advice.site.name}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-muted-foreground">키워드 카테고리</p>
              <p className="mt-1 text-sm font-semibold">{advice.keywordSignals.category}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-muted-foreground">든든지수(추정)</p>
              <p className="mt-1 text-sm font-semibold">{advice.keywordSignals.honeyScore}/30</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-muted-foreground">LIM / 경쟁</p>
              <p className="mt-1 text-sm font-semibold">
                {advice.keywordSignals.limGrade} · {advice.keywordSignals.competition}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5">
              <h3 className="mb-3 text-sm font-semibold">판단 근거</h3>
              <ul className="space-y-2">
                {advice.reasons.map((r) => (
                  <li key={r} className="rounded-lg bg-[#f8fafc] px-3 py-2 text-sm">
                    {r}
                  </li>
                ))}
              </ul>
            </section>
            <section className="card p-5">
              <h3 className="mb-3 text-sm font-semibold">추천 콘텐츠 각도</h3>
              <ul className="space-y-2">
                {advice.angles.map((r) => (
                  <li key={r} className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-primary">
                    {r}
                  </li>
                ))}
              </ul>
            </section>
            <section className="card p-5">
              <h3 className="mb-3 text-sm font-semibold">주의</h3>
              <ul className="space-y-2">
                {(advice.caution.length ? advice.caution : ["특이 주의사항 없음"]).map((r) => (
                  <li key={r} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {r}
                  </li>
                ))}
              </ul>
            </section>
            <section className="card p-5">
              <h3 className="mb-3 text-sm font-semibold">다음 행동</h3>
              <ul className="space-y-2">
                {advice.nextActions.map((r) => (
                  <li key={r} className="rounded-lg border border-border px-3 py-2 text-sm">
                    {r}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <CopilotContinueForm advice={advice} />
        </div>
      ) : null}
    </>
  );
}
