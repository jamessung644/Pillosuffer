'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SafetyBadge, { VERDICT_CONFIG } from '@/components/SafetyBadge'
import SourceCitation from '@/components/SourceCitation'
import BottomNav from '@/components/BottomNav'
import { useAuth } from '@/components/AuthProvider'
import type { DrugInfo, SafetyResult, SafetyDetail, HistoryEntry, SafetyVerdict } from '@/types'

export default function ResultPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [result, setResult] = useState<SafetyResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'result' | 'history'>('result')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [dbStats, setDbStats] = useState<{ matchCount: number; edrugCount: number; searchedDrugs: number; searchedFoods: number } | null>(null)
  // 약 필터: 이번 스캔 약만 볼지, 전체 저장 약 볼지
  const [drugFilter, setDrugFilter] = useState<'session' | 'all'>('session')
  const [sessionDrugNames, setSessionDrugNames] = useState<string[]>([])
  const [hasBothSources, setHasBothSources] = useState(false)

  const fetchResult = useCallback(async () => {
    try {
      const foodsRaw = sessionStorage.getItem('foodList')
      if (!foodsRaw) { router.push('/food'); return }

      // 이번 스캔 약(session) + 저장 약(saved) 모두 로드
      const sessionDrugsRaw = sessionStorage.getItem('drugList')
      const savedDrugsRaw = localStorage.getItem('savedMedications')

      if (!sessionDrugsRaw && !savedDrugsRaw) { router.push('/scan'); return }

      const foods: string[] = JSON.parse(foodsRaw)
      let drugs: DrugInfo[] = []
      let sessionNames: string[] = []

      if (sessionDrugsRaw) {
        const sessionDrugs: DrugInfo[] = JSON.parse(sessionDrugsRaw)
        sessionNames = sessionDrugs.map(d => d.name)
        if (savedDrugsRaw) {
          const savedDrugs: DrugInfo[] = JSON.parse(savedDrugsRaw)
          // 저장 약 중 이번에 스캔하지 않은 것만 추가 (중복 제거)
          const extras = savedDrugs.filter(d => !sessionNames.includes(d.name))
          drugs = [...sessionDrugs, ...extras]
          setHasBothSources(extras.length > 0)
        } else {
          drugs = sessionDrugs
          setHasBothSources(false)
        }
      } else {
        // 저장 약만 있을 때 → 필터 불필요
        drugs = JSON.parse(savedDrugsRaw!)
        setHasBothSources(false)
      }

      setSessionDrugNames(sessionNames)

      if (!drugs.length) { router.push('/scan'); return }

      const mfdsRes = await fetch('/api/mfds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs, foods }),
      })
      const mfdsData = await mfdsRes.json()

      setDbStats({
        matchCount: mfdsData.matchCount ?? (mfdsData.contraindications?.length ?? 0),
        edrugCount: mfdsData.edrugInfo?.length ?? 0,
        searchedDrugs: mfdsData.searchedDrugs ?? drugs.length,
        searchedFoods: mfdsData.searchedFoods ?? foods.length,
      })

      const safetyRes = await fetch('/api/safety-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drugs,
          foods,
          mfdsContext: mfdsData.contraindications || [],
          edrugInfo: mfdsData.edrugInfo || [],
        }),
      })
      const safetyData: SafetyResult = await safetyRes.json()

      setResult(safetyData)

      const entry: HistoryEntry = {
        id: Date.now().toString(),
        drugs, foods,
        result: safetyData,
      }
      const historyRaw = localStorage.getItem('pillosuffer-history')
      const existing: HistoryEntry[] = historyRaw ? JSON.parse(historyRaw) : []
      const next = [entry, ...existing].slice(0, 10)
      localStorage.setItem('pillosuffer-history', JSON.stringify(next))
      setHistory(next)
    } catch (err) {
      console.error(err)
      setError('안전 확인 중 오류가 발생했어요')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (authLoading) return
    // 검증 결과는 로그인 필요 — 비로그인 시 로그인으로 (로그인 후 결과 복귀)
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent('/result')}`)
      return
    }
    fetchResult()
    const raw = localStorage.getItem('pillosuffer-history')
    if (raw) setHistory(JSON.parse(raw))
  }, [authLoading, user, fetchResult, router])

  // 필터 적용된 상세 목록
  const filteredDetails = useMemo((): SafetyDetail[] => {
    if (!result) return []
    const all = result.details ?? []
    if (drugFilter === 'all' || !hasBothSources || sessionDrugNames.length === 0) return all
    return all.filter(d =>
      sessionDrugNames.some(name =>
        d.drug.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(d.drug.toLowerCase())
      )
    )
  }, [result, drugFilter, hasBothSources, sessionDrugNames])

  // 필터된 결과 기준 종합 verdict
  const filteredVerdict = useMemo((): SafetyVerdict => {
    if (!filteredDetails.length) return result?.verdict ?? 'safe'
    const order = { safe: 0, caution: 1, danger: 2 } as const
    const max = filteredDetails.reduce(
      (m, d) => Math.max(m, order[d.verdict as keyof typeof order] ?? 0), 0
    )
    return max === 2 ? 'danger' : max === 1 ? 'caution' : 'safe'
  }, [filteredDetails, result?.verdict])

  if (loading) {
    return (
      <div className="page-padding flex flex-col items-center justify-center min-h-screen gap-8">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
          <div className="absolute inset-0 rounded-full border-2 border-accent-sky border-t-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full bg-accent-sky/10 backdrop-blur-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-accent-sky" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs tracking-widest text-zinc-500 font-medium">AI 분석</p>
          <p className="text-lg font-light text-zinc-100 mt-2">상호작용 검사 중…</p>
          <p className="text-xs text-zinc-500 mt-1">DrugBank 6.0 · Gemini LLM</p>
        </div>
        <div className="w-full space-y-2 max-w-xs">
          {['상호작용 DB 조회 중', 'AI 추론 중', '결과 생성 중'].map((text, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="dot bg-accent-sky animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
              <p className="text-xs text-zinc-400">{text}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-padding flex flex-col items-center justify-center min-h-screen gap-6">
        <div className="w-16 h-16 rounded-2xl bg-accent-red/10 flex items-center justify-center">
          <span className="text-3xl">⨯</span>
        </div>
        <div className="text-center">
          <p className="font-semibold text-zinc-100">{error}</p>
        </div>
        <button
          onClick={() => { setLoading(true); setError(null); fetchResult() }}
          className="btn-primary max-w-xs"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="page-padding flex flex-col min-h-screen lg:max-w-3xl lg:mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs tracking-wider text-zinc-500 font-medium">단계 04 / 04</p>
          <h1 className="text-lg font-semibold text-zinc-100">안전 안내</h1>
        </div>
        <span className="pill">
          <span className="dot bg-accent-sky" />
          AI · DrugBank
        </span>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5">
        {(['result', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pill ${tab === t ? 'pill-active' : ''}`}
          >
            {t === 'result' ? '이번 결과' : '이전 기록'}
          </button>
        ))}
      </div>

      {tab === 'result' && result && (
        <div className="space-y-3">
          <SafetyBadge verdict={filteredVerdict} size="lg" />

          {/* DB 검색 통계 */}
          {dbStats && (
            <div className="card p-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                {/* e약은요 */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`dot ${dbStats.edrugCount > 0 ? 'bg-accent-sky' : 'bg-zinc-600'}`} />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">e약은요</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-light num ${dbStats.edrugCount > 0 ? 'text-accent-sky' : 'text-zinc-600'}`}>
                      {dbStats.edrugCount}
                    </span>
                    <span className="text-[10px] text-zinc-500">약품 매칭</span>
                  </div>
                </div>
                {/* DrugBank */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`dot ${dbStats.matchCount > 0 ? 'bg-accent-lime' : 'bg-zinc-600'}`} />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">DrugBank</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-light num ${dbStats.matchCount > 0 ? 'text-accent-lime' : 'text-zinc-600'}`}>
                      {dbStats.matchCount}
                    </span>
                    <span className="text-[10px] text-zinc-500">상호작용</span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-white/[0.04]">
                약품 {dbStats.searchedDrugs}개 × 음식 {dbStats.searchedFoods}개 조합 분석
              </div>
              {dbStats.matchCount === 0 && dbStats.edrugCount === 0 && (
                <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                  💡 DB에 해당 약물·음식 조합 데이터가 없어 AI가 일반 의학 지식으로 안내합니다
                </p>
              )}
            </div>
          )}

          <div>
            {/* 약 필터 버튼 — 이번 스캔 약 vs 전체 저장 약 */}
            {hasBothSources && (
              <div className="flex items-center gap-2 mb-3 mt-4">
                <button
                  onClick={() => setDrugFilter('session')}
                  className={`pill text-xs ${drugFilter === 'session' ? 'pill-active' : ''}`}
                >
                  이번 검색 약만
                </button>
                <button
                  onClick={() => setDrugFilter('all')}
                  className={`pill text-xs ${drugFilter === 'all' ? 'pill-active' : ''}`}
                >
                  내 약 모두
                </button>
                <span className="text-[10px] text-zinc-500 ml-auto">
                  {filteredDetails.length}건
                </span>
              </div>
            )}
            <p className="text-xs tracking-wider text-zinc-500 font-medium mb-2 mt-4">상세 결과</p>
            <div className="space-y-2.5">
              {filteredDetails.map((detail: SafetyDetail, i: number) => {
                const v = (['safe','caution','danger'] as const).includes(detail.verdict as 'safe' | 'caution' | 'danger') ? detail.verdict : 'caution'
                const cfg = VERDICT_CONFIG[v]
                return (
                  <div key={i} className={`card p-4 border-l-2 ${cfg.border}`}>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="min-w-0">
                        <p className="text-xs tracking-wider text-zinc-500 font-medium">{detail.drug}</p>
                        <p className="font-semibold text-sm text-zinc-100 mt-0.5">× {detail.food}</p>
                      </div>
                      <SafetyBadge verdict={detail.verdict} size="sm" />
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{detail.reason}</p>
                    <SourceCitation source={detail.source} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* 주의 항목 발견 시 CTA */}
          {filteredVerdict === 'danger' && (
            <div className="card p-4 border border-accent-red/30 bg-accent-red/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <span className="dot bg-accent-red relative pulse-dot" />
                <p className="text-xs tracking-wider text-accent-red font-semibold">긴급 경고</p>
              </div>
              <p className="text-sm text-zinc-100 mb-1">위험한 조합이 감지되었어요</p>
              <p className="text-xs text-zinc-400 mb-3">반드시 약사 또는 의사에게 확인하세요</p>
              <a
                href="tel:1399"
                className="block w-full py-3 bg-accent-red text-white text-center rounded-xl text-sm font-semibold"
              >
                1399 약사 상담 전화
              </a>
            </div>
          )}

          {/* 면책 */}
          <div className="card p-4">
            <p className="text-xs text-zinc-500 leading-relaxed">{result.disclaimer}</p>
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/[0.04]">
              <span className="dot bg-accent-sky" />
              <p className="text-xs tracking-wider text-zinc-600 font-medium">
                Gemini LLM · DrugBank 6.0 · 식약처 DB
              </p>
            </div>
          </div>

          <Link href="/scan" className="btn-secondary block text-center mt-2">
            새 검사 시작
          </Link>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2.5">
          {history.length === 0 ? (
            <div className="card p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <svg className="w-5 h-5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="text-sm text-zinc-400">아직 검사 기록이 없어요</p>
            </div>
          ) : (
            history.map((entry: HistoryEntry) => {
              const ev = (['safe','caution','danger'] as const).includes(entry.result.verdict as 'safe' | 'caution' | 'danger') ? entry.result.verdict : 'caution'
              const cfg = VERDICT_CONFIG[ev]
              return (
                <div key={entry.id} className={`card p-4 border-l-2 ${cfg.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <SafetyBadge verdict={entry.result.verdict} size="sm" />
                    <p className="text-[10px] text-zinc-500 tracking-wider">
                      {new Date(entry.result.checkedAt).toLocaleDateString('ko-KR', {
                        month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-100 truncate">
                    {entry.drugs.map(d => d.name).join(', ')}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    × {entry.foods.join(', ')}
                  </p>
                </div>
              )
            })
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
