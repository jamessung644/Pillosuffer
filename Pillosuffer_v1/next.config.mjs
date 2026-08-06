/**
 * 빌드 타깃이 두 개다.
 *  - 기본(웹/Vercel): 지금까지와 동일. API 라우트 + middleware 포함.
 *  - IOS_BUILD=1(Capacitor): UI만 static export → .next-ios/out 을 앱에 번들.
 *    API는 Vercel에 그대로 두고 NEXT_PUBLIC_API_BASE 로 호출한다.
 *
 * pageExtensions 를 tsx 로 좁히면 route.ts(API·auth 콜백)가 라우트로 잡히지 않아
 * output: 'export' 와 충돌하지 않는다. 페이지는 전부 .tsx, 라우트는 전부 .ts 다.
 * 주의: Next 14 는 이 배열이 원소 1개면 터진다(pageExtensions.map is not a function).
 * 'jsx' 는 실제로 쓰이지 않지만 원소 수를 2개로 만들기 위해 남겨둔다.
 *
 * @type {import('next').NextConfig}
 */
const iosBuild = process.env.IOS_BUILD === '1'

const nextConfig = iosBuild
  ? {
      output: 'export',
      distDir: '.next-ios',
      pageExtensions: ['tsx', 'jsx'],
      images: { unoptimized: true },
    }
  : {
      experimental: {
        serverActions: { allowedOrigins: ['localhost:3001'] },
      },
      // iOS 앱은 capacitor://localhost 오리진에서 /api/* 를 cross-origin 으로 호출한다.
      // headers() 는 output: 'export' 와 함께 쓸 수 없으므로 웹 빌드에만 둔다.
      async headers() {
        return [
          {
            source: '/api/:path*',
            headers: [
              { key: 'Access-Control-Allow-Origin', value: 'capacitor://localhost' },
              { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
              { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
              { key: 'Access-Control-Max-Age', value: '86400' },
            ],
          },
        ]
      },
    }

export default nextConfig
