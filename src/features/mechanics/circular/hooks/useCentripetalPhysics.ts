import { useMemo, useCallback } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateCircularMotion, computeCentripetalFit } from '@/physics'
import type { CentripetalFitResult } from '@/physics'
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
    fitMode: number; showCompare: number
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

  sceneScale: SceneScale

  faPoints: Array<{ x: number; y: number }>
  /** 0：理论 F–a；1：实验探究 F–ω² */
  fitMode: number
  /** F–ω² 图层的全部数据（理论斜率 / 拟合斜率 / 采样点 / 对照组） */
  fit: CentripetalFitResult

  /**
   * 卡片拖拽回调：接收图表给的**物理 X 值**（模式 A 是 a，模式 B 是 ω²），反解出 v。
   * 坐标换算由图表组件按真实绘图区完成，这里只做物理反解与范围夹取。
   */
  setVFromChartX: (chartX: number) => void
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
    fitMode = 0,
    showCompare = 0,
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

  const faPoints = useMemo(
    () => [
      { x: 0, y: 0 },
      { x: CENTRIPETAL_CHART_RANGE.aMax, y: CENTRIPETAL_CHART_RANGE.aMax * m },
    ],
    [m],
  )

  // F–ω² 实验图层：斜率 = m·r，拟合斜率由采样点过原点最小二乘得到
  const fit = useMemo(
    () =>
      computeCentripetalFit(m, r, {
        vMin: CENTRIPETAL_PARAM_BOUNDS.vMin,
        vMax: CENTRIPETAL_PARAM_BOUNDS.vMax,
      }),
    [m, r],
  )

  /**
   * 卡片拖拽：图表已把指针位置换算成物理 X（模式 A 为 a，模式 B 为 ω²），
   * 这里只负责反解出 v —— 坐标换算不再由本 hook 用布局常量猜图区内边距。
   */
  const setVFromChartX = useCallback(
    (chartX: number) => {
      const x = Math.max(0, chartX)
      const vTarget = fitMode === 1
        ? r * Math.sqrt(x)          // ω = √(ω²)，v = ωr
        : Math.sqrt(x * r)          // a = v²/r → v = √(ar)
      const clampedV = Math.max(CENTRIPETAL_PARAM_BOUNDS.vMin, Math.min(CENTRIPETAL_PARAM_BOUNDS.vMax, vTarget))
      updateParam('v', parseFloat(clampedV.toFixed(2)))
      setIsPlaying(false)
    },
    [r, fitMode, updateParam, setIsPlaying]
  )

  return {
    params: { r, v, m, showAcceleration, showWaveform, fitMode, showCompare, showVectors },
    time,
    showFaCard,
    omega, a_c, F_c, x, y,
    vp,
    centerX: DESIGN_CX, centerY: DESIGN_CY, scale: designScale, ballPos,
    cardWidth, cardHeight, cardX, cardY,
    sceneScale,
    faPoints,
    fitMode,
    fit,
    setVFromChartX,
  }
}
