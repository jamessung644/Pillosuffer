/**
 * API 베이스 URL
 *
 * 웹(Vercel)에서는 빈 문자열이라 지금까지처럼 상대 경로로 나간다.
 * iOS(Capacitor)에서는 앱이 capacitor://localhost 에서 실행되므로 상대 경로가
 * 앱 번들 내부를 가리켜 404가 된다. 그래서 iOS 빌드 시에만
 * NEXT_PUBLIC_API_BASE 로 Vercel 오리진을 주입한다(package.json 의 build:ios).
 *
 * 이 값이 채워지면 요청이 cross-origin 이 되므로 next.config.mjs 의 headers()
 * 에서 /api/* 에 CORS 헤더를 붙여야 한다.
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '')

/** `/api/ocr` → 웹은 그대로, iOS는 `https://…vercel.app/api/ocr` */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}
