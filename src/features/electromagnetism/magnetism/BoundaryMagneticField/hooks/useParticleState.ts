import { useCallback } from 'react'
import {
  calcParticleRadius,
  calcParticlePeriod,
  calculateDoubleBoundaryExit,
  calculateCircularBoundaryExit,
} from '@/physics'

export interface ParticleState {
  px: number
  py: number
  vx: number
  vy: number
  tOut: number
  xOut: number
  yOut: number
  xc: number
  yc: number
  R: number
}

export function useParticleState(
  q: number,
  m: number,
  effectiveB: number,
  v: number,
  activeTheta: number,
  activeBoundaryType: number,
  d: number,
  Rb: number
) {
  const getParticleState = useCallback((
    tVal: number,
    initX: number = 0,
    initY: number = 0,
    vVal: number = v,
    thetaDeg: number = activeTheta
  ): ParticleState => {
    const thetaRad = (thetaDeg * Math.PI) / 180
    const signVal = (q * effectiveB) >= 0 ? 1 : -1
    const omega = Math.abs((q * effectiveB) / m)
    const Rp = calcParticleRadius(m, vVal, q, effectiveB)

    let tOutVal = 0
    let xOut = 0
    let yOut = 0
    let vxOut = 0
    let vyOut = 0

    if (activeBoundaryType === 0) {
      // 单边界
      // 偏转角：逆时针 2π-2θ（长弧），顺时针 2θ（短弧）
      const deltaPhi = signVal === 1 ? 2 * Math.PI - 2 * thetaRad : 2 * thetaRad
      const T = calcParticlePeriod(m, q, effectiveB)
      tOutVal = T > 0 ? (deltaPhi / (2 * Math.PI)) * T : 0

      const cxAngle = thetaRad + signVal * Math.PI / 2
      xOut = initX + 2 * Rp * Math.cos(cxAngle)
      yOut = 0
      // 出射速度方向统一为 -θ
      const exitAngle = -thetaRad
      vxOut = vVal * Math.cos(exitAngle)
      vyOut = vVal * Math.sin(exitAngle)
    } else if (activeBoundaryType === 1) {
      // 双平行边界
      const res = calculateDoubleBoundaryExit(q, m, vVal, effectiveB, thetaDeg, d)
      tOutVal = res.t
      xOut = initX + res.x
      yOut = res.y
      vxOut = res.vx
      vyOut = res.vy
    } else {
      // 圆形边界
      const res = calculateCircularBoundaryExit(q, m, vVal, effectiveB, Rb)
      tOutVal = res.t
      xOut = initX + res.x
      yOut = res.y
      vxOut = res.vx
      vyOut = res.vy
    }

    const cxAngle = thetaRad + signVal * Math.PI / 2
    const xc = initX + Rp * Math.cos(cxAngle)
    const yc = initY + Rp * Math.sin(cxAngle)
    const theta0 = Math.atan2(initY - yc, initX - xc)

    let px = 0
    let py = 0
    let vx = vVal * Math.cos(thetaRad)
    let vy = vVal * Math.sin(thetaRad)

    if (tVal < 0) {
      px = initX + vVal * tVal * Math.cos(thetaRad)
      py = initY + vVal * tVal * Math.sin(thetaRad)
    } else if (tVal <= tOutVal) {
      const curAngle = theta0 + signVal * omega * tVal
      px = xc + Rp * Math.cos(curAngle)
      py = yc + Rp * Math.sin(curAngle)
      const velocityAngle = curAngle + signVal * Math.PI / 2
      vx = vVal * Math.cos(velocityAngle)
      vy = vVal * Math.sin(velocityAngle)
    } else {
      const dt = tVal - tOutVal
      px = xOut + vxOut * dt
      py = yOut + vyOut * dt
      vx = vxOut
      vy = vyOut
    }

    return { px, py, vx, vy, tOut: tOutVal, xOut, yOut, xc, yc, R: Rp }
  }, [q, m, effectiveB, v, activeTheta, activeBoundaryType, d, Rb])

  return getParticleState
}
