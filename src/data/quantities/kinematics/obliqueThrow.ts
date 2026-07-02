import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY, precomputeObliqueThrowWithDrag } from '../../../physics'
import { interpolateTrajectoryPoint } from '../../../utils/trajectory'

interface Params {
  v0: number
  angle: number
  g: number
  airResistance: number
}

const DEFAULTS: ParamDefs<Params> = {
  v0: { default: 15 },
  angle: { default: 45 },
  g: { default: GRAVITY },
  airResistance: { default: 0 },
}

export function handleObliqueThrow(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-oblique-throw') return null
  const p = normalizeParams(params, DEFAULTS)

  const v0 = p.v0 ?? 15
  const angle = p.angle ?? 45
  const g = p.g ?? GRAVITY
  const airResistance = p.airResistance ?? 0

  const result = precomputeObliqueThrowWithDrag(v0, angle, g, airResistance)
  const isLanded = time >= result.groundTime && result.groundTime > 0
  const effectiveTime = isLanded ? result.groundTime : Math.max(time, 0)

  const currentPt = interpolateTrajectoryPoint(result.points, effectiveTime)

  const angleDeg = (Math.atan2(currentPt.vy, currentPt.vx) * 180) / Math.PI

  const quantities = [
    ...base,
    { label: '水平位移 x', value: currentPt.x.toFixed(2), unit: 'm' },
    { label: '竖直高度 y', value: currentPt.y.toFixed(2), unit: 'm' },
    { label: '实时速度 v', value: `${currentPt.v.toFixed(2)} m/s (偏角 ${angleDeg.toFixed(1)}°)`, unit: '' },
  ]

  const formulas: import('../types').Formula[] = airResistance > 0 ? [
    { name: '水平方向阻力运动', latex: 'a_x = -\\frac{k}{m} v v_x', level: 'supplementary', condition: '二次阻力模型' },
    { name: '竖直方向阻力运动', latex: 'a_y = -g - \\frac{k}{m} v v_y', level: 'supplementary', condition: '二次阻力模型' },
  ] : [
    { name: '水平匀速运动', latex: 'x = v_0 \\cos\\theta \\cdot t', level: 'core' },
    { name: '竖直上抛运动', latex: 'y = v_0 \\sin\\theta \\cdot t - \\frac{1}{2}gt^2', level: 'core', condition: '忽略空气阻力' },
    { name: '速度合成关系', latex: 'v = \\sqrt{v_x^2 + v_y^2}', level: 'important' },
  ]

  const gaokaoPoints: import('../types').GaokaoPoint[] = [
    { text: '最高点速度不为零：竖直分速度为零，合速度等于水平分速度，在真空斜抛中为 v₀ cosθ。', importance: 'core' as const },
    { text: '最大射程与射高：在真空斜抛中，当抛射角 θ = 45° 时水平射程最大；射高最大时需要 θ = 90°（即竖直上抛）。', importance: 'gaokao' as const },
    { text: '对称性：真空斜抛运动轨迹是抛物线，关于过最高点的竖直线对称；上升阶段和下落阶段通过同一高度处的速度大小相等。', importance: 'hard' as const },
  ]

  return { quantities, formulas, gaokaoPoints }
}
