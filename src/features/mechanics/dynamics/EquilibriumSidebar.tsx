import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, LeftPanelSection } from '@/components/UI'

export default function EquilibriumSidebar({ params, updateParam, animationActions, disabled }: SidebarExtraProps) {
  const mode = params.mode ?? 0

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <SegmentedControl
        label="演示模式"
        options={[
          { value: 0, label: '基础悬挂' },
          { value: 1, label: '平行四边形' },
          { value: 2, label: '正交分解' },
          { value: 3, label: '封闭三角形' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />
    </LeftPanelSection>
  )
}
