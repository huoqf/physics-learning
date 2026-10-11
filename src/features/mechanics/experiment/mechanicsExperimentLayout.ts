/**
 * 力学实验页（打点纸带 / 光电门 / 胡克定律）—— 中屏设计坐标布局常量。
 *
 * 铁律：轨道物理长度（TRACK_MAX_M）、设计比例（TRACK_PX_PER_M）与刻度尺量程
 * 必须同源，否则"尺读数 / 小车屏幕位置 / 看板位移"三者会互相矛盾
 * （历史缺陷：轨道 1.2 m 配 physicsScaleDesign 500 时小车在 x≥0.84 m 驶出画布，
 * 且尺面只标到 60 cm，学生按尺读数会得到一半的位移）。
 */

import { TRACK_MAX_M, SPRING_NATURAL_M, FLAG_OFFSET_M } from '@/physics/experimentMechanics'

// ─── 长木板轨道（模式 0 / 模式 1 共用）───────────────────────────────────────

/** 轨道起点（打点计时器纸带出口）在设计坐标中的 X */
export const TRACK_ORIGIN_DESIGN_X = 115

/** 设计比例：1 m = 300 design-unit（即 1 cm = 3 design-unit） */
export const TRACK_PX_PER_M = 300

/** 小车车身长度 (design-unit) */
export const CART_LENGTH_PX = 56

/** 小车车身高度 (design-unit) */
export const CART_HEIGHT_PX = 26

/** 轨道中央水平线（地面）在设计坐标中的 Y */
export const TRACK_GROUND_Y = 240

/** 轨道铺板（长木板）在设计坐标中的 X 起点与宽度 */
export const TRACK_BOARD_X = 30
export const TRACK_BOARD_WIDTH = 780

/** 轨道终点：小车位移达到 TRACK_MAX_M 时车尾所在的设计 X */
export const TRACK_END_DESIGN_X = TRACK_ORIGIN_DESIGN_X + TRACK_MAX_M * TRACK_PX_PER_M

/** 末端防冲挡块的设计 X：紧贴小车抵达终点时的车头 */
export const TRACK_STOP_DESIGN_X = TRACK_END_DESIGN_X + CART_LENGTH_PX

/** 刻度尺渲染长度 (design-unit)：恰好覆盖 0 ~ TRACK_MAX_M，保证 1 cm = 3 design-unit */
export const TRACK_RULER_LENGTH_PX = TRACK_MAX_M * TRACK_PX_PER_M

/** 刻度尺量程 (cm)：与 TRACK_MAX_M 同源，禁止另写数字 */
export const TRACK_RULER_DOMAIN_CM: [number, number] = [0, TRACK_MAX_M * 100]

/** 刻度尺（含放大镜）的设计 Y：下移到纸带与小车车轮之下，避免放大镜压住小车 */
export const TRACK_RULER_Y = TRACK_GROUND_Y + 30

/** 遮光条中心相对小车左端的偏移 (design-unit)，由物理常量 FLAG_OFFSET_M 换算 */
export const FLAG_OFFSET_PX = FLAG_OFFSET_M * TRACK_PX_PER_M

/** 遮光条上沿相对小车车顶的伸出高度 (design-unit)：必须高于光电门感应光束 */
export const FLAG_HEIGHT_PX = 32

// ─── 光电门（模式 1）────────────────────────────────────────────────────────

/** U 型光电门感应槽宽度 (design-unit)：需大于小车宽度，使小车可穿过门隙 */
export const PHOTOGATE_GAP_PX = 70

// ─── 胡克定律（模式 2）──────────────────────────────────────────────────────

/** 弹簧尺寸比例：1 m = 1000 design-unit（即 1 cm = 10 design-unit） */
export const SPRING_PX_PER_M = 1000

/** 铁架台铁夹（弹簧悬挂点）在设计坐标中的 X / Y */
export const SPRING_ANCHOR_X = 480
export const SPRING_TOP_Y = 64

/** 弹簧自然长度对应的设计长度 (design-unit)，由物理常量换算 */
export const SPRING_NATURAL_PX = SPRING_NATURAL_M * SPRING_PX_PER_M

/** 竖尺设计 X 起点与长度：长度覆盖 L₀ + 最大伸长量 */
export const SPRING_RULER_X = 620
export const SPRING_RULER_LENGTH_PX = 230

/** 竖尺量程 (cm)：与 SPRING_PX_PER_M 同源（10 design-unit = 1 cm） */
export const SPRING_RULER_DOMAIN_CM: [number, number] = [0, 23]
