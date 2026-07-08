import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateBinaryStars, calculateTripleStars } from '@/physics/celestial'

export type BinaryStarsState =
  | {
      mode: 0
      L: number
      massRatio: number
      r1: number
      r2: number
      r1Px: number
      r2Px: number
      pos1: { x: number; y: number }
      pos2: { x: number; y: number }
      forceVec1: { x: number; y: number }
      forceVec2: { x: number; y: number }
      velVec1: { x: number; y: number }
      velVec2: { x: number; y: number }
      v1: number
      v2: number
      omega: number
      m1: number
      m2: number
      scale: number
    }
  | {
      mode: 1
      L: number
      starMass: number
      r: number
      rPx: number
      pos1: { x: number; y: number }
      pos2: { x: number; y: number }
      pos3: { x: number; y: number }
      velVec1: { x: number; y: number }
      velVec2: { x: number; y: number }
      velVec3: { x: number; y: number }
      forceVec1: { x: number; y: number }
      forceVec2: { x: number; y: number }
      forceVec3: { x: number; y: number }
      force12: { x: number; y: number }
      force13: { x: number; y: number }
      v: number
      omega: number
      scale: number
    }

export function useBinaryStars(): BinaryStarsState | null {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  const mode = params.mode ?? 0 // 0 = 双星, 1 = 三星
  const L = params.L ?? 8.0
  const massRatio = params.massRatio ?? 1.0

  // 物理常数
  const G = 1.0
  const totalMass = 10.0
  const starMass = 5.0 // 三星模式下每颗星质量

  // 1. 双星物理解算
  const binaryData = useMemo(() => {
    if (mode !== 0) return null
    return calculateBinaryStars(L, massRatio, G, totalMass)
  }, [mode, L, massRatio])

  // 2. 三星物理解算
  const tripleData = useMemo(() => {
    if (mode !== 1) return null
    return calculateTripleStars(L, G, starMass)
  }, [mode, L])

  // 3. 计算随时间旋转的坐标与矢量
  const animationState = useMemo(() => {
    // 物理米到像素的缩放比例：双星模式为防偏心轨道溢出保持 18，三星完全对称放大为 28
    const scale = mode === 0 ? 18 : 28

    if (mode === 0 && binaryData) {
      const { m1, m2, r1, r2, v1, v2, omega } = binaryData
      const theta = omega * time

      const cos = Math.cos(theta)
      const sin = Math.sin(theta)

      // 物理坐标系（质心在原点，Y轴向上）
      const pos1 = { x: r1 * cos, y: r1 * sin }
      const pos2 = { x: -r2 * cos, y: -r2 * sin }

      // 引力矢量（指向质心/原点，视觉上让两个引力箭头像素长度一致且稳定，设为 35 像素）
      const forceVec1 = { x: -cos, y: -sin }
      const forceVec2 = { x: cos, y: sin }

      // 速度矢量（切线方向为 (-sin, cos)）
      const velVec1 = { x: -sin * v1, y: cos * v1 }
      const velVec2 = { x: sin * v2, y: -cos * v2 }

      return {
        mode: 0 as const,
        L,
        massRatio,
        r1,
        r2,
        r1Px: r1 * scale,
        r2Px: r2 * scale,
        pos1,
        pos2,
        forceVec1,
        forceVec2,
        velVec1,
        velVec2,
        v1,
        v2,
        omega,
        m1,
        m2,
        scale,
      }
    } else if (mode === 1 && tripleData) {
      const { r, v, omega } = tripleData
      const theta = omega * time

      // 三颗星角度，互隔 120 度
      const theta1 = theta
      const theta2 = theta + (2 * Math.PI) / 3
      const theta3 = theta + (4 * Math.PI) / 3

      const pos1 = { x: r * Math.cos(theta1), y: r * Math.sin(theta1) }
      const pos2 = { x: r * Math.cos(theta2), y: r * Math.sin(theta2) }
      const pos3 = { x: r * Math.cos(theta3), y: r * Math.sin(theta3) }

      // 线速度矢量 (切线方向)
      const velVec1 = { x: -Math.sin(theta1) * v, y: Math.cos(theta1) * v }
      const velVec2 = { x: -Math.sin(theta2) * v, y: Math.cos(theta2) * v }
      const velVec3 = { x: -Math.sin(theta3) * v, y: Math.cos(theta3) * v }

      // 受合力矢量 (指向质心)
      const forceVec1 = { x: -Math.cos(theta1), y: -Math.sin(theta1) }
      const forceVec2 = { x: -Math.cos(theta2), y: -Math.sin(theta2) }
      const forceVec3 = { x: -Math.cos(theta3), y: -Math.sin(theta3) }

      // 两星分引力方向
      const dir12 = { x: pos2.x - pos1.x, y: pos2.y - pos1.y }
      const len12 = Math.sqrt(dir12.x * dir12.x + dir12.y * dir12.y)
      const force12 = { x: dir12.x / len12, y: dir12.y / len12 }

      const dir13 = { x: pos3.x - pos1.x, y: pos3.y - pos1.y }
      const len13 = Math.sqrt(dir13.x * dir13.x + dir13.y * dir13.y)
      const force13 = { x: dir13.x / len13, y: dir13.y / len13 }

      return {
        mode: 1 as const,
        L,
        starMass,
        r,
        rPx: r * scale,
        pos1,
        pos2,
        pos3,
        velVec1,
        velVec2,
        velVec3,
        forceVec1,
        forceVec2,
        forceVec3,
        force12,
        force13,
        v,
        omega,
        scale,
      }
    }

    return null
  }, [mode, time, binaryData, tripleData, L, massRatio])

  return animationState
}
