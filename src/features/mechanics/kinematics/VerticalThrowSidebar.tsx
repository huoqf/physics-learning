import { ToggleSwitch, LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

/**
 * 竖直上抛侧边栏扩展 — 仅保留 controlMeta 无法表达的条件控件。
 * 观察模式 / 环境重力场预设 / 进阶参数已迁移至 controlMeta。
 */
export default function VerticalThrowSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0

  if (advancedMode !== 1) return null

  const airResistance = params.airResistance ?? 0
  if (airResistance <= 0) return null

  return (
    <LeftPanelSection>
      <ToggleSwitch
        label="对比真空参考轨道"
        checked={(params.showVacuumCompare ?? 1) === 1}
        onChange={(checked) => updateParam('showVacuumCompare', checked ? 1 : 0)}
        disabled={disabled}
      />
    </LeftPanelSection>
  )
}
