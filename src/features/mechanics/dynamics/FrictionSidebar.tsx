import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch } from '@/components/UI'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'

export default function FrictionSidebar({ params, updateParam, animationActions, disabled }: SidebarExtraProps) {
  const mode = params.mode ?? 0

  const { showVectors, toggleVectors } = useAnimationStore(
    useShallow((s) => ({
      showVectors: s.showVectors,
      toggleVectors: s.toggleVectors,
    }))
  )

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      <SegmentedControl
        label="演示模式"
        options={[
          { value: 0, label: '水平拉力模型 (f-F)' },
          { value: 1, label: '斜面倾角模型 (f-θ)' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />
      <div className="flex items-center justify-between border-t border-neutral-200/60 pt-4 mt-2">
        <span className="text-xs font-semibold text-neutral-600">显示受力分析图</span>
        <ToggleSwitch checked={showVectors} onChange={toggleVectors} disabled={disabled} />
      </div>
    </div>
  )
}

