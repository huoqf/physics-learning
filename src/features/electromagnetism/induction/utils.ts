const INITIAL_TEMP = 20
const MAX_TEMP = 80

export function tempToColor(temp: number): string {
  const t = Math.min(1, Math.max(0, (temp - INITIAL_TEMP) / (MAX_TEMP - INITIAL_TEMP)))
  const r = Math.round(180 + t * 60)
  const g = Math.round(210 - t * 120)
  const b = Math.round(240 - t * 170)
  return `rgb(${r}, ${g}, ${b})`
}

/** 电磁感应现象第一节：舒展充盈设计坐标系与物理元器件布局常量 */
export const INDUCTION_LAYOUT = {
  /** SVG 画布设计宽度 (对应 CANVAS_PRESETS.full) */
  DESIGN_W: 700,
  /** SVG 画布设计高度 (对应 CANVAS_PRESETS.full) */
  DESIGN_H: 650,
  /** 副线圈中心 x (模式 1/2 共享固定位置) */
  coilX: 420,
  /** 副线圈中心 y (由原来 160 舒展调整至 200，在 650 高度内位于中上方，视觉开阔) */
  coilY: 200,
  /** 灵敏电流计中心 x */
  galvanometerX: 420,
  /** 灵敏电流计中心 y (由原来 270 舒展调整至 420，与线圈纵向拉开距离) */
  galvanometerY: 420,
} as const

