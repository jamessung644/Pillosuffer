'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import Sparkline from '@/components/Sparkline'
import { useAuth } from '@/components/AuthProvider'
import { getSavedDrugs } from '@/lib/storage'
import type { DrugInfo, HistoryEntry } from '@/types'

const VISITED_KEY = 'pillo-visited'

type TabKey = 'overview' | 'meds' | 'food' | 'alerts'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: '전체' },
  { key: 'meds',     label: '약물' },
  { key: 'food',     label: '음식' },
  { key: 'alerts',   label: '알림' },
]

export default function HomePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab] = useState<TabKey>('overview')
  const [drugs, setDrugs] = useState<DrugInfo[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // 첫 방문 + 비로그인 → 로그인 페이지로 안내
  useEffect(() => {
    if (authLoading) return
    if (!user && !localStorage.getItem(VISITED_KEY)) {
      setRedirecting(true)
      router.replace('/login')
      return
    }
    setDrugs(getSavedDrugs())
    const raw = localStorage.getItem('pillosuffer-history')
    if (raw) {
      try { setHistory(JSON.parse(raw)) } catch {}
    }
    setLoaded(true)
  }, [authLoading, user, router])

  // 리다이렉트 중에는 빈 화면 (깜빡임 방지)
  if (authLoading || redirecting) {
    return <div className="min-h-screen bg-ink-950" />
  }

  function clearHistory() {
    if (!confirm('모든 검사 기록을 삭제하시겠어요?')) return
    localStorage.removeItem('pillosuffer-history')
    setHistory([])
  }

  const dangerCount = history.filter(h => h.result.verdict === 'danger').length
  const cautionCount = history.filter(h => h.result.verdict === 'caution').length
  const safeCount   = history.filter(h => h.result.verdict === 'safe').length
  const recentScans = history.length
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  // sparkline용 데이터 (최근 7회 검사 결과 기반)
  const sparkData: number[] = history.slice(0, 7).reverse().map(h =>
    h.result.verdict === 'danger' ? 90 : h.result.verdict === 'caution' ? 60 : 25
  )
  while (sparkData.length < 7) sparkData.unshift(30 + Math.random() * 40)

  return (
    <div className="page-padding flex flex-col min-h-screen grid-bg">
      {/* 상단 바 — 모바일 전용 (데스크탑은 SideNav가 대체) */}
      <div className="hide-on-desktop">
        <TopBar alertCount={dangerCount + cautionCount} />
      </div>

      {/* 데스크탑 헤더 — 큰 화면용 */}
      <div className="show-on-desktop mb-8">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="dot bg-accent-lime relative pulse-dot" />
              <p className="text-xs text-zinc-500 font-medium tracking-wider">실시간 · {today}</p>
            </div>
            <h1 className="mt-2 text-4xl font-light text-zinc-100 tracking-tight">대시보드</h1>
            <p className="text-sm text-zinc-400 mt-1">복약·식품 안전 모니터링</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/food" className="pill">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              음식·영양제 검색
            </Link>
            <Link href="/scan" className="px-4 py-2 bg-white text-ink-950 rounded-full text-sm font-semibold">
              + 약 봉투 촬영
            </Link>
          </div>
        </div>
      </div>

      {/* 모바일 Hero */}
      <section className="mt-5 hide-on-desktop">
        <div className="flex items-center gap-1.5">
          <span className="dot bg-accent-lime relative pulse-dot" />
          <p className="text-xs text-zinc-500 font-medium tracking-wider">실시간 · {today}</p>
        </div>
        <h1 className="mt-2 text-[44px] leading-[1.05] font-light tracking-tight">
          {loaded ? drugs.length : '·'}
          <span className="text-zinc-500 text-2xl ml-2 font-normal">개</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">내 약 보관함에 등록됨</p>
      </section>

      {/* 모바일 Pill 탭 */}
      <nav className="flex gap-2 mt-6 overflow-x-auto -mx-5 px-5 no-scrollbar hide-on-desktop">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pill whitespace-nowrap transition-all ${tab === t.key ? 'pill-active' : ''}`}
          >
            {t.label}
            {t.key === 'alerts' && dangerCount + cautionCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-accent-red/90 text-white rounded-full">
                {dangerCount + cautionCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ── 모바일 컨텐츠 ── */}
      <div className="mt-5 space-y-4 hide-on-desktop">
        {tab === 'overview' && (
          <OverviewMobile
            drugs={drugs}
            sparkData={sparkData}
            dangerCount={dangerCount}
            cautionCount={cautionCount}
            recentScans={recentScans}
          />
        )}
        {tab === 'meds'   && <MedsTab drugs={drugs} />}
        {tab === 'food'   && <FoodTab onCheck={() => router.push('/food')} />}
        {tab === 'alerts' && <AlertsTab history={history} onClear={clearHistory} />}
      </div>

      {/* ── 데스크탑 풀 대시보드 ── */}
      <div className="show-on-desktop">
        <DesktopDashboard
          drugs={drugs}
          history={history}
          sparkData={sparkData}
          loaded={loaded}
          dangerCount={dangerCount}
          cautionCount={cautionCount}
          safeCount={safeCount}
          recentScans={recentScans}
          onClearHistory={clearHistory}
        />
      </div>

      <BottomNav />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   데스크탑 대시보드 — 풀폭 그리드 레이아웃
   ════════════════════════════════════════════════════════════ */

function DesktopDashboard({
  drugs, history, sparkData, loaded,
  dangerCount, cautionCount, safeCount, recentScans,
  onClearHistory,
}: {
  drugs: DrugInfo[]
  history: HistoryEntry[]
  sparkData: number[]
  loaded: boolean
  dangerCount: number
  cautionCount: number
  safeCount: number
  recentScans: number
  onClearHistory: () => void
}) {
  return (
    <div className="grid grid-cols-12 gap-5">
      {/* 메인 KPI 4개 (4 컬럼) */}
      <div className="col-span-12 grid grid-cols-4 gap-4">
        <KpiCard
          label="등록된 약"
          value={loaded ? drugs.length : 0}
          unit="개"
          accent="sky"
          icon="📋"
        />
        <KpiCard
          label="안전 검사"
          value={recentScans}
          unit="회"
          accent="lime"
          icon="✓"
        />
        <KpiCard
          label="주의 항목"
          value={cautionCount}
          unit="건"
          accent="amber"
          icon="!"
        />
        <KpiCard
          label="위험 알림"
          value={dangerCount}
          unit="건"
          accent="red"
          icon="✕"
        />
      </div>

      {/* 메인 액션 카드 (8 col) + 약 라이브러리 (4 col) */}
      <Link
        href="/scan"
        className="col-span-8 card p-6 relative overflow-hidden active:scale-[0.99] transition-transform hover:bg-white/[0.06]"
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent-sky/[0.06] blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-500 tracking-wider font-medium">새 처방전 등록</p>
            <p className="mt-3 text-4xl font-light text-zinc-100">약 봉투 촬영</p>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
              Google Cloud Vision OCR로<br />
              약 이름·함량·투여횟수·일수·용법 자동 인식
            </p>
            <div className="flex items-center gap-2 mt-5">
              <span className="dot bg-accent-lime relative pulse-dot" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">OCR 준비</span>
            </div>
          </div>
          <span className="text-zinc-600 text-2xl">↗</span>
        </div>
        <div className="mt-6 h-20 relative">
          <Sparkline data={sparkData} color="#a3e635" />
        </div>
      </Link>

      {/* 약 라이브러리 미리보기 (4 col) */}
      <div className="col-span-4 card p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-zinc-500 tracking-wider font-medium">내 약 보관함</p>
          <Link href="/my-meds" className="text-xs text-zinc-500 hover:text-zinc-300">
            전체 →
          </Link>
        </div>
        {drugs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-3">
              <span className="text-xl">💊</span>
            </div>
            <p className="text-sm text-zinc-400">등록된 약이 없어요</p>
            <Link href="/scan" className="mt-4 px-4 py-2 bg-white text-ink-950 text-xs font-semibold rounded-xl">
              촬영 시작
            </Link>
          </div>
        ) : (
          <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar">
            {drugs.slice(0, 5).map((d, i) => (
              <div key={`${d.name}-${i}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04]">
                <div className="w-8 h-8 rounded-lg bg-accent-sky/10 flex items-center justify-center text-accent-sky text-xs font-bold num flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-100 truncate">{d.name}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {[d.dose, d.frequency].filter(Boolean).join(' · ') || '정보 없음'}
                  </p>
                </div>
                <div className="dot bg-accent-lime flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 음식 검색 카드 (4 col) */}
      <Link
        href="/food"
        className="col-span-4 card p-5 active:scale-[0.99] hover:bg-white/[0.06] transition-all"
      >
        <p className="text-xs text-zinc-500 tracking-wider font-medium">빠른 검사</p>
        <p className="mt-3 text-2xl font-light text-zinc-100">음식 · 영양제</p>
        <p className="text-sm text-zinc-400 mt-1 mb-4">277,074건 DB 검색</p>
        <div className="flex flex-wrap gap-1.5">
          {['자몽', '우유', '알코올', '비타민C', '오메가3', '칼슘'].map(f => (
            <span key={f} className="pill text-[11px]">{f}</span>
          ))}
        </div>
      </Link>

      {/* 안전 분포 카드 (4 col) */}
      <div className="col-span-4 card p-5">
        <p className="text-xs text-zinc-500 tracking-wider font-medium mb-4">검사 결과 분포</p>
        <SafetyDistribution
          safe={safeCount}
          caution={cautionCount}
          danger={dangerCount}
        />
      </div>

      {/* 최근 알림 (4 col) */}
      <div className="col-span-4 card p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <p className="text-xs text-zinc-500 tracking-wider font-medium">최근 알림</p>
            {dangerCount + cautionCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-accent-red text-white rounded-full">
                {dangerCount + cautionCount}
              </span>
            )}
          </div>
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-[11px] text-zinc-500 hover:text-accent-red transition-colors"
              aria-label="전체 삭제"
            >
              전체 삭제
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <span className="dot bg-accent-lime mb-3" />
            <p className="text-sm text-zinc-200 font-semibold">모두 안전</p>
            <p className="text-xs text-zinc-500 mt-1">활성 경고 없음</p>
          </div>
        ) : (
          <div className="space-y-2.5 flex-1 overflow-y-auto no-scrollbar">
            {history.slice(0, 4).map((h) => {
              const color =
                h.result.verdict === 'danger' ? 'red' :
                h.result.verdict === 'caution' ? 'amber' : 'lime'
              const dotMap = { red: 'bg-accent-red', amber: 'bg-accent-amber', lime: 'bg-accent-lime' }
              const verdictLabel = { danger: '위험', caution: '주의', safe: '안전' } as const
              return (
                <div key={h.id} className="pl-3 border-l-2" style={{ borderColor: color === 'red' ? '#f87171' : color === 'amber' ? '#fb923c' : '#a3e635' }}>
                  <div className="flex items-center gap-1.5">
                    <span className={`dot ${dotMap[color]}`} />
                    <p className="text-xs font-semibold text-zinc-300">{verdictLabel[h.result.verdict]}</p>
                  </div>
                  <p className="text-xs text-zinc-100 mt-1 truncate">
                    {h.drugs.map(d => d.name).join(', ')}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">× {h.foods.join(', ')}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 데이터 소스 (12 col, 풀폭) */}
      <div className="col-span-12 card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-zinc-500 tracking-wider font-medium">데이터 소스</p>
            <p className="text-base font-semibold text-zinc-100 mt-0.5">RAG + 영양 DB</p>
          </div>
          <span className="pill">
            <span className="dot bg-accent-sky" />
            모두 동기화됨
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <DataSource label="식약처 가공식품 DB" value="277,074" unit="건" desc="영양소 27종 함량" />
          <DataSource label="식약처 병용금기" value="2,512" unit="건" desc="약물 상호작용" />
          <DataSource label="의약품 개요·안전성" value="공공 API" unit="" desc="실시간 조회" />
          <DataSource label="Gemini LLM" value="3.1" unit="Flash" desc="JSON 안정 출력" />
        </div>
      </div>
    </div>
  )
}

/* ── KPI 카드 ── */
function KpiCard({
  label, value, unit, accent, icon,
}: {
  label: string
  value: number | string
  unit: string
  accent: 'sky' | 'lime' | 'amber' | 'red'
  icon: string
}) {
  const colorMap = {
    sky:   { text: 'text-accent-sky',   bg: 'bg-accent-sky/10',   glow: 'bg-accent-sky/[0.06]' },
    lime:  { text: 'text-accent-lime',  bg: 'bg-accent-lime/10',  glow: 'bg-accent-lime/[0.06]' },
    amber: { text: 'text-accent-amber', bg: 'bg-accent-amber/10', glow: 'bg-accent-amber/[0.06]' },
    red:   { text: 'text-accent-red',   bg: 'bg-accent-red/10',   glow: 'bg-accent-red/[0.06]' },
  }
  const c = colorMap[accent]
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${c.glow}`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 tracking-wider font-medium">{label}</p>
          <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center text-sm ${c.text}`}>
            {icon}
          </div>
        </div>
        <p className={`mt-3 text-4xl font-light num ${c.text}`}>
          {value}
          <span className="text-zinc-500 text-base ml-1.5 font-normal">{unit}</span>
        </p>
      </div>
    </div>
  )
}

/* ── 안전 분포 막대 차트 ── */
function SafetyDistribution({ safe, caution, danger }: { safe: number; caution: number; danger: number }) {
  const total = safe + caution + danger
  if (total === 0) {
    return (
      <div className="py-6 text-center">
        <span className="dot bg-accent-lime mb-2 inline-block" />
        <p className="text-sm text-zinc-400 mt-2">아직 검사 기록이 없어요</p>
      </div>
    )
  }
  const safePct = (safe / total) * 100
  const cautPct = (caution / total) * 100
  const dangPct = (danger / total) * 100

  return (
    <div className="space-y-4">
      <div className="flex h-3 rounded-full overflow-hidden bg-white/[0.04]">
        <div className="bg-accent-lime" style={{ width: `${safePct}%` }} />
        <div className="bg-accent-amber" style={{ width: `${cautPct}%` }} />
        <div className="bg-accent-red" style={{ width: `${dangPct}%` }} />
      </div>
      <div className="space-y-2">
        <DistRow color="lime"  label="안전" count={safe}    pct={safePct} />
        <DistRow color="amber" label="주의" count={caution} pct={cautPct} />
        <DistRow color="red"   label="위험" count={danger}  pct={dangPct} />
      </div>
    </div>
  )
}

function DistRow({ color, label, count, pct }: { color: 'lime' | 'amber' | 'red'; label: string; count: number; pct: number }) {
  const dotMap = { lime: 'bg-accent-lime', amber: 'bg-accent-amber', red: 'bg-accent-red' }
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <span className={`dot ${dotMap[color]}`} />
        <span className="text-zinc-400">{label}</span>
      </div>
      <div className="flex items-center gap-2 num">
        <span className="text-zinc-100 font-semibold">{count}</span>
        <span className="text-zinc-600 text-[10px]">{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}

function DataSource({ label, value, unit, desc }: { label: string; value: string; unit: string; desc: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">{label}</p>
      <p className="mt-2 text-2xl font-light text-zinc-100 num">
        {value}
        {unit && <span className="text-zinc-500 text-xs ml-1 font-normal">{unit}</span>}
      </p>
      <p className="text-xs text-zinc-500 mt-1">{desc}</p>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   모바일 컴포넌트 (기존 유지)
   ════════════════════════════════════════════════════════════ */

function OverviewMobile({
  drugs, sparkData, dangerCount, cautionCount, recentScans,
}: {
  drugs: DrugInfo[]
  sparkData: number[]
  dangerCount: number
  cautionCount: number
  recentScans: number
}) {
  return (
    <>
      <Link
        href="/scan"
        className="card block p-5 relative overflow-hidden active:scale-[0.99] transition-transform"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-500 tracking-wider font-medium">약 봉투 촬영</p>
            <p className="mt-3 text-3xl font-light">새 처방전 등록</p>
            <p className="text-sm text-zinc-400 mt-1">OCR · 자동 인식</p>
          </div>
          <span className="text-zinc-600">↗</span>
        </div>
        <div className="mt-5 -mb-1 h-12">
          <Sparkline data={sparkData} color="#a3e635" />
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <StatCard href="/food"    label="음식 검사" value={recentScans} unit="회" accent="sky" />
        <StatCard href="/my-meds" label="내 약"     value={drugs.length} unit="개" accent="lime" />
      </div>

      {(dangerCount > 0 || cautionCount > 0) ? (
        <WarningCard danger={dangerCount} caution={cautionCount} />
      ) : (
        <div className="card p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent-lime/10 flex items-center justify-center">
            <span className="text-lg text-accent-lime">✓</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-200">모두 안전</p>
            <p className="text-xs text-zinc-500 mt-0.5">활성화된 경고가 없습니다</p>
          </div>
        </div>
      )}
    </>
  )
}

function StatCard({
  href, label, value, unit, accent,
}: {
  href: string
  label: string
  value: number
  unit: string
  accent: 'sky' | 'lime' | 'amber'
}) {
  const accentColors = { sky: 'text-accent-sky', lime: 'text-accent-lime', amber: 'text-accent-amber' }
  return (
    <Link href={href} className="card block p-4 active:scale-[0.99] transition-transform">
      <p className="text-xs tracking-wider text-zinc-500 font-medium">{label}</p>
      <p className={`mt-3 text-3xl font-light num ${accentColors[accent]}`}>
        {value}
        <span className="text-zinc-500 text-base ml-1 font-normal">{unit}</span>
      </p>
    </Link>
  )
}

function WarningCard({ danger, caution }: { danger: number; caution: number }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent-red/[0.04] blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-wider text-zinc-500 font-medium">경고 알림</span>
            {danger > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-accent-red text-white rounded-full">
                {danger}
              </span>
            )}
          </div>
          <button className="text-zinc-600 text-sm">∧</button>
        </div>
        {danger > 0 && (
          <div className="mt-4 pl-3 border-l-2 border-accent-red">
            <p className="text-sm text-zinc-200 leading-snug">
              <span className="font-semibold text-accent-red">위험</span> 상호작용 {danger}건
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">최근 검사 결과를 확인해 주세요</p>
          </div>
        )}
        {caution > 0 && (
          <div className="mt-3 pl-3 border-l-2 border-accent-amber">
            <p className="text-sm text-zinc-200 leading-snug">
              <span className="font-semibold text-accent-amber">주의</span> 항목 {caution}건
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">의사·약사 상담을 권장합니다</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MedsTab({ drugs }: { drugs: DrugInfo[] }) {
  if (drugs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
          <span className="text-2xl">💊</span>
        </div>
        <p className="text-sm font-semibold text-zinc-200">등록된 약이 없어요</p>
        <p className="text-xs text-zinc-500 mt-1 mb-5">약 봉투를 촬영해 시작하세요</p>
        <Link href="/scan" className="inline-block px-5 py-2.5 bg-white text-ink-950 text-sm font-semibold rounded-xl">
          촬영 시작
        </Link>
      </div>
    )
  }
  return (
    <>
      {drugs.slice(0, 5).map((d, i) => (
        <div key={`${d.name}-${i}`} className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-sky/10 flex items-center justify-center text-accent-sky text-xs font-bold num">
            {String(i + 1).padStart(2, '0')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-100 truncate">{d.name}</p>
            <p className="text-xs text-zinc-500 truncate">
              {[d.dose, d.frequency, d.usage].filter(Boolean).join(' · ') || '복용 정보 없음'}
            </p>
          </div>
          <div className="dot bg-accent-lime" />
        </div>
      ))}
      <Link href="/my-meds" className="block text-center text-xs text-zinc-500 py-2 active:text-zinc-300">
        전체 보기 ({drugs.length}) →
      </Link>
    </>
  )
}

function FoodTab({ onCheck }: { onCheck: () => void }) {
  const quick = ['자몽', '우유', '알코올', '비타민C', '오메가3', '칼슘', '커피', '생강']
  return (
    <>
      <button onClick={onCheck} className="card w-full p-5 text-left active:scale-[0.99] transition-transform">
        <p className="text-xs text-zinc-500 tracking-wider font-medium">빠른 검사</p>
        <p className="mt-2 text-2xl font-light">음식 · 영양제 검색</p>
        <p className="text-sm text-zinc-500 mt-0.5">실시간 상호작용 분석</p>
      </button>
      <div className="flex flex-wrap gap-2">
        {quick.map(f => (
          <button key={f} onClick={onCheck} className="pill active:bg-white/[0.08]">{f}</button>
        ))}
      </div>
    </>
  )
}

function AlertsTab({ history, onClear }: { history: HistoryEntry[]; onClear: () => void }) {
  const verdictLabel = { danger: '위험', caution: '주의', safe: '안전' } as const
  if (history.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-white/[0.04] flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-zinc-200">알림이 없어요</p>
        <p className="text-xs text-zinc-500 mt-1">안전 검사를 실행하면 결과가 표시됩니다</p>
      </div>
    )
  }
  return (
    <>
      {/* 헤더 + 전체 삭제 */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-zinc-500 tracking-wider font-medium">
          검사 기록 · {history.length}건
        </p>
        <button
          onClick={onClear}
          className="text-[11px] text-accent-red bg-accent-red/10 px-2.5 py-1 rounded-full font-semibold"
        >
          전체 삭제
        </button>
      </div>
      {history.slice(0, 8).map((h) => {
        const color =
          h.result.verdict === 'danger'  ? 'red' :
          h.result.verdict === 'caution' ? 'amber' : 'lime'
        const colorMap = {
          red:   'border-accent-red bg-accent-red/[0.06]',
          amber: 'border-accent-amber bg-accent-amber/[0.06]',
          lime:  'border-accent-lime bg-accent-lime/[0.05]',
        }
        const dotMap = { red: 'bg-accent-red', amber: 'bg-accent-amber', lime: 'bg-accent-lime' }
        return (
          <div key={h.id} className={`card p-4 border-l-2 ${colorMap[color]}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`dot ${dotMap[color]}`} />
                <p className="text-xs tracking-wider text-zinc-500 font-medium">{verdictLabel[h.result.verdict]}</p>
              </div>
              <p className="text-xs text-zinc-500">
                {new Date(h.result.checkedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </p>
            </div>
            <p className="text-sm text-zinc-100 mt-2 truncate">{h.drugs.map(d => d.name).join(', ')}</p>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">× {h.foods.join(', ')}</p>
          </div>
        )
      })}
    </>
  )
}
