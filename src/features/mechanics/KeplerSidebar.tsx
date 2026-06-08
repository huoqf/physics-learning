import { FC } from 'react'
import { SegmentedControl } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export const KeplerSidebar: FC<SidebarExtraProps> = ({
  params,
  updateParam,
  animationActions,
  disabled,
}) => {
  const mode = params.mode ?? 0

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      <SegmentedControl
        label="定律模式"
        options={[
          { value: 0, label: '第一定律' },
          { value: 1, label: '第二定律' },
          { value: 2, label: '第三定律' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />
    </div>
  )
}

export default KeplerSidebar
