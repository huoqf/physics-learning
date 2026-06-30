import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'

export function MomentumTheoremDefs() {
  return (
    <defs>
      <radialGradient id="steel-sphere-grad-mt" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
        <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
        <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
        <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
      </radialGradient>
      <linearGradient id="fluid-grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={PHYSICS_COLORS.velocity} stopOpacity="0.6" />
        <stop offset="100%" stopColor={PHYSICS_COLORS.velocity} stopOpacity="0.3" />
      </linearGradient>
      {/* 缓冲垫立体渐变填充，基于 colors.ts 中代表弹力的弹性支持力色 */}
      <linearGradient id="cushion-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PHYSICS_COLORS.elasticForce} stopOpacity="0.75" />
        <stop offset="100%" stopColor={PHYSICS_COLORS.elasticForce} stopOpacity="0.25" />
      </linearGradient>
      {/* 金属零件立体反射渐变，严格使用 SCENE_COLORS */}
      <linearGradient id="metal-grad-mt" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
        <stop offset="35%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
        <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
      </linearGradient>
    </defs>
  )
}
