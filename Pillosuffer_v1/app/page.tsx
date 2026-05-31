import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

interface BigCardProps {
  href: string
  icon: string
  title: string
  desc: string
}

function BigCard({ href, icon, title, desc }: BigCardProps) {
  return (
    <Link
      href={href}
      className="block bg-white border border-gray-100 rounded-3xl p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.98] active:bg-gray-50 transition-all"
    >
      <div className="flex flex-col h-full justify-between min-h-[140px]">
        <span className="text-5xl">{icon}</span>
        <div>
          <p className="text-xl font-bold text-gray-900 leading-tight">{title}</p>
          <p className="text-sm text-gray-400 mt-1">{desc}</p>
        </div>
      </div>
    </Link>
  )
}

function SmallCard({ href, icon, title }: { href: string; icon: string; title: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:bg-gray-50 transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <p className="text-base font-semibold text-gray-900 flex-1">{title}</p>
      <span className="text-gray-300 text-xl font-light">›</span>
    </Link>
  )
}

export default function HomePage() {
  return (
    <div className="page-padding flex flex-col min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8 pt-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">PilloSuffer</h1>
        <Link
          href="/profile"
          aria-label="내 정보"
          className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center active:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </Link>
      </div>

      {/* 큰 카드 2개 */}
      <div className="space-y-4 mb-4">
        <BigCard
          href="/scan"
          icon="📷"
          title="약봉투 촬영하기"
          desc="약 정보를 자동으로 저장합니다"
        />
        <BigCard
          href="/food"
          icon="🍎"
          title="음식 사진 촬영하기"
          desc="음식·영양제 안전 여부 확인"
        />
      </div>

      {/* 작은 카드 */}
      <SmallCard
        href="/my-meds"
        icon="📋"
        title="내 약 관리"
      />

      {/* 면책 */}
      <div className="mt-auto pt-8">
        <p className="text-center text-xs text-gray-300 leading-relaxed">
          참고용 서비스 · 의학적 판단 대체 불가
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
