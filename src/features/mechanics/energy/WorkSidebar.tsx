import type { FC } from 'react'
import { SegmentedControl } from '@/components/UI'
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
  const mode = params.mode ?? 0

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
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
      <p className="text-[10px] text-neutral-400 leading-tight">
        {mode === 0
          ? '拖动 θ 观察投影颜色变化：绿=正功，红=负功，灰=不做功'
          : '观察支持力随 θ 变化，当 Fsinθ≥mg 时滑块脱地'}
      </p>
    </div>
  )
}

export default WorkSidebar
