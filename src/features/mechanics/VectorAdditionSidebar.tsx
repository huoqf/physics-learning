import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl } from '@/components/UI'

export default function VectorAdditionSidebar({ params, updateParam, animationActions, disabled }: SidebarExtraProps) {
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
          { value: 0, label: '平行四边形' },
          { value: 1, label: '三角形' },
          { value: 2, label: '正交分解' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />
    </div>
  )
}
