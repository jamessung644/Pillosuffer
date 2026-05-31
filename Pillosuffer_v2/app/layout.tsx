import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import SideNav from '@/components/SideNav'

export const metadata: Metadata = {
  title: 'PilloSuffer — 실시간 복약 안전 검사',
  description: 'AI 기반 약물 × 음식 상호작용 검사',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)',  color: '#09090b' },
  ],
}

// 페이지 렌더링 전 실행되는 inline script — FOUC(테마 깜빡임) 방지
const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('pillo-theme');
    var sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var resolved = (saved === 'light' || saved === 'dark') ? saved : sys;
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            <SideNav />
            <main className="mobile-container">
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
