"use client";

import { useActionState } from "react";
import { pingAction, saveSettingsAction } from "@/app/actions";
import { SubmitButton, secondaryBtn } from "@/app/ui/submit-button";
import type { Settings } from "@/lib/store";

function mask(key: string) {
  if (!key) return "";
  if (key.length <= 4) return key;
  return "*".repeat(key.length - 4) + key.slice(-4);
}

export function SettingsForm({
  provider,
  keys,
  channels,
}: {
  provider: string;
  keys: Record<string, string>;
  channels: Settings["channels"];
}) {
  const [saved, saveAction] = useActionState(
    async (_p: { error?: string; message?: string } | null, data: FormData) => saveSettingsAction(data),
    null
  );
  const [ping, pingAct] = useActionState(
    async (_p: { error?: string; message?: string } | null, data: FormData) => pingAction(data),
    null
  );

  return (
    <div className="space-y-4">
      <form action={saveAction} className="card p-5">
        {saved?.error ? <p className="mb-3 text-sm text-destructive">{saved.error}</p> : null}
        {saved?.message ? <p className="mb-3 text-sm text-success">{saved.message}</p> : null}
        <h2 className="mb-3 text-sm font-semibold">AI API</h2>
        {(["anthropic", "openai", "gemini", "cursor"] as const).map((id) => (
          <label key={id} className="mb-1 flex items-center gap-2 font-normal">
            <input type="radio" name="provider" value={id} defaultChecked={provider === id} className="h-4 w-4" />
            {id === "cursor" ? "Cursor (초안 생성 불가, 키만 저장)" : id}
          </label>
        ))}
        <div className="mt-3 grid gap-3">
          {(["anthropic", "openai", "gemini", "cursor"] as const).map((id) => (
            <div key={id}>
              <label htmlFor={`key_${id}`}>{id} API 키</label>
              <input id={`key_${id}`} name={`key_${id}`} type="password" defaultValue={mask(keys[id] || "")} />
            </div>
          ))}
        </div>

        <h2 className="mb-1 mt-8 text-sm font-semibold">발행 채널</h2>
        <p className="mb-4 text-xs text-muted-foreground">연결한 채널은 검수 화면에서 체크해 동시에 발행할 수 있습니다. 워드프레스는 기본 발행처입니다.</p>

        <section className="mb-4 rounded-lg border border-border p-3">
          <label className="mb-3 flex items-center gap-2 font-normal">
            <input type="checkbox" name="ch_wordpress" value="1" defaultChecked={channels.wordpress.enabled} className="h-4 w-4" />
            워드프레스
          </label>
          <label htmlFor="wpUrl">사이트 URL</label>
          <input id="wpUrl" name="wpUrl" className="mb-3" defaultValue={channels.wordpress.url} placeholder="http://localhost:3011" />
          <label htmlFor="wpUser">사용자명</label>
          <input id="wpUser" name="wpUser" className="mb-3" defaultValue={channels.wordpress.user} />
          <label htmlFor="wpAppPassword">애플리케이션 비밀번호</label>
          <input id="wpAppPassword" name="wpAppPassword" type="password" defaultValue={mask(channels.wordpress.appPassword)} />
        </section>

        <section className="mb-4 rounded-lg border border-border p-3">
          <label className="mb-3 flex items-center gap-2 font-normal">
            <input type="checkbox" name="ch_tistory" value="1" defaultChecked={channels.tistory.enabled} className="h-4 w-4" />
            티스토리
          </label>
          <label htmlFor="tistoryBlogName">블로그 이름</label>
          <input id="tistoryBlogName" name="tistoryBlogName" className="mb-3" defaultValue={channels.tistory.blogName} placeholder="myblog" />
          <label htmlFor="tistoryAccessToken">Access Token</label>
          <input id="tistoryAccessToken" name="tistoryAccessToken" type="password" defaultValue={mask(channels.tistory.accessToken)} />
          <p className="mt-2 text-xs text-muted-foreground">티스토리 오픈 API access_token을 붙여 넣습니다.</p>
        </section>

        <section className="mb-4 rounded-lg border border-border p-3">
          <label className="mb-3 flex items-center gap-2 font-normal">
            <input type="checkbox" name="ch_naver" value="1" defaultChecked={channels.naver.enabled} className="h-4 w-4" />
            네이버 블로그
          </label>
          <label htmlFor="naverBlogId">블로그 ID (선택)</label>
          <input id="naverBlogId" name="naverBlogId" className="mb-3" defaultValue={channels.naver.blogId} />
          <label htmlFor="naverAccessToken">Access Token</label>
          <input id="naverAccessToken" name="naverAccessToken" type="password" defaultValue={mask(channels.naver.accessToken)} />
          <p className="mt-2 text-xs text-muted-foreground">네이버 로그인 API 블로그 글쓰기 권한 토큰을 붙여 넣습니다.</p>
        </section>

        <SubmitButton>저장</SubmitButton>
      </form>
      <form action={pingAct} className="card p-5">
        {ping?.error ? <p className="mb-3 text-sm text-destructive">{ping.error}</p> : null}
        {ping?.message ? <p className="mb-3 text-sm text-success">{ping.message}</p> : null}
        <input type="hidden" name="provider" value={provider} />
        <SubmitButton className={secondaryBtn}>AI 연결 확인</SubmitButton>
      </form>
    </div>
  );
}
