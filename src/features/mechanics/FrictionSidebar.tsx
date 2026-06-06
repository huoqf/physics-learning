import { FC } from 'react'
import { useAnimationStore } from '@/stores'

export const FrictionSidebar: FC = () => {
  const { params, updateParam, setTime, setIsPlaying } = useAnimationStore()
  
  const mode = params.mode ?? 0 // 0=水平外力, 1=斜面倾角

  const handleModeChange = (newMode: number) => {
    updateParam('mode', newMode)
    // 切换模式重置动画时间与播放状态
    setTime(0)
    setIsPlaying(false)
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      {/* 演示模式切换 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">演示模式</label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-lg">
          <button
            onClick={() => handleModeChange(0)}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 0
                ? 'bg-white text-primary-700 shadow-sm font-bold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            水平拉力模型 (f-F)
          </button>
          <button
            onClick={() => handleModeChange(1)}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 1
                ? 'bg-white text-primary-700 shadow-sm font-bold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            斜面倾角模型 (f-θ)
          </button>
        </div>
      </div>
    </div>
  )
}

export default FrictionSidebar
