import type { FC } from 'react'
import { SegmentedControl, LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

/**
 * 恒力做功侧边栏扩展 — 模式切换
 *
 * 物理量看板、公式、高考要点由右侧 PhysicsPanel 展示
 * （数据来源：buildPhysicsQuantities('anim-work', ...)）
 */
const WorkSidebar: FC<SidebarExtraProps> = ({
  params,
  updateParam,
  animationActions,
  disabled,
}) => {
  const mode = (params.mode ?? 0) as 0 | 1

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <SegmentedControl
        label="演示模式"
        options={[
          { value: 0, label: '基础模式 (μ=0)' },
          { value: 1, label: '进阶模式 (含摩擦)' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />
      <p className="text-ui-base text-neutral-400 leading-tight">
        {mode === 0
          ? '左图 v-t 速度曲线，右图 F-x 功面积；拖动 θ 观察投影变化'
          : '左图 F-x 多力复合，右图能量柱看板；观察支持力随 θ 变化'}
      </p>
    </LeftPanelSection>
  )
}

export default WorkSidebar
