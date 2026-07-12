import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { precomputeVerticalCircularMotion, GRAVITY } from '@/physics'
import type { VerticalCircularMotionPoint } from '@/physics/dynamics/dynamics-advanced'
import { useCanvasSize, physicsToCanvasWithOrigin, useViewport } from '@/utils'
import type { CanvasSize, ViewportInfo } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useSceneScale } from '@/hooks/useSceneScale'
import type { SceneScale } from '@/scene'

const SIMULATION_DT = 0.002

export const VERTICAL_CIRCULAR_PARAM_BOUNDS = {
  rMin: 3, rMax: 5,
  v0Min: 1, v0Max: 15,
  mMin: 0.5, mMax: 5,
} as const

export const VERTICAL_CIRCULAR_LAYOUT = {
  rMax: VERTICAL_CIRCULAR_PARAM_BOUNDS.rMax,
  canvasPadding: 80,
  steelBallBaseRadius: 12,
  massRadiusScale: 1.5,
  cardMinWidth: 290,
  cardRightOffset: 20,
} as const

export interface VerticalCircularPhysicsResult {
  params: {
    r: number; v0: number; m: number
    trackType: number; showAcceleration: number
    showVectors: boolean
  }
  time: number

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

  sceneScale: SceneScale

  handleSvgMouseMove: (e: React.MouseEvent<SVGElement>) => void
  handleSvgMouseUp: () => void
}

export function useVerticalCircularPhysics(): VerticalCircularPhysicsResult {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.square)

  const {
    r = 3,
    v0 = 5,
    m = 1,
    trackType = 0,
    showAcceleration = 1,
  } = params

  const { trajectory } = useMemo(() => {
    return precomputeVerticalCircularMotion(r, v0, m, trackType)
  }, [r, v0, m, trackType])

  const currentPoint = useMemo(() => {
    const idx = Math.round(time / SIMULATION_DT)
    const clamped = Math.max(0, Math.min(trajectory.length - 1, idx))
    return trajectory[clamped]
  }, [trajectory, time])

  const activeTrajectory = useMemo(() => {
    const idx = Math.round(time / SIMULATION_DT)
    const clamped = Math.max(0, Math.min(trajectory.length - 1, idx))
    return trajectory.slice(0, clamped + 1)
  }, [trajectory, time])

  const x = currentPoint ? currentPoint.x : 0
  const y = currentPoint ? currentPoint.y : -r

  const minCanvasDim = Math.min(canvasSize.width, canvasSize.height)
  const scale = (minCanvasDim - VERTICAL_CIRCULAR_LAYOUT.canvasPadding) / (2 * VERTICAL_CIRCULAR_LAYOUT.rMax)

  const cardWidth = Math.max(VERTICAL_CIRCULAR_LAYOUT.cardMinWidth, canvasSize.width * 0.38)
  const cardHeight = Math.max(340, canvasSize.height * 0.55)

  const vp = useViewport(canvasSize, {
    designWidth: 650,
    designHeight: 650,
    overlayRight: Math.round(cardWidth),
  })

  const centerX = vp.centerX
  const centerY = vp.centerY
  const ballPos = physicsToCanvasWithOrigin(x, y, centerX, centerY, scale)

  const refV = Math.max(v0 * 1.4, 6.0)
  const refA = Math.max((v0 * v0) / r, 10.0)
  const refF = Math.max(m * GRAVITY + (m * v0 * v0) / r, 15.0)

  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.square,
    anchor: 'center',
    centerSource: 'viewport',
    physicsScaleDesign: scale / vp.scale,
    refMagnitudes: {
      velocity: refV,
      acceleration: refA,
      force: refF,
      gravity: refF,
      normalForce: refF,
      tension: refF,
    },
  })

  const cardX = canvasSize.width - cardWidth - VERTICAL_CIRCULAR_LAYOUT.cardRightOffset
  const cardY = 20

  return {
    params: { r, v0, m, trackType, showAcceleration, showVectors },
    time,
    currentPoint,
    activeTrajectory,
    containerRef,
    canvasSize,
    vp,
    centerX, centerY, scale, ballPos,
    cardWidth, cardHeight, cardX, cardY,
    sceneScale,
    handleSvgMouseMove: () => {},
    handleSvgMouseUp: () => {},
  }
}
