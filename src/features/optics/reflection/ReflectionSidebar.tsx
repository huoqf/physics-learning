import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, Slider, ToggleSwitch, TipCard } from '@/components/UI'

export default function ReflectionSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  return (
    <>
      {/* 入射角滑块 */}
      <div className="pt-3">
        <Slider
          label="入射角 θ₁"
          value={params.theta1 ?? 45}
          min={0}
          max={90}
          step={1}
          unit="°"
          onChange={(v) => updateParam('theta1', v)}
          disabled={disabled}
          minLabel="0°"
          maxLabel="90°"
        />
        <TipCard>拖动滑块观察反射角始终等于入射角</TipCard>
      </div>

      {/* 法线与刻度盘开关 */}
      <div className="mt-4 pt-3 border-t border-neutral-200">
        <ToggleSwitch
          label="法线与刻度盘"
          checked={(params.showNormal ?? 1) === 1}
          onChange={(v) => updateParam('showNormal', v ? 1 : 0)}
          disabled={disabled}
        />
      </div>

      {/* 模式切换 */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="观察模式"
          options={[
            { label: '基础模式', value: 0 },
            { label: '平面镜旋转进阶', value: 1 },
          ]}
          value={advancedMode}
          onChange={(v) => {
            updateParam('advancedMode', v as number)
            updateParam('mirrorRotation', 0)
            animationActions.resetAnimation()
          }}
          disabled={disabled}
        />

        {/* 进阶控件 */}
        {isAdvanced && (
          <div className="mt-3">
            <Slider
              label="平面镜旋转 Δα"
              value={params.mirrorRotation ?? 0}
              min={-45}
              max={45}
              step={1}
              unit="°"
              onChange={(v) => updateParam('mirrorRotation', v)}
              disabled={disabled}
              minLabel="-45°"
              maxLabel="45°"
            />
            <TipCard>保持入射光不动，旋转镜面观察反射光偏转 2Δα</TipCard>
          </div>
        )}
      </div>
    </>
  )
}
