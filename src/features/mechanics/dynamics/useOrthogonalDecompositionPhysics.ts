import { useMemo } from 'react'
import { physicsToCanvas } from '@/utils/coordinate'
import { PHYSICS_COLORS } from '@/theme/physics'
import {
  computeOrthogonalDecomposition,
  type ForcePhysicsData,
  type SlopeForcePhysicsData,
} from './model/orthogonalDecompositionViewModel'

interface UseOrthogonalDecompositionPhysicsProps {
  // 模式 0 专用
  f1: number
  theta1: number
  f2: number
  theta2: number
  f3: number
  theta3: number
  axisAngle: number

  // 模式 1 专用
  theta: number
  m: number
  axisSelect: number

  mode: number // 0 = 多力合成与建系优化, 1 = 斜面平衡建系对比
  canvasWidth: number
  canvasHeight: number
  scale: number
}

export interface ForceData {
  name: string
  val: number
  angle: number
  color: string
  // 标准物理分量
  fx: number
  fy: number
  // 投影到旋转坐标系的分量
  fxPrime: number
  fyPrime: number
  // Canvas 坐标端点
  end: { cx: number; cy: number }
  // Canvas 投影坐标端点
  xProjEnd: { cx: number; cy: number }
  yProjEnd: { cx: number; cy: number }
}

export interface OrthogonalDecompositionPhysicsData {
  mode: number
  origin: { cx: number; cy: number }

  // 模式 0 数据
  forces: ForceData[]
  netForce: {
    val: number
    angle: number
    fx: number
    fy: number
    fxPrime: number
    fyPrime: number
    end: { cx: number; cy: number }
    xProjEnd: { cx: number; cy: number }
    yProjEnd: { cx: number; cy: number }
  }
  axisAngleRad: number

  // 模式 1 数据
  slopeAngleRad: number
  gravityVal: number
  normalVal: number
  frictionVal: number
  slopeForces: {
    G: ForceData
    FN: ForceData
    f: ForceData
  }
  // 用于绘制斜面辅助几何
  slopeGeom: {
    x0: number
    y0: number
    slideW: number
    slideH: number
    inclineLength: number
    slopePoints: string // polyline 顶点
    blockCenter: { cx: number; cy: number }
  }
}

/** 将 ForcePhysicsData 映射到 Canvas 坐标 */
function physicsToForceData(
  p: ForcePhysicsData,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  color: string,
): ForceData {
  return {
    name: p.name,
    val: p.val,
    angle: p.angle,
    color,
    fx: p.fx,
    fy: p.fy,
    fxPrime: p.fxPrime,
    fyPrime: p.fyPrime,
    end: physicsToCanvas(p.endPhys.x, p.endPhys.y, canvasWidth, canvasHeight, scale),
    xProjEnd: physicsToCanvas(p.xProjPhys.x, p.xProjPhys.y, canvasWidth, canvasHeight, scale),
    yProjEnd: physicsToCanvas(p.yProjPhys.x, p.yProjPhys.y, canvasWidth, canvasHeight, scale),
  }
}

/** 将 SlopeForcePhysicsData 映射到 Canvas 坐标（从 blockCenter 出发） */
function slopePhysicsToForceData(
  p: SlopeForcePhysicsData,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  color: string,
): ForceData {
  return {
    name: p.name,
    val: p.val,
    angle: p.angle,
    color,
    fx: p.fx,
    fy: p.fy,
    fxPrime: p.fxPrime,
    fyPrime: p.fyPrime,
    end: physicsToCanvas(p.endPhysFromBlock.x, p.endPhysFromBlock.y, canvasWidth, canvasHeight, scale),
    xProjEnd: physicsToCanvas(p.xProjPhysFromBlock.x, p.xProjPhysFromBlock.y, canvasWidth, canvasHeight, scale),
    yProjEnd: physicsToCanvas(p.yProjPhysFromBlock.x, p.yProjPhysFromBlock.y, canvasWidth, canvasHeight, scale),
  }
}

const FORCE_COLORS = [PHYSICS_COLORS.forceNet, PHYSICS_COLORS.appliedForce, PHYSICS_COLORS.tension]

export function useOrthogonalDecompositionPhysics({
  f1, theta1, f2, theta2, f3, theta3, axisAngle,
  theta, m, axisSelect,
  mode, canvasWidth, canvasHeight, scale
}: UseOrthogonalDecompositionPhysicsProps): OrthogonalDecompositionPhysicsData {
  return useMemo(() => {
    // 1. 纯物理计算（无 Canvas 依赖）
    const physics = computeOrthogonalDecomposition({
      f1, theta1, f2, theta2, f3, theta3, axisAngle,
      theta, m, axisSelect,
      mode,
    })

    // 2. 映射到 Canvas 坐标
    const origin = physicsToCanvas(0, 0, canvasWidth, canvasHeight, scale)

    const forces = physics.forces.map((f, i) =>
      physicsToForceData(f, canvasWidth, canvasHeight, scale, FORCE_COLORS[i]),
    )

    const netForce = {
      ...physicsToForceData(physics.netForce, canvasWidth, canvasHeight, scale, PHYSICS_COLORS.forceNet),
      color: PHYSICS_COLORS.forceNet,
    }

    const slopeForces = {
      G: slopePhysicsToForceData(physics.slopeForces.G, canvasWidth, canvasHeight, scale, PHYSICS_COLORS.gravity),
      FN: slopePhysicsToForceData(physics.slopeForces.FN, canvasWidth, canvasHeight, scale, PHYSICS_COLORS.normalForce),
      f: slopePhysicsToForceData(physics.slopeForces.f, canvasWidth, canvasHeight, scale, PHYSICS_COLORS.friction),
    }

    const slopeLeft = physicsToCanvas(
      physics.slopeGeom.slopeLeftPhys.x, physics.slopeGeom.slopeLeftPhys.y,
      canvasWidth, canvasHeight, scale,
    )
    const slopeRight = physicsToCanvas(
      physics.slopeGeom.slopeLeftPhys.x + physics.slopeGeom.slideW, physics.slopeGeom.slopeLeftPhys.y,
      canvasWidth, canvasHeight, scale,
    )
    const slopeTop = physicsToCanvas(
      physics.slopeGeom.slopeLeftPhys.x, physics.slopeGeom.slopeLeftPhys.y + physics.slopeGeom.slideH,
      canvasWidth, canvasHeight, scale,
    )
    const blockCenter = physicsToCanvas(
      physics.slopeGeom.blockCenterPhys.x, physics.slopeGeom.blockCenterPhys.y,
      canvasWidth, canvasHeight, scale,
    )

    const slopeGeom = {
      x0: slopeLeft.cx,
      y0: slopeLeft.cy,
      slideW: Math.abs(slopeRight.cx - slopeLeft.cx),
      slideH: Math.abs(slopeLeft.cy - slopeTop.cy),
      inclineLength: Math.hypot(slopeRight.cx - slopeLeft.cx, slopeLeft.cy - slopeTop.cy),
      slopePoints: `${slopeLeft.cx},${slopeLeft.cy} ${slopeRight.cx},${slopeRight.cy} ${slopeLeft.cx},${slopeTop.cy} ${slopeLeft.cx},${slopeLeft.cy}`,
      blockCenter,
    }

    return {
      mode,
      origin,
      forces,
      netForce,
      axisAngleRad: physics.axisAngleRad,
      slopeAngleRad: physics.slopeAngleRad,
      gravityVal: physics.gravityVal,
      normalVal: physics.normalVal,
      frictionVal: physics.frictionVal,
      slopeForces,
      slopeGeom,
    }
  }, [f1, theta1, f2, theta2, f3, theta3, axisAngle, theta, m, axisSelect, mode, canvasWidth, canvasHeight, scale])
}
