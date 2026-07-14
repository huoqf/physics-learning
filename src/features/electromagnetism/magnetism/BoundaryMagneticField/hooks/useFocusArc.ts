import { useMemo } from 'react'
import { ParticleState } from './useParticleState'

export interface ArcPoint {
  x: number
  y: number
  t: number
}

interface UseFocusArcParams {
  focusStateTOut: number
  tSlideIn: number
  v: number
  activeTheta: number
  getParticleState: (t: number, initX?: number, initY?: number, vVal?: number, thetaDeg?: number) => ParticleState
  toCanvasPixel: (wx: number, wy: number) => { px: number; py: number }
  progressTime: number
}

export function useFocusArc({
  focusStateTOut,
  tSlideIn,
  v,
  activeTheta,
  getParticleState,
  toCanvasPixel,
  progressTime,
}: UseFocusArcParams) {
  // 焦点粒子全程轨迹点集（入场前 + 磁场内偏转 + 出场后）
  const focusArcPredicted = useMemo(() => {
    const tStart = -tSlideIn
    const tEnd = focusStateTOut + tSlideIn
    const steps = 160
    const points: ArcPoint[] = []
    for (let i = 0; i <= steps; i++) {
      const t = tStart + (i / steps) * (tEnd - tStart)
      const state = getParticleState(t, 0, 0, v, activeTheta)
      const { px, py } = toCanvasPixel(state.px, state.py)
      points.push({ x: px, y: py, t })
    }
    return points
  }, [focusStateTOut, tSlideIn, v, activeTheta, getParticleState, toCanvasPixel])

  // 历史轨迹：按真实时间过滤全程点集
  const focusArcHistory = useMemo(() => {
    return focusArcPredicted.filter(p => p.t <= progressTime)
  }, [focusArcPredicted, progressTime])

  const focusArcTail = useMemo(() => {
    const tailLen = Math.min(20, focusArcHistory.length)
    return focusArcHistory.slice(-tailLen)
  }, [focusArcHistory])

  return { focusArcPredicted, focusArcHistory, focusArcTail }
}
