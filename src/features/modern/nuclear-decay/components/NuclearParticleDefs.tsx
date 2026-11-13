import { PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'

/**
 * 核粒子 SVG 渐变与阴影公共定义，供核衰变及磁场径迹场景共用
 */
export function NuclearParticleDefs() {
  return (
    <defs>
      <radialGradient id="protonGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor={withAlpha(PHYSICS_COLORS.positiveCharge, 0.6)} />
        <stop offset="40%" stopColor={PHYSICS_COLORS.positiveCharge} />
        <stop offset="85%" stopColor={PHYSICS_COLORS.forceArrowRed} />
        <stop offset="100%" stopColor={CANVAS_COLORS.dangerGradient} />
      </radialGradient>

      <radialGradient id="neutronGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor={withAlpha(PHYSICS_COLORS.negativeCharge, 0.6)} />
        <stop offset="40%" stopColor={PHYSICS_COLORS.negativeCharge} />
        <stop offset="85%" stopColor={withAlpha(PHYSICS_COLORS.appliedForce, 0.85)} />
        <stop offset="100%" stopColor={PHYSICS_COLORS.appliedForce} />
      </radialGradient>

      <radialGradient id="strongForceGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={CANVAS_COLORS.referencePoint} stopOpacity="0.4" />
        <stop offset="60%" stopColor={CANVAS_COLORS.referencePoint} stopOpacity="0.1" />
        <stop offset="100%" stopColor={CANVAS_COLORS.referencePoint} stopOpacity="0" />
      </radialGradient>

      <filter id="sphereShadow" x="-20%" y="-20%" width="150%" height="150%">
        <feDropShadow
          dx="1"
          dy="2"
          stdDeviation="1.5"
          floodColor={CANVAS_COLORS.black}
          floodOpacity="0.3"
        />
      </filter>
    </defs>
  )
}
