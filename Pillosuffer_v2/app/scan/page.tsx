'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { maskPII, parseDrugs } from '@/lib/masking'
import type { ScanSession } from '@/types'

type Step = 'upload' | 'processing'

export default function ScanPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const processImage = useCallback(async (file: File) => {
    setStep('processing')
    setProgress(0)
    setError(null)

    try {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = e => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })
      setImageDataUrl(dataUrl)
      setProgress(10)
      setStatusText('이미지 불러오는 중')

      setProgress(20)
      setStatusText('Vision API 연결 중')

      const formData = new FormData()
      formData.append('image', file)

      setProgress(30)
      setStatusText('텍스트 인식 중')

      const res = await fetch('/api/ocr', { method: 'POST', body: formData })

      setProgress(75)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `OCR 오류 (${res.status})`)
      }

      const data = await res.json()

      setProgress(85)
      setStatusText('개인정보 마스킹 중')

      const rawText: string = data.text || ''
      const maskedText = maskPII(rawText)
      const drugs = parseDrugs(maskedText)

      setProgress(100)
      setStatusText(`완료 — ${data.line_count ?? 0}줄 인식`)

      const session: ScanSession = {
        rawText,
        maskedText,
        drugs,
        scannedAt: new Date().toISOString(),
      }
      sessionStorage.setItem('scanSession', JSON.stringify(session))

      setTimeout(() => router.push('/drugs'), 500)
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'OCR 처리 실패'
      setError(msg)
      setStep('upload')
    }
  }, [router])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processImage(file)
  }

  function handleSkip() {
    const session: ScanSession = {
      rawText: '',
      maskedText: '',
      drugs: [],
      scannedAt: new Date().toISOString(),
    }
    sessionStorage.setItem('scanSession', JSON.stringify(session))
    router.push('/drugs')
  }

  return (
    <div className="page-padding flex flex-col min-h-screen lg:max-w-2xl lg:mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-7">
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
          <p className="text-xs tracking-wider text-zinc-500 font-medium">단계 01 / 04</p>
          <h1 className="text-lg font-semibold text-zinc-100">약 봉투 촬영</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="dot bg-accent-sky" />
          <span className="text-xs tracking-wider text-zinc-500 font-medium">OCR 준비</span>
        </div>
      </div>

      {step === 'upload' && (
        <>
          {/* 개인정보 보호 */}
          <div className="card p-4 mb-3 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-sky/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-accent-sky" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">개인정보 보호</p>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                이름·주민번호·병원명은 자동 마스킹됩니다. AI는 약물 정보만 분석합니다.
              </p>
            </div>
          </div>

          <div className="card p-3 mb-5 flex items-center gap-2.5">
            <span className="dot bg-accent-lime relative pulse-dot" />
            <p className="text-xs text-zinc-300">
              <span className="font-semibold text-zinc-100">Google Cloud Vision</span>
              <span className="text-zinc-500"> · 고정밀 한국어 OCR</span>
            </p>
          </div>

          {/* 업로드 영역 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 glass border border-dashed border-white/[0.12] rounded-3xl
                       flex flex-col items-center justify-center gap-4 p-10
                       cursor-pointer active:bg-white/[0.05] transition-all min-h-[280px]"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-accent-sky/10 blur-xl rounded-full" />
              <div className="relative w-20 h-20 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-zinc-100">탭하여 촬영</p>
              <p className="text-xs text-zinc-500 mt-1">카메라 또는 갤러리에서 선택</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />

          {error && (
            <div className="mt-3 p-4 rounded-2xl bg-accent-red/[0.08] border border-accent-red/30">
              <div className="flex items-center gap-2">
                <span className="dot bg-accent-red" />
                <p className="text-xs tracking-wider text-accent-red font-semibold">오류 발생</p>
              </div>
              <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">{error}</p>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <p className="text-center text-xs tracking-widest text-zinc-600">— 또는 —</p>
            <button onClick={handleSkip} className="btn-secondary">
              직접 입력하기
            </button>
          </div>
        </>
      )}

      {step === 'processing' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full">
          {imageDataUrl && (
            <div className="w-full max-w-md rounded-3xl overflow-hidden bg-ink-900 border border-white/[0.06] aspect-[3/4] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageDataUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-contain opacity-90"
              />
            </div>
          )}

          <div className="w-full max-w-md space-y-4">
            <div>
              <p className="text-xs tracking-widest text-zinc-500 font-medium">처리 중</p>
              <div className="flex items-end justify-between mt-1">
                <span className="text-sm text-zinc-300">{statusText}</span>
                <span className="text-3xl font-light text-zinc-100 num">{progress}<span className="text-zinc-500 text-base">%</span></span>
              </div>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-1 overflow-hidden">
              <div
                className="bg-gradient-to-r from-accent-sky to-accent-lime h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="dot bg-accent-sky relative pulse-dot" />
              <p className="text-xs tracking-widest text-zinc-500">Vision OCR · 실시간</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
