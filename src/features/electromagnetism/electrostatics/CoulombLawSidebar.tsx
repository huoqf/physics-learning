import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl } from '@/components/UI'

export default function CoulombLawSidebar({ params, updateParam, animationActions, disabled }: SidebarExtraProps) {
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
          { value: 0, label: '基础' },
          { value: 1, label: '三电荷平衡' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      {mode === 1 && (
        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700 font-medium">
            💡 拖拽电荷改变位置，观察合力变化
          </p>
          <p className="text-xs text-amber-600 mt-1">
            三个点电荷平衡条件：两大夹小、两同夹异、远小近大
          </p>
        </div>
      )}
    </div>
  )
}
