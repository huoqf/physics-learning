import { useChartContext } from '@/components/Chart'
import { EM_OSCILLATION_COLORS, STROKE, DASH } from '@/theme/physics'
import type { LCCurvePoint } from '../hooks/useLCPhysics'

interface DampingEnvelopeOverlayProps {
  /** 阻尼振幅包络（y = Q₀·e^(−t/τ)，与电荷曲线同量纲 C，正半轴取值） */
  points: LCCurvePoint[]
}

/**
 * 阻尼振幅包络叠加层 —— 以 RelationChart 的插件层（children）呈现。
 *
 * 为什么不用 `additionalSeries`：图例会为每个额外系列画一条色块，
 * 上下对称的两条包络会变成"阻尼包络 + 无名色块"，反而误导。
 * 走插件层只画线、不进图例，语义更准。
 *
 * 包络只承担“振幅衰减”的参考意义；真实 q、i 使用满足 i=-dq/dt 的
 * 欠阻尼解析解，不再宣称每个波峰都与理想包络严格相切。
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
