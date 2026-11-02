/**
 * src/theme/physics/scene/optics.ts
 * 光学与现代物理实验器材配色规范
 */

// ─── 光学器具外观 (Optical Apparatus) ────────────────────────────────────────
export const OPTICAL_COLORS = {
  // 光屏
  screenFill:     '#FAFAFA', // 正面（亮色）
  screenDarkFill: '#000000', // 正面（暗色背景，用于干涉/衍射/偏振条纹显影）
  screenBack:     '#E5E7EB', // 背面
  screenStroke:   '#6B7280', // 外框
  screenFoot:     '#374151', // 支架

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

  // 氢原子能级色标（n=1→4，能量越低越"红"，n≥5 近似电离取灰）
  levelColors:     ['#F87171', '#FB923C', '#FACC15', '#60A5FA'] as const,
  levelIonized:    '#A1A1AA', // 电离态/高激发态能级色标 (zinc-400)

  // 氢原子发射谱线（按跃迁能量着色，红外→可见→紫外三档区分）
  spectralIr:      '#FF4444', // 0.66 eV (4→3) 红外——不可见，示意红
  spectralRed:     '#EF4444', // 1.89 eV (3→2) 红光 H-α
  spectralCyan:    '#00F0FF', // 2.55 eV (4→2) 青光 H-β
  spectralUvA:     '#818CF8', // 10.20 eV (2→1) 紫外（Lyman-α）
  spectralUvB:     '#C084FC', // 12.09 eV (3→1) 紫外
  spectralUvC:     '#D8B4FE', // 12.75 eV (4→1) 紫外

  // 光谱条不可见区压暗底色（渐变起止）
  irBandBg:        ['#120404', '#1B0808'] as const, // 红外区
  uvBandBg:        ['#130A24', '#080312'] as const, // 紫外区
} as const;

// ─── 暗场观察屏（激光 / 衍射 / 偏振的观察窗） ────────────────────────────────
export const DARK_SCREEN_COLORS = {
  bg:     '#090D16', // 暗场屏幕底色（近黑蓝）
  stroke: '#2A354F', // 暗场边框
  screen: '#1E3A34', // 观察窗玻璃（偏青绿）
  pitch:  '#000000', // 纯黑暗场（衍射/干涉屏）
} as const;
