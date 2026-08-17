"use client";

import { useMemo, useState } from "react";
import type { CategoryTree } from "@/lib/content";

function resolve(tree: CategoryTree, slug?: string) {
  if (!slug) return { parent: "", child: "" };
  if (tree.parents.some((p) => p.slug === slug)) return { parent: slug, child: "" };
  for (const [parent, kids] of Object.entries(tree.children)) {
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
  const initial = useMemo(() => resolve(tree, value), [tree, value]);
  const [parent, setParent] = useState(initial.parent);
  const [child, setChild] = useState(initial.child);
  const kids = tree.children[parent] || [];
  const final = child || parent;

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
          {tree.parents.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          id="post_category_child"
          disabled={readOnly || !parent || kids.length === 0}
          value={child}
          onChange={(e) => setChild(e.target.value)}
          className="max-w-xs"
        >
          {!parent ? <option value="">먼저 주메뉴를 선택하세요</option> : null}
          {parent && kids.length === 0 ? <option value="">(하위메뉴 없음)</option> : null}
          {parent && kids.length > 0 ? (
            <>
              <option value="">선택 안 함 (주메뉴로 등록)</option>
              {kids.map((k) => (
                <option key={k.slug} value={k.slug}>
                  {k.name}
                </option>
              ))}
            </>
          ) : null}
        </select>
      </div>
      <input type="hidden" name="category" value={final} />
      <p className="mt-2 text-xs text-zinc-500">
        주메뉴를 고르면 오른쪽에 해당 하위메뉴가 나타납니다. 하위메뉴가 없거나 주메뉴로 바로 등록하려면 &quot;선택 안 함&quot;으로 두세요.
      </p>
    </div>
  );
}
