/**
 * src/theme/physics/scene/mechanics.ts
 * 力学实验器材与物理场景配色规范
 */

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
