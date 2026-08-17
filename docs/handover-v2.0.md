# 인수인계 문서 v2.0 — dd2mak

작성일: 2026-08-17  
대상: 이 프로젝트를 이어받아 운영·개발할 담당자  
이전 문서: `docs/handover.md` (v1.0, 2026-08-12, 워드프레스 테마만)

---

## 1. 한 줄 요약

공개 사이트는 기존 **dd2mak 워드프레스 테마**, 글 작성·검수·발행은 **별도 Next.js CMS**다.  
작성자가 CMS에서 글을 쓰고 검수자가 발행하면, 기본으로 워드프레스에 올라가고 티스토리·네이버 블로그도 함께 선택할 수 있다.

워드프레스 관리자 안의 “쉬운 글쓰기”로 글을 쓰지 않는다. WP는 공개 화면과 REST 발행 대상이다.

---

## 2. 지금 당장 알아야 할 것

1. **작업 화면은 CMS** (`cms/`) — `http://localhost:3010`
2. **공개 블로그는 워드프레스** (`local-wordpress/`는 로컬 전용, Git에 없음) — `http://localhost:3011`
3. **시크릿은 Git에 넣지 않는다.** `cms/.env.local`, `cms/data/store.json`(API 키·채널 토큰)은 gitignore.
4. **카페24에 올라간 테마**는 공개 사이트용이다. CMS는 카페24와 별도 서버(또는 로컬)에서 돌리고, 발행만 WP REST로 붙인다.

### 로컬 계정

| 시스템 | 주소 | 계정 |
|---|---|---|
| CMS 작성자 | http://localhost:3010 | `writer` / `writer` |
| CMS 검수자 | http://localhost:3010 | `reviewer` / `reviewer` 또는 `admin` / `admin` |
| 워드프레스 관리자 | http://localhost:3011/wp-admin | `admin` / `admin` |

---

## 3. 역할 분리

```
[ CMS :3010 ]                    [ WordPress :3011 ]
 글 작성 / 검수 / 설정              공개 테마 (시니어 UX)
 AI 초안                           카테고리 = 사이트 메뉴
 채널 선택 후 발행 ──────── REST ──► 글 게시
        │
        ├─ 티스토리 API (선택)
        └─ 네이버 블로그 API (선택)
```

- 작성자: **글 작성**, **작성한 글**만 보임. 발행 불가.
- 검수자/관리자: 위 + **검수 대기**, **설정**. 검수 화면에서만 발행.
- 워크플로: `draft`(작성 중) → `pending`(검수 대기) → `publish`(발행됨, 채널 1개 이상 성공 시)

---

## 4. 폴더 구조 (Git에 들어가는 것)

```
dd2mak/
├── docs/
│   ├── handover.md                 v1.0 (테마 세션)
│   ├── handover-v2.0.md            이 문서
│   ├── site_contents.md            기획·벤치마킹
│   ├── sample-content.md           샘플 원고
│   ├── deployment-checklist.md     카페24 테마 배포 체크리스트
│   └── superpowers/                초기 플러그인 설계 (폐기된 방향, 참고만)
├── cms/                            글 작성·관리 시스템 (Next.js 16)
│   ├── app/(cms)/                  로그인 후 화면 (사이드바 레이아웃)
│   ├── app/login/                  로그인
│   ├── app/ui/                     폼·사이드바
│   ├── app/actions.ts              서버 액션
│   ├── lib/                        저장소·AI·WP·채널
│   └── middleware.ts               미로그인 → /login
├── wordpress-theme/dd2mak/         공개 테마 소스
├── wordpress-plugin/dd2mak-writer/ 초기에 만든 WP 플러그인 (사용 안 함)
└── .gitignore
```

Git에 **넣지 않는 것**

- `local-wordpress/` — 로컬 WP 코어 + SQLite DB
- `cms/node_modules/`, `cms/.next/`
- `cms/.env.local` — `WP_URL`, `WP_USER`, `WP_APP_PASSWORD`
- `cms/data/` — 글·설정 JSON
- `.tools/` — WP-CLI 등

---

## 5. 이번 세션에서 한 일 (v1 이후)

### 5.1 방향 전환

처음엔 워드프레스 플러그인 `dd2mak-writer`로 작성 UI를 넣었다.  
이후 요청: **플러그인으로 들어가지 말 것.** 작성·검수는 별도 시스템, WP는 발행만.

- 플러그인은 로컬에서 비활성화.
- 로컬 테마의 `easy-writer.php` require는 주석 처리 (카페24 원본 테마 소스 `wordpress-theme/dd2mak`에는 쉬운 글쓰기 코드가 남아 있음).

### 5.2 CMS 구축 (`cms/`)

- Next.js App Router, Tailwind, TypeScript.
- 데이터: `cms/data/store.json` (파일 JSON, 첫 실행 시 시드).
- 인증: 쿠키 `dd2mak_session` (HMAC).
- UI: 왼쪽 고정 사이드바, 오른쪽에서만 화면 전환. **일반 관리자 UI** (시니어용 큰 글씨·보라색 톤 아님). 시니어 UX는 공개 테마만 해당.

**메뉴**

| 메뉴 | 경로 | 권한 |
|---|---|---|
| 글 작성 | `/write` | 전원 |
| 작성한 글 | `/posts` | 전원 (작성자는 본인 글만) |
| 검수 대기 | `/review` | 검수자 |
| 설정 | `/settings` | 검수자 |

로그인 후 `/` 는 `/posts` 로 보낸다.

### 5.3 멀티채널 발행

검수 화면에서 채널 체크 후 한 번에 발행.

- **워드프레스**: 기본 선택. REST `POST /wp-json/wp/v2/posts`, Application Password.
- **티스토리**: 설정에 켜고 토큰이 있을 때만 선택 가능. `POST https://www.tistory.com/apis/post/write`
- **네이버 블로그**: 설정에 켜고 토큰이 있을 때만. `POST https://openapi.naver.com/blog/writePost.json`

한 채널이라도 성공하면 CMS 상태는 `publish`. 실패한 채널은 글 상세에 오류로 남긴다.  
OAuth 자동 갱신은 없음. 설정 화면에 토큰을 붙여 넣는다.

### 5.4 설정 화면

- AI API: Anthropic / OpenAI / Gemini / Cursor(키만 저장, 초안 생성 불가).
- 채널: WP URL·계정·앱 비밀번호, 티스토리 블로그이름+토큰, 네이버 토큰.

### 5.5 카테고리 2단계 선택

테마 쉬운 글쓰기와 같이 **주메뉴 → 하위메뉴**.

워드프레스 `글 > 카테고리`에 등록된 트리를 CMS가 REST로 읽는다.  
로컬에는 테마 `functions.php`의 `dd2mak_default_category_tree()` 로 하위를 심어 두었다.

| 주메뉴 | 하위메뉴 |
|---|---|
| 건강관리 | 낙상 예방, 건강검진, 복약 관리 |
| 복지혜택 | 기초연금, 임플란트·틀니, 교통·통신, 에너지 바우처 |
| 일자리·재취업 | 채용정보, 노인일자리, 재취업 교육 |
| 연금·재무 | 국민연금, 노후 재무 |
| 여가·배움 | 평생학습, 취미·여가 |
| 디지털 생활 | 카카오톡, 키오스크, 모바일뱅킹, 정부24, 사기 예방 |

하위 없이 주메뉴만 고르면 주메뉴 slug로 발행된다.

---

## 6. 로컬 실행

PHP(Homebrew), Node.js 필요.

```bash
# 공개 WP (SQLite)
export PATH="/opt/homebrew/opt/php/bin:$PATH"
cd local-wordpress
php -S localhost:3011 router.php

# CMS
cd cms
cp .env.local.example .env.local   # 없으면 아래 값으로 생성
npm install
npm run dev -- -p 3010
```

`cms/.env.local` 예시 (값은 로컬 WP 애플리케이션 비밀번호):

```
WP_URL=http://localhost:3011
WP_USER=admin
WP_APP_PASSWORD=xxxxxxxxxxxxxxxxxxxx
```

WP 애플리케이션 비밀번호: WP 관리자 → 사용자 → 프로필 → 애플리케이션 비밀번호.

로컬 WP는 공식 SQLite 드롭인으로 설치돼 있다. 이 폴더는 저장소에 없으므로, 새 환경에서는 WP를 다시 띄우거나 백업 DB를 복사해야 한다.

---

## 7. CMS 코드 위치

| 파일 | 역할 |
|---|---|
| `cms/lib/store.ts` | JSON 저장소, 사용자·글·설정 |
| `cms/lib/auth.ts` | 세션 쿠키 |
| `cms/lib/ai.ts` | 초안 생성 (약 2000자) |
| `cms/lib/wordpress.ts` | 카테고리 조회, WP 발행 |
| `cms/lib/channels.ts` | WP/티스토리/네이버 동시 발행 |
| `cms/lib/content.ts` | 카테고리 트리, 상태 라벨, 프롬프트 |
| `cms/app/actions.ts` | 로그인·저장·제출·발행·설정 |
| `cms/app/ui/shell.tsx` | 왼쪽 사이드바 레이아웃 |
| `cms/app/ui/category-select.tsx` | 주메뉴/하위메뉴 셀렉트 |
| `cms/middleware.ts` | 로그인 강제 |

---

## 8. 공개 테마 (v1에서 유지)

- 소스: `wordpress-theme/dd2mak/`
- 시니어 UX(큰 글씨, 터치 영역)는 **여기만**.
- 카테고리 6개 = 주 메뉴. 글이 해당 카테고리로 발행되면 메뉴에 노출.
- 일자리 공고 CPT `job_posting`, 검수 메타박스 유지.
- 카페24 배포 zip 재생성:

```bash
cd wordpress-theme
rm -f dd2mak.zip
zip -r -q dd2mak.zip dd2mak -x "*/.DS_Store"
```

테마 설치·콘텐츠 가이드는 `wordpress-theme/dd2mak/README.md`, 카페24 체크리스트는 `docs/deployment-checklist.md`.

---

## 9. 다음 담당자 할 일

- [ ] 운영 서버에 CMS 배포 (Node 또는 컨테이너). WP와 다른 호스트여도 됨.
- [ ] 운영 WP Application Password를 CMS 설정에 저장. `http://localhost:3011` 대신 실제 사이트 URL.
- [ ] AI 키를 CMS 설정에 저장 (더 이상 카페24 `wp-config.php`의 `DD2MAK_ANTHROPIC_API_KEY`에 의존하지 않음).
- [ ] 티스토리·네이버를 쓰려면 각 개발자 센터에서 토큰 발급 후 설정에 붙여 넣기. 만료 시 수동 갱신.
- [ ] `docs/sample-content.md`의 `[확인 필요]` 수치 확인 후 발행.
- [ ] 로컬 기본 비밀번호(`writer`/`admin`)는 운영에서 바꿀 것.
- [ ] CMS 데이터는 지금 JSON 파일. 운영 규모가 커지면 DB로 옮기는 것을 검토.
- [ ] 티스토리 오픈 API 제공 여부·폐지 일정은 카카오 공지 확인.

---

## 10. 관련 문서

- `docs/handover.md` — v1.0 테마 세션 이력
- `wordpress-theme/dd2mak/README.md` — 테마 설치
- `docs/site_contents.md` — 기획
- `docs/sample-content.md` — 샘플 글
- `docs/deployment-checklist.md` — 카페24 테마 배포
- `docs/superpowers/specs/2026-08-17-dd2mak-writer-plugin-design.md` — 폐기된 플러그인 설계 (히스토리)
