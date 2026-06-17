import { SegmentedControl, ToggleSwitch, Slider } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function OhmLawSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const showChart = params.showChart ?? 1
  const isBulb = mode === 1

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200 space-y-4">
      {/* 电源电压 U 控制 */}
      <Slider
        label="电源电压 U"
        value={params.U ?? 2}
        min={0}
        max={10}
        step={0.1}
        unit="V"
        minLabel="0 V"
        maxLabel="10 V"
        onChange={(v) => updateParam('U', v)}
        disabled={disabled}
      />

      {/* 定值电阻 R 控制（仅基础模式激活） */}
      {!isBulb && (
        <div className="animate-fade-in">
          <Slider
            label="定值电阻 R"
            value={params.R ?? 10}
            min={5}
            max={50}
            step={1}
            unit="Ω"
            minLabel="5 Ω"
            maxLabel="50 Ω"
            onChange={(v) => updateParam('R', v)}
            disabled={disabled}
          />
        </div>
      )}

      {/* 图表显示控制 */}
      <div className="pt-2">
        <ToggleSwitch
          label="显示 U-I 实时图表"
          checked={showChart === 1}
          onChange={(checked) => updateParam('showChart', checked ? 1 : 0)}
          disabled={disabled}
        />
      </div>

      {/* 模式选择（底部） */}
      <div className="pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="观察模式"
          options={[
            { label: '基础：定值电阻', value: 0 },
            { label: '进阶：小灯泡伏安特性', value: 1 },
          ]}
          value={mode}
          onChange={(v) => {
            updateParam('mode', v as number)
            animationActions.resetAnimation()
          }}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
