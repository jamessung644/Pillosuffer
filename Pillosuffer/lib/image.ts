/**
 * 업로드 전 클라이언트에서 이미지를 리사이즈·압축한다.
 *  - Vercel 서버리스 요청 본문 한계(~4.5MB) 초과로 인한 413(Payload Too Large) 방지
 *  - 긴 변 기준으로만 축소해 OCR 가독성 유지 (기본 2000px, JPEG 품질 0.85)
 *  - 디코딩 실패(예: HEIC)나 더 커지는 경우엔 원본을 그대로 반환
 */
export async function compressImage(
  file: File,
  maxDim = 2000,
  quality = 0.85,
): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = reject
      fr.readAsDataURL(file)
    })
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = dataUrl
    })

    let { width, height } = img
    const longest = Math.max(width, height)
    if (longest > maxDim) {
      const scale = maxDim / longest
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    if (!blob) return file
    return blob.size < file.size ? blob : file   // 더 커지면 원본 유지
  } catch {
    return file
  }
}
