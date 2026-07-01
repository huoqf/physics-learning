import { SegmentedControl, ToggleSwitch, LeftPanelSection } from '@/components/UI'
import { useAnimationStore } from '@/stores'
import type { SidebarExtraProps } from '@/data/types'

export default function KinematicsAdvancedSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const chartMode = params.chartMode ?? 0
  const showAux = params.showAux ?? 1

  const showVectors = useAnimationStore((s) => s.showVectors)
  const toggleVectors = useAnimationStore((s) => s.toggleVectors)

  return (
    <LeftPanelSection bodyClassName="space-y-4">
      <SegmentedControl
        label="函数图象模式切换"
        options={[
          { label: 'v² - x 模式', value: 0 },
          { label: 'x/t - t 模式', value: 1 },
        ]}
        value={chartMode}
        onChange={(v) => {
          updateParam('chartMode', v as number)
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />

      <ToggleSwitch
        label="显示斜率/截距解析辅助线"
        checked={showAux === 1}
        onChange={(checked) => {
          updateParam('showAux', checked ? 1 : 0)
        }}
        disabled={disabled}
      />

      <ToggleSwitch
        label="显示速度与加速度箭头"
        checked={showVectors}
        onChange={toggleVectors}
        disabled={disabled}
      />
    </LeftPanelSection>
  )
}
