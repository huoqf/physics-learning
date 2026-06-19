import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, Slider, TipCard } from '@/components/UI'

export default function TIRSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0

  return (
    <>
      {/* 入射角滑块（模式 0） */}
      {mode === 0 && (
        <div className="pt-3">
          <Slider
            label="入射角 i"
            value={params.theta1 ?? 30}
            min={0}
            max={90}
            step={1}
            unit="°"
            onChange={(v) => updateParam('theta1', v)}
            disabled={disabled}
            minLabel="0°"
            maxLabel="90°"
          />
          <TipCard>增大入射角，观察折射光渐暗直至全反射</TipCard>
        </div>
      )}

      {/* 光源深度滑块（模式 1） */}
      {mode === 1 && (
        <div className="pt-3">
          <Slider
            label="光源深度 h"
            value={params.depth ?? 2}
            min={0.5}
            max={5}
            step={0.1}
            unit="m"
            onChange={(v) => updateParam('depth', v)}
            disabled={disabled}
            minLabel="0.5m"
            maxLabel="5m"
          />
          <TipCard>拖动深度，观察俯视图中透光圆面积变化</TipCard>
        </div>
      )}

      {/* 介质折射率（始终显示） */}
      <div className="mt-4 pt-3 border-t border-neutral-200">
        <Slider
          label="介质折射率 n"
          value={params.n ?? 1.33}
          min={1.01}
          max={2.0}
          step={0.01}
          onChange={(v) => updateParam('n', v)}
          disabled={disabled}
          minLabel="1.01"
          maxLabel="2.0"
          formatValue={(v) => v.toFixed(2)}
        />
        <TipCard>折射率越大，临界角越小，全反射越容易发生</TipCard>
      </div>

      {/* 模式切换（底部） */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="观察模式"
          options={[
            { label: '单光束变角', value: 0 },
            { label: '水下点光源', value: 1 },
          ]}
          value={mode}
          onChange={(v) => {
            updateParam('mode', v as number)
            animationActions.resetAnimation()
          }}
          disabled={disabled}
        />
      </div>
    </>
  )
}
