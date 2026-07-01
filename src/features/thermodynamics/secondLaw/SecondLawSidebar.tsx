import type { SidebarExtraProps } from '@/data/types'
import { Button, LeftPanelSection } from '@/components/UI'

export default function SecondLawSidebar({ animationActions, disabled }: SidebarExtraProps) {
  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <Button variant="primary" size="sm" onClick={() => { animationActions.setDirection(1); animationActions.restartAnimation() }} disabled={disabled} className="w-full">
        正向自然播放
      </Button>
      <Button variant="danger" size="sm" onClick={() => { animationActions.resetAnimation(); animationActions.setDirection(-1); animationActions.restartAnimation(); animationActions.setDirection(-1) }} disabled={disabled} className="w-full">
        强行逆向倒带
      </Button>
    </LeftPanelSection>
  )
}
