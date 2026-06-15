import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS } from '@/theme/physics'
import { calculateElevatorMotion } from '@/physics'
import { AnimationControls, MiniChart } from '@/components/UI'
import WeightlessnessAnimation from './WeightlessnessAnimation'
import { useCanvasSize } from '@/utils'

export default function WeightlessnessCenterExtra() {
    const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 400 })
    const { font } = canvasSize
    const {params, time, isPlaying, speed, setIsPlaying, setTime, setSpeed} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    isPlaying: s.isPlaying,
    speed: s.speed,
    setIsPlaying: s.setIsPlaying,
    setTime: s.setTime,
    setSpeed: s.setSpeed,
    }))
  )

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
    <div ref={containerRef} className="w-full h-full flex flex-col gap-2.5 p-1">
      {/* 核心左右布局区域 */}
      <div className="w-full flex-1 min-h-0 flex flex-row gap-3">
        {/* 左侧：35% 宽度，电梯动画（高瘦型自适应） */}
        <div className="w-[35%] min-w-[200px] h-full bg-white rounded-xl shadow-sm overflow-hidden relative border border-neutral-100 flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <WeightlessnessAnimation />
          </div>
          <div style={{ fontSize: font(10) }} className="absolute top-2 right-3 text-neutral-400 font-semibold bg-white/80 px-2 py-0.5 rounded-full shadow-sm select-none">
            {modelNames[modelIdx]}
          </div>
        </div>

        {/* 右侧：65% 宽度，三图表垂直同轴叠放 */}
        <div className="flex-1 h-full flex flex-col gap-2 min-h-0">
          {/* a-t 图 */}
          <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden p-2 border border-neutral-100 min-h-0">
            <MiniChart
              title="加速度 - 时间 (a-t)"
              xMin={0}
              xMax={tMax}
              yMin={limits.a.min}
              yMax={limits.a.max}
              points={points}
              lines={[
                { key: 'a', color: PHYSICS_COLORS.acceleration, strokeWidth: 1.5, name: '加速度 a' },
              ]}
              xLabel="t(s)"
              yLabel="a(m/s²)"
              currentVals={currentVals}
              currentXVal={time}
            />
          </div>

          {/* N-t 图 (支持力) */}
          <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden p-2 border border-neutral-100 min-h-0">
            <MiniChart
              title="支持力/视重 - 时间 (N-t)"
              xMin={0}
              xMax={tMax}
              yMin={limits.N.min}
              yMax={limits.N.max}
              points={points}
              lines={[
                { key: 'N', color: PHYSICS_COLORS.normalForce, strokeWidth: 1.5, name: '支持力 N' },
              ]}
              staticLines={[
                { value: m * g, color: PHYSICS_COLORS.gravity, strokeDasharray: '3,2', name: '真实重力 G' },
              ]}
              xLabel="t(s)"
              yLabel="N(N)"
              currentVals={currentVals}
              currentXVal={time}
            />
          </div>

          {/* v-t 图 */}
          <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden p-2 border border-neutral-100 min-h-0">
            <MiniChart
              title="速度 - 时间 (v-t)"
              xMin={0}
              xMax={tMax}
              yMin={limits.v.min}
              yMax={limits.v.max}
              points={points}
              lines={[
                { key: 'v', color: PHYSICS_COLORS.velocity, strokeWidth: 1.5, name: '速度 v' },
              ]}
              xLabel="t(s)"
              yLabel="v(m/s)"
              currentVals={currentVals}
              currentXVal={time}
            />
          </div>
        </div>
      </div>

      {/* 底部动画控制栏 */}
      <div className="w-full shrink-0 bg-white rounded-xl shadow-sm p-2 border border-neutral-100">
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

