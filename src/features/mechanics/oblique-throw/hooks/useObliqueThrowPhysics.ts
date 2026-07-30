import { useMemo, useRef, useEffect } from 'react'
import { precomputeObliqueThrowWithDrag } from '@/physics'
import { interpolateTrajectoryPoint } from '@/utils/trajectory'
import type { ObliqueThrowTrajectoryPoint } from '@/physics'

export interface UseObliqueThrowPhysicsParams {
  v0: number          // 初速度 m/s
  angle: number       // 抛射角 (°)
  g: number           // 重力加速度 m/s²
  time: number        // 演播时间 s
  airResistance?: number // 空气阻力系数 k
  advancedMode?: number // 0: 基础模式, 1: 进阶模式
}

export interface ObliqueThrowPhysicsResult {
  // 当前真实物理状态
  x: number           // 水平位置 m (y↑正)
  y: number           // 竖直高度 m
  vx: number          // 水平速度 m/s
  vy: number          // 竖直速度 m/s
  v: number           // 合速度 m/s
  ax: number          // 水平加速度 m/s²
  ay: number          // 竖直加速度 m/s²
  speedAngleDeg: number // 速度偏角 (°)
  dispAngleDeg: number  // 位移偏角 (°)

  // 真空对比物理状态 (当有空气阻力时)
  vacPhys?: ObliqueThrowTrajectoryPoint

  // 全程特征物理量
  groundTime: number  // 落地时间 s
  maxHeight: number   // 最大高度 m
  range: number       // 水平射程 m
  topTime: number     // 顶点时间 s
  topX: number        // 顶点水平坐标 m
  topY: number        // 顶点高度 m
  v0x: number         // 初速度水平分量 m/s
  v0y: number         // 初速度竖直分量 m/s
  isLanded: boolean   // 是否已落地
  activeTime: number  // 有效运行时间 s

  // 轨迹点 (用于 ParticleTrajectory)
  historyPoints: { x: number; y: number }[]
  predictedPoints: { x: number; y: number }[]
  vacPredictedPoints?: { x: number; y: number }[]
  prevPredictedPoints?: { x: number; y: number }[] // 上一次参数留痕轨迹

  // v-t 图表数据
  vtChartData: {
    pointsVx: { t: number; v: number }[]
    domainVx: { t: number; v: number }[]
    pointsVy: { t: number; v: number }[]
    domainVy: { t: number; v: number }[]
  }
}

/**
 * 纯斜抛运动物理计算 Hook
 * @param params 运动参数
 */
export function useObliqueThrowPhysics({
  v0,
  angle,
  g,
  time,
  airResistance = 0,
  advancedMode = 0,
}: UseObliqueThrowPhysicsParams): ObliqueThrowPhysicsResult {
  // 保存上一次轨迹用于参量改变时的轨迹留痕对比
  const prevTrajectoryRef = useRef<{ x: number; y: number }[] | undefined>(undefined)
  const lastParamKeyRef = useRef<string>('')

  const paramKey = `${v0}-${angle}-${g}-${airResistance}-${advancedMode}`

  const currentResult = useMemo(() => {
    const k = advancedMode === 1 ? Math.max(0, airResistance) : 0
    const trajectory = precomputeObliqueThrowWithDrag(v0, angle, g, k)

    const { points, vacuumPoints, groundTime, maxHeight, range, groundTimeVac } = trajectory
    const isLanded = time >= groundTime && groundTime > 0
    const activeTime = isLanded ? groundTime : Math.max(time, 0)

    // 当前点的计算
    const currentPt = interpolateTrajectoryPoint(points, activeTime)
    const vacPt = k > 0 ? interpolateTrajectoryPoint(vacuumPoints, Math.min(activeTime, groundTimeVac)) : undefined

    // 初速度分量
    const angleRad = (angle * Math.PI) / 180
    const v0x = v0 * Math.cos(angleRad)
    const v0y = v0 * Math.sin(angleRad)

    // 最高点特征
    const topTime = g > 0 ? v0y / g : 0
    const topX = v0x * topTime
    const topY = g > 0 ? (v0y * v0y) / (2 * g) : 0

    // 偏角计算
    const speedAngleDeg = (Math.atan2(currentPt.vy, currentPt.vx) * 180) / Math.PI
    const dispAngleDeg = currentPt.x > 1e-4 ? (Math.atan2(currentPt.y, currentPt.x) * 180) / Math.PI : angle

    // 轨迹拟合点转换为物理坐标点 ({ x, y })
    const historyPoints = points
      .filter((pt) => pt.t <= activeTime + 1e-5)
      .map((pt) => ({ x: pt.x, y: Math.max(0, pt.y) }))

    const predictedPoints = points.map((pt) => ({ x: pt.x, y: Math.max(0, pt.y) }))
    const vacPredictedPoints = k > 0 ? vacuumPoints.map((pt) => ({ x: pt.x, y: Math.max(0, pt.y) })) : undefined

    // v-t 图表数据构建
    const sampleSteps = 50
    const domainVx: { t: number; v: number }[] = []
    const domainVy: { t: number; v: number }[] = []
    const pointsVx: { t: number; v: number }[] = []
    const pointsVy: { t: number; v: number }[] = []

    for (let i = 0; i <= sampleSteps; i++) {
      const sampleT = (i / sampleSteps) * groundTime
      const pt = interpolateTrajectoryPoint(points, sampleT)
      domainVx.push({ t: sampleT, v: pt.vx })
      domainVy.push({ t: sampleT, v: pt.vy })
      if (sampleT <= activeTime + 1e-5) {
        pointsVx.push({ t: sampleT, v: pt.vx })
        pointsVy.push({ t: sampleT, v: pt.vy })
      }
    }

    return {
      x: currentPt.x,
      y: Math.max(0, currentPt.y),
      vx: currentPt.vx,
      vy: currentPt.vy,
      v: currentPt.v,
      ax: currentPt.ax,
      ay: currentPt.ay,
      speedAngleDeg,
      dispAngleDeg,
      vacPhys: vacPt,
      groundTime,
      maxHeight,
      range,
      topTime,
      topX,
      topY,
      v0x,
      v0y,
      isLanded,
      activeTime,
      historyPoints,
      predictedPoints,
      vacPredictedPoints,
      vtChartData: {
        pointsVx,
        domainVx,
        pointsVy,
        domainVy,
      },
    }
  }, [v0, angle, g, time, airResistance, advancedMode])

  useEffect(() => {
    if (lastParamKeyRef.current && lastParamKeyRef.current !== paramKey) {
      // 记录上一次轨迹
      prevTrajectoryRef.current = currentResult.predictedPoints
    }
    lastParamKeyRef.current = paramKey
  }, [paramKey, currentResult.predictedPoints])

  return {
    ...currentResult,
    prevPredictedPoints: prevTrajectoryRef.current,
  }
}
