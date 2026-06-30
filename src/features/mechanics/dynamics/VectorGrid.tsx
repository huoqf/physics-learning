import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'

interface VectorGridProps {
  centerX: number
  centerY: number
  scale: number
  visibleW: number
  visibleH: number
  showGrid: boolean
}

const TICK_LEN = 4

export function VectorGrid({ centerX, centerY, scale, visibleW, visibleH, showGrid }: VectorGridProps) {
  const ticks: React.ReactNode[] = []

  if (visibleW > 0) {
    for (let fVal = -20; fVal <= 20; fVal++) {
      if (fVal === 0) continue
      const cx = centerX + fVal * scale
      const major = fVal % 5 === 0
      ticks.push(
        <line key={`tx-${fVal}`} x1={cx} y1={centerY - (major ? TICK_LEN * 1.5 : TICK_LEN)}
          x2={cx} y2={centerY + (major ? TICK_LEN * 1.5 : TICK_LEN)}
          stroke={PHYSICS_COLORS.axis} strokeWidth={major ? CANVAS_STYLE.stroke.tickBold : CANVAS_STYLE.stroke.tick} />
      )
      if (major && cx > 30 && cx < visibleW - 30) {
        ticks.push(
          <text key={`txl-${fVal}`} x={cx} y={centerY + 16} fontSize={CANVAS_STYLE.font.axis}
            fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
            {fVal}N
          </text>
        )
      }
    }
    for (let fVal = -10; fVal <= 15; fVal++) {
      if (fVal === 0) continue
      const cy = centerY - fVal * scale
      const major = fVal % 5 === 0
      ticks.push(
        <line key={`ty-${fVal}`} x1={centerX - (major ? TICK_LEN * 1.5 : TICK_LEN)} y1={cy}
          x2={centerX + (major ? TICK_LEN * 1.5 : TICK_LEN)} y2={cy}
          stroke={PHYSICS_COLORS.axis} strokeWidth={major ? CANVAS_STYLE.stroke.tickBold : CANVAS_STYLE.stroke.tick} />
      )
      if (major && cy > 30 && cy < visibleH - 30) {
        ticks.push(
          <text key={`tyl-${fVal}`} x={centerX - 12} y={cy + 4} fontSize={CANVAS_STYLE.font.axis}
            fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">
            {fVal}N
          </text>
        )
      }
    }
  }

  const gridLines: React.ReactNode[] = []
  if (showGrid && visibleW > 0) {
    for (let fVal = -20; fVal <= 20; fVal += 5) {
      const xPos = centerX + fVal * scale
      gridLines.push(
        <line key={`gx-${fVal}`} x1={xPos} y1={10} x2={xPos} y2={visibleH - 10}
          stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid}
          opacity={CANVAS_STYLE.opacity.grid} strokeDasharray="4,4" />
      )
    }
    for (let fVal = -15; fVal <= 15; fVal += 5) {
      const yPos = centerY - fVal * scale
      gridLines.push(
        <line key={`gy-${fVal}`} x1={10} y1={yPos} x2={visibleW - 10} y2={yPos}
          stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid}
          opacity={CANVAS_STYLE.opacity.grid} strokeDasharray="4,4" />
      )
    }
  }

  return <>{gridLines}{ticks}</>
}
