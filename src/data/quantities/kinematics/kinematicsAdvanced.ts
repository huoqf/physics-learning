import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { PHYSICS_COLORS } from '../../../theme/physics'

interface Params {
  v0: number
  a: number
  chartMode: number
}

const DEFAULTS: ParamDefs<Params> = {
  v0: { default: 4.0 },
  a: { default: 2.0 },
  chartMode: { default: 0 },
}

export function handleKinematicsAdvanced(
  animId: string,
  params: Record<string, number>,
  time: number,
  _base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-kinematics-advanced') return null
  const p = normalizeParams(params, DEFAULTS)

  const v0 = p.v0 ?? 4.0
  const a = p.a ?? 2.0
  const chartMode = p.chartMode ?? 0

  const isBraking = a < 0
  const tBrake = isBraking ? -v0 / a : Infinity
  const isStopped = time >= tBrake && isBraking
  const tEff = isStopped ? tBrake : time

  const x = v0 * tEff + 0.5 * a * tEff * tEff
  const v = v0 + a * tEff
  const v2 = v * v
  const xOverT = tEff > 0 ? x / tEff : v0

  const k = chartMode === 0 ? 2 * a : 0.5 * a

  const quantities = [
    { label: '速度平方 v²', value: v2, unit: 'm²/s²', color: PHYSICS_COLORS.velocity },
    { label: '比值 x/t', value: xOverT, unit: 'm/s', color: PHYSICS_COLORS.averageVelocity },
    { label: '图象实时斜率 k', value: k, unit: 'm/s²', color: PHYSICS_COLORS.acceleration }
  ]

  const formulas = chartMode === 0 ? [
    {
      name: 'v²-x 对应数学一次函数',
      latex: 'v^2 = v_0^2 + 2ax \\quad \\xrightarrow{} \\quad y = b + kx',
      level: 'core' as const,
      condition: '匀变速直线运动'
    },
    {
      name: '斜率与截距关系',
      latex: `\\text{斜率 } k = 2a = ${(2 * a).toFixed(2)} \\quad ; \\quad \\text{纵截距 } b = v_0^2 = ${(v0 * v0).toFixed(2)}`,
      level: 'important' as const
    }
  ] : [
    {
      name: 'x/t-t 对应数学一次函数',
      latex: '\\frac{x}{t} = v_0 + \\frac{1}{2}at \\quad \\xrightarrow{} \\quad y = b + kt',
      level: 'core' as const,
      condition: '匀变速直线运动'
    },
    {
      name: '斜率与截距关系',
      latex: `\\text{斜率 } k = \\frac{1}{2}a = ${(0.5 * a).toFixed(2)} \\quad ; \\quad \\text{纵截距 } b = v_0 = ${v0.toFixed(2)}`,
      level: 'important' as const
    }
  ]

  const warnings = []
  if (isBraking) {
    warnings.push({
      text: `刹车情境：在 t = ${tBrake.toFixed(2)}s 时滑块静止，此后图象发生无物理意义断点。`,
      level: isStopped ? ('danger' as const) : ('warning' as const)
    })
  }

  return {
    quantities,
    formulas,
    warnings,
    gaokaoPoints: [
      { text: '⭐⭐⭐⭐ 图像信息逆推', importance: 'gaokao' as const },
      {
        text: '新高考核心方法：写出含有横纵轴物理量的原始公式 → 分离出因变量与自变量 → 对比一次函数 y=kx+b 求解。',
        importance: 'core' as const
      },
      ...(isStopped ? [{ text: '刹车死公式陷阱：速度减为零后不再反向运动，公式在 t > t_brake 后不再适用。', importance: 'hard' as const }] : [])
    ],
    isTerminal: isStopped,
    pauseReason: isStopped ? 'brake' as const : 'none' as const
  }
}
