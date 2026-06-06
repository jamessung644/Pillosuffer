'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { maskPII, parseDrugs } from '@/lib/masking'
import { compressImage } from '@/lib/image'
import type { ScanSession } from '@/types'

type Step = 'upload' | 'processing' | 'done'

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
      setStatusText('이미지 로드 완료')

      setProgress(20)
      setStatusText('Google Vision API 연결 중...')

      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.append('image', compressed, 'scan.jpg')

      setProgress(30)
      setStatusText('텍스트 인식 중...')

      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      })

      setProgress(75)

      if (!res.ok) {
        if (res.status === 413) throw new Error('이미지 용량이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요.')
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `OCR 서버 오류 (${res.status})`)
      }

      const data = await res.json()

      setProgress(85)
      setStatusText('개인정보 마스킹 중...')

      const rawText: string = data.text || ''
      const maskedText = maskPII(rawText)
      const drugs = parseDrugs(maskedText)

      setProgress(100)
      setStatusText(`완료! ${data.line_count ?? 0}줄 인식`)

      // imageDataUrl은 base64라 sessionStorage 용량(5MB) 초과 → 저장 제외
      const session: ScanSession = {
        rawText,
        maskedText,
        drugs,
        scannedAt: new Date().toISOString(),
      }
      sessionStorage.setItem('scanSession', JSON.stringify(session))

      setTimeout(() => router.push('/drugs'), 600)
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'OCR 처리 중 오류가 발생했습니다.'
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
    <div className="page-padding flex flex-col min-h-screen">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-600"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">약 봉투 스캔</h1>
          <p className="text-xs text-gray-400">Step 1 / 4</p>
        </div>
      </div>

      {step === 'upload' && (
        <>
          {/* 개인정보 보호 안내 */}
          <div className="card p-4 mb-4 flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="text-sm font-semibold text-gray-700">개인정보 보호 안내</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                이미지는 Google Cloud Vision API로 처리됩니다. 이름·주민번호·병원명은
                자동 삭제되며, 약물 정보만 AI 분석에 사용됩니다.
              </p>
            </div>
          </div>

          {/* OCR 엔진 안내 */}
          <div className="card p-3 mb-6 flex items-center gap-2 bg-indigo-50 border-indigo-100">
            <span className="text-lg">🧠</span>
            <p className="text-xs text-indigo-700">
              <span className="font-semibold">Google Cloud Vision</span> — 고정밀 한국어 OCR
            </p>
          </div>

          {/* 업로드 영역 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50
                       flex flex-col items-center justify-center gap-4 p-8
                       cursor-pointer active:bg-blue-100 transition-colors min-h-[240px]"
          >
            <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center">
              <span className="text-4xl">📷</span>
            </div>
            <div className="text-center">
              <p className="font-semibold text-blue-700">약 봉투 사진 선택</p>
              <p className="text-xs text-blue-400 mt-1">카메라 촬영 또는 갤러리에서 선택</p>
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
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl space-y-2">
              <p className="text-sm font-semibold text-red-600">⚠️ 오류 발생</p>
              <p className="text-xs text-red-500 leading-relaxed">{error}</p>
              {error.includes('API_KEY') && (
                <div className="mt-2 p-3 bg-white rounded-xl border border-red-100">
                  <p className="text-xs text-gray-500 font-medium mb-1">설정 방법:</p>
                  <code className="text-xs text-gray-700 font-mono block">
                    .env.local 파일에 아래 항목 추가:<br />
                    GOOGLE_VISION_API_KEY=your_api_key
                  </code>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 space-y-3">
            <p className="text-center text-xs text-gray-400">— 또는 —</p>
            <button onClick={handleSkip} className="btn-secondary">
              약품명 직접 입력하기
            </button>
          </div>
        </>
      )}

      {step === 'processing' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {imageDataUrl && (
            <div className="w-full rounded-2xl overflow-hidden bg-gray-100 max-h-48">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageDataUrl} alt="약 봉투" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="w-full space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{statusText}</span>
              <span className="text-blue-600 font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <p className="text-xs text-gray-400">Google Vision OCR 처리 중...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
