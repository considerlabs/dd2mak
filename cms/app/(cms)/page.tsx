import Link from "next/link";
import { getSession } from "@/lib/auth";
import { CATEGORIES, STATUS_LABEL } from "@/lib/content";
import { readStore } from "@/lib/store";

export default async function DashboardPage() {
  const session = await getSession();
  const store = readStore();
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
    { label: "작성 중", value: drafts, href: "/posts?status=draft", hint: "임시 저장된 글" },
    { label: "검수 대기", value: pending, href: reviewer ? "/review" : "/posts?status=pending", hint: "발행 전 검토할 글" },
    { label: "발행됨", value: published, href: "/posts?status=publish", hint: "사이트에 올라간 글" },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">대시보드</h1>
          <p className="page-desc">글 작성부터 검수·발행까지 한눈에 확인합니다.</p>
        </div>
        <Link
          href="/write"
          className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-[0_14px_28px_-16px_rgba(91,33,182,0.75)] hover:bg-primary/92"
        >
          글 작성
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="card block p-4 transition-colors hover:border-primary/40">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-primary">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </Link>
        ))}
      </div>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">최근 글</h2>
            <p className="text-xs text-muted-foreground">최근에 수정한 글을 바로 이어갈 수 있습니다.</p>
          </div>
          <Link href="/posts" className="text-sm font-medium text-primary hover:text-accent">
            전체 보기
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-lg bg-muted/60 px-3 py-6 text-center text-sm text-muted-foreground">
            아직 글이 없습니다. 새 글을 작성해 보세요.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={href(p.id, p.status)} className="block truncate text-sm font-medium hover:text-primary">
                    {p.title || "(제목 없음)"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORIES[p.category] || p.category} · {p.updatedAt.slice(0, 10)}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-primary">{STATUS_LABEL[p.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
