import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useSimulationFrame } from '@/utils/animation'
import {
  simulateEquilibriumStep,
  calculateTheoreticalEquilibriumPos,
  EQUIL_L,
} from '@/physics/dynamics'
import { GRAVITY } from '@/physics/constants'
import { computeScale } from '@/utils/coordinate'

interface UseEquilibriumPhysicsProps {
  m: number
  theta1: number // 左绳夹角 (度)
  theta2: number // 右绳夹角 (度)
  mode: number   // 0 = 基础悬挂, 1 = 平行四边形, 2 = 正交分解, 3 = 封闭三角形
  canvasWidth: number
  canvasHeight: number
  isPlaying: boolean
  time: number
}

export interface EquilibriumPhysicsData {
  leftAnchor: { cx: number; cy: number }
  rightAnchor: { cx: number; cy: number }
  ballCenter: { cx: number; cy: number }
  t1: number
  t2: number
  gravity: number
  isOverloaded: boolean
  brokenLine: 'none' | 'left' | 'right' | 'both'
  
  // 力的 Canvas 起止点
  gStart: { cx: number; cy: number }
  gEnd: { cx: number; cy: number }
  t1Start: { cx: number; cy: number }
  t1End: { cx: number; cy: number }
  t2Start: { cx: number; cy: number }
  t2End: { cx: number; cy: number }
  fNetEnd: { cx: number; cy: number }

  // 正交分解投影分力端点
  t1xEnd: { cx: number; cy: number }
  t1yEnd: { cx: number; cy: number }
  t2xEnd: { cx: number; cy: number }
  t2yEnd: { cx: number; cy: number }

  // 三力闭合三角形
  triOrigin: { cx: number; cy: number }
  triGEnd: { cx: number; cy: number }
  triT1End: { cx: number; cy: number }
  triT2End: { cx: number; cy: number }

  // 角度扇形弧线
  leftArcPath: string
  rightArcPath: string
  leftTextPos: { cx: number; cy: number }
  rightTextPos: { cx: number; cy: number }

  // 控制方法
  startDrag: (clientX: number, clientY: number, svgElement: SVGSVGElement | null) => void
  updateDragMouse: (clientX: number, clientY: number, svgElement: SVGSVGElement | null) => void
  endDrag: () => void
  resetPhysics: () => void
}

export function useEquilibriumPhysics({
  m,
  theta1,
  theta2,
  canvasWidth,
  canvasHeight,
  time,
}: UseEquilibriumPhysicsProps): EquilibriumPhysicsData {
  const { updateParam } = useAnimationStore()

  // 1. 定义物理状态 (实际位置、速度、断线状态、张力)
  const [physState, setPhysState] = useState({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    brokenLine: 'none' as 'none' | 'left' | 'right' | 'both',
    isDragging: false,
    t1: 0,
    t2: 0,
  })

  // 2. 使用 ref 记录最新状态，确保 requestAnimationFrame 帧内计算无过期闭包
  const stateRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    brokenLine: 'none' as 'none' | 'left' | 'right' | 'both',
    isDragging: false,
    mouseX: 0,
    mouseY: 0,
    t1: 0,
    t2: 0,
  })

  // 3. 计算固定悬挂梁和悬挂点
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2 - 45
  const leftAnchor = useMemo(() => ({ cx: centerX - EQUIL_L / 2, cy: centerY - 90 }), [centerX, centerY])
  const rightAnchor = useMemo(() => ({ cx: centerX + EQUIL_L / 2, cy: centerY - 90 }), [centerX, centerY])

  // 4. 监听外部滑块改变。在非拖拽且未断绳时，让小球位置立刻同步到理论平衡点，确保滑块调节的顺畅感。
  useEffect(() => {
    if (!physState.isDragging && physState.brokenLine === 'none' && canvasWidth > 0) {
      const eq = calculateTheoreticalEquilibriumPos(theta1, theta2, centerX, leftAnchor.cy)
      stateRef.current.x = eq.cx
      stateRef.current.y = eq.cy
      stateRef.current.vx = 0
      stateRef.current.vy = 0
      setPhysState(prev => ({
        ...prev,
        x: eq.cx,
        y: eq.cy,
        vx: 0,
        vy: 0,
      }))
    }
  }, [theta1, theta2, m, canvasWidth, canvasHeight, leftAnchor.cy, centerX, centerY])

  // 5. 帧更新动力学物理引擎 (通过 useSimulationFrame 统一 rAF 入口，纯计算由 physics/ 提供)
  useSimulationFrame(
    (deltaTimeMs) => {
      if (canvasWidth === 0) return

      let dt = deltaTimeMs / 1000
      if (dt > 0.03) dt = 0.03

      const state = stateRef.current

      // 调用 src/physics/dynamics 纯函数执行单步积分
      const result = simulateEquilibriumStep(
        {
          x: state.x,
          y: state.y,
          vx: state.vx,
          vy: state.vy,
          brokenLine: state.brokenLine,
        },
        {
          m,
          theta1,
          theta2,
          canvasHeight,
          leftAnchor,
          rightAnchor,
          centerX,
          isDragging: state.isDragging,
          mouseX: state.mouseX,
          mouseY: state.mouseY,
        },
        dt
      )

      const { state: next, t1, t2 } = result
      let nextX = next.x
      let nextY = next.y
      let vx = next.vx
      let vy = next.vy
      const nextBroken = next.brokenLine

      // 拖动时实时反解夹角，同步通知 Zustand
      if (state.isDragging) {
        const dyLeft = nextY - leftAnchor.cy
        const dxLeft = nextX - leftAnchor.cx
        const dyRight = nextY - rightAnchor.cy
        const dxRight = rightAnchor.cx - nextX

        if (dyLeft > 10 && dyRight > 10 && dxLeft > 10 && dxRight > 10) {
          let nextTheta1 = (Math.atan2(dyLeft, dxLeft) * 180) / Math.PI
          let nextTheta2 = (Math.atan2(dyRight, dxRight) * 180) / Math.PI

          nextTheta1 = Math.max(10, Math.min(85, nextTheta1))
          nextTheta2 = Math.max(10, Math.min(85, nextTheta2))

          updateParam('theta1', Math.round(nextTheta1))
          updateParam('theta2', Math.round(nextTheta2))
        }
      }

      // 写入 ref 并触发渲染
      stateRef.current = {
        ...state,
        x: nextX,
        y: nextY,
        vx,
        vy,
        brokenLine: nextBroken,
        t1,
        t2,
      }

      setPhysState({
        x: nextX,
        y: nextY,
        vx,
        vy,
        brokenLine: nextBroken,
        isDragging: state.isDragging,
        t1,
        t2,
      })
    },
    { maxDeltaMs: 30 }
  )

  // 6. 手势直接拖拽回调
  const startDrag = useCallback((clientX: number, clientY: number, svgElement: SVGSVGElement | null) => {
    if (!svgElement) return
    const rect = svgElement.getBoundingClientRect()
    const cx = clientX - rect.left
    const cy = clientY - rect.top

    stateRef.current.isDragging = true
    stateRef.current.mouseX = cx
    stateRef.current.mouseY = cy
    setPhysState(prev => ({ ...prev, isDragging: true }))
  }, [])

  const updateDragMouse = useCallback((clientX: number, clientY: number, svgElement: SVGSVGElement | null) => {
    if (!stateRef.current.isDragging || !svgElement) return
    const rect = svgElement.getBoundingClientRect()
    const cx = clientX - rect.left
    const cy = clientY - rect.top

    stateRef.current.mouseX = cx
    stateRef.current.mouseY = cy
  }, [])

  const endDrag = useCallback(() => {
    stateRef.current.isDragging = false
    setPhysState(prev => ({ ...prev, isDragging: false }))
  }, [])

  const resetPhysics = useCallback(() => {
    stateRef.current.brokenLine = 'none'
    stateRef.current.vx = 0
    stateRef.current.vy = 0
    stateRef.current.t1 = 0
    stateRef.current.t2 = 0
    const eq = calculateTheoreticalEquilibriumPos(theta1, theta2, centerX, leftAnchor.cy)
    stateRef.current.x = eq.cx
    stateRef.current.y = eq.cy

    setPhysState({
      x: eq.cx,
      y: eq.cy,
      vx: 0,
      vy: 0,
      brokenLine: 'none',
      isDragging: false,
      t1: 0,
      t2: 0,
    })
  }, [theta1, theta2, centerX, leftAnchor.cy])

  // 监听外部时间重置 (左屏批量重置时 time === 0)
  useEffect(() => {
    if (time === 0) {
      resetPhysics()
    }
  }, [time, resetPhysics])

  // 7. 用物理解算出的位置和受力大小，换算渲染用矢量终点坐标
  return useMemo(() => {
    const ballCenter = { cx: physState.x, cy: physState.y }

    // 夹角计算 (物理极坐标)
    const dx1 = leftAnchor.cx - ballCenter.cx
    const dy1 = leftAnchor.cy - ballCenter.cy
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1
    const u1 = { x: dx1 / len1, y: dy1 / len1 }

    const dx2 = rightAnchor.cx - ballCenter.cx
    const dy2 = rightAnchor.cy - ballCenter.cy
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1
    const u2 = { x: dx2 / len2, y: dy2 / len2 }

    // 张力直接使用 simulateEquilibriumStep 返回值
    const t1 = physState.t1
    const t2 = physState.t2

    const gravity = m * GRAVITY
    const isOverloaded = t1 > 35 || t2 > 35

    // 动态 forceScale：以 T1/T2 定 scale，G 超出画布时由 clamp 兜底
    const maxTension = Math.max(t1, t2, 1)
    const maxDistDown = canvasHeight - 10 - ballCenter.cy   // 向下可用空间
    const maxDistUp = ballCenter.cy - 10                     // 向上可用空间
    const maxDistSide = Math.min(ballCenter.cx - 10, canvasWidth - 10 - ballCenter.cx) // 水平可用空间
    const maxDist = Math.max(maxDistDown, maxDistUp, maxDistSide, 50)
    const baseScale = computeScale(canvasWidth, canvasHeight, { xMin: -3, xMax: 3, yMin: -3, yMax: 3 }) * 0.4
    const forceScale = Math.min(baseScale, maxDist / maxTension * 0.75)

    // 矢量 Canvas 起止点
    const gStart = ballCenter
    const gEnd = { cx: ballCenter.cx, cy: ballCenter.cy + gravity * forceScale }

    const t1Start = ballCenter
    const t1End = { cx: ballCenter.cx + u1.x * t1 * forceScale, cy: ballCenter.cy + u1.y * t1 * forceScale }

    const t2Start = ballCenter
    const t2End = { cx: ballCenter.cx + u2.x * t2 * forceScale, cy: ballCenter.cy + u2.y * t2 * forceScale }

    // 力的平行四边形合力
    const fNetEnd = {
      cx: ballCenter.cx + (u1.x * t1 + u2.x * t2) * forceScale,
      cy: ballCenter.cy + (u1.y * t1 + u2.y * t2) * forceScale,
    }

    // 正交分解分量投影端点
    const t1xEnd = { cx: ballCenter.cx + u1.x * t1 * forceScale, cy: ballCenter.cy }
    const t1yEnd = { cx: ballCenter.cx, cy: ballCenter.cy + u1.y * t1 * forceScale }
    const t2xEnd = { cx: ballCenter.cx + u2.x * t2 * forceScale, cy: ballCenter.cy }
    const t2yEnd = { cx: ballCenter.cx, cy: ballCenter.cy + u2.y * t2 * forceScale }

    // 三力首尾封闭三角形
    const triOrigin = { cx: centerX + 170, cy: centerY + 60 }
    const triGEnd = { cx: triOrigin.cx, cy: triOrigin.cy + gravity * forceScale }
    const triT1End = { cx: triGEnd.cx + u1.x * t1 * forceScale, cy: triGEnd.cy + u1.y * t1 * forceScale }
    const triT2End = { cx: triT1End.cx + u2.x * t2 * forceScale, cy: triT1End.cy + u2.y * t2 * forceScale }

    // 角度弧线计算
    const arcR = canvasWidth * 0.04
    const textR = canvasWidth * 0.06
    const t1Rad = Math.atan2(dy1, dx1)
    const t2Rad = Math.atan2(dy2, -dx2)

    const leftArcPath = `M ${ballCenter.cx - arcR} ${ballCenter.cy} A ${arcR} ${arcR} 0 0 1 ${ballCenter.cx - arcR * Math.cos(t1Rad)} ${ballCenter.cy - arcR * Math.sin(t1Rad)}`
    const leftTextPos = {
      cx: ballCenter.cx - textR * Math.cos(t1Rad / 2),
      cy: ballCenter.cy - textR * Math.sin(t1Rad / 2),
    }

    const rightArcPath = `M ${ballCenter.cx + arcR} ${ballCenter.cy} A ${arcR} ${arcR} 0 0 0 ${ballCenter.cx + arcR * Math.cos(t2Rad)} ${ballCenter.cy - arcR * Math.sin(t2Rad)}`
    const rightTextPos = {
      cx: ballCenter.cx + textR * Math.cos(t2Rad / 2),
      cy: ballCenter.cy - textR * Math.sin(t2Rad / 2),
    }

    return {
      leftAnchor,
      rightAnchor,
      ballCenter,
      t1,
      t2,
      gravity,
      isOverloaded,
      brokenLine: physState.brokenLine,
      gStart,
      gEnd,
      t1Start,
      t1End,
      t2Start,
      t2End,
      fNetEnd,
      t1xEnd,
      t1yEnd,
      t2xEnd,
      t2yEnd,
      triOrigin,
      triGEnd,
      triT1End,
      triT2End,
      leftArcPath,
      rightArcPath,
      leftTextPos,
      rightTextPos,
      startDrag,
      updateDragMouse,
      endDrag,
      resetPhysics,
    }
  }, [
    physState.x,
    physState.y,
    physState.brokenLine,
    physState.t1,
    physState.t2,
    leftAnchor,
    rightAnchor,
    m,
    theta1,
    theta2,
    centerX,
    centerY,
    startDrag,
    updateDragMouse,
    endDrag,
    resetPhysics,
    canvasWidth,
    canvasHeight,
  ])
}
