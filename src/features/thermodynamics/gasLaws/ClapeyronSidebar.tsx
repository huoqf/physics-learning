import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, TipCard } from '@/components/UI'

export default function ClapeyronSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      <SegmentedControl
        label="演示模式"
        options={[
          { value: 0, label: '基础模式' },
          { value: 1, label: '进阶模式' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      <TipCard>
        {mode === 0
          ? '拖动 T 或 V，观察压强 P 自动约束变化'
          : '拖动 T 或 V，状态点在等温线族间跃迁'}
      </TipCard>
    </div>
  )
}
