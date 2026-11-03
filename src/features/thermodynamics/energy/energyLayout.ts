/**
 * 能量守恒与能源 —— 中屏设计坐标布局常量（splitV 下屏 840×325）。
 *
 * 下屏左侧 0~540 放设备能量流框图，右侧 556~830 放能量条（`EnergyFlowBars`）。
 * 之所以左右分而不是上下叠：840×325 的宽高比 2.58 天生适合并排，上下叠会把
 * 框图压到 160 高、把 8~9 号字挤成一行压一行。
 */

// ─── 能量条（右侧）────────────────────────────────────────────────────────────

export const BARS_X = 556
export const BARS_Y = 10
export const BARS_W = 274
export const BARS_H = 300

// ─── 设备框图（左侧）──────────────────────────────────────────────────────────

/** 上排三块：源 → 转换/枢纽 → 终端 */
export const BLOCK_W = 150
export const BLOCK_H = 84
export const BLOCK_Y = 58
export const BLOCK_X: readonly number[] = [24, 210, 396]

/** 下排挂载块（电池柜 / 低位水 / 副链）：与中列对齐 */
export const LOWER_BLOCK_W = 150
export const LOWER_BLOCK_H = 78
export const LOWER_BLOCK_X = 210
export const LOWER_BLOCK_Y = 198

/** 主链箭头所在的竖直中线（等于上排块的中线） */
export const CHAIN_ARROW_Y = BLOCK_Y + BLOCK_H / 2

/** 箭头标签写在两处：流程名在中线下方 18，数值再下 14（都落在块间隙里） */
export const ARROW_LABEL_DY = 18
export const ARROW_VALUE_DY = 32

/** 块内标题基线 / 数值基线（相对块顶） */
export const BLOCK_TITLE_DY = 26
export const BLOCK_SUBTITLE_DY = 46
export const BLOCK_VALUE_DY = 68

/** 块左侧能量形式色条宽度：一眼看出"这一环是电能/势能/化学能" */
export const BLOCK_ACCENT_W = 5

/** 底部结论文字基线 */
export const FOOTNOTE_Y = 312
