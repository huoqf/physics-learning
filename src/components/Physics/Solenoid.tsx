import React from 'react'
import { CoilBase } from './CoilBase'
import type { CoilBaseProps } from './CoilBase'
import { CIRCUIT_COLORS, SCENE_COLORS, STROKE } from '@/theme/physics'

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
  /** 椭圆 x 半径（管径透视方向），默认按 height 的 14% 与螺距自适应 */
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
  /** 引线出线模式：'down' 向下弯曲接检流计（默认）| 'horizontal' 水平左右引出接电路 | 'none' 无引线 */
  leadType?: 'down' | 'horizontal' | 'none'
  /** 是否根据电流方向显示两端磁极性 (N/S 极) 提示，默认 false */
  showPolarity?: boolean
  /** 是否在正面绕组上标出电流环绕方向箭头（符合高中物理右手螺旋定则教学习惯），默认 false */
  showWindingArrows?: boolean
  /** 引线端点圆点半径，传 0 可隐藏焊点黑点，默认 3 */
  leadEndpointRadius?: number
  /** 渲染形态：'apparatus' 连续立体螺旋螺线管（默认）| 'symbolic' 标准电路原理图电感符号 */
  variant?: 'apparatus' | 'symbolic'
  /** 置于背面绕线与正面绕线之间的叠加层（如穿过线圈内部的磁感线） */
  innerOverlay?: React.ReactNode
  /** 线框/导线自定义描边色（symbolic 模式下默认使用 CIRCUIT_COLORS.wire） */
  strokeColor?: string
}

/**
 * 螺线管（线圈）组件 — 铜线螺线管 / 电路电感符号
 *
 * 薄包装层，委托 CoilBase 实现。
 * - `variant="apparatus"`：使用铜色 (copperDark/copperBase) 连续三维螺旋绕线，最多渲染 15 匝，粒子稀疏上限 5 匝；
 * - `variant="symbolic"`：使用标准电路原理图连续半圆拱电感符号，默认采用 CIRCUIT_COLORS.wire。
 */
export const Solenoid: React.FC<SolenoidProps> = ({
  variant = 'apparatus',
  strokeColor,
  ...props
}) => {
  const c = SCENE_COLORS.coil
  const isSymbolic = variant === 'symbolic'
  const baseProps: CoilBaseProps = {
    ...props,
    variant,
    backStrokeColor: c.copperDark,
    frontStrokeColor: isSymbolic ? (strokeColor ?? CIRCUIT_COLORS.wire) : (strokeColor ?? c.copperBase),
    leadStrokeColor: isSymbolic ? (strokeColor ?? CIRCUIT_COLORS.wire) : (strokeColor ?? c.copperBase),
    leadStrokeWidth: isSymbolic ? STROKE.objectLine : 3,
    maxRenderTurns: 15,
    currentThreshold: 0.05,
    flowSpeedMultiplier: 5,
    maxParticleTurns: 5,
    leadEndpointRadius: props.leadEndpointRadius ?? (isSymbolic ? 0 : 3),
  }
  return <CoilBase {...baseProps} />
}
