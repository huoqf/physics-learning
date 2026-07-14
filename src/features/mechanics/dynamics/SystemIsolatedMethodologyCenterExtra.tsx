import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { AnimationControls, MiniChart, Card } from '@/components/UI'
import SystemIsolatedMethodologyAnimation from './SystemIsolatedMethodologyAnimation'
import { useSystemIsolatedPhysics } from './hooks/useSystemIsolatedPhysics'

export default function SystemIsolatedMethodologyCenterExtra() {
  const { time, isPlaying, speed, setIsPlaying, setTime, setSpeed } = useAnimationStore(
    useShallow((s) => ({
      time: s.time,
      isPlaying: s.isPlaying,
      speed: s.speed,
      setIsPlaying: s.setIsPlaying,
      setTime: s.setTime,
      setSpeed: s.setSpeed,
    }))
  )

  const p = useSystemIsolatedPhysics()
  const {
    modelType,
    m1,
    m2,
    F,
    theta,
    mu,
    g,
    thetaRad,
    model0,
    model1,
    model2,
  } = p

  const tMax = 4.0
  const effectiveTime = Math.min(time, tMax)

  // 1. 图表一的数据集：v-t (速度 - 时间)
  const points = useMemo(() => {
    const pts = []
    const dt = 0.05
    for (let t = 0; t <= tMax; t += dt) {
      let v = 0
      if (modelType === 0) {
        // 拉车模型
        const maxTravel = 5.0
        const a = model0.a
        const t_end = a > 0 ? Math.sqrt((2 * maxTravel) / a) : 0
        v = a > 0 && t < t_end ? a * t : a > 0 ? a * t_end : 0
      } else if (modelType === 2) {
        // 下滑模型
        const slope_W = 3.6
        const L_slope = slope_W / Math.cos(thetaRad)
        const maxTravel = L_slope - 0.5
        const a = model2.a
        const t_end = a > 0 ? Math.sqrt((2 * maxTravel) / a) : 0
        v = a > 0 && t < t_end ? a * t : a > 0 ? a * t_end : 0
      }
      pts.push({ t, v })
    }
    return pts
  }, [modelType, model0.a, model2.a, thetaRad])

  // 当前速度计算
  const currentV = useMemo(() => {
    if (modelType === 0) {
      const maxTravel = 5.0
      const a = model0.a
      const t_end = a > 0 ? Math.sqrt((2 * maxTravel) / a) : 0
      return a > 0 && time < t_end ? a * time : a > 0 ? a * t_end : 0
    } else if (modelType === 2) {
      const slope_W = 3.6
      const L_slope = slope_W / Math.cos(thetaRad)
      const maxTravel = L_slope - 0.5
      const a = model2.a
      const t_end = a > 0 ? Math.sqrt((2 * maxTravel) / a) : 0
      return a > 0 && time < t_end ? a * time : a > 0 ? a * t_end : 0
    }
    return 0
  }, [modelType, model0.a, model2.a, thetaRad, time])

  // 最大速度估算
  const maxV = useMemo(() => {
    const maxInPts = Math.max(...points.map(p => p.v), 1.0)
    return maxInPts
  }, [points])

  // 2. 根据不同的高考情景，动态切换图表二
  const chartTwoProps = useMemo(() => {
    // ------------------ 模型 0: 拉车模型 ------------------
    if (modelType === 0) {
      // 探究绳张力 T 与摩擦系数 μ 的关系
      // 采样 mu 从 0 到 0.6
      const tMuPoints = []
      const steps = 30
      const totalMass = m1 + m2
      for (let i = 0; i <= steps; i++) {
        const curMu = (i / steps) * 0.6
        // 只要系统共同运动，T = m1*F/(m1+m2)。若不运动，这里也可以用该极限张力进行对比
        const curT = (m1 * F) / totalMass
        tMuPoints.push({ mu_val: curMu, T: curT })
      }
      return {
        title: '内力 T 与摩擦系数 μ 的关系',
        xMin: 0,
        xMax: 0.6,
        yMin: 0,
        yMax: Math.max(F * 1.2, 5),
        points: tMuPoints,
        lines: [{ key: 'T', color: PHYSICS_COLORS.tension, name: '绳内力 T' }],
        xKey: 'mu_val',
        xLabel: '摩擦系数 μ',
        yLabel: '张力 T(N)',
        currentVals: { T: model0.T } as Record<string, number>,
        currentXVal: mu,
        // 临界 μ 竖线
        staticLines: F / ((m1 + m2) * g) <= 0.6
          ? [{ value: F / ((m1 + m2) * g), color: PHYSICS_COLORS.friction, strokeDasharray: '3,3', name: `μ_临界` }]
          : [],
      }
    }

    // ------------------ 模型 1: 叠放静力学平衡 ------------------
    else if (modelType === 1) {
      // 探究地面摩擦力 f_地 与水平推力 F 的关系
      // 采样 F_val 从 0 到 30 N
      const fFPoints = []
      for (let fVal = 0; fVal <= 30; fVal += 1) {
        fFPoints.push({ F_val: fVal, f_ground: fVal })
      }
      return {
        title: '地面摩擦力 f_地 与推力 F 的关系',
        xMin: 0,
        xMax: 30,
        yMin: 0,
        yMax: 35,
        points: fFPoints,
        lines: [{ key: 'f_ground', color: PHYSICS_COLORS.friction, name: '地面静摩擦力' }],
        xKey: 'F_val',
        xLabel: '推力 F(N)',
        yLabel: 'f_地(N)',
        currentVals: { f_ground: model1.f_ground } as Record<string, number>,
        currentXVal: F,
      }
    }

    // ------------------ 模型 2: 系统牛二定律 (斜面下滑) ------------------
    else {
      // 探究地面支持力 N_地 随斜面倾角 θ 的非线性关系
      // 采样 theta_deg 从 0 到 90 度
      const nThetaPoints = []
      const totalMass = m1 + m2
      const N_static = totalMass * g // 静止时的地面总支持力

      for (let deg = 0; deg <= 90; deg += 2) {
        const rad = (deg * Math.PI) / 180
        const hasMotion = Math.sin(rad) > mu * Math.cos(rad)
        const a = hasMotion ? g * (Math.sin(rad) - mu * Math.cos(rad)) : 0
        const ay = a * Math.sin(rad)
        const N_val = totalMass * g - m1 * ay
        nThetaPoints.push({ deg_val: deg, N_ground: N_val })
      }

      return {
        title: '地面支持力 N_地 与倾角 θ 的关系 (失重探究)',
        xMin: 0,
        xMax: 90,
        yMin: 0,
        yMax: Math.round(N_static * 1.2),
        points: nThetaPoints,
        lines: [{ key: 'N_ground', color: PHYSICS_COLORS.normalForce, name: '支持力 N_地' }],
        xKey: 'deg_val',
        xLabel: '倾角 θ(°)',
        yLabel: '支持力 N(N)',
        currentVals: { N_ground: model2.N_ground } as Record<string, number>,
        currentXVal: theta,
        // 超失重平衡对照线：(M+m)g 
        staticLines: [
          { value: N_static, color: colors.neutral[400], strokeDasharray: '3,3', name: '(M+m)g' }
        ],
      }
    }
  }, [modelType, m1, m2, F, mu, g, theta, model0.T, model1.f_ground, model2.N_ground])

  return (
    <div className="w-full h-full flex flex-col gap-2.5 p-1">
      {/* 上下工作台分栏 (上方双图表并列，下方动画全宽跑道) */}
      <div className="w-full flex-1 min-h-0 flex flex-col gap-3">
        {/* 上方：双图表并列 (占据 45% 高度) */}
        <div className="w-full h-[45%] flex flex-row gap-3 min-h-0 shrink-0">
          {/* 图表一：速度-时间图 (v-t) */}
          <Card className="flex-1 overflow-hidden p-2 min-h-0">
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
              currentVals={{ v: currentV }}
              currentXVal={effectiveTime}
            />
          </Card>

          {/* 图表二：高考特色科研探究曲线 */}
          <Card className="flex-1 overflow-hidden p-2 min-h-0">
            <MiniChart {...chartTwoProps} />
          </Card>
        </div>

        {/* 下方：自适应满宽动画 */}
        <Card className="w-full flex-1 overflow-hidden relative flex flex-col min-h-0 bg-white shadow-inner">
          <div className="flex-1 min-h-0 relative">
            <SystemIsolatedMethodologyAnimation />
          </div>
        </Card>
      </div>

      {/* 底部动画控制栏 */}
      <Card className="w-full shrink-0 p-2 bg-white">
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
      </Card>
    </div>
  )
}
