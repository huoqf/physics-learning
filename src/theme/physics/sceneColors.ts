/**
 * src/theme/physics/sceneColors.ts
 * 场景结构性颜色 — 3D 渲染面、装饰性器材、UI 道具外观专用
 *
 * ═══════════════════════════════════════════════════════════════════
 *  与 PHYSICS_COLORS 的本质区别：
 *
 *  PHYSICS_COLORS   → 物理量的语义色（力、速度、能量…）
 *                     颜色代表"这是什么物理量"
 *
 *  SCENE_COLORS     → 器材/道具的外观色（磁铁 3D 面、线圈、灯泡…）
 *                     颜色代表"这个东西长什么样"
 * ═══════════════════════════════════════════════════════════════════
 *
 *  命名约定：
 *    SCENE_COLORS.<器材分组>.<部位/明暗/状态>
 *
 *  3D 拟物明暗层约定（从亮到暗）：
 *    light   — 受光面（最亮，highlight）
 *    base    — 正面/主面（标准亮度）
 *    mid     — 侧面/过渡面
 *    dark    — 背光面/暗部
 *    shadow  — 投影/最暗
 *    stroke  — 轮廓描边
 */

// ─── 磁铁 (Magnet) ────────────────────────────────────────────────────────────
export const MAGNET_COLORS = {
  // N 极（红）3D 拟物面
  northLight:    '#FF6B6B', // N 极受光面高光
  northBase:     '#DC2626', // N 极正面      — danger-600（与 PHYSICS_COLORS.magnetNorth 统一）
  northMid:      '#B91C1C', // N 极侧面      — danger-700
  northDark:     '#991B1B', // N 极暗部      — danger-800
  northShadow:   '#7F1D1D', // N 极最暗/投影 — danger-900
  northStroke:   '#450A0A', // N 极描边
  northLabel:    '#FFFFFF', // N 字标签      — 白

  // S 极（蓝）3D 拟物面
  southLight:    '#60A5FA', // S 极受光面高光 — primary-400
  southBase:     '#2563EB', // S 极正面      — primary-600（与 PHYSICS_COLORS.magnetSouth 统一）
  southMid:      '#1D4ED8', // S 极侧面      — primary-700
  southDark:     '#1E40AF', // S 极暗部      ★修正 #1565cc → primary-800
  southShadow:   '#1E3A8A', // S 极最暗/投影 ★修正 #0c3873 / #0d4082 → primary-900
  southStroke:   '#172554', // S 极描边      — primary-950
  southLabel:    '#FFFFFF', // S 字标签      — 白

  // 磁铁连接部 / 中性区（条形磁铁中段、马蹄形连接部）
  bodyFill:      '#D4D4D4', // 主体灰
  bodyStroke:    '#737373', // 主体描边
  poleEnd:       '#E5E7EB', // 极面端部
} as const

// ─── 线圈 / 导线 (Coil & Wire) ────────────────────────────────────────────────
export const COIL_COLORS = {
  // 铜导线（电磁感应线圈）
  copperLight:   '#F0C060', // 铜线受光面高光
  copperBase:    '#B8860B', // 铜线正面      ★复用硬编码 #B8860B（Dark Goldenrod）
  copperMid:     '#9A7209', // 铜线侧面
  copperDark:    '#7A5A07', // 铜线暗部
  copperStroke:  '#5C4205', // 铜线描边

  // 漆包线（绿漆，常见电机绕组）
  enamelBase:    '#7C9A22', // 漆包线正面    ★复用硬编码 #7c9a22
  enamelDark:    '#5A7219', // 漆包线暗部
  enamelStroke:  '#3D5010', // 漆包线描边

  // 绝缘导线（黑/深灰皮）
  insulation:    '#374151', // 绝缘皮主色    — gray-700
  insulationSt:  '#1F2937', // 绝缘皮描边    — gray-800

  // 通电激活状态
  activeGlow:    '#059669', // 通电光晕      — emerald-600（与 PHYSICS_COLORS.electricCurrent 一致）
  activeGlowBg:  '#D1FAE5', // 通电光晕背景  — emerald-100
} as const

// ─── 弹簧 (Spring) ────────────────────────────────────────────────────────────
export const SPRING_COLORS = {
  coilLight:     '#A8A8A8', // 弹簧受光面
  coilBase:      '#6B7280', // 弹簧主体      — gray-500
  coilDark:      '#374151', // 弹簧暗部      — gray-700
  coilStroke:    '#1F2937', // 弹簧描边      — gray-900
  compressed:     '#F97316', // 压缩状态：橙色（防撞车）
  stretched:      '#8B5CF6', // 拉伸状态：紫色（防撞车）
  natural:        '#6B7280', // 原长状态      — gray-500
  compressedGlow: 'rgba(249, 115, 22, 0.2)', // 压缩光晕
  stretchedGlow:  'rgba(139, 92, 246, 0.2)', // 拉伸光晕

  // 💡 扩展项目规范颜色：轻质弹簧与拟物阴影金属渐变
  lightCoilBase:   '#9CA3AF', // 轻质弹簧主体    — gray-400
  lightCoilStroke: '#4B5563', // 轻质弹簧描边    — gray-600
  lightCoilGlow:   'rgba(156, 163, 175, 0.15)', // 轻质弹簧半透明发光底色

  springMetalGrad:      ['#F3F4F6', '#D1D5DB', '#9CA3AF', '#4B5563'] as const,
  lightSpringMetalGrad: ['#F9FAFB', '#F3F4F6', '#D1D5DB', '#9CA3AF'] as const,

  // 固定端/墙
  wallFill:      '#E5E7EB', // 固定壁填充    — gray-200
  wallStroke:    '#6B7280', // 固定壁描边    — gray-500
  wallHatch:     '#9CA3AF', // 斜线阴影      — gray-400
} as const

// ─── 斜面 / 地面 / 接触面 (Incline & Surface) ────────────────────────────────
export const SURFACE_COLORS = {
  // 地面
  groundFill:    '#F0FDF4', // 地面填充      — green-50
  groundStroke:  '#15803D', // 地面描边      — green-700
  groundHatch:   '#86EFAC', // 地面斜线      — green-300

  // 斜面
  inclineFill:   '#FEF9C3', // 斜面填充      — yellow-100
  inclineStroke: '#CA8A04', // 斜面描边      — yellow-600

  // 墙面
  wallFill:      '#F3F4F6', // 墙面填充      — gray-100
  wallStroke:    '#9CA3AF', // 墙面描边      — gray-400
  wallHatch:     '#D1D5DB', // 墙面斜线      — gray-300

  // 摩擦面标注
  roughMark:     '#D97706', // 粗糙面标注    — amber-600（与摩擦力同色系）
  smoothMark:    '#94A3B8', // 光滑面标注    — neutral-400（视觉弱化）

  // 滑轮 & 绳
  pulleyFill:    '#6B7280', // 滑轮主体      — gray-500
  pulleyStroke:  '#1F2937', // 滑轮描边
  ropeColor:     '#92400E', // 绳子主色      — amber-800（天然麻绳）
  ropeActive:    '#D97706', // 绳子受力态    — amber-600
} as const

// ─── 摆 / 转动体 (Pendulum & Rotation) ───────────────────────────────────────
export const PENDULUM_COLORS = {
  rodFill:       '#64748B', // 摆杆/转轴杆   — neutral-500
  rodStroke:     '#1E293B', // 摆杆描边      — neutral-800
  pivotFill:     '#94A3B8', // 轴心填充      — neutral-400
  pivotStroke:   '#334155', // 轴心描边      — neutral-700
  bobFill:       '#3B82F6', // 摆球填充      — primary-500
  bobStroke:     '#1E40AF', // 摆球描边      — primary-800
  arcPath:       '#CBD5E1', // 轨迹弧线      — neutral-300（dashed）
  axisDecor:     '#3A2010', // 旋转轴装饰色  ★复用硬编码 #3a2010
  axisDecorLight:'#5C3520', // 旋转轴受光面
  equilibrium:   '#10B981', // 平衡位置标注  — emerald-500
} as const

// ─── 电路元件外观 (Circuit Component Appearance) ─────────────────────────────
export const CIRCUIT_COLORS = {
  // 导线
  wire:          '#1F2937', // 导线主色      — gray-800
  wireActive:    '#059669', // 通电导线      — emerald-600
  wireBroken:    '#EF4444', // 断路标记      — danger-500
  node:          '#111827', // 节点圆点      — gray-900

  // 开关
  switchOpen:    '#EF4444', // 断开状态      — danger-500
  switchClosed:  '#10B981', // 闭合状态      — emerald-500

  // 电池/电源
  batteryPos:    '#DC2626', // 正极          — danger-600
  batteryNeg:    '#1F2937', // 负极          — gray-800
  batteryBody:   '#F3F4F6', // 外壳          — gray-100

  // 电阻
  resistorFill:  '#FDE68A', // 电阻器填充    — amber-200
  resistorStroke:'#92400E', // 电阻器描边    — amber-800

  // 电容
  capacitorPlate:'#93C5FD', // 极板          — primary-300
  capacitorSt:   '#1D4ED8', // 电容描边      — primary-700

  // 电感
  inductorWire:  '#B8860B', // 电感线圈      — copper（同 coilBase）

  // 仪表（电压表/电流表）
  voltmeterFace: '#F0FDF4', // 电压表表盘    — green-50
  ammeterFace:   '#FFF7ED', // 电流表表盘    — orange-50
  meterFrame:    '#374151', // 仪表外框      — gray-700
  meterNeedle:   '#DC2626', // 指针          — danger-600
  meterScale:    '#1F2937', // 刻度线        — gray-900

  // 灯泡（熄灭状态，发光状态见 BULB_GLOW_COLORS）
  bulbGlass:     '#FEF9C4', // 灯泡玻璃壳（熄灭）— yellow-100
  bulbGlassOff:  '#F3F4F6', // 灯泡外壳灰（熄灭暗态）— gray-100
  bulbGlassStroke:'#9CA3AF',// 灯泡描边
  bulbFilament:  '#92400E', // 灯丝主色      — amber-800
  bulbBase:      '#374151', // 灯头外壳      — gray-700
} as const

// ─── 灯泡发光渐变效果 (Bulb Glow) ────────────────────────────────────────────
export const BULB_GLOW_COLORS = {
  // 径向渐变色阶（中心 → 外围，用于 radialGradient / canvas createRadialGradient）
  glowCenter:    '#FFFFFF', // 中心纯白高光
  glowInner:     '#FFF176', // 内圈光晕      ★复用硬编码 #FFF176
  glowMid:       '#FFC107', // 中圈光晕      ★复用硬编码 #FFC107
  glowOuter:     '#FF8F00', // 外圈光晕      ★复用硬编码 #FF8F00
  glowFade:      'rgba(255,143,0,0)', // 完全透明（渐变终点）

  // 亮度状态预设（配合 glowOuter 等使用）
  dim:           '#FEF08A', // 低亮 (~10% 功率)  — yellow-200
  normal:        '#FDE047', // 正常 (~50% 功率)  — yellow-300
  bright:        '#EAB308', // 全亮 (100% 功率)  — yellow-500
  overload:      '#EF4444', // 过载（红光警示）  — danger-500

  // 玻璃壳发光状态
  glassDim:      '#FFFDE7', // 微亮
  glassNormal:   '#FFF9C4', // 正常亮
  glassBright:   '#FFF176', // 全亮
} as const

// ─── 手势教具 (Hand Gesture / Left-Hand Rule) ─────────────────────────────────
export const HAND_COLORS = {
  // 皮肤色阶（适合亚洲肤色，与项目整体蓝色调协调）
  skinLight:     '#F3C7A6', // 受光面高光    ★复用硬编码 #F3C7A6
  skinBase:      '#E6B896', // 主皮肤色      ★复用硬编码 #E6B896
  skinMid:       '#D4A574', // 阴影过渡面
  skinDark:      '#7C4A2E', // 深阴影/暗部   ★复用硬编码 #7C4A2E
  skinShadow:    '#5C3422', // 最暗投影

  // 骨骼手（线框风格，解剖教学专用）
  boneLight:     '#F5F5F4', // 骨骼受光面    — stone-100
  boneBase:      '#E7E5E4', // 骨骼主色      — stone-200
  boneDark:      '#A8A29E', // 骨骼暗部      — stone-400
  boneStroke:    '#44403C', // 骨骼描边      — stone-700
  jointFill:     '#D6D3D1', // 关节填充      — stone-300
  jointStroke:   '#57534E', // 关节描边      — stone-600

  // 方向指示配色（左手定则三指颜色）
  thumbDir:      '#16A34A', // 拇指方向      — green-600（常表示运动方向 v）
  indexDir:      '#2563EB', // 食指方向      — primary-600（常表示 B 场方向）
  middleDir:     '#DC2626', // 中指方向      — danger-600（常表示电流 I 方向）
  arrowDecor:    '#1E293B', // 手势说明箭头  — neutral-800
} as const

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
    }
  }
} as const


// ─── 球体 / 球形器材材质规范 (Sphere & Orb Bodies) ───────────────────────────
// 说明：
// 1. 统一所有“小球/钢珠/摆球/行星/地球”外观 token
// 2. 渐变顺序统一为：中心高光 → 受光面 → 过渡面 → 暗部
// 3. 球体本体属于“器材外观色”，不得与 PHYSICS_COLORS 的物理量语义色混用
// 4. 旧代码仍可继续使用 COMMON_MATERIALS.*Grad；本组用于后续统一迁移
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
  // 保持低饱和、克制，不做卡通红球
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
} as const

// ─── 安全与警示 (Safety & Warnings) ──────────────────────────────────────────
export const SAFETY_PRESETS = {
  // 阻尼回收防撞架的安全警示黄色条纹
  safetyYellow:     '#EAB308', // yellow-500
} as const

// ─── 科学浮动面板与看板 (Lab Floating Panels) ──────────────────────────────────
export const LAB_LABELS = {
  // 浮动教学框/定格看板
  panelBg:          '#0F172A', // neutral-900 (通常带 0.88-0.92 的 opacity)
  panelText:        '#FFFFFF', // 白色主字
  panelTextMuted:   '#FCA5A5', // 辅助/负值红字
  // 浅色科学浮动面板毛玻璃背景
  glassPanelBg:      'rgba(255, 255, 255, 0.90)',
} as const

// ─── 新增高中物理实验器材色配置 ───────────────────────────────────────────────
export const MECHANICS_APPARATUS_COLORS = {
  // 打点计时器与纸带
  tapeBg:          '#F8FAFC', // 纸带背景 (slate-50)
  tapeBorder:      '#E2E8F0', // 纸带边缘 (slate-200)
  tapeDotActive:   '#0F172A', // 刚打下的碳点 (neutral-900)
  tapeDotHistory:  '#64748B', // 历史打点 (neutral-500)
  timerBody:       '#475569', // 计时器外壳 (slate-600)
  timerVibrator:   '#94A3B8', // 振针/电磁线圈铁芯

  // 碰撞实验小车与配重（避开天蓝支持力以作视觉层级降噪）
  cartActive:      '#334155', // 主动小车 (slate-700)
  cartPassive:     '#CBD5E1', // 被动小车 (slate-300)
  bumperRubber:    '#1E293B', // 防撞橡胶缓冲头 (neutral-800)
  weightBlock:     '#475569', // 附加配重金属块 (slate-600)
} as const;

export const ELECTRICAL_APPARATUS_COLORS = {
  // 滑动变阻器
  rheostatCeramic: '#F1F5F9', // 绝缘瓷管 (slate-100)
  rheostatWire:    '#B45309', // 电阻线圈 (amber-700)
  rheostatRod:     '#CBD5E1', // 上方金属导电滑杆 (slate-300)
  rheostatSlider:  '#64748B', // 滑片主体 (slate-500)
  rheostatContact: '#F59E0B', // 接触点指示高亮 (amber-500)

  // 变阻箱
  dialPlate:       '#1E293B', // 旋钮面板
  dialKnob:        '#0F172A', // 阻值旋钮
  dialMarker:      '#EF4444', // 指示刻度线 (red-500)

  // 多用电表与表笔
  multimeterBody:  '#EA580C', // 电表深橙外壳 (orange-600，低饱和度防抢眼)
  probeRed:        '#DC2626', // 红表笔/正接线柱 (辅助“红进”电流)
  probeBlack:      '#1F2937', // 黑表笔/负接线柱 (辅助“黑出”电流)
} as const;

export const ELECTROSTATIC_APPARATUS_COLORS = {
  // 验电器
  ballFill:        '#D1D5DB', // 顶端感应金属球 (gray-300)
  rodFill:         '#9CA3AF', // 金属传导杆 (gray-400)
  foilGold:        '#FDE047', // 箔片黄金色 (yellow-300，反射金属光泽)
  foilGlow:        'rgba(253, 224, 71, 0.3)', // 电荷聚集时箔片的微光
  insulatorPlug:   '#D8B4FE', // 橡胶/橡皮绝缘塞 (purple-300)
  glassDomeFill:   'rgba(241, 245, 249, 0.15)', // 玻璃外罩半透明填充
  glassDomeStroke: '#94A3B8', // 玻璃罩轮廓 (slate-400)
} as const;

export const THERMO_CHAMBER_COLORS = {
  // 气体活塞气缸
  cylinderWall:    '#E2E8F0', // 气缸壁 (slate-200)
  pistonBody:      '#94A3B8', // 活塞金属主体 (slate-400)
  pistonSeal:      '#1F2937', // 橡胶密封圈 (gray-800)
  gasVolumeBase:   '#F0FDFA', // 理想气体基色 (teal-50，极淡，确保矢量清晰)
  gasVolumeHot:    '#FEF2F2', // 气体受热膨胀低饱和底色填充 (red-50)
  gasVolumeDense:  '#CCFBF1', // 气体高压压缩低饱和底色填充 (teal-100)
} as const;

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
} as const;


// ─── 聚合导出：SCENE_COLORS ───────────────────────────────────────────────────
export const SCENE_COLORS = {
  materials: COMMON_MATERIALS,
  sphere: SPHERE_COLORS,
  environment: ENVIRONMENT_COLORS,
  effects: SPECIAL_EFFECTS,
  safety: SAFETY_PRESETS,
  labels: LAB_LABELS,
  magnet:   MAGNET_COLORS,
  coil:     COIL_COLORS,
  spring:   SPRING_COLORS,
  surface:  SURFACE_COLORS,
  pendulum: PENDULUM_COLORS,
  circuit:  CIRCUIT_COLORS,
  bulb:     BULB_GLOW_COLORS,
  hand:     HAND_COLORS,
  optical:  OPTICAL_COLORS,
  thermal:  THERMAL_COLORS,

  // 扩展高中物理器材与图表 UI 结构色
  mechanicsApparatus: MECHANICS_APPARATUS_COLORS,
  electricalApparatus: ELECTRICAL_APPARATUS_COLORS,
  electrostaticApparatus: ELECTROSTATIC_APPARATUS_COLORS,
  thermoChamber: THERMO_CHAMBER_COLORS,
  modernPhysics: MODERN_PHYSICS_COLORS,
  charts: CHART_COMPONENT_COLORS,
} as const

export type SceneColorGroup   = keyof typeof SCENE_COLORS
export type MaterialsColorKey = keyof typeof COMMON_MATERIALS
export type SpherePresetKey   = keyof typeof SPHERE_COLORS
export type EnvironmentColorKey = keyof typeof ENVIRONMENT_COLORS
export type EffectsColorKey   = keyof typeof SPECIAL_EFFECTS
export type SafetyColorKey    = keyof typeof SAFETY_PRESETS
export type LabLabelsColorKey = keyof typeof LAB_LABELS
export type MagnetColorKey    = keyof typeof MAGNET_COLORS
export type CoilColorKey      = keyof typeof COIL_COLORS
export type SpringColorKey    = keyof typeof SPRING_COLORS
export type SurfaceColorKey   = keyof typeof SURFACE_COLORS
export type PendulumColorKey  = keyof typeof PENDULUM_COLORS
export type CircuitColorKey   = keyof typeof CIRCUIT_COLORS
export type BulbColorKey      = keyof typeof BULB_GLOW_COLORS
export type HandColorKey      = keyof typeof HAND_COLORS
export type OpticalColorKey   = keyof typeof OPTICAL_COLORS
export type ThermalColorKey   = keyof typeof THERMAL_COLORS
