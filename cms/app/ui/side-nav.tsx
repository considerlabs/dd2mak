"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  reviewerOnly?: boolean;
  badge?: number;
};

export function SideNav({ reviewer, pendingCount }: { reviewer: boolean; pendingCount: number }) {
  const path = usePathname();
  const items: Item[] = [
    { href: "/write", label: "글 작성", match: (p) => p.startsWith("/write") },
    { href: "/posts", label: "작성한 글", match: (p) => p.startsWith("/posts") || p.startsWith("/published") },
    {
      href: "/review",
      label: "검수 대기",
      match: (p) => p.startsWith("/review"),
      reviewerOnly: true,
      badge: pendingCount,
    },
    { href: "/settings", label: "설정", match: (p) => p.startsWith("/settings"), reviewerOnly: true },
  ];

  return (
    <nav className="flex flex-1 flex-col px-2 py-3">
      <ul className="space-y-0.5">
        {items
          .filter((item) => reviewer || !item.reviewerOnly)
          .map((item) => {
            const active = item.match(path);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex h-8 items-center justify-between rounded-md px-2.5 text-sm ${
                    active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className={`rounded px-1.5 text-xs ${active ? "bg-white text-zinc-900" : "bg-zinc-200 text-zinc-700"}`}>
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
