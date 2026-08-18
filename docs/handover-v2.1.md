# 인수인계 문서 v2.1 — dd2mak

작성일: 2026-08-18
대상: 이 프로젝트를 이어받아 운영·개발할 담당자
이전 문서: `docs/handover-v2.0.md` (v2.0, 2026-08-17, CMS 화면 개편)

이 문서는 v2.0 이후 변경분만 다룬다. 역할 분리·폴더 구조·로컬 실행 등 기본 내용은 v2.0을 먼저 읽을 것.

---

## 1. 이번 세션 한 줄 요약

CMS에 **콘텐츠 기획 파이프라인**(키워드 분석 → Copilot 적합도 진단 → 글 작성 → 검수·발행)을 추가하고, **Vercel 프로덕션 배포**(`https://dd2mak.vercel.app`)를 새로 연결했다.

---

## 2. 지금 당장 알아야 할 것

1. **CMS 로컬 포트가 3010 → 3030으로 바뀌었다.** `cms/package.json`의 `dev`/`start` 스크립트가 `-p 3030`으로 고정됨. v2.0 문서의 `http://localhost:3010` 안내는 이제 틀렸다.
2. **JSON 파일 스토리지는 Vercel(서버리스)에서 영구 저장이 안 된다.** `cms/data/store.json`은 배포 번들에 없고(`.gitignore` 대상), 서버리스 함수는 배포 루트가 읽기 전용이라 기존 코드 그대로면 첫 쓰기 작업(로그인 유저 시드 포함)에서 크래시가 난다.
   - 이번 세션에 `cms/lib/store.ts`에 **`/tmp` 폴백**을 추가해 크래시는 막았다(`writeStore`가 실패하면 `os.tmpdir()`로 전환).
   - 단, `/tmp`는 서버리스 인스턴스가 재시작(콜드스타트)되면 초기화된다. **즉 Vercel 배포판은 글·설정이 언제든 초기화될 수 있는 "데모" 상태다.** 실제 운영으로 쓰려면 DB(Vercel Postgres/KV 등)로 옮기는 작업이 필수이며, v2.0 §9에 있던 "DB로 옮기는 것을 검토" 항목이 이제 **필수**로 격상됐다.
3. **Vercel 프로젝트가 새로 생성돼 있었고 루트 디렉터리가 잘못 설정돼 있었다.** 이번 세션에서 발견해 고쳤다(§5 참고). 대시보드에서 임의로 다시 바꾸지 말 것.
4. **Vercel 프로덕션에는 환경변수가 하나도 없다.** `WP_URL`/`WP_USER`/`WP_APP_PASSWORD`, AI 키, `NAVER_CLIENT_ID`/`SECRET`, `COPILOT_*` 전부 미설정. 지금 배포판은 로그인(시드 계정 `writer`/`writer`, `reviewer`/`reviewer`, `admin`/`admin`)까지만 확인했고, 실제 발행·AI 초안·키워드 API 연동은 값을 넣기 전까지 동작하지 않는다.

---

## 3. 콘텐츠 기획 파이프라인 (신규)

작성자가 "무슨 키워드로 쓸지"부터 CMS 안에서 끝내도록 4단계로 연결했다.

```
[키워드 분석] → [Copilot 적합도 진단] → [글 작성] → [검수·발행]
 /analyze/keyword   /analyze/copilot        /write        /review
```

블로그 자체 진단(`/analyze/blog`, 네이버·티스토리 RSS 기반)은 파이프라인과 별도로 사이드 도구로 존재한다.

### 3.1 키워드 분석 — `/analyze/keyword`

- `cms/lib/analyze-keyword.ts`
- 네이버 검색 Open API(`설정 > 네이버 Open API`에 Client ID/Secret 저장 시)로 블로그·카페·뉴스·웹문서 총량을 가져온다. 키가 없으면 문서량 칸은 비워두고 안내만 남긴다(에러 아님).
- 네이버 자동완성(비공개 API, 키 불필요)으로 연관 검색어를 가져온다.
- **든든지수·LIM 등급·요일/연령/성별 분포·월별 차트는 전부 추정치**다(실측 검색량 API 미연동). 화면·코드 주석에 "추정" 표기가 있으니 실제 네이버 검색광고 API를 붙이기 전까지는 참고용으로만 쓸 것.

### 3.2 Copilot 적합도 진단 — `/analyze/copilot`

- `cms/lib/copilot.ts`
- 사이트 속성(사이트명·URL·카테고리·독자층, `설정 > Copilot AI`에서 등록)과 키워드 신호를 비교해 적합/보통/비추천 + 점수 + 콘텐츠 각도 3개 + 주의점을 준다.
- 인증은 **OAuth2 client_credentials**(테넌트 ID·Client ID·Client Secret) 방식. MS Entra 스타일 엔드포인트를 기본으로 가정(`https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`)하되 `COPILOT_TOKEN_URL`로 덮어쓸 수 있다.
- **원격 API URL(`copilot.apiBaseUrl` 또는 `COPILOT_API_URL`)이 없으면 로컬 규칙 기반 진단(`buildLocalAdvice`)으로 대체**한다. 즉 Copilot 전용 백엔드가 아직 없어도 화면은 항상 동작한다. 실제 Copilot 백엔드를 붙일 사람은 이 URL/스코프(`COPILOT_API_SCOPE`, 기본 `api://{clientId}/.default`)만 채우면 된다.
- 비추천 키워드는 글 작성으로 못 넘어가고 연관 키워드 재진단으로 유도한다(`cms/app/ui/copilot-continue-form.tsx`).

### 3.3 글 작성 연계

- 진단 결과("적합도 근거·각도·주의·다음 행동")는 `continueToWriteAction`(`cms/app/actions.ts`)이 **`store.pipelineBrief`에 저장**한 뒤 `/write?keywords=...&from=pipeline&fit=...&score=...&angle=...`로 리다이렉트한다.
- 글을 저장/생성하는 시점(`generateAction`, `saveDraftInternal`)에 `pipelineBrief`가 있고 그 글에 아직 `research`가 없으면 **`Post.research`에 스냅샷으로 복사**해 저장한다. 즉 진단 결과는 파이프라인 세션 변수가 아니라 글 단위로 영구 귀속된다.
- `cms/lib/pipeline.ts`가 단계 정의(`PIPELINE_STEPS`)와 단계 간 링크 빌더를 갖고 있다. `cms/app/ui/pipeline-steps.tsx`가 각 분석 화면 상단의 단계 네비게이션 UI.

### 3.4 관련 신규/변경 파일

| 파일 | 내용 |
|---|---|
| `cms/lib/pipeline.ts` | 파이프라인 단계 정의, 링크 빌더 |
| `cms/lib/copilot.ts` | Copilot 적합도 진단 (원격/로컬 폴백) |
| `cms/lib/analyze-keyword.ts` | 키워드 리포트 (네이버 API + 추정 지표) |
| `cms/lib/analyze-blog.ts` | 블로그 RSS 진단 (네이버·티스토리·커스텀 도메인) |
| `cms/app/(cms)/analyze/keyword/page.tsx` | 키워드 분석 화면 |
| `cms/app/(cms)/analyze/copilot/page.tsx` | Copilot 진단 화면 |
| `cms/app/(cms)/analyze/blog/page.tsx` | 블로그 진단 화면 |
| `cms/app/ui/pipeline-steps.tsx` | 파이프라인 단계 네비게이션 |
| `cms/app/ui/copilot-continue-form.tsx` | 진단 결과 → 글 작성 이동 폼 |
| `cms/app/ui/status-badge.tsx` | 상태 배지 공통 컴포넌트로 분리 |
| `cms/lib/store.ts` | `ResearchBrief`/`pipelineBrief`, `settings.analyze`(네이버), `settings.copilot` 추가 |
| `cms/app/actions.ts` | `saveSettingsAction`을 `section` 단위 저장으로 재구성, `continueToWriteAction`, `pingAction`에 `scope=copilot` 추가 |

### 3.5 설정 화면 추가분

`cms/app/ui/settings-form.tsx`에 두 섹션이 늘었다(기존 AI/채널 섹션은 유지):

- **네이버 Open API** — `naverClientId`/`naverClientSecret`. 키워드 분석 문서량 조회용.
- **Copilot AI API** — 테넌트 ID·Client ID·Client Secret·(선택)API Base URL + **사이트 속성**(사이트명·URL·카테고리·독자층·메모). 저장은 섹션별로 독립 폼 제출(`section=analyze`, `section=copilot`)이라 한 섹션 저장 실패가 다른 섹션에 영향을 주지 않는다.

---

## 4. 기타 변경

- `generateExcerpt`(`cms/lib/ai.ts`, 이번 세션 확장)가 AI 초안 생성 시 자동으로 요약을 만든다. 제출(`submitAction`) 시에도 본문이 비어 있으면 막고, 요약을 재생성한다.
- WP URL 정규화(`normalizeStoredWpUrl`, `normalizeWpBaseUrl`)가 강화돼 `/wp-admin`, `/wp-login.php`가 섞여 저장돼도 base URL만 남긴다.
- `saveSettingsAction`이 저장 후 `revalidatePath`로 `/settings`, `/review`, 루트 레이아웃을 갱신한다.

---

## 5. Vercel 배포

### 5.1 이번 세션에 한 일

- Vercel 프로젝트 `dd2mak`(팀 `briank-projects`)가 GitHub `considerlabs/dd2mak` 저장소에 연결된 상태로 **이미 존재**했다(이번 세션 시작 직전 생성된 것으로 추정). 그런데 **Root Directory가 저장소 루트(`.`)로 잘못 설정**돼 있어 `next build`가 아예 실행되지 않고(91ms만에 "완료") `https://dd2mak.vercel.app`이 404였다.
- Vercel REST API로 프로젝트 설정을 고쳤다: **Root Directory = `cms`, Framework = Next.js.** 이제 GitHub `main`에 푸시하면 자동으로 `cms/`를 빌드해 배포한다.
- 로컬 `cms/`를 이 프로젝트에 `vercel link`로 연결했다(`cms/.vercel/project.json` 생성, Git에는 안 올라감).
- `cms/lib/store.ts`에 §2-2의 `/tmp` 폴백을 추가해 최소한 크래시 없이 뜨도록 했다.
- 위 변경분을 커밋하고 `vercel --prod`로 수동 배포 + `git push`로 GitHub 연동 배포 경로도 함께 살렸다.

### 5.2 다음 담당자가 반드시 할 일

- [ ] **환경변수 설정** (Vercel 대시보드 → dd2mak 프로젝트 → Settings → Environment Variables, 또는 `vercel env add`):
  - `WP_URL`, `WP_USER`, `WP_APP_PASSWORD` — 운영 워드프레스 Application Password
  - `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` — 네이버 검색 Open API (키워드 분석용)
  - `COPILOT_TENANT_ID`, `COPILOT_CLIENT_ID`, `COPILOT_CLIENT_SECRET`, 필요 시 `COPILOT_API_URL`/`COPILOT_TOKEN_URL`/`COPILOT_API_SCOPE`
  - AI 초안용 provider 키는 지금 구조상 `설정` 화면에서 저장하는 방식이라 환경변수로는 시드값만 채워짐 — **`/tmp` 폴백 특성상 화면에서 저장해도 콜드스타트 후 사라질 수 있다.** 영구 저장하려면 DB 마이그레이션이 선행돼야 함.
- [ ] **스토리지를 DB로 이전.** 후보: Vercel Postgres, Vercel KV, 또는 기존 로컬 운영과 동일하게 별도 VM/컨테이너에 Node 서버로 배포(파일시스템 영구화). Vercel 서버리스를 계속 쓸 거면 DB 없이는 실운영 불가.
- [ ] 로그인 기본 비밀번호(`writer`/`admin`) 교체 — v2.0에서도 지적된 항목, Vercel 배포판은 공개 URL이라 더 시급함.
- [ ] Vercel 배포 보호(Deployment Protection)나 인증 여부 확인 — 지금은 CMS 로그인 화면 자체가 게이트지만, 시드 계정 비밀번호가 기본값이라 사실상 공개된 것과 같다.

### 5.3 로컬 개발 명령 (포트 변경 반영)

```bash
cd cms
npm install
npm run dev     # http://localhost:3030 (package.json에 -p 3030 고정)
```

수동 배포가 필요하면:

```bash
cd cms
vercel --prod   # 이미 연결됨 (.vercel/project.json), 로그인은 vercel login 필요
```

---

## 6. 관련 문서

- `docs/handover-v2.0.md` — CMS 대시보드 UI 개편 이력 (색·레이아웃)
- `docs/handover.md` — v1.0 워드프레스 테마 세션
- 나머지는 v2.0 §10과 동일
