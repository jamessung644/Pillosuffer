'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DrugCard from '@/components/DrugCard'
import BottomNav from '@/components/BottomNav'
import SaveSuccessOverlay from '@/components/SaveSuccessOverlay'
import { addMedGroup } from '@/lib/storage'
import type { DrugInfo, ScanSession } from '@/types'

export default function DrugsPage() {
  const router = useRouter()
  const [drugs, setDrugs] = useState<DrugInfo[]>([])
  const [session, setSession] = useState<ScanSession | null>(null)
  const [addName, setAddName] = useState('')
  const [addDose, setAddDose] = useState('')
  const [addFreq, setAddFreq] = useState('')
  const [addDays, setAddDays] = useState('')
  const [addUsage, setAddUsage] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('scanSession')
    if (raw) {
      const parsed: ScanSession = JSON.parse(raw)
      setSession(parsed)
      setDrugs(parsed.drugs)
    }
    setLoaded(true)
  }, [])

  function updateDrug(index: number, drug: DrugInfo) {
    setDrugs(prev => prev.map((d, i) => (i === index ? drug : d)))
  }

  function deleteDrug(index: number) {
    setDrugs(prev => prev.filter((_, i) => i !== index))
  }

  function addDrug() {
    if (!addName.trim()) return
    setDrugs(prev => [...prev, {
      name: addName.trim(),
      dose: addDose.trim() || undefined,
      frequency: addFreq.trim() || undefined,
      days: addDays.trim() || undefined,
      usage: addUsage.trim() || undefined,
    }])
    setAddName('')
    setAddDose('')
    setAddFreq('')
    setAddDays('')
    setAddUsage('')
    setShowAddForm(false)
  }

  function handleSave() {
    if (!drugs.length) return

    // 촬영 세션 단위 그룹으로 저장 (촬영 날짜 + 함께 기록된 약물 묶음)
    const source: 'scan' | 'manual' = session?.rawText ? 'scan' : 'manual'
    addMedGroup(drugs, source, session?.scannedAt)

    // 임시 세션 정리
    sessionStorage.removeItem('scanSession')

    // 성공 애니메이션 표시 후 메인 페이지로
    setShowSuccess(true)
    setTimeout(() => router.push('/'), 1800)
  }

  if (!loaded) return null

  return (
    <div className="page-padding flex flex-col min-h-screen">
      <SaveSuccessOverlay show={showSuccess} message="약 정보가 저장되었어요" />

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-600 text-lg">
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">인식된 약품 확인</h1>
          <p className="text-sm text-gray-400">정보를 확인하고 저장해 주세요</p>
        </div>
      </div>

      {/* 안내 배너 */}
      <div className="card p-3 mb-5 flex items-center gap-3 bg-blue-50 border-blue-100">
        <span className="text-xl">✅</span>
        <p className="text-sm text-blue-700">
          개인정보가 제거된 약품 정보입니다. 잘못된 항목은 수정·삭제 후 저장하세요.
        </p>
      </div>

      {/* 약품 목록 */}
      <div className="space-y-3 mb-6">
        {drugs.length === 0 ? (
          <div className="card p-8 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">🔍</span>
            <div>
              <p className="font-semibold text-gray-700 text-base">인식된 약품이 없습니다</p>
              <p className="text-sm text-gray-400 mt-1">아래 버튼으로 직접 추가해 주세요.</p>
            </div>
          </div>
        ) : (
          drugs.map((drug, i) => (
            <DrugCard key={i} drug={drug} index={i} onUpdate={updateDrug} onDelete={deleteDrug} />
          ))
        )}
      </div>

      {/* 약품 추가 */}
      {showAddForm ? (
        <div className="card p-4 mb-6 space-y-3">
          <p className="text-sm font-semibold text-gray-700">약품 추가</p>
          <input
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="약품명 (필수)"
            value={addName}
            onChange={e => setAddName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="함량 (예: 500mg)"
              value={addDose}
              onChange={e => setAddDose(e.target.value)}
            />
            <input
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="투여횟수 (예: 1일 3회)"
              value={addFreq}
              onChange={e => setAddFreq(e.target.value)}
            />
            <input
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="투약 일수 (예: 3일)"
              value={addDays}
              onChange={e => setAddDays(e.target.value)}
            />
            <input
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="용법 (예: 식후 30분)"
              value={addUsage}
              onChange={e => setAddUsage(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={addDrug} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium">
              추가
            </button>
            <button onClick={() => setShowAddForm(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm mb-6"
        >
          + 약품 직접 추가
        </button>
      )}

      {/* 저장 버튼 */}
      <div className="mt-auto">
        <button
          onClick={handleSave}
          disabled={drugs.length === 0 || showSuccess}
          className="w-full py-5 bg-blue-600 text-white text-lg font-bold rounded-2xl active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          💾 저장하기
        </button>
        {drugs.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-3">약품을 1개 이상 추가하면 저장할 수 있어요</p>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
