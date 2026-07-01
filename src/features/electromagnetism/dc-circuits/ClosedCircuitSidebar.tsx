import { SegmentedControl, ToggleSwitch, Slider, LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function ClosedCircuitSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 1
  const EMF = params.EMF ?? 6
  const r = params.r ?? 2
  const R = params.R ?? 10
  const highlightLoss = (params.highlightLoss ?? 0) === 1

  return (
    <LeftPanelSection bodyClassName="space-y-5">
      {/* 参数调节 */}
      <Slider
        label="外电阻 R (滑动变阻器)"
        value={R}
        min={0.1}
        max={20}
        step={0.1}
        unit="Ω"
        minLabel="0.1 Ω"
        midLabel="10.0 Ω"
        maxLabel="20.0 Ω"
        onChange={(v) => updateParam('R', v)}
        disabled={disabled}
      />

      <Slider
        label="电源内阻 r"
        value={r}
        min={1}
        max={5}
        step={0.1}
        unit="Ω"
        minLabel="1.0 Ω"
        midLabel="3.0 Ω"
        maxLabel="5.0 Ω"
        onChange={(v) => updateParam('r', v)}
        disabled={disabled}
      />

      {/* 只读参数: 电动势 E */}
      <div className="pt-3 border-t border-neutral-200 flex justify-between items-center text-xs">
        <span className="text-neutral-500">电源恒定电动势 E</span>
        <span className="font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
          {EMF.toFixed(1)} V
        </span>
      </div>

      {/* 显示辅助开关 */}
      <div className="pt-3 border-t border-neutral-200">
        <ToggleSwitch
          label="内能损耗视觉高亮"
          checked={highlightLoss}
          onChange={(checked) => updateParam('highlightLoss', checked ? 1 : 0)}
          disabled={disabled}
        />
        <p className="text-ui-base text-neutral-400 mt-1.5 leading-relaxed">
          激活后，电流增大时电源内部（内阻 r 区域）红光渐变加深，隐喻内阻产生的焦耳热能损耗。
        </p>
      </div>

      {/* 模式选择（底部） */}
      <div className="pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="观察模式"
          options={[
            { label: '基础：U - I 关系', value: 0 },
            { label: '进阶：输出功率与效率', value: 1 },
          ]}
          value={mode}
          onChange={(v) => {
            updateParam('mode', v as number)
            animationActions.resetAnimation()
          }}
          disabled={disabled}
        />
      </div>
    </LeftPanelSection>
  )
}
