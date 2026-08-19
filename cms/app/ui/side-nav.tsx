"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  reviewerOnly?: boolean;
  badge?: number;
  icon: React.ReactNode;
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center opacity-80" aria-hidden="true">
      {children}
    </span>
  );
}

export function SideNav({ reviewer, pendingCount }: { reviewer: boolean; pendingCount: number }) {
  const path = usePathname();
  const items: Item[] = [
    {
      href: "/",
      label: "대시보드",
      match: (p) => p === "/",
      icon: (
        <Icon>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
          </svg>
        </Icon>
      ),
    },
    {
      href: "/write",
      label: "글 작성",
      match: (p) => p.startsWith("/write"),
      icon: (
        <Icon>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </Icon>
      ),
    },
    {
      href: "/posts",
      label: "작성한 글",
      match: (p) => p.startsWith("/posts") || p.startsWith("/published"),
      icon: (
        <Icon>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </Icon>
      ),
    },
    {
      href: "/analyze/keyword",
      label: "키워드 분석",
      match: (p) => p.startsWith("/analyze/keyword"),
      icon: (
        <Icon>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </Icon>
      ),
    },
    {
      href: "/analyze/blog",
      label: "블로그 분석",
      match: (p) => p.startsWith("/analyze/blog"),
      icon: (
        <Icon>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
        </Icon>
      ),
    },
    {
      href: "/analyze/copilot",
      label: "Copilot AI",
      match: (p) => p.startsWith("/analyze/copilot"),
      icon: (
        <Icon>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
        </Icon>
      ),
    },
    {
      href: "/review",
      label: "검수 대기",
      match: (p) => p.startsWith("/review"),
      reviewerOnly: true,
      badge: pendingCount,
      icon: (
        <Icon>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </Icon>
      ),
    },
    {
      href: "/settings",
      label: "설정",
      match: (p) => p.startsWith("/settings"),
      reviewerOnly: true,
      icon: (
        <Icon>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Icon>
      ),
    },
  ];

  return (
    <nav className="flex flex-1 flex-col overflow-auto px-3 pb-4">
      <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">메뉴</p>
      <ul className="space-y-1">
        {items
          .filter((item) => reviewer || !item.reviewerOnly)
          .map((item) => {
            const active = item.match(path);
            return (
              <li key={item.href}>
                <Link href={item.href} className={`nav-item ${active ? "nav-item-active" : ""}`}>
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span className="rounded-md bg-[#fef3c7] px-1.5 py-0.5 text-[11px] font-bold text-[#b45309]">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}
