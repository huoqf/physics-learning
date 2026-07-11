import { useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateCircularMotion } from '@/physics'
import type { ViewportInfo } from '@/utils'
import type { SceneScale } from '@/scene'
import { createSceneScaleFromDesignCenter } from '@/scene'

export const CENTRIPETAL_PARAM_BOUNDS = {
  rMin: 3, rMax: 5,
  vMin: 1, vMax: 10,
  mMin: 1, mMax: 5,
} as const

export const CENTRIPETAL_CHART_RANGE = {
  vMax: CENTRIPETAL_PARAM_BOUNDS.vMax,
  aMax: CENTRIPETAL_PARAM_BOUNDS.vMax ** 2 / CENTRIPETAL_PARAM_BOUNDS.rMin,
  fMax: CENTRIPETAL_PARAM_BOUNDS.mMax * (CENTRIPETAL_PARAM_BOUNDS.vMax ** 2 / CENTRIPETAL_PARAM_BOUNDS.rMin),
} as const

export const CENTRIPETAL_LAYOUT = {
  rMax: CENTRIPETAL_PARAM_BOUNDS.rMax,
  canvasPadding: 80,
  steelBallBaseRadius: 12,
  massRadiusScale: 1.5,
  waveCardMinWidth: 260,
  waveCardMinHeight: 180,
  waveCardRightOffset: 20,
  waveCardPadding: { left: 40, right: 15, top: 25, bottom: 25 },
  gridLayers: 4,
  gridAngleStep: 30,
  axisExtension: 30,
} as const

// Design coordinate constants (CANVAS_PRESETS.square = 650×650)
const DESIGN_W = 650
const DESIGN_H = 650
const DESIGN_CX = DESIGN_W / 2
const DESIGN_CY = DESIGN_H / 2

export interface CentripetalPhysicsResult {
  params: {
    r: number; v: number; m: number
    showAcceleration: number; showWaveform: number
    showVectors: boolean
  }
  time: number
  showFaCard: boolean

  omega: number
  a_c: number
  F_c: number
  x: number
  y: number

  vp: ViewportInfo
  centerX: number
  centerY: number
  scale: number
  ballPos: { cx: number; cy: number }
  cardWidth: number
  cardHeight: number
  cardX: number
  cardY: number
  cardInnerPad: typeof CENTRIPETAL_LAYOUT.waveCardPadding
  cardInnerW: number

  sceneScale: SceneScale

  faPoints: Array<{ x: number; y: number }>

  handleContainerMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  handleContainerMouseUp: () => void
  handleChartMouseDown: (e: React.MouseEvent) => void
}

export function useCentripetalPhysics(
  vp: ViewportInfo,
  _containerRef: React.RefObject<HTMLDivElement | null>,
): CentripetalPhysicsResult {
  const { params, time, showVectors, setIsPlaying, updateParam } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      setIsPlaying: s.setIsPlaying,
      updateParam: s.updateParam,
    }))
  )

  const {
    r = 3,
    v = 3,
    m = 1,
    showWaveform = 1,
    showAcceleration = 1,
  } = params

  const showFaCard = showWaveform === 1

  const omega = v / r
  const a_c = (v * v) / r
  const F_c = m * a_c

  const basicMotion = useMemo(() => {
    return calculateCircularMotion(r, omega, time)
  }, [r, omega, time])

  const x = basicMotion.x
  const y = basicMotion.y

  const designScale = (DESIGN_W - CENTRIPETAL_LAYOUT.canvasPadding) / (2 * CENTRIPETAL_LAYOUT.rMax)

  const cardWidth = Math.max(CENTRIPETAL_LAYOUT.waveCardMinWidth, DESIGN_W * 0.35)
  const cardHeight = Math.max(CENTRIPETAL_LAYOUT.waveCardMinHeight, DESIGN_H * 0.3)
  const cardX = DESIGN_W - cardWidth - CENTRIPETAL_LAYOUT.waveCardRightOffset
  const cardY = 20

  const ballPos = { cx: DESIGN_CX + x * designScale, cy: DESIGN_CY - y * designScale }

  const sceneScale = useMemo(() => {
    const basicRefV = Math.max(v * 1.4, 4.0)
    const basicRefA = Math.max(a_c, 4.0)
    const basicRefF = Math.max(F_c, 5.0)

    return createSceneScaleFromDesignCenter({
      designWidth: DESIGN_W,
      designHeight: DESIGN_H,
      centerX: DESIGN_CX,
      centerY: DESIGN_CY,
      scale: designScale,
      refMagnitudes: {
        velocity: basicRefV,
        acceleration: basicRefA,
        force: basicRefF,
        gravity: basicRefF,
        normalForce: basicRefF,
        tension: basicRefF,
      },
    })
  }, [v, a_c, F_c, designScale])

  const cardInnerPad = CENTRIPETAL_LAYOUT.waveCardPadding
  const cardInnerW = cardWidth - cardInnerPad.left - cardInnerPad.right

  const faPoints = useMemo(
    () => [
      { x: 0, y: 0 },
      { x: CENTRIPETAL_CHART_RANGE.aMax, y: CENTRIPETAL_CHART_RANGE.aMax * m },
    ],
    [m],
  )

  const isDraggingRef = useRef(false)

  const handleDragTime = useCallback(
    (clientX: number, containerRect: DOMRect) => {
      const dx = (clientX - containerRect.left - vp.tx) / vp.scale
      const clickX = dx - cardX - cardInnerPad.left
      const accClick = (clickX / cardInnerW) * CENTRIPETAL_CHART_RANGE.aMax
      if (accClick >= 0 && accClick <= CENTRIPETAL_CHART_RANGE.aMax) {
        const vTarget = Math.sqrt(accClick * r)
        const clampedV = Math.max(CENTRIPETAL_PARAM_BOUNDS.vMin, Math.min(CENTRIPETAL_PARAM_BOUNDS.vMax, vTarget))
        updateParam('v', parseFloat(clampedV.toFixed(2)))
        setIsPlaying(false)
      }
    },
    [vp.tx, vp.scale, cardX, cardInnerPad, cardInnerW, r, updateParam, setIsPlaying]
  )

  const handleContainerMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return
      handleDragTime(e.clientX, e.currentTarget.getBoundingClientRect())
    },
    [handleDragTime]
  )

  const handleContainerMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const handleChartMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDraggingRef.current = true
      const container = e.currentTarget.closest('[data-viewport]') as HTMLElement | null
      if (!container) return
      handleDragTime(e.clientX, container.getBoundingClientRect())
    },
    [handleDragTime]
  )

  return {
    params: { r, v, m, showAcceleration, showWaveform, showVectors },
    time,
    showFaCard,
    omega, a_c, F_c, x, y,
    vp,
    centerX: DESIGN_CX, centerY: DESIGN_CY, scale: designScale, ballPos,
    cardWidth, cardHeight, cardX, cardY, cardInnerPad, cardInnerW,
    sceneScale,
    faPoints,
    handleContainerMouseMove, handleContainerMouseUp, handleChartMouseDown,
  }
}
