/**
 * 相对论时空观与牛顿力学的局限性（anim-relativity）—— 中屏设计坐标布局与 Profile 定义。
 *
 * 设计盒归属（07_CANVAS_SVG_CHART_RULES.md §2.8）：
 * - Mode 0（动钟变慢）/ Mode 1（动尺收缩 + 同时的相对性）→ `full`（840×650），纯 SVG 双参考系对照
 * - Mode 2（牛顿局限）/ Mode 3（质能拓展）→ `splitV`（上 HTML BasePhysicsChart + 下 840×325 SVG 场景）
 */

import { CANVAS_PRESETS } from '@/theme/spacing'

export interface RelativitySceneProfile {
  /** 画布预设（strictly bound to CANVAS_PRESETS.full or splitV） */
  preset: { readonly width: number; readonly height: number }
  /** 是否在上方挂载 HTML BasePhysicsChart 图表区 */
  hasChart: boolean
  designWidth: number
  designHeight: number
}

export const FULL_SCENE_PROFILE: RelativitySceneProfile = {
  preset: CANVAS_PRESETS.full,
  hasChart: false,
  designWidth: CANVAS_PRESETS.full.width,
  designHeight: CANVAS_PRESETS.full.height,
}

export const SPLIT_V_SCENE_PROFILE: RelativitySceneProfile = {
  preset: CANVAS_PRESETS.splitV,
  hasChart: true,
  designWidth: CANVAS_PRESETS.splitV.width,
  designHeight: CANVAS_PRESETS.splitV.height,
}

/**
 * 按模式获取唯一场景布局 Profile（preset / hasChart / 设计盒尺寸单一来源）。
 */
export function getRelativitySceneProfile(mode: number): RelativitySceneProfile {
  return mode === 2 || mode === 3 ? SPLIT_V_SCENE_PROFILE : FULL_SCENE_PROFILE
}

// ─── FULL 840×650 设计盒常量（Mode 0 / Mode 1）────────────────────────────────

export const FULL_LAYOUT = {
  /** Mode 0 光钟轨道与表盘区（保证全速域飞船不与右侧表盘重叠） */
  clock: {
    dividerY: 305,
    trackLeft: 70,
    trackWidth: 490,
    originY: 550,
    maxScale: 82,
    restCenterX: 315,
    restBottomMirrorY: 230,
    dialCenterX: 710,
    dialTopY: 132,
    dialBottomY: 476,
    dialRadius: 34,
    hullPadY: 12,
  },
  /** Mode 1 动尺收缩（上半区）+ 同时的相对性（下半区） */
  lengthSim: {
    dividerY: 328,
    rulerStartX: 120,
    rulerL0Px: 340,
    shipHeight: 64,
    restShipY: 76,
    movingShipY: 184,
    panelX: 612,
    panelY: 72,
    panelW: 196,
    panelH: 214,
    primeCardX: 36,
    primeCardW: 368,
    groundCardX: 436,
    groundCardW: 368,
    cardY: 388,
    cardH: 224,
  },
} as const

// ─── SPLIT-V 840×325 设计盒常量（Mode 2 / Mode 3）──────────────────────────────

export const SPLITV_LAYOUT = {
  /** Mode 2：左侧双轨道恒力加速赛跑 + 右侧适用域与三大边界微缩图 */
  newton: {
    raceBox: { x: 24, y: 14, w: 544, h: 296 },
    trackLeft: 46,
    trackW: 496,
    classicalTrackY: 96,
    relTrackY: 182,
    statusBarY: 256,
    boundaryBox: { x: 584, y: 14, w: 234, h: 296 },
    safeIslandY: 26,
    safeIslandH: 76,
    cardStartY: 118,
    cardH: 48,
    cardGap: 10,
  },
  /** Mode 3：上静能+动能构成条 + 下经典与相对论动能对比条 */
  energy: {
    cardX: 28,
    cardW: 784,
    topCardY: 12,
    topCardH: 142,
    bottomCardY: 166,
    bottomCardH: 146,
    barX: 50,
    barMaxW: 660,
  },
} as const
