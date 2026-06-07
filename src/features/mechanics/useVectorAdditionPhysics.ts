import { useMemo } from 'react'
import { calculateVectorAddition, calculateOrthogonalDecomposition } from '@/physics'
import { physicsToCanvas } from '@/utils/coordinate'

interface UseVectorAdditionPhysicsProps {
  f1: number
  f2: number
  angle: number
  mode: number // 0 = 平行四边形, 1 = 三角形, 2 = 正交分解
  canvasWidth: number
  canvasHeight: number
  scale: number
  time: number
  isPlaying: boolean
}

export interface VectorAdditionPhysicsData {
  // 基础力学参数
  f1Val: number
  f2Val: number
  angleVal: number
  fResultant: number
  resultAngleDeg: number
  
  // 物理坐标系原点 Canvas 坐标
  origin: { cx: number; cy: number }
  
  // 各力的终点 Canvas 坐标
  f1End: { cx: number; cy: number }
  f2End: { cx: number; cy: number }
  fResultantEnd: { cx: number; cy: number }
  
  // 辅助几何线段 Canvas 坐标
  f1ToResultant: { x1: number; y1: number; x2: number; y2: number }
  f2ToResultant: { x1: number; y1: number; x2: number; y2: number }
  
  // 三角形定则平移后 F2 的 Canvas 坐标
  f2ShiftedStart: { cx: number; cy: number }
  f2ShiftedEnd: { cx: number; cy: number }
  
  // 正交分解分量 Canvas 坐标
  fxEnd: { cx: number; cy: number }
  fyEnd: { cx: number; cy: number }
  fxProj: { x1: number; y1: number; x2: number; y2: number }
  fyProj: { x1: number; y1: number; x2: number; y2: number }

  // 正交分解分量数值（合成模式下为 0）
  fxVal: number
  fyVal: number

  // 弧线与标注
  thetaArcPath: string
  thetaTextPos: { cx: number; cy: number }
  alphaArcPath: string
  alphaTextPos: { cx: number; cy: number }
}

/**
 * 力的合成与分解物理计算包装 Hook
 * 遵循项目规范：包装、组合和缓存 physics/ 的纯计算结果，严禁包含 JSX 与直接操作 DOM
 */
export function useVectorAdditionPhysics({
  f1,
  f2,
  angle,
  mode,
  canvasWidth,
  canvasHeight,
  scale,
  time,
  isPlaying,
}: UseVectorAdditionPhysicsProps): VectorAdditionPhysicsData {
  return useMemo(() => {
    // 1. 底层物理计算
    const addition = calculateVectorAddition(f1, f2, angle)
    const decomp = calculateOrthogonalDecomposition(f1, angle) // 正交分解中，f1 充当合力

    // 2. 坐标原点
    const origin = physicsToCanvas(0, 0, canvasWidth, canvasHeight, scale)

    // 3. 计算各矢量及辅助点坐标
    let f1End = { cx: 0, cy: 0 }
    let f2End = { cx: 0, cy: 0 }
    let fResultantEnd = { cx: 0, cy: 0 }
    let f1ToResultant = { x1: 0, y1: 0, x2: 0, y2: 0 }
    let f2ToResultant = { x1: 0, y1: 0, x2: 0, y2: 0 }
    
    let f2ShiftedStart = { cx: 0, cy: 0 }
    let f2ShiftedEnd = { cx: 0, cy: 0 }
    
    let fxEnd = { cx: 0, cy: 0 }
    let fyEnd = { cx: 0, cy: 0 }
    let fxProj = { x1: 0, y1: 0, x2: 0, y2: 0 }
    let fyProj = { x1: 0, y1: 0, x2: 0, y2: 0 }

    const angleRad = (angle * Math.PI) / 180

    if (mode === 2) {
      // ===== 正交分解模式 =====
      // 此时 f1 充当合力，angle 充当合力方向角
      fResultantEnd = physicsToCanvas(decomp.fx, decomp.fy, canvasWidth, canvasHeight, scale)
      
      // 分量端点
      fxEnd = physicsToCanvas(decomp.fx, 0, canvasWidth, canvasHeight, scale)
      fyEnd = physicsToCanvas(0, decomp.fy, canvasWidth, canvasHeight, scale)

      // 投影虚线
      fxProj = {
        x1: fResultantEnd.cx,
        y1: fResultantEnd.cy,
        x2: fxEnd.cx,
        y2: fxEnd.cy,
      }
      fyProj = {
        x1: fResultantEnd.cx,
        y1: fResultantEnd.cy,
        x2: fyEnd.cx,
        y2: fyEnd.cy,
      }
    } else {
      // ===== 力的合成模式（平行四边形 / 三角形）=====
      f1End = physicsToCanvas(addition.fx1, addition.fy1, canvasWidth, canvasHeight, scale)
      f2End = physicsToCanvas(addition.fx2, addition.fy2, canvasWidth, canvasHeight, scale)
      fResultantEnd = physicsToCanvas(addition.fx, addition.fy, canvasWidth, canvasHeight, scale)

      // 平行四边形辅助线
      f1ToResultant = {
        x1: f1End.cx,
        y1: f1End.cy,
        x2: fResultantEnd.cx,
        y2: fResultantEnd.cy,
      }
      f2ToResultant = {
        x1: f2End.cx,
        y1: f2End.cy,
        x2: fResultantEnd.cx,
        y2: fResultantEnd.cy,
      }

      // 三角形定则平移动画控制
      // 引入时间控制平移动效，若在播放，在 1.5 秒内平移闭合
      const animDuration = 1.5
      let progress = 0
      if (mode === 1) {
        if (isPlaying) {
          // 在 1.5s 周期内循环或单次播放平移
          progress = Math.min(1, (time % animDuration) / animDuration)
        } else {
          progress = 1 // 暂停时默认已平移到位
        }
      }

      // 平移后 F2 的起止点：起点从 (0,0) 平移到 F1 的终点 (fx1, fy1)
      const currentShiftX = addition.fx1 * progress
      const currentShiftY = addition.fy1 * progress
      
      f2ShiftedStart = physicsToCanvas(currentShiftX, currentShiftY, canvasWidth, canvasHeight, scale)
      f2ShiftedEnd = physicsToCanvas(
        addition.fx2 + currentShiftX,
        addition.fy2 + currentShiftY,
        canvasWidth,
        canvasHeight,
        scale
      )
    }

    // 4. 夹角弧线与度数文本坐标计算
    // 夹角 θ 弧线（分力 F1 与 F2 的夹角，正交分解时为 F 与 X 轴正半轴夹角）
    let thetaArcPath = ''
    const arcRadius = 35
    const textRadius = 50
    let thetaTextPos = { cx: origin.cx + textRadius, cy: origin.cy }
    
    // 合力方向角 α 弧线（仅合成模式下且 theta != 0 时渲染）
    let alphaArcPath = ''
    const alphaArcRadius = 22
    const alphaTextRadius = 38
    let alphaTextPos = { cx: origin.cx, cy: origin.cy }

    if (mode === 2) {
      // 正交分解：画合力与 X 轴夹角
      if (angle > 0) {
        const thetaRad = angleRad
        const startX = origin.cx + arcRadius
        const startY = origin.cy
        const endX = origin.cx + arcRadius * Math.cos(thetaRad)
        const endY = origin.cy - arcRadius * Math.sin(thetaRad)
        thetaArcPath = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 0 ${endX} ${endY}`

        // 文字摆放夹角中心
        const midTheta = thetaRad / 2
        thetaTextPos = {
          cx: origin.cx + textRadius * Math.cos(midTheta),
          cy: origin.cy - textRadius * Math.sin(midTheta),
        }
      }
    } else {
      // 力的合成：分力夹角 θ
      if (angle > 0) {
        const startX = origin.cx + arcRadius
        const startY = origin.cy
        const endX = origin.cx + arcRadius * Math.cos(angleRad)
        const endY = origin.cy - arcRadius * Math.sin(angleRad)
        thetaArcPath = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 0 ${endX} ${endY}`

        const midTheta = angleRad / 2
        thetaTextPos = {
          cx: origin.cx + textRadius * Math.cos(midTheta),
          cy: origin.cy - textRadius * Math.sin(midTheta),
        }
      }

      // 合力方向角 α
      const alphaRad = (addition.resultAngleDeg * Math.PI) / 180
      if (addition.resultAngleDeg > 1 && angle > 0) {
        const startX = origin.cx + alphaArcRadius
        const startY = origin.cy
        const endX = origin.cx + alphaArcRadius * Math.cos(alphaRad)
        const endY = origin.cy - alphaArcRadius * Math.sin(alphaRad)
        alphaArcPath = `M ${startX} ${startY} A ${alphaArcRadius} ${alphaArcRadius} 0 0 0 ${endX} ${endY}`

        const midAlpha = alphaRad / 2
        alphaTextPos = {
          cx: origin.cx + alphaTextRadius * Math.cos(midAlpha),
          cy: origin.cy - alphaTextRadius * Math.sin(midAlpha),
        }
      }
    }

    return {
      f1Val: f1,
      f2Val: f2,
      angleVal: angle,
      fResultant: addition.fResultant,
      resultAngleDeg: addition.resultAngleDeg,
      fxVal: mode === 2 ? decomp.fx : 0,
      fyVal: mode === 2 ? decomp.fy : 0,
      origin,
      f1End,
      f2End,
      fResultantEnd,
      f1ToResultant,
      f2ToResultant,
      f2ShiftedStart,
      f2ShiftedEnd,
      fxEnd,
      fyEnd,
      fxProj,
      fyProj,
      thetaArcPath,
      thetaTextPos,
      alphaArcPath,
      alphaTextPos,
    }
  }, [f1, f2, angle, mode, canvasWidth, canvasHeight, scale, time, isPlaying])
}
