'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SafetyBadge, { VERDICT_CONFIG } from '@/components/SafetyBadge'
import SourceCitation from '@/components/SourceCitation'
import StepProgress from '@/components/StepProgress'
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
      if (!foodsRaw) {
        router.push('/food')
        return
      }

      // 이번 스캔 약(session) + 저장 약(saved) 모두 로드해 분석, 필터로 표시 구분
      const sessionDrugsRaw = sessionStorage.getItem('drugList')
      const savedDrugsRaw = localStorage.getItem('savedMedications')

      if (!sessionDrugsRaw && !savedDrugsRaw) {
        router.push('/scan')
        return
      }

      const foods: string[] = JSON.parse(foodsRaw)
      let drugs: DrugInfo[] = []
      let sessionNames: string[] = []

      // 음식 페이지에서 직접 선택한 약이 있으면 그 약만 분석
      const selectedRaw = sessionStorage.getItem('selectedDrugs')
      const selected: DrugInfo[] = selectedRaw ? JSON.parse(selectedRaw) : []

      if (selected.length) {
        drugs = selected
        sessionNames = selected.map(d => d.name)
        setHasBothSources(false)
      } else if (sessionDrugsRaw) {
        const sessionDrugs: DrugInfo[] = JSON.parse(sessionDrugsRaw)
        sessionNames = sessionDrugs.map(d => d.name)
        if (savedDrugsRaw) {
          const savedDrugs: DrugInfo[] = JSON.parse(savedDrugsRaw)
          const extras = savedDrugs.filter(d => !sessionNames.includes(d.name))
          drugs = [...sessionDrugs, ...extras]
          setHasBothSources(extras.length > 0)
        } else {
          drugs = sessionDrugs
          setHasBothSources(false)
        }
      } else {
        drugs = JSON.parse(savedDrugsRaw!)
        setHasBothSources(false)
      }

      setSessionDrugNames(sessionNames)

      if (!drugs.length) {
        router.push('/scan')
        return
      }

      // 1. DrugBank DB 검색 (약품 + 음식 조합으로 상호작용 조회)
      const mfdsRes = await fetch('/api/mfds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs, foods }),
      })
      const mfdsData = await mfdsRes.json()

      // 검색 통계 저장 (DB 매칭 여부 표시용)
      setDbStats({
        matchCount: mfdsData.matchCount ?? (mfdsData.contraindications?.length ?? 0),
        edrugCount: mfdsData.edrugInfo?.length ?? 0,
        searchedDrugs: mfdsData.searchedDrugs ?? drugs.length,
        searchedFoods: mfdsData.searchedFoods ?? foods.length,
      })

      // 2. AI 안전 확인
      const safetyRes = await fetch('/api/safety-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drugs,
          foods,
          mfdsContext: mfdsData.contraindications || [],
          edrugInfo: mfdsData.edrugInfo || [],
          drugProfiles: mfdsData.drugProfiles || [],
        }),
      })
      const safetyData: SafetyResult = await safetyRes.json()

      setResult(safetyData)

      // 히스토리 저장
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        drugs,
        foods,
        result: safetyData,
      }
      const historyRaw = localStorage.getItem('pillosuffer-history')
      const existingHistory: HistoryEntry[] = historyRaw ? JSON.parse(historyRaw) : []
      const newHistory = [entry, ...existingHistory].slice(0, 10)
      localStorage.setItem('pillosuffer-history', JSON.stringify(newHistory))
      setHistory(newHistory)
    } catch (err) {
      console.error(err)
      setError('안전 확인 중 오류가 발생했습니다. 다시 시도해 주세요.')
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
    const historyRaw = localStorage.getItem('pillosuffer-history')
    if (historyRaw) setHistory(JSON.parse(historyRaw))
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
      <div className="page-padding flex flex-col items-center justify-center min-h-screen gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🔍</div>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-800">AI 안전 확인 중...</p>
          <p className="text-base text-gray-500 mt-1">DrugBank DB를 기반으로 분석하고 있습니다</p>
        </div>
        <div className="w-full space-y-2">
          {['DrugBank DB 검색 중...', 'AI 분석 중...', '결과 생성 중...'].map((text, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              <p className="text-sm text-gray-400">{text}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-padding flex flex-col items-center justify-center min-h-screen gap-6">
        <span className="text-5xl">😵</span>
        <div className="text-center">
          <p className="font-semibold text-gray-800">{error}</p>
        </div>
        <button onClick={() => { setLoading(true); setError(null); fetchResult() }} className="btn-primary">
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="page-padding flex flex-col min-h-screen">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">검사 결과</h1>
          <p className="text-base text-gray-500 font-medium">4단계 / 4단계</p>
        </div>
        <span className="text-sm text-gray-400 px-3 py-1.5 bg-gray-100 rounded-lg">
          🤖 AI 참고 정보
        </span>
      </div>

      <div className="mb-6"><StepProgress step={4} /></div>

      {/* 탭 */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
        {(['result', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3.5 rounded-xl text-lg font-bold transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t === 'result' ? '📋 이번 결과' : '🕐 이전 기록'}
          </button>
        ))}
      </div>

      {tab === 'result' && result && (
        <div className="space-y-4">
          {/* 종합 안내 */}
          <SafetyBadge verdict={filteredVerdict} size="lg" />

          {/* DB 검색 통계 */}
          {dbStats && (
            <div className="card p-3 bg-gray-50 border border-gray-200">
              <div className="grid grid-cols-2 gap-3">
                {/* e약은요 */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${dbStats.edrugCount > 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-600">e약은요</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold tabular-nums ${dbStats.edrugCount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {dbStats.edrugCount}
                    </span>
                    <span className="text-[10px] text-gray-500">약품 매칭</span>
                  </div>
                </div>
                {/* DrugBank */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${dbStats.matchCount > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-600">DrugBank</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold tabular-nums ${dbStats.matchCount > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {dbStats.matchCount}
                    </span>
                    <span className="text-[10px] text-gray-500">상호작용</span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-200">
                약품 {dbStats.searchedDrugs}개 × 음식 {dbStats.searchedFoods}개 조합 분석
              </div>
              {dbStats.matchCount === 0 && dbStats.edrugCount === 0 && (
                <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                  💡 DB에 해당 약물·음식 조합 데이터가 없어 AI가 일반 의학 지식으로 안내합니다
                </p>
              )}
            </div>
          )}

          {/* 상세 결과 */}
          <div className="space-y-3">
            {/* 약 필터 버튼 */}
            {hasBothSources && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDrugFilter('session')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                    drugFilter === 'session'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  이번 검색 약만
                </button>
                <button
                  onClick={() => setDrugFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                    drugFilter === 'all'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  내 약 모두
                </button>
                <span className="text-[10px] text-gray-400 ml-auto">{filteredDetails.length}건</span>
              </div>
            )}
            <p className="text-lg font-bold text-gray-800">항목별 안내</p>
            {filteredDetails.map((detail: SafetyDetail, i: number) => {
              const v = (['safe','caution','danger'] as const).includes(detail.verdict as 'safe' | 'caution' | 'danger') ? detail.verdict : 'caution'
              const cfg = VERDICT_CONFIG[v]
              return (
                <div
                  key={i}
                  className={`relative rounded-2xl overflow-hidden border ${cfg.border} ${cfg.cardBg}`}
                >
                  {/* 좌측 컬러 바 */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${cfg.leftBar}`} />

                  <div className="p-4 pl-5">
                    {/* 상단: 아이콘 + 약품/음식 + 배지 */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <span className={`${cfg.iconText} text-2xl font-bold`}>{cfg.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-500 font-medium">{detail.drug}</p>
                        <p className={`font-bold text-lg ${cfg.textStrong}`}>× {detail.food}</p>
                      </div>
                      <SafetyBadge verdict={detail.verdict} size="sm" />
                    </div>

                    {/* 본문 — 좌측 들여쓰기로 아이콘과 정렬 */}
                    <p className="text-base text-gray-700 leading-relaxed pl-[60px] -mt-2">
                      {detail.reason}
                    </p>

                    <div className="pl-[60px] mt-2">
                      <SourceCitation source={detail.source} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 주의 항목 발견 시 CTA */}
          {filteredVerdict === 'danger' && (
            <div className="card p-4 bg-red-50 border-red-200">
              <p className="text-lg font-bold text-red-700 mb-2">⚠️ 위험 조합 감지됨</p>
              <p className="text-base text-red-600 mb-3">반드시 약사 또는 의사에게 확인하세요.</p>
              <a
                href="tel:1399"
                className="block w-full py-4 bg-red-600 text-white text-center rounded-xl text-lg font-bold"
              >
                📞 약사 상담 전화 (1399)
              </a>
            </div>
          )}

          {/* 면책 조항 */}
          <div className="card p-4 bg-gray-50 border-gray-100">
            <p className="text-sm text-gray-500 leading-relaxed">{result.disclaimer}</p>
            <p className="text-sm text-gray-400 mt-2">🤖 LLM AI · DrugBank 6.0 · 식품의약품안전처 DB 활용</p>
          </div>

          {/* 다시 검사 */}
          <Link href="/scan" className="btn-primary block text-center">
            새로 검사하기
          </Link>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="card p-8 flex flex-col items-center gap-3 text-center">
              <span className="text-4xl">🕐</span>
              <p className="text-sm text-gray-500">이전 검사 기록이 없습니다.</p>
            </div>
          ) : (
            history.map((entry: HistoryEntry) => {
              const cfg = VERDICT_CONFIG[entry.result.verdict]
              return (
                <div key={entry.id} className={`card p-4 border ${cfg.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <SafetyBadge verdict={entry.result.verdict} size="sm" />
                    <p className="text-xs text-gray-300">
                      {new Date(entry.result.checkedAt).toLocaleDateString('ko-KR', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">
                    💊 {entry.drugs.map(d => d.name).join(', ')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    🍎 {entry.foods.join(', ')}
                  </p>
                </div>
              )
            })
          )}
        </div>
      )}

    </div>
  )
}
