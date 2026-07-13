import React, { useMemo, CSSProperties } from 'react'
import { useUniqueSvgId } from '@/hooks'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'

export interface TransformerApparatusProps {
  /** 中心 x 坐标 */
  x: number
  /** 中心 y 坐标 */
  y: number
  /** 整体宽度，默认 70 */
  width?: number
  /** 整体高度，默认 80 */
  height?: number
  /** 原线圈实际匝数 */
  turns1: number
  /** 副线圈实际匝数 */
  turns2: number
  /** 原线圈电流 (A)，决定流光速度 */
  current1: number
  /** 副线圈电流 (A) */
  current2: number
  /** 输入电压，控制磁通流光动画激活，默认 220 */
  voltage1?: number
  /** 整体缩放，默认 1.0 */
  scale?: number
  /** 电子流光激活状态，默认 true */
  animated?: boolean
  /** 像素换算函数 */
  px?: (v: number) => number
}

interface CoilPaths3D {
  backD: string
  frontD: string
}

// 内部 3D 绕线路径生成算法
function generateCoilPaths3D(
  left: number,
  right: number,
  top: number,
  bottom: number,
  n: number,
  isPrimary: boolean,
  topInset: number,
  bulge: number,
): CoilPaths3D {
  const MAX_DISPLAY_TURNS = 15
  const turns = Math.min(Math.max(1, n), MAX_DISPLAY_TURNS)
  const availableH = bottom - top - topInset * 2
  const gap = availableH / turns
  let backD = ''
  let frontD = ''

  for (let i = 0; i < turns; i++) {
    const yStart = top + topInset + i * gap
    const yMid = yStart + gap / 2
    const yEnd = yStart + gap

    if (isPrimary) {
      backD += `${i === 0 ? 'M' : ' L'} ${left} ${yStart}`
      backD += ` Q ${left - bulge} ${(yStart + yMid) / 2} ${right} ${yMid}`
      frontD += `${i === 0 ? 'M' : ' L'} ${right} ${yMid}`
      frontD += ` Q ${right + bulge} ${(yMid + yEnd) / 2} ${left} ${yEnd}`
    } else {
      backD += `${i === 0 ? 'M' : ' L'} ${right} ${yStart}`
      backD += ` Q ${right + bulge} ${(yStart + yMid) / 2} ${left} ${yMid}`
      frontD += `${i === 0 ? 'M' : ' L'} ${left} ${yMid}`
      frontD += ` Q ${left - bulge} ${(yMid + yEnd) / 2} ${right} ${yEnd}`
    }
  }

  return { backD, frontD }
}

export const TransformerApparatus: React.FC<TransformerApparatusProps> = ({
  x,
  y,
  width = 64,
  height = 80,
  turns1,
  turns2,
  current1,
  current2,
  voltage1 = 220,
  scale = 1.0,
  animated = true,
  px = (v: number) => v,
}) => {
  const uniqueId = useUniqueSvgId()
  const tfFlowId = `tf-flow-${uniqueId}`

  // 1. 几何参数定义
  const coreH = height
  const coreColumnW = px(11) // 铁芯柱宽
  const coilW = px(13) // 线圈总幅宽
  const coreTop = y - coreH / 2
  const coreBottom = y + coreH / 2
  const coreLeft = x - width / 2
  const coreRight = x + width / 2

  const v1X = x - width / 2 + coreColumnW / 2
  const v2X = x + width / 2 - coreColumnW / 2

  const primaryLeft = v1X - coilW / 2
  const primaryRight = v1X + coilW / 2
  const secondaryLeft = v2X - coilW / 2
  const secondaryRight = v2X + coilW / 2

  // 2. 线圈 3D 路径生成
  const coilTopInset = px(8)
  const coilBulge = coilW / 2

  const primaryCoils = useMemo(
    () => generateCoilPaths3D(primaryLeft, primaryRight, coreTop, coreBottom, turns1, true, coilTopInset, coilBulge),
    [primaryLeft, primaryRight, coreTop, coreBottom, turns1, coilTopInset, coilBulge]
  )

  const secondaryCoils = useMemo(
    () => generateCoilPaths3D(secondaryLeft, secondaryRight, coreTop, coreBottom, turns2, false, coilTopInset, coilBulge),
    [secondaryLeft, secondaryRight, coreTop, coreBottom, turns2, coilTopInset, coilBulge]
  )

  // 3. 流速控制
  const hasCurrent1 = Math.abs(current1) > 0.01
  const hasCurrent2 = Math.abs(current2) > 0.01
  const flowDur1 = Math.max(0.35, Math.min(2.5, 1.8 / (Math.abs(current1) + 0.2)))
  const flowDur2 = Math.max(0.35, Math.min(2.5, 1.8 / (Math.abs(current2) + 0.2)))
  const fluxFlowDur = Math.max(0.4, Math.min(2.5, 300 / (Math.abs(voltage1) + 15)))

  const glowRadius1 = Math.max(1.5, Math.min(6, 1 + Math.abs(current1) * 0.25))
  const glowRadius2 = Math.max(1.5, Math.min(6, 1 + Math.abs(current2) * 0.25))
  const glowOpacity1 = Math.max(0.12, Math.min(0.85, 0.12 + Math.abs(current1) * 0.15))
  const glowOpacity2 = Math.max(0.12, Math.min(0.85, 0.12 + Math.abs(current2) * 0.15))

  return (
    <g transform={`scale(${scale})`}>
      <defs>
        <style>{`
          @keyframes tf-flux-flow-${tfFlowId} {
            from { stroke-dashoffset: 0 }
            to { stroke-dashoffset: ${px(-24)}px }
          }
          @keyframes tf-electron-flow-${tfFlowId} {
            from { stroke-dashoffset: 0 }
            to { stroke-dashoffset: ${px(-24)}px }
          }
        `}</style>
      </defs>

      {/* A. 绘制线圈后半圈 (处于铁芯下方，形成穿透遮挡立体感) */}
      <path
        d={primaryCoils.backD}
        fill="none"
        stroke={PHYSICS_COLORS.electricCurrent}
        strokeWidth={CANVAS_STYLE.stroke.objectLine - px(0.5)}
        opacity={0.3}
        strokeLinecap="round"
      />
      <path
        d={secondaryCoils.backD}
        fill="none"
        stroke={PHYSICS_COLORS.magnetSouth}
        strokeWidth={CANVAS_STYLE.stroke.objectLine - px(0.5)}
        opacity={0.3}
        strokeLinecap="round"
      />

      {/* B. 闭合铁芯 (叠片风格拟物) */}
      <g>
        <rect
          x={coreLeft}
          y={coreTop}
          width={width}
          height={coreH}
          fill={PHYSICS_COLORS.objectFillNeutral || '#E2E8F0'}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={px(4)}
          ry={px(4)}
        />
        {/* 内部镂空孔 */}
        <rect
          x={coreLeft + coreColumnW}
          y={coreTop + coreColumnW}
          width={width - 2 * coreColumnW}
          height={coreH - 2 * coreColumnW}
          fill="white"
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={px(2)}
          ry={px(2)}
        />
        {/* 叠片金属硅钢片蚀刻线 */}
        <line
          x1={coreLeft + coreColumnW / 2}
          y1={coreTop + px(2)}
          x2={coreLeft + coreColumnW / 2}
          y2={coreBottom - px(2)}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={px(0.6)}
          opacity={0.35}
        />
        <line
          x1={coreRight - coreColumnW / 2}
          y1={coreTop + px(2)}
          x2={coreRight - coreColumnW / 2}
          y2={coreBottom - px(2)}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={px(0.6)}
          opacity={0.35}
        />
      </g>

      {/* C. 铁芯中感应磁通量流光 (Flux Loop) */}
      {animated && Math.abs(voltage1) > 1 && (
        <rect
          x={coreLeft + coreColumnW / 2}
          y={coreTop + coreColumnW / 2}
          width={width - coreColumnW}
          height={coreH - coreColumnW}
          fill="none"
          stroke={PHYSICS_COLORS.magneticField}
          strokeWidth={coreColumnW - px(4)}
          opacity={0.06}
          rx={px(6)}
        />
      )}
      {animated && Math.abs(voltage1) > 1 && (
        <rect
          x={coreLeft + coreColumnW / 2}
          y={coreTop + coreColumnW / 2}
          width={width - coreColumnW}
          height={coreH - coreColumnW}
          fill="none"
          stroke={PHYSICS_COLORS.magneticField}
          strokeWidth={px(1.2)}
          strokeDasharray={`${px(4)} ${px(14)}`}
          strokeLinecap="round"
          style={{
            animation: `tf-flux-flow-${tfFlowId} linear infinite`,
            animationDuration: `${fluxFlowDur}s`,
            opacity: 0.8,
          } as CSSProperties}
        />
      )}

      {/* D. 绘制线圈前半圈与流光 (处于铁芯上方) */}
      {/* ─── 原线圈 ─── */}
      <g>
        {/* 外围微弱发光 */}
        <path
          d={primaryCoils.frontD}
          fill="none"
          stroke={PHYSICS_COLORS.electricCurrent}
          strokeWidth={CANVAS_STYLE.stroke.objectLine + px(3)}
          strokeLinecap="round"
          opacity={glowOpacity1 * 0.3}
          style={{ filter: `blur(${glowRadius1}px)` }}
        />
        {/* 铜线本体 */}
        <path
          d={primaryCoils.frontD}
          fill="none"
          stroke={PHYSICS_COLORS.electricCurrent}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />
        {/* 电子流动光点 */}
        {animated && hasCurrent1 && (
          <path
            d={primaryCoils.frontD}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth={CANVAS_STYLE.stroke.objectLine + px(1)}
            strokeDasharray={`${px(4)} ${px(20)}`}
            strokeLinecap="round"
            opacity={0.8}
            style={{
              animation: `tf-electron-flow-${tfFlowId} linear infinite`,
              animationDuration: `${flowDur1}s`,
            }}
          />
        )}
      </g>

      {/* ─── 副线圈 ─── */}
      <g>
        {/* 外围发光 */}
        <path
          d={secondaryCoils.frontD}
          fill="none"
          stroke={PHYSICS_COLORS.magnetSouth}
          strokeWidth={CANVAS_STYLE.stroke.objectLine + px(3)}
          strokeLinecap="round"
          opacity={glowOpacity2 * 0.3}
          style={{ filter: `blur(${glowRadius2}px)` }}
        />
        {/* 铜线本体 */}
        <path
          d={secondaryCoils.frontD}
          fill="none"
          stroke={PHYSICS_COLORS.magnetSouth}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />
        {/* 电子流动光点 */}
        {animated && hasCurrent2 && (
          <path
            d={secondaryCoils.frontD}
            fill="none"
            stroke={PHYSICS_COLORS.magnetSouth}
            strokeWidth={CANVAS_STYLE.stroke.objectLine + px(1)}
            strokeDasharray={`${px(4)} ${px(20)}`}
            strokeLinecap="round"
            opacity={0.8}
            style={{
              animation: `tf-electron-flow-${tfFlowId} linear infinite`,
              animationDuration: `${flowDur2}s`,
              animationDirection: 'reverse',
            }}
          />
        )}
      </g>
    </g>
  )
}
