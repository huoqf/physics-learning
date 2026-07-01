import type { FC } from 'react'
import { OptionButton, LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

const GRAVITY_FIELD_PRESETS = [
  { label: '🌍 地球', g: 9.8 },
  { label: '🌙 月球', g: 1.63 },
  { label: '🔴 火星', g: 3.72 },
  { label: '🪐 木星', g: 24.79 },
] as const

const PotentialEnergySidebar: FC<SidebarExtraProps> = ({
  params,
  updateParam,
  disabled,
}) => {
  const mode = params.mode ?? 0
  if (mode !== 0) return null

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <div>
        <h4 className="text-xs font-semibold text-neutral-700 mb-2">环境重力场</h4>
        <div className="flex gap-2 flex-wrap">
          {GRAVITY_FIELD_PRESETS.map((preset) => (
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
    </LeftPanelSection>
  )
}

export default PotentialEnergySidebar
