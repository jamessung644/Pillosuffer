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
import Logo from '@/components/Logo'
import Icon from '@/components/Icon'

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
    <div className="page-padding flex flex-col min-h-screen">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/')}
          className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-600"
        >
          <Icon name="arrowLeft" size={22} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">내 약 관리</h1>
          <p className="text-base text-gray-500 font-medium">
            {groups.length > 0
              ? `저장된 약 ${totalCount}개 · ${groups.length}회 기록`
              : '저장된 약이 없어요'}
          </p>
        </div>
        {groups.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-4 py-2 text-sm font-semibold text-red-500 bg-red-50 rounded-xl"
          >
            전체 삭제
          </button>
        )}
      </div>

      {/* 빈 상태 */}
      {groups.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-12">
          <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-5">
            <Logo size={56} />
          </div>
          <p className="text-xl font-bold text-gray-800 text-center">저장된 약이 없어요</p>
          <p className="text-base text-gray-500 text-center mt-2 leading-relaxed">
            약 봉투를 촬영하면<br />
            촬영한 날짜와 함께 저장됩니다
          </p>
          <Link
            href="/scan"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-2xl shadow-md active:bg-blue-700"
          >
            <span className="text-xl">📷</span>
            약봉투 촬영하기
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-5 mb-6">
            {groups.map((group) => {
              const { relative, absolute } = formatScanDate(group.scannedAt)
              const dateLabel = relative || absolute
              return (
                <section key={group.id}>
                  {/* 그룹(촬영 세션) 헤더 */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-sm px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                          group.source === 'scan'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}
                      >
                        {group.source === 'scan' ? '📷 촬영' : '✍️ 직접입력'}
                      </span>
                      <span className="text-base font-bold text-gray-800 truncate">
                        {relative ? relative : absolute}
                      </span>
                      {relative && (
                        <span className="text-sm text-gray-400 flex-shrink-0">{absolute}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-gray-500">{group.drugs.length}개</span>
                      <button
                        onClick={() => handleDeleteGroup(group.id, dateLabel)}
                        className="text-sm text-red-400 px-2.5 py-1 rounded-lg bg-red-50 active:bg-red-100 font-medium"
                      >
                        묶음 삭제
                      </button>
                    </div>
                  </div>

                  {/* 그룹 내 약품 */}
                  <div className="space-y-3">
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

          {/* 약 추가 버튼 */}
          <div className="space-y-3 mt-2">
            <Link
              href="/scan"
              className="block w-full py-4 bg-blue-600 text-white rounded-2xl text-lg font-bold text-center active:bg-blue-700 transition-colors"
            >
              약 봉투 추가로 찍기
            </Link>
            <Link
              href="/manual"
              className="block w-full py-4 bg-white border-2 border-blue-500 text-blue-600 rounded-2xl text-lg font-bold text-center active:bg-blue-50 transition-colors"
            >
              약 이름 직접 추가하기
            </Link>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
