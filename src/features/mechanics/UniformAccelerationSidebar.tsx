import { useAnimationStore } from '@/stores'
import type { SidebarExtraProps } from '@/data/types'

/**
 * 匀变速直线运动侧边栏扩展
 *
 * 基础模式：面积拆分开关 + 坐标缩放
 * 进阶模式：频闪周期 T 控制
 */
export default function UniformAccelerationSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const { setTime, setIsPlaying } = useAnimationStore()
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1
  const showSplit = params.showSplit ?? 1

  const toggleAdvanced = () => {
    updateParam('advancedMode', isAdvanced ? 0 : 1)
    setTime(0)
    setIsPlaying(false)
  }

  return (
    <>
      {/* ── 基础模式控件 ── */}
      {!isAdvanced && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <p className="text-xs font-semibold text-neutral-600 mb-2">v-t 图面积</p>
          <div className="flex gap-2">
            <button
              onClick={() => updateParam('showSplit', 0)}
              disabled={disabled}
              className={`flex-1 py-2 text-xs rounded-md font-medium transition-all active:scale-95 ${
                showSplit === 0
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              合并梯形
            </button>
            <button
              onClick={() => updateParam('showSplit', 1)}
              disabled={disabled}
              className={`flex-1 py-2 text-xs rounded-md font-medium transition-all active:scale-95 ${
                showSplit === 1
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              拆分 v₀t + ½at²
            </button>
          </div>
          <p className="mt-2 text-[10px] text-neutral-400 leading-tight">
            拆分后可直观看到位移由矩形面积和三角形面积组成
          </p>
        </div>
      )}

      {/* ── 进阶模式切换按钮 ── */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <button
          onClick={toggleAdvanced}
          disabled={disabled}
          className={[
            'w-full px-3 py-2 rounded-lg text-sm font-medium transition-all',
            isAdvanced
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
            disabled && 'opacity-40 pointer-events-none',
          ].join(' ')}
        >
          {isAdvanced ? '✓ 进阶模式' : '进阶模式'}
        </button>

        {/* ── 进阶控件展开 ── */}
        {isAdvanced && (
          <div className="mt-3 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-600">频闪周期 T</span>
                <span className="font-mono text-neutral-700">{(params.flashPeriod ?? 1).toFixed(1)} s</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={params.flashPeriod ?? 1}
                onChange={(e) => updateParam('flashPeriod', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
              />
              <p className="mt-1 text-[10px] text-neutral-400 leading-tight">
                调整频闪周期观察逐差法规律
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
