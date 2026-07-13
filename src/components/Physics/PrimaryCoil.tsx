import React from 'react'
import { CoilBase } from './CoilBase'
import type { CoilBaseProps } from './CoilBase'
import { SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

/**
 * 原线圈组件 Props（互感实验中原边线圈）
 */
export interface PrimaryCoilProps {
  /** 中心 x 坐标 (px) */
  x?: number
  /** 中心 y 坐标 (px) */
  y?: number
  /** 总宽度 (px)，默认 120 */
  width?: number
  /** 总高度 (px)，默认 66 */
  height?: number
  /** 椭圆 x 半径（管径方向），默认按 height 的 21% 计算 */
  rx?: number
  /** 线圈匝数，默认 4 */
  turns?: number
  /** 原线圈电流（决定流光点流速和方向） */
  current?: number
  /** 动画时间，用于流光粒子移动 */
  time?: number
  /** 是否显示铁芯，默认 true */
  showIronCore?: boolean
  /** 自定义 CSS 类名 */
  className?: string
  /** 是否启用流光粒子动画，默认为 true */
  animated?: boolean
}

/**
 * 原线圈组件（互感实验原边）— 漆包绿线
 *
 * 薄包装层，委托 CoilBase 实现。
 * 使用漆包绿色 (enamelStroke/enamelBase)，电流阈值 0.01，无匝数上限。
 */
export const PrimaryCoil: React.FC<PrimaryCoilProps> = ({
  x = 0,
  y = 0,
  width = 120,
  height = 66,
  rx: rxProp,
  turns = 4,
  current = 0,
  time = 0,
  showIronCore = true,
  className = '',
  animated = true,
}) => {
  const c = SCENE_COLORS.coil
  const baseProps: CoilBaseProps = {
    x,
    y,
    width,
    height,
    rx: rxProp ?? height * 0.21,
    turns,
    current,
    time,
    showIronCore,
    className,
    animated,
    backStrokeColor: c.enamelStroke,
    frontStrokeColor: c.enamelBase,
    leadStrokeColor: c.enamelBase,
    leadStrokeWidth: 2.5,
    currentThreshold: 0.01,
    flowSpeedMultiplier: 4,
    ironCoreStrokeColor: colors.neutral[900],
    ironCorePadX: 12,
    leadEndpointRadius: 2.5,
  }
  return <CoilBase {...baseProps} />
}
