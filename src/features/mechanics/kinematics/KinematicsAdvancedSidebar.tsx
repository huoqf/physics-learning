import { ToggleSwitch, LeftPanelSection } from '@/components/UI'
import { useAnimationStore } from '@/stores'
import type { SidebarExtraProps } from '@/data/types'

export default function KinematicsAdvancedSidebar({
  disabled,
}: SidebarExtraProps) {
  const showVectors = useAnimationStore((s) => s.showVectors)
  const toggleVectors = useAnimationStore((s) => s.toggleVectors)

  return (
    <LeftPanelSection bodyClassName="space-y-4">
      <ToggleSwitch
        label="显示速度与加速度箭头"
        checked={showVectors}
        onChange={toggleVectors}
        disabled={disabled}
      />
    </LeftPanelSection>
  )
}
