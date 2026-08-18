"use client";

import { continueToWriteAction } from "@/app/actions";
import { SubmitButton, secondaryBtn } from "@/app/ui/submit-button";
import type { CopilotAdvice } from "@/lib/copilot";
import { useActionState } from "react";
import Link from "next/link";

export function CopilotContinueForm({ advice }: { advice: CopilotAdvice }) {
  const [state, action] = useActionState(
    async (_p: { error?: string } | null, data: FormData) => continueToWriteAction(data),
    null
  );
  const blocked = advice.fit === "비추천";

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h3 className="text-sm font-semibold">다음 단계</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {blocked
            ? "비추천 키워드는 글 작성으로 바로 가지 않습니다. 아래 연관·하위 키워드로 다시 진단하세요."
            : "적합도 결과를 저장한 뒤 글 작성으로 이어집니다. 콘텐츠 각도를 고르면 제목 힌트로 전달됩니다."}
        </p>
      </div>

      {state?.error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-destructive">{state.error}</p> : null}

      {!blocked && advice.angles.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">콘텐츠 각도 선택 (선택)</p>
          <div className="flex flex-wrap gap-2">
            {advice.angles.map((angle) => (
              <form key={angle} action={action}>
                <input type="hidden" name="keyword" value={advice.keyword} />
                <input type="hidden" name="fit" value={advice.fit} />
                <input type="hidden" name="score" value={String(advice.score)} />
                <input type="hidden" name="summary" value={advice.summary} />
                <input type="hidden" name="reasons" value={JSON.stringify(advice.reasons)} />
                <input type="hidden" name="angles" value={JSON.stringify(advice.angles)} />
                <input type="hidden" name="caution" value={JSON.stringify(advice.caution)} />
                <input type="hidden" name="nextActions" value={JSON.stringify(advice.nextActions)} />
                <input type="hidden" name="honeyScore" value={String(advice.keywordSignals.honeyScore)} />
                <input type="hidden" name="limGrade" value={advice.keywordSignals.limGrade} />
                <input type="hidden" name="competition" value={advice.keywordSignals.competition} />
                <input type="hidden" name="categoryHint" value={advice.keywordSignals.category} />
                <input type="hidden" name="angle" value={angle} />
                <SubmitButton className={secondaryBtn + " !h-auto !whitespace-normal !px-3 !py-2 text-left text-xs"}>
                  {angle}
                </SubmitButton>
              </form>
            ))}
          </div>
        </div>
      ) : null}

      {!blocked ? (
        <form action={action} className="flex flex-wrap gap-2">
          <input type="hidden" name="keyword" value={advice.keyword} />
          <input type="hidden" name="fit" value={advice.fit} />
          <input type="hidden" name="score" value={String(advice.score)} />
          <input type="hidden" name="summary" value={advice.summary} />
          <input type="hidden" name="reasons" value={JSON.stringify(advice.reasons)} />
          <input type="hidden" name="angles" value={JSON.stringify(advice.angles)} />
          <input type="hidden" name="caution" value={JSON.stringify(advice.caution)} />
          <input type="hidden" name="nextActions" value={JSON.stringify(advice.nextActions)} />
          <input type="hidden" name="honeyScore" value={String(advice.keywordSignals.honeyScore)} />
          <input type="hidden" name="limGrade" value={advice.keywordSignals.limGrade} />
          <input type="hidden" name="competition" value={advice.keywordSignals.competition} />
          <input type="hidden" name="categoryHint" value={advice.keywordSignals.category} />
          <SubmitButton>
            {advice.fit === "적합" ? "글 작성으로 진행" : "참고 후 글 작성으로 진행"}
          </SubmitButton>
          <Link href={`/analyze/keyword?q=${encodeURIComponent(advice.keyword)}`} className="btn-secondary">
            키워드 분석으로
          </Link>
        </form>
      ) : (
        <Link href={`/analyze/keyword?q=${encodeURIComponent(advice.keyword)}`} className="btn-primary inline-flex">
          연관 키워드 다시 고르기
        </Link>
      )}
    </div>
  );
}
