import Link from "next/link";
import { analyzeBlog } from "@/lib/analyze-blog";

export default async function BlogAnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  const input = typeof url === "string" ? url.trim() : "";
  let report = null as Awaited<ReturnType<typeof analyzeBlog>> | null;
  let error = "";
  if (input) {
    try {
      report = await analyzeBlog(input);
    } catch (e) {
      error = e instanceof Error ? e.message : "블로그 분석에 실패했습니다.";
    }
  }

  const trendMax = report ? Math.max(...report.trend.map((t) => t.count), 1) : 1;

  return (
    <>
      <div className="mb-6">
        <h1 className="page-title">블로그 분석</h1>
        <p className="page-desc">
          네이버·티스토리 공개 RSS로 발행 추이·최근 글·활동 등급을 확인합니다.
        </p>
      </div>

      <form action="/analyze/blog" method="get" className="card mb-6 flex flex-wrap gap-2 p-4">
        <input
          name="url"
          defaultValue={input}
          placeholder="예: https://example.tistory.com 또는 blog.naver.com/아이디"
          className="min-w-[260px] flex-1"
          required
        />
        <button type="submit" className="btn-primary">
          분석하기
        </button>
      </form>

      {error ? <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      {!input ? (
        <div className="card space-y-2 p-8 text-center text-sm text-muted-foreground">
          <p>블로그 URL 또는 네이버 블로그 ID를 입력하세요.</p>
          <p className="text-xs">티스토리: 최근 1개월 발행 추이 · 인기/최근 포스팅 · 네이버: RSS 기반 최근 글·활동성</p>
        </div>
      ) : null}

      {report ? (
        <div className="space-y-4">
          <section className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">분석 블로그 개요</p>
                <h2 className="mt-1 text-lg font-bold">
                  <a href={report.url} target="_blank" rel="noreferrer" className="hover:text-primary">
                    {report.title}
                  </a>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{report.description || "소개 없음"}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  플랫폼: {report.platform} · {report.url}
                </p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-primary to-accent px-5 py-4 text-primary-foreground shadow-[var(--shadow-primary)]">
                <p className="text-xs text-white/80">활동 등급(추정)</p>
                <p className="text-2xl font-extrabold">{report.grade.label}</p>
                <p className="mt-1 text-xs text-white/85">{report.grade.rankHint}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{report.grade.note}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">수집 글 수</p>
                <p className="text-xl font-bold">{report.stats.totalPosts}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">최근 30일 발행</p>
                <p className="text-xl font-bold">{report.stats.last30Days}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">주당 평균(추정)</p>
                <p className="text-xl font-bold">{report.stats.avgPerWeek}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">마지막 발행 후</p>
                <p className="text-xl font-bold">
                  {report.stats.daysSinceLastPost != null ? `${report.stats.daysSinceLastPost}일` : "—"}
                </p>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h3 className="mb-1 text-sm font-semibold">최근 1개월 발행 추이</h3>
            <p className="mb-4 text-xs text-muted-foreground">RSS에 포함된 글의 발행일 기준입니다.</p>
            <div className="flex h-32 items-end gap-0.5">
              {report.trend.map((t) => (
                <div
                  key={t.date}
                  className="flex-1 rounded-t bg-primary/80"
                  style={{ height: `${t.count === 0 ? 4 : Math.max(10, Math.round((t.count / trendMax) * 100))}%` }}
                  title={`${t.date}: ${t.count}건`}
                />
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card overflow-hidden">
              <div className="border-b border-border px-5 py-3">
                <h3 className="text-sm font-semibold">최근 포스팅</h3>
              </div>
              <ul className="divide-y divide-border">
                {report.posts.length === 0 ? (
                  <li className="px-5 py-8 text-center text-sm text-muted-foreground">글이 없습니다.</li>
                ) : (
                  report.posts.map((p) => (
                    <li key={p.url} className="px-5 py-3">
                      <a href={p.url} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:text-primary">
                        {p.title}
                      </a>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.date || "날짜 없음"}
                        {p.excerpt ? ` · ${p.excerpt.slice(0, 80)}` : ""}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="card overflow-hidden">
              <div className="border-b border-border px-5 py-3">
                <h3 className="text-sm font-semibold">인기 포스팅(대용)</h3>
                <p className="text-xs text-muted-foreground">조회수 API가 없어 발췌 길이·최신 글 기준으로 나열합니다. 티스토리 최대 6개.</p>
              </div>
              <ul className="divide-y divide-border">
                {report.popular.map((p) => (
                  <li key={`pop-${p.url}`} className="px-5 py-3">
                    <a href={p.url} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:text-primary">
                      {p.title}
                    </a>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.date || "날짜 없음"}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="rounded-xl border border-dashed border-border bg-[#f8fafc] px-4 py-3 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">안내</p>
            <ul className="list-disc space-y-1 pl-4">
              {report.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <p className="mt-2">
              <Link href="/analyze/keyword" className="font-medium text-primary hover:underline">
                키워드 분석으로 이동
              </Link>
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
