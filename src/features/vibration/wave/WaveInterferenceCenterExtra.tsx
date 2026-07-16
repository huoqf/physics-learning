import { useMemo, useId } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { BasePhysicsChart, useChartContext } from '@/components/Chart'
import { PHYSICS_COLORS, WAVE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { hexToRgb } from '@/utils'
import { computeTwoSourceScreenIntensity } from '@/physics/wave'

function IntensityPath({ points, color }: { points: { y: number; I: number }[]; color: string }) {
  const ctx = useChartContext()
  if (!ctx || points.length < 2) return null
  const { toSvgX, toSvgY } = ctx
  const d =
    'M ' +
    points.map((p) => `${toSvgX(p.y).toFixed(1)},${toSvgY(p.I).toFixed(1)}`).join(' L ')
  return <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
}

function InterferenceStrips({
  a,
  lambda,
  screenDistance,
  yMax,
}: {
  a: number;
  lambda: number;
  screenDistance: number;
  yMax: number;
}) {
  const ctx = useChartContext()
  const gradientId = useId()

  const stops = useMemo(() => {
    const black = { r: 0, g: 0, b: 0 }
    const blue = hexToRgb(colors.primary[500])!
    const list = []
    const nStops = 50
    for (let i = 0; i <= nStops; i++) {
      const pct = (i / nStops) * 100
      const yVal = -yMax + (2 * yMax * i) / nStops
      const I = computeTwoSourceScreenIntensity(yVal, a, lambda, screenDistance, 1)

      // 插值明暗：从黑色渐变到 primary[500]
      const r = Math.round(black.r + I * (blue.r - black.r))
      const g = Math.round(black.g + I * (blue.g - black.g))
      const b = Math.round(black.b + I * (blue.b - black.b))
      list.push(
        <stop key={i} offset={`${pct}%`} stopColor={`rgb(${r}, ${g}, ${b})`} />
      )
    }
    return list
  }, [a, lambda, yMax, screenDistance])

  if (!ctx) return null
  const { toSvgX, plotOrigin, plotSize } = ctx

  const xStart = toSvgX(-yMax)
  const xEnd = toSvgX(yMax)
  const stripWidth = Math.max(0, xEnd - xStart)

  // 内嵌在绘图区底部的条纹带
  const heightVal = 14
  const yPos = plotOrigin.y + plotSize.height - heightVal

  return (
    <g opacity={0.45}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          {stops}
        </linearGradient>
      </defs>
      <rect
        x={xStart}
        y={yPos}
        width={stripWidth}
        height={heightVal}
        fill={`url(#${gradientId})`}
        rx={1}
      />
      <rect
        x={xStart}
        y={yPos}
        width={stripWidth}
        height={heightVal}
        fill="none"
        stroke={colors.neutral[300]}
        strokeWidth={1}
        rx={1}
      />
    </g>
  )
}

export default function WaveInterferenceCenterExtra() {
  const { params } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
    })),
  )

  const a_cm = params.a ?? 12
  const lambda_cm = params.lambda ?? 5
  const a = a_cm / 100
  const lambda = lambda_cm / 100
  const screenDistance = 1.0
  const yMax = 0.5

  const points = useMemo(() => {
    const pts: { y: number; I: number }[] = []
    const steps = 140
    for (let i = 0; i <= steps; i++) {
      const y = -yMax + (2 * yMax * i) / steps
      const I = computeTwoSourceScreenIntensity(y, a, lambda, screenDistance, 1)
      pts.push({ y, I })
    }
    return pts
  }, [a, lambda])

  return (
    <div className="w-full h-full p-3 flex flex-col gap-2 bg-neutral-50/50 min-h-0">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold text-neutral-500">双源干涉屏强 I(y) & 条纹</span>
        <span className="text-[10px]" style={{ color: WAVE_COLORS.antinodePoint }}>
          加强: δ = nλ
        </span>
      </div>
      <div className="flex-1 min-h-0 bg-white p-2 rounded-xl border border-neutral-100 shadow-sm">
        <BasePhysicsChart
          xDomain={[-yMax, yMax]}
          yDomain={[0, 1.05]}
          xLabel="屏上位置 y (m)"
          yLabel="相对强度 I/I₀"
          variant="mini"
        >
          <InterferenceStrips a={a} lambda={lambda} screenDistance={screenDistance} yMax={yMax} />
          <IntensityPath points={points} color={PHYSICS_COLORS.waveform} />
        </BasePhysicsChart>
      </div>
      <p className="text-[10px] text-neutral-500 px-1 leading-relaxed">
        相干双源：程差 δ = nλ 加强，δ = (n+1/2)λ 减弱。底图彩色带展示屏上仿真干涉条纹。
      </p>
    </div>
  )
}
