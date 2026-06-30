import { useMemo } from 'react'
import { MT_LAYOUT } from '../components/constants'
import {
  calculateFallVelocity,
  calculateAverageImpactForce,
  calculateCollisionTime,
  calculateFluidImpactForce,
} from '@/physics/momentumTheorem'
import type { ViewportInfo } from '@/utils/useViewport'

interface MomentumLayoutParams {
  params: {
    m?: number
    h?: number
    k?: number
    rho?: number
    S?: number
    v_fluid?: number
    alpha?: number
    advancedMode?: number
  }
  time: number
  vp: ViewportInfo
}

export function useMomentumTheoremLayout({ params, time, vp }: MomentumLayoutParams) {
  const {
    m = 2,
    h = 2,
    k = 5,
    rho = 1000,
    S = 0.01,
    v_fluid = 5,
    alpha = 0,
    advancedMode = 0,
  } = params

  const isAdvanced = advancedMode === 1

  // 基础模式计算
  const fallV = calculateFallVelocity(h, MT_LAYOUT.g)
  const collisionDt = calculateCollisionTime(m, k)
  const F_avg = calculateAverageImpactForce(m, fallV, collisionDt, MT_LAYOUT.g)

  const fallTime = Math.sqrt((2 * h) / MT_LAYOUT.g)
  const totalTime = fallTime + collisionDt * 2

  const currentT = time % (totalTime + 1)
  let phase: 'falling' | 'compressing' | 'recovering' | 'done' = 'falling'
  let cushionCompression = 0

  const R_ball = MT_LAYOUT.ballBaseRadius + m * MT_LAYOUT.massRadiusScale
  const cushionTopY = -MT_LAYOUT.cushionHeight
  const ballRestY = cushionTopY - R_ball
  let ballY = 0

  if (currentT < fallTime) {
    phase = 'falling'
    const dy = 0.5 * MT_LAYOUT.g * currentT * currentT
    ballY = ballRestY - h * MT_LAYOUT.fallScale + dy * MT_LAYOUT.fallScale
  } else if (currentT < fallTime + collisionDt) {
    phase = 'compressing'
    const dt = currentT - fallTime
    const ratio = dt / collisionDt
    cushionCompression = ratio * MT_LAYOUT.cushionMaxCompression
    ballY = ballRestY + cushionCompression
  } else if (currentT < fallTime + collisionDt * 2) {
    phase = 'recovering'
    const dt = currentT - fallTime - collisionDt
    const ratio = 1 - dt / collisionDt
    cushionCompression = ratio * MT_LAYOUT.cushionMaxCompression
    ballY = ballRestY + cushionCompression
  } else {
    phase = 'done'
    ballY = ballRestY
    cushionCompression = 0
  }

  const F_max = F_avg * 2

  const basicFtPointsAll = useMemo(() => {
    return [
      { x: 0, y: 0 },
      { x: fallTime, y: 0 },
      { x: fallTime + collisionDt, y: F_max },
      { x: fallTime + collisionDt * 2, y: 0 },
      { x: totalTime, y: 0 },
    ]
  }, [fallTime, collisionDt, F_max, totalTime])

  const basicFtPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    if (currentT <= fallTime) {
      pts.push({ x: 0, y: 0 })
      pts.push({ x: currentT, y: 0 })
    } else if (currentT <= fallTime + collisionDt) {
      const curF = F_max * ((currentT - fallTime) / collisionDt)
      pts.push({ x: 0, y: 0 })
      pts.push({ x: fallTime, y: 0 })
      pts.push({ x: currentT, y: curF })
    } else if (currentT <= fallTime + collisionDt * 2) {
      const curF = F_max * (1 - (currentT - fallTime - collisionDt) / collisionDt)
      pts.push({ x: 0, y: 0 })
      pts.push({ x: fallTime, y: 0 })
      pts.push({ x: fallTime + collisionDt, y: F_max })
      pts.push({ x: currentT, y: curF })
    } else {
      pts.push({ x: 0, y: 0 })
      pts.push({ x: fallTime, y: 0 })
      pts.push({ x: fallTime + collisionDt, y: F_max })
      pts.push({ x: fallTime + collisionDt * 2, y: 0 })
      pts.push({ x: Math.min(currentT, totalTime), y: 0 })
    }
    return pts
  }, [fallTime, collisionDt, F_max, currentT, totalTime])

  const basicVtPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    if (currentT <= fallTime) {
      pts.push({ x: 0, y: 0 })
      pts.push({ x: currentT, y: -currentT * MT_LAYOUT.g })
    } else if (currentT <= fallTime + collisionDt * 2) {
      const dt = currentT - fallTime
      const curV = -fallV + (fallV / collisionDt) * dt
      pts.push({ x: 0, y: 0 })
      pts.push({ x: fallTime, y: -fallV })
      pts.push({ x: currentT, y: curV })
    } else {
      pts.push({ x: 0, y: 0 })
      pts.push({ x: fallTime, y: -fallV })
      pts.push({ x: fallTime + collisionDt * 2, y: fallV })
      pts.push({ x: Math.min(currentT, totalTime), y: fallV })
    }
    return pts
  }, [fallTime, collisionDt, fallV, currentT, totalTime])

  // 进阶模式计算
  const impactForce = calculateFluidImpactForce(rho, S, v_fluid, alpha)

  const plateX = vp.visibleX + vp.visibleW * 0.72
  const nozzleX = vp.visibleX + vp.visibleW * 0.22

  const maxSpringCompression = 25
  const maxForceRef = rho * 0.05 * 10 * 10 * 2
  const springCompression = Math.min(
    (impactForce / maxForceRef) * maxSpringCompression,
    maxSpringCompression
  )

  const { barWidth, dm } = useMemo(() => {
    const dtWindow = 0.15
    const tGap = 0.6 / v_fluid
    const smoothCount = dtWindow / tGap
    const massPerParticle = v_fluid * 0.05
    const totalDm = smoothCount * massPerParticle

    const maxBarW = 160
    const barW = Math.min(maxBarW, (totalDm / 1.25) * maxBarW)

    return {
      barWidth: barW,
      dm: totalDm,
    }
  }, [v_fluid])

  const sScale = Math.sqrt(S / 0.01)
  const nozzleHeight = Math.max(20, Math.min(40, 32 * sScale))
  const fluidHeight = Math.max(14, Math.min(28, 26 * sScale))

  const advancedXMax = 5
  const currentT_adv = time % advancedXMax

  const advancedFtPointsAll = useMemo(() => {
    return [
      { x: 0, y: impactForce },
      { x: advancedXMax, y: impactForce },
    ]
  }, [impactForce, advancedXMax])

  const advancedFtPoints = useMemo(() => {
    return [
      { x: 0, y: impactForce },
      { x: currentT_adv, y: impactForce },
    ]
  }, [impactForce, currentT_adv])

  const advancedPtPoints = useMemo(() => {
    return [
      { x: 0, y: 0 },
      { x: currentT_adv, y: impactForce * currentT_adv },
    ]
  }, [impactForce, currentT_adv])

  return {
    isAdvanced,
    m, h, k, rho, S, v_fluid, alpha,
    fallV, collisionDt, F_avg, fallTime, totalTime, currentT,
    phase, cushionCompression, R_ball, cushionTopY, ballRestY, ballY, F_max,
    basicFtPointsAll, basicFtPoints, basicVtPoints,
    impactForce, plateX, nozzleX, springCompression,
    barWidth, dm, nozzleHeight, fluidHeight,
    advancedXMax, currentT_adv, advancedFtPointsAll, advancedFtPoints, advancedPtPoints
  }
}
