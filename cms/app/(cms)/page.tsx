import Link from "next/link";
import { getSession } from "@/lib/auth";
import { CATEGORIES, STATUS_LABEL } from "@/lib/content";
import { readStore } from "@/lib/store";
import { StatusBadge } from "@/app/ui/status-badge";

export default async function DashboardPage() {
  const session = await getSession();
  const store = await readStore();
  const mine = session?.role === "writer";
  const authorId = session?.id;
  const posts = mine && authorId ? store.posts.filter((p) => p.authorId === authorId) : store.posts;
  const drafts = posts.filter((p) => p.status === "draft").length;
  const pending = posts.filter((p) => p.status === "pending").length;
  const published = posts.filter((p) => p.status === "publish").length;
  const recent = [...posts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const reviewer = session?.role !== "writer";

  function href(id: string, st: string) {
    if (mine || st === "draft") return `/write/${id}`;
    if (st === "pending") return `/review/${id}`;
    return `/published/${id}`;
  }

  const cards = [
    {
      label: "작성 중",
      value: drafts,
      href: "/posts?status=draft",
      hint: "임시 저장된 글",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      ),
    },
    {
      label: "검수 대기",
      value: pending,
      href: reviewer ? "/review" : "/posts?status=pending",
      hint: "발행 전 검토할 글",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      label: "발행됨",
      value: published,
      href: "/posts?status=publish",
      hint: "사이트에 올라간 글",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="page-title">대시보드</h1>
        <p className="page-desc">글 작성부터 검수·발행까지 한눈에 확인합니다.</p>
      </div>

      <section className="card mb-6 border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">추천 워크플로</p>
            <h2 className="mt-1 text-base font-semibold">키워드 분석 → Copilot → 글 작성 → 검수 → 발행</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              검색·경쟁도를 본 뒤 적합도 확인, 통과한 키워드만 초안으로 이어갑니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/analyze/keyword" className="btn-primary">
              키워드부터 시작
            </Link>
            <Link href="/analyze/copilot" className="btn-secondary">
              Copilot 바로가기
            </Link>
          </div>
        </div>
      </section>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="stat-card block">
            <div className="mb-4 flex items-start justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-primary">{card.icon}</span>
              <span className="text-xs font-medium text-primary">자세히</span>
            </div>
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">{card.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{card.hint}</p>
          </Link>
        ))}

        <Link
          href={reviewer ? "/review" : "/analyze/keyword"}
          className="stat-card-accent relative block overflow-hidden rounded-[var(--radius)] p-5"
        >
          <div className="pointer-events-none absolute -right-6 -bottom-8 size-28 rounded-full bg-white/10" aria-hidden="true" />
          <div className="pointer-events-none absolute top-0 right-8 size-16 rounded-full bg-white/10" aria-hidden="true" />
          <p className="text-sm text-white/80">{reviewer ? "지금 처리할 일" : "추천 시작점"}</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight">{reviewer ? pending : drafts}</p>
          <p className="mt-2 text-xs text-white/75">
            {reviewer ? "검수 대기 중인 글" : "키워드 → Copilot → 작성"}
          </p>
          <span className="mt-5 inline-flex h-9 items-center rounded-lg bg-white px-3.5 text-sm font-semibold text-primary">
            {reviewer ? "검수하러 가기" : "파이프라인 시작"}
          </span>
        </Link>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">최근 글</h2>
            <p className="text-xs text-muted-foreground">최근에 수정한 글을 바로 이어갈 수 있습니다.</p>
          </div>
          <Link href="/posts" className="text-sm font-semibold text-primary hover:text-accent">
            전체 보기
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            아직 글이 없습니다.{" "}
            <Link href="/analyze/keyword" className="font-semibold text-primary hover:text-accent">
              키워드 분석
            </Link>
            부터 시작해 보세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>제목</th>
                  <th>카테고리</th>
                  <th>상태</th>
                  <th>수정일</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={href(p.id, p.status)} className="font-semibold hover:text-primary">
                        {p.title || "(제목 없음)"}
                      </Link>
                    </td>
                    <td className="text-muted-foreground">{CATEGORIES[p.category] || p.category}</td>
                    <td>
                      <StatusBadge status={p.status} label={STATUS_LABEL[p.status]} />
                    </td>
                    <td className="text-muted-foreground">{p.updatedAt.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
