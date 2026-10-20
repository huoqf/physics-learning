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

  // 斜抛的偏角关系是 tanθ = 2tanα − tanθ₀，只有平抛（θ₀ = 0）才退化为 tanθ = 2tanα。
  // 旧实现把平抛特例当成"斜抛/平抛通用大杀器"，并且展示 tanθ/tanα 这个比值——
  // t = 0 时位移偏角未定义（0/0），被兜底成抛射角后比值恒显示 1.00，
  // 与旁边标注的 2tanα 自相矛盾。改为直接给出恒等关系残差。
  const tanSpeed = Math.tan((speedAngleDeg * Math.PI) / 180)
  const tanLaunch = Math.tan((angle * Math.PI) / 180)
  const hasDisp = Math.abs(currentPt.x) > 1e-4
  const dispAngleDeg = hasDisp ? (Math.atan2(currentPt.y, currentPt.x) * 180) / Math.PI : 0
  const tanDisp = hasDisp ? Math.tan((dispAngleDeg * Math.PI) / 180) : 0
  // 无阻力时应恒为 0：学生可在任意时刻暂停，自行验证这条关系成立
  const angleIdentityResidual = tanSpeed + tanLaunch - 2 * tanDisp
  // 浮点误差会给出 -0.00，单独归一化，避免面板上出现负零
  const residualText = (Math.abs(angleIdentityResidual) < 0.005 ? 0 : angleIdentityResidual).toFixed(2)

  const quantities: PhysicsQuantity[] = [
    ...base,
    { label: '水平分速度 vₓ', value: `${currentPt.vx.toFixed(2)} m/s`, unit: '' },
    { label: '竖直分速度 vᵧ', value: `${currentPt.vy.toFixed(2)} m/s`, unit: '' },
    { label: '实时速度 v', value: `${currentPt.v.toFixed(2)} m/s (偏角 ${speedAngleDeg.toFixed(1)}°)`, unit: '' },
    { label: '水平位移 x', value: `${currentPt.x.toFixed(2)} m`, unit: '' },
    { label: '竖直高度 y', value: `${currentPt.y.toFixed(2)} m`, unit: '' },
    { label: '最大高度 Hmax', value: `${result.maxHeight.toFixed(2)} m`, unit: '' },
    { label: '水平射程 X', value: `${result.range.toFixed(2)} m`, unit: '' },
    {
      label: '偏角恒等关系',
      value: airResistance !== 0
        ? '受空气阻力影响，恒等关系失效'
        : hasDisp
          ? `tanθ = 2tanα − tanθ₀（残差 ${residualText}）`
          : 't = 0，位移偏角尚未定义',
      unit: '',
    },
  ]

  const formulas: Formula[] = airResistance > 0 ? [
    { name: '水平方向阻力运动', latex: 'a_x = -\\frac{k}{m} v v_x', level: 'supplementary', condition: '二次阻力模型' },
    { name: '竖直方向阻力运动', latex: 'a_y = -g - \\frac{k}{m} v v_y', level: 'supplementary', condition: '二次阻力模型' },
  ] : [
    { name: '速度偏角与位移偏角关系', latex: '\\tan\\theta = 2\\tan\\alpha - \\tan\\theta_0', level: 'core', condition: '斜抛通用；平抛（θ₀ = 0）时退化为 tanθ = 2tanα' },
    { name: '最大水平射程公式', latex: 'X = \\frac{v_0^2 \\sin 2\\theta}{g}', level: 'core', condition: 'θ = 45° 时最大' },
    { name: '最大射高公式', latex: 'H = \\frac{(v_0 \\sin\\theta)^2}{2g}', level: 'core' },
    { name: '飞行总时间', latex: 'T = \\frac{2v_0 \\sin\\theta}{g}', level: 'important' },
    { name: '水平与竖直分运动', latex: 'x = v_0 \\cos\\theta \\cdot t, \\quad y = v_0 \\sin\\theta \\cdot t - \\frac{1}{2}gt^2', level: 'core' },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    { text: '【偏角关系】无阻力斜抛中，速度偏角 θ、位移偏角 α 与抛射角 θ₀ 满足 tanθ = 2tanα − tanθ₀。只有平抛（θ₀ = 0）才退化为 tanθ = 2tanα、"速度反向延长线过水平位移中点"——把平抛结论直接搬到斜抛是常见失分点。', importance: 'core' },
    { text: '【射程与互余角】初速度一定时，抛射角 θ = 45° 水平射程最大 (X_max = v₀²/g)；互为余角的抛射角（如 30° 与 60°）水平射程完全相等。', importance: 'gaokao' },
    { text: '【最高点特征】最高点竖直分速度 v_y = 0，但合速度不为零，等于水平分速度 (v_top = v₀ cosθ)。', importance: 'core' },
    { text: '【运动对称性与等时性】轨迹关于过最高点的竖直线对称；上升阶段与下降阶段经过同一高度时速度大小相等，方向关于竖直方向对称。', importance: 'hard' },
  ]

  return { quantities, formulas, gaokaoPoints }
}
