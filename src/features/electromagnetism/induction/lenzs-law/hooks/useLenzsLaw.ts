import { useState, useRef, useEffect, useCallback } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateLenzsLaw } from '@/physics'
import { useAnimationFrame } from '@/utils/animation'

// 舒展充盈 840×650 视口坐标系下的垂直运动范围与线圈中心
export const y_top = 130
export const y_coil = 360
export const coilY = 410

export function useLenzsLaw() {
  const { params, time, isPlaying, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
    }))
  )

  const {
    magnetPole = 1,
    coilN = 10,
    magnetSpeed = 2,
    motionMode = 1,
    currentStep = 0,
    showLines = 1,
    showEquivalentPoles = 1,
    showHandRule = 1,
  } = params

  // 局部状态：拖拽位置、是否在拖拽中、强制刷新触发器
  const [magnetYState, setMagnetYState] = useState(y_top)
  const [isDragging, setIsDragging] = useState(false)
  const [, setForceUpdate] = useState(0)
  const [decayPlaying, setDecayPlaying] = useState(false)

  // 局部 Refs 用于拖动交互
  const lastPointerY = useRef(0)
  const lastTime = useRef(0)
  const dragVelocity = useRef(0)
  const lastDecayTime = useRef(0)

  // 监听重置/模式切换，重置非播放状态下的磁铁位置
  useEffect(() => {
    if (!isPlaying) {
      const initialY = motionMode === 1 ? y_top : y_coil
      setMagnetYState(initialY)
      dragVelocity.current = 0
      setDecayPlaying(false)
    }
  }, [isPlaying, motionMode])

  // 播放结束自动暂停机制 (T = 2秒)
  useEffect(() => {
    if (isPlaying) {
      const T = 2
      if (time >= T) {
        setIsPlaying(false)
      }
    }
  }, [time, isPlaying, setIsPlaying])

  // 衰减速度的帧循环（通过 useAnimationFrame 驱动）
  const decayVelocityDecay = useCallback(() => {
    if (Math.abs(dragVelocity.current) > 0.05) {
      dragVelocity.current *= 0.82 // 物理衰减系数
      setForceUpdate((x) => x + 1)
    } else {
      dragVelocity.current = 0
      setForceUpdate((x) => x + 1)
      setDecayPlaying(false)
    }
  }, [])

  useAnimationFrame(decayVelocityDecay, { playing: decayPlaying })

  // Pointer Down 拖拽启动
  const handleDragStart = (yDesign: number) => {
    if (isPlaying) return
    lastPointerY.current = yDesign
    lastTime.current = performance.now()
    dragVelocity.current = 0
    setIsDragging(true)
    setDecayPlaying(false)
  }

  // Pointer Move 拖动中位置和速度更新
  const handleDragMove = (yDesign: number) => {
    if (!isDragging) return
    const now = performance.now()
    const dt = (now - lastTime.current) / 1000
    const dyDesign = yDesign - lastPointerY.current

    if (dt > 0.005) {
      // 物理速度映射
      const targetPhysVel = -dyDesign / dt / 75
      dragVelocity.current = dragVelocity.current * 0.4 + targetPhysVel * 0.6

      setMagnetYState((prev) => {
        const nextY = prev + dyDesign
        return Math.max(y_top, Math.min(y_coil, nextY))
      })

      lastPointerY.current = yDesign
      lastTime.current = now
    }
  }

  // Pointer Up 拖拽结束，启动速度衰减
  const handleDragEnd = () => {
    setIsDragging(false)
    lastDecayTime.current = performance.now()
    setDecayPlaying(true)
  }

  // 根据当前状态，计算磁铁位置和速度
  let magnetY = y_top
  let velocity = 0

  if (isPlaying) {
    const T = 2
    const progress = Math.min(1, time / T)
    const smoothK = (1 - Math.cos(progress * Math.PI)) / 2

    if (motionMode === 1) {
      magnetY = y_top + (y_coil - y_top) * smoothK
      velocity = -magnetSpeed * Math.sin(progress * Math.PI) // 靠近为负值
    } else {
      magnetY = y_coil + (y_top - y_coil) * smoothK
      velocity = magnetSpeed * Math.sin(progress * Math.PI) // 远离为正值
    }
  } else {
    magnetY = magnetYState
    velocity = dragVelocity.current
  }

  const lenzResult = calculateLenzsLaw(magnetPole, velocity)

  // 缓存上一次非 stable 的结果，暂停时沿用以保持感应效果可见
  const lastResultRef = useRef(lenzResult)
  const cacheKeyRef = useRef(`${magnetPole}_${motionMode}`)
  const currentCacheKey = `${magnetPole}_${motionMode}`
  if (cacheKeyRef.current !== currentCacheKey) {
    // 磁极或运动模式切换，清除缓存
    lastResultRef.current = lenzResult
    cacheKeyRef.current = currentCacheKey
  } else if (lenzResult.fluxChange !== 'stable') {
    lastResultRef.current = lenzResult
  }
  const displayResult = lenzResult.fluxChange === 'stable' ? lastResultRef.current : lenzResult

  // 计算相对距离和磁通量视觉强度的系数 (0.1 ~ 1.0，根据拉大后的距离范围参数化自适应)
  const dist = coilY - magnetY
  const minOffset = coilY - y_coil
  const travelRange = y_coil - y_top
  const fluxIntensity = Math.max(0.1, Math.min(1.0, 1 - (dist - minOffset) / travelRange))

  return {
    magnetY,
    velocity,
    isDragging,
    lenzResult: displayResult,
    fluxIntensity,
    time,
    isPlaying,
    currentStep,
    magnetPole,
    coilN,
    showLines,
    showEquivalentPoles,
    showHandRule,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  }
}
