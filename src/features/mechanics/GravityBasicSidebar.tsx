import { FC } from 'react'
import { useAnimationStore } from '@/stores'
import { duration, easing } from '@/theme/motion'

export const GravityBasicSidebar: FC = () => {
  const { params, updateParam, setTime, setIsPlaying } = useAnimationStore()
  
  const mode = params.mode ?? 0
  const suspendPoint = params.suspendPoint ?? 0
  const showLines = params.showLines ?? 1

  const handleModeChange = (newMode: number) => {
    updateParam('mode', newMode)
    // 切换模式重置动画时间与播放状态
    setTime(0)
    setIsPlaying(false)
  }

  const handleSuspendPointChange = (idx: number) => {
    updateParam('suspendPoint', idx)
    // 重新悬挂时，必须重置动画时间，以触发板的阻尼摆动晃动效果
    setTime(0)
    setIsPlaying(false)
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      {/* 演示模式选择 */}
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
            地球自转重力分解
          </button>
          <button
            onClick={() => handleModeChange(1)}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 1
                ? 'bg-white text-primary-700 shadow-sm font-bold'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            悬挂法重心实验
          </button>
        </div>
      </div>

      {/* 模式 2 重心实验专有侧边控件 */}
      {mode === 1 && (
        <div className="flex flex-col gap-4" style={{ animation: `fadeIn ${duration.fast}ms ${easing.standard}` }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">选择悬挂孔 (A1 - A3)</label>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((idx) => (
                <button
                  key={`suspend-btn-${idx}`}
                  onClick={() => handleSuspendPointChange(idx)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                    suspendPoint === idx
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 active:scale-[0.97]'
                  }`}
                >
                  挂载点 A{idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-1.5 border-t border-neutral-100 mt-1">
            <span className="text-xs font-semibold text-neutral-600">显示悬挂铅垂虚线</span>
            <button
              onClick={() => updateParam('showLines', showLines === 1 ? 0 : 1)}
              className={`w-9 h-5 rounded-full transition-all relative ${
                showLines === 1 ? 'bg-primary-600' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${
                  showLines === 1 ? 'left-[18px]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default GravityBasicSidebar
