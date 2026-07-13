import { useMemo } from 'react'
import { physicsToCanvas } from '@/utils/coordinate'
import { PHYSICS_COLORS } from '@/theme/physics'
import { GRAVITY } from '@/physics/constants'

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

export function useOrthogonalDecompositionPhysics({
  f1, theta1, f2, theta2, f3, theta3, axisAngle,
  theta, m, axisSelect,
  mode, canvasWidth, canvasHeight, scale
}: UseOrthogonalDecompositionPhysicsProps): OrthogonalDecompositionPhysicsData {
  return useMemo(() => {
    // 定义原点（Canvas 中心）
    const origin = physicsToCanvas(0, 0, canvasWidth, canvasHeight, scale)

    // ==========================================
    // 模式 0：多力合成与建系优化
    // ==========================================
    const axisAngleRad = (axisAngle * Math.PI) / 180

    // 计算单个力在标准系和旋转坐标系下的分量和坐标
    const computeForce = (name: string, fVal: number, thetaDeg: number, color: string): ForceData => {
      const rad = (thetaDeg * Math.PI) / 180
      const fx = fVal * Math.cos(rad)
      const fy = fVal * Math.sin(rad)

      // 投影到旋转坐标系的值：F_x' = F * cos(θ - θ_axis), F_y' = F * sin(θ - θ_axis)
      const relRad = rad - axisAngleRad
      const fxPrime = fVal * Math.cos(relRad)
      const fyPrime = fVal * Math.sin(relRad)

      // 直接使用物理分量进行绘图（与 VectorAdditionPhysics 保持一致）
      const fxPhys = fVal * Math.cos(rad)
      const fyPhys = fVal * Math.sin(rad)
      const fxPrimePhys = fVal * Math.cos(relRad)
      const fyPrimePhys = fVal * Math.sin(relRad)

      // 物理投影坐标转为标准系坐标
      // x'轴上的投影点标准物理坐标为 (F_x' * cos(θ_axis), F_x' * sin(θ_axis))
      const projX_physX = fxPrimePhys * Math.cos(axisAngleRad)
      const projX_physY = fxPrimePhys * Math.sin(axisAngleRad)
      // y'轴上的投影点标准物理坐标为 (-F_y' * sin(θ_axis), F_y' * cos(θ_axis))
      const projY_physX = -fyPrimePhys * Math.sin(axisAngleRad)
      const projY_physY = fyPrimePhys * Math.cos(axisAngleRad)

      return {
        name,
        val: fVal,
        angle: thetaDeg,
        color,
        fx,
        fy,
        fxPrime,
        fyPrime,
        end: physicsToCanvas(fxPhys, fyPhys, canvasWidth, canvasHeight, scale),
        xProjEnd: physicsToCanvas(projX_physX, projX_physY, canvasWidth, canvasHeight, scale),
        yProjEnd: physicsToCanvas(projY_physX, projY_physY, canvasWidth, canvasHeight, scale)
      }
    }

    const F1_data = computeForce('F₁', f1, theta1, PHYSICS_COLORS.forceNet)
    const F2_data = computeForce('F₂', f2, theta2, PHYSICS_COLORS.appliedForce)
    const F3_data = computeForce('F₃', f3, theta3, PHYSICS_COLORS.tension)

    // 计算总合力
    const netFx = F1_data.fx + F2_data.fx + F3_data.fx
    const netFy = F1_data.fy + F2_data.fy + F3_data.fy
    const netVal = Math.sqrt(netFx * netFx + netFy * netFy)
    let netAngle = (Math.atan2(netFy, netFx) * 180) / Math.PI
    if (netAngle < 0) netAngle += 360

    const netFxPrime = F1_data.fxPrime + F2_data.fxPrime + F3_data.fxPrime
    const netFyPrime = F1_data.fyPrime + F2_data.fyPrime + F3_data.fyPrime

    // 直接使用物理分量进行绘图
    const netFxPhys = netVal * Math.cos(netAngle * Math.PI / 180)
    const netFyPhys = netVal * Math.sin(netAngle * Math.PI / 180)

    const netFxPrimePhys = netVal * Math.cos((netAngle * Math.PI / 180) - axisAngleRad)
    const netFyPrimePhys = netVal * Math.sin((netAngle * Math.PI / 180) - axisAngleRad)

    const projNetX_physX = netFxPrimePhys * Math.cos(axisAngleRad)
    const projNetX_physY = netFxPrimePhys * Math.sin(axisAngleRad)
    const projNetY_physX = -netFyPrimePhys * Math.sin(axisAngleRad)
    const projNetY_physY = netFyPrimePhys * Math.cos(axisAngleRad)

    const netForce = {
      val: netVal,
      angle: netAngle,
      fx: netFx,
      fy: netFy,
      fxPrime: netFxPrime,
      fyPrime: netFyPrime,
      end: physicsToCanvas(netFxPhys, netFyPhys, canvasWidth, canvasHeight, scale),
      xProjEnd: physicsToCanvas(projNetX_physX, projNetX_physY, canvasWidth, canvasHeight, scale),
      yProjEnd: physicsToCanvas(projNetY_physX, projNetY_physY, canvasWidth, canvasHeight, scale)
    }

    // ==========================================
    // 模式 1：斜面平衡建系对比
    // ==========================================
    const slopeAngleRad = (theta * Math.PI) / 180
    const gravityVal = m * GRAVITY
    const normalVal = gravityVal * Math.cos(slopeAngleRad)
    const frictionVal = gravityVal * Math.sin(slopeAngleRad)

    // 斜面中心即力作用点，放置在偏左上一点，方便在右下和四周绘制受力
    const BLOCK_CENTER_PHYS = { x: -2, y: 1 } as const
    const blockCenterPhys = BLOCK_CENTER_PHYS
    const blockCenter = physicsToCanvas(blockCenterPhys.x, blockCenterPhys.y, canvasWidth, canvasHeight, scale)

    // 方案A建系旋转角为斜面倾角 -θ，方案B建系旋转角为 0
    const currentAxisAngle = axisSelect === 0 ? -theta : 0
    const currentAxisAngleRad = (currentAxisAngle * Math.PI) / 180

    // 根据滑块半高 18px 动态计算物理平移量，防止滑块穿透斜面
    const BLOCK_HALF_HEIGHT_PX = 18 // Block 组件 height=36 的一半
    const blockHalfHeightPhys = BLOCK_HALF_HEIGHT_PX / scale
    const verticalOffset = blockHalfHeightPhys / Math.cos(slopeAngleRad)

    // 斜面几何计算
    // 斜面是一直角三角形，斜边通过滑块下方
    const INCLINE_PHYSICAL_LENGTH = 12 // 斜面物理长度 (m)
    const inclineLength = INCLINE_PHYSICAL_LENGTH
    const slideW = inclineLength * Math.cos(slopeAngleRad)
    const slideH = inclineLength * Math.sin(slopeAngleRad)
    // 确定斜面左下端点位置
    const slopeLeftPhys = {
      x: blockCenterPhys.x - (inclineLength / 2) * Math.cos(slopeAngleRad),
      y: blockCenterPhys.y - (inclineLength / 2) * Math.sin(slopeAngleRad) - verticalOffset
    }
    const slopeLeft = physicsToCanvas(slopeLeftPhys.x, slopeLeftPhys.y, canvasWidth, canvasHeight, scale)
    const slopeRight = physicsToCanvas(slopeLeftPhys.x + slideW, slopeLeftPhys.y, canvasWidth, canvasHeight, scale)
    const slopeTop = physicsToCanvas(slopeLeftPhys.x, slopeLeftPhys.y + slideH, canvasWidth, canvasHeight, scale)
    const slopePoints = `${slopeLeft.cx},${slopeLeft.cy} ${slopeRight.cx},${slopeRight.cy} ${slopeLeft.cx},${slopeTop.cy} ${slopeLeft.cx},${slopeLeft.cy}`

    // 滑块位置（滑块受力中心即 blockCenter）
    const thetaG = 270
    const thetaFN = 90 - theta
    const thetaF = 180 - theta

    const computeSlopeForce = (name: string, fVal: number, thetaDeg: number, color: string): ForceData => {
      const rad = (thetaDeg * Math.PI) / 180
      const fx = fVal * Math.cos(rad)
      const fy = fVal * Math.sin(rad)

      const relRad = rad - currentAxisAngleRad
      const fxPrime = fVal * Math.cos(relRad)
      const fyPrime = fVal * Math.sin(relRad)

      // 直接使用物理分量进行绘图（与 VectorAdditionPhysics 保持一致）
      const fxPhys = fVal * Math.cos(rad)
      const fyPhys = fVal * Math.sin(rad)
      const fxPrimePhys = fVal * Math.cos(relRad)
      const fyPrimePhys = fVal * Math.sin(relRad)

      const projX_physX = fxPrimePhys * Math.cos(currentAxisAngleRad)
      const projX_physY = fxPrimePhys * Math.sin(currentAxisAngleRad)
      const projY_physX = -fyPrimePhys * Math.sin(currentAxisAngleRad)
      const projY_physY = fyPrimePhys * Math.cos(currentAxisAngleRad)

      // 力从 blockCenterPhys 出发
      const endPhys = { x: blockCenterPhys.x + fxPhys, y: blockCenterPhys.y + fyPhys }
      const projXPhys = { x: blockCenterPhys.x + projX_physX, y: blockCenterPhys.y + projX_physY }
      const projYPhys = { x: blockCenterPhys.x + projY_physX, y: blockCenterPhys.y + projY_physY }

      return {
        name,
        val: fVal,
        angle: thetaDeg,
        color,
        fx,
        fy,
        fxPrime,
        fyPrime,
        end: physicsToCanvas(endPhys.x, endPhys.y, canvasWidth, canvasHeight, scale),
        xProjEnd: physicsToCanvas(projXPhys.x, projXPhys.y, canvasWidth, canvasHeight, scale),
        yProjEnd: physicsToCanvas(projYPhys.x, projYPhys.y, canvasWidth, canvasHeight, scale)
      }
    }

    const G_data = computeSlopeForce('G', gravityVal, thetaG, PHYSICS_COLORS.gravity) // 重力
    const FN_data = computeSlopeForce('FN', normalVal, thetaFN, PHYSICS_COLORS.normalForce) // 支持力
    const f_data = computeSlopeForce('f', frictionVal, thetaF, PHYSICS_COLORS.friction) // 摩擦力

    return {
      mode,
      origin,
      forces: [F1_data, F2_data, F3_data],
      netForce,
      axisAngleRad,
      slopeAngleRad,
      gravityVal,
      normalVal,
      frictionVal,
      slopeForces: {
        G: G_data,
        FN: FN_data,
        f: f_data
      },
      slopeGeom: {
        x0: slopeLeft.cx,
        y0: slopeLeft.cy,
        slideW: Math.abs(slopeRight.cx - slopeLeft.cx),
        slideH: Math.abs(slopeLeft.cy - slopeTop.cy),
        inclineLength: Math.hypot(slopeRight.cx - slopeLeft.cx, slopeLeft.cy - slopeTop.cy),
        slopePoints,
        blockCenter
      }
    }
  }, [f1, theta1, f2, theta2, f3, theta3, axisAngle, theta, m, axisSelect, mode, canvasWidth, canvasHeight, scale])
}
