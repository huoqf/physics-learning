import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateThinLens, calculateConjugatePositions } from '@/physics/optics'
import type { ThinLensPhysicsResult, ChartPoint } from './types'

const V_MAX = 200

function clampInfinity(v: number): number {
  if (!isFinite(v)) return v > 0 ? V_MAX : -V_MAX
  return Math.abs(v) > V_MAX ? (v > 0 ? V_MAX : -V_MAX) : v
}

function buildLinearChartData(f_m: number): ChartPoint[] {
  const points: ChartPoint[] = []
  const uMin = f_m * 1.01
  const uMax = f_m * 4
  const steps = 80
  for (let i = 0; i <= steps; i++) {
    const u = uMin + ((uMax - uMin) * i) / steps
    const { v, valid } = calculateThinLens(f_m, u)
    if (!valid || !isFinite(v) || v < 0) continue
    const invU = 1 / u
    const invV = 1 / v
    if (invU > 0 && invV > 0) {
      points.push({ x: invU, y: invV })
    }
  }
  return points
}

function buildHyperbolaChartData(f_m: number): ChartPoint[] {
  const points: ChartPoint[] = []
  const uMin = f_m * 1.01
  const uMax = f_m * 4
  const steps = 80
  for (let i = 0; i <= steps; i++) {
    const u = uMin + ((uMax - uMin) * i) / steps
    const { v, valid } = calculateThinLens(f_m, u)
    if (!valid || !isFinite(v) || v < 0) continue
    points.push({ x: u, y: v })
  }
  return points
}

export function useThinLensPhysics(): ThinLensPhysicsResult {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )

  const mode = (params.mode ?? 0) as 0 | 1
  const isConcave = (params.isConcave ?? 0) === 1
  const f_cm = params.f ?? 10
  const u_cm = params.u ?? 30
  const L_cm = params.L ?? 50

  const f_m = f_cm / 100
  const u_m = u_cm / 100
  const L_m = L_cm / 100

  const effectiveF = isConcave ? -f_m : f_m

  const lens = useMemo(
    () => calculateThinLens(effectiveF, u_m),
    [effectiveF, u_m]
  )

  const v_clamped = clampInfinity(lens.v)

  const conjugate = useMemo(
    () => calculateConjugatePositions(L_m, f_m),
    [L_m, f_m]
  )

  const totalDistance = mode === 1 ? L_m : u_m + Math.abs(v_clamped)

  const chartData = useMemo(() => {
    if (mode === 0) return buildLinearChartData(f_m)
    return buildHyperbolaChartData(f_m)
  }, [mode, f_m])

  const currentChartPoint = useMemo((): ChartPoint => {
    if (mode === 0) {
      if (!isFinite(lens.v) || lens.v <= 0) return { x: 0, y: 0 }
      return { x: 1 / u_m, y: 1 / lens.v }
    }
    return { x: u_m, y: v_clamped }
  }, [mode, u_m, lens.v, v_clamped])

  return {
    v: v_clamped,
    m: lens.m,
    type: lens.type,
    valid: lens.valid,
    chartData,
    currentChartPoint,
    conjugate,
    totalDistance,
  }
}
