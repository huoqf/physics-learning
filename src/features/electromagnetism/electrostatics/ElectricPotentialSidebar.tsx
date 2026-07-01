import type { SidebarExtraProps } from '@/data/types'
import { ToggleSwitch, TipCard, LeftPanelSection } from '@/components/UI'

export default function ElectricPotentialSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const drawMode = params.drawMode ?? 0

  const handleDrawModeChange = (checked: boolean) => {
    updateParam('drawMode', checked ? 1 : 0)
    updateParam('runTime', 0)
  }

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <ToggleSwitch
        label="锁定A-B点并激活自由手绘路径"
        checked={drawMode === 1}
        onChange={handleDrawModeChange}
        disabled={disabled}
      />
      <TipCard variant="primary">
        <span className="font-semibold block mb-1">💡 高考考点探究指导</span>
        <div className="space-y-2 text-xs text-neutral-600 leading-relaxed">
          <p><strong>1. 路径无关性验证</strong>：开启手写模式，用鼠标在下方的动画区域任意绘制出一条弯曲轨迹。</p>
          <p><strong>2. 零势选择的相对性</strong>：切换零势参考模式，观察 A、B 点的绝对电势发生显著平移。</p>
        </div>
      </TipCard>
    </LeftPanelSection>
  )
}
