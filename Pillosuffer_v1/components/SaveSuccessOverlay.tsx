'use client'

interface Props {
  show: boolean
  message?: string
  description?: string
}

/**
 * 저장 성공 오버레이 — 풀스크린 화이트 배경 + 체크 애니메이션
 * 부모 컴포넌트가 `show` 상태와 setTimeout으로 라우팅 처리.
 */
export default function SaveSuccessOverlay({ show, message = '약 정보가 저장되었어요', description = '잠시 후 메인 화면으로 이동합니다' }: Props) {
  if (!show) return null

  return (
    <div role="status" className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center animate-fade-in">
      <div className="relative">
        {/* 외곽 원 (펄스 효과) */}
        <div className="absolute inset-0 rounded-full bg-green-100 animate-ping-slow" />

        {/* 메인 원 + 체크 SVG */}
        <div className="relative w-32 h-32 rounded-full bg-green-500 flex items-center justify-center shadow-xl animate-pop">
          <svg
            className="w-20 h-20 text-white"
            viewBox="0 0 52 52"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M14 27 l8 8 l16 -16"
              className="check-stroke"
            />
          </svg>
        </div>
      </div>

      <p className="mt-8 text-2xl font-bold text-gray-800 animate-slide-up">{message}</p>
      <p className="mt-2 text-sm text-gray-500 animate-slide-up">{description}</p>

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
          100% { transform: scale(1.6); opacity: 0; }
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
        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in, .animate-pop, .animate-ping-slow, .animate-slide-up, .check-stroke { animation: none; }
          .check-stroke { stroke-dashoffset: 0; }
          .animate-ping-slow { display: none; }
        }
      `}</style>
    </div>
  )
}
