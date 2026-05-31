'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DrugCard from '@/components/DrugCard'
import BottomNav from '@/components/BottomNav'
import {
  getMedGroups,
  updateDrugInGroup,
  deleteDrugInGroup,
  deleteMedGroup,
  clearMedGroups,
  type MedGroup,
} from '@/lib/storage'
import type { DrugInfo } from '@/types'

/** 촬영 날짜 → 상대/절대 표기 */
function formatScanDate(iso: string): { relative: string; absolute: string } {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { relative: '날짜 미상', absolute: '' }
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000)
  let relative = ''
  if (diffDays <= 0) relative = '오늘'
  else if (diffDays === 1) relative = '어제'
  else if (diffDays === 2) relative = '그저께'
  else if (diffDays < 7) relative = `${diffDays}일 전`
  else if (diffDays < 30) relative = `${Math.floor(diffDays / 7)}주 전`
  else if (diffDays < 365) relative = `${Math.floor(diffDays / 30)}개월 전`
  const absolute = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  return { relative, absolute }
}

export default function MyMedsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<MedGroup[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setGroups(getMedGroups())
    setLoaded(true)
  }, [])

  const totalCount = groups.reduce((sum, g) => sum + g.drugs.length, 0)

  function handleUpdateDrug(groupId: string, index: number, drug: DrugInfo) {
    setGroups(updateDrugInGroup(groupId, index, drug))
  }

  function handleDeleteDrug(groupId: string, index: number) {
    if (!confirm('이 약품을 삭제할까요?')) return
    setGroups(deleteDrugInGroup(groupId, index))
  }

  function handleDeleteGroup(groupId: string, dateLabel: string) {
    if (!confirm(`${dateLabel}에 기록한 약 묶음을 모두 삭제할까요?`)) return
    setGroups(deleteMedGroup(groupId))
  }

  function handleClearAll() {
    if (!confirm('저장된 모든 약품을 삭제하시겠어요?')) return
    clearMedGroups()
    setGroups([])
  }

  if (!loaded) return null

  return (
    <div className="page-padding flex flex-col min-h-screen lg:max-w-4xl lg:mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/')}
          aria-label="뒤로"
          className="w-9 h-9 rounded-full glass flex items-center justify-center text-zinc-300 active:bg-white/[0.08]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-xs tracking-wider text-zinc-500 font-medium">보관함</p>
          <h1 className="text-lg font-semibold text-zinc-100">내 약 관리</h1>
        </div>
        {groups.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 text-[11px] text-accent-red bg-accent-red/10 rounded-full font-semibold"
          >
            전체 삭제
          </button>
        )}
      </div>

      {/* 통계 */}
      <div className="card p-5 mb-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-accent-sky/[0.05] blur-2xl" />
        <p className="text-xs tracking-wider text-zinc-500 font-medium">보관 중</p>
        <p className="mt-2 text-5xl font-light num">
          {totalCount}
          <span className="text-zinc-500 text-xl ml-2 font-normal">개</span>
        </p>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="dot bg-accent-lime" />
          <p className="text-xs text-zinc-500">
            {groups.length > 0 ? `${groups.length}회 촬영·기록 · 이 기기에 저장됨` : '이 기기에 안전하게 저장됨'}
          </p>
        </div>
      </div>

      {/* 빈 상태 */}
      {groups.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-4">
          <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center mb-5 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="w-12 h-12 object-contain opacity-60" />
          </div>
          <p className="text-base font-semibold text-zinc-100">등록된 약이 없어요</p>
          <p className="text-sm text-zinc-500 text-center mt-1.5 leading-relaxed">
            약 봉투를 촬영하면<br />
            촬영한 날짜와 함께 저장됩니다
          </p>
          <Link
            href="/scan"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-white text-ink-950 font-semibold rounded-2xl text-sm"
          >
            촬영 시작
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-6 mb-4">
            {groups.map((group) => {
              const { relative, absolute } = formatScanDate(group.scannedAt)
              const dateLabel = relative || absolute
              return (
                <section key={group.id}>
                  {/* 그룹(촬영 세션) 헤더 */}
                  <div className="flex items-center justify-between mb-2.5 px-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                          group.source === 'scan'
                            ? 'bg-accent-sky/15 text-accent-sky'
                            : 'bg-accent-amber/15 text-accent-amber'
                        }`}
                      >
                        {group.source === 'scan' ? '촬영' : '직접입력'}
                      </span>
                      <span className="text-sm font-semibold text-zinc-200 truncate">
                        {relative ? relative : absolute}
                      </span>
                      {relative && (
                        <span className="text-xs text-zinc-500 num flex-shrink-0">{absolute}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-zinc-500 num">{group.drugs.length}개</span>
                      <button
                        onClick={() => handleDeleteGroup(group.id, dateLabel)}
                        className="text-[11px] text-accent-red px-2 py-0.5 rounded-lg bg-accent-red/10 active:bg-accent-red/20 font-medium"
                      >
                        묶음 삭제
                      </button>
                    </div>
                  </div>

                  {/* 그룹 내 약품 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                    {group.drugs.map((drug, i) => (
                      <DrugCard
                        key={`${group.id}-${drug.name}-${i}`}
                        drug={drug}
                        index={i}
                        onUpdate={(idx, d) => handleUpdateDrug(group.id, idx, d)}
                        onDelete={(idx) => handleDeleteDrug(group.id, idx)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>

          <Link
            href="/scan"
            className="block w-full py-3.5 mt-2 border border-dashed border-white/[0.12] rounded-2xl text-zinc-400 font-medium text-center text-sm active:bg-white/[0.03]"
          >
            + 약 봉투 추가 촬영
          </Link>
        </>
      )}

      <BottomNav />
    </div>
  )
}
