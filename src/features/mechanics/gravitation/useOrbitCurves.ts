import { useMemo } from 'react'
import { GRAVITATIONAL_CONSTANT, EARTH_MASS } from '@/physics/constants'
import { LAYOUT } from './satelliteLayout'

export function useOrbitCurves() {
  const v_max_val = Math.sqrt(GRAVITATIONAL_CONSTANT * EARTH_MASS / (LAYOUT.mode0.rMin * 1e6))
  const T_max_val = 2 * Math.PI * Math.pow(LAYOUT.mode0.rMax * 1e6, 1.5) / Math.sqrt(GRAVITATIONAL_CONSTANT * EARTH_MASS)

  const vrPoints = useMemo(() => {
    const steps = 30
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i <= steps; i++) {
      const curR_Mm = LAYOUT.mode0.rMin + (i / steps) * (LAYOUT.mode0.rMax - LAYOUT.mode0.rMin)
      const curV = Math.sqrt(GRAVITATIONAL_CONSTANT * EARTH_MASS / (curR_Mm * 1e6))
      pts.push({ x: curR_Mm, y: curV / v_max_val })
    }
    return pts
  }, [v_max_val])

  const trPoints = useMemo(() => {
    const steps = 30
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i <= steps; i++) {
      const curR_Mm = LAYOUT.mode0.rMin + (i / steps) * (LAYOUT.mode0.rMax - LAYOUT.mode0.rMin)
      const curT = 2 * Math.PI * Math.pow(curR_Mm * 1e6, 1.5) / Math.sqrt(GRAVITATIONAL_CONSTANT * EARTH_MASS)
      pts.push({ x: curR_Mm, y: curT / T_max_val })
    }
    return pts
  }, [T_max_val])

  return { vrPoints, trPoints, v_max_val, T_max_val }
}
