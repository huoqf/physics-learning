import { CHART_COLORS } from '@/theme/physics'

interface ZeroPotentialLineProps {
  animCenterX: number
  yRefLine: number
  hRef: number
  mode: number
  hangY?: number
  groundY?: number
  R_pix?: number
  font: (n: number) => number
  onMouseDown: (e: React.MouseEvent<SVGElement>) => void
}

export function ZeroPotentialLine({
  animCenterX,
  yRefLine,
  hRef,
  mode,
  hangY,
  groundY,
  R_pix,
  font,
  onMouseDown,
}: ZeroPotentialLineProps) {
  const labelY = mode === 0
    ? (yRefLine > (hangY ?? 0) + (R_pix ?? 0) - 5 ? yRefLine - 6 : yRefLine + 11)
    : (yRefLine > (groundY ?? 0) - 5 ? yRefLine - 6 : yRefLine + 11)

  return (
    <g
      className="cursor-ns-resize"
      onMouseDown={onMouseDown}
    >
      <line
        x1={animCenterX - 120}
        y1={yRefLine}
        x2={animCenterX + 120}
        y2={yRefLine}
        stroke={CHART_COLORS.reference}
        strokeWidth={1.2}
        strokeDasharray="3,2"
        opacity={0.85}
      />
      <line
        x1={animCenterX - 150}
        y1={yRefLine}
        x2={animCenterX + 150}
        y2={yRefLine}
        stroke="transparent"
        strokeWidth={12}
      />
      <text
        x={animCenterX}
        y={labelY}
        fontSize={font(7.5)}
        fill={CHART_COLORS.reference}
        textAnchor="middle"
        fontWeight="semibold"
        className="select-none pointer-events-none"
      >
        {mode === 0 ? '参考零势能面' : '谷底零势能面'} (y={hRef.toFixed(1)}m)
      </text>
    </g>
  )
}