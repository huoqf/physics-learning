/**
 * src/theme/physics/scene/materials.ts
 * 通用实验材料、球体材质、环境颜色、物理特效、面板与图表基础组件色规范
 */

// ─── 通用实验材料 (Common Materials) ──────────────────────────────────────────
export const COMMON_MATERIALS = {
  // 钢球/小球立体径向渐变色阶 (中心 -> 边缘)
  steelSphereGrad:    ['#FFFFFF', '#D1D5DB', '#4B5563', '#1F2937'] as const,
  // 真空对照虚影小球立体径向渐变色阶
  vacuumSphereGrad:   ['#E0F2FE', '#38BDF8', '#0284C7', '#0369A1'] as const,
  // 滑轨拉丝金属渐变色阶
  trackMetalGrad:     ['#1E293B', '#475569', '#94A3B8', '#475569', '#1E293B'] as const,
  // 不锈钢滑块/底座材质渐变色阶
  sliderMetalGrad:    ['#F1F5F9', '#CBD5E1', '#64748B', '#334155'] as const,
  // 通用玻璃器皿材质渐变色阶 (如牛顿管、烧杯、棱镜等)
  glassGrad:          ['#93C5FD', '#DBEAFE', '#FFFFFF'] as const,
  // 地球海洋径向渐变色阶（中心 -> 边缘，用于天体力学地球渲染）
  earthOceanGrad:     ['#DBEAFE', '#93C5FD', '#1E3A8A'] as const,
  // 木质小球/木块材质渐变色阶 (如动能定理中的木块)
  woodSphereGrad:     ['#FCD34D', '#B45309'] as const,

  // 拟物高阶材质扩展
  anodizedCopperGrad: ['#FFEDD5', '#FDBA74', '#DD6B20', '#7B341E'] as const, // 亮橙铜 -> 铜红 -> 暗部深红褐
  aluminumMetalGrad:  ['#F8FAFC', '#E2E8F0', '#94A3B8', '#475569'] as const, // 铝合金哑光（高漫反射）
  castIronGrad:       ['#4B5563', '#374151', '#1F2937', '#111827'] as const, // 粗糙铸铁哑光重色
  labWoodGrad:        ['#FEF3C7', '#F59E0B', '#D97706', '#78350F'] as const, // 粗糙木板渐变
  insulationBakelite: ['#4B5563', '#1F2937', '#0F172A'] as const,            // 绝缘黑胶木渐变
  specularGlass: {
    gradient:         ['rgba(255, 255, 255, 0.45)', 'rgba(219, 234, 254, 0.15)', 'rgba(255, 255, 255, 0.05)'] as const, // 表层镜面反射渐变
    edgeHighlight:    'rgba(255, 255, 255, 0.85)', // 1px 厚度边缘反射亮线
    refractionShadow: 'rgba(15, 23, 42, 0.15)',    // 折射阴影
  },
  coherentLaser: {
    redLaser: {
      core:  '#FFFFFF',                 // 红色激光高能白芯
      glow:  '#EF4444',                 // 相干边沿
      beam:  'rgba(239, 68, 68, 0.18)', // 空气散射路径
    },
    greenLaser: {
      core:  '#FFFFFF',
      glow:  '#22C55E',
      beam:  'rgba(34, 197, 94, 0.18)',
    },
  },
  edgeHighlightWhite: 'rgba(255, 255, 255, 0.85)',
  specularWhite:      'rgba(255, 255, 255, 0.55)',
  structStrokeDark:   '#0F172A',
  structStroke:       '#1E293B',
  structFill:         '#334155',
  structStrokeMid:    '#475569',
  structStrokeLight:  '#64748B',
  structStrokePale:   '#CBD5E1',
  structFillPale:     '#E2E8F0',
  structBgPale:       '#F0F9FF',
  structBgLight:      '#F8FAFC',
  stoneStroke:        '#78716C',
  pulleyLight:        '#F5F5F5',
  pulleyMid:          '#B5B5B5',
  pulleyDark:         '#404040',
} as const

// ─── 球体 / 球形器材材质规范 (Sphere & Orb Bodies) ───────────────────────────
export const SPHERE_COLORS = {
  // ── 通用钢珠 / 铁球 / 钢球（自由落体、抛体、圆周、向心力等主球）──
  steel: {
    gradient: COMMON_MATERIALS.steelSphereGrad,
    stroke: '#334155', // neutral-700
    shadow: 'rgba(15, 23, 42, 0.18)',
    glow: 'rgba(148, 163, 184, 0.16)',
    specular: 'rgba(255, 255, 255, 0.55)',
  },

  // ── 真空对照球 / 投影球 / 辅助虚影球 ──
  steelGhost: {
    gradient: COMMON_MATERIALS.vacuumSphereGrad,
    opacity: [0.95, 0.60, 0.25, 0.05] as const,
    stroke: '#38BDF8', // sky-400
    shadow: 'rgba(14, 165, 233, 0.10)',
    glow: 'rgba(56, 189, 248, 0.18)',
    specular: 'rgba(224, 242, 254, 0.80)',
  },

  // ── 高频振动金属球 / 高级模式实验球 ──
  oscillatorMetal: {
    gradient: ['#FFFFFF', '#E2E8F0', '#94A3B8', '#334155'] as const,
    stroke: '#1E293B', // neutral-800
    shadow: 'rgba(15, 23, 42, 0.20)',
    glow: 'rgba(203, 213, 225, 0.18)',
    specular: 'rgba(255, 255, 255, 0.65)',
  },

  // ── 标准砝码球 / 黄铜配重球（平衡、重心实验）──
  brassWeight: {
    gradient: ['#FEF08A', '#EAB308', '#A16207', '#78350F'] as const,
    stroke: '#713F12',
    shadow: 'rgba(120, 53, 15, 0.18)',
    glow: 'rgba(234, 179, 8, 0.14)',
    specular: 'rgba(255, 248, 196, 0.55)',
  },

  // ── 单摆摆球 / 机械能守恒摆球（黄铜配重化，避开速度经典蓝）──
  pendulumBob: {
    gradient: ['#FFFBEB', '#FEF3C7', '#D97706', '#92400E'] as const,
    stroke: '#78350F',
    shadow: 'rgba(120, 53, 15, 0.20)',
    glow: 'rgba(217, 119, 6, 0.15)',
    specular: 'rgba(255, 251, 235, 0.75)',
  },

  // ── 冷色行星（开普勒 / 万有引力 / 天体对照组主行星）──
  planetCool: {
    gradient: ['#DBEAFE', '#93C5FD', '#3B82F6', '#1E3A8A'] as const,
    stroke: '#172554',
    shadow: 'rgba(30, 58, 138, 0.20)',
    glow: 'rgba(96, 165, 250, 0.16)',
    atmosphere: 'rgba(147, 197, 253, 0.16)',
    specular: 'rgba(255, 255, 255, 0.42)',
  },

  // ── 暖色行星（开普勒对照行星 / 次行星）──
  planetWarm: {
    gradient: ['#FECACA', '#F87171', '#DC2626', '#7F1D1D'] as const,
    stroke: '#7F1D1D',
    shadow: 'rgba(127, 29, 29, 0.22)',
    glow: 'rgba(248, 113, 113, 0.14)',
    atmosphere: 'rgba(252, 165, 165, 0.12)',
    specular: 'rgba(255, 255, 255, 0.35)',
  },

  // ── 地球科技风球体（重力、卫星、万有引力模块）──
  earthTech: {
    oceanGradient: COMMON_MATERIALS.earthOceanGrad,
    landGradient: ['#E2E8F0', '#94A3B8', '#475569'] as const,
    stroke: '#1E3A8A',
    shadow: 'rgba(30, 58, 138, 0.18)',
    glow: 'rgba(59, 130, 246, 0.16)',
    atmosphereInner: 'rgba(191, 219, 254, 0.55)',
    atmosphereOuter: 'rgba(147, 197, 253, 0.28)',
    cloud: 'rgba(255, 255, 255, 0.28)',
    specular: 'rgba(255, 255, 255, 0.40)',
  },

  // ── 布朗运动：花粉微粒 ──
  pollen: {
    gradient: ['#FED7AA', '#F97316', '#EA580C', '#7C2D12'] as const,
    stroke: '#7C2D12',
    shadow: 'rgba(124, 45, 18, 0.18)',
    glow: 'rgba(249, 115, 22, 0.15)',
    specular: 'rgba(255, 255, 255, 0.60)',
  },

  // ── 布朗运动：液体分子 ──
  liquidMolecule: {
    gradient: ['#E0F2FE', '#38BDF8', '#0284C7', '#1E3A8A'] as const,
    opacity: [0.95, 0.70, 0.40, 0.15] as const,
    stroke: '#0284C7',
    shadow: 'rgba(2, 132, 199, 0.10)',
    glow: 'rgba(56, 189, 248, 0.12)',
    specular: 'rgba(255, 255, 255, 0.70)',
  },
} as const

// ─── 实验环境与腔体 (Environment & Chambers) ──────────────────────────────────
export const ENVIRONMENT_COLORS = {
  // 真空环境（真空对照轨道外观）
  vacuumStroke:     '#38BDF8', // sky-400
  vacuumBorder:     '#0284C7', // sky-600
  vacuumGlow:       'rgba(56, 189, 248, 0.45)', // 虚影高光
  // 介质/空气环境（普通阻力轨道外观）
  mediaStroke:      '#475569', // neutral-600
  mediaBorder:      '#0F172A', // neutral-900
  spaceBg:          '#020617', // 太空背景色
} as const

// ─── 物理特效与微积分切片 (Special Effects & Math Slices) ─────────────────────
export const SPECIAL_EFFECTS = {
  // 微元面积积分极光渐变（正功/正位移，亮蓝系）
  auroraBlueGrad:   ['#3B82F6', '#93C5FD'] as const,
  // 微元面积积分极光渐变（负功/负位移，亮红系）
  auroraRedGrad:    ['#EF4444', '#FCA5A5'] as const,
  // 积分微元交叉图案前景色
  patternGrid:      '#3B82F6', // 蓝
  patternStripe:    '#EF4444', // 红
  // 扇形扫过面积/光束填充半透明特效
  sectorFill:       'rgba(251, 191, 36, 0.15)',
  shadowLight:      'rgba(0, 0, 0, 0.12)',
  shadowMedium:     'rgba(0, 0, 0, 0.25)',
  glowWhite:        'rgba(255, 255, 255, 0.65)',
  glowWhiteLight:   'rgba(255, 255, 255, 0.25)',
} as const

// ─── 安全与警示 (Safety & Warnings) ──────────────────────────────────────────
export const SAFETY_PRESETS = {
  // 阻尼回收防撞架的安全警示黄色条纹
  safetyYellow:     '#EAB308', // yellow-500
} as const

// ─── 科学浮动面板与看板 (Lab Floating Panels) ──────────────────────────────────
export const LAB_LABELS = {
  // 浮动教学框/定格看板
  panelBg:          'rgba(15, 23, 42, 0.9)', // HUD 深色半透明
  panelText:        '#FFFFFF', // 白色主字
  panelTextMuted:   '#94A3B8', // 辅助灰字
  // 浅色科学浮动面板毛玻璃背景
  glassPanelBg:      'rgba(255, 255, 255, 0.90)',
} as const

// ─── 坐标系图表结构色 ──────────────────────────────────────────────────────────
export const CHART_COMPONENT_COLORS = {
  // 坐标系基础 UI 组件外壳结构色 (弱化降噪)
  gridLine:     '#E2E8F0', // 网格线
  axisLine:     '#94A3B8', // 坐标轴
  tickLabel:    '#64748B', // 轴刻度数字
  axisArrow:    '#475569', // 坐标轴箭头
  labelText:    '#334155', // 轴物理量符号标注文字
  tickMark:     '#94A3B8', // 刻度点
  zeroline:     '#CBD5E1', // 零基准线

  // 数学辅助线
  referenceLine:'#94A3B8', // 辅助线/对照线 (Dashed)
  tangentLine:  '#F59E0B', // 切线斜率示意线 (Dashed，仅用于图表，不与场景电场线重叠)
  asymptoteLine:'#CBD5E1', // 渐近线 (Dashed)

  // 图表特殊标注点
  highlightPt:  '#F59E0B', // 极值/高亮点 (仅限图表标注)
  criticalPt:   '#EF4444', // 临界/突变标记点

  // 电路图表对比色
  circuitR1:    '#3B82F6',
  circuitR2:    '#F97316',
  circuitTotal: '#64748B',
  circuitR3:    '#10B981',
} as const;
