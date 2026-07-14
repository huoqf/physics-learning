import { useMemo, useRef } from 'react'
import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { useAnimationStore } from '@/stores'
import { CANVAS_PRESETS } from '@/theme/spacing'
import type { SceneScale } from '@/scene/SceneScale'
import type { CanvasSize, ViewportInfo } from '@/utils'
import {
  calculateConicalPendulumState,
  calculateDiskRotationState,
  calculateDiskSlippingState,
} from '@/physics/circularModels'
import type { ConicalPendulumState, DiskRotationState, DiskSlippingState } from '@/physics/circularModels'

const MASS_KG = 1
const DESIGN = CANVAS_PRESETS.splitH

export const SCENE = {
  centerX: DESIGN.width / 2,
  pivotY: 82,
  diskCenterY: 338,
  pendulumBaseY: 392,
  projectionDepth: 0.34,
  lengthPx: 270,
  diskRadiusPx: 132,
  blockSize: 24,
  orbitDash: '6 6',
  axisDash: '4 6',
} as const

export const PIXEL_VECTOR_SCALE: SceneScale = {
  originX: 0,
  originY: 0,
  scaleX: 1,
  scaleY: 1,
  scale: 1,
  maxVectorLength: 1,
}

export function pixelVector(dx: number, dy: number) {
  return { x: dx, y: -dy }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export interface ProjectedState {
  x: number
  y: number
  orbitRadiusPx: number
  orbitY: number
  opacity: number
  isFlownOut: boolean
  slipState?: DiskSlippingState
}

export interface VecData {
  // Conical pendulum
  tensionVec?: { x: number; y: number }
  tensionLength?: number
  centripVec?: { x: number; y: number }
  centripLength?: number
  tOffX?: number
  tOffY?: number
  cOffX?: number
  // Rotating disk
  frictionVec?: { x: number; y: number }
  frictionLength?: number
  normalVec?: { x: number; y: number }
  normalLength?: number
}

export interface CircularModelsPhysicsResult {
  containerRef: React.RefObject<HTMLDivElement | null>
  canvasSize: CanvasSize
  vp: ViewportInfo
  isConical: boolean
  omega: number
  showVectors: boolean
  conical: ConicalPendulumState
  disk: DiskRotationState
  thetaSmooth: number
  radiusSmooth: number
  projected: ProjectedState
  tangent: { x: number; y: number }
  tangentNorm: number
  velocityLength: number
  gForceLength: number
  gravityVec: { x: number; y: number }
  vecData: VecData
  diskLines: Array<{ x: number; y: number }>
}

export function useCircularModelsPhysics(): CircularModelsPhysicsResult {
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitH })
  const time = useAnimationStore((s) => s.time)
  const params = useAnimationStore((s) => s.params)
  const showVectors = useAnimationStore((s) => s.showVectors)
  const isPlaying = useAnimationStore((s) => s.isPlaying)

  const mode = params.modelMode ?? 0
  const omega = params.omega ?? 3
  const length = params.L ?? 1
  const radius = params.r ?? 0.8
  const mu = params.mu ?? 0.4
  const phase = omega * time

  const conical = useMemo(
    () => calculateConicalPendulumState(omega, length, MASS_KG),
    [omega, length],
  )
  const disk = useMemo(
    () => calculateDiskRotationState(omega, radius, mu, MASS_KG),
    [omega, radius, mu],
  )

  const isConical = mode === 0

  // ─── 惯性物理缓动（Lerp） ───
  const lastTimeRef = useRef(time)
  const thetaSmoothRef = useRef(isConical ? conical.thetaRad : 0)
  const radiusSmoothRef = useRef(radius)

  if (isPlaying) {
    const dt = Math.max(0, Math.min(0.1, time - lastTimeRef.current))
    const lerpFactor = 1 - Math.exp(-6 * dt) // 缓动阻尼系统

    const targetTheta = isConical ? conical.thetaRad : 0
    thetaSmoothRef.current += (targetTheta - thetaSmoothRef.current) * lerpFactor

    if (!isConical && !disk.slipping) {
      radiusSmoothRef.current += (radius - radiusSmoothRef.current) * lerpFactor
    }
  } else {
    // 暂停状态下瞬时改变参数以方便调试
    thetaSmoothRef.current = isConical ? conical.thetaRad : 0
    if (!isConical && !disk.slipping) {
      radiusSmoothRef.current = radius
    }
  }
  lastTimeRef.current = time

  const thetaSmooth = thetaSmoothRef.current
  const radiusSmooth = radiusSmoothRef.current

  // ─── 圆锥摆 / 旋转圆盘 质点坐标与状态机 ───
  const projected = useMemo(() => {
    if (isConical) {
      const orbitRadiusPx = SCENE.lengthPx * Math.sin(thetaSmooth)
      const stringProjectedPx = SCENE.lengthPx * Math.cos(thetaSmooth)
      const x = SCENE.centerX + orbitRadiusPx * Math.cos(phase)
      const y = SCENE.pivotY + stringProjectedPx - orbitRadiusPx * SCENE.projectionDepth * Math.sin(phase)
      return {
        x,
        y,
        orbitRadiusPx,
        orbitY: SCENE.pivotY + stringProjectedPx,
        opacity: 1.0,
        isFlownOut: false,
      }
    }

    // 旋转圆盘：计算打滑螺旋平抛轨迹
    const slipState = calculateDiskSlippingState(time, omega, radiusSmooth, mu, MASS_KG)

    // 物理 1m 映射为 66 像素
    const physScale = SCENE.diskRadiusPx / 2.0
    const x = SCENE.centerX + slipState.x * physScale
    const y = SCENE.diskCenterY - slipState.y * physScale * SCENE.projectionDepth - slipState.z * physScale

    return {
      x,
      y,
      orbitRadiusPx: slipState.radius * physScale,
      orbitY: SCENE.diskCenterY,
      opacity: slipState.opacity,
      isFlownOut: slipState.isFlownOut,
      slipState,
    }
  }, [isConical, thetaSmooth, phase, radiusSmooth, omega, mu, time])


  // ─── 矢量方向与长度计算（像素空间） ───
  const tangent = {
    x: -Math.sin(phase),
    y: -SCENE.projectionDepth * Math.cos(phase),
  }
  const tangentNorm = Math.hypot(tangent.x, tangent.y) || 1

  // 速度矢量：1m/s 对应 15px
  const currentR = isConical ? length * Math.sin(thetaSmooth) : radiusSmooth
  const speedVal = omega * currentR
  const velocityLength = clamp(speedVal * 15, 28, 86)

  // ─── 力的合成与分析数据准备 ───
  // 力 1N 对应 6px 长度
  const gForceVal = MASS_KG * 9.8
  const gForceLength = gForceVal * 6 // 58.8px

  // 重力在画布上永远竖直向下
  const gravityVec = pixelVector(0, 1)

  // 用于计算矢量引线
  const vecData = useMemo(() => {
    if (isConical) {
      // 摆线方向
      const dxLine = SCENE.centerX - projected.x
      const dyLine = SCENE.pivotY - projected.y
      const normLine = Math.hypot(dxLine, dyLine) || 1
      const tensionVec = pixelVector(dxLine / normLine, dyLine / normLine)

      const cosTheta = Math.cos(thetaSmooth)
      const tensionVal = cosTheta > 0.05 ? gForceVal / cosTheta : gForceVal
      const tensionLength = clamp(tensionVal * 6, 24, 110)

      // 合力（向心力）：水平指向旋转轴
      const dxCentrip = SCENE.centerX - projected.x
      const centripVec = pixelVector(dxCentrip > 0 ? 1 : -1, 0)
      const centripVal = gForceVal * Math.tan(thetaSmooth)
      const centripLength = clamp(centripVal * 6, 0, 110)

      // 平行四边形辅助点（重力终点和拉力终点）
      // 拉力的画布偏移
      const tOffX = (dxLine / normLine) * tensionLength
      const tOffY = (dyLine / normLine) * tensionLength

      // 合力（向心力）的画布偏移
      const cOffX = (dxCentrip > 0 ? 1 : -1) * centripLength

      return {
        tensionVec,
        tensionLength,
        centripVec,
        centripLength,
        // 平行四边形虚线端点
        tOffX,
        tOffY,
        cOffX,
      }
    } else {
      // 水平圆盘模式
      const state = projected.slipState
      const fLength = state ? state.friction * 6 : 0
      const nLength = state ? state.normalForce * 6 : 0

      // 摩擦力指向转轴
      const dxCenter = SCENE.centerX - projected.x
      const dyCenter = SCENE.diskCenterY - projected.y
      const normCenter = Math.hypot(dxCenter, dyCenter) || 1
      const frictionVec = pixelVector(dxCenter / normCenter, dyCenter / normCenter)

      // 支持力竖直向上
      const normalVec = pixelVector(0, -1)

      return {
        frictionVec,
        frictionLength: fLength,
        normalVec,
        normalLength: nLength,
      }
    }
  }, [isConical, projected, thetaSmooth, gForceVal])

  // 3D 旋转盘表面的 3 条径向标记线旋转相位
  const diskLines = useMemo(() => {
    return Array.from({ length: 3 }).map((_, idx) => {
      const angle = phase + (idx * 2 * Math.PI) / 3
      return {
        x: SCENE.centerX + SCENE.diskRadiusPx * Math.cos(angle),
        y: SCENE.diskCenterY - SCENE.diskRadiusPx * SCENE.projectionDepth * Math.sin(angle),
      }
    })
  }, [phase])

  return {
    containerRef,
    canvasSize,
    vp,
    isConical,
    omega,
    showVectors,
    conical,
    disk,
    thetaSmooth,
    radiusSmooth,
    projected,
    tangent,
    tangentNorm,
    velocityLength,
    gForceLength,
    gravityVec,
    vecData,
    diskLines,
  }
}
