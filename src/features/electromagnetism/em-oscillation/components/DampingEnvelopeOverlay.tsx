import { useChartContext } from '@/components/Chart'
import { EM_OSCILLATION_COLORS, STROKE, DASH } from '@/theme/physics'
import type { LCCurvePoint } from '../hooks/useLCPhysics'

interface DampingEnvelopeOverlayProps {
  /** 阻尼振幅包络（y = e^(−t/τ)，y ∈ (0, 1]） */
  points: LCCurvePoint[]
}

/**
 * 阻尼振幅包络叠加层 —— 以 RelationChart 的插件层（children）呈现。
 *
 * 为什么不用 `additionalSeries`：图例会为每个额外系列画一条色块，
 * 上下对称的两条包络会变成"阻尼包络 + 无名色块"，反而误导。
 * 走插件层只画线、不进图例，语义更准。
 *
 * 与曲线**同源**：曲线本身已乘同一个振幅系数，故曲线的每个波峰恰好与该包络
 * 相切（相切而非穿越），直观呈现"振幅按 e^(−t/τ) 衰减"这一条定性结论。
 */
export function DampingEnvelopeOverlay({ points }: DampingEnvelopeOverlayProps) {
  const ctx = useChartContext()
  if (!ctx || points.length < 2) return null

  const { toSvgX, toSvgY } = ctx
  const buildPath = (sign: number) =>
    'M ' +
    points.map((p) => `${toSvgX(p.x).toFixed(2)},${toSvgY(sign * p.y).toFixed(2)}`).join(' L ')

  return (
    <g>
      {[1, -1].map((sign) => (
        <path
          key={sign}
          d={buildPath(sign)}
          fill="none"
          stroke={EM_OSCILLATION_COLORS.dampingEnvelope}
          strokeWidth={STROKE.chartSub}
          strokeDasharray={DASH.guide.join(' ')}
          opacity={0.85}
        />
      ))}
    </g>
  )
}
