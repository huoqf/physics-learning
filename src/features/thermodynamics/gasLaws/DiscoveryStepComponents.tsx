import { useState } from 'react'
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react'

interface QuestionProps {
  questionText: string
  options: { key: string; text: string }[]
  correctAnswer: string
  explanation: string
}

export function Question({ questionText, options, correctAnswer, explanation }: QuestionProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const handleReset = () => {
    setSelected(null)
  }

  return (
    <div className="mt-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200 select-none">
      <div className="text-xs font-bold text-neutral-800 mb-2 flex flex-col gap-1.5">
        <div className="flex">
          <span className="bg-primary-100 text-primary-800 px-1.5 py-0.5 rounded text-[10px] font-bold">随堂小测</span>
        </div>
        <span>{questionText}</span>
      </div>

      <div className="grid gap-1.5 mb-2.5">
        {options.map((opt) => {
          const isSelected = selected === opt.key
          const isCorrect = opt.key === correctAnswer
          const showResult = selected !== null

          let btnClass = 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
          if (showResult) {
            if (isSelected) {
              btnClass = isCorrect
                ? 'bg-green-50 border-green-500 text-green-700 font-semibold'
                : 'bg-red-50 border-red-500 text-red-700 font-semibold'
            } else if (isCorrect) {
              btnClass = 'bg-green-50 border-green-300 text-green-700 opacity-90'
            } else {
              btnClass = 'bg-white border-neutral-100 text-neutral-400 opacity-60'
            }
          }

          return (
            <button
              key={opt.key}
              disabled={showResult}
              onClick={() => setSelected(opt.key)}
              className={`w-full px-3 py-2 text-left text-xs border rounded-lg transition-all duration-200 active:scale-[0.98] ${btnClass}`}
            >
              <span className="font-bold mr-2">{opt.key}.</span>
              <span>{opt.text}</span>
            </button>
          )
        })}
      </div>

      {selected !== null && (
        <div className="mt-2.5 pt-2.5 border-t border-neutral-200">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              {selected === correctAnswer ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600 animate-bounce" />
                  <span className="text-xs font-bold text-green-700">回答正确！</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold text-red-700">回答错误，再想想！</span>
                </>
              )}
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-700 active:scale-[0.95] px-1.5 py-0.5 rounded border border-neutral-200 bg-white hover:bg-neutral-50"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>重新作答</span>
            </button>
          </div>
          <div className="p-2 bg-white rounded-lg border border-neutral-100 text-[11px] text-neutral-600 leading-relaxed">
            <span className="font-bold text-neutral-700 block mb-0.5">解析：</span>
            {explanation}
          </div>
        </div>
      )}
    </div>
  )
}

export function ScratchMask({ answer }: { answer: string }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <span
      onClick={() => setRevealed(true)}
      className={`inline-block px-1.5 py-0.5 rounded cursor-pointer mx-1 font-bold select-none transition-all duration-150 active:scale-[0.96] text-[11px] ${
        revealed
          ? 'bg-primary-50 text-primary-700 border border-primary-200'
          : 'bg-neutral-300 text-neutral-300 hover:bg-neutral-400 hover:text-neutral-400'
      }`}
      title="点击显现答案"
    >
      {revealed ? answer : ' ? '}
    </span>
  )
}
