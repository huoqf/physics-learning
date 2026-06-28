/**
 * src/theme/physics/scene/optics.ts
 * 光学与现代物理实验器材配色规范
 */

// ─── 光学器具外观 (Optical Apparatus) ────────────────────────────────────────
export const OPTICAL_COLORS = {
  // 光屏
  screenFill:    '#FAFAFA', // 正面
  screenBack:    '#E5E7EB', // 背面
  screenStroke:  '#6B7280', // 外框
  screenFoot:    '#374151', // 支架

  // 光源
  sourceBody:    '#374151', // 外壳
  sourceGlow:    '#FDE047', // 发光口
  sourceSlot:    '#1F2937', // 缝隙（单缝/双缝）

  // 棱镜
  prismFill:     '#E0F2FE', // 玻璃体        — sky-100（透明感）
  prismStroke:   '#0284C7', // 轮廓          — sky-600
  prismGlow:     '#BAE6FD', // 折射光效      — sky-200

  // 光束（平行光/发散光 填充区域）
  beamFill:      'rgba(251,191,36,0.15)', // 光束填充（极淡黄）
  beamStroke:    '#FBBF24', // 光束边界      — amber-400

  // 观察者眼睛
  eyeFill:       '#DBEAFE', // 眼球          — primary-100
  eyeIris:       '#2563EB', // 虹膜          — primary-600
  eyePupil:      '#1E293B', // 瞳孔          — neutral-800
} as const

// ─── 现代物理 ────────────────────────────────────────────────────────────────
export const MODERN_PHYSICS_COLORS = {
  // 光电管
  cathodePlate:    '#CBD5E1', // 阴极金属板 (slate-300)
  activeCoating:   '#A1A1AA', // 光电活性金属涂层 (zinc-400)
  anodeWire:       '#475569', // 阳极金属针 (slate-600)
  photoElectron:   '#38BDF8', // 逸出的光电子 (sky-400，发光微粒)
  electronGlow:    'rgba(56, 189, 248, 0.4)', // 电子流路径淡蓝微光

  // 原子能级跃迁
  levelLine:       '#334155', // 能级轨道线 (slate-700)
  levelGround:     '#0F172A', // 基态轨道线 (强调其最稳定)
  transitionArrow: '#7C3AED', // 跃迁指示箭头 (violet-600，避开弹力玫红，契合高频紫光语义)
  emittedPhoton:   '#F59E0B', // 辐射光子波浪线 (amber-500)
} as const;
