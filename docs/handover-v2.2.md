# 인수인계 문서 v2.2 — dd2mak

작성일: 2026-08-19
대상: 이 프로젝트를 이어받아 운영·개발할 담당자
이전 문서: `docs/handover-v2.1.md` (v2.1, 2026-08-18~19, 스토리지·계정·Copilot·배포 보호)

이 문서는 **v2.1 이후(커밋 `1176b59` 다음부터 `fa41181`까지)** 변경분만 다룬다.
역할 분리·Redis 스토리지·파이프라인·Vercel 기본 설정은 v2.1을 먼저 읽을 것.

---

## 1. 이번 세션 한 줄 요약

CMS는 **브랜드·계정 UX·글작성 흐름·카테고리 선택**을 정리했고, 공개 워드프레스 테마는 **새 상위 메뉴(7개)·하위 드롭다운·허브 페이지·레거시 리다이렉트**를 맞췄다. CMS는 `main` 푸시로 Vercel에 자동 배포되며, **공개 사이트 테마 변경은 카페24에 수동 재업로드**해야 반영된다.

---

## 2. 지금 당장 알아야 할 것

1. **최신 인수인계는 이 문서(v2.2)** 이다. v2.1의 “반드시 할 일” 체크리스트는 이미 완료된 상태다.
2. **CMS URL / 브랜드**: 프로덕션 `https://dd2mak.vercel.app`. 화면 브랜드명은 **블로그 스튜디오**(사이드바·로그인·메타데이터). 예전 “데모 계정” 안내는 로그인 화면에서 제거됐다.
3. **글 작성(`/write`)은 항상 빈 화면**이다. Copilot “이어서 작성”은 **초안 글을 만들고** `/write/[id]`로 보낸다. 전역 `pipelineBrief`는 이어가기 직후·`/write` 진입 시 비운다. 이전처럼 쿼리/잔여 브리프로 `/write`에 내용이 채워지지 않는다.
4. **카테고리(CMS)**: WP에 있는 **하위가 있는 상위만** 선택지에 나온다. 하위 없는 상위는 숨긴다. 라벨은 `부모 › 자식`. 발행 시 **자식 + 부모** 카테고리 ID를 함께 붙인다. 예전 상위 슬러그(`welfare`/`jobs`/`finance`/`leisure`/`digital`)는 `LEGACY_CATEGORY_SLUGS`로 CMS 선택지에서 제외한다.
5. **현재 상위 카테고리(공개·CMS 공통 방향)**: `health` 건강·병원, `money` 돈·연금·복지, `care` 돌봄·안전, `life` 배움·여가, `work` 재취업·일자리, `housing` 주거·자산 관리, `news` 커뮤니티·소식. 정의는 `cms/lib/content.ts`의 `CATEGORIES` / `CATEGORY_TREE`.
6. **WP 발행 인증**: 워드프레스 **로그인 비밀번호가 아니라 Application Password**가 필요하다. 실패 메시지가 그 안내로 바뀌어 있다. 설정 화면의 WP 연결 확인(ping)으로 검증한다.
7. **Gemini 모델**: `gemini-2.0-flash`는 더 이상 제공되지 않아 **`gemini-3.6-flash`** 로 교체했다(`cms/lib/ai.ts`, WP 플러그인 `wordpress-plugin/dd2mak-writer/inc/ai.php`).
8. **테마 배포는 수동**: `wordpress-theme/dd2mak/` 변경(`DD2MAK_VERSION` **1.0.3**)은 Git에만 있고, **카페24에 테마를 다시 올려야** 공개 사이트에 반영된다. CMS(`cms/`)만 Vercel 자동 배포.

---

## 3. CMS 변경 (v2.1 이후)

### 3.1 계정·내 정보

| 항목 | 내용 |
|---|---|
| 진입 | 사이드바 **좌측 하단** 사용자 영역 → `/account` (별도 사이드 메뉴 없음) |
| 로그아웃 | 헤더/사이드바가 아니라 **내 정보**의 세션 섹션 |
| 화면 구성 | 프로필(아바타·이름·`@login`·역할 배지) → 계정 상세(이름·계정 ID·역할 설명) → 보안(비밀번호 변경) → 세션(로그아웃) |
| 파일 | `cms/app/(cms)/account/page.tsx`, `cms/app/ui/account-form.tsx`, `cms/app/ui/shell.tsx` |

기본 시드 비밀번호는 v2.1에서 이미 교체한 전제. 새 환경에서 Redis를 비우면 시드(`writer`/`reviewer`/`admin`)가 다시 생기므로 **반드시 `/account`에서 다시 변경**할 것.

### 3.2 글 작성·목록 UX

- `/write`: 항상 신규 작성. `pipelineBrief`가 남아 있으면 페이지 로드 시 클리어.
- Copilot 이어가기(`continueToWriteAction`): 초안 생성 + `post.research`에 진단 스냅샷 저장 → `/write/[id]` 리다이렉트 → `pipelineBrief` null.
- **작성한 글**(`/posts`), **검수 대기**(`/review`) 테이블에 **No** 열 추가(페이지 내 순번).

### 3.3 카테고리·발행

- `getWpCategoryTree`: 자식 없는 부모 숨김 + 레거시 슬러그 제외.
- 글작성/검수 셀렉트: `부모 › 자식` 표기, 자식 필수.
- WP REST 발행 시 부모·자식 카테고리 동시 할당.
- WP 인증 실패 시 Application Password 안내 + 설정 ping.

### 3.4 AI

- Gemini 기본 모델: `gemini-3.6-flash`.

### 3.5 관련 커밋 (요약)

| 커밋 | 내용 |
|---|---|
| `3a4931d` | Gemini 3.6 Flash로 AI 초안 복구 |
| `70aff66` / `2fd8f52` / `09d1659` | 카테고리 필터·WP 인증 안내·부모 카테고리 동시 할당·한글명 |
| `7a6a404` / `1fe8a2e` | 데모 계정 안내 제거, 브랜드명·로그아웃 위치 |
| `1d5d08a` / `4b54f1c` | `/write` 초기화 + 목록 No 열 |
| `fa41181` | 내 정보 프로필·역할 표시 |

---

## 4. 워드프레스 테마 변경 (공개 사이트)

경로: `wordpress-theme/dd2mak/` · 상수 `DD2MAK_VERSION` = **1.0.3** (`functions.php`).  
`style.css` 헤더 Version 필드는 예전 값일 수 있으니 **캐시 버스트는 `DD2MAK_VERSION`을 기준**으로 본다.

### 4.1 메뉴·카테고리 UX

- 핵심 주제/홈·카테고리 허브가 **주 메뉴와 같은 상위·하위 이름**을 쓰도록 맞춤.
- 상위 메뉴 **호버 시 하위 드롭다운**.
- 자식이 있는 상위는 카테고리 아카이브에서 **하위주제 허브**로 동작(`category.php` + `.category-hub`).
- **레거시 상위 카테고리 URL** → 새 카테고리로 리다이렉트(`dd2mak_redirect_legacy_categories`).
- 주 메뉴에 WP 자식 카테고리를 붙이는 보조 로직이 테마에 포함됨.

### 4.2 카페24 반영 절차 (필수)

1. `wordpress-theme/dd2mak/`를 zip으로 묶어 카페24 WP 관리자 → 외모 → 테마 업로드(또는 FTP로 교체).
2. 활성화 후 **고정링크 저장** 한 번.
3. 메뉴·카테고리가 새 7개 상위에 맞는지 확인. 예전 6개 메뉴만 남아 있으면 메뉴를 재구성.
4. CMS 쪽 WP Application Password·카테고리 트리가 라이브 WP와 일치하는지 `/settings` ping + 글작성 카테고리 목록으로 확인.

관련 커밋: `84a478b`, `cf4a216`, `2d2d0a7`, `f0665a8`.

---

## 5. 운영 시 자주 하는 일

| 목적 | 방법 |
|---|---|
| CMS 배포 | `main`에 푸시 → Vercel Production (`Root Directory = cms`) |
| 테마 배포 | 카페24에 테마 재업로드 (자동 아님) |
| 계정/비번 | `/account` |
| WP 연결 | `/settings` → 워드프레스 연결 확인 |
| AI 초안 실패 | Gemini 키가 유효한지 + 모델명 `gemini-3.6-flash` 유지 여부 |
| 카테고리 안 보임 | WP에 자식 카테고리가 있는지, 레거시 슬러그인지 확인 |

로컬 CMS:

```bash
cd cms
npm install
npm run dev   # http://localhost:3030
```

로컬과 프로덕션이 **같은 Upstash Redis**를 쓰는 점은 v2.1 §2-2와 동일하다.

---

## 6. 아직 남아 있는 / 주의할 점

- [ ] **카페24 테마 1.0.3 반영 여부** — Git에만 있고 호스팅 반영은 운영자가 확인해야 함.
- [ ] **`COPILOT_API_URL`(실제 Copilot 백엔드)** — 없으면 로컬 규칙 폴백(`buildLocalAdvice`). v2.1 §7.3 참고.
- [ ] **로컬/프로덕션 Redis 분리** — 아직 공유. 필요 시 development 전용 Upstash 추가.
- [ ] `docs/deployment-checklist.md`의 카테고리 6개 표기는 **예전 메뉴 기준**일 수 있음. 공개 메뉴는 이 문서 §2-5·§4를 우선.

---

## 7. 관련 문서

- `docs/handover-v2.1.md` — Redis·비밀번호 변경·Copilot·Deployment Protection
- `docs/handover-v2.0.md` — CMS 대시보드 UI 개편
- `docs/handover.md` — v1.0 워드프레스 테마 세션
- `docs/deployment-checklist.md` — 카페24 배포 체크리스트(카테고리 표기는 §6 주의)
