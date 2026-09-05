/** 4단계 진행 표시 — 약 등록 → 약 확인 → 음식 입력 → 결과 */
const STEPS = ['약 등록', '약 확인', '음식 입력', '결과']

export default function StepProgress({ step }: { step: number }) {
  return (
    <div className="flex items-start">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n <= step
        const lineDone = n < step
        return (
          <div key={label} className="flex-1 flex flex-col items-center relative">
            {/* 연결선 (이전 단계와) */}
            {i > 0 && (
              <div
                className={`absolute top-[15px] right-1/2 left-[-50%] h-1 ${
                  n <= step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
            <div
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}
            >
              {n}
            </div>
            <span className={`mt-1.5 text-xs font-bold ${done ? 'text-blue-600' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
