import {
  calculateForceMotionState,
  getForceMotionDefaultEnv,
  type ForceMotionMode,
} from '../../physics'
import { PHYSICS_COLORS } from '@/theme/physics'
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
    { name: '最大射高', latex: 'h=\\frac{(v_0\\sin\\theta)^2}{2g}', level: 'important', condition: '到达最高点时竖直分速度 vy=0' },
    { name: '水平射程', latex: 'X=\\frac{v_0^2\\sin 2\\theta}{g}', level: 'important', condition: '落回等高水平面，θ=45°时射程最大' },
  ],
  'projectile-like': [
    { name: '运动分解', latex: 'x=v_0t+\\frac{1}{2}a_x t^2,\\;y=\\frac{1}{2}a_y t^2', level: 'core', condition: '恒力与初速度夹角为 θ；θ=90° 时退化为类平抛' },
    { name: '电场偏转量', latex: 'y=\\frac{1}{2}at^2=\\frac{qUL^2}{2mdv_0^2}', level: 'important', condition: '带电粒子垂直射入匀强偏转电场' },
    { name: '偏转角正切', latex: '\\tan\\varphi=\\frac{v_y}{v_0}=\\frac{qUL}{mdv_0^2}', level: 'important', condition: '偏转角为出射速度与初速度夹角' },
    { name: '轨迹中点定理', latex: 'x_{\\text{交}}=\\frac{L}{2}', level: 'important', condition: '出射速度的反向延长线必过水平位移中点' },
  ],
  'uniform-circular': [
    { name: '向心力', latex: 'F_n=m\\frac{v^2}{R}', level: 'core', condition: '仅适用于匀速圆周运动', note: '向心力不做功，动能不变' },
    { name: '角速度', latex: '\\omega=\\frac{v}{R}', level: 'core', condition: '圆周运动' },
    { name: '周期', latex: 'T=\\frac{2\\pi R}{v}', level: 'important', condition: '匀速圆周运动' },
  ],
  'variable-circular': [
    { name: '机械能守恒', latex: '\\frac{1}{2}mv^2+mgh=\\text{恒量}', level: 'core', condition: '只有重力做功，无摩擦' },
    { name: '绳模型最高点临界', latex: 'v_{\\min}=\\sqrt{gR}', level: 'important', condition: '绳拉力 T≥0，重力恰好充当向心力' },
    { name: '杆模型最高点临界', latex: 'v_{\\min}=0', level: 'important', condition: '杆可提供支持力，到达最高点速度可为0' },
  ],
  'simple-harmonic': [
    { name: '回复力', latex: 'F=-kx', level: 'core', condition: '仅适用于弹簧振子模型', note: '负号表示回复力方向与位移方向相反' },
    { name: '加速度', latex: 'a=-\\omega^2x', level: 'core', condition: '简谐运动' },
    { name: '周期', latex: 'T=2\\pi\\sqrt{\\frac{m}{k}}', level: 'important', condition: '弹簧振子，周期与振幅无关' },
  ],
  'linear-variable-force': [
    { name: '变力', latex: 'F=\\kappa t', level: 'core', condition: '力随时间线性变化' },
    { name: '动量定理', latex: 'I=\\Delta p', level: 'core', condition: '适用于任何力（恒力或变力）', note: '不能用匀变速公式，必须用动量或能量观点' },
    { name: '冲量公式', latex: 'I=\\frac{1}{2}\\kappa t^2', level: 'important', condition: '力随时间线性变化，F-t图像三角形面积' },
  ],
  'terminal-variable-force': [
    { name: '瞬时功率', latex: 'P=Fv', level: 'core', condition: '恒定功率启动时P不变' },
    { name: '收尾平衡条件', latex: 'a=0,\\;F_{\\text{合}}=0', level: 'core', condition: '加速度减小为零时速度达到极值 vm' },
    { name: '机车收尾速度', latex: 'v_m=\\frac{P}{f}', level: 'important', condition: '恒定功率启动，牵引力等于阻力' },
    { name: '单杆收尾速度', latex: 'v_m=\\frac{F}{k_f}', level: 'important', condition: '电磁感应单杆，驱动力与安培阻尼平衡' },
    { name: '全程动能定理', latex: 'Pt-fx=\\frac{1}{2}mv_m^2-\\frac{1}{2}mv_0^2', level: 'important', condition: '恒功率启动求位移或加速时间，变力做功必用动能定理' },
  ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// 各模式高考考点
// ═══════════════════════════════════════════════════════════════════════════════

const MODE_GAOKAO_POINTS: Record<ForceMotionMode, GaokaoPoint[]> = {
  'balance': [
    { text: '平衡条件：合外力为零，物体的加速度恒为零', importance: 'core' },
    { text: '速度为零不一定是平衡状态（如竖直上抛最高点加速度为g，不平衡）', importance: 'gaokao' },
  ],
  'uniform-accel-line': [
    { text: '牛顿第二定律与初速度为零/非零匀加速直线运动', importance: 'gaokao' },
    { text: '区分位移（矢量）与路程（标量），注意正负方向', importance: 'core' },
  ],
  'uniform-decel-line': [
    { text: '汽车刹车陷阱：速度减为0后物体保持静止，不再反向加速', importance: 'gaokao' },
    { text: '刹车时间与刹车距离的死区计算', importance: 'core' },
  ],
  'constant-angle-curve': [
    { text: '斜抛运动速度变化量 Δv→ = g→Δt，任意相等时间内速度变化矢量恒定', importance: 'gaokao' },
    { text: '运动的合成与分解：水平匀速直线，竖直匀变速直线；最高点竖直分速度为零', importance: 'core' },
  ],
  'projectile-like': [
    { text: '带电粒子在匀强电场中的偏转：出射速度反向延长线必过水平位移中点 L/2 处', importance: 'gaokao' },
    { text: '偏转角正切值等于位移夹角正切值的2倍：tanφ = 2tanθ', importance: 'gaokao' },
    { text: '类平抛运动在垂直恒力方向做匀速直线，沿恒力方向做初速度为零的匀加速直线', importance: 'core' },
  ],
  'uniform-circular': [
    { text: '向心力不做功，动能守恒，向心加速度仅改变速度方向不改变大小', importance: 'gaokao' },
    { text: '向心力来源分析：万有引力、电荷洛伦兹力、弹簧弹力等充当向心力', importance: 'core' },
  ],
  'variable-circular': [
    { text: '竖直面圆周临界：轻绳最高点 v_min = √(gR)，轻杆最高点 v_min = 0', importance: 'gaokao' },
    { text: '非匀速圆周合力不指向圆心，径向法向分力提供向心加速度，切向分力改变速度大小', importance: 'core' },
  ],
  'simple-harmonic': [
    { text: '简谐运动平衡位置速度最大、位移为零、回复力为零；最大位移处速度为零、加速度最大', importance: 'gaokao' },
    { text: '回复力与位移成正比方向相反 F = -kx，位移-时间图像为对称余弦/正弦曲线', importance: 'core' },
  ],
  'linear-variable-force': [
    { text: '动量定理：F-t 图像面积求冲量 I = Δp，处理变力冲量唯一利器', importance: 'gaokao' },
    { text: '严禁套用匀变速公式，变力作用全程必须用动量或能量观点分析', importance: 'core' },
  ],
  'terminal-variable-force': [
    { text: '收尾速度核心规律：当 a = 0 时速度达到最大值 vm (F = f 或 F = B²L²v/R)', importance: 'gaokao' },
    { text: '机车恒功率启动求位移：必须用全程动能定理 Pt - fx = ΔEk，严禁套用运动学公式', importance: 'gaokao' },
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
    { text: '注意：只有 θ=90° 时才是标准类平抛；其他角度是一般恒力偏转运动', level: 'warning' },
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
    { text: '核心收尾规律：当a=0时，速度达到最大值vm；变力做功求位移用动能定理', level: 'danger' },
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
  'projectile-like': '恒力偏转先分解，反向延长过中点。',
  'uniform-circular': '向心力垂直速度，大小不变方向变。',
  'variable-circular': '绳杆模型要区分，临界速度记心间。',
  'simple-harmonic': '回复力与位移反，平衡位置动能满。',
  'linear-variable-force': 'F-t面积是冲量，动量定理来帮忙。',
  'terminal-variable-force': '收尾速度是极值，全程做功靠动能。',
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
    { label: '动能', symbol: 'E_k', value: state.Ek.toFixed(2), unit: 'J', color: PHYSICS_COLORS.kineticEnergy },
    { label: '合力做功', symbol: 'W', value: state.work.toFixed(2), unit: 'J', color: PHYSICS_COLORS.mechanicalEnergy },
    { label: '时间', symbol: 't', value: state.t.toFixed(2), unit: 's' },
  ]

  if (state.terminalVelocity != null) {
    quantities.push({
      label: '收尾速度',
      symbol: 'v_m',
      value: state.terminalVelocity.toFixed(2),
      unit: 'm/s',
      color: PHYSICS_COLORS.velocity,
      highlight: state.isTerminal ? 'positive' : undefined,
    })
  }

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
