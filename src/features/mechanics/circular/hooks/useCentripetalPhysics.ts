import { useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateCircularMotion, precomputeVerticalCircularMotion, GRAVITY } from '@/physics'
import type { VerticalCircularMotionPoint } from '@/physics/dynamics/dynamics-advanced'
import { useCanvasSize, physicsToCanvasWithOrigin, useViewport, clientToContainerPoint } from '@/utils'
import type { CanvasSize, ViewportInfo } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'

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

const SIMULATION_DT = 0.002

export interface CentripetalPhysicsResult {
  params: {
    r: number; v: number; v0: number; m: number
    advancedMode: number; showWaveform: number; trackType: number
    showAcceleration: number; showVectors: boolean
  }
  time: number
  isAdvanced: boolean
  showFaCard: boolean

  omega: number
  a_c: number
  F_c: number
  x: number
  y: number
  currentPoint: VerticalCircularMotionPoint | null
  activeTrajectory: VerticalCircularMotionPoint[]

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

  sceneConfig: SceneConfig
  sceneScale: ReturnType<typeof createSceneScale>

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
    v0 = 5,
    m = 1,
    advancedMode = 0,
    showWaveform = 1,
    trackType = 0,
    showAcceleration = 1,
  } = params

  const isAdvanced = advancedMode === 1
  const showFaCard = !isAdvanced && showWaveform === 1

  const { trajectory } = useMemo(() => {
    return precomputeVerticalCircularMotion(r, v0, m, trackType)
  }, [r, v0, m, trackType])

  const currentPoint = useMemo(() => {
    if (!isAdvanced) return null
    const idx = Math.round(time / SIMULATION_DT)
    const clamped = Math.max(0, Math.min(trajectory.length - 1, idx))
    return trajectory[clamped]
  }, [isAdvanced, trajectory, time])

  const activeTrajectory = useMemo(() => {
    if (!isAdvanced) return []
    const idx = Math.round(time / SIMULATION_DT)
    const clamped = Math.max(0, Math.min(trajectory.length - 1, idx))
    return trajectory.slice(0, clamped + 1)
  }, [isAdvanced, trajectory, time])

  const omega = v / r
  const a_c = (v * v) / r
  const F_c = m * a_c

  const basicMotion = useMemo(() => {
    return calculateCircularMotion(r, omega, time)
  }, [r, omega, time])

  const x = isAdvanced && currentPoint ? currentPoint.x : basicMotion.x
  const y = isAdvanced && currentPoint ? currentPoint.y : basicMotion.y

  const minCanvasDim = Math.min(canvasSize.width, canvasSize.height)
  const scale = (minCanvasDim - CENTRIPETAL_LAYOUT.canvasPadding) / (2 * CENTRIPETAL_LAYOUT.rMax)

  const cardWidth = isAdvanced
    ? Math.max(290, canvasSize.width * 0.38)
    : Math.max(CENTRIPETAL_LAYOUT.waveCardMinWidth, canvasSize.width * 0.35)

  const isLeftShifted = showFaCard || isAdvanced
  const vp = useViewport(canvasSize, {
    designWidth: 650,
    designHeight: 650,
    overlayRight: isLeftShifted ? Math.round(cardWidth) : 0,
  })

  const centerX = vp.centerX
  const centerY = vp.centerY
  const ballPos = physicsToCanvasWithOrigin(x, y, centerX, centerY, scale)

  const sceneConfig = useMemo((): SceneConfig => {
    const basicRefV = Math.max(v * 1.4, 4.0)
    const basicRefA = Math.max(a_c, 4.0)
    const basicRefF = Math.max(F_c, 5.0)
    const advRefV = Math.max(v0 * 1.4, 6.0)
    const advRefA = Math.max((v0 * v0) / r, 10.0)
    const advRefF = Math.max(m * GRAVITY + (m * v0 * v0) / r, 15.0)

    return {
      vectorBounds: {
        x: 0, y: 0,
        width: canvasSize.width - CENTRIPETAL_LAYOUT.canvasPadding,
        height: canvasSize.height - CENTRIPETAL_LAYOUT.canvasPadding,
      },
      originX: centerX,
      originY: centerY,
      worldWidth: (canvasSize.width - CENTRIPETAL_LAYOUT.canvasPadding) / scale,
      worldHeight: (canvasSize.height - CENTRIPETAL_LAYOUT.canvasPadding) / scale,
      refMagnitudes: {
        velocity: isAdvanced ? advRefV : basicRefV,
        acceleration: isAdvanced ? advRefA : basicRefA,
        force: isAdvanced ? advRefF : basicRefF,
        gravity: isAdvanced ? advRefF : basicRefF,
        normalForce: isAdvanced ? advRefF : basicRefF,
        tension: isAdvanced ? advRefF : basicRefF,
      },
    }
  }, [
    canvasSize.width, canvasSize.height, centerX, centerY, scale,
    isAdvanced, v, v0, r, m, a_c, F_c,
  ])

  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig])

  const cardHeight = isAdvanced
    ? Math.max(340, canvasSize.height * 0.55)
    : Math.max(CENTRIPETAL_LAYOUT.waveCardMinHeight, canvasSize.height * 0.3)
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
    params: { r, v, v0, m, advancedMode, showWaveform, trackType, showAcceleration, showVectors },
    time,
    isAdvanced,
    showFaCard,
    omega, a_c, F_c, x, y,
    currentPoint,
    activeTrajectory,
    containerRef,
    canvasSize,
    vp,
    centerX, centerY, scale, ballPos,
    cardWidth, cardHeight, cardX, cardY, cardInnerPad, cardInnerW,
    sceneConfig, sceneScale,
    faPoints,
    handleSvgMouseMove, handleSvgMouseUp, handleChartMouseDown,
  }
}
