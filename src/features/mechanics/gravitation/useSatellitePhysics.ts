import { useMemo } from 'react'
import { EARTH_MASS, EARTH_RADIUS, GRAVITATIONAL_CONSTANT } from '@/physics/constants'
import { LAYOUT } from './satelliteLayout'

interface LaunchResult {
  crashed: boolean
  phase: 'liftoff' | 'gravityTurn' | 'orbit'
  theta: number
  r_phys: number
  satAngle: number
  orbitPoints: [number, number][]
  velocityDir?: { x: number; y: number }
  r0: number
  v_c: number
  e: number
  p: number
  h: number
  isFarOrigin: boolean
  alpha: number
}

export function useLaunchPhysics({ mode, v0, isLaunched, time }: { mode: number; v0: number; isLaunched: number; time: number }) {
  return useMemo((): LaunchResult => {
    if (mode !== 1) return null as unknown as LaunchResult

    const r0 = LAYOUT.mode1.rLaunchRatio * EARTH_RADIUS
    const v0_m = v0 * 1000
    const v_c = Math.sqrt(GRAVITATIONAL_CONSTANT * EARTH_MASS / r0)
    const alpha = (r0 * v0_m * v0_m) / (GRAVITATIONAL_CONSTANT * EARTH_MASS)
    const e = Math.abs(alpha - 1)
    const isFarOrigin = v0_m < v_c
    const p = isFarOrigin ? r0 * (1 - e) : r0 * (1 + e)
    const h = r0 * v0_m
    const orbitEntryAngle = LAYOUT.mode1.orbitEndAngle

    if (isLaunched === 0) {
      return { crashed: false, phase: 'liftoff', theta: 0, r_phys: EARTH_RADIUS, satAngle: 0, orbitPoints: [], r0, v_c, e, p, h, isFarOrigin, alpha }
    }

    let phase: 'liftoff' | 'gravityTurn' | 'orbit' = 'liftoff'
    let r_phys = EARTH_RADIUS
    let theta = 0
    let satAngle = 0
    let crashed = false
    let crashTheta = 0

    const t_animation = time
    const entryT = LAYOUT.mode1.orbitEntryTime

    if (t_animation < LAYOUT.mode1.launchDuration) {
      phase = 'liftoff'
      const progress = t_animation / LAYOUT.mode1.launchDuration
      const eased = progress * progress * (3 - 2 * progress)
      r_phys = EARTH_RADIUS + eased * (r0 - EARTH_RADIUS)
      theta = 0
      satAngle = 0
    } else if (t_animation < entryT) {
      phase = 'gravityTurn'
      const progress = (t_animation - LAYOUT.mode1.launchDuration) / LAYOUT.mode1.turnDuration
      const eased = 1 - Math.pow(1 - progress, 2)
      theta = orbitEntryAngle * eased
      r_phys = r0
      satAngle = -Math.PI / 2 - (Math.PI / 2) * eased
    } else {
      phase = 'orbit'
      const orbitTime = (t_animation - entryT) * LAYOUT.mode1.timeScale
      theta = orbitEntryAngle
      let simT = 0
      const maxPhysicsTime = LAYOUT.mode1.maxPhysicsTime
      const minDt = 0.001
      const maxDt = 0.05
      let dt = 0.005

      while (simT < orbitTime && simT < maxPhysicsTime) {
        const curR = isFarOrigin
          ? p / (1 - e * Math.cos(theta - orbitEntryAngle))
          : p / (1 + e * Math.cos(theta - orbitEntryAngle))
        if (curR < EARTH_RADIUS * 0.99) { crashed = true; crashTheta = theta; break }
        const rRatio = curR / r0
        if (rRatio < 0.5) dt = Math.max(minDt, dt * 0.5)
        else if (rRatio > 1.5) dt = Math.min(maxDt, dt * 1.05)
        theta += (h / (curR * curR)) * dt
        simT += dt
      }

      r_phys = crashed ? EARTH_RADIUS : isFarOrigin
        ? p / (1 - e * Math.cos(theta - orbitEntryAngle))
        : p / (1 + e * Math.cos(theta - orbitEntryAngle))
      satAngle = crashed ? crashTheta : theta
    }

    const orbitPoints: [number, number][] = []
    const orbitSteps = 240
    const maxTheta = v0_m >= Math.sqrt(2 * GRAVITATIONAL_CONSTANT * EARTH_MASS / r0)
      ? Math.PI * 0.85 : Math.PI * 4.0

    for (let i = 0; i <= orbitSteps; i++) {
      const thetaOffset = -maxTheta + (i / orbitSteps) * (2 * maxTheta)
      const curR = isFarOrigin
        ? p / (1 - e * Math.cos(thetaOffset))
        : p / (1 + e * Math.cos(thetaOffset))
      if (curR >= EARTH_RADIUS * 0.98) orbitPoints.push([orbitEntryAngle + thetaOffset, curR])
    }

    const finalTheta = crashed ? crashTheta : theta
    const deltaAngle = finalTheta - orbitEntryAngle
    let vRadial: number
    let vTangential: number
    if (isFarOrigin) {
      vRadial = -(h * e * Math.sin(deltaAngle)) / p
      vTangential = (h / p) * (1 - e * Math.cos(deltaAngle))
    } else {
      vRadial = (h * e * Math.sin(deltaAngle)) / p
      vTangential = (h / p) * (1 + e * Math.cos(deltaAngle))
    }
    const velDirX = vRadial * Math.cos(finalTheta) - vTangential * Math.sin(finalTheta)
    const velDirY = vRadial * Math.sin(finalTheta) + vTangential * Math.cos(finalTheta)
    const velMag = Math.sqrt(velDirX * velDirX + velDirY * velDirY)
    const velocityDir = velMag > 0 ? { x: velDirX / velMag, y: velDirY / velMag } : { x: 0, y: 1 }

    return { crashed, phase, theta: finalTheta, r_phys, satAngle, orbitPoints, velocityDir, r0, v_c, e, p, h, isFarOrigin, alpha }
  }, [mode, v0, isLaunched, time])
}

export function useVtSampling({ mode, v0 }: { mode: number; v0: number }) {
  return useMemo(() => {
    if (mode !== 1) return []
    const pts: [number, number][] = []
    const steps = 120
    const r0 = LAYOUT.mode1.rLaunchRatio * EARTH_RADIUS
    const v0_m = v0 * 1000
    const v_c = Math.sqrt(GRAVITATIONAL_CONSTANT * EARTH_MASS / r0)
    const alpha = (r0 * v0_m * v0_m) / (GRAVITATIONAL_CONSTANT * EARTH_MASS)
    const e = Math.abs(alpha - 1)
    const isFarOrigin = v0_m < v_c
    const p = isFarOrigin ? r0 * (1 - e) : r0 * (1 + e)
    const h = r0 * v0_m
    const orbitEntryAngle = LAYOUT.mode1.orbitEndAngle
    const entryT = LAYOUT.mode1.orbitEntryTime

    for (let i = 0; i <= steps; i++) {
      const t_sim = (i / steps) * 15
      let v_val = 0
      if (t_sim < entryT) {
        v_val = v0 * (t_sim / entryT)
      } else {
        let theta = orbitEntryAngle
        let simT = 0
        const timeScale = LAYOUT.mode1.timeScale
        const targetT = (t_sim - entryT) * timeScale
        const maxPhysicsTime = LAYOUT.mode1.maxPhysicsTime
        const minDt = 0.001
        const maxDt = 0.05
        let dt = 0.005
        let crashed = false

        while (simT < targetT && simT < maxPhysicsTime) {
          const curR = isFarOrigin
            ? p / (1 - e * Math.cos(theta - orbitEntryAngle))
            : p / (1 + e * Math.cos(theta - orbitEntryAngle))
          if (curR < EARTH_RADIUS * 0.99) { crashed = true; break }
          const rRatio = curR / r0
          if (rRatio < 0.5) dt = Math.max(minDt, dt * 0.5)
          else if (rRatio > 1.5) dt = Math.min(maxDt, dt * 1.05)
          theta += (h / (curR * curR)) * dt
          simT += dt
        }

        if (!crashed) {
          const curR = isFarOrigin
            ? p / (1 - e * Math.cos(theta - orbitEntryAngle))
            : p / (1 + e * Math.cos(theta - orbitEntryAngle))
          const v_sq = v0_m * v0_m + 2 * GRAVITATIONAL_CONSTANT * EARTH_MASS * (1 / curR - 1 / r0)
          v_val = v_sq > 0 ? Math.sqrt(v_sq) / 1000 : 0
        } else {
          v_val = 0
        }
      }
      pts.push([t_sim, v_val])
    }
    return pts
  }, [mode, v0])
}
