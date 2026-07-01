import { TipCard, LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export function CircuitAnalysisSidebar({
  params,
}: SidebarExtraProps) {
  const R2 = params.R2 ?? 10

  return (
    <LeftPanelSection bodyClassName="space-y-5">
      <TipCard>
        {R2 === 0
          ? '当前变阻器为 0Ω (短路)。基础并联时电路总电阻趋于 0，干路电流极大；混联时并联部分短路，R₃无电流。'
          : R2 === 100
          ? '当前变阻器为 100Ω。观察当 R₂ 增大到极限（断路）时，各电表的读数逼近哪个固定数值。'
          : '拖动 R₂ 滑块，观察电荷粒子流速及导线亮度的此消彼长。右侧将同步显示"串反并同"的推导链条。'}
      </TipCard>
    </LeftPanelSection>
  )
}

export default CircuitAnalysisSidebar
