/**
 * src/theme/physics/scene/thermal.ts
 * 热学实验器具与气缸腔体配色规范
 */

// ─── 热学实验器具 (Thermal Apparatus) ────────────────────────────────────────
export const THERMAL_COLORS = {
  // 温度计
  thermometerBulb:    '#DC2626', // 球部（汞色）— danger-600
  thermometerFluid:   '#EF4444', // 液柱        — danger-500
  thermometerBody:    '#F8FAFC', // 管身        — neutral-50
  thermometerScale:   '#475569', // 刻度线      — neutral-600

  // 加热器
  heaterOn:      '#FF6B35', // 开启
  heaterOff:     '#9CA3AF', // 关闭          — gray-400
  heaterCoil:    '#B91C1C', // 加热丝（红热）— red-800

  // 气体容器 / 烧杯
  beakerFill:    'rgba(186,230,253,0.3)', // 液体（半透明水色）
  beakerStroke:  '#0284C7',              // 烧杯轮廓    — sky-600
  gasChamberFill:'rgba(251,191,36,0.12)', // 气体（极淡黄）
  gasChamberSt:  '#D97706',              // 气体容器描边 — amber-600

  // 热流方向
  heatFlowHot:   '#F97316', // 热流（热端）  — orange-500
  heatFlowCold:  '#38BDF8', // 热流（冷端）  — sky-400
} as const

// ─── 气缸与活塞 ──────────────────────────────────────────────────────────────
export const THERMO_CHAMBER_COLORS = {
  // 气体活塞气缸
  cylinderWall:    '#E2E8F0', // 气缸壁 (slate-200)
  pistonBody:      '#94A3B8', // 活塞金属主体 (slate-400)
  pistonSeal:      '#1F2937', // 橡胶密封圈 (gray-800)
  gasVolumeBase:   '#F0FDFA', // 理想气体基色 (teal-50，极淡，确保矢量清晰)
  gasVolumeHot:    '#FEF2F2', // 气体受热膨胀低饱和底色填充 (red-50)
  gasVolumeDense:  '#CCFBF1', // 气体高压压缩低饱和底色填充 (teal-100)
} as const;
