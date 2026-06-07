import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { AnimationControls } from '@/components/UI'
import { useCanvasSize } from '@/utils'
import { calculateConnectedBody, GRAVITY } from '@/physics'
import ConnectedBodiesAnimation from './ConnectedBodiesAnimation'

interface MiniChartProps {
  title: string
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  points: Record<string, number>[]
  lines: {
    key: string
    color: string
    strokeWidth?: number
    strokeDasharray?: string
    name: string
  }[]
  xKey?: string
  yLabel: string
  xLabel: string
  currentVals: Record<string, number>
  currentXVal: number
  staticLines?: {
    value: number
    color: string
    strokeDasharray?: string
    name: string
  }[]
}

function MiniChart({
  title,
  xMin,
  xMax,
  yMin,
  yMax,
  points,
  lines,
  xKey = 't',
  yLabel,
  xLabel,
  currentVals,
  currentXVal,
  staticLines = [],
}: MiniChartProps) {
  const [containerRef, size] = useCanvasSize({ width: 300, height: 130 })
  const { width, height } = size

  const margin = { left: 48, right: 20, top: 22, bottom: 22 }
  const plotW = Math.max(10, width - margin.left - margin.right)
  const plotH = Math.max(10, height - margin.top - margin.bottom)

  const toSvgX = (xVal: number) => {
    const range = xMax - xMin || 1
    return margin.left + ((xVal - xMin) / range) * plotW
  }
  const toSvgY = (yVal: number) => {
    const range = yMax - yMin || 1
    return margin.top + plotH - ((yVal - yMin) / range) * plotH
  }

  const visiblePoints = useMemo(() => {
    if (xKey === 't') {
      return points.filter((p) => p.t <= currentXVal + 1e-9)
    }
    return points // 对自变量非t的图表（如 mu），绘制完整曲线
  }, [points, xKey, currentXVal])

  const px = toSvgX(Math.min(currentXVal, xMax))

  const fs = 11
  const sfs = 9

  return (
    <div ref={containerRef} className="w-full h-full min-h-0">
      <svg width={width} height={height} className="w-full h-full select-none">
        {/* 标题 */}
        <text x={margin.left} y={margin.top - 7} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
          {title}
        </text>

        {/* 坐标轴网格线 */}
        {Array.from({ length: 5 }).map((_, idx) => {
          const gridY = margin.top + (plotH * idx) / 4
          return (
            <line
              key={`grid-y-${idx}`}
              x1={margin.left} y1={gridY} x2={margin.left + plotW} y2={gridY}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={0.5}
              opacity={0.3}
            />
          )
        })}
        {Array.from({ length: 6 }).map((_, idx) => {
          const gridX = margin.left + (plotW * idx) / 5
          return (
            <line
              key={`grid-x-${idx}`}
              x1={gridX} y1={margin.top} x2={gridX} y2={margin.top + plotH}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={0.5}
              opacity={0.3}
            />
          )
        })}

        {/* 坐标轴线 */}
        <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={PHYSICS_COLORS.labelText} strokeWidth={1} />
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke={PHYSICS_COLORS.labelText} strokeWidth={1} />

        {/* 零刻度虚线 */}
        {yMin < 0 && yMax > 0 && (
          <line
            x1={margin.left}
            y1={toSvgY(0)}
            x2={margin.left + plotW}
            y2={toSvgY(0)}
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={0.8}
            strokeDasharray="2,2"
            opacity={0.4}
          />
        )}

        {/* 静态参考水平线 */}
        {staticLines.map((sLine, idx) => (
          <g key={`sline-${idx}`}>
            <line
              x1={margin.left}
              y1={toSvgY(sLine.value)}
              x2={margin.left + plotW}
              y2={toSvgY(sLine.value)}
              stroke={sLine.color}
              strokeWidth={1}
              strokeDasharray={sLine.strokeDasharray}
            />
          </g>
        ))}

        {/* X 轴刻度 */}
        {Array.from({ length: 6 }, (_, i) => {
          const val = xMin + ((xMax - xMin) * i) / 5
          const x = toSvgX(val)
          return (
            <g key={`xval-${i}`}>
              <line x1={x} y1={margin.top + plotH} x2={x} y2={margin.top + plotH + 3} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.8} />
              <text x={x} y={margin.top + plotH + sfs + 3} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontFamily="monospace">
                {val.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* Y 轴刻度 */}
        {[yMin, (yMin + yMax) / 2, yMax].map((val, idx) => {
          const y = toSvgY(val)
          return (
            <g key={`yval-${idx}`}>
              <line x1={margin.left - 3} y1={y} x2={margin.left} y2={y} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.8} />
              <text x={margin.left - 5} y={y + sfs * 0.35} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">
                {val.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* 绘制轨迹曲线 */}
        {visiblePoints.length >= 2 &&
          lines.map((line) => {
            const pathD = visiblePoints
              .map((p, idx) => {
                const x = toSvgX(p[xKey])
                const y = toSvgY(p[line.key])
                return `${idx === 0 ? 'M' : 'L'} ${x},${y}`
              })
              .join(' ')

            return (
              <path
                key={line.key}
                d={pathD}
                fill="none"
                stroke={line.color}
                strokeWidth={line.strokeWidth ?? 1.5}
                strokeDasharray={line.strokeDasharray}
              />
            )
          })}

        {/* 时间/物理量游标焦点 */}
        <g>
          <line
            x1={px}
            y1={margin.top}
            x2={px}
            y2={margin.top + plotH}
            stroke={PHYSICS_COLORS.labelTextLight}
            strokeWidth={0.8}
            strokeDasharray="3,3"
            opacity={0.5}
          />
          {lines.map((line) => {
            const currentVal = currentVals[line.key] ?? 0
            const py = toSvgY(currentVal)
            return (
              <g key={`point-${line.key}`}>
                <circle cx={px} cy={py} r={3.5} fill={line.color} opacity={0.3} />
                <circle cx={px} cy={py} r={2} fill={line.color} stroke={colors.neutral[0]} strokeWidth={0.8} />
              </g>
            )
          })}
        </g>

        {/* 坐标轴标签 */}
        <text x={margin.left + plotW - 10} y={margin.top + plotH + sfs + 3} fontSize={sfs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
          {xLabel}
        </text>
        <text x={margin.left - 4} y={margin.top - 6} fontSize={sfs} fill={PHYSICS_COLORS.labelText} textAnchor="end" fontWeight="bold">
          {yLabel}
        </text>

        {/* 图例 */}
        <g transform={`translate(${margin.left + 15}, ${margin.top + 5})`}>
          {lines.map((line, idx) => {
            const currentVal = currentVals[line.key] ?? 0
            return (
              <g key={`legend-${line.key}`} transform={`translate(0, ${idx * 13})`}>
                <line x1={0} y1={-3} x2={10} y2={-3} stroke={line.color} strokeWidth={1.5} strokeDasharray={line.strokeDasharray} />
                <text x={14} y={1} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} className="font-semibold select-none">
                  {line.name}: {currentVal.toFixed(1)}
                </text>
              </g>
            )
          })}
          {staticLines.map((sLine, idx) => {
            return (
              <g key={`legend-s-${idx}`} transform={`translate(0, ${(lines.length + idx) * 13})`}>
                <line x1={0} y1={-3} x2={10} y2={-3} stroke={sLine.color} strokeWidth={1.2} strokeDasharray={sLine.strokeDasharray} />
                <text x={14} y={1} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} className="font-semibold select-none">
                  {sLine.name}: {sLine.value.toFixed(1)}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

export default function ConnectedBodiesCenterExtra() {
  const { params, time, isPlaying, speed, setIsPlaying, setTime, setSpeed } = useAnimationStore()

  const {
    m1 = 2,
    m2 = 3,
    F = 15,
    mu = 0.1,
    analysisView = 0,
  } = params

  const g = GRAVITY
  const tMax = 4.0

  // 1. 物理计算（单一来源：calculateConnectedBody）
  const physicsResult = calculateConnectedBody(m1, m2, F, mu, g)
  const { a: acceleration, T: tension } = physicsResult
  const totalMass = m1 + m2

  // 2. 离线时间点集生成
  const points = useMemo(() => {
    const pts = []
    const dt = 0.05
    for (let t = 0; t <= tMax; t += dt) {
      const v = acceleration * t
      pts.push({
        t,
        a: acceleration,
        v,
        T: tension,
      })
    }
    return pts
  }, [acceleration, tension])

  // 3. T - mu 曲线点集生成（含启动阈值判定）
  const tMuPoints = useMemo(() => {
    const pts = []
    const steps = 40
    const muMin = 0
    const muMax = 0.6
    for (let i = 0; i <= steps; i++) {
      const curMu = muMin + (i / steps) * (muMax - muMin)
      // 每个采样点独立判定是否运动
      const curResult = calculateConnectedBody(m1, m2, F, curMu, g)
      pts.push({
        mu: curMu,
        T: curResult.displayTension,
      })
    }
    return pts
  }, [m1, m2, F, g])

  // 4. 当前物理参量
  const effectiveTime = Math.min(time, tMax)
  const currentA = isPlaying && time > 0 && time < tMax ? acceleration : 0
  const currentV = isPlaying && time > 0 ? acceleration * effectiveTime : 0
  const currentT = isPlaying && time > 0 && time < tMax ? tension : physicsResult.displayTension

  const currentVals = {
    a: currentA,
    v: currentV,
    T: currentT,
  }

  // 极限范围动态估计
  const maxV = acceleration * tMax || 5
  const maxT = Math.max(F, tension, 5)

  // 根据当前分析视图确定图表二的内容
  const chartTwoProps = useMemo(() => {
    if (analysisView === 1) {
      // 整体法：展示加速度-时间曲线 (a-t)
      return {
        title: '加速度 - 时间 (a-t)',
        xMin: 0,
        xMax: tMax,
        yMin: 0,
        yMax: Math.max(acceleration * 1.5, 2.0),
        points,
        lines: [{ key: 'a', color: PHYSICS_COLORS.acceleration, name: '加速度 a' }],
        xLabel: 't(s)',
        yLabel: 'a(m/s²)',
        currentVals,
        currentXVal: effectiveTime,
      }
    } else if (analysisView === 2) {
      // 隔离 m1：展示张力-摩擦系数曲线 (T-μ)，含临界 μ 竖线
      const muCritical = F / ((m1 + m2) * g)
      return {
        title: '运动状态下的绳张力 T 与 μ 的关系',
        xMin: 0,
        xMax: 0.6,
        yMin: 0,
        yMax: maxT * 1.2,
        points: tMuPoints,
        lines: [{ key: 'T', color: PHYSICS_COLORS.tension, name: '张力 T' }],
        xKey: 'mu',
        xLabel: 'μ',
        yLabel: 'T(N)',
        currentVals: { T: tension },
        currentXVal: mu,
        staticLines: muCritical <= 0.6
          ? [{ value: muCritical, color: PHYSICS_COLORS.friction, strokeDasharray: '4,3', name: `μc=${muCritical.toFixed(2)}` }]
          : [],
      }
    } else if (analysisView === 3) {
      // 隔离 m2：展示张力-外力比例曲线 (T-F)，含启动阈值
      const tFPoints = []
      for (let fVal = 0; fVal <= 30; fVal += 2) {
        const curResult = calculateConnectedBody(m1, m2, fVal, mu, g)
        tFPoints.push({
          F_val: fVal,
          T: curResult.displayTension,
        })
      }
      const fCritical = mu * (m1 + m2) * g
      return {
        title: '运动状态下的绳张力 T 与拉力 F 的关系',
        xMin: 0,
        xMax: 30,
        yMin: 0,
        yMax: (m1 * 30) / totalMass * 1.2,
        points: tFPoints,
        lines: [{ key: 'T', color: PHYSICS_COLORS.tension, name: '张力 T' }],
        xKey: 'F_val',
        xLabel: 'F(N)',
        yLabel: 'T(N)',
        currentVals: { T: tension },
        currentXVal: F,
        staticLines: fCritical <= 30
          ? [{ value: fCritical, color: PHYSICS_COLORS.friction, strokeDasharray: '4,3', name: `Fc=${fCritical.toFixed(1)}` }]
          : [],
      }
    } else {
      // 普通受力视图：展示张力-时间曲线 (T-t)
      return {
        title: '细绳张力 - 时间 (T-t)',
        xMin: 0,
        xMax: tMax,
        yMin: 0,
        yMax: maxT * 1.2,
        points,
        lines: [{ key: 'T', color: PHYSICS_COLORS.tension, name: '绳拉力 T' }],
        xLabel: 't(s)',
        yLabel: 'T(N)',
        currentVals,
        currentXVal: effectiveTime,
      }
    }
  }, [analysisView, acceleration, tension, mu, F, points, tMuPoints, m1, totalMass, currentVals, effectiveTime, maxT])

  return (
    <div className="w-full h-full flex flex-col gap-2.5 p-1">
      {/* 上下工作台分栏 (上方双图表并列，下方动画全宽跑道) */}
      <div className="w-full flex-1 min-h-0 flex flex-col gap-3">
        {/* 上方：60% 或 50% 高度双图表并列 */}
        <div className="w-full h-1/2 flex flex-row gap-3 min-h-0">
          {/* 图表一：速度-时间图 (v-t) */}
          <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2 border border-neutral-100 min-h-0">
            <MiniChart
              title="速度 - 时间 (v-t)"
              xMin={0}
              xMax={tMax}
              yMin={0}
              yMax={maxV * 1.2}
              points={points}
              lines={[{ key: 'v', color: PHYSICS_COLORS.velocity, name: '速度 v' }]}
              xLabel="t(s)"
              yLabel="v(m/s)"
              currentVals={currentVals}
              currentXVal={effectiveTime}
            />
          </div>

          {/* 图表二：根据分析视图动态切换的探究曲线 */}
          <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2 border border-neutral-100 min-h-0">
            <MiniChart {...chartTwoProps} />
          </div>
        </div>

        {/* 下方：50% 高度自适应满宽动画 */}
        <div className="w-full h-1/2 bg-white rounded-xl shadow-md overflow-hidden relative border border-neutral-100 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 relative">
            <ConnectedBodiesAnimation />
          </div>
        </div>
      </div>

      {/* 底部动画控制栏 */}
      <div className="w-full shrink-0 bg-white rounded-xl shadow-md p-2 border border-neutral-100">
        <AnimationControls
          isPlaying={isPlaying}
          speed={speed}
          time={time}
          maxTime={tMax}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onReset={() => setTime(0)}
          onSpeedChange={setSpeed}
          onTimeChange={setTime}
        />
      </div>
    </div>
  )
}
