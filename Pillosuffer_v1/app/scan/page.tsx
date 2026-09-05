'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { maskPII, parseDrugs } from '@/lib/masking'
import { compressImage } from '@/lib/image'
import { recognizeDrugLabel } from '@/lib/ocr'
import Icon from '@/components/Icon'
import StepProgress from '@/components/StepProgress'
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
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = e => resolve(e.target?.result as string)
        reader.onerror = () => reject(new Error('사진 파일을 읽지 못했습니다. 다른 사진을 선택해 주세요.'))
        reader.readAsDataURL(file)
      })
      setImageDataUrl(dataUrl)
      setProgress(15)
      setStatusText('사진 분석 준비 중...')

      const compressed = await compressImage(file)

      setProgress(35)
      setStatusText('약 이름 읽는 중...')

      // 앱에서는 온디바이스 Vision, 웹에서는 /api/ocr 로 갈린다.
      const rawText = await recognizeDrugLabel(compressed)
      setProgress(90)
      setStatusText('개인정보 지우는 중...')

      // 약 추출은 raw 에서 한다. maskPII 의 "단독 줄 한글 2~4자 → 이름" 규칙이
      // 단독 줄에 놓인 약품명(록소닌정, 아스피린 …)까지 지워버려서, 마스킹된 텍스트로
      // 파싱하면 약이 조용히 누락된다. 마스킹은 저장·표시용으로만 쓴다.
      const maskedText = maskPII(rawText)
      const drugs = parseDrugs(rawText)

      setProgress(100)
      setStatusText('완료!')

      const session: ScanSession = { rawText, maskedText, drugs, scannedAt: new Date().toISOString() }
      sessionStorage.setItem('scanSession', JSON.stringify(session))
      setTimeout(() => router.push('/drugs'), 500)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : '사진 처리 중 오류가 발생했습니다.')
      setStep('upload')
    }
  }, [router])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) processImage(file)
  }

  return (
    <div className="page-padding flex flex-col min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button aria-label="뒤로 가기" onClick={() => router.back()} className="w-11 h-11 shrink-0 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-600">
          <Icon name="arrowLeft" size={22} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">약 봉투 찍기</h1>
          <p className="text-base text-gray-500 font-medium">1단계 / 4단계</p>
        </div>
      </div>

      <div className="mb-7"><StepProgress step={1} /></div>

      {step === 'upload' && (
        <>
          {/* 안심 안내 (초록) */}
          <div className="flex items-start gap-3 rounded-2xl p-4 mb-5 bg-green-50">
            <span className="text-green-600 flex-shrink-0 mt-0.5"><Icon name="lock" size={22} /></span>
            <div>
              <p className="text-base font-bold text-green-800">안심하고 사용하세요</p>
              <p className="text-sm text-green-700 mt-1 leading-relaxed">사진에서 약 이름만 읽어옵니다.<br />이름이나 주민번호는 사용하지 않습니다.</p>
            </div>
          </div>

          {/* 업로드 (대시) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 border-2 border-dashed border-blue-300 rounded-3xl bg-blue-50 flex flex-col items-center justify-center gap-4 p-8 cursor-pointer active:bg-blue-100 transition-colors min-h-[260px]"
          >
            <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-500">
              <Icon name="camera" size={40} />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-blue-700">약 봉투 찍기</p>
              <p className="text-base text-blue-500 mt-1">사진을 찍거나 선택하세요</p>
            </div>
          </button>

          {/* capture 속성을 주면 iOS 가 카메라로 직행해서 "선택"이 불가능해진다.
              보관함에 이미 찍어둔 봉투 사진을 쓰는 경우가 많으므로 선택 시트를 띄운다. */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl">
              <p className="text-sm text-red-600 leading-relaxed">⚠️ {error}</p>
            </div>
          )}

          {/* 또는 + 직접 입력 (테두리형) */}
          <div className="mt-5 space-y-3">
            <p className="text-center text-base text-gray-400">— 또는 —</p>
            <button
              onClick={() => router.push('/manual')}
              className="w-full py-4 bg-white border-2 border-blue-500 text-blue-600 font-bold text-lg rounded-2xl active:bg-blue-50 transition-colors"
            >
              약 이름 직접 입력
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
            <div className="flex justify-between text-base">
              <span className="text-gray-600 font-medium">{statusText}</span>
              <span className="text-blue-600 font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-center text-sm text-gray-400 pt-1">잠시만 기다려 주세요…</p>
          </div>
        </div>
      )}
    </div>
  )
}
