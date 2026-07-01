import type { SidebarExtraProps } from '@/data/types'
import { OptionButton, LeftPanelSection } from '@/components/UI'

export default function GravityBasicSidebar({ params, updateParam, animationActions, disabled }: SidebarExtraProps) {
  const suspendPoint = params.suspendPoint ?? 0

  const handleSuspendPointChange = (idx: number) => {
    updateParam('suspendPoint', idx)
    animationActions.resetAnimation()
  }

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-neutral-600">选择悬挂孔 (A1 - A3)</p>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((idx) => (
            <OptionButton
              key={`suspend-btn-${idx}`}
              label={`挂载点 A${idx + 1}`}
              selected={suspendPoint === idx}
              onClick={() => handleSuspendPointChange(idx)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </LeftPanelSection>
  )
}
