import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS } from '@/theme/physics'
import { calculateNewtonSecondVariableMotion } from '@/physics'
import { AnimationControls, MiniChart } from '@/components/UI'
import NewtonSecondAnimation from './NewtonSecondAnimation'

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
            xMin={0}
            xMax={tMax}
            yMin={limits.F.min}
            yMax={limits.F.max}
            points={points}
            lines={[
              { key: 'F_applied', color: PHYSICS_COLORS.appliedForce, name: '拉力 F' },
              { key: 'f', color: PHYSICS_COLORS.friction, strokeDasharray: '2,1', name: '阻力 f' },
              { key: 'F_net', color: PHYSICS_COLORS.forceNet, strokeWidth: 1.2, name: '合外力 F合' },
            ]}
            xLabel="t(s)"
            yLabel="力(N)"
            currentVals={currentVals}
            currentXVal={time}
          />
        </div>

        {/* a-t 图像 */}
        <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2 border border-neutral-100">
          <MiniChart
            title="加速度 - 时间 (a-t)"
            xMin={0}
            xMax={tMax}
            yMin={limits.a.min}
            yMax={limits.a.max}
            points={points}
            lines={[
              { key: 'a', color: PHYSICS_COLORS.acceleration, strokeWidth: 1.2, name: '加速度 a' },
            ]}
            xLabel="t(s)"
            yLabel="a(m/s²)"
            currentVals={currentVals}
            currentXVal={time}
          />
        </div>

        {/* v-t 图像 */}
        <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2 border border-neutral-100">
          <MiniChart
            title="速度 - 时间 (v-t)"
            xMin={0}
            xMax={tMax}
            yMin={limits.v.min}
            yMax={limits.v.max}
            points={points}
            lines={[
              { key: 'v', color: PHYSICS_COLORS.velocity, strokeWidth: 1.2, name: '速度 v' },
            ]}
            xLabel="t(s)"
            yLabel="v(m/s)"
            currentVals={currentVals}
            currentXVal={time}
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
