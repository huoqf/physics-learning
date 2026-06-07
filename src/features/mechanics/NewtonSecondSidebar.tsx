import { useAnimationStore } from '@/stores'
import type { SidebarExtraProps } from '@/data/types'

export default function NewtonSecondSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const { setTime, setIsPlaying } = useAnimationStore()

  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1
  const modelIdx = params.modelIdx ?? 0

  const toggleAdvanced = () => {
    updateParam('advancedMode', isAdvanced ? 0 : 1)
    setTime(0)
    setIsPlaying(false)
  }

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200">
      <button
        onClick={toggleAdvanced}
        disabled={disabled}
        className={[
          'w-full px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.98]',
          isAdvanced
            ? 'bg-primary-600 text-white shadow-sm'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
          disabled && 'opacity-40 pointer-events-none',
        ].join(' ')}
      >
        {isAdvanced ? '✓ 进阶模式（变力分析）' : '进阶模式（变力分析）'}
      </button>

      {isAdvanced && (
        <div className="mt-3 space-y-4">
          {/* 变力模型切换 */}
          <div>
            <p className="text-xs font-semibold text-neutral-600 mb-2">变力模型</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  updateParam('modelIdx', 0)
                  setTime(0)
                  setIsPlaying(false)
                }}
                disabled={disabled}
                className={`flex-1 py-2 text-xs rounded-md font-medium transition-all active:scale-95 ${
                  modelIdx === 0
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                线性递增力 F=k·t
              </button>
              <button
                onClick={() => {
                  updateParam('modelIdx', 1)
                  setTime(0)
                  setIsPlaying(false)
                }}
                disabled={disabled}
                className={`flex-1 py-2 text-xs rounded-md font-medium transition-all active:scale-95 ${
                  modelIdx === 1
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                正弦周期力 F=F₀sin(ωt)
              </button>
            </div>
          </div>

          {/* 线性变力参数 */}
          {modelIdx === 0 && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-600">力增加斜率 k</span>
                  <span className="font-mono text-neutral-700">{(params.k ?? 2).toFixed(1)} N/s</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={params.k ?? 2}
                  onChange={(e) => updateParam('k', parseFloat(e.target.value))}
                  disabled={disabled}
                  className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
                />
              </div>
            </div>
          )}

          {/* 正弦变力参数 */}
          {modelIdx === 1 && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-600">力最大幅值 F₀</span>
                  <span className="font-mono text-neutral-700">{(params.F0 ?? 15).toFixed(1)} N</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={25}
                  step={1}
                  value={params.F0 ?? 15}
                  onChange={(e) => updateParam('F0', parseFloat(e.target.value))}
                  disabled={disabled}
                  className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-600">力变化频率 ω</span>
                  <span className="font-mono text-neutral-700">{(params.omega ?? 1.5).toFixed(2)} rad/s</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={params.omega ?? 1.5}
                  onChange={(e) => updateParam('omega', parseFloat(e.target.value))}
                  disabled={disabled}
                  className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
