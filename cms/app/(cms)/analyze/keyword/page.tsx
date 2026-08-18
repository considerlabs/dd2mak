import Link from "next/link";
import { PipelineSteps } from "@/app/ui/pipeline-steps";
import { analyzeKeyword } from "@/lib/analyze-keyword";
import { buildCopilotHref } from "@/lib/pipeline";

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toLocaleString("ko-KR")}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#eef1f4]">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-extrabold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default async function KeywordAnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const keyword = typeof q === "string" ? q.trim() : "";
  let report = null as Awaited<ReturnType<typeof analyzeKeyword>> | null;
  let error = "";
  if (keyword) {
    try {
      report = await analyzeKeyword(keyword);
    } catch (e) {
      error = e instanceof Error ? e.message : "분석에 실패했습니다.";
    }
  }

  const chartMax = report ? Math.max(...report.chart.map((c) => c.value), 1) : 1;
  const weekdayMax = report ? Math.max(...report.weekday.map((c) => c.value), 1) : 1;
  const ageMax = report ? Math.max(...report.age.map((c) => c.value), 1) : 1;

  return (
    <>
      <div className="mb-6">
        <h1 className="page-title">키워드 분석</h1>
        <p className="page-desc">키워드 문서량·연관어·적합도 지표를 확인한 뒤 적합도 진단으로 이어갑니다.</p>
      </div>

      <PipelineSteps current="keyword" keyword={keyword || undefined} />

      <form action="/analyze/keyword" method="get" className="card mb-6 flex flex-wrap gap-2 p-4">
        <input
          name="q"
          defaultValue={keyword}
          placeholder="예: 기초연금 신청 방법"
          className="min-w-[220px] flex-1"
          required
        />
        <button type="submit" className="btn-primary">
          분석하기
        </button>
        {keyword ? (
          <Link href={buildCopilotHref(keyword)} className="btn-primary">
            다음: 적합도 진단
          </Link>
        ) : null}
      </form>

      {error ? <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      {!keyword ? (
        <div className="card p-8 text-center text-sm text-muted-foreground">
          분석할 키워드를 입력하세요. 연관 검색어·문서량·든든지수(추정)·LIM 요약을 한눈에 볼 수 있습니다.
        </div>
      ) : null}

      {report ? (
        <div className="space-y-4">
          <section className="card p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">검색어 인포메이션</p>
                <h2 className="text-lg font-bold">{report.keyword}</h2>
                <p className="text-xs text-muted-foreground">{report.analyzedAt.slice(0, 19).replace("T", " ")}</p>
              </div>
              <span className="badge badge-primary">{report.hasNaverApi ? "Naver API 연결됨" : "API 미연결"}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="블로그 문서량"
                value={report.information.blogTotal != null ? report.information.blogTotal.toLocaleString("ko-KR") : "—"}
                hint="누적 발행량(검색 API)"
              />
              <Metric
                label="카페 문서량"
                value={report.information.cafeTotal != null ? report.information.cafeTotal.toLocaleString("ko-KR") : "—"}
              />
              <Metric
                label="뉴스 문서량"
                value={report.information.newsTotal != null ? report.information.newsTotal.toLocaleString("ko-KR") : "—"}
              />
              <Metric
                label="웹문서량"
                value={report.information.webTotal != null ? report.information.webTotal.toLocaleString("ko-KR") : "—"}
              />
              <Metric label="월간 검색량(PC)" value="—" hint="검색광고 API 미연동" />
              <Metric label="월간 검색량(Mobile)" value="—" hint="검색광고 API 미연동" />
              <Metric label="CPC / 광고경쟁" value="—" hint="입찰 데이터 없음" />
              <Metric label="카테고리" value={report.category.label} hint={report.category.note} />
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-3">
            <section className="card p-5 xl:col-span-2">
              <h3 className="mb-1 text-sm font-semibold">검색어 차트(참고용 패턴)</h3>
              <p className="mb-4 text-xs text-muted-foreground">실측 트렌드가 아닌 UI용 상대 패턴입니다.</p>
              <div className="flex h-40 items-end gap-1.5">
                {report.chart.map((c) => (
                  <div key={c.label} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-primary to-accent"
                      style={{ height: `${Math.max(8, Math.round((c.value / chartMax) * 100))}%` }}
                      title={`${c.label}: ${c.value}`}
                    />
                    <span className="text-[10px] text-muted-foreground">{c.label.replace("월", "")}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-5">
              <h3 className="mb-3 text-sm font-semibold">이슈성 · 든든지수 · LIM</h3>
              <div className="mb-3 rounded-xl bg-muted/70 p-3">
                <p className="text-xs text-muted-foreground">이슈성</p>
                <p className="text-lg font-bold text-primary">{report.issue.level}</p>
                <p className="mt-1 text-xs text-muted-foreground">{report.issue.note}</p>
              </div>
              <div className="mb-3 rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">든든지수 (0~30 추정)</p>
                <p className="text-3xl font-extrabold text-foreground">{report.honeyScore}</p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">LIM 종합</p>
                <p className="text-xl font-bold">
                  {report.lim.grade} · {report.lim.competition}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{report.lim.summary}</p>
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="card p-5">
              <h3 className="mb-3 text-sm font-semibold">요일 분포(추정)</h3>
              {report.weekday.map((w) => (
                <BarRow key={w.label} label={w.label} value={w.value} max={weekdayMax} />
              ))}
            </section>
            <section className="card p-5">
              <h3 className="mb-3 text-sm font-semibold">연령 분포(추정)</h3>
              {report.age.map((a) => (
                <BarRow key={a.label} label={a.label} value={a.value} max={ageMax} />
              ))}
            </section>
            <section className="card p-5">
              <h3 className="mb-3 text-sm font-semibold">성별 분포(추정)</h3>
              <BarRow label="남성" value={report.gender.male} max={100} />
              <BarRow label="여성" value={report.gender.female} max={100} />
              <h3 className="mt-5 mb-2 text-sm font-semibold">섹션 배치 힌트</h3>
              <ul className="space-y-2">
                {report.sections.map((s) => (
                  <li key={s.name} className="rounded-lg bg-[#f8fafc] px-3 py-2 text-xs">
                    <span className="font-semibold text-foreground">{s.name}</span>
                    <span className="mt-0.5 block text-muted-foreground">{s.note}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5">
              <h3 className="mb-3 text-sm font-semibold">연관 검색어 (자동완성)</h3>
              {report.relatedSuggest.length === 0 ? (
                <p className="text-sm text-muted-foreground">연관어를 가져오지 못했습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {report.relatedSuggest.map((k) => (
                    <Link
                      key={k}
                      href={`/analyze/keyword?q=${encodeURIComponent(k)}`}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
                    >
                      {k}
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <section className="card p-5">
              <h3 className="mb-3 text-sm font-semibold">SERP형 연관어</h3>
              <div className="flex flex-wrap gap-2">
                {report.relatedSerp.map((k) => (
                  <Link
                    key={k}
                    href={`/analyze/keyword?q=${encodeURIComponent(k)}`}
                    className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    {k}
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h3 className="text-sm font-semibold">파이프라인 다음 단계</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                사이트 맞춤 적합도를 확인한 뒤 글 작성으로 진행합니다.
              </p>
            </div>
            <Link href={buildCopilotHref(report.keyword)} className="btn-primary">
              Copilot 적합도 진단 →
            </Link>
          </section>

          <section className="rounded-xl border border-dashed border-border bg-[#f8fafc] px-4 py-3 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">안내</p>
            <ul className="list-disc space-y-1 pl-4">
              {report.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </>
  );
}
