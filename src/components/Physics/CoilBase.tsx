import React, { useMemo } from 'react'
import { useUniqueSvgId } from '@/hooks'
import {
  SCENE_COLORS,
  PHYSICS_COLORS,
  CANVAS_COLORS,
  CIRCUIT_COLORS,
  STROKE,
} from '@/theme/physics'
import { colors } from '@/theme/colors'
import { getCoilPolarity } from '@/physics'

/**
 * CoilBase — 通用线圈基座
 *
 * 统一 Solenoid（铜线螺线管）与 PrimaryCoil（漆包绿线原线圈）的渲染逻辑。
 * 支持两种呈现模式：
 * - `'apparatus'`（默认）：连续三维螺旋绕线（Helix），前后半匝平滑衔接、左右水平/向下引出，符合高中物理教学螺线管画法；
 * - `'symbolic'`：国标/高中教材电路原理图电感符号（连续同侧半圆拱），适合纯电路原理图场景。
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
  /** 椭圆 x 半径（管径透视方向），默认按 height * 0.14 与螺距自适应 */
  rx?: number
  /** 线圈匝数 */
  turns?: number
  /** 感应电流大小（含符号，决定流光点流速、绕向箭头和磁极方向） */
  current?: number
  /** 动画时间，用于流光点移动 */
  time?: number
  /** 是否显示铁芯，默认 true */
  showIronCore?: boolean
  /** 是否启用流光粒子动画，默认 true */
  animated?: boolean
  /** 自定义 CSS 类名 */
  className?: string
  /** 引线出线模式：'down' 向下弯曲接检流计（默认，兼容现有页面）| 'horizontal' 水平左右引出接电路 | 'none' 无引线 */
  leadType?: 'down' | 'horizontal' | 'none'
  /** 是否根据电流方向显示两端磁极性 (N/S 极) 提示，默认 false */
  showPolarity?: boolean
  /** 是否在正面绕组上标出电流环绕方向箭头（符合高中物理右手螺旋定则教学习惯），默认 false */
  showWindingArrows?: boolean
  /** 渲染形态：'apparatus' 立体连续螺旋螺线管（默认）| 'symbolic' 电路原理图电感符号 */
  variant?: 'apparatus' | 'symbolic'
  /** 置于背面绕线与正面绕线之间的叠加层（如穿过空心螺线管内部的磁感线） */
  innerOverlay?: React.ReactNode

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

interface HelixSegment {
  d: string
  highlightD: string
  midX: number
  midY: number
  upAngleDeg: number
  xBot: number
  xTop: number
}

interface HelixGeometry {
  coilHalfW: number
  halfStep: number
  rx: number
  ry: number
  frontSegments: HelixSegment[]
  backSegments: string[]
  leftLeadD: string
  rightLeadD: string
}

const HELIX_SAMPLES = 12

/** 生成单段半匝螺旋 SVG 路径，保证正面/背面在顶底端点 C¹ 光滑衔接 */
function sampleHalfTurnPath(
  xStart: number,
  halfStep: number,
  rx: number,
  ry: number,
  isFront: boolean,
  offsetX = 0,
): string {
  const pts: string[] = []
  const dirX = isFront ? 1 : -1
  const dirY = isFront ? 1 : -1
  for (let s = 0; s <= HELIX_SAMPLES; s++) {
    const phi = s / HELIX_SAMPLES
    const px = xStart + phi * halfStep + dirX * rx * Math.sin(Math.PI * phi) + offsetX
    const py = dirY * ry * Math.cos(Math.PI * phi)
    pts.push(`${s === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`)
  }
  return pts.join(' ')
}

function buildHelixGeometry(
  width: number,
  height: number,
  turns: number,
  rxProp: number | undefined,
  leadType: 'down' | 'horizontal' | 'none',
): HelixGeometry {
  const ry = height / 2
  const coilW = leadType === 'horizontal' ? width * 0.84 : width * 0.9
  const coilHalfW = coilW / 2
  const halfStep = coilW / (2 * turns)
  const pitch = halfStep * 2
  const rx = Math.min(rxProp ?? height * 0.14, pitch * 0.24)

  const frontSegments: HelixSegment[] = []
  const backSegments: string[] = []
  const upAngleDeg = (Math.atan2(-Math.PI * ry, halfStep) * 180) / Math.PI

  for (let k = 0; k < turns; k++) {
    const xBot = -coilHalfW + (2 * k + 0.5) * halfStep
    const xTop = -coilHalfW + (2 * k + 1.5) * halfStep

    frontSegments.push({
      d: sampleHalfTurnPath(xBot, halfStep, rx, ry, true),
      highlightD: sampleHalfTurnPath(xBot, halfStep, Math.max(0, rx - 0.8), Math.max(2, ry - 1.5), true, -0.8),
      midX: xBot + 0.5 * halfStep + rx,
      midY: 0,
      upAngleDeg,
      xBot,
      xTop,
    })

    if (k < turns - 1) {
      backSegments.push(sampleHalfTurnPath(xTop, halfStep, rx, ry, false))
    }
  }

  const firstBotX = frontSegments[0].xBot
  const lastTopX = frontSegments[frontSegments.length - 1].xTop

  let leftLeadD = ''
  let rightLeadD = ''

  if (leadType === 'horizontal') {
    const leadDxLeft = firstBotX - (-width / 2)
    const leadDxRight = width / 2 - lastTopX
    leftLeadD = `M ${(-width / 2).toFixed(2)} 0 C ${(-width / 2 + leadDxLeft * 0.48).toFixed(2)} 0, ${(firstBotX - leadDxLeft * 0.52).toFixed(2)} ${ry.toFixed(2)}, ${firstBotX.toFixed(2)} ${ry.toFixed(2)}`
    rightLeadD = `M ${lastTopX.toFixed(2)} ${(-ry).toFixed(2)} C ${(lastTopX + leadDxRight * 0.52).toFixed(2)} ${(-ry).toFixed(2)}, ${(width / 2 - leadDxRight * 0.48).toFixed(2)} 0, ${(width / 2).toFixed(2)} 0`
  } else if (leadType === 'down') {
    leftLeadD = `M ${firstBotX.toFixed(2)} ${ry.toFixed(2)} C ${(firstBotX - 18).toFixed(2)} ${(ry + 28).toFixed(2)}, ${(-width / 2).toFixed(2)} ${(ry + 48).toFixed(2)}, ${(-width / 2).toFixed(2)} 120`
    rightLeadD = `M ${lastTopX.toFixed(2)} ${(-ry).toFixed(2)} C ${(lastTopX + 26).toFixed(2)} ${(-ry - 8).toFixed(2)}, ${(width / 2).toFixed(2)} ${(ry + 46).toFixed(2)}, ${(width / 2).toFixed(2)} 120`
  }

  return {
    coilHalfW,
    halfStep,
    rx,
    ry,
    frontSegments,
    backSegments,
    leftLeadD,
    rightLeadD,
  }
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
  leadType = 'down',
  showPolarity = false,
  showWindingArrows = false,
  variant = 'apparatus',
  innerOverlay,

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

  const displayTurns = Math.max(
    1,
    maxRenderTurns != null && turns > maxRenderTurns ? maxRenderTurns : turns,
  )

  const polarity = getCoilPolarity(current, currentThreshold)
  const hasCurrent = polarity.hasCurrent

  const helix = useMemo(
    () => buildHelixGeometry(width, height, displayTurns, rxProp, leadType),
    [width, height, displayTurns, rxProp, leadType],
  )

  // ── 原理图符号模式：标准连续半圆拱电感符号 ───────────────────────────────
  if (variant === 'symbolic') {
    const archTurns = Math.max(3, Math.min(displayTurns, 6))
    const spanW = leadType === 'none' ? width : width * 0.74
    const startX = -spanW / 2
    const archW = spanW / archTurns
    const rxArch = archW / 2
    const ryArch = Math.min(height * 0.42, rxArch * 1.15)
    const symbolStroke = frontStrokeColor ?? leadStrokeColor ?? CIRCUIT_COLORS.wire
    const symbolStrokeW = leadStrokeWidth ?? STROKE.objectLine

    let archPath = `M ${startX.toFixed(2)} 0`
    for (let i = 0; i < archTurns; i++) {
      const nextX = startX + (i + 1) * archW
      archPath += ` A ${rxArch.toFixed(2)} ${ryArch.toFixed(2)} 0 0 1 ${nextX.toFixed(2)} 0`
    }

    const leftTerminal =
      leadType === 'horizontal'
        ? `M ${(-width / 2).toFixed(2)} 0 L ${startX.toFixed(2)} 0`
        : leadType === 'down'
          ? `M ${startX.toFixed(2)} 0 Q ${(-width / 2).toFixed(2)} 0, ${(-width / 2).toFixed(2)} 120`
          : ''
    const rightTerminal =
      leadType === 'horizontal'
        ? `M ${(startX + spanW).toFixed(2)} 0 L ${(width / 2).toFixed(2)} 0`
        : leadType === 'down'
          ? `M ${(startX + spanW).toFixed(2)} 0 Q ${(width / 2).toFixed(2)} 0, ${(width / 2).toFixed(2)} 120`
          : ''

    return (
      <g transform={`translate(${x}, ${y})`} className={`coil-symbolic ${className}`}>
        <g
          fill="none"
          stroke={symbolStroke}
          strokeWidth={symbolStrokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {leftTerminal && <path d={leftTerminal} />}
          <path d={archPath} />
          {rightTerminal && <path d={rightTerminal} />}
          {showIronCore && (
            <>
              <line x1={startX} y1={-ryArch - 4} x2={startX + spanW} y2={-ryArch - 4} strokeWidth={1.6} />
              <line x1={startX} y1={-ryArch - 7.5} x2={startX + spanW} y2={-ryArch - 7.5} strokeWidth={1.6} />
            </>
          )}
        </g>

        {leadType === 'horizontal' && leadEndpointRadius > 0 && (
          <>
            <circle cx={-width / 2} cy={0} r={leadEndpointRadius} fill={colors.neutral[800]} />
            <circle cx={width / 2} cy={0} r={leadEndpointRadius} fill={colors.neutral[800]} />
          </>
        )}
        {leadType === 'down' && leadEndpointRadius > 0 && (
          <>
            <circle cx={-width / 2} cy={120} r={leadEndpointRadius} fill={colors.neutral[800]} />
            <circle cx={width / 2} cy={120} r={leadEndpointRadius} fill={colors.neutral[800]} />
          </>
        )}

        {showPolarity && hasCurrent && (
          <CoilPolarityBadges
            halfW={width / 2}
            ry={ryArch}
            leftPole={polarity.leftPole}
            rightPole={polarity.rightPole}
          />
        )}
      </g>
    )
  }

  // ── 立体连续螺旋螺线管模式（默认 apparatus）────────────────────────────────
  const backStroke = backStrokeColor ?? c.copperDark
  const frontStroke = frontStrokeColor ?? c.copperBase
  const leadStroke = leadStrokeColor ?? frontStroke
  const ironStroke = ironCoreStrokeColor ?? colors.neutral[800]

  const { coilHalfW, halfStep, rx, ry, frontSegments, backSegments, leftLeadD, rightLeadD } = helix

  // 根据管径与匝数自适应线宽，避免小尺寸下过于粗重
  const sizeFactor = Math.min(1, height / 64)
  const baseStrokeW = 2.6 + 1.8 * sizeFactor
  const strokeW = Math.max(1.8, baseStrokeW * Math.min(1, 6 / displayTurns))
  const backStrokeW = Math.max(1.2, strokeW * 0.72)
  const highlightW = Math.max(0.5, strokeW * 0.24)

  const flowSpeed = current * flowSpeedMultiplier
  const stepInterval = maxParticleTurns != null
    ? Math.max(1, Math.ceil(displayTurns / maxParticleTurns))
    : 1
  const particleR = Math.max(2.0, 3.8 * Math.min(1, 6 / displayTurns))
  const showParticles = hasCurrent && animated

  const ironHalfW = (leadType === 'horizontal' ? coilHalfW : width / 2) + ironCorePadX
  const midTurnIdx = Math.floor(displayTurns / 2)

  return (
    <g transform={`translate(${x}, ${y})`} className={`coil-apparatus ${className}`}>
      {/* 1. 背面绕线（与水平入出线连续衔接，半透明暗铜色退居后景） */}
      <g
        fill="none"
        stroke={backStroke}
        strokeWidth={backStrokeW}
        strokeLinecap="round"
        opacity={0.38}
      >
        {backSegments.map((d, idx) => (
          <path key={`back-${idx}`} d={d} />
        ))}
      </g>
      {leadType === 'horizontal' && (
        <g
          fill="none"
          stroke={leadStroke}
          strokeWidth={Math.min(leadStrokeWidth, strokeW)}
          strokeLinecap="round"
          opacity={0.82}
        >
          {leftLeadD && <path d={leftLeadD} />}
          {rightLeadD && <path d={rightLeadD} />}
        </g>
      )}

      {/* 1b. 向下引线模式下，端子直引线独立使用 leadStroke */}
      {leadType === 'down' && (
        <g fill="none" stroke={leadStroke} strokeWidth={leadStrokeWidth} strokeLinecap="round">
          {leftLeadD && <path d={leftLeadD} />}
          {rightLeadD && <path d={rightLeadD} />}
        </g>
      )}

      {/* 2. 铁芯 (置于背面绕线与正面绕线之间，实现真实前后遮挡) */}
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
            x={-ironHalfW}
            y={-ry + ironCorePadY}
            width={ironHalfW * 2}
            height={height - ironCorePadY * 2}
            rx={3}
            fill={`url(#${ironCoreGradId})`}
            stroke={ironStroke}
            strokeWidth={1.5}
          />
        </>
      )}

      {/* 2b. 中间叠加层（如空心螺线管内部磁感线，压在背面线前、正面线后） */}
      {innerOverlay}

      {/* 3. 正面绕线（斜向连续螺旋，亮铜色实线） */}
      {frontSegments.map((seg, idx) => {
        const isMidTurn =
          idx === midTurnIdx ||
          (displayTurns > 3 && idx === midTurnIdx - 1)
        const showArrowOnTurn = showWindingArrows && hasCurrent && isMidTurn
        const arrowAngle = polarity.isLeftNorth ? seg.upAngleDeg : seg.upAngleDeg + 180

        return (
          <g key={`front-group-${idx}`}>
            <path
              d={seg.d}
              fill="none"
              stroke={frontStroke}
              strokeWidth={strokeW}
              strokeLinecap="round"
            />
            <path
              d={seg.highlightD}
              fill="none"
              stroke={SCENE_COLORS.materials.specularWhite}
              strokeWidth={highlightW}
              strokeLinecap="round"
              opacity={0.34}
            />
            {/* 正面绕组电流绕向指示箭头（沿真实螺旋切线方向旋转，直观对应安培定则） */}
            {showArrowOnTurn && (
              <polygon
                points="5,0 -3.5,-3.6 -3.5,3.6"
                transform={`translate(${seg.midX.toFixed(2)}, ${seg.midY.toFixed(2)}) rotate(${arrowAngle.toFixed(1)})`}
                fill={PHYSICS_COLORS.electricCurrent}
                stroke={CANVAS_COLORS.white}
                strokeWidth={0.7}
              />
            )}
          </g>
        )
      })}

      {/* 4. 流光粒子（沿连续螺旋正面弧段平顺滑行） */}
      {showParticles &&
        frontSegments.map((seg, idx) => {
          if (idx % stepInterval !== 0) return null
          const phase = idx * 0.6
          const t = ((time * flowSpeed + phase) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
          if (t > Math.PI) return null

          const phi = t / Math.PI
          const px = seg.xBot + phi * halfStep + rx * Math.sin(t)
          const py = ry * Math.cos(t)

          return (
            <circle
              key={`glow-${idx}`}
              cx={px}
              cy={py}
              r={particleR}
              fill={SCENE_COLORS.coil.activeGlow || colors.success[600]}
              filter={`drop-shadow(0 0 2px ${SCENE_COLORS.coil.activeGlow || colors.success[600]})`}
            />
          )
        })}

      {/* 5. 导线连接点端子 */}
      {leadType === 'down' && leadEndpointRadius > 0 && (
        <>
          <circle cx={-width / 2} cy={120} r={leadEndpointRadius} fill={colors.neutral[800]} />
          <circle cx={width / 2} cy={120} r={leadEndpointRadius} fill={colors.neutral[800]} />
        </>
      )}
      {leadType === 'horizontal' && leadEndpointRadius > 0 && (
        <>
          <circle cx={-width / 2} cy={0} r={leadEndpointRadius} fill={colors.neutral[800]} />
          <circle cx={width / 2} cy={0} r={leadEndpointRadius} fill={colors.neutral[800]} />
        </>
      )}

      {/* 6. 轴向磁极指示 (N/S 极标签，安培定则) */}
      {showPolarity && hasCurrent && (
        <CoilPolarityBadges
          halfW={coilHalfW}
          ry={ry}
          leftPole={polarity.leftPole}
          rightPole={polarity.rightPole}
        />
      )}
    </g>
  )
}

function CoilPolarityBadges({
  halfW,
  ry,
  leftPole,
  rightPole,
}: {
  halfW: number
  ry: number
  leftPole: 'N' | 'S' | 'none'
  rightPole: 'N' | 'S' | 'none'
}) {
  return (
    <g pointerEvents="none" fontSize={11} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
      <g transform={`translate(${-halfW - 14}, ${-ry - 10})`}>
        <rect
          x={-10}
          y={-9}
          width={20}
          height={18}
          rx={4}
          fill={leftPole === 'N' ? PHYSICS_COLORS.magnetNorth : PHYSICS_COLORS.magnetSouth}
        />
        <text fill={CANVAS_COLORS.white}>{leftPole}</text>
      </g>
      <g transform={`translate(${halfW + 14}, ${-ry - 10})`}>
        <rect
          x={-10}
          y={-9}
          width={20}
          height={18}
          rx={4}
          fill={rightPole === 'N' ? PHYSICS_COLORS.magnetNorth : PHYSICS_COLORS.magnetSouth}
        />
        <text fill={CANVAS_COLORS.white}>{rightPole}</text>
      </g>
    </g>
  )
}
