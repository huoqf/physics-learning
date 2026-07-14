/**
 * useConnectedBodiesPhysics.ts — 连接体物理计算 hook
 *
 * 从 ConnectedBodiesAnimation.tsx 拆分：所有物理计算、布局几何、动画状态。
 * 组件 JSX 零物理公式。
 */
import { useEffect, useState, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { PX_PER_METER } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { calculateConnectedBody, calculateConnectedBodyTimeline, GRAVITY } from '@/physics'

/** 连接体场景布局常量 */
const LAYOUT = {
  groundOffset: 80,
  blockMaxWidth: 65,
  blockWidthRatio: 0.11,
  blockMaxHeight: 50,
  blockHeightRatio: 0.13,
  wheelRadius: 6,
  springMaxStretchRatio: 0.7,
  ropeMinLength: 40,
  ropeLengthRatio: 0.12,
  startXRatio: 0.15,
  endXRatio: 0.85,
}

/** 弹簧视觉动效参数（非严格物理量，仅用于动画表现） */
const SPRING_VISUAL = {
  visualOmega: 11.5,
  visualDamping: 1.6,
  tensionToStretchScale: 11,
  stretchVisualScale: 15,
}

export interface ConnectedBodiesPhysicsResult {
  // 视口
  vp: ReturnType<typeof useAnimationViewport>['vp']
  preset: ReturnType<typeof useAnimationViewport>['preset']
  canvasSize: ReturnType<typeof useAnimationViewport>['canvasSize']
  containerRef: ReturnType<typeof useAnimationViewport>['containerRef']
  font: (size: number) => number
  animWidth: number
  animHeight: number

  // 物理参数
  m1: number
  m2: number
  F: number
  mu: number
  advancedMode: number
  analysisView: number
  connectionType: number

  // 物理结果
  physicsResult: ReturnType<typeof calculateConnectedBody>
  totalMass: number
  f1_val: number
  f2_val: number
  T_val: number

  // 布局
  groundY: number
  startX: number
  endX: number
  w1: number
  h1: number
  w2: number
  h2: number
  m1X: number
  m1Y: number
  m2X: number
  m2Y: number
  ropeLeftX: number
  ropeRightX: number
  ropeY: number
  currentRopeL: number
  maxTravel: number

  // 动画状态
  isMoving: boolean
  effectiveTime: number
  maxDisplacementTime: number
  wheelRotation: number
  arrowLength: number
  dragTargetX: number

  // 场景缩放
  cbSceneScale: ReturnType<typeof useSceneScale>

  // 拖拽交互
  isDragging: boolean
  handleDragStart: (e: React.MouseEvent) => void

  // 分析视图
  isNormalView: boolean
  isSystemView: boolean
  isM1View: boolean
  isM2View: boolean
}

export function useConnectedBodiesPhysics(): ConnectedBodiesPhysicsResult {
  const { params, time, isPlaying, setIsPlaying, updateParam } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
      updateParam: s.updateParam,
    }))
  )
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full, presetCompensation: 1.2 })
  const { font } = canvasSize

  const {
    m1 = 2,
    m2 = 3,
    F = 15,
    mu = 0.1,
    advancedMode = 0,
    analysisView = 0,
    connectionType = 0,
  } = params

  // 1. 物理计算
  const physicsResult = calculateConnectedBody(m1, m2, F, mu, GRAVITY)
  const { isMoving: isMovingPhysically, a: acceleration, T: tension } = physicsResult
  const totalMass = m1 + m2

  // 2. 屏幕自适应布局与行程参数计算
  const animWidth = vp.visibleW
  const animHeight = vp.visibleH
  const groundY = vp.visibleY + vp.visibleH - LAYOUT.groundOffset
  const startX = vp.visibleX + vp.visibleW * LAYOUT.startXRatio
  const endX = vp.visibleX + vp.visibleW * LAYOUT.endXRatio

  const w1 = Math.min(LAYOUT.blockMaxWidth, animWidth * LAYOUT.blockWidthRatio)
  const h1 = Math.min(LAYOUT.blockMaxHeight, animHeight * LAYOUT.blockHeightRatio)
  const w2 = Math.min(LAYOUT.blockMaxWidth, animWidth * LAYOUT.blockWidthRatio)
  const h2 = Math.min(LAYOUT.blockMaxHeight, animHeight * LAYOUT.blockHeightRatio)

  const defaultRopeL = Math.max(LAYOUT.ropeMinLength, animWidth * LAYOUT.ropeLengthRatio)

  // 3. 弹簧弹性拉紧与简谐震荡计算
  let springDx = 0
  let effectiveTime = time

  if (connectionType === 1) {
    if (isPlaying && time > 0 && isMovingPhysically) {
      const dxStatic = tension / SPRING_VISUAL.tensionToStretchScale
      springDx = dxStatic * (1 - Math.exp(-SPRING_VISUAL.visualDamping * time) * Math.cos(SPRING_VISUAL.visualOmega * time))
    } else {
      springDx = tension / SPRING_VISUAL.tensionToStretchScale
    }
  }

  const maxSpringDx = defaultRopeL * LAYOUT.springMaxStretchRatio
  const finalSpringDx = Math.min(maxSpringDx, springDx)
  const currentRopeL = connectionType === 0 ? defaultRopeL : defaultRopeL + finalSpringDx * SPRING_VISUAL.stretchVisualScale

  const totalGroupW = w1 + w2 + currentRopeL
  const maxTravel = Math.max(10, endX - startX - totalGroupW)

  const maxDisplacementTime = acceleration > 0.01
    ? Math.sqrt((2 * (maxTravel / PX_PER_METER)) / acceleration)
    : Infinity

  if (advancedMode === 0) {
    effectiveTime = maxDisplacementTime !== Infinity && time >= maxDisplacementTime ? maxDisplacementTime : time
  } else {
    effectiveTime = Math.min(time, 4.0)
  }

  const isMoving = isPlaying && time > 0 && (advancedMode === 0 ? time < maxDisplacementTime : time < 4.0) && isMovingPhysically

  // 自动停止播放
  useEffect(() => {
    if (!isPlaying) return
    if (advancedMode === 0) {
      if (maxDisplacementTime !== Infinity && time >= maxDisplacementTime) {
        setIsPlaying(false)
      }
    } else {
      if (time >= 4.0) {
        setIsPlaying(false)
      }
    }
  }, [time, maxDisplacementTime, isPlaying, advancedMode, setIsPlaying])

  // 4. 物理位移→像素映射
  const timeline = calculateConnectedBodyTimeline(m1, m2, F, mu, GRAVITY, effectiveTime)
  const maxTimeline = calculateConnectedBodyTimeline(m1, m2, F, mu, GRAVITY, advancedMode === 0 ? maxDisplacementTime : 4.0)
  const dispX = maxTimeline.s > 0.001 ? (timeline.s / maxTimeline.s) * maxTravel : 0

  const m1X = startX + dispX
  const m1Y = groundY - h1
  const m2X = m1X + w1 + currentRopeL
  const m2Y = groundY - h2

  const ropeLeftX = m1X + w1
  const ropeRightX = m2X
  const ropeY = groundY - h1 / 2

  // 5. 车轮旋转角度
  const wheelRotation = LAYOUT.wheelRadius > 0 ? (dispX / LAYOUT.wheelRadius) * (180 / Math.PI) : 0

  // 6. 外力 F 箭头
  const arrowLength = Math.max(15, (F / 30) * 60)
  const dragTargetX = m2X + w2 + arrowLength

  // 7. 场景缩放
  const cbSceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'viewport',
    physicsWidth: preset.width,
    physicsHeight: preset.height,
    refMagnitudes: { force: Math.max(F, 30), friction: Math.max(F, 30), tension: Math.max(F, 30) },
  })

  // 8. 拖拽交互
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ clientX: 0, startF: 0 })

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    dragStartRef.current = { clientX: e.clientX, startF: F }
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - dragStartRef.current.clientX
      const deltaF = deltaX / 5.5
      const newF = Math.min(30, Math.max(0, Math.round(dragStartRef.current.startF + deltaF)))
      updateParam('F', newF)
    }

    const handlePointerUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, updateParam])

  // 9. 力大小文本
  const f1_val = parseFloat((physicsResult.f1 ?? physicsResult.f1Max).toFixed(1))
  const f2_val = parseFloat((physicsResult.f2 ?? physicsResult.f2Max).toFixed(1))
  const T_val = parseFloat(tension.toFixed(1))

  // 10. 分析视图
  const isNormalView = analysisView === 0
  const isSystemView = analysisView === 1
  const isM1View = analysisView === 2
  const isM2View = analysisView === 3

  return {
    vp, preset, canvasSize, containerRef, font,
    animWidth, animHeight,
    m1, m2, F, mu, advancedMode, analysisView, connectionType,
    physicsResult, totalMass, f1_val, f2_val, T_val,
    groundY, startX, endX, w1, h1, w2, h2,
    m1X, m1Y, m2X, m2Y, ropeLeftX, ropeRightX, ropeY,
    currentRopeL, maxTravel,
    isMoving, effectiveTime, maxDisplacementTime, wheelRotation,
    arrowLength, dragTargetX,
    cbSceneScale,
    isDragging, handleDragStart,
    isNormalView, isSystemView, isM1View, isM2View,
  }
}
