import { CHART_COLORS, STROKE, DASH, FONT } from '@/theme/physics'
import { useChartContext } from '@/components/Chart'

export function VTTargetMarkers({
  activeTime,
  targetHeightIntersections,
  vT1,
  vT2,
}: {
  activeTime: number
  targetHeightIntersections: { t1: number; t2: number }
  vT1: number
  vT2: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const opacity = Math.abs(activeTime - targetHeightIntersections.t1) < 0.2 || Math.abs(activeTime - targetHeightIntersections.t2) < 0.2 ? 0.95 : 0.25
  return (
    <g opacity={opacity}>
      {[{ t: targetHeightIntersections.t1, v: vT1 }, { t: targetHeightIntersections.t2, v: vT2 }].map((p, idx) => (
        <g key={`vt-target-${idx}`}>
          <line x1={ctx.plotOrigin.x} y1={ctx.toSvgY(p.v)} x2={ctx.toSvgX(p.t)} y2={ctx.toSvgY(p.v)}
            stroke={CHART_COLORS.highlight} strokeWidth={0.8} strokeDasharray="2,2" />
          <circle cx={ctx.toSvgX(p.t)} cy={ctx.toSvgY(p.v)} r={3.5} fill={CHART_COLORS.highlight} />
        </g>
      ))}
    </g>
  )
}

export function HorizontalMarker({
  y, label, color, opacity = 0.6,
}: {
  y: number
  label?: string
  color: string
  opacity?: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  return (
    <g opacity={opacity}>
      <line x1={ctx.plotOrigin.x} y1={ctx.toSvgY(y)}
        x2={ctx.plotOrigin.x + ctx.plotSize.width} y2={ctx.toSvgY(y)}
        stroke={color} strokeWidth={STROKE.reference} strokeDasharray={DASH.reference.join(' ')} />
      {label && (
        <text x={ctx.plotOrigin.x + ctx.plotSize.width - 4} y={ctx.toSvgY(y) - 4}
          fontSize={ctx.font(FONT.small)} fill={color} textAnchor="end" fontWeight="bold">
          {label}
        </text>
      )}
    </g>
  )
}

export function TargetHeightLayer({
  targetHeight, targetHeightIntersections,
}: {
  targetHeight: number
  targetHeightIntersections: { t1: number; t2: number } | null
}) {
  const ctx = useChartContext()
  if (!ctx) return null

  return (
    <g>
      <HorizontalMarker y={targetHeight} label={`y=${targetHeight}m`} color={CHART_COLORS.highlight} opacity={0.75} />
      {targetHeightIntersections && (
        <>
          {[targetHeightIntersections.t1, targetHeightIntersections.t2].map((t, idx) => (
            <g key={`yt-target-${idx}`}>
              <line x1={ctx.toSvgX(t)} y1={ctx.plotOrigin.y}
                x2={ctx.toSvgX(t)} y2={ctx.plotOrigin.y + ctx.plotSize.height}
                stroke={CHART_COLORS.highlight} strokeWidth={0.8}
                strokeDasharray={DASH.tangent.join(' ')} opacity={0.5} />
              <text x={ctx.toSvgX(t)} y={ctx.plotOrigin.y + ctx.plotSize.height + ctx.font(8)}
                fontSize={ctx.font(8)} fill={CHART_COLORS.highlight} textAnchor="middle">
                t{idx + 1}={t.toFixed(2)}s
              </text>
            </g>
          ))}
        </>
      )}
    </g>
  )
}
