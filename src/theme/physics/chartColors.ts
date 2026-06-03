/**
 * src/theme/physics/chartColors.ts
 * 物理图像配色 — x-t / v-t / a-t / F-x / P-V / U-I 等各类图表专用
 *
 * ═══════════════════════════════════════════════════════════════════
 *  设计原则
 *  1. 图表色独立于物理量色：
 *     - 图表曲线颜色表示"第几条曲线/什么量对应的曲线"
 *     - 物理量色（PHYSICS_COLORS）表示"Canvas 中的矢量/场线"
 *     - 两者不混用，避免歧义
 *  2. 最多 6 条对比曲线，按视觉权重从强到弱排序
 *  3. 所有颜色在白色背景上对比度 ≥ 3.0（WCAG AA Large）
 *  4. 面积填充统一用对应曲线色 + opacity 0.12 ~ 0.25
 * ═══════════════════════════════════════════════════════════════════
 */

// ─── 通用图表配色 (Universal Chart Colors) ───────────────────────────────────
export const CHART_COLORS = {
  // 主/对比曲线（同屏最多 6 条）
  primary:      '#2563EB', // 主曲线 A      — primary-600（蓝）
  compareA:     '#0891B2', // 对比曲线 A    — secondary-600（青）
  compareB:     '#10B981', // 对比曲线 B    — emerald-500（绿）
  compareC:     '#D97706', // 对比曲线 C    — amber-600（橙黄）
  compareD:     '#9333EA', // 对比曲线 D    — purple-600（紫）
  compareE:     '#DB2777', // 对比曲线 E    — pink-600（粉）

  // 辅助线
  reference:    '#F87171', // 参考线/切线辅助线 — danger-400（dashed，区别于主曲线）
  tangent:      '#F59E0B', // 切线斜率示意线    — amber-500（dashed）
  asymptote:    '#94A3B8', // 渐近线            — neutral-400（稀疏虚线）

  // 面积填充
  areaFill:     '#BFDBFE', // 面积填充（位移区域等）— primary-200（opacity 0.5）
  areaFillAlt:  '#A7F3D0', // 面积填充 Alt        — emerald-200（opacity 0.5）
  areaFillWarm: '#FED7AA', // 面积填充暖色        — orange-200（弹性势能等）

  // 坐标系基础
  gridLine:     '#E2E8F0', // 网格线            — neutral-200
  axisLine:     '#94A3B8', // 坐标轴            — neutral-400
  axisArrow:    '#475569', // 坐标轴箭头        — neutral-600
  labelText:    '#334155', // 轴标注文字        — neutral-700
  titleText:    '#1E293B', // 图表标题          — neutral-800
  tickMark:     '#94A3B8', // 刻度线            — neutral-400
  tickLabel:    '#64748B', // 刻度数字          — neutral-500
  zeroline:     '#CBD5E1', // 零线（x=0/y=0）  — neutral-300

  // 特殊标注点
  highlight:    '#FBBF24', // 高亮点/极值标注   — amber-400
  criticalPt:   '#EF4444', // 临界点/拐点       — danger-500
  equilibrium:  '#10B981', // 平衡态标注        — emerald-500
  origin:       '#1E293B', // 原点标注          — neutral-800
} as const

// ─── v-t 图专用（速度-时间图）─────────────────────────────────────────────────
export const VT_CHART_COLORS = {
  velocityCurve:   '#2563EB', // 速度曲线（与 PHYSICS_COLORS.velocity 统一）
  slopeTangent:    '#F59E0B', // 斜率切线（代表加速度 a = Δv/Δt）
  areaShade:       '#BFDBFE', // 面积阴影（代表位移 s = ∫v dt）
  zeroCrossing:    '#EF4444', // 过零点（速度反向时刻）
  avgVelocity:     '#10B981', // 平均速度水平线
} as const

// ─── x-t 图专用（位置-时间图）────────────────────────────────────────────────
export const XT_CHART_COLORS = {
  positionCurve:   '#4F46E5', // 位置曲线（与 PHYSICS_COLORS.displacement 统一）
  slopeTangent:    '#2563EB', // 斜率切线（代表瞬时速度）
  avgSlope:        '#10B981', // 平均斜率线（代表平均速度）
  constantLine:    '#94A3B8', // 匀速参考线（dashed）
} as const

// ─── a-t 图专用（加速度-时间图）──────────────────────────────────────────────
export const AT_CHART_COLORS = {
  accelCurve:      '#DC2626', // 加速度曲线（与 PHYSICS_COLORS.acceleration 统一）
  areaShade:       '#FECACA', // 面积阴影（代表速度变化量 Δv = ∫a dt）— danger-200
  zeroline:        '#94A3B8', // a=0 参考线
} as const

// ─── F-x 图专用（力-位移图 → 弹性势能）──────────────────────────────────────
export const FX_CHART_COLORS = {
  forceCurve:      '#EA580C', // 力曲线（与 PHYSICS_COLORS.forceNet 统一）
  hookeLine:       '#16A34A', // 胡克定律斜线（理想弹簧）
  areaShade:       '#FED7AA', // 面积阴影（代表弹性势能 E_p = ½kx²）
  hysteresis:      '#DB2777', // 滞回线（实际弹簧形变损耗）
  naturalLength:   '#94A3B8', // 原长标注线（dashed）
} as const

// ─── P-V 图专用（气体状态 p-V 图）────────────────────────────────────────────
export const PV_CHART_COLORS = {
  isotherm:        '#2563EB', // 等温线（主）  — primary-600
  // 不同温度等温线组（T 从低到高 → 颜色从浅到深）
  isothermsGroup:  ['#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8'] as const,
  isobar:          '#10B981', // 等压线        — emerald-500
  isochor:         '#D97706', // 等容线        — amber-600
  adiabatic:       '#9333EA', // 绝热线        — purple-600
  processArrow:    '#EA580C', // 过程方向箭头
  statePoint:      '#1E293B', // 状态点        — neutral-800
  statePointFill:  '#FDE68A', // 状态点填充    — amber-200
} as const

// ─── E-t 图专用（能量-时间图）────────────────────────────────────────────────
export const ENERGY_CHART_COLORS = {
  kinetic:         '#0891B2', // 动能 E_k 曲线（与 ENERGY_BAR_COLORS 统一）
  potential:       '#7C3AED', // 势能 E_p 曲线
  mechanical:      '#1D4ED8', // 机械能曲线    — primary-700
  thermal:         '#EF4444', // 热能/内能曲线
  total:           '#10B981', // 总能量守恒线（水平参考，dashed）
  loss:            '#F87171', // 耗散/损失      — danger-400（dashed + opacity）
} as const

// ─── U-I 图专用（伏安特性曲线）──────────────────────────────────────────────
export const UI_CHART_COLORS = {
  ohmic:           '#2563EB', // 欧姆元件（直线）— primary-600
  nonOhmic:        '#D97706', // 非欧姆元件（曲线）
  diode:           '#9333EA', // 二极管伏安特性
  filament:        '#EA580C', // 灯丝（温度依赖非线性）
  workingPoint:    '#EF4444', // 工作点        — danger-500
  slopeNote:       '#94A3B8', // 斜率注释（R = ΔU/ΔI，dashed）
} as const

// ─── 波形图专用 (Waveform Chart) ──────────────────────────────────────────────
export const WAVE_CHART_COLORS = {
  waveMain:        '#2563EB', // 主波形        — primary-600
  waveSource:      '#DC2626', // 波源波形      — danger-600
  interference:    '#9333EA', // 叠加/干涉结果 — purple-600
  envelope:        '#D97706', // 包络线（dashed）
  nodeMarker:      '#1E293B', // 波节标注点
  antinodeMarker:  '#EA580C', // 波腹标注点
  phaseMarker:     '#10B981', // 相位标注（π/2π）
} as const

// ─── 能量柱状图专用 (Energy Bar Chart) ────────────────────────────────────────
/**
 * 与原 physicsColors.ts ENERGY_BAR_COLORS 完全向后兼容，
 * 新增 potentialElastic / total / 渐变色阶
 */
export const ENERGY_BAR_COLORS = {
  kinetic:           '#0891B2', // 动能 E_k
  potential:         '#7C3AED', // 势能 E_p（重力）
  potentialElastic:  '#5B21B6', // 弹性势能（深紫，与重力势能区分）
  mechanical:        '#1D4ED8', // 机械能（外框线色）
  internal:          '#B91C1C', // 内能
  heat:              '#EF4444', // 热损失（opacity 0.5）
  total:             '#10B981', // 总能量参考线
  // 柱体渐变预设（顶色 → 底色，用于 linearGradient）
  kineticGrad:       ['#22D3EE', '#0891B2'] as const,
  potentialGrad:     ['#A78BFA', '#7C3AED'] as const,
  mechanicalGrad:    ['#60A5FA', '#1D4ED8'] as const,
} as const

export type ChartColorKey       = keyof typeof CHART_COLORS
export type EnergyBarColorKey   = keyof typeof ENERGY_BAR_COLORS
