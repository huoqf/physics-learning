import { useMemo, useCallback } from 'react'
import type { CanvasBounds, CanvasPoint } from '@/utils/coordinate'

/** 沿向量方向等比例缩短端点，使其不超出画布边界（已内联自 @/utils/coordinate） */
function clampEndpoint(raw: CanvasPoint, origin: CanvasPoint, bounds: CanvasBounds): CanvasPoint {
  const dx = raw.cx - origin.cx
  const dy = raw.cy - origin.cy
  if (dx === 0 && dy === 0) return raw

  let tMax = Infinity
  if (dx > 0) tMax = Math.min(tMax, (bounds.right - origin.cx) / dx)
  else if (dx < 0) tMax = Math.min(tMax, (bounds.left - origin.cx) / dx)
  if (dy > 0) tMax = Math.min(tMax, (bounds.bottom - origin.cy) / dy)
  else if (dy < 0) tMax = Math.min(tMax, (bounds.top - origin.cy) / dy)

  if (tMax >= 1) return raw

  return {
    cx: origin.cx + dx * tMax,
    cy: origin.cy + dy * tMax,
  }
}
import { useSceneScale } from '@/hooks/useSceneScale'
import type { SceneScale } from '@/scene'
import { GRAVITY } from '@/physics/constants'
import type { CanvasSize } from '@/utils'
import type { ViewportInfo } from '@/utils'

export interface EquilibriumLayoutParams {
  m: number
  brokenLine: string
  ballCenter: CanvasPoint
  triOrigin: CanvasPoint
  gEnd: CanvasPoint
  t1End: CanvasPoint
  t2End: CanvasPoint
  fNetEnd: CanvasPoint
  triGEnd: CanvasPoint
  triT1End: CanvasPoint
  triT2End: CanvasPoint
}

export interface EquilibriumLayoutData {
  vp: ViewportInfo
  font: (size: number) => number
  eqSceneScale: SceneScale
  centerX: number
  centerY: number
  gDisplayEnd: CanvasPoint
  t1DisplayEnd: CanvasPoint
  t2DisplayEnd: CanvasPoint
  fNetDisplayEnd: CanvasPoint
  t1xDisplayEnd: CanvasPoint
  t1yDisplayEnd: CanvasPoint
  t2xDisplayEnd: CanvasPoint
  t2yDisplayEnd: CanvasPoint
  triGDisplayEnd: CanvasPoint
  triT1DisplayEnd: CanvasPoint
  triT2DisplayEnd: CanvasPoint
  t1Mid: CanvasPoint
  t2Mid: CanvasPoint
  hasRope: boolean
  chartW: number
  chartH: number
  chartX0: number
  chartY0: number
  thetaToX: (thetaVal: number) => number
  tToY: (tVal: number) => number
  secantPathD: string
}

export function useEquilibriumLayout(
  params: EquilibriumLayoutParams,
  leftAnchor: CanvasPoint,
  rightAnchor: CanvasPoint,
  vp: ViewportInfo,
  canvasSize: CanvasSize,
): EquilibriumLayoutData {
  const { font } = canvasSize

  const eqSceneScale = useSceneScale({
    vp,
    preset: { width: canvasSize.width, height: canvasSize.height },
    anchor: 'custom',
    customOriginX: 0,
    customOriginY: 0,
    customScaleX: 1,
    customScaleY: 1,
    maxVectorLength: Math.min(vp.visibleW, vp.visibleH) * 0.3,
  })

  const centerX = vp.visibleW / 2
  const centerY = vp.visibleH / 2 - 45

  const { m, brokenLine, ballCenter, triOrigin, gEnd, t1End, t2End, fNetEnd, triGEnd, triT1End, triT2End } = params

  const canvasBounds: CanvasBounds = useMemo(() => ({
    left: 10,
    top: 10,
    right: vp.visibleW - 10,
    bottom: vp.visibleH - 10,
  }), [vp.visibleW, vp.visibleH])

  const gDisplayEnd = useMemo(() => clampEndpoint(gEnd, ballCenter, canvasBounds), [gEnd, ballCenter, canvasBounds])
  const t1DisplayEnd = useMemo(() => clampEndpoint(t1End, ballCenter, canvasBounds), [t1End, ballCenter, canvasBounds])
  const t2DisplayEnd = useMemo(() => clampEndpoint(t2End, ballCenter, canvasBounds), [t2End, ballCenter, canvasBounds])
  const fNetDisplayEnd = useMemo(() => clampEndpoint(fNetEnd, ballCenter, canvasBounds), [fNetEnd, ballCenter, canvasBounds])

  const t1xDisplayEnd = useMemo(() => ({ cx: t1DisplayEnd.cx, cy: ballCenter.cy }), [t1DisplayEnd, ballCenter])
  const t1yDisplayEnd = useMemo(() => ({ cx: ballCenter.cx, cy: t1DisplayEnd.cy }), [t1DisplayEnd, ballCenter])
  const t2xDisplayEnd = useMemo(() => ({ cx: t2DisplayEnd.cx, cy: ballCenter.cy }), [t2DisplayEnd, ballCenter])
  const t2yDisplayEnd = useMemo(() => ({ cx: ballCenter.cx, cy: t2DisplayEnd.cy }), [t2DisplayEnd, ballCenter])

  const triBounds: CanvasBounds = useMemo(() => ({
    left: triOrigin.cx - 100,
    top: triOrigin.cy - 20,
    right: Math.min(vp.visibleW - 10, triOrigin.cx + 185),
    bottom: Math.min(vp.visibleH - 10, triOrigin.cy + 140),
  }), [triOrigin, vp.visibleW, vp.visibleH])

  const triGDisplayEnd = useMemo(() => clampEndpoint(triGEnd, triOrigin, triBounds), [triGEnd, triOrigin, triBounds])
  const triT1DisplayEnd = useMemo(() => clampEndpoint(triT1End, triGEnd, triBounds), [triT1End, triGEnd, triBounds])
  const triT2DisplayEnd = useMemo(() => clampEndpoint(triT2End, triT1End, triBounds), [triT2End, triT1End, triBounds])

  const t1Mid = useMemo(() => ({ cx: (leftAnchor.cx + ballCenter.cx) / 2, cy: (leftAnchor.cy + ballCenter.cy) / 2 }), [leftAnchor, ballCenter])
  const t2Mid = useMemo(() => ({ cx: (rightAnchor.cx + ballCenter.cx) / 2, cy: (rightAnchor.cy + ballCenter.cy) / 2 }), [rightAnchor, ballCenter])

  const hasRope = brokenLine !== 'both'
  const chartW = Math.max(185, Math.min(220, vp.visibleW * 0.32))
  const chartH = Math.max(125, Math.min(150, vp.visibleH * 0.32))
  const chartX0 = vp.visibleW - chartW - 20
  const chartY0 = vp.visibleH - 30

  const thetaToX = useCallback((thetaVal: number) => chartX0 + ((thetaVal - 10) / 80) * chartW, [chartX0, chartW])
  const tToY = useCallback((tVal: number) => chartY0 - (tVal / 60) * chartH, [chartY0, chartH])

  const secantPathD = useMemo(() => {
    if (vp.visibleW <= 0) return ''
    const points: string[] = []
    for (let deg = 10; deg <= 90; deg += 2) {
      const rad = (deg * Math.PI) / 180
      const tVal = (m * GRAVITY) / (2 * Math.sin(rad))
      if (tVal <= 65) {
        points.push(`${thetaToX(deg)},${tToY(tVal)}`)
      }
    }
    return points.length > 0 ? `M ${points.join(' L ')}` : ''
  }, [vp.visibleW, m, thetaToX, tToY])

  return {
    vp,
    font,
    eqSceneScale,
    centerX,
    centerY,
    gDisplayEnd,
    t1DisplayEnd,
    t2DisplayEnd,
    fNetDisplayEnd,
    t1xDisplayEnd,
    t1yDisplayEnd,
    t2xDisplayEnd,
    t2yDisplayEnd,
    triGDisplayEnd,
    triT1DisplayEnd,
    triT2DisplayEnd,
    t1Mid,
    t2Mid,
    hasRope,
    chartW,
    chartH,
    chartX0,
    chartY0,
    thetaToX,
    tToY,
    secantPathD,
  }
}
