import type { FC } from 'react'
import { LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

const EnergyConservationSidebar: FC<SidebarExtraProps> = ({ params }) => {
  const mode = params.mode ?? 0
  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <p className="text-ui-base text-neutral-400 leading-tight">
        {mode === 0
          ? '经典单摆：在没有空气阻力时，摆球在摆动过程中重力势能与动能进行无损的往复转化，系统的总机械能保持严格守恒。'
          : '山谷滑道：滑块在双向对称凹山谷轨道上阻尼滑行。摩擦做功使机械能不断耗散，但在任何时刻机械能与摩擦产生的内能之总和始终严格守恒。'}
      </p>
    </LeftPanelSection>
  )
}

export default EnergyConservationSidebar
