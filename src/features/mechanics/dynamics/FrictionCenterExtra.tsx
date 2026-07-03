import { FC, useMemo } from 'react'
import { PHYSICS_COLORS, CHART_COLORS } from '@/theme/physics'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateFrictionPullModel, calculateDoubleFrictionIncline } from '@/physics'
import { GRAVITY, DEFAULT_STATIC_FRICTION_RATIO } from '@/physics/constants'
import { AnimationControls, Card } from '@/components/UI'
import { RelationChart } from '@/components/Chart'
import FrictionAnimation from './FrictionAnimation'
import { useCanvasSize } from '@/utils'

export const FrictionCenterExtra: FC = () => {
  // 右侧图表容器大小监听，用于动态调整 MiniChart 大小
  const [chartContainerRef, chartSize] = useCanvasSize({ width: 400, height: 350 })

  const { params, time, isPlaying, speed, setIsPlaying, setTime, setSpeed } = useAnimationStore(
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

  const mode = params.mode ?? 0
  const m = params.m ?? 5
  const mu = params.mu ?? 0.3
  const g = params.g ?? GRAVITY
  const F_applied = params.F_applied ?? 15
  const angle = params.angle ?? 15
  const M = params.M ?? 10
  const mu_1 = params.mu_1 ?? 0.3
  const mu_2 = params.mu_2 ?? 0.2

  const pullResult = calculateFrictionPullModel(m, mu, F_applied, g)
  const inclineResult = calculateDoubleFrictionIncline({ m, M, theta: angle, mu_1, mu_2, g })

  // 1. 基础模式点集：外力 F 从 0 到 45 N
  const pullPoints = useMemo(() => {
    if (mode !== 0) return []
    const data = []
    const f_max = DEFAULT_STATIC_FRICTION_RATIO * mu * m * g
    const f_slip = mu * m * g
    const step = 0.5
    const limit = 45

    for (let F = 0; F < f_max; F += step) {
      data.push({ F, f: F })
    }
    data.push({ F: f_max - 0.001, f: f_max })
    data.push({ F: f_max + 0.001, f: f_slip })
    for (let F = f_max + 0.5; F <= limit; F += step) {
      data.push({ F, f: f_slip })
    }
    return data
  }, [mode, m, mu, g])

  // 2. 进阶模式点集：倾角 theta 从 0 到 90 度
  const inclinePoints = useMemo(() => {
    if (mode !== 1) return []
    const data = []
    const step = 1.0

    const mu_1_static = DEFAULT_STATIC_FRICTION_RATIO * mu_1
    const criticalAngleRad = Math.atan(mu_1_static)
    const criticalAngle = (criticalAngleRad * 180) / Math.PI

    for (let theta = 0; theta <= 90; theta += step) {
      if (theta > criticalAngle - step && theta < criticalAngle) {
        const resMinus = calculateDoubleFrictionIncline({ m, M, theta: criticalAngle - 0.001, mu_1, mu_2, g })
        data.push({ theta: criticalAngle - 0.001, f1: resMinus.f1, f2: resMinus.f2 })

        const resPlus = calculateDoubleFrictionIncline({ m, M, theta: criticalAngle + 0.001, mu_1, mu_2, g })
        data.push({ theta: criticalAngle + 0.001, f1: resPlus.f1, f2: resPlus.f2 })
      }
      const res = calculateDoubleFrictionIncline({ m, M, theta, mu_1, mu_2, g })
      data.push({ theta, f1: res.f1, f2: res.f2 })
    }
    return data.sort((a, b) => a.theta - b.theta)
  }, [mode, m, M, mu_1, mu_2, g])

  const yMax = useMemo(() => {
    if (mode === 0) {
      const f_max = DEFAULT_STATIC_FRICTION_RATIO * mu * m * g
      return Math.max(20, Math.ceil(f_max * 1.25))
    } else {
      const maxFVal = Math.max(m * g, M * g)
      return Math.max(15, Math.ceil(maxFVal * 1.15))
    }
  }, [mode, m, M, mu, g])

  return (
    <div className="w-full h-full flex flex-col gap-3 p-1 overflow-hidden">
      {/* 上半部分：动画与图表并列 */}
      <div className="w-full flex-1 min-h-0 flex flex-row gap-3">
        {/* 左侧：动画区 */}
        <Card className="flex-1 min-w-0 overflow-hidden relative">
          <FrictionAnimation />
        </Card>

        {/* 右侧：图表区 */}
        <div ref={chartContainerRef} className="flex-1 min-w-0">
        <Card className="h-full overflow-hidden p-2 flex items-center justify-center">
          {mode === 0 ? (
            <RelationChart
              title="f - F 关系图像"
              xLabel="外拉力 F (N)"
              yLabel="摩擦力 f (N)"
              xDomain={[0, 45]}
              yDomain={[0, yMax]}
              points={pullPoints.map((p) => ({ x: p.F, y: p.f }))}
              cursorX={F_applied}
              markers={[
                { y: pullResult.f_max, label: `f_max = ${pullResult.f_max.toFixed(1)}N`, color: CHART_COLORS.criticalPt },
                { x: pullResult.f_max, label: `F = f_max`, color: CHART_COLORS.reference }
              ]}
              color={PHYSICS_COLORS.friction}
              mainLabel="摩擦力 f"
              initialSize={{ width: chartSize.width - 16, height: chartSize.height - 16 }}
            />
          ) : (
            <RelationChart
              title="f - θ 关系图像 (双曲线)"
              xLabel="倾角 θ (°)"
              yLabel="摩擦力 f (N)"
              xDomain={[0, 90]}
              yDomain={[0, yMax]}
              points={inclinePoints.map((p) => ({ x: p.theta, y: p.f1 }))}
              cursorX={angle}
              markers={[
                { x: inclineResult.criticalAngle, label: `θc = ${inclineResult.criticalAngle.toFixed(1)}°`, color: CHART_COLORS.criticalPt }
              ]}
              additionalSeries={[
                { points: inclinePoints.map((p) => ({ x: p.theta, y: p.f2 })), color: PHYSICS_COLORS.appliedForce, label: '地面摩擦力 f₂' }
              ]}
              color={PHYSICS_COLORS.friction}
              mainLabel="滑块摩擦力 f₁"
              initialSize={{ width: chartSize.width - 16, height: chartSize.height - 16 }}
            />
          )}
        </Card>
        </div>
      </div>

      {/* 下半部分：通栏控制条 */}
      <Card className="w-full shrink-0 p-2">
        <AnimationControls
          isPlaying={isPlaying}
          speed={speed}
          time={time}
          maxTime={30}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onReset={() => setTime(0)}
          onSpeedChange={setSpeed}
          onTimeChange={setTime}
          controlsMode="param"
        />
      </Card>
    </div>
  )
}

export default FrictionCenterExtra
