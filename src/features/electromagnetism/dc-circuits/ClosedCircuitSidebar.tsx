import { LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function ClosedCircuitSidebar({
  params,
}: SidebarExtraProps) {
  const EMF = params.EMF ?? 6

  return (
    <LeftPanelSection bodyClassName="space-y-5">
      <div className="pt-3 border-t border-neutral-200 flex justify-between items-center text-xs">
        <span className="text-neutral-500">电源恒定电动势 E</span>
        <span className="font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
          {EMF.toFixed(1)} V
        </span>
      </div>
    </LeftPanelSection>
  )
}
