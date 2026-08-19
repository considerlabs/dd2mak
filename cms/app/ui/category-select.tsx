"use client";

import { useMemo, useState } from "react";
import type { CategoryTree } from "@/lib/content";

function parentsWithChildren(tree: CategoryTree) {
  return tree.parents.filter((p) => (tree.children[p.slug] || []).length > 0);
}

function resolve(tree: CategoryTree, slug?: string) {
  if (!slug) return { parent: "", child: "" };
  const parents = parentsWithChildren(tree);
  if (parents.some((p) => p.slug === slug)) {
    // 상위만 저장된 예전 글: 하위가 있는 상위로만 복원 (하위는 비움 → 재선택 유도)
    return { parent: slug, child: "" };
  }
  for (const [parent, kids] of Object.entries(tree.children)) {
    if (!parents.some((p) => p.slug === parent)) continue;
    if (kids.some((k) => k.slug === slug)) return { parent, child: slug };
  }
  return { parent: "", child: "" };
}

export function CategorySelect({
  tree,
  value,
  readOnly,
}: {
  tree: CategoryTree;
  value?: string;
  readOnly?: boolean;
}) {
  const parents = useMemo(() => parentsWithChildren(tree), [tree]);
  const initial = useMemo(() => resolve(tree, value), [tree, value]);
  const [parent, setParent] = useState(initial.parent);
  const [child, setChild] = useState(initial.child);
  const kids = parent ? tree.children[parent] || [] : [];
  const final = child;

  return (
    <div>
      <label htmlFor="post_category_parent">카테고리</label>
      <div className="flex flex-wrap gap-2">
        <select
          id="post_category_parent"
          required
          disabled={readOnly}
          value={parent}
          onChange={(e) => {
            setParent(e.target.value);
            setChild("");
          }}
          className="max-w-xs"
        >
          <option value="">주메뉴 선택</option>
          {parents.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          id="post_category_child"
          required
          disabled={readOnly || !parent || kids.length === 0}
          value={child}
          onChange={(e) => setChild(e.target.value)}
          className="max-w-xs"
        >
          <option value="">{parent ? "하위메뉴 선택" : "먼저 주메뉴를 선택하세요"}</option>
          {kids.map((k) => (
            <option key={k.slug} value={k.slug}>
              {k.name}
            </option>
          ))}
        </select>
      </div>
      <input type="hidden" name="category" value={final} />
      <p className="mt-2 text-xs text-muted-foreground">
        하위메뉴가 있는 주메뉴만 표시됩니다. 주메뉴를 고른 뒤 하위메뉴를 선택하세요.
      </p>
    </div>
  );
}
