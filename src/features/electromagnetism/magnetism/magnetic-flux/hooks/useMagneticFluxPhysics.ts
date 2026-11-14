import { useMemo } from 'react'
import {
  computeBFieldRatioExperiment,
  computeMagneticFluxState,
  type BFieldRatioResult,
  type MagneticFluxResult,
} from '@/physics'

export interface UseMagneticFluxPhysicsOptions {
  mode: number
  chartAxis: number
  B: number
  I: number
  L: number
  thetaIB: number
  S: number
  thetaNormal: number
  showProjGuide: number
  showNormalVec: number
}

export interface MagneticFluxPhysicsResult {
  mode: number
  chartAxis: number
  showProjGuide: boolean
  showNormalVec: boolean
  ratioExp: BFieldRatioResult
  fluxState: MagneticFluxResult
}

/**
 * 磁感应强度与磁通量物理计算 Hook。
 * 复用物理层纯函数，保证场景与右屏看板单一真源（SSOT）。
 */
export function useMagneticFluxPhysics({
  mode,
  chartAxis,
  B,
  I,
  L,
  thetaIB,
  S,
  thetaNormal,
  showProjGuide,
  showNormalVec,
}: UseMagneticFluxPhysicsOptions): MagneticFluxPhysicsResult {
  return useMemo(() => {
    const ratioExp = computeBFieldRatioExperiment({
      B,
      I,
      L,
      thetaIB,
      chartAxis,
    })
    const fluxState = computeMagneticFluxState({
      B,
      S,
      thetaNormal,
    })
    return {
      mode,
      chartAxis,
      showProjGuide: showProjGuide !== 0,
      showNormalVec: showNormalVec !== 0,
      ratioExp,
      fluxState,
    }
  }, [mode, chartAxis, B, I, L, thetaIB, S, thetaNormal, showProjGuide, showNormalVec])
}
