import { useMemo } from 'react'

import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'
import type { Point } from '../components/inclineSceneUtils'
import type { SceneScale } from '@/scene'

import {
  getInclinedLayout,
  normalize,
  pointOnRail,
  clamp,
  EFFECTIVE_L,
} from '../components/inclineSceneUtils'

export interface UseInclinedAmpereSceneParams {
  physicsResult: AdvancedAmperePhysicsResult
  I: number
  B: number
  theta: number
  mu: number
  bFieldDir: number
}

export interface InclinedAmpereSceneComputed {
  layout: ReturnType<typeof getInclinedLayout>
  slopeUnit: Point
  normalUnit: Point
  rodRatio: number
  bPositiveUnit: Point
  bFieldLines: Point[]
  rodBack: Point
  rodFront: Point
  ampereDirection: Point | null
  ampereArrowLength: number
  motionSign: number
  localScale: SceneScale
  G_len: number
  N_len: number
  f_len: number
  f_sign: number
  Fnet_len: number
}

export const useInclinedAmpereScene = (
  params: UseInclinedAmpereSceneParams,
): InclinedAmpereSceneComputed => {
  const { physicsResult, B, theta, bFieldDir } = params

  const a = physicsResult.a
  const hasLimit = physicsResult.isLimited
  const hasField = Math.abs(B) > 1e-4

  const layout = useMemo(() => getInclinedLayout(EFFECTIVE_L, theta), [theta])
  const slopeUnit = useMemo(() => normalize({ x: layout.railDx, y: layout.railDy }), [layout.railDx, layout.railDy])
  const normalUnit = useMemo(() => normalize({ x: slopeUnit.y, y: -slopeUnit.x }), [slopeUnit])

  const tLimit = useMemo(() => {
    if (Math.abs(a) <= 0.05) return 0
    return Math.sqrt(2.2 / Math.abs(a))
  }, [a])

  const rodRatio = useMemo(() => {
    const xMin = -1.1
    const xMax = 1.1
    let baseRatio = clamp((physicsResult.x - xMin) / (xMax - xMin), 0, 1)

    if (hasLimit && Math.abs(a) > 0.05) {
      const vImpact = Math.abs(a) * tLimit
      const A = Math.min(0.04, vImpact * 0.008)
      const checkT = Math.max(0, Math.sin(physicsResult.x * 10) * 0.5)
      const bounce = A * Math.exp(-4.0 * checkT) * Math.cos(15.0 * checkT)

      if (a > 0) {
        baseRatio = 1.0 - Math.abs(bounce)
      } else {
        baseRatio = 0.0 + Math.abs(bounce)
      }
    }
    return baseRatio
  }, [physicsResult.x, hasLimit, a, tLimit])

  const bPositiveUnit = useMemo<Point>(() => {
    if (bFieldDir === 0) return { x: 0, y: -1 }
    if (bFieldDir === 1) return normalUnit
    return { x: 1, y: 0 }
  }, [bFieldDir, normalUnit])

  const bFieldLines = useMemo(() => {
    if (!hasField) return []
    const lines: Point[] = []
    const count = Math.max(2, Math.min(6, Math.floor(Math.abs(B) * 2.2) + 1))
    for (let i = 0; i < count; i++) {
      const kRail = count === 1 ? 0.5 : 0.2 + (0.6 * i) / (count - 1)
      const kFront = i % 2 === 0 ? 0.35 : 0.65
      const pBase = pointOnRail(layout, kRail, kFront)
      lines.push(pBase)
    }
    return lines
  }, [B, hasField, layout])

  const rodBack = pointOnRail(layout, rodRatio, 0)
  const rodFront = pointOnRail(layout, rodRatio, 1)

  const ampereDirection = useMemo<Point | null>(() => {
    const sign = Math.sign(physicsResult.F_ampere)
    if (sign === 0) return null
    if (bFieldDir === 0) return { x: sign, y: 0 }
    if (bFieldDir === 1) return { x: slopeUnit.x * sign, y: slopeUnit.y * sign }
    return { x: 0, y: -sign }
  }, [bFieldDir, physicsResult.F_ampere, slopeUnit])

  const ampereArrowLength = clamp(22 + Math.sqrt(Math.abs(physicsResult.F_ampere)) * 10, 24, 58)
  const motionSign = Math.sign(physicsResult.a)

  const localScale = useMemo<SceneScale>(() => {
    const cx = (rodBack.x + rodFront.x) / 2
    const cy = (rodBack.y + rodFront.y) / 2
    return {
      originX: cx,
      originY: cy,
      scaleX: 1,
      scaleY: 1,
      scale: 1,
      maxVectorLength: 60,
      refMagnitudes: { force: 2.0 },
    }
  }, [rodBack.x, rodBack.y, rodFront.x, rodFront.y])

  const gravityVal = 0.5 * 9.8
  const G_len = 45
  const N_len = clamp((physicsResult.N / gravityVal) * 45, 18, 65)
  const f_len = clamp((Math.abs(physicsResult.f) / gravityVal) * 45, 15, 60)
  const f_sign = Math.sign(physicsResult.f)
  const Fnet_len = clamp((Math.abs(physicsResult.R_parallel + physicsResult.f) / gravityVal) * 45, 20, 65)

  return {
    layout,
    slopeUnit,
    normalUnit,
    rodRatio,
    bPositiveUnit,
    bFieldLines,
    rodBack,
    rodFront,
    ampereDirection,
    ampereArrowLength,
    motionSign,
    localScale,
    G_len,
    N_len,
    f_len,
    f_sign,
    Fnet_len,
  }
}
