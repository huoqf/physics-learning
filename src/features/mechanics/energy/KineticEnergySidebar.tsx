import type { FC } from 'react'
import { LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

const KineticEnergySidebar: FC<SidebarExtraProps> = ({ params }) => {
  const mode = params.mode ?? 0
  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <p className="text-ui-base text-neutral-400 leading-tight">
        {mode === 0
          ? '恒力做功：水平面光滑，恒力 F 在位移 s 区间内加速物块，随后撤力，物块匀速。'
          : '变力做功：滑块沿 1/4 凹型圆弧轨道（碗形内壁）下滑，受重力和变摩擦力作用，动能与功的变化相匹配。'}
      </p>
    </LeftPanelSection>
  )
}

export default KineticEnergySidebar
