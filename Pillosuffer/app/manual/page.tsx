'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/Icon'
import StepProgress from '@/components/StepProgress'
import type { ScanSession, DrugInfo } from '@/types'

export default function ManualPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [freq, setFreq] = useState('')
  const [days, setDays] = useState('')
  const [usage, setUsage] = useState('')

  function add() {
    if (!name.trim()) {
      alert('약 이름을 입력해 주세요.')
      return
    }
    const drug: DrugInfo = {
      name: name.trim(),
      dose: dose.trim() || undefined,
      frequency: freq.trim() || undefined,
      days: days.trim() || undefined,
      usage: usage.trim() || undefined,
    }
    const raw = sessionStorage.getItem('scanSession')
    const session: ScanSession = raw
      ? JSON.parse(raw)
      : { rawText: '', maskedText: '', drugs: [], scannedAt: new Date().toISOString() }
    session.drugs = [...(session.drugs || []), drug]
    if (!session.scannedAt) session.scannedAt = new Date().toISOString()
    sessionStorage.setItem('scanSession', JSON.stringify(session))
    router.push('/drugs')
  }

  return (
    <div className="page-padding flex flex-col min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-600">
          <Icon name="arrowLeft" size={22} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">약 이름 직접 입력</h1>
          <p className="text-base text-gray-500 font-medium">1단계 / 4단계</p>
        </div>
      </div>

      <div className="mb-7"><StepProgress step={1} /></div>

      {/* 안내 카드 */}
      <div className="flex items-start gap-3 rounded-2xl p-4 mb-6 bg-white border border-gray-100">
        <span className="text-blue-500 flex-shrink-0 mt-0.5"><Icon name="pencil" size={20} /></span>
        <p className="text-base text-gray-600 leading-relaxed font-medium">약 봉투가 없거나 사진이 잘 안 읽힐 때 직접 입력하세요.</p>
      </div>

      {/* 입력 폼 */}
      <div className="space-y-4">
        <Field label="약 이름" placeholder="예: 타이레놀" value={name} onChange={setName} />
        <Field label="용량" placeholder="예: 500mg" value={dose} onChange={setDose} />
        <Field label="하루 몇 번" placeholder="예: 하루 3번" value={freq} onChange={setFreq} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="며칠 동안" placeholder="예: 3일" value={days} onChange={setDays} />
          <Field label="언제 먹나요" placeholder="예: 식후 30분" value={usage} onChange={setUsage} />
        </div>
      </div>

      {/* 버튼 */}
      <div className="mt-auto pt-8 space-y-3">
        <button onClick={add} className="w-full py-4 bg-blue-600 text-white text-lg font-bold rounded-2xl active:bg-blue-700 transition-colors">
          약 추가하기
        </button>
        <button onClick={() => router.push('/scan')} className="w-full py-4 bg-white border-2 border-blue-500 text-blue-600 text-lg font-bold rounded-2xl active:bg-blue-50 transition-colors">
          사진으로 다시 입력하기
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-base font-bold text-gray-800 mb-1.5">{label}</label>
      <input
        className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
