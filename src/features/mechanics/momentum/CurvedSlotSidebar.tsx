import { SegmentedControl, ToggleSwitch } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function CurvedSlotSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const isFixed = params.isFixed ?? 0
  const slotShape = params.slotShape ?? 0

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200 flex flex-col gap-4">
      <div className="text-xs text-neutral-500 font-semibold border-b pb-1">高考场景与轨道参数</div>

      {/* 轨道状态 */}
      <SegmentedControl
        label="轨道约束状态"
        options={[
          { label: '自由滑动 (动量守恒)', value: 0 },
          { label: '固定在地面', value: 1 },
        ]}
        value={isFixed}
        onChange={(v) => {
          updateParam('isFixed', v as number)
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />

      {/* 轨道形状 */}
      <SegmentedControl
        label="轨道物理形状"
        options={[
          { label: '四分之一滑出轨道', value: 0 },
          { label: '对称半圆轨道', value: 1 },
        ]}
        value={slotShape}
        onChange={(v) => {
          updateParam('slotShape', v as number)
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />

      <div className="text-xs text-neutral-500 font-semibold border-b pb-1 mt-2">界面显示选项</div>

      {/* 显示受力分析 */}
      <ToggleSwitch
        label="显示受力分析"
        checked={(params.showVectors ?? 1) === 1}
        onChange={(checked) => {
          updateParam('showVectors', checked ? 1 : 0)
        }}
        disabled={disabled}
      />

      {/* 显示位移标注 */}
      <ToggleSwitch
        label="显示位移标注"
        checked={(params.showDisplacement ?? 0) === 1}
        onChange={(checked) => {
          updateParam('showDisplacement', checked ? 1 : 0)
        }}
        disabled={disabled}
      />
    </div>
  )
}
