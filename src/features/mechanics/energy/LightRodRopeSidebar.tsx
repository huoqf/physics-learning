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
          { value: 1, label: '柔性轻绳连接' },
        ]}
        value={constraint}
        onChange={handleConstraintChange}
        disabled={disabled}
      />

      <div className="flex flex-col gap-3 mt-1">
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
          : '柔性轻绳：由于轻绳只在拉直时提供沿绳径向的拉力，且无法提供非径向力，绳对两球做功为 0。两球退化为独立的单摆，各自机械能守恒，轻绳上无能量传输粒子。'}
      </p>
    </div>
  )
}

export default LightRodRopeSidebar
