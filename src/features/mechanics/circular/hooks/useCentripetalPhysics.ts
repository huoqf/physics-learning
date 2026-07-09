import { useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateCircularMotion } from '@/physics'
import { useCanvasSize, physicsToCanvasWithOrigin, useViewport, clientToContainerPoint } from '@/utils'
import type { CanvasSize, ViewportInfo } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { createSceneScaleFromViewport } from '@/scene'

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

  containerRef: React.RefObject<HTMLDivElement | null>
  canvasSize: CanvasSize
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

  sceneScale: ReturnType<typeof createSceneScaleFromViewport>

  faPoints: Array<{ x: number; y: number }>

  handleSvgMouseMove: (e: React.MouseEvent<SVGElement>) => void
  handleSvgMouseUp: () => void
  handleChartMouseDown: (e: React.MouseEvent<SVGElement>) => void
}

export function useCentripetalPhysics(): CentripetalPhysicsResult {
  const { params, time, showVectors, setIsPlaying, updateParam } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      setIsPlaying: s.setIsPlaying,
      updateParam: s.updateParam,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.square)

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

  const minCanvasDim = Math.min(canvasSize.width, canvasSize.height)
  const scale = (minCanvasDim - CENTRIPETAL_LAYOUT.canvasPadding) / (2 * CENTRIPETAL_LAYOUT.rMax)

  const cardWidth = Math.max(CENTRIPETAL_LAYOUT.waveCardMinWidth, canvasSize.width * 0.35)

  const vp = useViewport(canvasSize, {
    designWidth: 650,
    designHeight: 650,
    overlayRight: showFaCard ? Math.round(cardWidth) : 0,
  })

  const centerX = vp.centerX
  const centerY = vp.centerY
  const ballPos = physicsToCanvasWithOrigin(x, y, centerX, centerY, scale)

  const sceneScale = useMemo(() => {
    const basicRefV = Math.max(v * 1.4, 4.0)
    const basicRefA = Math.max(a_c, 4.0)
    const basicRefF = Math.max(F_c, 5.0)

    return createSceneScaleFromViewport(vp, 'centerScale', {
      designWidth: 650,
      designHeight: 650,
      worldWidth: vp.visibleW / scale,
      worldHeight: vp.visibleH / scale,
      refMagnitudes: {
        velocity: basicRefV,
        acceleration: basicRefA,
        force: basicRefF,
        gravity: basicRefF,
        normalForce: basicRefF,
        tension: basicRefF,
      },
    })
  }, [vp, scale, v, a_c, F_c])

  const cardHeight = Math.max(CENTRIPETAL_LAYOUT.waveCardMinHeight, canvasSize.height * 0.3)
  const cardX = canvasSize.width - cardWidth - CENTRIPETAL_LAYOUT.waveCardRightOffset
  const cardY = 20

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
    (clientX: number, svgRect: DOMRect) => {
      const { x: containerX } = clientToContainerPoint(clientX, 0, svgRect)
      const clickX = containerX - cardX - cardInnerPad.left
      const accClick = (clickX / cardInnerW) * CENTRIPETAL_CHART_RANGE.aMax
      if (accClick >= 0 && accClick <= CENTRIPETAL_CHART_RANGE.aMax) {
        const vTarget = Math.sqrt(accClick * r)
        const clampedV = Math.max(CENTRIPETAL_PARAM_BOUNDS.vMin, Math.min(CENTRIPETAL_PARAM_BOUNDS.vMax, vTarget))
        updateParam('v', parseFloat(clampedV.toFixed(2)))
        setIsPlaying(false)
      }
    },
    [cardX, cardInnerPad, cardInnerW, r, updateParam, setIsPlaying]
  )

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      if (!isDraggingRef.current) return
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      handleDragTime(e.clientX, rect)
    },
    [handleDragTime]
  )

  const handleSvgMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const handleChartMouseDown = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      isDraggingRef.current = true
      const svg = e.currentTarget.closest('svg')
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      handleDragTime(e.clientX, rect)
    },
    [handleDragTime]
  )

  return {
    params: { r, v, m, showAcceleration, showWaveform, showVectors },
    time,
    showFaCard,
    omega, a_c, F_c, x, y,
    containerRef,
    canvasSize,
    vp,
    centerX, centerY, scale, ballPos,
    cardWidth, cardHeight, cardX, cardY, cardInnerPad, cardInnerW,
    sceneScale,
    faPoints,
    handleSvgMouseMove, handleSvgMouseUp, handleChartMouseDown,
  }
}
