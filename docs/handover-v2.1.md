# 인수인계 문서 v2.1 — dd2mak

> **최신 인수인계는 `docs/handover-v2.2.md` (2026-08-19).** 이 문서는 Redis·계정·Copilot·배포 보호까지 반영한 v2.1 기록이다.

작성일: 2026-08-18 (최종 업데이트: 2026-08-19 — §2, §5.2 체크리스트 전부 반영)
대상: 이 프로젝트를 이어받아 운영·개발할 담당자
이전 문서: `docs/handover-v2.0.md` (v2.0, 2026-08-17, CMS 화면 개편)

이 문서는 v2.0 이후 변경분만 다룬다. 역할 분리·폴더 구조·로컬 실행 등 기본 내용은 v2.0을 먼저 읽을 것.
**2026-08-19 세션에서 §5.2에 남아 있던 미해결 항목(스토리지 DB화·기본 비밀번호·Copilot 연결·Deployment
Protection)을 전부 해결했다.** 아래 §2·§5는 그 결과를 반영해 새로 썼고, §7에 이번 세션 변경 내역을 정리했다.

---

## 1. 이번 세션 한 줄 요약

CMS에 **콘텐츠 기획 파이프라인**(키워드 분석 → Copilot 적합도 진단 → 글 작성 → 검수·발행)을 추가하고, **Vercel 프로덕션 배포**(`https://dd2mak.vercel.app`)를 새로 연결했다.

---

## 2. 지금 당장 알아야 할 것

1. **CMS 로컬 포트가 3010 → 3030으로 바뀌었다.** `cms/package.json`의 `dev`/`start` 스크립트가 `-p 3030`으로 고정됨. v2.0 문서의 `http://localhost:3010` 안내는 이제 틀렸다.
2. **스토리지는 더 이상 파일이 아니라 Upstash Redis다 (2026-08-19 해결).** `cms/lib/store.ts`가 파일(`data/store.json` + `/tmp` 폴백) 대신 Redis 단일 키(`dd2mak:store`)를 쓴다. `readStore`/`writeStore`는 이제 async이고, 콜드스타트로 데이터가 사라지던 문제는 완전히 해결됐다. 자세한 내용은 §7.1 참고.
   - **중요: 로컬 개발과 프로덕션이 같은 Redis 인스턴스·같은 키를 공유한다.** `vercel integration add`를 환경 제한 없이(전체 환경) 실행해서 그렇게 됐다. 로컬 `npm run dev`에서 글을 쓰거나 설정을 바꾸면 실제 서비스(`dd2mak.vercel.app`)에 그대로 반영된다. 분리하려면 preview/development 전용 Upstash DB를 하나 더 만들어 연결해야 한다.
3. **Vercel 프로젝트가 새로 생성돼 있었고 루트 디렉터리가 잘못 설정돼 있었다.** 지난 세션(2026-08-18)에서 발견해 고쳤다(§5 참고). 대시보드에서 임의로 다시 바꾸지 말 것.
4. **Vercel 프로덕션 환경변수는 이제 다 채워져 있다.** `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`, `WP_URL`/`WP_USER`/`WP_APP_PASSWORD`, `KV_REST_API_URL`/`KV_REST_API_TOKEN`(Redis) 전부 설정 완료. `COPILOT_*`는 여전히 Vercel 환경변수로는 없지만, **Copilot 테넌트 ID·Client ID·Client Secret은 CMS 설정 화면(`/settings` > Copilot AI)에 직접 저장하는 방식**이라 이게 정상이다 — 자세한 내용과 연결 확인 방법은 §7.3 참고.
5. **네이버 검색 API는 구 오픈API가 아니라 NCP API 허브 방식이다.** §3 하단 주의 참고 — 엔드포인트·헤더가 다르다.
6. **기본 비밀번호(`writer`/`reviewer`/`admin`)는 각 계정이 로그인해서 직접 바꿔야 한다.** 좌측 하단 사용자 표시를 누르면 `/account`에서 비밀번호를 바꿀 수 있다(§7.2). 코드 수정만으로는 이미 시드된 계정의 비밀번호가 바뀌지 않으니, **세 계정 모두 실제로 로그인해서 바꿨는지 반드시 확인할 것.**
7. **Vercel Deployment Protection은 꺼져 있다 (2026-08-19 확인).** CMS 자체 로그인 화면이 유일한 게이트다. `curl -D - https://dd2mak.vercel.app/`로 확인 시 Vercel SSO 인터스티셜 없이 곧장 `/login`으로 307 리다이렉트되는 걸로 확인했다.

---

## 3. 콘텐츠 기획 파이프라인 (신규)

작성자가 "무슨 키워드로 쓸지"부터 CMS 안에서 끝내도록 4단계로 연결했다.

```
[키워드 분석] → [Copilot 적합도 진단] → [글 작성] → [검수·발행]
 /analyze/keyword   /analyze/copilot        /write        /review
```

블로그 자체 진단(`/analyze/blog`, 네이버·티스토리 RSS 기반)은 파이프라인과 별도로 사이드 도구로 존재한다.

> **주의: 네이버 검색 API는 구 오픈API가 아니라 NCP API 허브다.** 이 프로젝트의 Client ID/Secret은 `developers.naver.com`이 아니라 **`console.ncloud.com/naver-api-hub`**에서 발급됐다. 그래서 엔드포인트가 `openapi.naver.com` + `X-Naver-Client-Id/Secret`가 아니라 **`https://naverapihub.apigw.ntruss.com/search/v1/{blog|cafearticle|news|webkr}`** + 헤더 **`X-NCP-APIGW-API-KEY-ID` / `X-NCP-APIGW-API-KEY`**다(`cms/lib/analyze-keyword.ts`의 `naverHeaders`/`naverSearchTotal`, 2026-08-18 수정). 콘솔에서 API별로 "선택한 API" 체크박스가 있어야 하며, 체크 안 된 항목은 401(`이 Application에서 활성화되어 있지 않습니다`)이 난다 — 블로그·카페·뉴스·웹문서 4개 다 켜야 키워드 분석 화면의 문서량이 전부 채워진다.

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
- 로컬 저장소를 이 프로젝트에 `vercel link`로 연결했다(`.vercel/project.json`은 **저장소 루트**에 생성됨, `cms/` 안이 아님 — Git에는 안 올라감). 그래서 `vercel` CLI 명령은 `cms/`가 아니라 **저장소 루트**에서 실행해야 한다(§5.3 정정).
- `cms/lib/store.ts`에 §2-2의 `/tmp` 폴백을 추가해 최소한 크래시 없이 뜨도록 했다.
- 위 변경분을 커밋하고 `vercel --prod`로 수동 배포 + `git push`로 GitHub 연동 배포 경로도 함께 살렸다.

### 5.2 다음 담당자가 반드시 할 일 (2026-08-19: 전부 완료)

- [x] `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` — 완료(2026-08-18). NCP API 허브(`console.ncloud.com/naver-api-hub`) 발급 키이며 블로그·카페·뉴스·웹문서 4개 API 모두 활성화 확인함.
- [x] `WP_URL`, `WP_USER`, `WP_APP_PASSWORD` — 완료. Vercel 프로덕션 환경변수로 설정돼 있음(§2-4).
- [x] **Copilot AI API 연결** — 완료(2026-08-19). 환경변수가 아니라 `/settings` > Copilot AI 화면에 테넌트 ID·Client ID·Client Secret을 직접 저장하는 방식이고, 실제 토큰 발급까지 확인함. 트러블슈팅 기록은 §7.3.
- [x] **스토리지를 DB로 이전** — 완료(2026-08-19). Upstash Redis로 이전, 콜드스타트에도 데이터가 안전함. §7.1.
- [x] 로그인 기본 비밀번호 교체 — 완료(2026-08-19). 셀프서비스 비밀번호 변경 화면(`/account`)을 새로 만들었고, 세 계정 모두 이 화면에서 바꿈. §7.2.
- [x] Vercel 배포 보호(Deployment Protection) 확인 — 완료(2026-08-19). 대시보드에서 꺼져 있는 상태로 확인(§2-7). CMS 로그인 화면이 유일한 게이트이고, 기본 비밀번호도 이미 교체됐다.

### 5.3 로컬 개발 명령 (포트 변경 반영)

```bash
cd cms
npm install
npm run dev     # http://localhost:3030 (package.json에 -p 3030 고정)
```

수동 배포가 필요하면 **저장소 루트**에서(`cms/` 아님, `.vercel/project.json`이 루트에 있다):

```bash
vercel --prod   # 이미 연결됨(루트 .vercel/project.json), 로그인은 vercel login 필요
```

환경변수를 로컬로 받아오려면(로컬 `.env.local`은 `cms/.env.local`이어야 Next.js가 읽는다):

```bash
vercel env pull cms/.env.local --yes
```

---

## 7. 이번 세션 변경 내역 (2026-08-19)

### 7.1 스토리지 → Upstash Redis

- `cms/lib/store.ts`: 파일(`data/store.json` + `/tmp` 폴백) 대신 **Upstash Redis 단일 키(`dd2mak:store`)**로 완전히 교체. `readStore`/`writeStore`가 async로 바뀌어, 호출부 20개 파일의 동기 호출을 전부 `await`로 전환했다(`app/actions.ts`, `lib/auth.ts`, `lib/channels.ts`, `lib/wordpress.ts`, `lib/ai.ts`, `lib/copilot.ts`, `lib/analyze-keyword.ts`, 각 `page.tsx` 등).
- **프로비저닝**: Vercel Marketplace로 설치했다. `vercel integration add upstash/upstash-kv` (마켓플레이스 약관 동의가 브라우저에서 한 번 필요했음 — `vercel.com/briank-projects/~/integrations/accept-terms/upstash`). 프로젝트에 **전체 환경(production/preview/development)** 으로 연결됨.
- **환경변수**: `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL`, `REDIS_URL` — 이름이 `@vercel/kv` 시절 규칙을 따른다(`UPSTASH_REDIS_REST_URL`이 아님). `Redis.fromEnv()`가 아니라 `new Redis({ url: KV_REST_API_URL, token: KV_REST_API_TOKEN })`으로 직접 생성한 이유이기도 함.
- **주의(§2-2 반복)**: 로컬 개발과 프로덕션이 같은 Redis를 공유한다. 분리하려면 development 전용 Upstash 리소스를 하나 더 만들어 `vercel integration add upstash/upstash-kv --environment development`로 연결해야 한다.
- 커밋: `e411681`.

### 7.2 계정별 비밀번호 변경 — `/account`

- `seed()`의 기본 비밀번호(`writer`/`reviewer`/`admin`)가 공개 URL에 그대로 떠 있던 문제 해결.
- `app/actions.ts`의 `changePasswordAction` — 현재 비밀번호 확인 후 새 비밀번호(8자 이상)로 교체.
- `app/(cms)/account/page.tsx` + `app/ui/account-form.tsx` — 새 페이지. `/settings`는 `reviewerOnly`라 writer 역할은 못 들어가므로, 역할 무관하게 접근 가능한 별도 페이지로 뒀다.
- 진입점은 **좌측 하단 사용자 표시(아바타+이름) 클릭** 하나뿐이다. 사이드바에 별도 메뉴는 없다(처음엔 만들었다가 중복이라 제거함). 헤더 우측 상단의 사용자 표시도 좌측과 중복이라 제거했다.
- 커밋: `d7433b9`, `6150fa2`, `3552f91`.

### 7.3 Copilot AI API 연결 트러블슈팅

연결이 안 될 때 마주친 두 가지 Azure/Entra ID 오류와 해결법. 다음에 같은 앱을 다시 설정하거나 다른 테넌트에 옮길 때 참고.

1. **`AADSTS7000215: Invalid client secret provided`** — Entra ID에서 클라이언트 암호를 만들면 **Secret ID**(GUID)와 **Value**(실제 값) 두 개가 같이 보이는데, ID를 잘못 복사해서 저장하면 이 에러가 난다. 해결: 인증서 및 암호(Certificates & secrets)에서 새 암호를 만들고 **Value**를 복사해 저장(Value는 생성 직후에만 보임).
2. **`AADSTS500011: The resource principal named api://{clientId} was not found`** — 앱이 자기 자신을 리소스로 쓰는데(`api://{clientId}/.default`, `cms/lib/copilot.ts`의 기본 스코프) 이 앱에 **API가 노출(Expose an API)** 돼 있지 않으면 나는 에러. 해결: Entra ID → 앱 등록 → 해당 앱 → **API 노출(Expose an API)** → Application ID URI를 기본값(`api://{clientId}`) 그대로 추가·저장.
   - 실제 API 권한이 토큰에 실리게 하려면 **앱 역할(App roles)** 을 만들고 **API 권한(API permissions)** 에서 애플리케이션 권한으로 추가한 뒤 **관리자 동의**까지 해야 하지만, 지금은 `COPILOT_API_URL`(실제 백엔드)이 아직 없어 토큰 발급 확인 단계까지만 필요했다.
- 검증: `pingCopilot()`(`cms/lib/copilot.ts`)을 직접 호출해 토큰 발급 성공까지 확인함. 설정 화면의 "연결 확인" 버튼과 동일한 로직이다.
- **`COPILOT_API_URL`은 여전히 미설정**이라 키워드 적합도 진단은 로컬 규칙 기반 폴백(`buildLocalAdvice`)으로 동작한다. 실제 Copilot 백엔드가 생기면 그 URL을 `/settings`에 등록하면 된다.

### 7.4 Deployment Protection

Vercel 대시보드(`vercel.com/briank-projects/dd2mak/settings/deployment-protection`)에서 껐다. CLI로는 조회·설정이 안 되는 대시보드 전용 설정이라 `curl -D - https://dd2mak.vercel.app/`로 간접 확인했다 — Vercel SSO 인터스티셜 없이 곧장 CMS 자체 `/login`으로 307 리다이렉트되면 정상.

---

## 8. 관련 문서

- `docs/handover-v2.2.md` — **최신** (브랜드·카테고리·테마 1.0.3·글작성 흐름·내 정보)
- `docs/handover-v2.0.md` — CMS 대시보드 UI 개편 이력 (색·레이아웃)
- `docs/handover.md` — v1.0 워드프레스 테마 세션
- 나머지는 v2.0 §10과 동일
