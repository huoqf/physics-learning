import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY, calculateEquilibriumTension, calculateOrthogonalDecomposition } from '../../../physics'

interface Params {
  m: number
  theta1: number
  theta2: number
  mode: number
}

const DEFAULTS: ParamDefs<Params> = {
  m: { default: 2.0 },
  theta1: { default: 45 },
  theta2: { default: 45 },
  mode: { default: 0 },
}

export function handleEquilibrium(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-equilibrium') return null
  const p = normalizeParams(params, DEFAULTS)

  const m = p.m ?? 2.0
  const theta1 = p.theta1 ?? 45
  const theta2 = p.theta2 ?? 45
  const mode = p.mode ?? 0
  const g = GRAVITY
  const gravity = m * g

  const { t1, t2 } = calculateEquilibriumTension(m, theta1, theta2, g)

  const isOverloaded = t1 > 35 || t2 > 35
  const isBroken = t1 > 50 || t2 > 50

  const quantities: PhysicsQuantity[] = [...base]

  if (isBroken) {
    quantities.push(
      { label: '绳 1 状态', value: t1 > 50 ? '已拉断' : '受力中', unit: '' },
      { label: '绳 2 状态', value: t2 > 50 ? '已拉断' : '受力中', unit: '' },
      { label: '拉力 T₁', value: t1 > 50 ? 0 : t1.toFixed(1), unit: 'N' },
      { label: '拉力 T₂', value: t2 > 50 ? 0 : t2.toFixed(1), unit: 'N' }
    )
  } else {
    if (mode === 2) {
      const { fx: t1x, fy: t1y } = calculateOrthogonalDecomposition(t1, theta1)
      const { fx: t2x, fy: t2y } = calculateOrthogonalDecomposition(t2, theta2)
      quantities.push(
        { label: 'T₁ 水平分力 T1x', value: t1x.toFixed(1), unit: 'N' },
        { label: 'T₂ 水平分量 T2x', value: t2x.toFixed(1), unit: 'N' },
        { label: 'T₁ 竖直分量 T1y', value: t1y.toFixed(1), unit: 'N' },
        { label: 'T₂ 竖直分量 T2y', value: t2y.toFixed(1), unit: 'N' },
        { label: 'x轴合力 ΣFx', value: (t2x - t1x).toFixed(2), unit: 'N', highlight: 'zero' as const },
        { label: 'y轴合力 ΣFy', value: (t1y + t2y - gravity).toFixed(2), unit: 'N', highlight: 'zero' as const }
      )
    } else if (mode === 1) {
      quantities.push(
        { label: '拉力 T₁', value: t1.toFixed(1), unit: 'N', highlight: isOverloaded ? 'extreme' as const : undefined },
        { label: '拉力 T₂', value: t2.toFixed(1), unit: 'N', highlight: isOverloaded ? 'extreme' as const : undefined },
        { label: '等效合力 F合', value: gravity.toFixed(1), unit: 'N', highlight: 'positive' as const }
      )
    } else {
      quantities.push(
        { label: '拉力 T₁', value: t1.toFixed(1), unit: 'N', highlight: isOverloaded ? 'extreme' as const : undefined },
        { label: '拉力 T₂', value: t2.toFixed(1), unit: 'N', highlight: isOverloaded ? 'extreme' as const : undefined }
      )
    }
  }

  let formulas: Formula[] = [
    { name: '水平方向平衡', latex: 'T_1 \\cos\\theta_1 = T_2 \\cos\\theta_2', level: 'core', condition: '共点力平衡' },
    { name: '竖直方向平衡', latex: 'T_1 \\sin\\theta_1 + T_2 \\sin\\theta_2 = mg', level: 'core', condition: '共点力平衡' }
  ]
  let gaokaoPoints: GaokaoPoint[] = [
    { text: '共点力平衡条件为物体所受合外力为零，即 ΣFx = 0, ΣFy = 0。', importance: 'core' as const },
    { text: '两挂绳夹角趋近于 180° 时，张力趋于无穷大，极易拉断。', importance: 'hard' as const }
  ]

  if (isBroken) {
    formulas = [
      { name: '单摆阻尼方程', latex: '\\theta\'\' + \\gamma \\theta\' + \\frac{g}{L}\\sin\\theta = 0', level: 'supplementary' }
    ]
    gaokaoPoints = [
      { text: '轻绳的最大耐受拉力即为高考受力分析中的临界平衡条件。', importance: 'hard' as const },
      { text: '一绳断裂后，重物做单摆阻尼运动，最终平衡点移至挂点正下方。', importance: 'core' as const }
    ]
  } else if (mode === 1) {
    formulas = [
      { name: '力的平行四边形定则', latex: 'F_{\\text{合}} = \\sqrt{T_1^2 + T_2^2 + 2T_1T_2\\cos(\\theta_1+\\theta_2)}', level: 'core' }
    ]
    gaokaoPoints = [
      { text: '平行四边形定则是矢量运算规律，合力随两力夹角增大而减小。', importance: 'gaokao' as const },
      { text: '合力与分力为"等效替代"关系，大小范围为 |T₁-T₂| ≤ F ≤ T₁+T₂。', importance: 'core' as const }
    ]
  } else if (mode === 2) {
    formulas = [
      { name: '正交分解水平分量', latex: 'T_x = T \\cos\\theta', level: 'core' },
      { name: '正交分解竖直分量', latex: 'T_y = T \\sin\\theta', level: 'core' }
    ]
    gaokaoPoints = [
      { text: '正交分解法常用于复杂受力，可将矢量运算化为代数运算。', importance: 'gaokao' as const },
      { text: '建系原则：应使尽可能多的力落在轴上，以简化正交方程。', importance: 'core' as const }
    ]
  } else if (mode === 3) {
    formulas = [
      { name: '正弦定理形式', latex: '\\frac{T_1}{\\sin(90^\\circ-\\theta_2)} = \\frac{T_2}{\\sin(90^\\circ-\\theta_1)} = \\frac{mg}{\\sin(\\theta_1+\\theta_2)}', level: 'important', condition: '三力平衡' }
    ]
    gaokaoPoints = [
      { text: '三力平衡首尾相接必构成封闭三角形，常用于力的定性分析。', importance: 'hard' as const },
      { text: '高考动态平衡压轴题中，力的封闭三角形图解法是突破核心。', importance: 'gaokao' as const }
    ]
  }

  return { quantities, formulas, gaokaoPoints }
}
