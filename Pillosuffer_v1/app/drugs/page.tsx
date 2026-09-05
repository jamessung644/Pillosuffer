'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DrugCard from '@/components/DrugCard'
import SaveSuccessOverlay from '@/components/SaveSuccessOverlay'
import Icon from '@/components/Icon'
import StepProgress from '@/components/StepProgress'
import { addMedGroup } from '@/lib/storage'
import { readScanSession } from '@/lib/validation'
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
  const [editingCount, setEditingCount] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)
  const handleEditingChange = useCallback((editing: boolean) => setEditingCount(count => count + (editing ? 1 : -1)), [])

  useEffect(() => {
    const parsed = readScanSession(sessionStorage.getItem('scanSession'))
    if (parsed) {
      setSession(parsed)
      setDrugs(parsed.drugs)
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded || showSuccess) return
    sessionStorage.setItem('scanSession', JSON.stringify({ ...session, rawText: session?.rawText ?? '', maskedText: session?.maskedText ?? '', drugs }))
  }, [drugs, loaded, session, showSuccess])

  useEffect(() => {
    if (!showSuccess) return
    const timer = setTimeout(() => router.push('/food'), 1000)
    return () => clearTimeout(timer)
  }, [showSuccess, router])

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
    setAddName(''); setAddDose(''); setAddFreq(''); setAddDays(''); setAddUsage('')
    setShowAddForm(false)
  }

  function handleSave() {
    if (!drugs.length || editingCount > 0 || showSuccess) return
    try {
      const source: 'scan' | 'manual' = session?.rawText ? 'scan' : 'manual'
      sessionStorage.setItem('selectedDrugs', JSON.stringify(drugs))
      addMedGroup(drugs, source, session?.scannedAt)
      sessionStorage.removeItem('scanSession')
      setShowSuccess(true)
    } catch {
      setSaveError('약 정보를 저장하지 못했습니다. 기기의 저장 공간과 브라우저 설정을 확인해 주세요.')
    }
  }

  if (!loaded) return null

  const inputCls = 'w-full min-w-0 px-3 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="page-padding flex flex-col min-h-screen bg-gray-50">
      <SaveSuccessOverlay show={showSuccess} message="약 정보가 저장되었어요" description="이제 함께 먹을 음식을 선택해 주세요" />

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button aria-label="뒤로 가기" onClick={() => router.back()} className="w-11 h-11 shrink-0 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-600">
          <Icon name="arrowLeft" size={22} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">약 정보 확인</h1>
          <p className="text-base text-gray-500 font-medium">2단계 / 4단계</p>
        </div>
      </div>

      <div className="mb-7"><StepProgress step={2} /></div>

      {/* 안내 (체크) */}
      <div className="flex items-start gap-3 rounded-2xl p-4 mb-5 bg-blue-50">
        <span className="text-green-500 flex-shrink-0 mt-0.5"><Icon name="check" size={22} /></span>
        <p className="text-base text-blue-800 leading-relaxed font-medium">약 이름과 복용법이 맞는지 확인해 주세요. 틀리면 수정할 수 있습니다.</p>
      </div>

      {/* 약 목록 */}
      <div className="space-y-3 mb-5">
        {drugs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><Icon name="search" size={26} /></div>
            <div>
              <p className="font-bold text-gray-800 text-lg">등록된 약이 없어요</p>
              <p className="text-base text-gray-500 mt-1">아래에서 직접 추가해 주세요.</p>
            </div>
          </div>
        ) : (
          drugs.map((drug, i) => (
            <DrugCard key={`${i}-${drug.name}`} drug={drug} index={i} onUpdate={updateDrug} onDelete={deleteDrug} onEditingChange={handleEditingChange} />
          ))
        )}
      </div>

      {/* 약 추가 */}
      {showAddForm ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 space-y-3">
          <p className="text-lg font-bold text-gray-800">약 추가</p>
          <input className={`w-full ${inputCls}`} placeholder="약 이름 (필수)" value={addName} onChange={e => setAddName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} placeholder="용량 (예: 500mg)" value={addDose} onChange={e => setAddDose(e.target.value)} />
            <input className={inputCls} placeholder="하루 몇 번 (예: 1일 3회)" value={addFreq} onChange={e => setAddFreq(e.target.value)} />
            <input className={inputCls} placeholder="며칠 동안 (예: 3일)" value={addDays} onChange={e => setAddDays(e.target.value)} />
            <input className={inputCls} placeholder="언제 먹나요 (예: 식후 30분)" value={addUsage} onChange={e => setAddUsage(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={addDrug} disabled={!addName.trim()} className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl text-lg font-bold active:bg-blue-700 disabled:opacity-50">추가</button>
            <button onClick={() => setShowAddForm(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl text-lg font-bold">취소</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-4 bg-white border-2 border-blue-500 text-blue-600 rounded-2xl text-lg font-bold mb-5 active:bg-blue-50 transition-colors"
        >
          + 약 더 추가하기
        </button>
      )}

      {/* 저장 */}
      <div className="mt-auto">
        <button
          onClick={handleSave}
          disabled={drugs.length === 0 || showSuccess || editingCount > 0}
          className="w-full py-5 bg-blue-600 text-white text-lg font-bold rounded-2xl active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          저장하고 다음으로
        </button>
        {editingCount > 0 && <p role="status" className="text-center text-sm text-gray-600 mt-3">수정 중인 약 정보를 먼저 저장해 주세요</p>}
        {saveError && <p role="alert" className="text-sm text-red-700 mt-3">{saveError}</p>}
        {drugs.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-3">약을 1개 이상 추가하면 저장할 수 있어요</p>
        )}
      </div>
    </div>
  )
}
