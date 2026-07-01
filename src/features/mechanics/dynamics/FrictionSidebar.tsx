import type { SidebarExtraProps } from '@/data/types'
import { OptionButton, LeftPanelSection } from '@/components/UI'

const GRAVITY_PRESETS = [
  { label: '🌍 地球', g: 9.8 },
  { label: '🌙 月球', g: 1.63 },
  { label: '🔴 火星', g: 3.72 },
  { label: '🪐 木星', g: 24.79 },
] as const

export default function FrictionSidebar({ params, updateParam, disabled }: SidebarExtraProps) {
  const mode = params.mode ?? 0

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      {mode === 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-600 mb-2">环境重力场</p>
          <div className="flex gap-2 flex-wrap">
            {GRAVITY_PRESETS.map((preset) => (
              <OptionButton
                key={preset.g}
                label={preset.label}
                selected={params.g === preset.g}
                disabled={disabled}
                onClick={() => updateParam('g', preset.g)}
              />
            ))}
          </div>
        </div>
      )}
    </LeftPanelSection>
  )
}
