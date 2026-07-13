import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint, ParamDefs } from '../types'
import { normalizeParams } from '../types'

interface Params {
  mode: number
  f1: number
  theta1: number
  f2: number
  theta2: number
  f3: number
  theta3: number
  axisAngle: number
  theta: number
  m: number
  axisSelect: number
}

const DEFAULTS: ParamDefs<Params> = {
  mode: { default: 0 },
  f1: { default: 10 },
  theta1: { default: 30 },
  f2: { default: 8 },
  theta2: { default: 120 },
  f3: { default: 6 },
  theta3: { default: 250 },
  axisAngle: { default: 0 },
  theta: { default: 30 },
  m: { default: 2.0 },
  axisSelect: { default: 0 },
}

export function handleOrthogonalDecomposition(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-orthogonal-decomposition') return null
  const p = normalizeParams(params, DEFAULTS)

  const mode = p.mode ?? 0
  const quantities: PhysicsQuantity[] = [...base]
  let formulas: Formula[] = []
  let gaokaoPoints: GaokaoPoint[] = []

  if (mode === 0) {
    // ==========================================
    // 模式 0：多力合成与建系优化
    // ==========================================
    const f1 = p.f1 ?? 10
    const theta1 = p.theta1 ?? 30
    const f2 = p.f2 ?? 8
    const theta2 = p.theta2 ?? 120
    const f3 = p.f3 ?? 6
    const theta3 = p.theta3 ?? 250
    const axisAngle = p.axisAngle ?? 0

    const axisAngleRad = (axisAngle * Math.PI) / 180

    const getFxPrime = (fVal: number, thetaDeg: number) => {
      const rad = (thetaDeg * Math.PI) / 180
      return fVal * Math.cos(rad - axisAngleRad)
    }

    const getFyPrime = (fVal: number, thetaDeg: number) => {
      const rad = (thetaDeg * Math.PI) / 180
      return fVal * Math.sin(rad - axisAngleRad)
    }

    // 计算分量
    const f1x = getFxPrime(f1, theta1)
    const f1y = getFyPrime(f1, theta1)
    const f2x = getFxPrime(f2, theta2)
    const f2y = getFyPrime(f2, theta2)
    const f3x = getFxPrime(f3, theta3)
    const f3y = getFyPrime(f3, theta3)

    // 代数和
    const sumFx = f1x + f2x + f3x
    const sumFy = f1y + f2y + f3y

    // 合力物理计算
    const rad1 = (theta1 * Math.PI) / 180
    const rad2 = (theta2 * Math.PI) / 180
    const rad3 = (theta3 * Math.PI) / 180
    const netX = f1 * Math.cos(rad1) + f2 * Math.cos(rad2) + f3 * Math.cos(rad3)
    const netY = f1 * Math.sin(rad1) + f2 * Math.sin(rad2) + f3 * Math.sin(rad3)
    const fNet = Math.sqrt(netX * netX + netY * netY)

    // 添加物理量展示
    quantities.push(
      { label: '坐标系旋转角 θ_axis', value: axisAngle.toFixed(0), unit: '°' },
      { label: 'F₁ 在 x\' 轴分量 F1x\'', value: f1x.toFixed(2), unit: 'N', color: '#3b82f6' },
      { label: 'F₁ 在 y\' 轴分量 F1y\'', value: f1y.toFixed(2), unit: 'N', color: '#3b82f6' },
      { label: 'F₂ 在 x\' 轴分量 F2x\'', value: f2x.toFixed(2), unit: 'N', color: '#10b981' },
      { label: 'F₂ 在 y\' 轴分量 F2y\'', value: f2y.toFixed(2), unit: 'N', color: '#10b981' },
      { label: 'F₃ 在 x\' 轴分量 F3x\'', value: f3x.toFixed(2), unit: 'N', color: '#f59e0b' },
      { label: 'F₃ 在 y\' 轴分量 F3y\'', value: f3y.toFixed(2), unit: 'N', color: '#f59e0b' },
      { label: 'x\' 轴代数合力 ΣFx\'', value: sumFx.toFixed(2), unit: 'N', highlight: Math.abs(sumFx) < 0.05 ? 'zero' : 'positive' },
      { label: 'y\' 轴代数合力 ΣFy\'', value: sumFy.toFixed(2), unit: 'N', highlight: Math.abs(sumFy) < 0.05 ? 'zero' : 'positive' },
      { label: '总合成合力 F_net', value: fNet.toFixed(2), unit: 'N', color: '#ef4444', highlight: 'extreme' }
    )

    formulas = [
      { name: '正交投影分量', latex: 'F_{ix\'} = F_i \\cos(\\theta_i - \\theta_{\\text{axis}})', level: 'core' },
      { name: 'x\'轴代数和', latex: '\\sum F_{x\'} = F_{1x\'} + F_{2x\'} + F_{3x\'}', level: 'core' },
      { name: 'y\'轴代数和', latex: '\\sum F_{y\'} = F_{1y\'} + F_{2y\'} + F_{3y\'}', level: 'core' },
      { name: '合力大小 (恒定不变)', latex: 'F_{\\text{net}} = \\sqrt{(\\sum F_{x\'})^2 + (\\sum F_{y\'})^2}', level: 'important' }
    ]

    gaokaoPoints = [
      { text: '正交分解法的灵魂是：无论怎么旋转直角坐标系，合成所得的总合力大小和绝对方向都是绝对守恒不变的。', importance: 'gaokao' },
      { text: '建系艺术：点击左侧“一键对齐”，观察当坐标轴与某一个力重合时，该力在另一个轴上的分量直接归 0，从而极大减少公式中的分解项。', importance: 'core' },
      { text: '正交分解法实现了将平面内复杂的矢量几何叠加，转化为两个垂直轴线上的代数求和。', importance: 'basic' }
    ]
  } else {
    // ==========================================
    // 模式 1：斜面平衡建系对比
    // ==========================================
    const theta = p.theta ?? 30
    const m = p.m ?? 2.0
    const axisSelect = p.axisSelect ?? 0

    const g = 9.8
    const slopeAngleRad = (theta * Math.PI) / 180
    const G = m * g
    const FN = G * Math.cos(slopeAngleRad)
    const f = G * Math.sin(slopeAngleRad)

    // 添加基本物理量
    quantities.push(
      { label: '重力大小 G (mg)', value: G.toFixed(2), unit: 'N', color: '#ef4444' },
      { label: '支持力大小 FN', value: FN.toFixed(2), unit: 'N', color: '#3b82f6' },
      { label: '摩擦力大小 f', value: f.toFixed(2), unit: 'N', color: '#10b981' }
    )

    if (axisSelect === 0) {
      // 方案A
      const Gx = G * Math.sin(slopeAngleRad)
      const Gy = G * Math.cos(slopeAngleRad)
      quantities.push(
        { label: '重力沿斜面分量 Gx\'', value: Gx.toFixed(2), unit: 'N', color: '#ef4444' },
        { label: '重力垂直斜面分量 Gy\'', value: (-Gy).toFixed(2), unit: 'N', color: '#ef4444' }
      )

      formulas = [
        { name: '重力沿斜面分量', latex: 'G_{x\'} = G \\sin\\theta', level: 'core' },
        { name: '重力垂直斜面分量', latex: 'G_{y\'} = G \\cos\\theta', level: 'core' },
        { name: '沿斜面平衡方程 (x\' 轴)', latex: 'f = G_{x\'} = G \\sin\\theta', level: 'important' },
        { name: '垂直斜面平衡方程 (y\' 轴)', latex: 'F_N = G_{y\'} = G \\cos\\theta', level: 'important' }
      ]
    } else {
      // 方案B
      const FNx = FN * Math.sin(slopeAngleRad)
      const FNy = FN * Math.cos(slopeAngleRad)
      const fx = f * Math.cos(slopeAngleRad)
      const fy = f * Math.sin(slopeAngleRad)

      quantities.push(
        { label: '支持力水平分量 FNx', value: FNx.toFixed(2), unit: 'N', color: '#3b82f6' },
        { label: '支持力竖直分量 FNy', value: FNy.toFixed(2), unit: 'N', color: '#3b82f6' },
        { label: '摩擦力水平分量 fx', value: (-fx).toFixed(2), unit: 'N', color: '#10b981' },
        { label: '摩擦力竖直分量 fy', value: fy.toFixed(2), unit: 'N', color: '#10b981' }
      )

      formulas = [
        { name: '支持力水平分解', latex: 'F_{Nx} = F_N \\sin\\theta', level: 'core' },
        { name: '支持力竖直分解', latex: 'F_{Ny} = F_N \\cos\\theta', level: 'core' },
        { name: '摩擦力水平分解', latex: 'f_x = f \\cos\\theta', level: 'core' },
        { name: '摩擦力竖直分解', latex: 'f_y = f \\sin\\theta', level: 'core' },
        { name: '水平平衡方程 (x 轴)', latex: 'F_N \\sin\\theta = f \\cos\\theta', level: 'important' },
        { name: '竖直平衡方程 (y 轴)', latex: 'F_N \\cos\\theta + f \\sin\\theta = G', level: 'important' }
      ]
    }

    gaokaoPoints = [
      { text: '方案 A（沿斜面建系）仅需分解重力一个力，平衡方程即解，是高考斜面力学题的极力推荐解法。', importance: 'gaokao' },
      { text: '方案 B（水平/竖直建系）重力无需分解，但FN与f都偏离坐标轴导致必须同时分解两个力，需要列二元方程组联立，计算极其冗余，高考中应避免。', importance: 'hard' },
      { text: '高考建系原则：建立直角坐标系应当以“被分解的力最少、且最不容易出错”为首要考量。', importance: 'core' }
    ]
  }

  return { quantities, formulas, gaokaoPoints }
}
