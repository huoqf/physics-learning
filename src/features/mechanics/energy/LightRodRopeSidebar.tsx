import type { FC } from 'react'
import { SegmentedControl, ToggleSwitch, LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

/**
 * 轻杆连接体模型侧边栏扩展
 */
const LightRodRopeSidebar: FC<SidebarExtraProps> = ({
  params,
  updateParam,
  animationActions,
  disabled,
}) => {
  const constraint = params.constraint ?? 0 // 0=刚性杆, 1=定滑轮绳, 2=轻绳三阶段
  const showParticles = params.showParticles !== 0
  const showGravity = params.showGravity !== 0
  const showTension = params.showTension !== 0
  const showResolution = params.showResolution !== 0
  const showVelocityDecomp = params.showVelocityDecomp !== 0

  const handleConstraintChange = (value: number | string) => {
    updateParam('constraint', value as number)
    animationActions.resetAnimation() // 拓扑结构突变，重置动画
  }

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <SegmentedControl
        label="连接约束拓扑"
        options={[
          { value: 0, label: '轻杆双球' },
          { value: 1, label: '定滑轮绳连' },
          { value: 2, label: '双绳串联' },
        ]}
        value={constraint}
        onChange={handleConstraintChange}
        disabled={disabled}
      />

      <div className="flex flex-col gap-3 mt-1">
        <ToggleSwitch
          label="显示重力矢量 G"
          checked={showGravity}
          onChange={(checked) => updateParam('showGravity', checked ? 1 : 0)}
          disabled={disabled}
        />
        <ToggleSwitch
          label="显示杆/绳拉力 F"
          checked={showTension}
          onChange={(checked) => updateParam('showTension', checked ? 1 : 0)}
          disabled={disabled}
        />
        <ToggleSwitch
          label="显示拉力分解 (径/切)"
          checked={showResolution}
          onChange={(checked) => updateParam('showResolution', checked ? 1 : 0)}
          disabled={disabled || constraint !== 0}
        />
        <ToggleSwitch
          label="能量流向粒子特效"
          checked={showParticles}
          onChange={(checked) => updateParam('showParticles', checked ? 1 : 0)}
          disabled={disabled || constraint !== 0}
        />
        {constraint === 2 && (
          <ToggleSwitch
            label="显示速度分解三角形"
            checked={showVelocityDecomp}
            onChange={(checked) => updateParam('showVelocityDecomp', checked ? 1 : 0)}
            disabled={disabled}
          />
        )}
      </div>
    </LeftPanelSection>
  )
}

export default LightRodRopeSidebar
