import {
  calculateForceMotionState,
  getForceMotionDefaultEnv,
  type ForceMotionMode,
} from '../../physics'
import { PHYSICS_COLORS } from '../../theme/physics/colors'
import type { Formula, GaokaoPoint, PhysicsPanelData, PhysicsQuantity, WarningItem } from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// 各模式公式定义
// ═══════════════════════════════════════════════════════════════════════════════

const MODE_FORMULAS: Record<ForceMotionMode, Formula[]> = {
  'balance': [
    { name: '平衡条件', latex: 'F_{\\text{合}}=0', level: 'core', condition: '物体处于静止或匀速直线运动状态' },
    { name: '牛顿第一定律', latex: 'a=0,\\;v=\\text{恒量}', level: 'core', condition: '合外力为零时', note: '速度为零不一定是平衡（如竖直上抛最高点）' },
  ],
  'uniform-accel-line': [
    { name: '牛顿第二定律', latex: 'F_{\\text{合}}=ma', level: 'core', condition: '宏观低速，惯性参考系' },
    { name: '速度公式', latex: 'v=v_0+at', level: 'core', condition: '仅适用于匀变速直线运动' },
    { name: '位移公式', latex: 'x=v_0t+\\frac{1}{2}at^2', level: 'core', condition: '仅适用于匀变速直线运动', note: 'x为位移，非路程' },
  ],
  'uniform-decel-line': [
    { name: '牛顿第二定律', latex: 'F_{\\text{合}}=ma', level: 'core', condition: '宏观低速，惯性参考系' },
    { name: '刹车位移', latex: 'x=\\frac{v_0^2}{2a}', level: 'important', condition: '仅适用于匀减速至停止', note: '刹车陷阱：速度减为0后不再反向加速' },
    { name: '刹车时间', latex: 't=\\frac{v_0}{a}', level: 'important', condition: '仅适用于匀减速至停止' },
  ],
  'constant-angle-curve': [
    { name: '速度变化量', latex: '\\Delta\\vec{v}=\\vec{g}\\Delta t', level: 'core', condition: '仅受重力作用', note: '任意相等时间内速度变化量大小方向均相同' },
    { name: '斜抛位移', latex: 'x=v_0\\cos\\theta\\cdot t', level: 'core', condition: '忽略空气阻力' },
    { name: '竖直位移', latex: 'y=v_0\\sin\\theta\\cdot t-\\frac{1}{2}gt^2', level: 'core', condition: '忽略空气阻力，取抛出点为原点' },
  ],
  'projectile-like': [
    { name: '运动分解', latex: 'x=v_0t,\\;y=\\frac{1}{2}at^2', level: 'core', condition: '初速度垂直于恒力方向' },
    { name: '偏转角', latex: '\\tan\\varphi=\\frac{at}{v_0}', level: 'important', condition: '偏转角为速度方向与初速度方向的夹角' },
    { name: '带电粒子', latex: 'a=\\frac{qE}{m}', level: 'important', condition: '匀强电场中，忽略重力' },
  ],
  'uniform-circular': [
    { name: '向心力', latex: 'F_n=m\\frac{v^2}{R}', level: 'core', condition: '仅适用于匀速圆周运动', note: '向心力不做功，动能不变' },
    { name: '角速度', latex: '\\omega=\\frac{v}{R}', level: 'core', condition: '圆周运动' },
    { name: '周期', latex: 'T=\\frac{2\\pi R}{v}', level: 'important', condition: '匀速圆周运动' },
  ],
  'variable-circular': [
    { name: '机械能守恒', latex: '\\frac{1}{2}mv^2+mgh=\\text{恒量}', level: 'core', condition: '只有重力做功，无摩擦' },
    { name: '绳模型临界', latex: 'v_{\\min}=\\sqrt{gR}', level: 'important', condition: '绳模型最高点，绳不能提供支持力', note: '杆模型最高点临界速度可为0' },
    { name: '杆模型临界', latex: 'v_{\\min}=0', level: 'important', condition: '杆模型最高点，杆可提供支持力' },
  ],
  'simple-harmonic': [
    { name: '回复力', latex: 'F=-kx', level: 'core', condition: '仅适用于弹簧振子模型', note: '负号表示回复力方向与位移方向相反' },
    { name: '加速度', latex: 'a=-\\omega^2x', level: 'core', condition: '简谐运动' },
    { name: '周期', latex: 'T=2\\pi\\sqrt{\\frac{m}{k}}', level: 'important', condition: '弹簧振子，周期与振幅无关' },
  ],
  'linear-variable-force': [
    { name: '变力', latex: 'F=\\kappa t', level: 'core', condition: '力随时间线性变化' },
    { name: '动量定理', latex: 'I=\\Delta p', level: 'core', condition: '适用于任何力（恒力或变力）', note: '不能用匀变速公式，必须用动量或能量观点' },
    { name: '冲量', latex: 'I=\\frac{1}{2}\\kappa t^2', level: 'important', condition: '力随时间线性变化，从0开始', note: 'F-t图像面积等于冲量' },
  ],
  'terminal-variable-force': [
    { name: '功率', latex: 'P=Fv', level: 'core', condition: '恒定功率启动时P不变' },
    { name: '收尾条件', latex: 'a=0,\\;F_{\\text{合}}=0', level: 'core', condition: '加速度为零时速度达到极值' },
    { name: '汽车最大速度', latex: 'v_m=\\frac{P}{f}', level: 'important', condition: '恒定功率、恒定阻力', note: '牵引力等于阻力时速度最大' },
    { name: '单杆最大速度', latex: 'v_m=\\frac{F}{k_f}', level: 'important', condition: '电磁感应单杆，恒定驱动力F', note: '安培力等于驱动力时速度最大' },
  ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// 各模式高考考点
// ═══════════════════════════════════════════════════════════════════════════════

const MODE_GAOKAO_POINTS: Record<ForceMotionMode, GaokaoPoint[]> = {
  'balance': [
    { text: '平衡条件：合外力为零', importance: 'core' },
    { text: '速度为零不一定是平衡（如竖直上抛最高点）', importance: 'gaokao' },
  ],
  'uniform-accel-line': [
    { text: '自由落体、牛顿第二定律基础计算', importance: 'gaokao' },
    { text: '区分位移与路程，注意速度方向', importance: 'core' },
  ],
  'uniform-decel-line': [
    { text: '汽车刹车死区问题', importance: 'gaokao' },
    { text: '刹车陷阱：速度减为0后不再反向加速', importance: 'core' },
  ],
  'constant-angle-curve': [
    { text: '斜抛运动速度变化量 Δv→ = g→Δt', importance: 'gaokao' },
    { text: '任意相等时间内速度变化量大小方向均相同', importance: 'core' },
  ],
  'projectile-like': [
    { text: '带电粒子在匀强电场中的偏转', importance: 'gaokao' },
    { text: '运动独立性：分解为沿力与垂直力两个方向', importance: 'core' },
  ],
  'uniform-circular': [
    { text: '天体运行圆轨道的向心力来源', importance: 'gaokao' },
    { text: '向心力不做功，动能守恒', importance: 'core' },
  ],
  'variable-circular': [
    { text: '绳模型与杆模型最高点临界', importance: 'gaokao' },
    { text: '合外力不指向圆心，只有法向分力提供向心加速度', importance: 'core' },
  ],
  'simple-harmonic': [
    { text: '弹簧振子、单摆对称性及能量守恒', importance: 'gaokao' },
    { text: '远离平衡位置时x变大F变大v减小', importance: 'core' },
  ],
  'linear-variable-force': [
    { text: '动量定理：F-t图像面积求冲量', importance: 'gaokao' },
    { text: '不能用匀变速公式，必须用动量或能量观点', importance: 'core' },
  ],
  'terminal-variable-force': [
    { text: '汽车恒定功率启动、电磁感应单杆收尾', importance: 'gaokao' },
    { text: '核心收尾规律：a=0时速度达到最大值vm', importance: 'core' },
  ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// 各模式易错点警示
// ═══════════════════════════════════════════════════════════════════════════════

const MODE_WARNINGS: Record<ForceMotionMode, WarningItem[]> = {
  'balance': [
    { text: '误认为速度为0就是平衡（如竖直上抛最高点）', level: 'warning' },
  ],
  'uniform-accel-line': [
    { text: '注意区分位移与路程', level: 'info' },
  ],
  'uniform-decel-line': [
    { text: '刹车陷阱：速度减为0后物体不再反向加速！', level: 'danger' },
  ],
  'constant-angle-curve': [
    { text: '任意相等时间内，速度变化量的大小和方向均相同', level: 'info' },
  ],
  'projectile-like': [
    { text: '运动的独立性，必须分解为沿力与垂直力两个方向', level: 'warning' },
  ],
  'uniform-circular': [
    { text: '速度方向时刻在变，向心力不做功', level: 'info' },
  ],
  'variable-circular': [
    { text: '合外力不指向圆心，只有法向分力提供向心加速度', level: 'warning' },
  ],
  'simple-harmonic': [
    { text: '远离平衡位置时，x变大，F变大，v减小', level: 'info' },
  ],
  'linear-variable-force': [
    { text: '不能用匀变速直线运动公式，必须用动量或能量观点', level: 'warning' },
  ],
  'terminal-variable-force': [
    { text: '核心收尾规律：当a=0时，速度达到最大值vm', level: 'danger' },
  ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// 各模式口诀
// ═══════════════════════════════════════════════════════════════════════════════

const MODE_MNEMONICS: Record<ForceMotionMode, string> = {
  'balance': '合外力为零，匀速或静止；速度为零不一定是平衡。',
  'uniform-accel-line': '恒力生恒加速度，v-t图线是直线。',
  'uniform-decel-line': '刹车陷阱要牢记，速度为零不再动。',
  'constant-angle-curve': '定角力下曲线跑，Δv方向总不变。',
  'projectile-like': '初速垂直于恒力，分解独立来处理。',
  'uniform-circular': '向心力垂直速度，大小不变方向变。',
  'variable-circular': '绳杆模型要区分，临界速度记心间。',
  'simple-harmonic': '回复力与位移反，平衡位置速度最大。',
  'linear-variable-force': 'F-t面积是冲量，动量定理来帮忙。',
  'terminal-variable-force': '收尾速度是极值，a为零时v最大。',
}

// ═══════════════════════════════════════════════════════════════════════════════
// 物理量面板构建
// ═══════════════════════════════════════════════════════════════════════════════

export function buildForceMotionQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-force-motion-topic') return null

  const fixedParams = {
    ...params,
    env1: params.env1 ?? getForceMotionDefaultEnv(params.mode ?? 0),
  }
  const state = calculateForceMotionState(fixedParams, time)

  const quantities: PhysicsQuantity[] = [
    { label: '合外力', symbol: 'F', value: state.F.toFixed(2), unit: 'N', color: PHYSICS_COLORS.forceNet, highlight: Math.abs(state.F) < 0.01 ? 'zero' : 'positive' },
    { label: '加速度', symbol: 'a', value: state.a.toFixed(2), unit: 'm/s²', color: PHYSICS_COLORS.acceleration, highlight: Math.abs(state.a) < 0.01 ? 'zero' : 'positive' },
    { label: '速度', symbol: 'v', value: state.v.toFixed(2), unit: 'm/s', color: PHYSICS_COLORS.velocity },
    { label: '位移', symbol: 'x', value: state.x.toFixed(2), unit: 'm', color: PHYSICS_COLORS.displacement },
    { label: '动量', symbol: 'p', value: state.p.toFixed(2), unit: 'kg·m/s', color: PHYSICS_COLORS.momentum },
    { label: '时间', symbol: 't', value: state.t.toFixed(2), unit: 's' },
  ]

  const formulas: Formula[] = [
    { name: '牛顿第二定律', latex: 'F_{\\text{合}}=ma', level: 'core' },
    ...MODE_FORMULAS[state.mode],
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    { text: 'x-t斜率为v，v-t斜率为a', importance: 'gaokao' },
    { text: 'v-t面积为位移，F-t为冲量', importance: 'gaokao' },
    ...MODE_GAOKAO_POINTS[state.mode],
  ]

  const warnings: WarningItem[] = MODE_WARNINGS[state.mode]

  const mnemonic = MODE_MNEMONICS[state.mode]

  return {
    quantities,
    formulas,
    gaokaoPoints,
    warnings,
    mnemonic,
    isTerminal: state.isTerminal,
    pauseReason: state.pauseReason,
  }
}
