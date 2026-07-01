import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch, TipCard, LeftPanelSection } from '@/components/UI'

export default function ChargeInEFieldSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const isAC = params.isAC ?? 0
  const useGravity = params.useGravity ?? 0

  const handleFieldTypeChange = (value: number | string) => {
    updateParam('isAC', value as number)
    animationActions.resetAnimation()
  }

  const handleGravityChange = (checked: boolean) => {
    updateParam('useGravity', checked ? 1 : 0)
    animationActions.resetAnimation()
  }

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <SegmentedControl
        label="电场类型"
        options={[
          { value: 0, label: '恒定直流电场' },
          { value: 1, label: '周期交变方形波' },
        ]}
        value={isAC}
        onChange={handleFieldTypeChange}
        disabled={disabled}
      />

      <div className="flex items-center justify-between mt-1">
        <ToggleSwitch
          label="计入重力复合场 (mg 绿色)"
          checked={useGravity === 1}
          onChange={handleGravityChange}
          disabled={disabled}
        />
      </div>

      <TipCard variant="primary">
        <span className="font-semibold block mb-1">💡 教学操作建议</span>
        {isAC === 0
          ? "在恒定直流电场模式下，粒子在板间做类平抛运动。尝试拖动初速度 v₀ 翻倍，并观察右屏偏转位移 y 是否刚好缩小到 1/4，以验证类平抛位移公式规律。"
          : "在交变模式下，粒子做周期性变向折线运动。💡提示：若交变频率过低（如 10Hz）或初速 v₀ 过快，粒子在电场变向发生前就已经飞出极板，轨迹将退化为单向抛物线。建议调慢初速 v₀，并调大频率 f，即可观察到生动的锯齿折线运动！"}
      </TipCard>
    </LeftPanelSection>
  )
}
