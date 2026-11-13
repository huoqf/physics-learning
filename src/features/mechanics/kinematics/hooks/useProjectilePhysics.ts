import { useMemo } from 'react'
import { computeProjectileTimeline } from '@/physics/kinematics/trajectory'

export interface UseProjectilePhysicsParams {
  v0x: number
  g: number
  time: number
  height?: number
  modelMode?: number // 0: 基础, 1: 偏角分析, 2: 斜面平抛
  inclineAngle?: number // 斜面倾角 (度)
  airResistance?: number
}

export interface ProjectilePhysicsResult {
  groundTime: number
  range: number
  isLanded: number | boolean
  activeT: number
  x: number
  y: number // 以抛出点为 (0,0)，向下为负
  vx: number
  vy: number // 向下为负
  v: number
  tanAlpha: number
  tanTheta: number
  alphaDeg: number
  thetaDeg: number
  tangentMidpointX: number
  // 斜面平抛模型参数
  inclineLandingT: number
  inclineLandingX: number
  inclineLandingY: number
  inclinePerpendicularT: number
  inclineFarPointT: number
  // 轨迹点 (物理坐标)
  historyPoints: { x: number; y: number }[]
  predictedPoints: { x: number; y: number }[]
  tailPoints: { x: number; y: number }[]
}

/**
 * 平抛运动纯物理 Hook (零 DOM, 零 React-JSX, 零 Viewport)
 */
export function useProjectilePhysics({
  v0x = 10,
  g = 9.8,
  time = 0,
  height = 10,
  modelMode = 0,
  inclineAngle = 30,
  airResistance = 0,
}: UseProjectilePhysicsParams): ProjectilePhysicsResult {
  return useMemo(() => {
    const safeV0 = Math.max(v0x, 0.1)
    const safeG = Math.max(g, 0.1)
    const safeH = Math.max(height, 1)

    const {
      groundTime,
      inclineLandingT,
      inclinePerpendicularT,
      inclineFarPointT,
    } = computeProjectileTimeline({ v0x: safeV0, g: safeG, height: safeH, inclineAngle })
    const range = safeV0 * groundTime
    const inclineLandingX = safeV0 * inclineLandingT
    const inclineLandingY = -0.5 * safeG * inclineLandingT * inclineLandingT

    // 最大持续时间
    const maxProcessT = modelMode === 2 ? inclineLandingT : groundTime
    const isLanded = time >= maxProcessT && maxProcessT > 0
    const activeT = isLanded ? maxProcessT : Math.max(time, 0)

    // 当前物理位置与速度
    const x = safeV0 * activeT
    const y = -0.5 * safeG * activeT * activeT
    const vx = safeV0
    const vy = -safeG * activeT
    const v = Math.sqrt(vx * vx + vy * vy)

    // 偏角推导：tanAlpha = |y| / x, tanTheta = |vy| / vx
    const absY = Math.abs(y)
    const absVy = Math.abs(vy)
    const tanAlpha = x > 1e-4 ? absY / x : 0
    const tanTheta = vx > 1e-4 ? absVy / vx : 0
    const alphaDeg = (Math.atan(tanAlpha) * 180) / Math.PI
    const thetaDeg = (Math.atan(tanTheta) * 180) / Math.PI

    // 速度反向延长线与 x 轴的交点坐标
    const tangentMidpointX = 0.5 * x

    // 空气阻力标志
    if (airResistance > 0) {
      // 保留作为拓展参数
    }

    // 轨迹数据采样
    const sampleCount = 50
    const historyPoints: { x: number; y: number }[] = []
    const predictedPoints: { x: number; y: number }[] = []

    for (let i = 0; i <= sampleCount; i++) {
      const tSample = (i / sampleCount) * maxProcessT
      const px = safeV0 * tSample
      const py = -0.5 * safeG * tSample * tSample
      predictedPoints.push({ x: px, y: py })
      if (tSample <= activeT + 1e-5) {
        historyPoints.push({ x: px, y: py })
      }
    }

    const tailPoints = historyPoints.slice(-8)

    return {
      groundTime,
      range,
      isLanded,
      activeT,
      x,
      y,
      vx,
      vy,
      v,
      tanAlpha,
      tanTheta,
      alphaDeg,
      thetaDeg,
      tangentMidpointX,
      inclineLandingT,
      inclineLandingX,
      inclineLandingY,
      inclinePerpendicularT,
      inclineFarPointT,
      historyPoints,
      predictedPoints,
      tailPoints,
    }
  }, [v0x, g, time, height, modelMode, inclineAngle, airResistance])
}
