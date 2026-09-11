'use client'

export default function SourceCitation({ source, citation, recordId }: { source: string; citation: string; recordId: string }) {
  return (
    <div className="mt-2 text-xs text-gray-600 leading-relaxed break-words">
      <p className="font-semibold">보관본 출처: {source}</p>
      <p className="mt-1">{citation}</p>
      <p className="mt-1 break-all">원문 식별자: {recordId}</p>
    </div>
  )
}
