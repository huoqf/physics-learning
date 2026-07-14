/**
 * useSuspendedPlatePhysics.ts — 悬挂薄板重心物理计算 hook
 *
 * 从 GravityBasicAnimation.tsx 拆分：薄板重心与悬挂平衡的所有物理计算。
 */
import { useMemo } from 'react'

// 定义悬挂薄板的本地顶点
export const PLATE_VERTICES = [
  { x: -70, y: -45 },
  { x: 65, y: -55 },
  { x: 85, y: 35 },
  { x: -15, y: 75 },
  { x: -85, y: 25 }
]

// 定义 3 个悬挂孔的本地坐标
export const HANGER_HOLES = [
  { x: -50, y: -25 },
  { x: 45, y: -35 },
  { x: 55, y: 15 }
]

// 未加配重时薄板的本地重心
export const BASE_CENTER = { x: 5, y: 5 }

interface UseSuspendedPlatePhysicsParams {
  activeHoleIdx: number
  showWeight: number
  weightX: number
  weightY: number
  weightMass: number
  time: number
  cx: number
  cy: number
}

export const useSuspendedPlatePhysics = ({
  activeHoleIdx,
  showWeight,
  weightX,
  weightY,
  weightMass,
  time,
  cx,
  cy,
}: UseSuspendedPlatePhysicsParams) => {
  return useMemo(() => {
    // 钉子在 Canvas 上的固定坐标
    const pinX = cx
    const pinY = cy - 60

    // 计算当前系统的本地重心坐标 (考虑配重)
    let localCenterX = BASE_CENTER.x
    let localCenterY = BASE_CENTER.y

    if (showWeight === 1) {
      const totalMass = 1.0 + weightMass
      localCenterX = (BASE_CENTER.x * 1.0 + weightX * weightMass) / totalMass
      localCenterY = (BASE_CENTER.y * 1.0 + weightY * weightMass) / totalMass
    }

    const localCenter = { x: localCenterX, y: localCenterY }
    const hole = HANGER_HOLES[activeHoleIdx]

    // 本地向量：从悬挂孔指向重心
    const dx = localCenter.x - hole.x
    const dy = localCenter.y - hole.y
    const theta0 = Math.atan2(dy, dx) // 初始本地夹角

    // 平衡状态下，重心必须在悬挂孔正下方，即旋转后向量角度为 Math.PI / 2
    const targetRotation = Math.PI / 2 - theta0

    // ── 模拟物理阻尼摆动 ──
    const omega = 4.2  // 摆动频率
    const gamma = 0.75 // 阻尼系数
    const initAmplitude = 1.1 // 初始最大偏角 (rad)
    
    // 使用正弦阻尼衰减函数计算当前旋转角度
    const swingAngle = initAmplitude * Math.exp(-gamma * time) * Math.cos(omega * time)
    const currentRotation = targetRotation + swingAngle

    // 坐标变换函数：将本地坐标点转换为当前 Canvas 坐标点
    const toCanvasCoords = (pt: { x: number; y: number }) => {
      // 绕悬挂孔 H 旋转
      const rx = (pt.x - hole.x) * Math.cos(currentRotation) - (pt.y - hole.y) * Math.sin(currentRotation)
      const ry = (pt.x - hole.x) * Math.sin(currentRotation) + (pt.y - hole.y) * Math.cos(currentRotation)
      return {
        cx: pinX + rx,
        cy: pinY + ry
      }
    }

    // 旋转后的薄板顶点
    const canvasVertices = PLATE_VERTICES.map(toCanvasCoords)
    // 旋转后的重心
    const canvasCenter = toCanvasCoords(localCenter)
    // 旋转后的三个孔
    const canvasHoles = HANGER_HOLES.map(toCanvasCoords)
    // 旋转后的配重位置
    const canvasWeight = toCanvasCoords({ x: weightX, y: weightY })

    // 计算三个孔在板的本地坐标系中，通过孔 H_k 到重心 C 的射线。
    // 在平衡时，这条射线必然在 Canvas 中垂直向下。这就是我们要画的悬挂线。
    const getLocalPlumbLine = (idx: number) => {
      const hPt = HANGER_HOLES[idx]
      // 射线方向向量：从悬挂孔指向重心
      const vX = localCenter.x - hPt.x
      const vY = localCenter.y - hPt.y
      const len = Math.sqrt(vX * vX + vY * vY)
      if (len === 0) return { x1: hPt.x, y1: hPt.y, x2: hPt.x, y2: hPt.y }
      
      // 沿射线方向向两端延伸
      return {
        x1: hPt.x - (vX / len) * 40,
        y1: hPt.y - (vY / len) * 40,
        x2: hPt.x + (vX / len) * 200,
        y2: hPt.y + (vY / len) * 200
      }
    }

    const localPlumbLines = HANGER_HOLES.map((_, idx) => getLocalPlumbLine(idx))
    const canvasPlumbLines = localPlumbLines.map((line) => {
      const pt1 = toCanvasCoords({ x: line.x1, y: line.y1 })
      const pt2 = toCanvasCoords({ x: line.x2, y: line.y2 })
      return { x1: pt1.cx, y1: pt1.cy, x2: pt2.cx, y2: pt2.cy }
    })

    return {
      pinX, pinY,
      canvasVertices,
      canvasCenter,
      canvasHoles,
      canvasWeight,
      canvasPlumbLines,
      currentRotation,
      isSettled: Math.exp(-gamma * time) < 0.05 // 是否已经基本静止
    }
  }, [activeHoleIdx, showWeight, weightX, weightY, weightMass, time, cx, cy])
}
