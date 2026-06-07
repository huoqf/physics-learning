import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { calculateNewtonSecondVariableMotion } from '@/physics'
import { AnimationControls } from '@/components/UI'
import NewtonSecondAnimation from './NewtonSecondAnimation'

interface MiniChartProps {
  title: string
  t0: number
  tMax: number
  yMin: number
  yMax: number
  points: any[]
  lines: {
    key: string
    color: string
    strokeWidth?: number
    strokeDasharray?: string
    name: string
  }[]
  yLabel: string
  currentVals: Record<string, number>
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
}: MiniChartProps) {
  const margin = { left: 18, right: 6, top: 15, bottom: 15 }
  const plotW = 100 - margin.left - margin.right
  const plotH = 100 - margin.top - margin.bottom

  const toSvgX = (t: number) => margin.left + (t / tMax) * plotW
  const toSvgY = (val: number) => {
    const range = yMax - yMin || 1
    return margin.top + plotH - ((val - yMin) / range) * plotH
  }

  // 过滤出到当前时刻的轨迹点
  const visiblePoints = useMemo(() => {
    return points.filter((p) => p.t <= t0 + 1e-9)
  }, [points, t0])

  const px = toSvgX(Math.min(t0, tMax))

  const fs = 5.2
  const sfs = 4.2

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* 标题与图例 */}
      <text x={margin.left} y={margin.top - 6} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
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
            strokeWidth={0.3}
            opacity={0.5}
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
            strokeWidth={0.3}
            opacity={0.5}
          />
        )
      })}

      {/* 坐标轴线 */}
      <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.5} />
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.5} />

      {/* 零刻度虚线 */}
      {yMin < 0 && yMax > 0 && (
        <line
          x1={margin.left}
          y1={toSvgY(0)}
          x2={margin.left + plotW}
          y2={toSvgY(0)}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={0.35}
          strokeDasharray="1,1"
          opacity={0.5}
        />
      )}

      {/* x轴刻度 (0到10s) */}
      {Array.from({ length: 6 }, (_, i) => {
        const t = (tMax * i) / 5
        const x = toSvgX(t)
        return (
          <g key={`xt-${i}`}>
            <line x1={x} y1={margin.top + plotH} x2={x} y2={margin.top + plotH + 1.5} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.4} />
            <text x={x} y={margin.top + plotH + sfs + 1.5} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontFamily="monospace">
              {t.toFixed(0)}
            </text>
          </g>
        )
      })}

      {/* y轴最大/最小刻度 */}
      {[yMin, (yMin + yMax) / 2, yMax].map((val, idx) => {
        const y = toSvgY(val)
        return (
          <g key={`yt-${idx}`}>
            <line x1={margin.left - 1.5} y1={y} x2={margin.left} y2={y} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.4} />
            <text x={margin.left - 2.5} y={y + sfs * 0.35} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">
              {val.toFixed(1)}
            </text>
          </g>
        )
      })}

      {/* 绘制数据曲线 */}
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
              strokeWidth={line.strokeWidth ?? 0.8}
              strokeDasharray={line.strokeDasharray}
            />
          )
        })}

      {/* 游标和当前数值点 */}
      {t0 <= tMax && (
        <g>
          {/* 时间垂直指示线 */}
          <line
            x1={px}
            y1={margin.top}
            x2={px}
            y2={margin.top + plotH}
            stroke={PHYSICS_COLORS.labelTextLight}
            strokeWidth={0.4}
            strokeDasharray="1.5,1.5"
            opacity={0.4}
          />
          {/* 曲线上的焦点 */}
          {lines.map((line) => {
            const currentVal = currentVals[line.key] ?? 0
            const py = toSvgY(currentVal)
            return (
              <g key={`point-${line.key}`}>
                <circle cx={px} cy={py} r={2} fill={line.color} opacity={0.3} />
                <circle cx={px} cy={py} r={1.2} fill={line.color} stroke={colors.neutral[0]} strokeWidth={0.4} />
              </g>
            )
          })}
        </g>
      )}

      {/* 标注与图例 */}
      <text x={margin.left + plotW - 4} y={margin.top + plotH + sfs + 1.5} fontSize={sfs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
        t(s)
      </text>
      <text x={margin.left - 2} y={margin.top - 6} fontSize={sfs} fill={PHYSICS_COLORS.labelText} textAnchor="end" fontWeight="bold">
        {yLabel}
      </text>

      {/* 曲线图例 */}
      <g transform={`translate(${margin.left + 2}, ${margin.top + 3})`}>
        {lines.map((line, idx) => {
          const currentVal = currentVals[line.key] ?? 0
          return (
            <g key={`legend-${line.key}`} transform={`translate(0, ${idx * 6})`}>
              <line x1={0} y1={-2} x2={6} y2={-2} stroke={line.color} strokeWidth={1} strokeDasharray={line.strokeDasharray} />
              <text x={8} y={1} fontSize={sfs - 0.5} fill={PHYSICS_COLORS.labelTextLight}>
                {line.name}: {currentVal.toFixed(2)}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

export default function NewtonSecondCenterExtra() {
  const { params, time, isPlaying, speed, setIsPlaying, setTime, setSpeed } = useAnimationStore()

  const {
    m = 2,
    mu = 0,
    k = 2,
    F0 = 15,
    omega = 1.5,
    modelIdx = 0,
  } = params

  const tMax = 10

  // 1. 生成 10s 内的完整离线轨迹
  const points = useMemo(() => {
    const pts = []
    const dt = 0.05
    for (let t = 0; t <= tMax; t += dt) {
      const motion = calculateNewtonSecondVariableMotion(
        modelIdx as 0 | 1,
        { m, mu, k, F0, omega },
        t
      )
      pts.push({
        t,
        F_applied: motion.F_applied,
        f: motion.f,
        F_net: motion.F_net,
        a: motion.a,
        v: motion.v,
        s: motion.s,
      })
    }
    return pts
  }, [modelIdx, m, mu, k, F0, omega])

  // 2. 动态计算 Y 轴量程
  const limits = useMemo(() => {
    const F_vals = points.map((p) => p.F_applied).concat(points.map((p) => p.f)).concat(points.map((p) => p.F_net))
    const a_vals = points.map((p) => p.a)
    const v_vals = points.map((p) => p.v)

    const getLim = (vals: number[], padPercent = 0.1) => {
      let min = Math.min(...vals, 0)
      let max = Math.max(...vals, 1.0)
      const pad = (max - min) * padPercent || 1
      return { min: min - pad, max: max + pad }
    }

    return {
      F: getLim(F_vals),
      a: getLim(a_vals),
      v: getLim(v_vals),
    }
  }, [points])

  // 3. 计算当前时刻的物理状态
  const currentState = useMemo(() => {
    return calculateNewtonSecondVariableMotion(
      modelIdx as 0 | 1,
      { m, mu, k, F0, omega },
      time
    )
  }, [modelIdx, m, mu, k, F0, omega, time])

  const currentVals = {
    F_applied: currentState.F_applied,
    f: currentState.f,
    F_net: currentState.F_net,
    a: currentState.a,
    v: currentState.v,
    s: currentState.s,
  }

  // 变力模型名称
  const modelNames = ['线性递增力模型 F=k·t', '正弦周期力模型 F=F₀sin(ωt)']

  return (
    <div className="w-full h-full flex flex-col gap-2.5 p-1">
      {/* 顶部图表展示区 */}
      <div className="w-full flex-1 min-h-0 flex flex-row gap-3">
        {/* F-t 图像 */}
        <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2 border border-neutral-100">
          <MiniChart
            title="力 - 时间 (F-t)"
            t0={time}
            tMax={tMax}
            yMin={limits.F.min}
            yMax={limits.F.max}
            points={points}
            lines={[
              { key: 'F_applied', color: PHYSICS_COLORS.appliedForce, name: '拉力 F' },
              { key: 'f', color: PHYSICS_COLORS.friction, strokeDasharray: '2,1', name: '阻力 f' },
              { key: 'F_net', color: PHYSICS_COLORS.forceNet, strokeWidth: 1.2, name: '合外力 F合' },
            ]}
            yLabel="力(N)"
            currentVals={currentVals}
          />
        </div>

        {/* a-t 图像 */}
        <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2 border border-neutral-100">
          <MiniChart
            title="加速度 - 时间 (a-t)"
            t0={time}
            tMax={tMax}
            yMin={limits.a.min}
            yMax={limits.a.max}
            points={points}
            lines={[
              { key: 'a', color: PHYSICS_COLORS.acceleration, strokeWidth: 1.2, name: '加速度 a' },
            ]}
            yLabel="a(m/s²)"
            currentVals={currentVals}
          />
        </div>

        {/* v-t 图像 */}
        <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2 border border-neutral-100">
          <MiniChart
            title="速度 - 时间 (v-t)"
            t0={time}
            tMax={tMax}
            yMin={limits.v.min}
            yMax={limits.v.max}
            points={points}
            lines={[
              { key: 'v', color: PHYSICS_COLORS.velocity, strokeWidth: 1.2, name: '速度 v' },
            ]}
            yLabel="v(m/s)"
            currentVals={currentVals}
          />
        </div>
      </div>

      {/* 中部小车动画区 */}
      <div className="w-full h-[180px] shrink-0 bg-white rounded-xl shadow-md overflow-hidden relative border border-neutral-100">
        <NewtonSecondAnimation />
        <div className="absolute top-2 right-3 text-[10px] text-neutral-400 font-semibold bg-white/80 px-2 py-0.5 rounded-full shadow-sm">
          {modelNames[modelIdx]}
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
