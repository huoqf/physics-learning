/**
 * 力学实验页（打点纸带 / 光电门 / 胡克定律 / 机械能守恒）—— 中屏设计坐标布局常量。
 *
 * 铁律 1（比例同源）：轨道物理长度（TRACK_MAX_M / FREEFALL_MAX_M）、设计比例
 * （*_PX_PER_M）与刻度尺量程必须同源，否则"尺读数 / 小车屏幕位置 / 看板位移"三者
 * 会互相矛盾（历史缺陷：轨道 1.2 m 配 500 px/m 时小车在 x≥0.84 m 驶出画布，
 * 且尺面只标到 60 cm，学生按尺读数会得到一半的位移）。
 *
 * 铁律 2（设计盒归属）：本页 4 个模式分属 **两个** 设计盒——
 *   · 轨道类（模式 0/1，水平运动）→ `splitV` 840×325，常量前缀 `TRACK_`
 *   · 竖直类（模式 2/3，竖直运动）→ `splitH` 420×650，常量前缀 `SPRING_` / `FREEFALL_`
 * 分区方向的选择依据见 `ui/07_CANVAS_SVG_CHART_RULES.md §2.8`。一个常量只属于一个
 * 设计盒：840 空间算出的 X 拿进 420 空间一定会出界，反之亦然。
 */

import { CANVAS_PRESETS } from '@/theme/spacing'
import {
  TRACK_MAX_M,
  SPRING_NATURAL_M,
  FLAG_OFFSET_M,
  FREEFALL_MAX_M,
} from '@/physics/experimentMechanics'

// ─── Scene Profile（preset / 比例 / 原点的单一来源）──────────────────────────

export interface ExperimentSceneProfile {
  /** 该场景独占的画布 preset，禁止在组件里另写一份 */
  preset: { readonly width: number; readonly height: number }
  /** 分区方向：'v' = 上下两栏（图表在上、场景在下）；'h' = 左右两栏（场景在左、图表在右） */
  split: 'v' | 'h'
  /** 设计比例 (design-unit / m)，用于矢量归一化与纸带打点换算 */
  pxPerMeter: number
  /** 物理原点（worldToDesign 的零点）在设计坐标中的 X / Y */
  originX: number
  originY: number
}

/** 模式 0/1：长木板轨道（水平运动 → 上下分区，场景宽扁） */
export const TRACK_PROFILE: ExperimentSceneProfile = {
  preset: CANVAS_PRESETS.splitV,
  split: 'v',
  pxPerMeter: 300,
  originX: 115,
  originY: 240,
}

/** 模式 2：悬挂弹簧（竖直运动 → 左右分区，场景窄高） */
export const SPRING_PROFILE: ExperimentSceneProfile = {
  preset: CANVAS_PRESETS.splitH,
  split: 'h',
  pxPerMeter: 2200,
  originX: 180,
  originY: 70,
}

/** 模式 3：竖直自由下落（竖直运动 → 左右分区，场景窄高） */
export const FREEFALL_PROFILE: ExperimentSceneProfile = {
  preset: CANVAS_PRESETS.splitH,
  split: 'h',
  pxPerMeter: 700,
  originX: 118,
  originY: 108,
}

/**
 * 按实验模式取 scene profile。
 *
 * `useAnimationViewport` / `useSceneScale` / 纸带打点换算全部从这里取值，
 * 杜绝"preset 用一套、比例用另一套"的双重缩放与越界缺陷。
 */
export function getSceneProfile(mode: number): ExperimentSceneProfile {
  if (mode === 2) return SPRING_PROFILE
  if (mode === 3) return FREEFALL_PROFILE
  return TRACK_PROFILE
}

// ─── 长木板轨道（模式 0 / 模式 1，splitV 840×325）─────────────────────────────

/** 轨道起点（打点计时器纸带出口）在设计坐标中的 X */
export const TRACK_ORIGIN_DESIGN_X = TRACK_PROFILE.originX

/** 设计比例：1 m = 300 design-unit（即 1 cm = 3 design-unit） */
export const TRACK_PX_PER_M = TRACK_PROFILE.pxPerMeter

/** 小车车身长度 (design-unit) */
export const CART_LENGTH_PX = 56

/** 小车车身高度 (design-unit) */
export const CART_HEIGHT_PX = 26

/** 轨道中央水平线（地面）在设计坐标中的 Y */
export const TRACK_GROUND_Y = TRACK_PROFILE.originY

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

// ─── 光电门（模式 1，同属轨道设计盒）────────────────────────────────────────

/** U 型光电门感应槽宽度 (design-unit)：需大于小车宽度，使小车可穿过门隙 */
export const PHOTOGATE_GAP_PX = 70

// ─── 悬挂弹簧（模式 2，splitH 420×650）──────────────────────────────────────

/**
 * 弹簧尺寸比例：1 m = 2200 design-unit（即 1 cm = 22 design-unit）。
 *
 * 取值依据：左右分区后竖直可用高度约 545（铁夹 y=70 → 底座 y=615），
 * 而尺面须覆盖 L₀ 8.0 cm + 参数上限组合最大伸长 14.7 cm（m=0.3 kg、k=20 N/m）
 * = 22.7 cm，故 22 unit/cm 恰好铺满且留出重物余量。
 * 旧值 10 unit/cm 是 splitV 时代为塞进 325 高而被压出来的，同一根弹簧只伸 20 unit，
 * 学生看不出"伸长量随钩码数增加"。
 */
export const SPRING_PX_PER_M = SPRING_PROFILE.pxPerMeter

/** 每厘米对应的设计长度，尺长与量程由此保持同源 */
export const SPRING_PX_PER_CM = SPRING_PX_PER_M / 100

/** 铁架台底座中心 X / 底座 Y / 立柱高 / 铁夹相对底座的偏移 */
export const SPRING_STAND_X = 105
export const SPRING_STAND_BASE_Y = 615
export const SPRING_STAND_HEIGHT = 555
export const SPRING_STAND_CLAMP_OFFSET_Y = SPRING_STAND_BASE_Y - SPRING_PROFILE.originY

/** 铁夹（弹簧悬挂点）在设计坐标中的 X / Y */
export const SPRING_ANCHOR_X = SPRING_PROFILE.originX
export const SPRING_TOP_Y = SPRING_PROFILE.originY

/** 弹簧自然长度对应的设计长度 (design-unit)，由物理常量换算 */
export const SPRING_NATURAL_PX = SPRING_NATURAL_M * SPRING_PX_PER_M

/** 竖尺量程 (cm)：自然长度 8.0 + 最大伸长 14.7 = 22.7，向上取整到 23 */
export const SPRING_RULER_MAX_CM = 23

/** 竖尺设计 X 起点与渲染长度：长度 = 量程 × 每厘米设计长度（同源，禁止另写数字） */
export const SPRING_RULER_X = 310
export const SPRING_RULER_LENGTH_PX = SPRING_RULER_MAX_CM * SPRING_PX_PER_CM

/** 竖尺量程 (cm) */
export const SPRING_RULER_DOMAIN_CM: [number, number] = [0, SPRING_RULER_MAX_CM]

// ─── 验证机械能守恒（模式 3，splitH 420×650，竖直自由下落）───────────────────

/**
 * 竖直纸带的设计比例：1 m = 700 design-unit（1 cm = 7 design-unit）。
 *
 * 取值依据：铁架台顶 y=60 起，纸带自 y=108 垂下，行程上限 FREEFALL_MAX_M = 0.6 m
 * 需 420 design-unit，纸带末端 y=528、重物底 y=568，距底座 y=620 尚有 52 余量。
 * 旧值 340 是 splitV 下屏（仅 325 高）逼出来的，首两点间距只有 6.5 design-unit，
 * 相邻计数点几乎叠在一起——这也正是当时要把行程砍到 0.6 m 的原因之一。
 */
export const FREEFALL_PX_PER_M = FREEFALL_PROFILE.pxPerMeter

/** 铁架台：底座中心 X / 底座 Y / 立柱高（杆顶 y=60）与底座宽度 */
export const FREEFALL_STAND_X = 50
export const FREEFALL_STAND_BASE_Y = 620
export const FREEFALL_STAND_HEIGHT = 560
export const FREEFALL_STAND_BASE_WIDTH = 90

/** 铁夹相对底座 Y 的偏移：夹持点落在计时器机身中心高度上 */
export const FREEFALL_STAND_CLAMP_OFFSET_Y = FREEFALL_STAND_BASE_Y - FREEFALL_PROFILE.originY + 30

/**
 * 打点计时器外壳**中心**的设计 X / Y。
 * `TickerTimer` 的 x/y 是中心点（内部以 −w/2, −h/2 绘制，机身 90×60），
 * 故纸带入口（限位孔下沿）= FREEFALL_TICKER_Y + 30。
 */
export const FREEFALL_TICKER_X = FREEFALL_PROFILE.originX
export const FREEFALL_TICKER_Y = FREEFALL_PROFILE.originY - 30

/** 纸带顶端（限位孔下沿）的 Y：必须等于 TICKER_Y + 机身半高，否则纸带会穿进计时器外壳 */
export const FREEFALL_TAPE_TOP_Y = FREEFALL_PROFILE.originY

/** 纸带宽度 (design-unit) */
export const FREEFALL_TAPE_WIDTH = 26

/** 重物挂点相对纸带底端的偏移 (design-unit)：重物上沿与纸带末端留一小段夹子 */
export const FREEFALL_WEIGHT_OFFSET_Y = 6

/** 重物方块边长 (design-unit) */
export const FREEFALL_WEIGHT_SIZE = 34

/** 竖直刻度尺的设计 X：置于纸带右侧，量程与 FREEFALL_MAX_M 同源 */
export const FREEFALL_RULER_X = 250
export const FREEFALL_RULER_LENGTH_PX = FREEFALL_MAX_M * FREEFALL_PX_PER_M
export const FREEFALL_RULER_DOMAIN_CM: [number, number] = [0, FREEFALL_MAX_M * 100]

/** 画布内读数块的设计 X：尺面放大镜最右缘约在 RULER_X + 42，故从 +50 起排 */
export const FREEFALL_READOUT_X = FREEFALL_RULER_X + 50
