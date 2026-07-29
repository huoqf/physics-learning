import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY } from '../../../physics'

interface Params {
  v0x: number
  g: number
  modelMode: number
  inclineAngle: number
  airResistance: number
}

const DEFAULTS: ParamDefs<Params> = {
  v0x: { default: 10 },
  g: { default: GRAVITY },
  modelMode: { default: 0 },
  inclineAngle: { default: 30 },
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
  const modelMode = p.modelMode ?? 0
  const inclineAngle = p.inclineAngle ?? 30

  const height = 10.0
  const groundTime = Math.sqrt((2 * height) / g)
  const phiRad = (inclineAngle * Math.PI) / 180
  const tanPhi = Math.tan(phiRad)
  const inclineT = Math.min((2 * v0x * tanPhi) / g, groundTime)

  const maxT = modelMode === 2 ? inclineT : groundTime
  const activeT = Math.min(Math.max(time, 0), maxT)

  const x = v0x * activeT
  const y = 0.5 * g * activeT * activeT
  const vx = v0x
  const vy = g * activeT
  const v = Math.sqrt(vx * vx + vy * vy)

  const tanAlpha = x > 1e-4 ? y / x : 0
  const tanTheta = vx > 1e-4 ? vy / vx : 0
  const alphaDeg = (Math.atan(tanAlpha) * 180) / Math.PI
  const thetaDeg = (Math.atan(tanTheta) * 180) / Math.PI

  const quantities: PhysicsQuantity[] = [
    ...base,
    { label: '水平位移 x', value: x.toFixed(2), unit: 'm' },
    { label: '下落高度 y', value: y.toFixed(2), unit: 'm' },
    { label: '实时合速度 v', value: v.toFixed(2), unit: 'm/s' },
    { label: '速度偏角 θ', value: `${thetaDeg.toFixed(1)}° (tanθ=${tanTheta.toFixed(2)})`, unit: '' },
    { label: '位移偏角 α', value: `${alphaDeg.toFixed(1)}° (tanα=${tanAlpha.toFixed(2)})`, unit: '' },
  ]

  if (modelMode === 1 && x > 1e-4) {
    quantities.push({
      label: '偏角比值 tanθ / tanα',
      value: (tanTheta / (tanAlpha || 1e-4)).toFixed(2),
      unit: '(恒等于2)',
    })
  }

  if (modelMode === 2) {
    const perpT = tanPhi > 0.01 ? v0x / (g * tanPhi) : 0
    quantities.push(
      { label: '斜面落点时间 t', value: inclineT.toFixed(2), unit: 's' },
      { label: '垂直击中斜面时刻 t⊥', value: perpT.toFixed(2), unit: 's' }
    )
  }

  const formulas: import('../types').Formula[] = [
    { name: '水平分运动', latex: 'x = v_{0x} t', level: 'core' },
    { name: '竖直分运动', latex: 'y = \\frac{1}{2}gt^2', level: 'core' },
    { name: '偏角核心二级结论', latex: '\\tan\\theta = 2\\tan\\alpha', level: 'important', condition: '速度反向延长线过水平位移中点' },
  ]

  if (modelMode === 2) {
    formulas.push(
      { name: '斜面平抛落点', latex: '\\tan\\phi = \\frac{y}{x} = \\frac{gt}{2v_{0x}}', level: 'core', condition: '落到斜面上' },
      { name: '垂直击中斜面', latex: '\\tan(90^\\circ - \\phi) = \\frac{v_y}{v_x} = \\frac{gt}{v_{0x}}', level: 'important', condition: '速度垂直斜面' }
    )
  }

  const gaokaoPoints: import('../types').GaokaoPoint[] = [
    { text: '运动的等时性与独立性：水平方向与竖直方向分运动互不干扰，运动时间统一由竖直下落高度 y 决定。', importance: 'core' as const },
    { text: '二级结论【中点定理】：速度偏角的正切值恒等于位移偏角正切值的 2 倍 (tanθ = 2tanα)；速度反向延长线必过水平位移的中点。', importance: 'gaokao' as const },
    { text: '斜面平抛突破法：物体落回斜面上时，位移矢量偏角等于斜面倾角 (tanα = tanφ)；当速度方向与斜面平行时，物体距离斜面最远。', importance: 'hard' as const },
  ]

  return { quantities, formulas, gaokaoPoints }
}
