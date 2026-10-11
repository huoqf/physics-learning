/**
 * 测定玻璃折射率（插针法）实验——中屏设计坐标布局常量。
 * 基于 CANVAS_PRESETS.splitV (840 × 325) 规范设计。
 */

/** 设计坐标系尺寸 */
export const SCENE_DESIGN_W = 840
export const SCENE_DESIGN_H = 325

/** 物理尺寸到设计坐标像素的缩放比例：1 mm = 1.8 design-unit */
export const PX_PER_MM = 1.8

/** 入射点 O 在设计坐标系中的绝对坐标 */
export const INCIDENT_POINT_DESIGN = {
  x: 380,
  y: 110,
}

/** 实验绘图白纸区域 (在木质实验板上) */
export const DRAWING_PAPER_BOUNDS = {
  x: 80,
  y: 15,
  width: 680,
  height: 295,
}

/** 玻璃砖在设计坐标系中的水平范围 */
export const GLASS_SLAB_DESIGN = {
  width: 380,
  // 玻璃砖顶面与界面 aa' 重合 (y = 110)
  topY: 110,
  // 居中偏右一些，给左侧入射大头针留足空间
  leftX: 230,
}

/** 法线绘制范围 */
export const NORMAL_LINE_RANGE = {
  topY: 30,
  bottomY: 290,
}

/** 实验步骤枚举 */
export enum ExperimentStep {
  /** 0: 放置玻璃砖并画出表面边界 aa', bb' 与法线 */
  SETUP_BOUNDARIES = 0,
  /** 1: 在入射光线上竖直插入大头针 P1, P2 */
  INSERT_INPUT_PINS = 1,
  /** 2: 从另一侧观察虚像，视线对齐并插入 P3, P4 */
  ALIGN_OUTPUT_PINS = 2,
  /** 3: 移去玻璃砖，连接光路并标出入射点与出射点 */
  DRAW_RAYS = 3,
  /** 4: 数据测量与计算（量角器法 / 单位圆法 / 斜率法） */
  MEASURE_AND_CALCULATE = 4,
}
