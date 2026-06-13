/**
 * src/features/mechanics/kinematics/freeFallConfig.ts
 * 自由落体（牛顿管）动画 — 专属业务配置
 */

// ─── 物体材质参数 ──────────────────────────────────────────────────────
export const MATERIAL = {
  ironBall: { mass: 0.5,   baseDragK: 0.001, label: '铁球' },
  coin:     { mass: 0.01,  baseDragK: 0.01,  label: '硬币' },
  feather:  { mass: 0.003, baseDragK: 0.02,  label: '羽毛' },
  paper:    { mass: 0.005, baseDragK: 0.015, label: '纸片' },
} as const

export type MaterialA = keyof Pick<typeof MATERIAL, 'ironBall' | 'coin'>
export type MaterialB = keyof Pick<typeof MATERIAL, 'feather' | 'paper'>

// ─── 布局比例 Token（相对容器尺寸，无单位）──────────────────────────────
export const FREE_FALL_LAYOUT = {
  /** 左侧动画舞台占总宽度比例 */
  stageRatio: 0.5,
  /** 舞台与数据区之间间隙占总宽度比例 */
  gapRatio: 0.02,
  tube: {
    /** 管壁水平内边距占舞台宽度比例 */
    paddingXRatio: 0.15,
    /** 管顶距容器顶部比例 */
    topRatio: 0.1,
    /** 管底距容器顶部比例 */
    bottomRatio: 0.88,
    /** 释放点相对管顶的偏移量（px，固定值） */
    originOffset: 20,
    /** 地面线相对管底的偏移量（px，固定值） */
    groundOffset: 10,
  },
  ball: {
    /** 铁球/硬币 X 位置占管内宽度比例（从管左壁起） */
    ballXRatio: 0.35,
    /** 羽毛/纸片 X 位置占管内宽度比例（从管左壁起） */
    featherXRatio: 0.65,
  },
  chart: {
    /** v-t 图顶部距容器顶部比例 */
    vtChartTopRatio: 0.03,
    /** v-t 图高度占容器高度比例 */
    vtChartHeightRatio: 0.62,
  },
} as const

// ─── 撞击波纹视觉参数 ──────────────────────────────────────────────────
/** 牛顿管物理高度 (m) */
export const TUBE_PHYSICAL_HEIGHT = 2.0

/** 撞击波纹持续时间（s） */
export const RIPPLE_DURATION = 0.5

/** 撞击波纹最大扩展半径（px） */
export const RIPPLE_MAX_RADIUS = 30
