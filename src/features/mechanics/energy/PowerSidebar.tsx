import type { FC } from 'react'
import { LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

const PowerSidebar: FC<SidebarExtraProps> = ({ params }) => {
  const mode = params.mode ?? 0
  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <p className="text-ui-base text-neutral-400 leading-tight">
        {mode === 0
          ? '汽车以额定功率 P 起动，牵引力 F=P/v 随速度增大而减小，加速度逐渐降为零。'
          : '先匀加速（F 恒定），当功率达到额定值后切换为恒功率变加速，直至匀速。'}
      </p>
    </LeftPanelSection>
  )
}

export default PowerSidebar
