import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch, TipCard, LeftPanelSection } from '@/components/UI'

export default function FirstLawSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const adiabatic = params.adiabatic ?? 0

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  const handleAdiabaticChange = (checked: boolean) => {
    updateParam('adiabatic', checked ? 1 : 0)
    if (checked) {
      updateParam('Q', 0)
    }
  }

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <ToggleSwitch
        label="绝热气缸"
        checked={adiabatic === 1}
        onChange={handleAdiabaticChange}
        disabled={disabled}
      />

      <TipCard>
        {adiabatic === 1
          ? '绝热气缸：Q=0，外界做功全部转化为内能'
          : mode === 0
            ? '拖动 W/Q 滑块，观察能量守恒天平'
            : '进阶模式：观察完整热机循环'}
      </TipCard>

      <SegmentedControl
        label="分析模式"
        options={[
          { value: 0, label: '基础模式' },
          { value: 1, label: '进阶模式' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />
    </LeftPanelSection>
  )
}
