import { FC, useMemo } from 'react'
import { Card } from '@/components/UI'
import { RelationChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CHART_COLORS } from '@/theme/physics'
import { GRAVITY } from '@/physics/constants'
import { computeInclinedPlane } from '@/physics/inclined_plane'

/**
 * 斜面模型中屏右侧并列多图表区组件
 * 
 * 垂直并列展示：
 * 1. 摩擦力 - 倾角关系图 (Ff - θ 图)
 * 2. 加速度 - 倾角关系图 (a - θ 图)
 */
export const InclinedPlaneCenterExtra: FC = () => {
  const { params } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
    }))
  )

  const theta = params.theta ?? 30
  const mu = params.mu ?? 0.3
  const m = params.m ?? 2.0
  const g = GRAVITY

  // 物理临界状态计算
  const currentRes = computeInclinedPlane({ theta, mu, m, g })

  // 1. 摩擦力 Ff - 倾角 θ 的静态曲线采样点 (0° ~ 90°)
  const frictionPoints = useMemo(() => {
    const data: { x: number; y: number }[] = []
    const step = 0.5
    const crit = currentRes.criticalTheta

    for (let angle = 0; angle <= 90; angle += step) {
      // 在临界角两侧插入无限趋近的点以绘制出陡削的突跃拐点
      if (angle > crit - step && angle < crit) {
        const resMinus = computeInclinedPlane({ theta: crit - 0.001, mu, m, g })
        data.push({ x: crit - 0.001, y: resMinus.Ff })
        const resPlus = computeInclinedPlane({ theta: crit + 0.001, mu, m, g })
        data.push({ x: crit + 0.001, y: resPlus.Ff })
      }
      const res = computeInclinedPlane({ theta: angle, mu, m, g })
      data.push({ x: angle, y: res.Ff })
    }
    return data.sort((a, b) => a.x - b.x)
  }, [mu, m, g, currentRes.criticalTheta])

  // 2. 加速度 a - 倾角 θ 的静态曲线采样点 (0° ~ 90°)
  const accelPoints = useMemo(() => {
    const data: { x: number; y: number }[] = []
    const step = 0.5
    const crit = currentRes.criticalTheta

    for (let angle = 0; angle <= 90; angle += step) {
      if (angle > crit - step && angle < crit) {
        const resMinus = computeInclinedPlane({ theta: crit - 0.001, mu, m, g })
        data.push({ x: crit - 0.001, y: resMinus.accel })
        const resPlus = computeInclinedPlane({ theta: crit + 0.001, mu, m, g })
        data.push({ x: crit + 0.001, y: resPlus.accel })
      }
      const res = computeInclinedPlane({ theta: angle, mu, m, g })
      data.push({ x: angle, y: res.accel })
    }
    return data.sort((a, b) => a.x - b.x)
  }, [mu, m, g, currentRes.criticalTheta])

  // 动态确定力图表的 Y 轴量限，重力 mg 为基准
  const yMaxF = useMemo(() => {
    const weight = m * g
    return Math.max(10, Math.ceil(weight * 1.15))
  }, [m, g])

  return (
    <div className="w-full h-full flex flex-col gap-2 p-1 overflow-hidden">
      {/* 图表 1: 摩擦力 - 倾角关系图 */}
      <Card className="flex-1 min-h-0 p-2 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 w-full relative">
          <RelationChart
            title="摩擦力 - 倾角 (Ff - θ)"
            xLabel="倾角 θ (°)"
            yLabel="摩擦力 F_f (N)"
            xDomain={[0, 90]}
            yDomain={[0, yMaxF]}
            points={frictionPoints}
            cursorX={theta}
            cursorLabel={(x, y) => `θ=${x.toFixed(0)}°, Ff=${y.toFixed(1)}N`}
            markers={[
              {
                x: currentRes.criticalTheta,
                label: `θc = ${currentRes.criticalTheta.toFixed(1)}°`,
                color: CHART_COLORS.criticalPt,
              },
            ]}
            color={PHYSICS_COLORS.friction}
            mainLabel="摩擦力 F_f"
          />
        </div>
      </Card>

      {/* 图表 2: 加速度 - 倾角关系图 */}
      <Card className="flex-1 min-h-0 p-2 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 w-full relative">
          <RelationChart
            title="加速度 - 倾角 (a - θ)"
            xLabel="倾角 θ (°)"
            yLabel="加速度 a (m/s²)"
            xDomain={[0, 90]}
            yDomain={[0, 10]}
            points={accelPoints}
            cursorX={theta}
            cursorLabel={(x, y) => `θ=${x.toFixed(0)}°, a=${y.toFixed(1)}m/s²`}
            markers={[
              {
                x: currentRes.criticalTheta,
                label: `θc = ${currentRes.criticalTheta.toFixed(1)}°`,
                color: CHART_COLORS.criticalPt,
              },
            ]}
            color={PHYSICS_COLORS.appliedForce}
            mainLabel="加速度 a"
          />
        </div>
      </Card>
    </div>
  )
}

export default InclinedPlaneCenterExtra
