import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: '뭐무꼬 — 복약 안전 검증',
  description: '약 봉투 사진으로 음식·영양제 복약 안전 여부를 AI가 검증합니다.',
  icons: {
    icon: '/logo.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-100">
        <AuthProvider>
          <div className="mobile-container bg-gray-50 shadow-2xl">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
