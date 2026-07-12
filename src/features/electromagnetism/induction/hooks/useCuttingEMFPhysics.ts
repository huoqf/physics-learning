import { useMemo } from 'react'
import { computeRodConstants, computeRodStateAtTime, calculateCuttingEMF } from '@/physics'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import type { CanvasPreset } from '@/hooks/useAnimationViewport'

const X_LIMIT = 10.0

export interface CuttingEMFParams {
  mode: number
  B: number
  L: number
  v: number
  R: number
  F_ext: number
  m: number
}

export interface CuttingEMFPhysicsResult {
  finalX: number
  finalV: number
  finalA: number
  finalFamp: number
  finalI: number
  EMF_current: number
  hasHitLimit: boolean
  B_out: number
  absB: number
  ampForceX: number
  extForceX: number
  v_m: number
  tau: number
  a_0: number
  railLeftPos: { x: number; y: number }
  railRightPos: { x: number; y: number }
  rodPos: { x: number; y: number }
  railSpacing: number
  railLength: number
  railCx: number
  railCy: number
  sceneScale: SceneScale
  T_max: number
  samplePoints: Array<{ t: number; v: number; a: number }>
  vtPoints: Array<{ t: number; v: number }>
  vYMax: number
  aYMax: number
  chartHeight: number
  sceneHeight: number
  chartW: number
  chartH: number
}

export function useCuttingEMFPhysics(
  params: CuttingEMFParams,
  sceneScale: SceneScale,
  preset: CanvasPreset,
  font: (v: number) => number,
  time: number,
): CuttingEMFPhysicsResult {
  const { mode, B, L, v, R, F_ext, m } = params

  const B_out = B < 0 ? 1 : 0
  const absB = Math.abs(B)

  const chartHeight = font(210)
  const sceneHeight = Math.floor((preset.height - font(16)) / 2)

  const { terminalVelocity: v_m, timeConstant: tau, initialAcceleration: a_0 } = useMemo(
    () => computeRodConstants(absB, L, R, m, F_ext),
    [absB, L, R, m, F_ext]
  )

  let x_current = 0
  let v_current = 0
  let a_current = 0
  let F_amp_current = 0
  let I_current = 0
  let EMF_current = 0

  if (mode === 0) {
    v_current = v
    a_current = 0
    if (v >= 0) {
      x_current = v * time
    } else {
      x_current = X_LIMIT + v * time
    }
    const res = calculateCuttingEMF(absB, L, v_current, R, 90, 0, B_out)
    EMF_current = res.EMF
    I_current = res.I
    F_amp_current = res.F_ampere
  } else {
    const res = computeRodStateAtTime(time, absB, L, R, m, F_ext)
    x_current = res.x
    v_current = res.v
    a_current = res.a
    F_amp_current = res.F_amp
    const dirFactor = B_out === 0 ? 1 : -1
    EMF_current = absB * L * v_current * dirFactor
    I_current = R > 0 ? EMF_current / R : 0
  }

  const hasHitLimit = v_current >= 0 ? x_current >= X_LIMIT : x_current <= 0
  const finalX = Math.max(0, Math.min(X_LIMIT, x_current))
  const finalV = hasHitLimit ? 0 : v_current
  const finalA = hasHitLimit ? 0 : a_current
  const finalFamp = hasHitLimit ? 0 : Math.abs(F_amp_current)
  const finalI = hasHitLimit ? 0 : I_current

  const ampForceX = finalV > 0 ? -finalFamp : (finalV < 0 ? finalFamp : 0)
  const extForceX = mode === 1 ? F_ext : (finalV > 0 ? finalFamp : (finalV < 0 ? -finalFamp : 0))

  // 使用 worldToDesign 将物理坐标转为设计坐标
  const railLeftDesign = worldToDesign(0, 0, sceneScale)
  const railRightDesign = worldToDesign(X_LIMIT, 0, sceneScale)
  const rodDesign = worldToDesign(finalX, 0, sceneScale)

  // 对轨距进行视觉放大（物理计算 L 保持规范米制不变）
  const railSpacing = L * sceneScale.scale * 1.2
  const railLength = railRightDesign.px - railLeftDesign.px
  const railCx = (railLeftDesign.px + railRightDesign.px) / 2
  const railCy = railLeftDesign.py

  const T_max = mode === 0 ? 5.0 : Math.max(5.0, Math.min(20.0, 4 * tau))

  const samplePoints = useMemo(() => {
    const pts = []
    const count = 60
    for (let i = 0; i <= count; i++) {
      const tVal = (i / count) * T_max
      let vVal = 0
      let aVal = 0
      if (mode === 0) {
        vVal = v
        aVal = 0
      } else {
        const exp = Math.exp(-tVal / tau)
        vVal = v_m * (1 - exp)
        aVal = a_0 * exp
      }
      pts.push({ t: tVal, v: vVal, a: aVal })
    }
    return pts
  }, [mode, T_max, v, v_m, a_0, tau])

  const vtPoints = useMemo(
    () => samplePoints.map((p) => ({ t: p.t, v: p.v })),
    [samplePoints]
  )

  const vYMax = mode === 0 ? Math.max(1.0, Math.abs(v)) * 1.2 : v_m * 1.2
  const aYMax = mode === 0 ? 1.0 : a_0 * 1.2

  const chartW = (preset.width - font(24)) / 2
  const chartH = chartHeight - font(12)

  return {
    finalX, finalV, finalA, finalFamp, finalI, EMF_current,
    hasHitLimit, B_out, absB,
    ampForceX, extForceX,
    v_m, tau, a_0,
    railLeftPos: { x: railLeftDesign.px, y: railLeftDesign.py },
    railRightPos: { x: railRightDesign.px, y: railRightDesign.py },
    rodPos: { x: rodDesign.px, y: rodDesign.py },
    railSpacing, railLength, railCx, railCy,
    sceneScale,
    T_max, samplePoints, vtPoints, vYMax, aYMax,
    chartHeight, sceneHeight, chartW, chartH,
  }
}
