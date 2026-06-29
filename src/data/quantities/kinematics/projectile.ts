import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY, precomputeProjectileWithDrag } from '../../../physics'
import { interpolateTrajectoryPoint } from '../../../utils/trajectory'

interface Params {
  v0x: number
  g: number
  airResistance: number
}

const DEFAULTS: ParamDefs<Params> = {
  v0x: { default: 10 },
  g: { default: GRAVITY },
  airResistance: { default: 0 },
}

export function handleProjectile(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-projectile') return null
  const p = normalizeParams(params, DEFAULTS)

  const v0x = p.v0x ?? 10
  const g = p.g ?? GRAVITY
  const airResistance = p.airResistance ?? 0
  const PHYSICS_HEIGHT = 10.0

  const result = precomputeProjectileWithDrag(v0x, g, airResistance, PHYSICS_HEIGHT)
  const isLanded = time >= result.groundTime && result.groundTime > 0
  const effectiveTime = isLanded ? result.groundTime : Math.max(time, 0)

  const currentPt = interpolateTrajectoryPoint(result.points, effectiveTime)

  const angleDeg = (Math.atan2(Math.abs(currentPt.vy), currentPt.vx) * 180) / Math.PI

  const quantities = [
    ...base,
    { label: '水平位移 x', value: currentPt.x.toFixed(2), unit: 'm' },
    { label: '下落高度 y', value: Math.abs(currentPt.y).toFixed(2), unit: 'm' },
    { label: '实时速度 v', value: `${currentPt.v.toFixed(2)} m/s (偏角 ${angleDeg.toFixed(1)}°)`, unit: '' },
  ]

  const formulas: import('../types').Formula[] = airResistance > 0 ? [
    { name: '水平方向阻力运动', latex: 'a_x = -\\frac{k}{m} v v_x', level: 'supplementary', condition: '二次阻力模型' },
    { name: '竖直方向阻力运动', latex: 'a_y = -g - \\frac{k}{m} v v_y', level: 'supplementary', condition: '二次阻力模型' },
  ] : [
    { name: '水平匀速运动', latex: 'x = v_{0x} t', level: 'core' },
    { name: '竖直自由落体', latex: 'y = \\frac{1}{2}gt^2', level: 'core', condition: '忽略空气阻力' },
    { name: '速度合成关系', latex: 'v = \\sqrt{v_x^2 + v_y^2}', level: 'important' },
  ]

  const gaokaoPoints: import('../types').GaokaoPoint[] = [
    { text: '运动的等时性：水平分运动与竖直分运动具有完全相同的运动时间。', importance: 'core' as const },
    { text: '速度偏角与位移偏角关系：在真空平抛中，\\tan\\theta = 2\\tan\\alpha（\\theta为速度与水平夹角，\\alpha为位移与水平夹角）。', importance: 'gaokao' as const },
    { text: '速度变化量：在真空平抛中，任意相等时间间隔内速度变化量 \\Delta\\vec{v} 恒等于 g\\Delta t，方向始终竖直向下。', importance: 'hard' as const },
  ]

  return { quantities, formulas, gaokaoPoints }
}
