'use client'

interface Props {
  show: boolean
  message?: string
}

/** 다크 글래스모피즘 저장 성공 오버레이 */
export default function SaveSuccessOverlay({ show, message = '저장되었습니다' }: Props) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] bg-ink-950/80 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-accent-lime/30 animate-ping-slow" />
        <div className="relative w-24 h-24 rounded-full bg-accent-lime flex items-center justify-center shadow-2xl shadow-accent-lime/30 animate-pop">
          <svg
            className="w-12 h-12 text-ink-950"
            viewBox="0 0 52 52"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 27 l8 8 l16 -16" className="check-stroke" />
          </svg>
        </div>
      </div>

      <p className="mt-8 text-xl font-light text-zinc-100 animate-slide-up">{message}</p>
      <p className="mt-2 text-xs text-zinc-500 tracking-wider animate-slide-up">메인으로 이동합니다</p>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pingSlow {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes drawCheck {
          from { stroke-dashoffset: 50; }
          to   { stroke-dashoffset: 0; }
        }
        .animate-fade-in    { animation: fadeIn 0.25s ease-out; }
        .animate-pop        { animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-ping-slow  { animation: pingSlow 1.4s ease-out infinite; }
        .animate-slide-up   { animation: slideUp 0.5s 0.3s ease-out backwards; }
        .check-stroke {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: drawCheck 0.4s 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
