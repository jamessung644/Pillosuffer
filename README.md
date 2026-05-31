# PilloSuffer

PilloSuffer는 복용 중인 의약품과 식품/영양제 정보를 함께 확인해 상호작용 위험을 빠르게 점검하는 헬스케어 웹 프로젝트입니다.

이 저장소에는 Next.js 앱 소스와 정적 HTML 개발보고서가 함께 들어 있습니다. GitHub Pages에는 루트의 `index.html`을 배포하면 `PilloSuffer_개발보고서.html` 보고서로 바로 연결됩니다.

## 주요 기능

- 약 봉투 OCR 기반 약품 등록
- 의약품 검색 및 복약 정보 확인
- 음식/영양제 검색
- 약물-식품 상호작용 안전성 검사
- 검사 이력 및 내 약 보관함 관리
- Supabase 기반 데이터 조회
- Gemini 기반 보조 판단 로직

## 저장소 구조

```text
.
├── index.html                    # GitHub Pages 진입 파일
├── PilloSuffer_개발보고서.html      # 배포할 정적 HTML 보고서
├── Pillosuffer_v1/               # 초기 버전 Next.js 앱
├── Pillosuffer_v2/               # 최신 버전 Next.js 앱
└── sql data/                     # 원천 데이터/실험 파일, Git 제외
```

## HTML 배포

GitHub Pages로 보고서만 배포할 경우 루트 디렉터리를 Pages 대상으로 지정하면 됩니다.

1. GitHub 저장소에 업로드
2. `Settings` -> `Pages`
3. `Build and deployment`에서 `Deploy from a branch` 선택
4. `main` 브랜치와 `/ (root)` 선택
5. 배포 URL 접속

루트에는 `index.html`이 있어 Pages 첫 화면에서 개발보고서로 자동 이동합니다.

## 로컬 실행

최신 앱은 `Pillosuffer_v2` 기준입니다.

```bash
cd Pillosuffer_v2
npm install
cp .env.local.example .env.local
npm run dev
```

개발 서버는 기본적으로 `http://localhost:3002`에서 실행됩니다.

## 환경 변수

실제 API 키는 저장소에 커밋하지 않습니다. 로컬 실행이나 별도 배포 환경에서만 `.env.local` 또는 호스팅 서비스의 Environment Variables에 설정합니다.

```bash
GOOGLE_VISION_API_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY`는 브라우저에 노출될 수 있는 공개 anon key이지만, Supabase Row Level Security 정책이 반드시 올바르게 설정되어 있어야 합니다.

## GitHub 업로드 전 보안 체크

- `.env.local`, `.env`, `.env.*` 파일은 업로드하지 않습니다.
- `.next`, `node_modules`, `.vercel`은 업로드하지 않습니다.
- `sql data/`의 원천 데이터, 대용량 Excel/CSV/SQL 파일은 업로드하지 않습니다.
- API 키가 한 번이라도 외부에 공유되었거나 공개 저장소에 올라갔다면 즉시 재발급합니다.
- GitHub에 올리기 전 아래 명령으로 커밋 후보 파일에 민감 정보가 잡히는지 확인합니다.

```bash
git -c core.quotePath=false ls-files --others --exclude-standard \
  | grep -v '^README.md$' \
  | xargs rg -n -S "(AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{20,}|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{20,}|github_pat_[0-9A-Za-z_]{20,}|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9|BEGIN (RSA|OPENSSH|EC|DSA)? ?PRIVATE KEY)"
```

## 주의

이 프로젝트는 의약품/식품 상호작용 정보를 보조적으로 확인하기 위한 개발 프로젝트입니다. 실제 복약 변경이나 치료 판단은 의료 전문가의 안내를 우선해야 합니다.
