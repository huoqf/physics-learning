import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY } from '../../../physics'

interface Params {
  modelType: number
  analysisView: number
  activeObject: number
  m1: number
  m2: number
  F: number
  theta: number
  mu: number
}

const DEFAULTS: ParamDefs<Params> = {
  modelType: { default: 0 },
  analysisView: { default: 0 },
  activeObject: { default: 0 },
  m1: { default: 2 },
  m2: { default: 4 },
  F: { default: 15 },
  theta: { default: 30 },
  mu: { default: 0.15 },
}

export function handleSystemIsolated(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-system-isolated') return null
  const p = normalizeParams(params, DEFAULTS)

  const modelType = p.modelType ?? 0
  const analysisView = p.analysisView ?? 0
  const activeObject = p.activeObject ?? 0
  const m1 = p.m1 ?? 2
  const m2 = p.m2 ?? 4
  const F = p.F ?? 15
  const thetaDeg = p.theta ?? 30
  const mu = p.mu ?? 0.15

  const g = GRAVITY
  const theta = (thetaDeg * Math.PI) / 180

  const quantities: PhysicsQuantity[] = [...base]
  const formulas: Formula[] = []
  const gaokaoPoints: GaokaoPoint[] = []

  // ------------------ 模型 0: 水平同加速连接体 (拉车) ------------------
  if (modelType === 0) {
    const f1Max = mu * m1 * g
    const f2Max = mu * m2 * g
    const totalFrictionMax = f1Max + f2Max
    const isMoving = F > totalFrictionMax
    const totalMass = m1 + m2
    const acceleration = isMoving ? (F - totalFrictionMax) / totalMass : 0
    const tension = isMoving ? (m1 * F) / totalMass : (m1 / totalMass) * F // 静态或动态展示值

    const currentA = time > 0 ? acceleration : 0
    const currentT = time > 0 ? tension : tension

    if (analysisView === 0) {
      quantities.push(
        { label: '系统加速度 a', value: currentA.toFixed(2), unit: 'm/s²', highlight: currentA > 0 ? 'positive' : undefined },
        { label: '整体受外拉力 F', value: F.toFixed(0), unit: 'N' },
        { label: '整体合摩擦力 f_合', value: (f1Max + f2Max).toFixed(1), unit: 'N' }
      )
      formulas.push({ name: '① 整体牛二定律', latex: 'F - (f_1 + f_2) = (m_1 + m_2)a', level: 'core' })
    } else {
      if (activeObject === 0) {
        quantities.push(
          { label: '系统加速度 a', value: currentA.toFixed(2), unit: 'm/s²', highlight: currentA > 0 ? 'positive' : undefined },
          { label: 'm₁ 受到拉力 T', value: currentT.toFixed(1), unit: 'N', highlight: 'positive' },
          { label: 'm₁ 摩擦力 f₁', value: f1Max.toFixed(1), unit: 'N' }
        )
        formulas.push({ name: '① 隔离 m₁ 方程', latex: 'T - f_1 = m_1 a', level: 'core' })
      } else {
        quantities.push(
          { label: '系统加速度 a', value: currentA.toFixed(2), unit: 'm/s²', highlight: currentA > 0 ? 'positive' : undefined },
          { label: 'm₂ 受到绳拉力 T', value: currentT.toFixed(1), unit: 'N', highlight: 'positive' },
          { label: 'm₂ 摩擦力 f₂', value: f2Max.toFixed(1), unit: 'N' },
          { label: '外拉力 F', value: F.toFixed(0), unit: 'N' }
        )
        formulas.push({ name: '① 隔离 m₂ 方程', latex: 'F - T - f_2 = m_2 a', level: 'core' })
      }
      formulas.push({
        name: '内力分担定理',
        latex: 'T = \\frac{m_1}{m_1 + m_2}F',
        level: 'important',
        condition: '同材质面上共同滑动时',
        note: '内力大小与动摩擦因数μ完全无关'
      })
    }

    gaokaoPoints.push(
      { text: '整体法与隔离法：求解系统加速度优先用整体法，求解内力必须隔离。', importance: 'core' },
      { text: '分担定理结论：在同材质面上共同滑动时，绳/弹簧拉力 T = m₁F/(m₁+m₂)，与摩擦系数 μ 无关。', importance: 'gaokao' },
      { text: '起动临界：外拉力 F 必须大于最大静摩擦力之和 μ(m₁+m₂)g 才能使系统起动。', importance: 'hard' }
    )
  }

  // ------------------ 模型 1: 静力学叠放平衡 (推斜面) ------------------
  else if (modelType === 1) {
    const N_ground = (m1 + m2) * g
    const f_ground = F // 地面摩擦力平衡外力 F
    const N_slope = m1 * g * Math.cos(theta)
    const f_slope = m1 * g * Math.sin(theta) // 沿斜面向上，平衡重力分力

    if (analysisView === 0) {
      quantities.push(
        { label: '系统状态', value: '静力平衡', unit: '' },
        { label: '地面支持力 N_地', value: N_ground.toFixed(1), unit: 'N', highlight: 'positive' },
        { label: '地面静摩擦力 f_地', value: f_ground.toFixed(1), unit: 'N' }
      )
      formulas.push(
        { name: '① 整体水平平衡', latex: 'F - f_{\\text{地}} = 0 \\implies f_{\\text{地}} = F', level: 'core' },
        { name: '② 整体竖直平衡', latex: 'N_{\\text{地}} - (M + m)g = 0 \\implies N_{\\text{地}} = (M + m)g', level: 'core' }
      )
    } else {
      if (activeObject === 0) {
        quantities.push(
          { label: '滑块受支持力 N', value: N_slope.toFixed(1), unit: 'N', highlight: 'positive' },
          { label: '滑块受静摩擦力 f', value: f_slope.toFixed(1), unit: 'N' }
        )
        formulas.push(
          { name: '① 滑块垂直斜面平衡', latex: 'N = mg \\cos\\theta', level: 'core' },
          { name: '② 滑块平行斜面平衡', latex: 'f = mg \\sin\\theta', level: 'core' }
        )
      } else {
        quantities.push(
          { label: '滑块对斜面压力 N\'', value: N_slope.toFixed(1), unit: 'N' },
          { label: '滑块对斜面摩擦力 f\'', value: f_slope.toFixed(1), unit: 'N' },
          { label: '地面支持力 N_地', value: N_ground.toFixed(1), unit: 'N', highlight: 'positive' },
          { label: '地面静摩擦力 f_地', value: f_ground.toFixed(1), unit: 'N' }
        )
        formulas.push(
          { name: '① 斜面水平平衡', latex: 'F - N\'\\sin\\theta + f\'\\cos\\theta - f_{\\text{地}} = 0', level: 'core' },
          { name: '② 斜面竖直平衡', latex: 'N_{\\text{地}} - Mg - N\'\\cos\\theta - f\'\\sin\\theta = 0', level: 'core' }
        )
      }
    }

    gaokaoPoints.push(
      { text: '整体法受力化简：在静力学中，若两物体均处于静止，求地面的支持力和摩擦力时，应优先使用整体法。', importance: 'core' },
      { text: '内力抵消特性：整体法中，系统内部各物体之间的弹力与静摩擦力（如滑块与斜面间的 N 和 f）作为内力，自动成对抵消，无需分析。', importance: 'gaokao' },
      { text: '隔离法计算接触力：若题目询问物体间的接触面作用力，则必须使用隔离法。', importance: 'hard' }
    )
  }

  // ------------------ 模型 2: 系统牛顿第二定律 (斜面下滑) ------------------
  else if (modelType === 2) {
    const hasMotion = Math.sin(theta) > mu * Math.cos(theta)
    const acceleration = hasMotion ? g * (Math.sin(theta) - mu * Math.cos(theta)) : 0

    const ax = acceleration * Math.cos(theta)
    const ay = acceleration * Math.sin(theta) // 向下

    const f_ground = m1 * ax
    const N_ground = (m1 + m2) * g - m1 * ay

    const N_slope = m1 * g * Math.cos(theta)
    const f_slope = hasMotion ? mu * m1 * g * Math.cos(theta) : m1 * g * Math.sin(theta)

    const currentA = time > 0 ? acceleration : 0
    const currentAy = time > 0 ? ay : 0
    const currentF_ground = time > 0 ? f_ground : 0
    const currentN_ground = time > 0 ? N_ground : (m1 + m2) * g

    if (analysisView === 0) {
      quantities.push(
        { label: '滑块加速度 a', value: currentA.toFixed(2), unit: 'm/s²', highlight: currentA > 0 ? 'positive' : undefined },
        { label: '地面支持力 N_地', value: currentN_ground.toFixed(1), unit: 'N', highlight: currentAy > 0 ? 'extreme' : undefined },
        { label: '地面静摩擦力 f_地', value: currentF_ground.toFixed(1), unit: 'N' },
        { label: '系统整体状态', value: currentAy > 0 ? '失重状态' : '静平衡', unit: '' }
      )
      formulas.push(
        { name: '① 水平系统牛二', latex: 'f_{\\text{地}} = m a_x = m a \\cos\\theta', level: 'core' },
        { name: '② 竖直系统牛二', latex: '(M + m)g - N_{\\text{地}} = m a_y \\implies N_{\\text{地}} = (M+m)g - m a \\sin\\theta', level: 'core' }
      )
    } else {
      if (activeObject === 0) {
        quantities.push(
          { label: '滑块加速度 a', value: currentA.toFixed(2), unit: 'm/s²', highlight: currentA > 0 ? 'positive' : undefined },
          { label: '斜面对滑块支持力 N', value: N_slope.toFixed(1), unit: 'N', highlight: 'positive' },
          { label: '斜面给摩擦力 f', value: f_slope.toFixed(1), unit: 'N' }
        )
        formulas.push(
          { name: '① 沿斜面方向牛二', latex: 'mg \\sin\\theta - f = m a', level: 'core' },
          { name: '② 垂直斜面方向平衡', latex: 'N = mg \\cos\\theta', level: 'core' }
        )
      } else {
        quantities.push(
          { label: '滑块对斜面压力 N\'', value: N_slope.toFixed(1), unit: 'N' },
          { label: '滑块对斜面摩擦力 f\'', value: f_slope.toFixed(1), unit: 'N' },
          { label: '地面支持力 N_地', value: currentN_ground.toFixed(1), unit: 'N', highlight: currentAy > 0 ? 'extreme' : undefined },
          { label: '地面静摩擦力 f_地', value: currentF_ground.toFixed(1), unit: 'N' }
        )
        formulas.push(
          { name: '① 斜面水平平衡', latex: 'f_{\\text{地}} = N\'\\sin\\theta - f\'\\cos\\theta', level: 'core' },
          { name: '② 斜面竖直平衡', latex: 'N_{\\text{地}} = Mg + N\'\\cos\\theta + f\'\\sin\\theta', level: 'core' }
        )
      }
    }

    gaokaoPoints.push(
      { text: '系统牛顿第二定律：当系统内部各物体加速度不同时，也可使用整体受力分析。系统合外力等于各物体质量与其加速度乘积的矢量和。', importance: 'core' },
      { text: '超重与失重整体性：若系统内部分物体存在竖直向下的加速度分量 ay ↓，则整体失重，地面支持力小于总重力：FN = (M+m)g - m*ay。', importance: 'gaokao' },
      { text: '秒杀高考多选：求解下滑斜面体的地面摩擦力时，系统牛二定律水平方向 f_地 = m*a*cosθ 可实现 10 秒解题。', importance: 'hard' }
    )
  }

  return { quantities, formulas, gaokaoPoints }
}
