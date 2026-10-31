import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, ChevronDown, ChevronUp, Play } from 'lucide-react'
import { WRONG_REASONS, buildBenchmarkUrl } from '@/data/wrongReasons'

/**
 * 高考 N 大典型错因打靶台。
 *
 * 每张卡对应一个「标杆反例 + 定格帧」，点开直达动画的临界瞬间（带参数与时刻），
 * 与学生自己错题里勾的错因**互不写死**：学生勾「矢量正负号」不会把他送进弹簧振子，
 * 这里是他主动想复现时才点的官方标准反例。
 * 数量取自 WRONG_REASONS.length，不写死数字。
 */
export function ReasonBenchmarkStrip() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 mb-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 text-left"
      >
        <Target className="w-4 h-4 text-primary-600" />
        <span className="font-semibold text-neutral-800 text-sm">
          高考 {WRONG_REASONS.length} 大典型错因打靶台
        </span>
        <span className="text-xs text-neutral-400">
          每个错因配一个标准反例，点开直达临界定格帧
        </span>
        <span className="ml-auto text-neutral-400">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
          {WRONG_REASONS.map((reason, index) => (
            <div
              key={reason.id}
              className="border border-neutral-200 rounded-lg p-3 flex flex-col gap-2 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 shrink-0 rounded-full bg-primary-50 text-primary-700 text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-neutral-800">{reason.label}</span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">{reason.behavior}</p>
              <div className="flex flex-wrap gap-1">
                {reason.scenes.slice(0, 3).map((scene) => (
                  <span key={scene} className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
                    {scene}
                  </span>
                ))}
              </div>
              <button
                onClick={() => navigate(buildBenchmarkUrl(reason))}
                className="mt-auto self-start flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 active:scale-[0.97]"
              >
                <Play className="w-3 h-3 fill-current" />
                直达定格帧
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
