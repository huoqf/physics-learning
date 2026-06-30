/**
 * src/theme/physics/colors.ts
 * 物理量颜色语义映射 — Canvas / SVG 内唯一颜色来源
 *
 * ═══════════════════════════════════════════════════════════════════
 *  设计原则
 *  1. 每个物理量有且仅有一个颜色 token，禁止组件内硬编码
 *  2. 同一画面同时显示的物理量颜色 ≤ 5 种（参考 Nielsen 色觉限制）
 *  3. 颜色间最小感知距离 ΔE ≥ 15（CIE76），防止同屏混淆
 *  4. 所有颜色在白色背景上对比度 ≥ 3.0（WCAG AA Large）
 *  5. 新增物理量颜色必须先更新本文件，再进入组件实现
 * ═══════════════════════════════════════════════════════════════════
 *
 *  命名约定（与 colors.ts 的 UI token 保持一致）
 *  - 物理量符号优先（velocity / acceleration / force…）
 *  - 方向/极性后缀（Net / X / Y / Positive / Negative）
 *  - 合力比分力粗 1.5×（见 canvasStyle.ts STROKE.vectorMain / vectorSub）
 *
 *  ★ 标注说明：
 *  ★新增  = 本次新增，原 physicsColors.ts 无此 token
 *  ★修正  = 修正原组件中出现的硬编码，归入正确 token
 */

export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

// ─── 运动学 (Kinematics) ──────────────────────────────────────────────────────
export const KINEMATICS_COLORS = {
  velocity:           '#2563EB', // 速度 v            — 经典蓝 (Blue-600)
  velocityX:          '#3B82F6', // 速度 x 分量        — 蓝 (Blue-500)
  velocityY:          '#60A5FA', // 速度 y 分量        — 浅蓝 (Blue-400)
  averageVelocity:    '#0284C7', // 平均速度 v̄         — 天蓝 (Sky-600)
  acceleration:       '#DC2626', // 加速度 a           — 警示红 (Red-600)
  accelerationX:      '#EF4444', // 加速度 x 分量      — 红 (Red-500)
  accelerationY:      '#F87171', // 加速度 y 分量      — 浅红 (Red-400)
  displacement:       '#8B5CF6', // 位移 s/x          — 紫色 (Purple-500)
  displacementX:      '#A78BFA', // 位移 x 分量        — 浅紫 (Violet-400)
  displacementY:      '#C4B5FD', // 位移 y 分量        — 极浅紫 (Violet-300)
  position:           '#0284C7', // 位置矢量 r         — sky-600
  angularVelocity:    '#0891B2', // 角速度 ω           — secondary-600
  angularAccel:       '#B45309', // 角加速度 α         — accent-700
  period:             '#64748B', // 周期 T             — neutral-500
  frequency:          '#64748B', // 频率 f             — neutral-500
  secantLine:         '#6B7280', // 割线               — gray-500
  tangentLine:        '#DC2626', // 切线               — danger-600
  deltaHighlight:     '#93C5FD', // Δx/Δt 示性三角形   — Delta Blue (blue-300)
  magnifier:          '#374151', // 放大镜边框          — gray-700
} as const

// ─── 动力学 (Dynamics) ────────────────────────────────────────────────────────
export const DYNAMICS_COLORS = {
  forceNet:           '#EA580C', // 合力 F_net         — 动力亮橙 (Orange-600)
  forceNetArrow:      '#C2410C', // 合力箭头加深版      — orange-700
  gravity:            '#166534', // 重力 mg / G        — 深重力绿 (Green-800)
  normalForce:        '#0284C7', // 法向力/支持力 N     — 支持天蓝 (Sky-600)
  friction:           '#B45309', // 动摩擦力 f         — 耗散黄褐 (Amber-700)
  frictionStatic:     '#D97706', // 静摩擦力            — amber-600
  elasticForce:       '#DB2777', // 弹力（弹簧）       — 弹簧玫红 (Pink-600)
  tension:            '#8B5CF6', // 绳中张力 T         — 绳索紫 (Purple-500)
  buoyancy:           '#06B6D4', // 浮力 F_浮          — 浮力水蓝 (Cyan-500)
  appliedForce:       '#1E3A8A', // 外加/施加力         — 动力深蓝 (Blue-900)
  forceComponent:     '#475569', // 力的分量（辅助色）  — 辅助灰 (Slate-600)
  forceArrowRed:      '#B91C1C', // 力箭头深红（牛二定律专用）
  airResistance:      '#64748B', // 空气阻力 f_air      — 耗散灰 (neutral-500)
  torque:             '#B45309', // 力矩 M / τ         — 力矩黄褐
} as const

// ─── 能量与动量 (Energy & Momentum) ──────────────────────────────────────────
export const ENERGY_COLORS = {
  kineticEnergy:      '#06B6D4', // 动能 E_k           — 动能青 (Cyan-500)
  potentialEnergy:    '#7C3AED', // 势能 E_p（重力）    — 势能紫 (Violet-600)
  potentialGravity:   '#7C3AED', // 重力势能            — 同 potentialEnergy
  potentialElastic:   '#5B21B6', // 弹性势能            — 弹性能深紫 (Violet-800)
  mechanicalEnergy:   '#475569', // 机械能 E           — 机械能石墨灰 (Slate-600)
  internalEnergy:     '#B91C1C', // 内能 U             — 内能深红 (Red-700)
  heatLoss:           '#EF4444', // 热损失 Q_散         — danger-500
  work:               '#84CC16', // 功 W               — 做功黄绿 (Lime-500)
  power:              '#D97706', // 功率 P             — 功率黄 (Amber-600)
  momentum:           '#DB2777', // 动量 p             — 动量洋红 (Pink-600)
  impulse:            '#EC4899', // 冲量 I             — 冲量粉 (Pink-400)
  angularMomentum:    '#BE185D', // 角动量 L           — pink-700
} as const

// 声明内部基准色变量以避免重复 Hex 字符串并支持 withAlpha
const electricFieldBase = '#D97706';
const magneticFieldBase = '#10B981';

export const EM_COLORS = {
  electricField:      electricFieldBase, // 电场强度 E         — 电场黄 (Amber-600，符合教材习惯)
  electricFieldLine:  withAlpha(electricFieldBase, 0.42), // 电场线（半透明弱化）
  magneticField:      magneticFieldBase, // 磁感应强度 B（物理量主色，保持向下兼容）
  magneticFieldLine:  withAlpha(magneticFieldBase, 0.38), // 背景磁感线（半透明弱化）
  magneticFieldDot:   withAlpha(magneticFieldBase, 0.45), // 磁场点（出纸面 ·）
  magneticFieldCross: withAlpha(magneticFieldBase, 0.45), // 磁场叉（入纸面 ×）
  electricCurrent:    '#DC2626', // 电流 I             — 电流红 (Red-600，符合教材习惯)
  currentDirection:   '#EF4444', // 电流方向箭头        — red-500
  electricPotential:  '#A16207', // 电势 φ             — 棕黄
  equipotential:      '#D97706', // 等势线             — amber-600
  positiveCharge:     '#EF4444', // 正电荷 +q          — 经典红 (Red-500)
  negativeCharge:     '#3B82F6', // 负电荷 −q          — 经典蓝 (Blue-500)
  electricForce:      '#A21CAF', // 电场力 F_E         — 深洋红 (Fuchsia-700)
  lorentzForce:       '#8B5CF6', // 洛伦兹力/安培力 F_L — 洛伦兹紫 (Purple-500)
  resistance:         '#78716C', // 电阻 R             — stone-500
  capacitor:          '#0284C7', // 电容 C             — sky-600
  inductor:           '#B8860B', // 电感 L             — copper
  emf:                '#D97706', // 电动势 ε           — amber-600
  magnetNorth:        '#DC2626', // 磁铁 N 极          — 经典红 (danger-600)
  magnetSouth:        '#2563EB', // 磁铁 S 极          — 经典蓝 (primary-600)
} as const

// ─── 远距离输电 (Power Transmission) ─────────────────────────────────────────
export const TRANSMISSION_COLORS = {
  voltageHigh:      '#D97706', // 输电电压 U₂        — amber-600（复用 emf 色系）
  currentLine:      '#DC2626', // 线路电流 I_line     — red-600（复用 current 色系）
  powerLoss:        '#EF4444', // 损耗功率 P_loss     — danger-500
  powerUser:        '#0891B2', // 用户功率 P_user     — cyan-600
  efficiency:       '#10B981', // 输电效率 η          — emerald-500
  thermalGlow:      '#B91C1C', // 线路发热红光        — danger-700
  idealOverlay:     '#94A3B8', // 理想无损耗对比线    — neutral-400
} as const

// ─── 热学 (Thermodynamics) ────────────────────────────────────────────────────
export const THERMO_COLORS = {
  temperature:        '#B91C1C', // 温度 T             — 热端深红 (Red-700)
  temperatureHigh:    '#EF4444', // 高温端             — 亮红 (Red-500)
  temperatureLow:     '#3B82F6', // 低温端             — 冷蓝 (Blue-500)
  temperatureIsothermalGroup: ['#3B82F6', '#60A5FA', '#F59E0B', '#EF4444'] as const, // 等温线组（冷蓝向暖红渐变）
  pressure:           '#7C3AED', // 压强 p             — 压强紫 (Violet-600)
  volume:             '#059669', // 体积 V             — 体积绿 (Emerald-600)
  heatAbsorb:         '#F97316', // 吸热 Q+            — 暖橙 (Orange-500)
  heatRelease:        '#0891B2', // 放热 Q−            — 冷青 (Cyan-600)
  gasLaw:             '#D97706', // 气体定律曲线        — amber-600
  phaseChange:        '#A78BFA', // 相变过程            — violet-400
  boilingPoint:       '#EF4444', // 沸点标注            — danger-500
  meltingPoint:       '#60A5FA', // 熔点标注            — primary-400
} as const

// ─── 光学 (Optics) ────────────────────────────────────────────────────────────
export const OPTICS_COLORS = {
  lightRay:           '#FBBF24', // 光线（默认入射光）  — 亮黄 (Amber-400)
  lightRayRefracted:  '#F59E0B', // 折射光线            — amber-500
  lightRayReflected:  '#FDE68A', // 反射光线            — amber-200
  lightRayNormal:     '#94A3B8', // 法线               — 辅助灰 (neutral-400)
  wavefront:          '#38BDF8', // 波前               — sky-400
  wavelengthRed:      '#EF4444', // 红光 λ≈700nm       — 光谱红 (Red-500)
  wavelengthYellow:   '#EAB308', // 黄光 λ≈580nm       — 光谱黄 (Yellow-500)
  wavelengthGreen:    '#22C55E', // 绿光 λ≈550nm       — 光谱绿 (Green-500)
  wavelengthBlue:     '#3B82F6', // 蓝光 λ≈450nm       — 光谱蓝 (Blue-500)
  wavelengthViolet:   '#7C3AED', // 紫光 λ≈400nm       — 光谱紫 (Purple-600)
  criticalAngle:      '#F97316', // 全反射临界角标注    — orange-500
  focalPoint:         '#EA580C', // 焦点               — orange-600
  opticalAxis:        '#CBD5E1', // 光轴               — neutral-300
  lens:               '#E0F2FE', // 透镜填充            — sky-100 (半透明)
  lensStroke:         '#0284C7', // 透镜轮廓            — sky-600
  mirror:             '#E2E8F0', // 镜面                — neutral-200
  mirrorStroke:       '#475569', // 镜面轮廓            — neutral-600
  glassFill:          'rgba(224, 242, 254, 0.35)', // 玻璃砖填充  — sky-100 半透明
  glassStroke:        '#94A3B8',                      // 玻璃砖轮廓  — neutral-400
  lateralOffset:      '#8B5CF6',                      // 侧移标注    — violet-500
  airFill:            'rgba(239, 246, 255, 0.3)',    // 空气区域填充 — primary-50 半透明
  waterFill:          'rgba(219, 234, 254, 0.5)',   // 水区域填充  — blue-100 半透明
  waterFillLight:     'rgba(219, 234, 254, 0.3)',   // 水区域浅填充（俯视图）
  candleBody:         '#F59E0B', // 蜡烛烛身            — amber-500
  candleBodyStroke:   '#D97706', // 蜡烛烛身边框        — amber-600
  candleFlame:        '#FDE68A', // 蜡烛火焰            — amber-200
  candleFlameStroke:  '#F59E0B', // 蜡烛火焰边框        — amber-500
  candleStick:        '#94A3B8', // 蜡烛底座            — neutral-400
} as const

// ─── 波动 (Waves) ─────────────────────────────────────────────────────────────
export const WAVE_COLORS = {
  waveform:           '#2563EB', // 波形曲线（主）       — 波动蓝 (Blue-600)
  waveformB:          '#DC2626', // 对比波形 B          — 警示红 (Red-600)
  amplitude:          '#10B981', // 振幅标注            — 振幅绿 (Emerald-500)
  wavelength:         '#D97706', // 波长标注            — 波长黄 (Amber-600)
  nodePoint:          '#1E293B', // 波节               — neutral-800
  antinodePoint:      '#EA580C', // 波腹               — orange-600
  standingWave:       '#7C3AED', // 驻波               — violet-700
  soundWave:          '#0891B2', // 声波               — secondary-600
  doppler:            '#F59E0B', // 多普勒效应标注      — amber-500
} as const

// ─── 通用 Canvas 元素 (Canvas Commons) ───────────────────────────────────────
import { colors } from '../colors'

export const CANVAS_COLORS = {
  trackHistory:       colors.neutral[400], // 历史轨迹
  trackHistoryAlt:    '#C4B5FD',           // 对照轨迹/投影 — violet-300
  axis:               colors.neutral[300], // 坐标轴、参考线
  grid:               colors.neutral[200], // 网格线
  gridSubtle:         colors.neutral[100], // 浅网格/轻描边
  labelText:          colors.neutral[800], // Canvas 内文字标注
  labelTextLight:     colors.neutral[600], // Canvas 次要文字
  textMuted:          colors.neutral[500], // 灰色辅助文字/元件填充
  objectFill:         '#EFF6FF',           // 物体填充（浅蓝）— primary-50
  objectStroke:       '#1E40AF',           // 物体轮廓 — primary-800
  objectFillNeutral:  colors.neutral[50],  // 中性物体填充
  objectFillWarm:     '#FFF7ED',           // 暖色物体填充 — orange-50
  strokeDark:         colors.neutral[700], // 深色描边/外框
  referencePoint:     '#F59E0B',           // 参考点标注 — amber-500
  annotation:         '#8B5CF6',           // 标注文字框 — violet-500
  originMark:         colors.neutral[800], // 坐标原点标记
  vectorTip:          colors.neutral[800], // 箭头尖端描边

  // 警示危险场景配色
  alertRed:           '#EF4444',
  dangerDark:         '#DC2626',
  dangerText:         '#B91C1C',
  dangerBg:           '#FEF2F2',
  dangerBorder:       '#FECACA',
  dangerBgFill:       '#fee2e2',
  dangerGradient:     '#7F1D1D',
} as const

// ─── 聚合导出：PHYSICS_COLORS ─────────────────────────────────────────
export const PHYSICS_COLORS = {
  ...KINEMATICS_COLORS,
  ...DYNAMICS_COLORS,
  ...ENERGY_COLORS,
  ...EM_COLORS,
  ...THERMO_COLORS,
  ...OPTICS_COLORS,
  ...WAVE_COLORS,
  ...CANVAS_COLORS,
} as const

export type PhysicsColorKey    = keyof typeof PHYSICS_COLORS
export type KinematicsColorKey = keyof typeof KINEMATICS_COLORS
export type DynamicsColorKey   = keyof typeof DYNAMICS_COLORS
export type EnergyColorKey     = keyof typeof ENERGY_COLORS
export type EMColorKey         = keyof typeof EM_COLORS
export type ThermoColorKey     = keyof typeof THERMO_COLORS
export type OpticsColorKey     = keyof typeof OPTICS_COLORS
export type WaveColorKey       = keyof typeof WAVE_COLORS
export type CanvasColorKey     = keyof typeof CANVAS_COLORS
