import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import Icon from '@/components/Icon'
import Logo from '@/components/Logo'

interface TileProps {
  href: string
  icon: string
  title: string
  color: string
}

function Tile({ href, icon, title, color }: TileProps) {
  return (
    <Link
      href={href}
      // 높이는 그리드가 정한다(min-h 없음) — 작은 화면에서 타일이 줄어들어야
      // 홈 화면 전체가 스크롤 없이 들어간다.
      className={`flex flex-col items-center justify-center gap-2 rounded-3xl p-3 overflow-hidden text-white shadow-sm active:scale-[0.97] transition-transform ${color}`}
    >
      <Icon name={icon} size={34} stroke={2.2} />
      <span className="text-xl font-extrabold tracking-tight">{title}</span>
    </Link>
  )
}

export default function HomePage() {
  return (
    <div className="home-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="home-gap pt-1">
        <h1 className="text-[34px] leading-tight font-black text-gray-900 tracking-tight">뭐무꼬</h1>
        <p className="text-[15px] text-gray-500 mt-1 font-semibold">약과 음식을 함께 먹어도 되는지 알려드려요</p>
      </div>

      {/* 히어로 카드 */}
      <div className="home-gap flex items-center gap-3 rounded-3xl p-5 bg-[#EAF2FE]">
        <div className="flex-1 min-w-0">
          <p className="text-[19px] font-extrabold text-gray-900 leading-snug">오늘 먹을 약과 음식<br />같이 먹어도 될까요?</p>
          <p className="text-[13px] text-gray-500 mt-2 font-medium">시작하려면 약 봉투를 찍어주세요.</p>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center flex-shrink-0"><Logo size={46} /></div>
      </div>

      {/* 기능 타일 2×2 */}
      {/* flex-1 + min-h-0 으로 남는 높이를 전부 흡수한다 */}
      <div className="grid grid-cols-2 grid-rows-2 gap-3 flex-1 min-h-0">
        <Tile href="/scan"     icon="camera"    title="약 봉투 찍기" color="bg-[#4D9BF5]" />
        <Tile href="/food"     icon="bowl"      title="음식 확인"   color="bg-[#F3A45C]" />
        <Tile href="/my-meds"  icon="clipboard" title="약 관리"     color="bg-[#5BBE88]" />
        <Tile href="/profile"  icon="user"      title="내 정보"     color="bg-[#6E7884]" />
      </div>

      {/* 면책 */}
      <div className="home-gap-t home-gap flex items-start gap-2.5 px-1">
        <span className="text-blue-500 flex-shrink-0 mt-0.5"><Icon name="alert" size={18} stroke={2.4} /></span>
        <p className="text-sm text-gray-500 leading-relaxed font-medium">이 정보는 참고용입니다. 정확한 판단은 약사·의사에게 확인하세요.</p>
      </div>

      {/* 응급 (테두리형) */}
      <a
        href="tel:119"
        className="flex items-center justify-center gap-2 rounded-2xl py-4 bg-red-50 border-2 border-red-200 text-red-600 font-bold text-[17px] active:bg-red-100 transition-colors"
      >
        응급 상황은 119에 연락하세요
      </a>

      <BottomNav />
    </div>
  )
}
