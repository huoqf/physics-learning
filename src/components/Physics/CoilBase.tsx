import React from 'react'
import { useUniqueSvgId } from '@/hooks'
import { SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

/**
 * CoilBase — 通用线圈基座
 *
 * 统一 Solenoid（铜线螺线管）与 PrimaryCoil（漆包绿线原线圈）的渲染逻辑。
 * 差异通过以下定制 prop 覆盖：
 *
 * | 差异 | Solenoid | PrimaryCoil | CoilBase prop |
 * |------|----------|-------------|---------------|
 * | 后半圈色 | copperDark | enamelStroke | backStrokeColor |
 * | 前半圈色 | copperBase | enamelBase | frontStrokeColor |
 * | 导线色 | copperBase | enamelBase | leadStrokeColor |
 * | 导线粗细 | 3 | 2.5 | leadStrokeWidth |
 * | 匝数上限 | 15 | ∞ | maxRenderTurns |
 * | 电流阈值 | 0.05 | 0.01 | currentThreshold |
 * | 流速系数 | 5 | 4 | flowSpeedMultiplier |
 * | 粒子稀疏上限 | 5 匝 | 全部 | maxParticleTurns |
 * | 铁芯描边 | neutral[800] | neutral[900] | ironCoreStrokeColor |
 * | 导线端点半径 | 3 | 2.5 | leadEndpointRadius |
 */
export interface CoilBaseProps {
  /** 中心 x 坐标 (px) */
  x?: number
  /** 中心 y 坐标 (px) */
  y?: number
  /** 总宽度 (px) */
  width?: number
  /** 总高度 (px) */
  height?: number
  /** 椭圆 x 半径（管径方向），默认按 height * 0.2 计算 */
  rx?: number
  /** 线圈匝数 */
  turns?: number
  /** 感应电流大小（含符号，决定流光点流速和方向） */
  current?: number
  /** 动画时间，用于流光点移动 */
  time?: number
  /** 是否显示铁芯，默认 true */
  showIronCore?: boolean
  /** 是否启用流光粒子动画，默认 true */
  animated?: boolean
  /** 自定义 CSS 类名 */
  className?: string

  // ── 定制 prop（Solenoid / PrimaryCoil 差异覆盖） ──

  /** 后半圈描边色，默认 SCENE_COLORS.coil.copperDark */
  backStrokeColor?: string
  /** 前半圈描边色，默认 SCENE_COLORS.coil.copperBase */
  frontStrokeColor?: string
  /** 引出导线描边色，默认 frontStrokeColor */
  leadStrokeColor?: string
  /** 引出导线宽度，默认 3 */
  leadStrokeWidth?: number
  /** 最大渲染匝数（防止小尺寸下匝数过密），默认不限制 */
  maxRenderTurns?: number
  /** 电流阈值（低于此值不渲染粒子），默认 0.05 */
  currentThreshold?: number
  /** 流速系数，默认 5 */
  flowSpeedMultiplier?: number
  /** 粒子稀疏上限（最多同时在多少匝上渲染粒子），默认不限制（全部匝） */
  maxParticleTurns?: number
  /** 铁芯描边色，默认 neutral[800] */
  ironCoreStrokeColor?: string
  /** 铁芯水平 padding，默认 10 */
  ironCorePadX?: number
  /** 铁芯垂直内偏移，默认 6 */
  ironCorePadY?: number
  /** 导线端点半径，默认 3 */
  leadEndpointRadius?: number
}

export const CoilBase: React.FC<CoilBaseProps> = ({
  x = 0,
  y = 0,
  width = 160,
  height = 80,
  rx: rxProp,
  turns = 5,
  current = 0,
  time = 0,
  showIronCore = true,
  animated = true,
  className = '',

  backStrokeColor,
  frontStrokeColor,
  leadStrokeColor,
  leadStrokeWidth = 3,
  maxRenderTurns,
  currentThreshold = 0.05,
  flowSpeedMultiplier = 5,
  maxParticleTurns,
  ironCoreStrokeColor,
  ironCorePadX = 10,
  ironCorePadY = 6,
  leadEndpointRadius = 3,
}) => {
  const c = SCENE_COLORS.coil
  const uniqueId = useUniqueSvgId()
  const ironCoreGradId = `coilIronGrad-${uniqueId}`

  const backStroke = backStrokeColor ?? c.copperDark
  const frontStroke = frontStrokeColor ?? c.copperBase
  const leadStroke = leadStrokeColor ?? frontStroke
  const ironStroke = ironCoreStrokeColor ?? colors.neutral[800]

  // rx 参数化
  const rx = rxProp ?? height * 0.2
  const ry = height / 2

  // 匝数限制
  const displayTurns = maxRenderTurns != null && turns > maxRenderTurns ? maxRenderTurns : turns

  // 每匝间距与中心
  const step = width / (displayTurns + 1)
  const startX = -width / 2 + step
  const turnCenters = Array.from({ length: displayTurns }).map((_, i) => startX + i * step)

  // 动态缩减线宽
  const baseStrokeWidth = 5
  const strokeW = Math.max(1.5, baseStrokeWidth * Math.min(1, 6 / displayTurns))
  const highlightW = Math.max(0.5, 1.5 * Math.min(1, 6 / displayTurns))
  const backStrokeW = Math.max(1.0, 3.5 * Math.min(1, 6 / displayTurns))

  // 流光粒子
  const hasCurrent = Math.abs(current) > currentThreshold
  const flowSpeed = current * flowSpeedMultiplier
  const stepInterval = maxParticleTurns != null
    ? Math.max(1, Math.ceil(displayTurns / maxParticleTurns))
    : 1
  const particleR = Math.max(2.0, 4.5 * Math.min(1, 6 / displayTurns))
  const showParticles = hasCurrent && animated

  return (
    <g transform={`translate(${x}, ${y})`} className={className}>
      {/* 1. 铁芯 (拟物金属渐变) */}
      {showIronCore && (
        <>
          <defs>
            <linearGradient id={ironCoreGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.neutral[700]} />
              <stop offset="30%" stopColor={colors.neutral[500]} />
              <stop offset="50%" stopColor={colors.neutral[300]} />
              <stop offset="70%" stopColor={colors.neutral[500]} />
              <stop offset="100%" stopColor={colors.neutral[800]} />
            </linearGradient>
          </defs>
          <rect
            x={-width / 2 - ironCorePadX}
            y={-ry + ironCorePadY}
            width={width + ironCorePadX * 2}
            height={height - ironCorePadY * 2}
            rx="3"
            fill={`url(#${ironCoreGradId})`}
            stroke={ironStroke}
            strokeWidth="1.5"
          />
        </>
      )}

      {/* 2. 后半部分绕线 */}
      {turnCenters.map((cx, idx) => (
        <path
          key={`back-${idx}`}
          d={`M ${cx} ${-ry} A ${rx} ${ry} 0 0 0 ${cx} ${ry}`}
          fill="none"
          stroke={backStroke}
          strokeWidth={backStrokeW}
          opacity="0.3"
        />
      ))}

      {/* 3. 引出导线 */}
      <path
        d={`M ${turnCenters[0]} ${ry} C ${turnCenters[0] - 20} ${ry + 30}, ${-width / 2} ${ry + 50}, ${-width / 2} 120`}
        fill="none"
        stroke={leadStroke}
        strokeWidth={leadStrokeWidth}
      />
      <path
        d={`M ${turnCenters[turnCenters.length - 1]} ${-ry} C ${turnCenters[turnCenters.length - 1] + 30} ${-ry - 10}, ${width / 2} ${ry + 50}, ${width / 2} 120`}
        fill="none"
        stroke={leadStroke}
        strokeWidth={leadStrokeWidth}
      />

      {/* 4. 前半部分绕线 */}
      {turnCenters.map((cx, idx) => (
        <g key={`front-group-${idx}`}>
          <path
            d={`M ${cx} ${ry} A ${rx} ${ry} 0 0 0 ${cx} ${-ry}`}
            fill="none"
            stroke={frontStroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
          {/* 铜线受光面高光 */}
          <path
            d={`M ${cx - 1} ${ry - 2} A ${rx - 1} ${ry - 2} 0 0 0 ${cx - 1} ${-ry + 2}`}
            fill="none"
            stroke={SCENE_COLORS.materials.specularWhite}
            strokeWidth={highlightW}
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>
      ))}

      {/* 5. 流光粒子 */}
      {showParticles &&
        turnCenters.map((cx, idx) => {
          if (idx % stepInterval !== 0) return null
          return [0].map((pIdx) => {
            const phase = pIdx * Math.PI + idx * 0.6
            const t = ((time * flowSpeed + phase) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)

            if (t > Math.PI) return null

            const px = cx - rx * Math.sin(t)
            const py = ry * Math.cos(t)

            return (
              <circle
                key={`glow-${idx}-${pIdx}`}
                cx={px}
                cy={py}
                r={particleR}
                fill={SCENE_COLORS.coil.activeGlow || colors.success[600]}
                filter={`drop-shadow(0 0 2px ${SCENE_COLORS.coil.activeGlow || colors.success[600]})`}
              />
            )
          })
        })}

      {/* 导线连接点 */}
      <circle cx={-width / 2} cy="120" r={leadEndpointRadius} fill={colors.neutral[800]} />
      <circle cx={width / 2} cy="120" r={leadEndpointRadius} fill={colors.neutral[800]} />
    </g>
  )
}
