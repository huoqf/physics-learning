/**
 * src/theme/physicsColors.ts
 * 物理量颜色语义映射 — Canvas/SVG 内唯一颜色来源
 *
 * ⚠️ 铁律：
 *  1. 所有 Canvas/SVG 物理量颜色必须从此文件引用，禁止组件内硬编码
 *  2. 新增物理量颜色必须先更新本文件，再进入组件实现
 *  3. 同一画面最多同时显示 5 种物理量颜色
 *  4. 合力箭头比分力箭头粗 1.5 倍（STROKE.vectorMain vs STROKE.vectorSub）
 */

// ─── 物理量颜色映射 ──────────────────────────────────────────────────────
export const PHYSICS_COLORS = {
  // 运动学
  velocity:        '#2563EB', // 速度矢量 v — Velocity Blue
  acceleration:    '#DC2626', // 加速度矢量 a — Acceleration Red
  displacement:    '#4F46E5', // 位移矢量 s — Displacement Indigo

  // 动力学
  forceNet:        '#EA580C', // 合力 F_net — Force Orange
  gravity:         '#475569', // 重力 mg — Gravity Slate（常见，视觉弱化）
  normalForce:     '#0D9488', // 法向力 N — Normal Teal
  friction:        '#D97706', // 摩擦力 f — Friction Amber
  elasticForce:    '#16A34A', // 弹力（弹簧）— Spring Green
  // ⚠️ 原为 #7C3AED，与 potentialEnergy 完全同值导致同屏混淆，已修正为 purple-600
  tension:         '#9333EA', // 绳中张力 T — Tension Purple-600

  // 能量与动量
  kineticEnergy:   '#0891B2', // 动能 Ek — Kinetic Cyan
  potentialEnergy: '#7C3AED', // 势能 Ep — Potential Purple（violet-700，与 tension 已区分）
  mechanicalEnergy:'#6D28D9', // 机械能 E — Mechanical Violet
  momentum:        '#DB2777', // 动量 p — Momentum Pink

  // 电磁学
  electricField:   '#CA8A04', // 电场强度 E — Electric Yellow
  magneticField:   '#7E22CE', // 磁感应强度 B — Magnetic Purple
  electricCurrent: '#059669', // 电流 I — Current Emerald（与 forceNet 橙色区分）
  electricPotential:'#A16207',// 电势 φ — Potential Brown
  positiveCharge:  '#EA580C', // 正电荷 — Charge Orange（与 forceNet 区分场景使用）
  negativeCharge:  '#2563EB', // 负电荷 — Charge Blue（与 velocity 区分场景使用）
  magnetNorth:     '#DC2626', // 磁铁 N 极 — Magnet North Red
  magnetSouth:     '#2563EB', // 磁铁 S 极 — Magnet South Blue

  // 热学
  temperature:     '#B91C1C', // 温度 T — Thermal Red

  // 光学
  lightRay:        '#FBBF24', // 光线 — Ray Yellow

  // 通用
  trackHistory:    '#94A3B8', // 历史轨迹（淡显）— Track Gray（固定，不可改）
  axis:            '#CBD5E1', // 坐标轴、参考线 — Grid Neutral
  labelText:       '#1E293B', // Canvas 内文字标注 — Label Dark
  grid:            '#E2E8F0', // 网格线 — neutral-200
  objectFill:      '#EFF6FF', // 物体填充（浅蓝，不干扰矢量）
  objectStroke:    '#1E40AF', // 物体轮廓（primary-800）
} as const

export type PhysicsColorKey = keyof typeof PHYSICS_COLORS

// ─── Canvas 元素尺寸规范 ─────────────────────────────────────────────────
export const CANVAS_STYLE = {
  stroke: {
    vectorMain:   3,   // 主矢量箭头（合力、速度）
    vectorSub:    2,   // 分量矢量箭头
    objectLine:   2,   // 物体轮廓
    axis:         1.5, // 坐标轴
    trackHistory: 1.5, // 历史轨迹（配合 opacity 0.4）
    reference:    1,   // 参考线、辅助线（配合 dashed）
  },
  opacity: {
    trackHistory: 0.4, // 历史轨迹透明度
    dimmed:       0.9, // 暂停时 Canvas 整体
    gridLine:     0.6, // 网格线
  },
  arrow: {
    headLengthRatio: 0.15, // 箭头头部长度 = 矢量长度 × 0.15
    minHeadLength:   8,    // 最小箭头头长（px），防止过短矢量无头
    headAngleDeg:    25,   // 箭头两侧夹角（度）
  },
  object: {
    pointMassRadius: 8,  // 点质量（小球）默认半径（px，随 Canvas 缩放）
    minRadius:       4,
    maxRadius:       16,
  },
  font: {
    labelSize:   13, // 物理量标注字号（px）
    labelWeight: 'bold',
    axisSize:    12, // 坐标轴数值字号
    formulaSize: 12, // Canvas 内公式注释字号
    bodySize:    14, // 标题/较大文字字号
    family:      "'Inter', 'PingFang SC', sans-serif",
  },
  dash: {
    reference: [6, 4], // 参考线虚线模式 [线段, 间隔]
    guide:     [3, 3], // 导引虚线（更细）
  },
} as const

// ─── 图表配色（x-t / v-t / F-x 等物理图像）─────────────────────────────
export const CHART_COLORS = {
  primary:   '#2563EB', // 主曲线
  compareA:  '#0891B2', // 对比曲线 A
  compareB:  '#10B981', // 对比曲线 B
  compareC:  '#D97706', // 对比曲线 C
  reference: '#F87171', // 参考线、切线（danger-400，dashed）
  areaFill:  '#BFDBFE', // 面积填充（primary-200，opacity 0.5）
  gridLine:  '#E2E8F0', // 坐标系网格
  axisLine:  '#94A3B8', // 坐标轴
  labelText: '#334155', // 图表标注文字
} as const

// ─── 能量柱状图专用 ──────────────────────────────────────────────────────
export const ENERGY_BAR_COLORS = {
  kinetic:    '#0891B2', // 动能 Ek
  potential:  '#7C3AED', // 势能 Ep
  mechanical: '#1D4ED8', // 机械能（外框线）
  heat:       '#EF4444', // 热损失（半透明 0.5）
} as const
