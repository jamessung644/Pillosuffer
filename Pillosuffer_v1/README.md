# 뭐무꼬 / PilloSuffer v1

현재 운영 웹 앱의 소스입니다. [운영 사이트](https://pillosuffer-v1.vercel.app)

2026-09-06 기준 Gemini 3.8 Flash 전환, 입력·로그인 복귀·분석 오류·화면 회귀 수정이 포함되어 있습니다. 홈 버튼의 네 가지 배경색은 기존 색상으로 유지합니다.

## 실행

Node.js 22와 npm을 기준으로 확인했습니다. 이 폴더에서 실행합니다.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`.env.local`에 본인 프로젝트의 환경변수 값을 설정해야 합니다. 개발 주소는 `http://localhost:3001`입니다.

```bash
npm test
npm run build
npm start
```

단위 회귀 테스트는 외부 API 호출 없이 실행됩니다. `npm start` 기본 주소는 `http://localhost:3000`입니다. 브라우저 회귀용 `tests/browser.cjs`·`tests/result-browser.cjs`는 별도 Playwright 실행 환경이 필요하며, 결과 화면 테스트는 가상 인증·API 응답을 사용하는 로컬 테스트입니다.

## 환경변수

| 이름 | 사용 위치 | 용도 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저·서버 | Supabase 프로젝트 주소 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저·서버 | 공개 클라이언트 키. service role 키를 넣지 않습니다. |
| `GEMINI_API_KEY` | 서버 | 음식 이미지 인식·상호작용 분석 |
| `GOOGLE_VISION_API_KEY` | 서버 | 웹 약봉투 OCR |
| `MFDS_API_KEY` | 서버 | 식약처 e약은요·의약품 제품 허가정보 조회 |
| `NEXT_PUBLIC_API_BASE` | 브라우저 | 웹에서는 비움. 네이티브 앱은 API 운영 주소 사용 |

실제 키, `.env.local`, Vercel 인증 정보와 데이터베이스 원본은 저장소에 포함하지 않습니다.

Supabase에서는 Google 로그인을 별도로 설정하고 로그인 반환 주소 `/auth/callback`을 로컬·배포 도메인에 맞춰 등록해야 합니다. 검색은 `processed_foods`, `supplements`, `drug_food_interactions` 테이블에 의존합니다. 해당 데이터와 데이터 이용 권한은 별도 준비가 필요하며, 이 저장소만 설치한다고 기존 운영 데이터까지 생성되는 것은 아닙니다. 공개 키의 데이터 접근 범위는 해당 프로젝트의 RLS 정책으로 제한해야 합니다.

## 구조

- `app/`: 홈, 촬영·직접 입력, 약 확인, 음식 입력, 결과, 약 관리, 프로필·로그인 화면
- `app/api/`: OCR, 음식 이미지, 약품 데이터, 상호작용 분석 API
- `components/`: 약 카드, 단계 표시, 내비게이션, 결과·출처 표시
- `lib/`: 모델 호출, 외부 데이터 조회, 기기 저장, 응답 검증
- `tests/`: 저장 데이터·오류 응답 단위 테스트와 브라우저 회귀 테스트
- `plugins/vision-ocr/`: 운영 웹 의존성에 필요한 로컬 패키지 메타데이터

현재 `main`의 이 폴더는 웹 배포 기준입니다. 네이티브 iOS 프로젝트 전체는 이 폴더에 포함하지 않았으며, 기존 `ios-app` 브랜치를 이번 공개 작업으로 변경하지 않았습니다.

## 모델·저장 방식

- 모델 설정: `lib/gemini.ts`, `lib/safety-llm.ts`의 `gemini-3.8-flash`
- 추론 설정: `thinkingLevel: low`; 현재 모델 요청에는 `temperature`·`topP`를 지정하지 않음
- 약 정보·프로필·검사 기록: 현재 기기 저장소 사용. 계정 간·기기 간 자동 동기화는 구현하지 않음
- 결과 화면: 로그인 필요
- LLM 키 미설정·호출 실패 시 기존 분석 코드가 `Mock 모드` 출처의 주의 응답을 반환할 수 있음. 이를 실제 분석 성공으로 간주하지 않음

## 배포

GitHub 연동으로 새 Vercel 프로젝트를 만들 때 Root Directory는 `Pillosuffer_v1`로 지정합니다. 기존 운영 프로젝트에는 이미 환경변수와 도메인 연결이 있으므로 별도 확인 없이 새 프로젝트로 교체하지 않습니다.

운영 프로젝트에 연결된 이 폴더에서 수동 배포할 때는 다음과 같습니다.

```bash
vercel link
vercel --prod
```

## 검증 범위

입력·오류 처리 단위 회귀 17개와 320/375/768/1440px 화면 검사를 수행했습니다. 실제 Google 로그인 완료, 물리 iPhone 동작, 실제 약봉투·음식 사진 인식률, 의학적 판단 정확도는 별도 평가가 필요합니다. 발표 자료의 과거 평가 수치는 현재 모델의 성능 보장이 아닙니다.

이 서비스는 참고 정보 제공용이며 진단·처방이나 약사·의사의 판단을 대체하지 않습니다.
