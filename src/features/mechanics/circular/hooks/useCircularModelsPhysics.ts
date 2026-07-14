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
import { calculateVectorPixelLength } from '@/utils/vectorLength'

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

/** 矢量归一化的参考量级配置 */
const VECTOR_REF_MAGNITUDES: Partial<Record<string, number>> = {
  velocity: 8,
  gravity: 10,
  tension: 16,
  force: 10,
  normalForce: 10,
  friction: 10,
}

const MAX_VECTOR_LENGTH = 120

/** 物理矢量场景缩放参数（供 PhysicsVectorArrow 使用） */
export const vectorSceneScale: SceneScale = {
  originX: 0,
  originY: 0,
  scaleX: 1,
  scaleY: 1,
  scale: 1,
  maxVectorLength: MAX_VECTOR_LENGTH,
  refMagnitudes: VECTOR_REF_MAGNITUDES,
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
  centripVec?: { x: number; y: number }
  tOffX?: number
  tOffY?: number
  cOffX?: number
  /** 重力箭头渲染长度（设计坐标像素，供平行四边形辅助线使用） */
  gForceRenderLength?: number
  // Rotating disk
  frictionVec?: { x: number; y: number }
  normalVec?: { x: number; y: number }
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
  velocityVec: { x: number; y: number }
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


  // ─── 矢量方向与物理量级计算 ───
  const tangent = {
    x: -Math.sin(phase),
    y: -SCENE.projectionDepth * Math.cos(phase),
  }
  const tangentNorm = Math.hypot(tangent.x, tangent.y) || 1

  // 速度矢量：方向沿投影切线，大小为物理速率
  const currentR = isConical ? length * Math.sin(thetaSmooth) : radiusSmooth
  const speedVal = omega * currentR
  const velocityVec = { x: (tangent.x / tangentNorm) * speedVal, y: -(tangent.y / tangentNorm) * speedVal }

  // ─── 力的合成与分析数据准备 ───
  const gForceVal = MASS_KG * 9.8

  // 重力：竖直向下，大小为 mg
  const gravityVec = { x: 0, y: -gForceVal }

  // 用于计算矢量引线
  const vecData = useMemo(() => {
    if (isConical) {
      // 摆线方向（设计坐标空间）
      const dxLine = SCENE.centerX - projected.x
      const dyLine = SCENE.pivotY - projected.y
      const normLine = Math.hypot(dxLine, dyLine) || 1

      const cosTheta = Math.cos(thetaSmooth)
      const tensionVal = cosTheta > 0.05 ? gForceVal / cosTheta : gForceVal
      // 张力矢量：方向沿绳索向上，大小为物理拉力
      const tensionVec = { x: (dxLine / normLine) * tensionVal, y: -(dyLine / normLine) * tensionVal }

      // 合力（向心力）：水平指向旋转轴
      const dxCentrip = SCENE.centerX - projected.x
      const centripVal = gForceVal * Math.tan(thetaSmooth)
      const centripVec = { x: (dxCentrip > 0 ? 1 : -1) * centripVal, y: 0 }

      // 平行四边形辅助点：通过 calculateVectorPixelLength 计算渲染长度
      const tensionLength = calculateVectorPixelLength(tensionVal, 'tension', MAX_VECTOR_LENGTH, VECTOR_REF_MAGNITUDES.tension ?? 0)
      const centripLength = calculateVectorPixelLength(centripVal, 'force', MAX_VECTOR_LENGTH, VECTOR_REF_MAGNITUDES.force ?? 0)
      const gForceRenderLength = calculateVectorPixelLength(gForceVal, 'gravity', MAX_VECTOR_LENGTH, VECTOR_REF_MAGNITUDES.gravity ?? 0)

      // 拉力的画布偏移
      const tOffX = (dxLine / normLine) * tensionLength
      const tOffY = (dyLine / normLine) * tensionLength

      // 合力（向心力）的画布偏移
      const cOffX = (dxCentrip > 0 ? 1 : -1) * centripLength

      return {
        tensionVec,
        centripVec,
        // 平行四边形虚线端点
        tOffX,
        tOffY,
        cOffX,
        gForceRenderLength: gForceRenderLength,
      }
    } else {
      // 水平圆盘模式
      const state = projected.slipState
      const frictionVal = state ? state.friction : 0
      const normalVal = state ? state.normalForce : 0

      // 摩擦力指向转轴，大小为物理摩擦力
      const dxCenter = SCENE.centerX - projected.x
      const dyCenter = SCENE.diskCenterY - projected.y
      const normCenter = Math.hypot(dxCenter, dyCenter) || 1
      const frictionVec = { x: (dxCenter / normCenter) * frictionVal, y: -(dyCenter / normCenter) * frictionVal }

      // 支持力竖直向上，大小为物理支持力
      const normalVec = { x: 0, y: normalVal }

      return {
        frictionVec,
        normalVec,
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
    velocityVec,
    gravityVec,
    vecData,
    diskLines,
  }
}
