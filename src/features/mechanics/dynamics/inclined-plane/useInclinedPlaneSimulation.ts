import { useEffect, useRef, useState } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useSimulationFrame } from '@/utils/animation'
import { computeInclinedPlane } from '@/physics/inclined_plane'
import { GRAVITY } from '@/physics/constants'

export interface InclinedPlaneSimState {
  x: number // 沿斜面方向的物理位移 (m)
  v: number // 沿斜面方向的物理速度 (m/s)
}

const INITIAL_SIM: InclinedPlaneSimState = { x: 0, v: 0 }

interface SimulationOptions {
  /** 斜面底边的物理宽度，默认 2.4 米 */
  boardWidthPhysical?: number
}

export function useInclinedPlaneSimulation(options: SimulationOptions = {}) {
  const { params, time, isPlaying, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
    }))
  )

  const theta = params.theta ?? 30
  const mu = params.mu ?? 0.3
  const m = params.m ?? 2.0
  const g = GRAVITY
  const showDecomposition = params.showDecomposition === 1
  const mode = params.mode ?? 0 // 0: 自由释放分析, 1: 寻找临界极限

  const [simState, setSimState] = useState<InclinedPlaneSimState>(INITIAL_SIM)
  const simStateRef = useRef<InclinedPlaneSimState>(INITIAL_SIM)

  const boardWidthPhys = options.boardWidthPhysical ?? 2.4
  const angleRad = (theta * Math.PI) / 180
  
  // 物理上斜边长度 L = W / cos(θ)
  const boardLengthPhys = boardWidthPhys / Math.cos(angleRad)

  // 挂载时强制将播放状态复位为 false，杜绝全局 store 播放状态残留导致的自动播放
  useEffect(() => {
    setIsPlaying(false)
  }, [setIsPlaying])

  // 当参数改变时自动复位
  useEffect(() => {
    simStateRef.current = INITIAL_SIM
    setSimState(INITIAL_SIM)
  }, [theta, mu, m, mode])

  // 时间归零时重置
  const wasTimeZeroRef = useRef(true)
  useEffect(() => {
    const isZero = time === 0
    if (isZero && !wasTimeZeroRef.current) {
      simStateRef.current = INITIAL_SIM
      setSimState(INITIAL_SIM)
    }
    wasTimeZeroRef.current = isZero
  }, [time])

  // 物理动力学解算
  const physicsRes = computeInclinedPlane({ theta, mu, m, g })

  // 动力学积分 — active 由 isPlaying 控制，暂停时 rAF 回调不执行，杜绝自动播放
  useSimulationFrame((deltaTimeMs) => {
    const dt = Math.min(0.033, deltaTimeMs / 1000)
    if (dt <= 0) return

    const prev = simStateRef.current

    // 边界保护：滑到斜面底部则定格
    if (prev.x >= boardLengthPhys) {
      return
    }

    const accel = physicsRes.accel
    let newV = prev.v + accel * dt
    let newX = prev.x + newV * dt

    // 触底截断
    if (newX >= boardLengthPhys) {
      newX = boardLengthPhys
      newV = 0
    }

    const next = { x: newX, v: newV }
    simStateRef.current = next
    setSimState(next)
  }, { active: isPlaying })

  const isAtBottom = simState.x >= boardLengthPhys

  // 触底后自动暂停
  useEffect(() => {
    if (isAtBottom && isPlaying) {
      setIsPlaying(false)
    }
  }, [isAtBottom, isPlaying, setIsPlaying])

  return {
    theta,
    mu,
    m,
    g,
    showDecomposition,
    mode,
    simState,
    physicsRes,
    boardWidthPhys,
    boardLengthPhys,
    isAtBottom,
  }
}
