import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { calculateElevatorMotion } from '@/physics'
import { AnimationControls } from '@/components/UI'
import { useCanvasSize } from '@/utils'
import WeightlessnessAnimation from './WeightlessnessAnimation'

interface MiniChartProps {
  title: string
  t0: number
  tMax: number
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
  yLabel: string
  currentVals: Record<string, number>
  staticLines?: {
    value: number
    color: string
    strokeDasharray?: string
    name: string
  }[]
}

function MiniChart({
  title,
  t0,
  tMax,
  yMin,
  yMax,
  points,
  lines,
  yLabel,
  currentVals,
  staticLines = [],
}: MiniChartProps) {
  // 采用动态计算尺寸，不写死像素
  const [containerRef, size] = useCanvasSize({ width: 300, height: 110 })
  const { width, height } = size

  // 统一的绝对像素 margin 确保三个垂直排列图表在水平 t 轴上精确像素级对齐
  const margin = { left: 48, right: 15, top: 22, bottom: 22 }
  const plotW = Math.max(10, width - margin.left - margin.right)
  const plotH = Math.max(10, height - margin.top - margin.bottom)

  const toSvgX = (t: number) => margin.left + (t / tMax) * plotW
  const toSvgY = (val: number) => {
    const range = yMax - yMin || 1
    return margin.top + plotH - ((val - yMin) / range) * plotH
  }

  const visiblePoints = useMemo(() => {
    return points.filter((p) => p.t <= t0 + 1e-9)
  }, [points, t0])

  const px = toSvgX(Math.min(t0, tMax))

  // 字体大小采用像素单位，防止因为 viewBox 缩放而导致文本变形或过小
  const fs = 11 // 标题字号
  const sfs = 9 // 轴标签/数据字号

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

        {/* X 轴刻度 (t) */}
        {Array.from({ length: 6 }, (_, i) => {
          const t = (tMax * i) / 5
          const x = toSvgX(t)
          return (
            <g key={`xt-${i}`}>
              <line x1={x} y1={margin.top + plotH} x2={x} y2={margin.top + plotH + 3} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.8} />
              <text x={x} y={margin.top + plotH + sfs + 3} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontFamily="monospace">
                {t.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* Y 轴刻度 */}
        {[yMin, (yMin + yMax) / 2, yMax].map((val, idx) => {
          const y = toSvgY(val)
          return (
            <g key={`yt-${idx}`}>
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
                const x = toSvgX(p.t)
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

        {/* 时间游标与曲线焦点 */}
        {t0 <= tMax && (
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
        )}

        {/* X轴/Y轴标签标注 */}
        <text x={margin.left + plotW - 10} y={margin.top + plotH + sfs + 3} fontSize={sfs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
          t(s)
        </text>
        <text x={margin.left - 4} y={margin.top - 6} fontSize={sfs} fill={PHYSICS_COLORS.labelText} textAnchor="end" fontWeight="bold">
          {yLabel}
        </text>

        {/* 图例绘制 */}
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

export default function WeightlessnessCenterExtra() {
  const { params, time, isPlaying, speed, setIsPlaying, setTime, setSpeed } = useAnimationStore()

  const {
    m = 50,
    g = 9.8,
    modelIdx = 0,
  } = params

  const tMax = modelIdx === 1 ? 6 : 10

  // 1. 生成完整离线物理轨迹
  const points = useMemo(() => {
    const pts = []
    const dt = 0.05
    for (let t = 0; t <= tMax; t += dt) {
      const motion = calculateElevatorMotion(modelIdx as 0 | 1, m, g, t)
      pts.push({
        t,
        a: motion.a,
        v: motion.v,
        y: motion.y,
        N: motion.N,
      })
    }
    return pts
  }, [modelIdx, m, g, tMax])

  // 2. 动态计算 Y 轴量程
  const limits = useMemo(() => {
    const a_vals = points.map((p) => p.a)
    const N_vals = points.map((p) => p.N)
    const v_vals = points.map((p) => p.v)

    const getLim = (vals: number[], padPercent = 0.1) => {
      let min = Math.min(...vals, 0)
      let max = Math.max(...vals, 1.0)
      const pad = (max - min) * padPercent || 1
      return { min: min - pad, max: max + pad }
    }

    return {
      a: getLim(a_vals),
      N: getLim(N_vals),
      v: getLim(v_vals),
    }
  }, [points])

  // 3. 当前时刻状态
  const currentState = useMemo(() => {
    return calculateElevatorMotion(modelIdx as 0 | 1, m, g, time)
  }, [modelIdx, m, g, time])

  const currentVals = {
    a: currentState.a,
    N: currentState.N,
    v: currentState.v,
  }

  const modelNames = ['升降变速电梯模型', '钢索断裂自由落体模型']

  return (
    <div className="w-full h-full flex flex-col gap-2.5 p-1">
      {/* 核心左右布局区域 */}
      <div className="w-full flex-1 min-h-0 flex flex-row gap-3">
        {/* 左侧：35% 宽度，电梯动画（高瘦型自适应） */}
        <div className="w-[35%] min-w-[200px] h-full bg-white rounded-xl shadow-md overflow-hidden relative border border-neutral-100 flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <WeightlessnessAnimation />
          </div>
          <div className="absolute top-2 right-3 text-[10px] text-neutral-400 font-semibold bg-white/80 px-2 py-0.5 rounded-full shadow-sm select-none">
            {modelNames[modelIdx]}
          </div>
        </div>

        {/* 右侧：65% 宽度，三图表垂直同轴叠放 */}
        <div className="flex-1 h-full flex flex-col gap-2 min-h-0">
          {/* a-t 图 */}
          <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2 border border-neutral-100 min-h-0">
            <MiniChart
              title="加速度 - 时间 (a-t)"
              t0={time}
              tMax={tMax}
              yMin={limits.a.min}
              yMax={limits.a.max}
              points={points}
              lines={[
                { key: 'a', color: PHYSICS_COLORS.acceleration, strokeWidth: 1.5, name: '加速度 a' },
              ]}
              yLabel="a(m/s²)"
              currentVals={currentVals}
            />
          </div>

          {/* N-t 图 (支持力) */}
          <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2 border border-neutral-100 min-h-0">
            <MiniChart
              title="支持力/视重 - 时间 (N-t)"
              t0={time}
              tMax={tMax}
              yMin={limits.N.min}
              yMax={limits.N.max}
              points={points}
              lines={[
                { key: 'N', color: PHYSICS_COLORS.normalForce, strokeWidth: 1.5, name: '支持力 N' },
              ]}
              staticLines={[
                { value: m * g, color: PHYSICS_COLORS.gravity, strokeDasharray: '3,2', name: '真实重力 G' },
              ]}
              yLabel="N(N)"
              currentVals={currentVals}
            />
          </div>

          {/* v-t 图 */}
          <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2 border border-neutral-100 min-h-0">
            <MiniChart
              title="速度 - 时间 (v-t)"
              t0={time}
              tMax={tMax}
              yMin={limits.v.min}
              yMax={limits.v.max}
              points={points}
              lines={[
                { key: 'v', color: PHYSICS_COLORS.velocity, strokeWidth: 1.5, name: '速度 v' },
              ]}
              yLabel="v(m/s)"
              currentVals={currentVals}
            />
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

