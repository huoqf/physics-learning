import { useAnimationStore } from '@/stores'
import type { SidebarExtraProps } from '@/data/types'

/**
 * 加速度动画侧边栏扩展
 *
 * 基础版：Δt 三档切换 + 经典对比快捷按钮
 * 进阶版：负加速度实验快捷按钮
 */
export default function AccelerationSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const { setTime, setIsPlaying } = useAnimationStore()
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  const toggleAdvanced = () => {
    updateParam('advancedMode', isAdvanced ? 0 : 1)
    setTime(0)
    setIsPlaying(false)
  }

  // ── 基础版：Δt 三档选项 ──
  const deltaTSteps = [
    { label: '1.0s', value: 1.0 },
    { label: '0.5s', value: 0.5 },
    { label: '0.1s', value: 0.1 },
  ]

  // ── 基础版：经典对比快捷按钮 ──
  const handleClassicCompare = () => {
    updateParam('vA', 300)
    updateParam('aB', 10)
    setTime(0)
    setIsPlaying(false)
  }

  return (
    <>
      {/* ── 基础版：Δt 三档切换 ── */}
      {!isAdvanced && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <p className="text-xs font-semibold text-neutral-600 mb-2">观测时间微元 Δt</p>
          <div className="grid grid-cols-3 gap-2">
            {deltaTSteps.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateParam('deltaT', opt.value)}
                disabled={disabled}
                className={`py-2 text-xs rounded-md font-medium transition-all active:scale-95 ${
                  Math.abs((params.deltaT ?? 1) - opt.value) < 0.001
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-neutral-400 leading-tight">
            调小 Δt 观察速度变化的精细程度
          </p>
        </div>
      )}

      {/* ── 基础版：经典对比快捷按钮 ── */}
      {!isAdvanced && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <p className="text-xs font-semibold text-neutral-600 mb-2">教学快捷操作</p>
          <button
            onClick={handleClassicCompare}
            disabled={disabled}
            className="w-full py-2 text-xs rounded-md font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all active:scale-95"
          >
            经典对比：v_A=300, a_B=10
          </button>
          <p className="mt-2 text-[10px] text-neutral-400 leading-tight">
            飞机速度极大但 Δv=0，跑车从静止但 Δv 不断增长
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

        {/* ── 进阶版：轻量提示 ── */}
        {isAdvanced && (
          <p className="mt-3 text-[10px] text-neutral-400 leading-tight">
            试试把初速度或加速度设为负值，观察运动状态的变化
          </p>
        )}
      </div>
    </>
  )
}
