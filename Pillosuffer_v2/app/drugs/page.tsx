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

  return (
    <div className="page-padding flex flex-col min-h-screen lg:max-w-4xl lg:mx-auto">
      <SaveSuccessOverlay show={showSuccess} message="약 정보가 저장되었어요" />

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          aria-label="뒤로"
          className="w-9 h-9 rounded-full glass flex items-center justify-center text-zinc-300 active:bg-white/[0.08]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-xs tracking-wider text-zinc-500 font-medium">단계 02 / 04</p>
          <h1 className="text-lg font-semibold text-zinc-100">인식된 약품</h1>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-white/[0.06] text-xs font-medium text-zinc-300 num">
          {drugs.length}
        </div>
      </div>

      {/* 안내 */}
      <div className="card p-3 mb-5 flex items-center gap-3">
        <span className="dot bg-accent-lime" />
        <p className="text-xs text-zinc-400 leading-relaxed">
          개인정보가 제거된 결과입니다. 잘못된 항목은 수정·삭제하세요.
        </p>
      </div>

      {/* 약품 목록 */}
      <div className="space-y-2.5 mb-5">
        {drugs.length === 0 ? (
          <div className="card p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              <svg className="w-5 h-5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-zinc-200 text-sm">인식된 약품이 없어요</p>
              <p className="text-xs text-zinc-500 mt-1">아래 버튼으로 직접 추가하세요</p>
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
        <div className="card p-4 mb-5 space-y-3">
          <p className="text-xs tracking-wider text-zinc-500 font-medium">직접 추가</p>
          <input
            className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-accent-sky/50"
            placeholder="약품명 (필수)"
            value={addName}
            onChange={e => setAddName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: addDose,  set: setAddDose,  ph: '500mg' },
              { v: addFreq,  set: setAddFreq,  ph: '1일 3회' },
              { v: addDays,  set: setAddDays,  ph: '3일' },
              { v: addUsage, set: setAddUsage, ph: '식후 30분' },
            ].map((f, i) => (
              <input
                key={i}
                className="px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-accent-sky/50"
                placeholder={f.ph}
                value={f.v}
                onChange={e => f.set(e.target.value)}
              />
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={addDrug} className="flex-1 py-2.5 bg-white text-ink-950 rounded-xl text-sm font-semibold">
              추가
            </button>
            <button onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 bg-white/[0.06] text-zinc-300 rounded-xl text-sm font-medium border border-white/[0.06]">
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border border-dashed border-white/[0.12] rounded-2xl text-zinc-500 text-sm mb-5 active:bg-white/[0.03]"
        >
          + 직접 추가
        </button>
      )}

      {/* 저장 */}
      <div className="mt-auto">
        <button
          onClick={handleSave}
          disabled={drugs.length === 0 || showSuccess}
          className="btn-primary"
        >
          저장하기{drugs.length > 0 && ` · ${drugs.length}건`}
        </button>
        {drugs.length === 0 && (
          <p className="text-center text-xs text-zinc-500 mt-2">약품을 1개 이상 추가하면 저장할 수 있어요</p>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
