import type { PhysicsPanelData, PhysicsQuantity, ParamDefs, Formula, GaokaoPoint } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY, precomputeObliqueThrowWithDrag } from '../../../physics'
import { interpolateTrajectoryPoint } from '../../../utils/trajectory'

interface Params {
  v0: number
  angle: number
  g: number
  airResistance: number
  advancedMode: number
}

const DEFAULTS: ParamDefs<Params> = {
  v0: { default: 20 },
  angle: { default: 45 },
  g: { default: GRAVITY },
  airResistance: { default: 0 },
  advancedMode: { default: 0 },
}

export function handleObliqueThrow(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-oblique-throw') return null
  const p = normalizeParams(params, DEFAULTS)

  const v0 = p.v0 ?? 20
  const angle = p.angle ?? 45
  const g = p.g ?? GRAVITY
  const advancedMode = p.advancedMode ?? 0
  const airResistance = advancedMode === 1 ? (p.airResistance ?? 0) : 0

  const result = precomputeObliqueThrowWithDrag(v0, angle, g, airResistance)
  const isLanded = time >= result.groundTime && result.groundTime > 0
  const effectiveTime = isLanded ? result.groundTime : Math.max(time, 0)

  const currentPt = interpolateTrajectoryPoint(result.points, effectiveTime)

  const speedAngleDeg = (Math.atan2(currentPt.vy, currentPt.vx) * 180) / Math.PI
  const dispAngleDeg = currentPt.x > 1e-4 ? (Math.atan2(currentPt.y, currentPt.x) * 180) / Math.PI : angle

  const tanSpeed = Math.tan((speedAngleDeg * Math.PI) / 180)
  const tanDisp = Math.tan((dispAngleDeg * Math.PI) / 180)
  const tanRatio = Math.abs(tanDisp) > 1e-4 ? tanSpeed / tanDisp : 2

  const quantities: PhysicsQuantity[] = [
    ...base,
    { label: '水平分速度 vₓ', value: `${currentPt.vx.toFixed(2)} m/s`, unit: '' },
    { label: '竖直分速度 vᵧ', value: `${currentPt.vy.toFixed(2)} m/s`, unit: '' },
    { label: '实时速度 v', value: `${currentPt.v.toFixed(2)} m/s (偏角 ${speedAngleDeg.toFixed(1)}°)`, unit: '' },
    { label: '水平位移 x', value: `${currentPt.x.toFixed(2)} m`, unit: '' },
    { label: '竖直高度 y', value: `${currentPt.y.toFixed(2)} m`, unit: '' },
    { label: '最大高度 Hmax', value: `${result.maxHeight.toFixed(2)} m`, unit: '' },
    { label: '水平射程 X', value: `${result.range.toFixed(2)} m`, unit: '' },
    { label: '速度/位移偏角正切比', value: airResistance === 0 ? `${tanRatio.toFixed(2)} (tanθ = 2tanα)` : '受空气阻力影响', unit: '' },
  ]

  const formulas: Formula[] = airResistance > 0 ? [
    { name: '水平方向阻力运动', latex: 'a_x = -\\frac{k}{m} v v_x', level: 'supplementary', condition: '二次阻力模型' },
    { name: '竖直方向阻力运动', latex: 'a_y = -g - \\frac{k}{m} v v_y', level: 'supplementary', condition: '二次阻力模型' },
  ] : [
    { name: '速度偏角与位移偏角定理', latex: '\\tan\\theta = 2\\tan\\alpha', level: 'core', condition: '斜抛/平抛通用大杀器' },
    { name: '最大水平射程公式', latex: 'X = \\frac{v_0^2 \\sin 2\\theta}{g}', level: 'core', condition: 'θ = 45° 时最大' },
    { name: '最大射高公式', latex: 'H = \\frac{(v_0 \\sin\\theta)^2}{2g}', level: 'core' },
    { name: '飞行总时间', latex: 'T = \\frac{2v_0 \\sin\\theta}{g}', level: 'important' },
    { name: '水平与竖直分运动', latex: 'x = v_0 \\cos\\theta \\cdot t, \\quad y = v_0 \\sin\\theta \\cdot t - \\frac{1}{2}gt^2', level: 'core' },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    { text: '【偏角中点定理】在无阻力斜抛/平抛中，速度偏角正切值恒等于位移偏角正切值的 2 倍 (tanθ = 2tanα)，速度延长线必平分水平位移。', importance: 'core' },
    { text: '【射程与互余角】初速度一定时，抛射角 θ = 45° 水平射程最大 (X_max = v₀²/g)；互为余角的抛射角（如 30° 与 60°）水平射程完全相等。', importance: 'gaokao' },
    { text: '【最高点特征】最高点竖直分速度 v_y = 0，但合速度不为零，等于水平分速度 (v_top = v₀ cosθ)。', importance: 'core' },
    { text: '【运动对称性与等时性】轨迹关于过最高点的竖直线对称；上升阶段与下降阶段经过同一高度时速度大小相等，方向关于竖直方向对称。', importance: 'hard' },
  ]

  return { quantities, formulas, gaokaoPoints }
}
