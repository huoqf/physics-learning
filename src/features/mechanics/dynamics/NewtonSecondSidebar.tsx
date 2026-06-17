import { SegmentedControl, Slider } from '@/components/UI'
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
              <Slider
                label="力增加斜率 k"
                value={params.k ?? 2}
                min={1}
                max={5}
                step={0.5}
                unit="N/s"
                onChange={(v) => updateParam('k', v)}
                disabled={disabled}
              />
            </div>
          )}

          {/* 正弦变力参数 */}
          {modelIdx === 1 && (
            <div className="space-y-3">
              <Slider
                label="力最大幅值 F₀"
                value={params.F0 ?? 15}
                min={5}
                max={25}
                step={1}
                unit="N"
                onChange={(v) => updateParam('F0', v)}
                disabled={disabled}
              />

              <Slider
                label="力变化频率 ω"
                value={params.omega ?? 1.5}
                min={0.5}
                max={3}
                step={0.1}
                unit="rad/s"
                onChange={(v) => updateParam('omega', v)}
                disabled={disabled}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
