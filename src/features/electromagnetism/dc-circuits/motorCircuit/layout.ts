import { DC_SOURCE_SYMBOL_OFFSET } from '@/components/Physics'
import { CANVAS_PRESETS } from '@/theme/spacing'

/** 电动机电路主场景设计坐标布局常量（基于 splitV 840×325） */
export const MOTOR_LAYOUT = {
  designWidth: CANVAS_PRESETS.splitV.width,
  designHeight: CANVAS_PRESETS.splitV.height,

  /** 矩形主回路四边坐标 */
  circuit: {
    leftX: 48,
    rightX: 356,
    topY: 58,
    bottomY: 258,
  },

  /** 直流电源（底横边） */
  source: {
    x: 202,
    y: 258,
    leftTermX: 202 - DC_SOURCE_SYMBOL_OFFSET,
    rightTermX: 202 + DC_SOURCE_SYMBOL_OFFSET,
  },

  /** 保护电阻 R保（顶横边左侧） */
  resistor: {
    x: 138,
    y: 58,
    width: 52,
    height: 22,
    valueOffsetY: 26,
  },

  /** 干路电流表（顶横边右侧） */
  ammeter: {
    x: 256,
    y: 58,
    r: 22,
  },

  /** 电动机端电压表（回路内侧并联支路） */
  voltmeter: {
    x: 286,
    y: 142,
    r: 21,
    branchTopY: 98,
    branchBottomY: 216,
  },

  /** 电动机电气符号（右竖边） */
  motor: {
    x: 356,
    y: 142,
    r: 24,
    rotorR: 10,
    glowR: 36,
    labelX: 386,
    labelY: 106,
    stallBadgeY: 190,
  },

  /** 内部能量拆解示意图卡片（开关开启时显示在回路内侧左侧空区） */
  equivalentCard: {
    x: 64,
    y: 108,
    width: 178,
    height: 100,
    titleY: 126,
    row1Y: 148,
    row2Y: 170,
    row3Y: 192,
  },

  /** 右侧机械传动与卷扬系统 */
  mechanics: {
    shaftStartX: 380,
    shaftY: 142,
    pulleyX: 524,
    pulleyY: 142,
    pulleyR: 16,
    hangerTopY: 84,
    pulleyLabelY: 72,
    shaftLabelX: 452,
    shaftLabelY: 130,
    ropeX: 540,
    blockWidth: 52,
    blockHeight: 26,
    blockTopY: 216,
    rulerX: 486,
    rulerTopY: 186,
    rulerHeight: 96,
    velocityArrowX: 584,
  },

  /** 右侧实时诊断卡片 */
  cards: {
    x: 626,
    width: 198,
    padX: 12,
    output: {
      y: 22,
      height: 142,
      titleY: 42,
      rowYs: [68, 92, 116, 140] as const,
    },
    ohmCheck: {
      y: 176,
      height: 126,
      titleY: 196,
      row1Y: 222,
      row2Y: 246,
      badgeY: 264,
      badgeHeight: 24,
    },
  },
} as const
