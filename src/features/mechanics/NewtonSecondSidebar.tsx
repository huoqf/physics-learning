import { SegmentedControl } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function NewtonSecondSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {

  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1
  const modelIdx = params.modelIdx ?? 0

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200">
      <SegmentedControl
        label="观察模式"
        options={[
          { label: '基础模式', value: 0 },
          { label: '进阶模式', value: 1 },
        ]}
        value={advancedMode}
        onChange={(v) => {
          updateParam('advancedMode', v as number)
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />

      {isAdvanced && (
        <div className="mt-3 space-y-4">
          {/* 变力模型切换 */}
          <SegmentedControl
            label="变力模型"
            options={[
              { label: '线性递增力 F=k·t', value: 0 },
              { label: '正弦周期力 F=F₀sin(ωt)', value: 1 },
            ]}
            value={modelIdx}
            onChange={(v) => {
              updateParam('modelIdx', v as number)
              animationActions.resetAnimation()
            }}
            disabled={disabled}
          />

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
