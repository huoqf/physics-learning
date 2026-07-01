import { OptionButton } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

const deltaTSteps = [
  { label: '1.0s', value: 1.0 },
  { label: '0.5s', value: 0.5 },
  { label: '0.1s', value: 0.1 },
]

export default function AccelerationSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0

  if (advancedMode === 1) return null

  return (
    <div className="mt-4 pt-3 border-t border-neutral-200">
      <p className="text-xs font-semibold text-neutral-600 mb-2">观测时间微元 Δt</p>
      <div className="grid grid-cols-3 gap-2">
        {deltaTSteps.map((opt) => (
          <OptionButton
            key={opt.value}
            label={opt.label}
            selected={Math.abs((params.deltaT ?? 1) - opt.value) < 0.001}
            disabled={disabled}
            onClick={() => updateParam('deltaT', opt.value)}
          />
        ))}
      </div>
    </div>
  )
}
