import type { SidebarExtraProps } from '@/data/types'
import { OptionButton, LeftPanelSection } from '@/components/UI'

const PRESET_LIST = [
  { id: 1, name: '地月系统' },
  { id: 2, name: '太阳 - 地球' },
  { id: 3, name: '同步卫星 - 地球' },
  { id: 4, name: '宇航员 - 空间站' },
]

export default function GravitySidebar({ params, updateParam, animationActions, disabled }: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const preset = params.preset ?? 0

  const handlePresetChange = (newPreset: number) => {
    updateParam('preset', newPreset)
    animationActions.resetAnimation()
  }

  if (mode !== 1) return null

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-neutral-600">选择天体系统</label>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_LIST.map((p) => (
            <OptionButton
              key={p.id}
              label={p.name}
              selected={preset === p.id}
              onClick={() => handlePresetChange(p.id)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </LeftPanelSection>
  )
}
