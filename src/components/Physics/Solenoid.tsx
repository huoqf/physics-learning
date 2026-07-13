import React from 'react'
import { CoilBase } from './CoilBase'
import type { CoilBaseProps } from './CoilBase'
import { SCENE_COLORS } from '@/theme/physics'

/**
 * 螺线管组件 Props
 */
export interface SolenoidProps {
  /** 中心 x 坐标 (px) */
  x?: number
  /** 中心 y 坐标 (px) */
  y?: number
  /** 总宽度 (px)，默认 160 */
  width?: number
  /** 总高度 (px)，默认 80 */
  height?: number
  /** 椭圆 x 半径（管径方向），默认按 height 的 20% 计算 */
  rx?: number
  /** 线圈匝数，默认 5（最大渲染 15 匝） */
  turns?: number
  /** 感应电流大小（含符号，决定流光点流速和方向） */
  current?: number
  /** 动画时间，用于流光点移动 */
  time?: number
  /** 自定义 CSS 类名 */
  className?: string
  /** 是否显示铁芯，默认 true */
  showIronCore?: boolean
  /** 是否启用流光粒子动画，默认为 true */
  animated?: boolean
}

/**
 * 螺线管（线圈）组件 — 铜线螺线管
 *
 * 薄包装层，委托 CoilBase 实现。
 * 使用铜色 (copperDark/copperBase)，最多渲染 15 匝，粒子稀疏上限 5 匝。
 */
export const Solenoid: React.FC<SolenoidProps> = (props) => {
  const c = SCENE_COLORS.coil
  const baseProps: CoilBaseProps = {
    ...props,
    backStrokeColor: c.copperDark,
    frontStrokeColor: c.copperBase,
    leadStrokeColor: c.copperBase,
    leadStrokeWidth: 3,
    maxRenderTurns: 15,
    currentThreshold: 0.05,
    flowSpeedMultiplier: 5,
    maxParticleTurns: 5,
    leadEndpointRadius: 3,
  }
  return <CoilBase {...baseProps} />
}
