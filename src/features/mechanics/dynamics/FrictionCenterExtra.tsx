import { FC, useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { PHYSICS_COLORS, CHART_COLORS } from '@/theme/physics'
import { useAnimationStore } from '@/stores'
import { calculateFrictionPullModel, calculateDoubleFrictionIncline } from '@/physics'
import { GRAVITY } from '@/physics/constants'
import { MiniChart } from '@/components/UI'

export const FrictionCenterExtra: FC = () => {
  const [containerRef, canvasSize] = useCanvasSize({ width: 400, height: 200 })
  const params = useAnimationStore((s) => s.params)

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
    const f_max = 1.12 * mu * m * g
    const f_slip = mu * m * g
    const step = 0.5
    const limit = 45

    // 静摩擦递增段
    for (let F = 0; F < f_max; F += step) {
      data.push({ F, f: F })
    }
    // 精确的突变临界点前
    data.push({ F: f_max - 0.001, f: f_max })
    // 精确的突变临界点后
    data.push({ F: f_max + 0.001, f: f_slip })
    // 滑动摩擦段
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

    // 计算临界角
    const mu_1_static = 1.12 * mu_1
    const criticalAngleRad = Math.atan(mu_1_static)
    const criticalAngle = (criticalAngleRad * 180) / Math.PI

    for (let theta = 0; theta <= 90; theta += step) {
      // 临界段点集插值，展示明显的突跃
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

  // 动态图表纵轴上限计算
  const yMax = useMemo(() => {
    if (mode === 0) {
      const f_max = 1.12 * mu * m * g
      return Math.max(20, Math.ceil(f_max * 1.25))
    } else {
      const maxFVal = Math.max(m * g, M * g)
      return Math.max(15, Math.ceil(maxFVal * 1.15))
    }
  }, [mode, m, M, mu, g])

  return (
    <div ref={containerRef} className="w-full h-full p-2 border-b border-neutral-200/60 bg-neutral-50/50 flex items-center justify-center">
      {mode === 0 ? (
        <MiniChart
          title="f - F 关系图像"
          xMin={0}
          xMax={45}
          yMin={0}
          yMax={yMax}
          points={pullPoints}
          xKey="F"
          xLabel="外拉力 F (N)"
          yLabel="摩擦力 f (N)"
          lines={[
            { key: 'f', color: PHYSICS_COLORS.friction, name: '摩擦力 f' }
          ]}
          currentVals={{ f: pullResult.f_actual }}
          currentXVal={F_applied}
          staticLines={[
            { value: pullResult.f_max, color: CHART_COLORS.criticalPt, strokeDasharray: '3,3', name: '最大静摩擦力 f_max' }
          ]}
          minWidth={canvasSize.width - 24}
          minHeight={canvasSize.height - 24}
        />
      ) : (
        <MiniChart
          title="f - θ 关系图像 (双曲线)"
          xMin={0}
          xMax={90}
          yMin={0}
          yMax={yMax}
          points={inclinePoints}
          xKey="theta"
          xLabel="倾角 θ (°)"
          yLabel="摩擦力 f (N)"
          lines={[
            { key: 'f1', color: PHYSICS_COLORS.friction, name: '滑块摩擦力 f₁' },
            { key: 'f2', color: PHYSICS_COLORS.appliedForce, name: '地面摩擦力 f₂' }
          ]}
          currentVals={{ f1: inclineResult.f1, f2: inclineResult.f2 }}
          currentXVal={angle}
          minWidth={canvasSize.width - 24}
          minHeight={canvasSize.height - 24}
        />
      )}
    </div>
  )
}

export default FrictionCenterExtra
