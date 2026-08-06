import { Capacitor, registerPlugin } from '@capacitor/core'
import { apiUrl } from './api'

interface VisionOcrPlugin {
  recognize(options: { image: string }): Promise<{ text: string; lineCount: number }>
}

/** ios/App/App/VisionOcrPlugin.swift 의 jsName 과 맞아야 한다. */
const VisionOcr = registerPlugin<VisionOcrPlugin>('VisionOcr')

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'))
    reader.readAsDataURL(blob)
  })
}

/**
 * 약 봉투 이미지에서 텍스트를 뽑는다.
 *
 * iOS 앱: 온디바이스 Vision. 사진이 기기 밖으로 나가지 않고, 네트워크도 안 탄다.
 * 웹: 기존 /api/ocr(Google Vision). 웹 버전 스캔을 유지하려면 이 경로가 필요하다.
 */
export async function recognizeDrugLabel(image: Blob): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const dataUrl = await blobToBase64(image)
    const { text } = await VisionOcr.recognize({ image: dataUrl })
    return text
  }

  const formData = new FormData()
  formData.append('image', image, 'scan.jpg')

  const res = await fetch(apiUrl('/api/ocr'), { method: 'POST', body: formData })
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error('이미지 용량이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요.')
    }
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `사진 인식 오류 (${res.status})`)
  }

  const data = await res.json()
  return data.text || ''
}
