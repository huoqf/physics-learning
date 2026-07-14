import { withAlpha } from '@/theme/physics'
import { COMMON_MATERIALS, SPHERE_COLORS } from '@/theme/physics/scene/materials'

export function CircularModelsDefs() {
  return (
    <defs>
      {/* 黄铜摆球径向渐变 */}
      <radialGradient id="brass-bob-grad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor={SPHERE_COLORS.pendulumBob.gradient[0]} />
        <stop offset="35%" stopColor={SPHERE_COLORS.pendulumBob.gradient[1]} />
        <stop offset="85%" stopColor={SPHERE_COLORS.pendulumBob.gradient[2]} />
        <stop offset="100%" stopColor={SPHERE_COLORS.pendulumBob.gradient[3]} />
      </radialGradient>
      {/* 木纹物块渐变 */}
      <linearGradient id="lab-wood-grad" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor={COMMON_MATERIALS.labWoodGrad[0]} />
        <stop offset="40%" stopColor={COMMON_MATERIALS.labWoodGrad[1]} />
        <stop offset="80%" stopColor={COMMON_MATERIALS.labWoodGrad[2]} />
        <stop offset="100%" stopColor={COMMON_MATERIALS.labWoodGrad[3]} />
      </linearGradient>
      {/* 立体不锈钢旋转轴渐变 */}
      <linearGradient id="shaft-grad" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor={COMMON_MATERIALS.sliderMetalGrad[3]} />
        <stop offset="30%" stopColor={COMMON_MATERIALS.sliderMetalGrad[0]} />
        <stop offset="60%" stopColor={COMMON_MATERIALS.sliderMetalGrad[1]} />
        <stop offset="100%" stopColor={COMMON_MATERIALS.sliderMetalGrad[2]} />
      </linearGradient>
      {/* 立体旋转圆盘顶面金属渐变 */}
      <linearGradient id="disk-top-grad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor={withAlpha(COMMON_MATERIALS.aluminumMetalGrad[0], 0.9)} />
        <stop offset="100%" stopColor={withAlpha(COMMON_MATERIALS.aluminumMetalGrad[2], 0.7)} />
      </linearGradient>
      {/* 立体旋转圆盘侧面金属渐变 */}
      <linearGradient id="disk-side-grad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor={COMMON_MATERIALS.aluminumMetalGrad[2]} />
        <stop offset="100%" stopColor={COMMON_MATERIALS.aluminumMetalGrad[3]} />
      </linearGradient>
    </defs>
  )
}
