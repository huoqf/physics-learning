import { FC } from 'react'
import { useAnimationStore } from '@/stores'

const MODE_OPTIONS = [
  { value: 0, label: '平行四边形' },
  { value: 1, label: '三角形' },
  { value: 2, label: '正交分解' },
] as const

export const VectorAdditionSidebar: FC = () => {
  const { params, updateParam, setTime, setIsPlaying } = useAnimationStore()

  const mode = params.mode ?? 0

  const handleModeChange = (newMode: number) => {
    updateParam('mode', newMode)
    setTime(0)
    setIsPlaying(false)
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      {/* 演示模式切换 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">演示模式</label>
        <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-100 rounded-lg">
          {MODE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleModeChange(value)}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === value
                  ? 'bg-white text-primary-700 shadow-sm font-bold'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VectorAdditionSidebar
