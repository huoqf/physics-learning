import type { FC } from 'react'
import { SegmentedControl, ToggleSwitch } from '@/components/UI'
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
  const constraint = params.constraint ?? 0 // 0=刚性杆, 1=柔性绳
  const showParticles = params.showParticles !== 0 // 默认开启粒子 (1)
  const showGravity = params.showGravity !== 0
  const showTension = params.showTension !== 0
  const showResolution = params.showResolution !== 0

  const handleConstraintChange = (value: number | string) => {
    updateParam('constraint', value as number)
    animationActions.resetAnimation() // 拓扑结构突变，重置动画
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      <SegmentedControl
        label="连接约束拓扑"
        options={[
          { value: 0, label: '刚性轻杆连接' },
          { value: 1, label: '双绳分系两球' },
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
          disabled={disabled || constraint === 1}
        />
        <ToggleSwitch
          label="能量流向粒子特效"
          checked={showParticles}
          onChange={(checked) => updateParam('showParticles', checked ? 1 : 0)}
          disabled={disabled || constraint === 1} // 柔性绳下禁用粒子开关
        />
      </div>

      <p className="text-[10px] text-neutral-400 leading-normal">
        {constraint === 0
          ? '刚性轻杆：两球被强约束在同轴转动上，速度比始终满足 v_B = 2v_A。在摆动过程中，杆对 B 做正功、对 A 做负功，能量通过轻杆发生转移，个体机械能不守恒，但系统机械能守恒。'
          : '双绳分系两球：两球分别通过独立轻绳悬挂于同一点，退化为独立的摆系统。当摆动至高处绳张力为零时绳会松弛，小球脱离圆周轨道做抛体运动；绳再次拉直时发生完全非弹性约束冲击，径向相对速度被消除，径向动能发生突变损失。'}
      </p>
    </div>
  )
}

export default LightRodRopeSidebar
