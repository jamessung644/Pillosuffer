'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DrugCard from '@/components/DrugCard'
import SaveSuccessOverlay from '@/components/SaveSuccessOverlay'
import Icon from '@/components/Icon'
import StepProgress from '@/components/StepProgress'
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
    setAddName(''); setAddDose(''); setAddFreq(''); setAddDays(''); setAddUsage('')
    setShowAddForm(false)
  }

  function handleSave() {
    if (!drugs.length) return
    const source: 'scan' | 'manual' = session?.rawText ? 'scan' : 'manual'
    addMedGroup(drugs, source, session?.scannedAt)
    sessionStorage.removeItem('scanSession')
    setShowSuccess(true)
    setTimeout(() => router.push('/'), 1500)
  }

  if (!loaded) return null

  const inputCls = 'px-3 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="page-padding flex flex-col min-h-screen bg-gray-50">
      <SaveSuccessOverlay show={showSuccess} message="약 정보가 저장되었어요" />

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-600">
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
            <DrugCard key={i} drug={drug} index={i} onUpdate={updateDrug} onDelete={deleteDrug} />
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
            <button onClick={addDrug} className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl text-lg font-bold active:bg-blue-700">추가</button>
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
          disabled={drugs.length === 0 || showSuccess}
          className="w-full py-5 bg-blue-600 text-white text-lg font-bold rounded-2xl active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          저장하고 다음으로
        </button>
        {drugs.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-3">약을 1개 이상 추가하면 저장할 수 있어요</p>
        )}
      </div>
    </div>
  )
}
