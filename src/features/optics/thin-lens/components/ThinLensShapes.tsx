import { OPTICS_COLORS, STROKE, FONT } from '@/theme/physics'

export function lensShape(cx: number, cy: number, halfH: number, isConcave: boolean): string {
  const bow = isConcave ? -8 : 8
  const top = cy - halfH
  const bot = cy + halfH
  return `M ${cx} ${top} Q ${cx + bow} ${cy} ${cx} ${bot} Q ${cx - bow} ${cy} ${cx} ${top} Z`
}

export function CandleShape({ x, y, h, opacity = 1, inverted = false, showGlow = true, filter }: {
  x: number; y: number; h: number; opacity?: number; inverted?: boolean; showGlow?: boolean; filter?: string
}) {
  const CANDLE_RX = 1
  const bodyW = 5
  const bodyH = h * 0.65
  const flameH = h * 0.35
  const transform = inverted ? `translate(${x}, ${y}) scale(1, -1) translate(${-x}, ${-y})` : undefined

  return (
    <g opacity={opacity} transform={transform} filter={filter}>
      {/* 蜡烛烛身 */}
      <rect x={x - bodyW} y={y - bodyH} width={bodyW * 2} height={bodyH}
        fill={OPTICS_COLORS.candleBody} stroke={OPTICS_COLORS.candleBodyStroke}
        strokeWidth={STROKE.objectLine} rx={CANDLE_RX} />
      {/* 火焰外发光 */}
      {showGlow && (
        <ellipse cx={x} cy={y - bodyH - flameH * 0.4} rx={flameH * 0.5} ry={flameH * 0.8}
          fill={OPTICS_COLORS.candleFlame} opacity={0.3} filter="url(#optics-glow)" />
      )}
      {/* 火焰 */}
      <ellipse cx={x} cy={y - bodyH - flameH * 0.4} rx={flameH * 0.25} ry={flameH * 0.55}
        fill={OPTICS_COLORS.candleFlame} stroke={OPTICS_COLORS.candleFlameStroke}
        strokeWidth={1.5} filter={showGlow ? "url(#optics-glow)" : undefined} />
      {/* 烛台底座 */}
      <line x1={x} y1={y} x2={x} y2={y + 6}
        stroke={OPTICS_COLORS.candleStick} strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

export function FocalMarks({ cx, cy, fSvgDist, font }: {
  cx: number; cy: number; fSvgDist: number; font: (v: number) => number
}) {
  const fLeft = cx - fSvgDist
  const fRight = cx + fSvgDist
  const f2Left = cx - 2 * fSvgDist
  const f2Right = cx + 2 * fSvgDist
  return (
    <g>
      {[fLeft, fRight].map((fx, i) => (
        <g key={`f-${i}`}>
          <line x1={fx} y1={cy - 6} x2={fx} y2={cy + 6}
            stroke={OPTICS_COLORS.focalPoint} strokeWidth={STROKE.annotation} />
          <text x={fx} y={cy - 12} textAnchor="middle" dominantBaseline="auto"
            fill={OPTICS_COLORS.focalPoint} fontSize={font(10)} fontFamily={FONT.family} fontWeight="bold">
            {i === 0 ? 'F₁' : 'F₂'}
          </text>
        </g>
      ))}
      {[f2Left, f2Right].map((fx, i) => (
        <g key={`2f-${i}`}>
          <line x1={fx} y1={cy - 4} x2={fx} y2={cy + 4}
            stroke={OPTICS_COLORS.focalPoint} strokeWidth={STROKE.annotation} opacity={0.5} />
          <text x={fx} y={cy - 12} textAnchor="middle" dominantBaseline="auto"
            fill={OPTICS_COLORS.focalPoint} fontSize={font(9)} fontFamily={FONT.family} opacity={0.6} fontWeight="bold">
            {i === 0 ? '2F₁' : '2F₂'}
          </text>
        </g>
      ))}
    </g>
  )
}
