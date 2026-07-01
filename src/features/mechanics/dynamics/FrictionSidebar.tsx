import type { SidebarExtraProps } from '@/data/types'
import { ToggleSwitch, OptionButton, LeftPanelSection } from '@/components/UI'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'

const GRAVITY_PRESETS = [
  { label: '🌍 地球', g: 9.8 },
  { label: '🌙 月球', g: 1.63 },
  { label: '🔴 火星', g: 3.72 },
  { label: '🪐 木星', g: 24.79 },
] as const

export default function FrictionSidebar({ params, updateParam, disabled }: SidebarExtraProps) {
  const mode = params.mode ?? 0

  const { showVectors, toggleVectors } = useAnimationStore(
    useShallow((s) => ({
      showVectors: s.showVectors,
      toggleVectors: s.toggleVectors,
    }))
  )

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

      <div className="flex items-center justify-between border-t border-neutral-200/60 pt-4 mt-2">
        <span className="text-xs font-semibold text-neutral-600">显示受力分析图</span>
        <ToggleSwitch checked={showVectors} onChange={toggleVectors} disabled={disabled} />
      </div>
    </LeftPanelSection>
  )
}
