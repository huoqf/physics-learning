import { useAnimationStore } from '@/stores'
import type { SidebarExtraProps } from '@/data/types'

/**
 * 速度动画侧边栏扩展
 */
export default function VelocitySidebar({
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

  // ── Δt 档位选项（基础版） ──
  const deltaTSteps = [
    { label: '2s', value: 2 },
    { label: '1s', value: 1 },
    { label: '0.2s', value: 0.2 },
    { label: '0.02s', value: 0.02 },
  ]

  // ── 运动模型选项（进阶版） ──
  const motionModels = [
    { label: '变加速（F递增）', idx: 0 },
    { label: '简谐振动', idx: 1 },
    { label: '往返多阶段', idx: 2 },
  ]

  return (
    <>
      {/* ── 场景切换（仅基础版显示）── */}
      {!isAdvanced && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <p className="text-xs font-semibold text-neutral-600 mb-2">生活场景</p>
          <div className="flex gap-2">
            <button
              onClick={() => updateParam('scene', 0)}
              disabled={disabled}
              className={`flex-1 py-2 text-xs rounded-md font-medium transition-all active:scale-95 ${
                (params.scene ?? 0) === 0
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              公交车进站
            </button>
            <button
              onClick={() => updateParam('scene', 1)}
              disabled={disabled}
              className={`flex-1 py-2 text-xs rounded-md font-medium transition-all active:scale-95 ${
                (params.scene ?? 0) === 1
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              百米短跑
            </button>
          </div>
        </div>
      )}

      {/* ── Δt 步进器（基础版显示）── */}
      {!isAdvanced && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <p className="text-xs font-semibold text-neutral-600 mb-2">时间间隔 Δt</p>
          <div className="grid grid-cols-2 gap-2">
            {deltaTSteps.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateParam('deltaT', opt.value)}
                disabled={disabled}
                className={`py-2 text-xs rounded-md font-medium transition-all active:scale-95 ${
                  Math.abs((params.deltaT ?? 2) - opt.value) < 0.001
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-neutral-400 leading-tight">
            调小 Δt 观察平均速度如何趋近瞬时速度
          </p>
        </div>
      )}

      {/* ── 进阶模式切换按钮（全宽，竖直上抛风格）── */}
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
            {/* 运动模型切换 */}
            <div>
              <p className="text-xs font-semibold text-neutral-600 mb-2">运动模型</p>
              <div className="flex flex-col gap-2">
                {motionModels.map((opt) => (
                  <button
                    key={opt.idx}
                    onClick={() => {
                      updateParam('modelIdx', opt.idx)
                      setTime(0)
                      setIsPlaying(false)
                    }}
                    disabled={disabled}
                    className={`py-2 text-xs rounded-md font-medium transition-all active:scale-95 ${
                      (params.modelIdx ?? 0) === opt.idx
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Δt 连续滑条 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-600">时间微元 Δt</span>
                <span className="font-mono text-neutral-700">{(params.deltaT ?? 0.5).toFixed(3)} s</span>
              </div>
              <input
                type="range"
                min={0.001}
                max={1}
                step={0.001}
                value={params.deltaT ?? 0.5}
                onChange={(e) => updateParam('deltaT', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
              />
              <p className="mt-1 text-[10px] text-neutral-400 leading-tight">
                拖拽 Δt→0 观察割线与切线重合
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
