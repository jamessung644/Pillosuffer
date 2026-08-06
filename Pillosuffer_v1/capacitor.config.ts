import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.jamessung.pillosuffer',
  appName: '뭐무꼬',
  // next.config.mjs 의 IOS_BUILD 브랜치가 static export 를 여기로 떨어뜨린다.
  webDir: '.next-ios',
  ios: {
    // 노치/홈 인디케이터 대응은 CSS 의 env(safe-area-inset-*) 로 처리한다.
    contentInset: 'never',
    // 웹뷰 안에서 스크롤 바운스가 나면 네이티브 느낌이 깨진다.
    scrollEnabled: true,
  },
  server: {
    // 기본값. lib/api.ts 의 NEXT_PUBLIC_API_BASE 와 CORS 설정이 이 오리진 기준이다.
    iosScheme: 'capacitor',
  },
}

export default config
