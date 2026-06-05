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

// ─── 运动学 (Kinematics) ──────────────────────────────────────────────────────
export const KINEMATICS_COLORS = {
  velocity:           '#2563EB', // 速度 v            — Velocity Blue    (primary-600)
  velocityX:          '#3B82F6', // 速度 x 分量        — primary-500（分量浅一阶）   ★新增
  velocityY:          '#60A5FA', // 速度 y 分量        — primary-400                ★新增
  averageVelocity:    '#D97706', // 平均速度 v̄         — Average Amber (amber-600)  ★新增
  acceleration:       '#DC2626', // 加速度 a           — Acceleration Red (danger-600)
  accelerationX:      '#EF4444', // 加速度 x 分量      — danger-500                 ★新增
  accelerationY:      '#F87171', // 加速度 y 分量      — danger-400                 ★新增
  displacement:       '#4F46E5', // 位移 s/x          — Displacement Indigo (indigo-600)
  displacementX:      '#6366F1', // 位移 x 分量        — indigo-500                 ★新增
  displacementY:      '#818CF8', // 位移 y 分量        — indigo-400                 ★新增
  position:           '#0284C7', // 位置矢量 r         — sky-600（与位移色区分）      ★新增
  angularVelocity:    '#0891B2', // 角速度 ω           — secondary-600              ★新增
  angularAccel:       '#B45309', // 角加速度 α         — accent-700（角量用暖黄系）   ★新增
  period:             '#64748B', // 周期 T             — neutral-500（辅助量，弱化）  ★新增
  frequency:          '#64748B', // 频率 f             — neutral-500                ★新增
  secantLine:         '#6B7280', // 割线               — Secant Gray (gray-500)     ★新增
  tangentLine:        '#DC2626', // 切线               — Tangent Red (danger-600)   ★新增
  deltaHighlight:     '#93C5FD', // Δx/Δt 示性三角形   — Delta Blue (blue-300)      ★新增
  magnifier:          '#374151', // 放大镜边框          — Magnifier Gray (gray-700)  ★新增
} as const

// ─── 动力学 (Dynamics) ────────────────────────────────────────────────────────
export const DYNAMICS_COLORS = {
  forceNet:           '#EA580C', // 合力 F_net         — Force Orange (orange-600)
  forceNetArrow:      '#C2410C', // 合力箭头加深版      — orange-700（箭头头部描边）   ★新增
  gravity:            '#475569', // 重力 mg / G        — Gravity Slate（常见背景力，弱化）
  normalForce:        '#0D9488', // 法向力 N           — Normal Teal (teal-600)
  friction:           '#D97706', // 动摩擦力 f         — Friction Amber (amber-600)
  frictionStatic:     '#F59E0B', // 静摩擦力            — amber-500（比动摩擦浅）      ★新增
  elasticForce:       '#16A34A', // 弹力（弹簧）       — Spring Green (green-600)
  tension:            '#9333EA', // 绳中张力 T         — Tension Purple (purple-600)
  // ⚠️ 原为 #7C3AED，与 potentialEnergy 完全同值导致同屏混淆，已修正为 purple-600
  buoyancy:           '#06B6D4', // 浮力 F_浮          — Buoyancy Cyan (cyan-500)    ★新增
  appliedForce:       '#0055A4', // 外加/施加力         — Applied Blue ★修正 #0055a4（介于 primary-700/800）
  forceComponent:     '#1E3A8A', // 力的分量（深蓝）    — primary-900 ★修正 #1e3a8a
  forceArrowRed:      '#CC1111', // 力箭头深红（牛顿第二定律专用）★修正 #cc1111
  airResistance:      '#6B7280', // 空气阻力 f_air      — gray-500（耗散力，灰色系）   ★新增
  centripetal:        '#D946EF', // 向心力 F_c         — Centripetal Fuchsia        ★新增
  torque:             '#B45309', // 力矩 M / τ         — Torque Brown (amber-700)    ★新增
} as const

// ─── 能量与动量 (Energy & Momentum) ──────────────────────────────────────────
export const ENERGY_COLORS = {
  kineticEnergy:      '#0891B2', // 动能 E_k           — Kinetic Cyan (secondary-600)
  potentialEnergy:    '#7C3AED', // 势能 E_p（重力）    — Potential Violet (violet-700)
  potentialGravity:   '#7C3AED', // 重力势能            — 同 potentialEnergy（语义别名）★新增
  potentialElastic:   '#5B21B6', // 弹性势能            — violet-800（比重力势能深）    ★新增
  mechanicalEnergy:   '#6D28D9', // 机械能 E           — Mechanical Violet
  internalEnergy:     '#B91C1C', // 内能 U             — Internal Red（热学专用）      ★新增
  heatLoss:           '#EF4444', // 热损失 Q_散         — danger-500（配合 opacity 0.5）★新增
  work:               '#15803D', // 功 W               — Work Green (green-700)       ★新增
  power:              '#CA8A04', // 功率 P             — Power Yellow (yellow-600)    ★新增
  momentum:           '#DB2777', // 动量 p             — Momentum Pink (pink-600)
  impulse:            '#EC4899', // 冲量 I             — Impulse Pink (pink-500，比 p 浅）★新增
  angularMomentum:    '#BE185D', // 角动量 L           — pink-700（深）               ★新增
} as const

// ─── 电磁学 (Electromagnetism) ────────────────────────────────────────────────
export const EM_COLORS = {
  electricField:      '#CA8A04', // 电场强度 E         — Electric Yellow (yellow-600)
  electricFieldLine:  '#EAB308', // 电场线             — yellow-500（比场强浅）        ★新增
  magneticField:      '#7E22CE', // 磁感应强度 B       — Magnetic Purple (purple-800)
  magneticFieldDot:   '#A855F7', // 磁场点（出纸面 ·）  — purple-500                   ★新增
  magneticFieldCross: '#6B21A8', // 磁场叉（入纸面 ×）  — purple-900                   ★新增
  electricCurrent:    '#059669', // 电流 I             — Current Emerald (emerald-600)
  currentDirection:   '#10B981', // 电流方向箭头        — emerald-500                  ★新增
  electricPotential:  '#A16207', // 电势 φ             — Potential Brown
  equipotential:      '#D97706', // 等势线             — amber-600                    ★新增
  positiveCharge:     '#EA580C', // 正电荷 +q          — orange-600
  negativeCharge:     '#2563EB', // 负电荷 −q          — blue-600
  electricForce:      '#F97316', // 电场力 F_E         — orange-500                   ★新增
  lorentzForce:       '#8B5CF6', // 洛伦兹力 F_L       — Lorentz Violet ★修正 #8b5cf6 → violet-500
  resistance:         '#78716C', // 电阻 R（元件符号）  — stone-500                    ★新增
  capacitor:          '#0369A1', // 电容 C             — sky-700                      ★新增
  inductor:           '#1D4ED8', // 电感 L             — primary-700                  ★新增
  emf:                '#D97706', // 电动势 ε           — amber-600                    ★新增
  magnetNorth:        '#DC2626', // 磁铁 N 极（物理量层）— danger-600
  magnetSouth:        '#2563EB', // 磁铁 S 极（物理量层）— primary-600
} as const

// ─── 热学 (Thermodynamics) ────────────────────────────────────────────────────
export const THERMO_COLORS = {
  temperature:        '#B91C1C', // 温度 T             — Thermal Red (red-800)
  temperatureHigh:    '#EF4444', // 高温端             — danger-500               ★新增
  temperatureLow:     '#3B82F6', // 低温端             — primary-500（冷色）       ★新增
  pressure:           '#7C3AED', // 压强 p             — violet-700（与动量 p 场景区分）★新增
  volume:             '#059669', // 体积 V             — emerald-600              ★新增
  heatAbsorb:         '#F97316', // 吸热 Q+            — orange-500               ★新增
  heatRelease:        '#0891B2', // 放热 Q−            — secondary-600（散热用冷色）★新增
  gasLaw:             '#F59E0B', // 气体定律曲线        — amber-500（P-V 图）       ★新增
  phaseChange:        '#A78BFA', // 相变过程            — violet-400               ★新增
  boilingPoint:       '#EF4444', // 沸点标注            — danger-500               ★新增
  meltingPoint:       '#60A5FA', // 熔点标注            — primary-400              ★新增
} as const

// ─── 光学 (Optics) ────────────────────────────────────────────────────────────
export const OPTICS_COLORS = {
  lightRay:           '#FBBF24', // 光线（入射）        — Ray Yellow (amber-400)
  lightRayRefracted:  '#F59E0B', // 折射光线            — amber-500（稍深）         ★新增
  lightRayReflected:  '#FDE68A', // 反射光线            — amber-200（浅）           ★新增
  lightRayNormal:     '#94A3B8', // 法线               — neutral-400（辅助线）      ★新增
  wavefront:          '#38BDF8', // 波前               — sky-400                   ★新增
  wavelengthViolet:   '#7C3AED', // 紫光 λ≈400nm       — violet-700               ★新增
  wavelengthBlue:     '#3B82F6', // 蓝光 λ≈450nm       — primary-500              ★新增
  wavelengthGreen:    '#22C55E', // 绿光 λ≈550nm       — green-500                ★新增
  wavelengthYellow:   '#EAB308', // 黄光 λ≈580nm       — yellow-500               ★新增
  wavelengthRed:      '#EF4444', // 红光 λ≈700nm       — danger-500               ★新增
  criticalAngle:      '#F97316', // 全反射临界角标注    — orange-500               ★新增
  focalPoint:         '#EA580C', // 焦点               — orange-600               ★新增
  opticalAxis:        '#CBD5E1', // 光轴               — neutral-300（辅助线）     ★新增
  lens:               '#BFDBFE', // 透镜填充            — primary-200（半透明蓝）   ★新增
  lensStroke:         '#1D4ED8', // 透镜轮廓            — primary-700              ★新增
  mirror:             '#E2E8F0', // 平面镜/凹凸镜面     — neutral-200              ★新增
  mirrorStroke:       '#475569', // 镜面轮廓            — neutral-600              ★新增
} as const

// ─── 波动 (Waves) ─────────────────────────────────────────────────────────────
export const WAVE_COLORS = {
  waveform:           '#2563EB', // 波形曲线（主）       — primary-600             ★新增
  waveformB:          '#DC2626', // 对比波形 B          — danger-600              ★新增
  amplitude:          '#16A34A', // 振幅标注            — green-600               ★新增
  wavelength:         '#D97706', // 波长标注            — amber-600               ★新增
  nodePoint:          '#1E293B', // 波节               — neutral-800（深色点）     ★新增
  antinodePoint:      '#EA580C', // 波腹               — orange-600               ★新增
  standingWave:       '#7C3AED', // 驻波               — violet-700               ★新增
  soundWave:          '#0891B2', // 声波               — secondary-600            ★新增
  doppler:            '#F59E0B', // 多普勒效应标注      — amber-500               ★新增
} as const

// ─── 通用 Canvas 元素 (Canvas Commons) ───────────────────────────────────────
export const CANVAS_COLORS = {
  trackHistory:       '#94A3B8', // 历史轨迹（淡显）    — neutral-400 ⚠️ 固定，不可改
  trackHistoryAlt:    '#C4B5FD', // 紫色轨迹（投影体）  — violet-300 ★修正 #8b5cf6 场景归属
  axis:               '#CBD5E1', // 坐标轴、参考线      — neutral-300
  grid:               '#E2E8F0', // 网格线             — neutral-200
  labelText:          '#1E293B', // Canvas 内文字标注   — neutral-800
  labelTextLight:     '#475569', // Canvas 次要文字     — neutral-600              ★新增
  objectFill:         '#EFF6FF', // 物体填充（浅蓝）    — primary-50
  objectStroke:       '#1E40AF', // 物体轮廓            — primary-800
  objectFillNeutral:  '#F8FAFC', // 中性物体填充        — neutral-50               ★新增
  objectFillWarm:     '#FFF7ED', // 暖色物体填充        — orange-50                ★新增
  referencePoint:     '#F59E0B', // 参考点标注          — amber-500                ★新增
  annotation:         '#8B5CF6', // 标注文字框/标注紫   — violet-500 ★修正 #8b5cf6
  originMark:         '#1E293B', // 坐标原点标记        — neutral-800              ★新增
  vectorTip:          '#1E293B', // 箭头尖端描边        — neutral-800（SVG marker）★新增
} as const

// ─── 聚合导出：PHYSICS_COLORS（向后兼容 + 完整扩展）─────────────────────────
/**
 * 统一的物理量颜色对象，覆盖高中物理全部模块。
 * 按模块分组仅作可读性区分，所有 key 在顶层平铺（便于现有代码直接迁移）。
 *
 * 迁移说明：
 *   旧代码 PHYSICS_COLORS.velocity       ✓ 不变（向后兼容）
 *   旧代码 PHYSICS_COLORS.forceNet       ✓ 不变
 *   旧代码 PHYSICS_COLORS.tension        ✓ 不变（值已修正为 purple-600）
 *   新代码可直接使用 PHYSICS_COLORS.lorentzForce / .wavefront 等新增 token
 */
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
