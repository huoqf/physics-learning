import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { BasePhysicsChart, useChartContext } from '@/components/Chart'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { computePendulumExperiment } from '@/physics/experimentPendulum'

interface T2LChartProps {
  theorySlope: number
  measuredSlope: number
  points: Array<{ L: number; T2_measured: number }>
  currentL: number
  currentT2: number
}

function T2LPlotPlugin({
  theorySlope,
  measuredSlope,
  points,
  currentL,
  currentT2,
}: T2LChartProps) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY } = ctx

  const x0 = 0
  const y0 = 0
  const x1 = 1.35
  const y1Theory = theorySlope * x1
  const y1Meas = measuredSlope * x1

  return (
    <g>
      <line
        x1={toSvgX(x0)}
        y1={toSvgY(y0)}
        x2={toSvgX(x1)}
        y2={toSvgY(y1Theory)}
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={1.8}
        strokeDasharray="4 3"
        opacity={0.65}
      />

      <line
        x1={toSvgX(x0)}
        y1={toSvgY(y0)}
        x2={toSvgX(x1)}
        y2={toSvgY(y1Meas)}
        stroke={PHYSICS_COLORS.accelerationX}
        strokeWidth={2.2}
        opacity={0.9}
      />

      {points.map((pt, i) => (
        <circle
          key={i}
          cx={toSvgX(pt.L)}
          cy={toSvgY(pt.T2_measured)}
          r={3.5}
          fill={PHYSICS_COLORS.position}
          opacity={0.7}
        />
      ))}

      <circle
        cx={toSvgX(currentL)}
        cy={toSvgY(currentT2)}
        r={6}
        fill={PHYSICS_COLORS.accelerationX}
        stroke={CANVAS_COLORS.white}
        strokeWidth={1.5}
      />
      <text
        x={currentL > 0.65 ? toSvgX(currentL) - 8 : toSvgX(currentL) + 8}
        y={toSvgY(currentT2) - 8}
        textAnchor={currentL > 0.65 ? 'end' : 'start'}
        fontSize={10}
        fill={PHYSICS_COLORS.accelerationX}
        fontWeight="bold"
      >
        ({currentL.toFixed(3)}m, {currentT2.toFixed(3)}s²)
      </text>
    </g>
  )
}

/**
 * 用单摆测重力加速度实验：T²-L 图像拟合与斜率求 g 面板
 */
export default function ExperimentPendulumCenterExtra() {
  const params = useAnimationStore(useShallow((s) => s.params))
  const theta0Deg = Math.min(5, params.theta0_exp ?? 4)

  const expData = useMemo(
    () =>
      computePendulumExperiment({
        l_line: params.l_line,
        d_mm: params.d_mm,
        n_cycles: params.n_cycles,
        g_true: params.g ?? 9.8,
        timing_err: params.timing_err,
        theta0: theta0Deg,
      }),
    [params.l_line, params.d_mm, params.n_cycles, params.g, params.timing_err, theta0Deg],
  )

  return (
    <div className="w-full h-full p-3 flex flex-col gap-3 bg-neutral-50/50">
      <div className="flex-1 bg-white p-3 rounded-xl border border-neutral-100 shadow-sm flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-neutral-600">
            T²-L 图像斜率法求重力加速度 g
          </span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1" style={{ color: PHYSICS_COLORS.accelerationX }}>
              <span
                className="w-2.5 h-1.5 rounded-sm inline-block"
                style={{ backgroundColor: PHYSICS_COLORS.accelerationX }}
              />
              实测拟合线
            </span>
            <span className="flex items-center gap-1 text-neutral-400">
              <span
                className="w-2.5 h-1.5 rounded-sm inline-block"
                style={{ backgroundColor: PHYSICS_COLORS.velocity, opacity: 0.7 }}
              />
              理论基准
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          <BasePhysicsChart
            xDomain={[0, 1.4]}
            yDomain={[0, 6.0]}
            xLabel="有效摆长 L (m)"
            yLabel="周期平方 T² (s²)"
            variant="mini"
          >
            <T2LPlotPlugin
              theorySlope={expData.slopeT2_L}
              measuredSlope={expData.slopeT2_L_measured}
              points={expData.comparisonPoints}
              currentL={expData.effectiveLength}
              currentT2={expData.measuredPeriod * expData.measuredPeriod}
            />
          </BasePhysicsChart>
        </div>

        <div className="mt-2 pt-2 border-t border-neutral-100 flex flex-col gap-1 text-[11px]">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-neutral-50 p-1.5 rounded border border-neutral-100">
              <span className="text-neutral-400">实测斜率 k_测: </span>
              <span className="font-mono font-bold text-neutral-800">
                {expData.slopeT2_L_measured.toFixed(3)} s²/m
              </span>
            </div>
            <div className="bg-neutral-50 p-1.5 rounded border border-neutral-100">
              <span className="text-neutral-400">反求 g: </span>
              <span className="font-mono font-bold text-emerald-600">
                {expData.measuredG.toFixed(3)} m/s²
              </span>
            </div>
          </div>
          <div className="text-[10px] text-neutral-400 px-0.5">
            理论基准 k_理 = {expData.slopeT2_L.toFixed(3)} s²/m | 图像法关系 g = 4π²/k_测
          </div>
        </div>
      </div>
    </div>
  )
}
