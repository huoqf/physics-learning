import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, Slider, TipCard } from '@/components/UI'

export default function RefractionSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0

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
        <TipCard>增大入射角，观察折射角随之增大</TipCard>
      </div>

      {/* 折射率滑块 */}
      <div className="mt-4 pt-3 border-t border-neutral-200">
        <Slider
          label="玻璃折射率 n"
          value={params.n ?? 1.5}
          min={1.2}
          max={1.9}
          step={0.01}
          onChange={(v) => updateParam('n', v)}
          disabled={disabled}
          minLabel="1.2"
          maxLabel="1.9"
          formatValue={(v) => v.toFixed(2)}
        />
        <TipCard>折射率越大，光线偏折越明显</TipCard>
      </div>

      {/* 模式切换 */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="观察模式"
          options={[
            { label: '基础折射', value: 0 },
            { label: '双界面并进与侧移', value: 1 },
          ]}
          value={advancedMode}
          onChange={(v) => {
            updateParam('advancedMode', v as number)
            animationActions.resetAnimation()
          }}
          disabled={disabled}
        />
      </div>
    </>
  )
}
