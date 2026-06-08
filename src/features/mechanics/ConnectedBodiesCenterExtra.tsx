import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS } from '@/theme/physics'
import { AnimationControls, MiniChart } from '@/components/UI'
import { calculateConnectedBody, GRAVITY } from '@/physics'
import ConnectedBodiesAnimation from './ConnectedBodiesAnimation'

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
