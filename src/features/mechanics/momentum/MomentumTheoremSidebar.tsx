import { SegmentedControl, LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function MomentumTheoremSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0

  return (
    <LeftPanelSection>
      <SegmentedControl
        label="观察模式"
        options={[
          { label: '基础', value: 0 },
          { label: '进阶', value: 1 },
        ]}
        value={advancedMode}
        onChange={(v) => {
          updateParam('advancedMode', v as number)
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />
    </LeftPanelSection>
  )
}
