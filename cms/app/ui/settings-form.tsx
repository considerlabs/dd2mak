"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pingAction, saveSettingsAction } from "@/app/actions";
import { SubmitButton, secondaryBtn } from "@/app/ui/submit-button";
import type { Settings } from "@/lib/store";

function mask(key: string) {
  if (!key) return "";
  if (key.length <= 4) return key;
  return "*".repeat(key.length - 4) + key.slice(-4);
}

const PROVIDERS = [
  {
    id: "anthropic" as const,
    name: "Anthropic",
    desc: "Claude로 초안·요약 생성",
    initial: "A",
  },
  {
    id: "openai" as const,
    name: "OpenAI",
    desc: "GPT로 초안·요약 생성",
    initial: "O",
  },
  {
    id: "gemini" as const,
    name: "Gemini",
    desc: "Google Gemini로 생성",
    initial: "G",
  },
  {
    id: "cursor" as const,
    name: "Cursor",
    desc: "키만 보관 · 초안 생성 불가",
    initial: "C",
  },
];

type Tab = "ai" | "channels" | "analyze" | "copilot";

export function SettingsForm({
  provider,
  keys,
  channels,
  analyze,
  copilot,
}: {
  provider: string;
  keys: Record<string, string>;
  channels: Settings["channels"];
  analyze: Settings["analyze"];
  copilot: Settings["copilot"];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ai");
  const [selected, setSelected] = useState(provider || "anthropic");
  const [saved, saveAction] = useActionState(
    async (_p: { error?: string; message?: string } | null, data: FormData) => saveSettingsAction(data),
    null
  );
  const [ping, pingAct] = useActionState(
    async (_p: { error?: string; message?: string } | null, data: FormData) => pingAction(data),
    null
  );

  useEffect(() => {
    if (saved?.message) router.refresh();
  }, [saved, router]);

  const formSyncKey = [
    channels.wordpress.enabled,
    channels.wordpress.url,
    channels.wordpress.user,
    channels.wordpress.appPassword ? "wp-pw" : "",
    channels.tistory.enabled,
    channels.tistory.blogName,
    channels.tistory.accessToken ? "t-tok" : "",
    channels.naver.enabled,
    channels.naver.blogId,
    channels.naver.accessToken ? "n-tok" : "",
    copilot?.tenantId || "",
    copilot?.clientId || "",
    copilot?.clientSecret ? "c-secret" : "",
    copilot?.enabled ? "c-on" : "c-off",
    copilot?.siteName || "",
  ].join("|");

  const tabs: { id: Tab; label: string; hint: string }[] = [
    { id: "ai", label: "AI API", hint: "초안·요약에 사용할 모델" },
    { id: "channels", label: "발행 채널", hint: "워드프레스·티스토리·네이버" },
    { id: "analyze", label: "분석 API", hint: "키워드·블로그 문서량 조회" },
    { id: "copilot", label: "Copilot AI", hint: "사이트 맞춤 키워드 조언" },
  ];

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="flex border-b border-border">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`relative min-w-0 flex-1 px-5 py-3.5 text-left transition-colors ${
                  active ? "bg-card text-foreground" : "bg-[#f8fafc] text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`block text-sm font-semibold ${active ? "text-primary" : ""}`}>{item.label}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.hint}</span>
                {active ? <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-primary" /> : null}
              </button>
            );
          })}
        </div>

        <div className="p-6" key={formSyncKey}>
          {saved?.error ? <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-destructive">{saved.error}</p> : null}
          {saved?.message ? <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success">{saved.message}</p> : null}

          {tab === "ai" ? (
            <form action={saveAction}>
              <input type="hidden" name="section" value="ai" />
              <input type="hidden" name="provider" value={selected} />

              <div className="mb-5">
                <h2 className="text-sm font-semibold">사용할 AI</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  초안·요약 생성에 쓸 제공자를 고른 뒤, 아래에 API 키를 저장하세요.
                </p>
              </div>

              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                {PROVIDERS.map((item) => {
                  const active = selected === item.id;
                  const hasKey = Boolean(keys[item.id]);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelected(item.id)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        active
                          ? "border-primary bg-muted shadow-[0_0_0_3px_rgba(124,58,237,0.12)]"
                          : "border-border bg-card hover:border-primary/30 hover:bg-[#fafbff]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                            active ? "bg-primary text-primary-foreground" : "bg-[#f1f5f9] text-slate-600"
                          }`}
                        >
                          {item.initial}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">{item.name}</span>
                            {active ? <span className="badge badge-primary">사용 중</span> : null}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{item.desc}</span>
                          <span
                            className={`mt-2 block text-[11px] font-medium ${hasKey ? "text-success" : "text-muted-foreground"}`}
                          >
                            {hasKey ? "키 저장됨" : "키 미설정"}
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mb-2">
                <h3 className="text-sm font-semibold">API 키</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  제공자별로 키를 보관합니다. 사용 중인 제공자 키가 초안·요약에 쓰입니다.
                </p>
              </div>
              <div className="mb-5 grid gap-3">
                {PROVIDERS.map((item) => {
                  const active = selected === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border px-4 py-3 transition-colors ${
                        active ? "border-primary/40 bg-muted/40" : "border-border bg-card"
                      }`}
                    >
                      <label htmlFor={`key_${item.id}`} className="mb-2">
                        {item.name}
                        {active ? <span className="ml-2 text-xs font-normal text-primary">사용 중</span> : null}
                      </label>
                      <input
                        id={`key_${item.id}`}
                        name={`key_${item.id}`}
                        type="password"
                        defaultValue={mask(keys[item.id] || "")}
                        placeholder={`${item.name} API 키`}
                      />
                    </div>
                  );
                })}
              </div>

              <SubmitButton>AI 설정 저장</SubmitButton>
            </form>
          ) : tab === "channels" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold">발행 채널</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  채널마다 따로 저장합니다. 연결한 채널은 검수 화면에서 선택해 발행할 수 있습니다. 워드프레스 사이트
                  URL은 루트 주소만 입력하세요. (예: https://example.com)
                </p>
              </div>

              <form action={saveAction} className="rounded-xl border border-border p-4">
                <input type="hidden" name="section" value="channel_wordpress" />
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">워드프레스</p>
                    <p className="text-xs text-muted-foreground">공개 사이트 REST 발행</p>
                  </div>
                  <label className="mb-0 flex items-center gap-2 font-normal">
                    <input
                      type="checkbox"
                      name="ch_wordpress"
                      value="1"
                      defaultChecked={channels.wordpress.enabled}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">사용</span>
                  </label>
                </div>
                <label htmlFor="wpUrl">사이트 URL</label>
                <input
                  id="wpUrl"
                  name="wpUrl"
                  className="mb-3"
                  defaultValue={channels.wordpress.url}
                  placeholder="https://example.com"
                />
                <label htmlFor="wpUser">사용자명</label>
                <input id="wpUser" name="wpUser" className="mb-3" defaultValue={channels.wordpress.user} />
                <label htmlFor="wpAppPassword">애플리케이션 비밀번호</label>
                <input
                  id="wpAppPassword"
                  name="wpAppPassword"
                  type="password"
                  className="mb-4"
                  defaultValue={mask(channels.wordpress.appPassword)}
                />
                <SubmitButton>워드프레스 저장</SubmitButton>
              </form>

              <form action={saveAction} className="rounded-xl border border-border p-4">
                <input type="hidden" name="section" value="channel_tistory" />
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">티스토리</p>
                    <p className="text-xs text-muted-foreground">오픈 API access_token</p>
                  </div>
                  <label className="mb-0 flex items-center gap-2 font-normal">
                    <input
                      type="checkbox"
                      name="ch_tistory"
                      value="1"
                      defaultChecked={channels.tistory.enabled}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">사용</span>
                  </label>
                </div>
                <label htmlFor="tistoryBlogName">블로그 이름</label>
                <input
                  id="tistoryBlogName"
                  name="tistoryBlogName"
                  className="mb-3"
                  defaultValue={channels.tistory.blogName}
                  placeholder="myblog"
                />
                <label htmlFor="tistoryAccessToken">Access Token</label>
                <input
                  id="tistoryAccessToken"
                  name="tistoryAccessToken"
                  type="password"
                  className="mb-4"
                  defaultValue={mask(channels.tistory.accessToken)}
                />
                <SubmitButton>티스토리 저장</SubmitButton>
              </form>

              <form action={saveAction} className="rounded-xl border border-border p-4">
                <input type="hidden" name="section" value="channel_naver" />
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">네이버 블로그</p>
                    <p className="text-xs text-muted-foreground">글쓰기 권한 토큰</p>
                  </div>
                  <label className="mb-0 flex items-center gap-2 font-normal">
                    <input
                      type="checkbox"
                      name="ch_naver"
                      value="1"
                      defaultChecked={channels.naver.enabled}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">사용</span>
                  </label>
                </div>
                <label htmlFor="naverBlogId">블로그 ID (선택)</label>
                <input id="naverBlogId" name="naverBlogId" className="mb-3" defaultValue={channels.naver.blogId} />
                <label htmlFor="naverAccessToken">Access Token</label>
                <input
                  id="naverAccessToken"
                  name="naverAccessToken"
                  type="password"
                  className="mb-4"
                  defaultValue={mask(channels.naver.accessToken)}
                />
                <SubmitButton>네이버 블로그 저장</SubmitButton>
              </form>
            </div>
          ) : tab === "analyze" ? (
            <form action={saveAction}>
              <input type="hidden" name="section" value="analyze" />
              <div className="mb-5">
                <h2 className="text-sm font-semibold">네이버 Open API</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  키워드 분석의 블로그·카페·뉴스·웹 문서량을 조회합니다.{" "}
                  <a
                    className="font-medium text-primary hover:underline"
                    href="https://developers.naver.com/apps/#/register"
                    target="_blank"
                    rel="noreferrer"
                  >
                    네이버 개발자센터
                  </a>
                  에서 검색 API를 신청하세요.
                </p>
              </div>
              <label htmlFor="naverClientId">Client ID</label>
              <input
                id="naverClientId"
                name="naverClientId"
                className="mb-3"
                defaultValue={mask(analyze?.naverClientId || "")}
                placeholder="네이버 Client ID"
              />
              <label htmlFor="naverClientSecret">Client Secret</label>
              <input
                id="naverClientSecret"
                name="naverClientSecret"
                type="password"
                className="mb-5"
                defaultValue={mask(analyze?.naverClientSecret || "")}
                placeholder="네이버 Client Secret"
              />
              <SubmitButton>분석 API 저장</SubmitButton>
            </form>
          ) : tab === "copilot" ? (
            <div className="space-y-4">
              <form action={saveAction} className="rounded-xl border border-border p-4">
                <input type="hidden" name="section" value="copilot_api" />
                <input type="hidden" name="copilotEnabled" value={copilot?.enabled !== false ? "1" : ""} />

                <div className="mb-4">
                  <h2 className="text-sm font-semibold">Copilot AI API</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    발급받은 테넌트 ID · 애플리케이션 ID · 클라이언트 암호만 등록하면 됩니다. 엔드포인트 URL은 필요
                    없습니다.
                  </p>
                </div>

                <label htmlFor="copilotTenantId">테넌트 ID (Tenant ID)</label>
                <input
                  id="copilotTenantId"
                  name="copilotTenantId"
                  className="mb-3"
                  defaultValue={copilot?.tenantId || ""}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
                <label htmlFor="copilotClientId">애플리케이션 ID (Client ID)</label>
                <input
                  id="copilotClientId"
                  name="copilotClientId"
                  className="mb-3"
                  defaultValue={copilot?.clientId || ""}
                  placeholder="애플리케이션(클라이언트) ID"
                />
                <label htmlFor="copilotClientSecret">클라이언트 암호 (Client Secret)</label>
                <input
                  id="copilotClientSecret"
                  name="copilotClientSecret"
                  type="password"
                  className="mb-4"
                  defaultValue={mask(copilot?.clientSecret || "")}
                  placeholder="클라이언트 암호"
                />
                <SubmitButton>Copilot API 저장</SubmitButton>
              </form>

              <form
                action={pingAct}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-[#f8fafc] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">Copilot 연결 확인</p>
                  <p className="text-xs text-muted-foreground">저장한 Copilot AI API로 연결을 확인합니다.</p>
                  {ping?.error ? <p className="mt-1 text-sm text-destructive">{ping.error}</p> : null}
                  {ping?.message ? <p className="mt-1 text-sm text-success">{ping.message}</p> : null}
                </div>
                <input type="hidden" name="scope" value="copilot" />
                <SubmitButton className={secondaryBtn}>연결 확인</SubmitButton>
              </form>

              <form action={saveAction} className="rounded-xl border border-border p-4">
                <input type="hidden" name="section" value="copilot" />

                <div className="mb-4">
                  <h2 className="text-sm font-semibold">사이트 속성</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    사이트 카테고리·독자 속성을 기준으로 키워드 적합도를 조언합니다.
                  </p>
                </div>

                <label className="mb-4 flex items-center gap-2 font-normal">
                  <input
                    type="checkbox"
                    name="copilotEnabled"
                    value="1"
                    defaultChecked={copilot?.enabled !== false}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-semibold">Copilot AI 사용</span>
                </label>

                <label htmlFor="copilotSiteName">사이트명</label>
                <input
                  id="copilotSiteName"
                  name="copilotSiteName"
                  className="mb-3"
                  defaultValue={copilot?.siteName || ""}
                  placeholder="시니어 정보 서비스"
                />
                <label htmlFor="copilotSiteUrl">사이트 URL</label>
                <input
                  id="copilotSiteUrl"
                  name="copilotSiteUrl"
                  className="mb-3"
                  defaultValue={copilot?.siteUrl || ""}
                  placeholder="https://example.com"
                />
                <label htmlFor="copilotCategories">핵심 카테고리</label>
                <input
                  id="copilotCategories"
                  name="copilotCategories"
                  className="mb-3"
                  defaultValue={copilot?.categories || ""}
                  placeholder="건강관리, 복지혜택, 연금·재무 …"
                />
                <label htmlFor="copilotAudience">주요 독자</label>
                <input
                  id="copilotAudience"
                  name="copilotAudience"
                  className="mb-3"
                  defaultValue={copilot?.audience || ""}
                  placeholder="50~70대 시니어"
                />
                <label htmlFor="copilotNotes">운영 메모</label>
                <textarea
                  id="copilotNotes"
                  name="copilotNotes"
                  className="mb-5 min-h-24"
                  defaultValue={copilot?.notes || ""}
                  placeholder="쉬운 문장, 출처 확인 필수 등"
                />
                <SubmitButton>사이트 속성 저장</SubmitButton>
              </form>
            </div>
          ) : null}
        </div>
      </div>

      {tab === "ai" ? (
        <form action={pingAct} className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-semibold">연결 확인</p>
            <p className="text-xs text-muted-foreground">
              선택한 제공자({PROVIDERS.find((p) => p.id === selected)?.name}) 키가 유효한지 확인합니다.
            </p>
            {ping?.error ? <p className="mt-2 text-sm text-destructive">{ping.error}</p> : null}
            {ping?.message ? <p className="mt-2 text-sm text-success">{ping.message}</p> : null}
          </div>
          <input type="hidden" name="provider" value={selected} />
          <SubmitButton className={secondaryBtn}>AI 연결 확인</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
