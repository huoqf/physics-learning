import type { SidebarExtraProps } from '@/data/types'
import { ToggleSwitch, LeftPanelSection } from '@/components/UI'

export default function FirstLawSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const adiabatic = params.adiabatic ?? 0

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
    </LeftPanelSection>
  )
}
