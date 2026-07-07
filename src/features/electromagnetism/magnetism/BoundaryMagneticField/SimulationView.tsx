
import { useEffect, useRef, useMemo, useCallback } from 'react'
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE, withAlpha } from '@/theme/physics'
import { createSceneScale, worldToPixel } from '@/scene'
import type { SceneConfig } from '@/scene'
import { setupCanvasDPR, useDevicePixelRatio } from '@/hooks/useCanvasDPR'
import {
  calcParticleRadius,
  calcParticlePeriod,
  calculateDoubleBoundaryExit,
  calculateCircularBoundaryExit,
} from '@/physics'
import { VectorArrow, drawMagneticFieldGrid } from '@/components/Physics'

export function SimulationView() {
  useDevicePixelRatio()
  const [sizeRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.square)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)

  const mode = params.mode ?? 0 // 0: 基础, 1: 进阶
  const boundaryType = params.boundaryType ?? 0 // 0: 单边界, 1: 双平行边界, 2: 圆形边界
  const dynamicType = params.dynamicType ?? 0 // 0: 旋转圆, 1: 缩放圆, 2: 平移圆

  const q = params.q ?? 1
  const m = params.m ?? 1
  const v = params.v ?? 12
  const B = params.B ?? 1.2
  const bDirection = params.bDirection ?? 1 // 1=向里⊗, -1=向外⊙
  const effectiveB = B * bDirection // 物理计算和渲染用的实际 B 值（含方向）
  const thetaParam = params.theta ?? 60
  const d = params.magneticWidth ?? 5.0
  const Rb = params.magneticRadius ?? 4.0
  const showGeometry = params.showGeometry === 1
  const showArc = params.showArc === 1
  const showEnvelope = params.showEnvelope === 1

  // 进阶模式下，不同极值模型强制对应的边界环境，与高考考点高度对齐
  const activeBoundaryType = mode === 0 ? boundaryType : (
    dynamicType === 0 ? 0 : // 旋转圆 -> 单边界
    dynamicType === 1 ? 1 : // 缩放圆 -> 双平行边界
    0 // 平移圆 -> 单边界
  )

  // 基础模式可调夹角，圆形磁场强制径向入射
  const activeTheta = activeBoundaryType === 2 ? 90 : thetaParam

  const R = calcParticleRadius(m, v, q, effectiveB)
  const sign = (q * effectiveB) >= 0 ? -1 : 1

  // 计算焦点粒子在磁场中偏转的时间 tOut
  const tOut = useMemo(() => {
    if (activeBoundaryType === 0) {
      const thetaRad = (activeTheta * Math.PI) / 180
      const deltaPhi = sign === -1 ? 2 * thetaRad : 2 * (Math.PI - thetaRad)
      const T = calcParticlePeriod(m, q, effectiveB)
      return T > 0 ? (deltaPhi / (2 * Math.PI)) * T : 0
    } else if (activeBoundaryType === 1) {
      return calculateDoubleBoundaryExit(q, m, v, effectiveB, activeTheta, d).t
    } else {
      return calculateCircularBoundaryExit(q, m, v, effectiveB, Rb).t
    }
  }, [q, m, v, effectiveB, activeTheta, activeBoundaryType, d, Rb, sign])

  const tSlideIn = 0.5 * tOut
  const tSlideOut = 1.0 * tOut
  const tCycle = tSlideIn + tOut + tSlideOut

  // 映射时间进度
  const progressTime = time > 0 ? (time % tCycle) - tSlideIn : -tSlideIn

  // 物理配置：固定比例尺，禁止随参数缩放
  const sceneConfig: SceneConfig = useMemo(() => {
    // 圆形边界：固定场景宽度，Rb 变化时圆的大小自然变化（符合物理直觉）
    // 其他边界：以磁场宽度 d 为基准
    const wWidth = activeBoundaryType === 2 ? 50 : Math.max(1.0, d * 4.8)
    const wHeight = canvasSize.width > 0 ? wWidth * (canvasSize.height / canvasSize.width) : 4.0

    return {
      vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
      originX: canvasSize.width / 2,
      originY: activeBoundaryType === 2 ? canvasSize.height * 0.78 : canvasSize.height * 0.70,
      worldWidth: wWidth,
      worldHeight: wHeight,
      refMagnitudes: {
        force: 25,
        velocity: 45,
        lorentzForce: 25,
      },
    }
  }, [canvasSize, activeBoundaryType, d])

  // ⚠️ [架构豁免] 原生 Canvas 直绘，不走 useViewport，合法保留底层 createSceneScale 调用
  const sceneScale = createSceneScale(sceneConfig)

  // 统一的单粒子轨迹及物理状态求解函数
  const getParticleState = useCallback((
    tVal: number,
    initX: number = 0,
    initY: number = 0,
    vVal: number = v,
    thetaDeg: number = activeTheta
  ) => {
    const thetaRad = (thetaDeg * Math.PI) / 180
    const signVal = (q * effectiveB) >= 0 ? -1 : 1
    const omega = Math.abs((q * effectiveB) / m)
    const Rp = calcParticleRadius(m, vVal, q, effectiveB)

    let tOutVal = 0
    let xOut = 0
    let yOut = 0
    let vxOut = 0
    let vyOut = 0

    if (activeBoundaryType === 0) {
      // 单边界
      const deltaPhi = signVal === -1 ? 2 * thetaRad : 2 * (Math.PI - thetaRad)
      const T = calcParticlePeriod(m, q, effectiveB)
      tOutVal = T > 0 ? (deltaPhi / (2 * Math.PI)) * T : 0

      const cxAngle = thetaRad + signVal * Math.PI / 2
      xOut = initX + 2 * Rp * Math.cos(cxAngle)
      yOut = 0
      const exitAngle = thetaRad + signVal * deltaPhi
      vxOut = vVal * Math.cos(exitAngle)
      vyOut = vVal * Math.sin(exitAngle)
    } else if (activeBoundaryType === 1) {
      // 双平行边界
      const res = calculateDoubleBoundaryExit(q, m, vVal, effectiveB, thetaDeg, d)
      tOutVal = res.t
      xOut = initX + res.x
      yOut = res.y
      vxOut = res.vx
      vyOut = res.vy
    } else {
      // 圆形边界
      const res = calculateCircularBoundaryExit(q, m, vVal, effectiveB, Rb)
      tOutVal = res.t
      xOut = initX + res.x
      yOut = res.y
      vxOut = res.vx
      vyOut = res.vy
    }

    const cxAngle = thetaRad + signVal * Math.PI / 2
    const xc = initX + Rp * Math.cos(cxAngle)
    const yc = initY + Rp * Math.sin(cxAngle)
    const theta0 = Math.atan2(initY - yc, initX - xc)

    let px = 0
    let py = 0
    let vx = vVal * Math.cos(thetaRad)
    let vy = vVal * Math.sin(thetaRad)

    if (tVal < 0) {
      px = initX + vVal * tVal * Math.cos(thetaRad)
      py = initY + vVal * tVal * Math.sin(thetaRad)
    } else if (tVal <= tOutVal) {
      const curAngle = theta0 + signVal * omega * tVal
      px = xc + Rp * Math.cos(curAngle)
      py = yc + Rp * Math.sin(curAngle)
      const velocityAngle = curAngle + signVal * Math.PI / 2
      vx = vVal * Math.cos(velocityAngle)
      vy = vVal * Math.sin(velocityAngle)
    } else {
      const dt = tVal - tOutVal
      px = xOut + vxOut * dt
      py = yOut + vyOut * dt
      vx = vxOut
      vy = vyOut
    }

    return { px, py, vx, vy, tOut: tOutVal, xOut, yOut, xc, yc, R: Rp }
  }, [q, m, effectiveB, v, activeTheta, activeBoundaryType, d, Rb])

  // 进阶模式下，生成多粒子粒子族数据
  const particleFamily = useMemo(() => {
    if (mode === 0) return []

    const list = []
    if (dynamicType === 0) {
      // 旋转圆：同速不同向
      const angles = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165]
      // 去重添加焦点粒子
      const uniqueAngles = Array.from(new Set([...angles, activeTheta])).sort((a, b) => a - b)
      for (const ang of uniqueAngles) {
        list.push({
          initX: 0,
          vVal: v,
          theta: ang,
          isFocus: ang === activeTheta
        })
      }
    } else if (dynamicType === 1) {
      // 缩放圆：同向不同速
      const speeds = [v * 0.4, v * 0.6, v * 0.8, v * 1.0, v * 1.2, v * 1.4, v * 1.6]
      const uniqueSpeeds = Array.from(new Set([...speeds, v])).sort((a, b) => a - b)
      for (const spd of uniqueSpeeds) {
        list.push({
          initX: 0,
          vVal: spd,
          theta: activeTheta,
          isFocus: Math.abs(spd - v) < 1e-3
        })
      }
    } else {
      // 平移圆：同速同向不同入射点
      const positions = [-2.0 * R, -1.3 * R, -0.6 * R, 0, 0.6 * R, 1.3 * R, 2.0 * R]
      for (const pos of positions) {
        list.push({
          initX: pos,
          vVal: v,
          theta: activeTheta,
          isFocus: pos === 0
        })
      }
    }
    return list
  }, [mode, dynamicType, v, activeTheta, R])

  useEffect(() => {
    const ctx = setupCanvasDPR(canvasRef, canvasSize.width, canvasSize.height)
    if (!ctx) return

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
    const { font } = canvasSize

    // 绘制磁场区域底色与符号网格
    const { py: bStartY } = worldToPixel(0, 0, sceneScale)

    ctx.save()
    if (activeBoundaryType === 0) {
      // 单边界：y > 0 的半平面
      ctx.fillStyle = PHYSICS_COLORS.magneticField
      ctx.globalAlpha = 0.04
      ctx.fillRect(0, 0, canvasSize.width, bStartY)
      ctx.restore()

      drawMagneticFieldGrid(ctx, { x: 0, y: 0, w: canvasSize.width, h: bStartY, B: effectiveB })

      // 绘制单边界线
      ctx.beginPath()
      ctx.moveTo(0, bStartY)
      ctx.lineTo(canvasSize.width, bStartY)
      ctx.strokeStyle = PHYSICS_COLORS.magneticField
      ctx.lineWidth = 2
      ctx.stroke()

      // 边界文字
      ctx.fillStyle = PHYSICS_COLORS.labelText
      ctx.font = `${font(CANVAS_STYLE.font.labelSize)}px sans-serif`
      ctx.fillText('磁场边界 y = 0', 16, bStartY + 18)
    } else if (activeBoundaryType === 1) {
      // 平行双边界：0 < y < d
      const { py: bEndY } = worldToPixel(0, d, sceneScale)
      ctx.fillStyle = PHYSICS_COLORS.magneticField
      ctx.globalAlpha = 0.04
      ctx.fillRect(0, bEndY, canvasSize.width, bStartY - bEndY)
      ctx.restore()

      drawMagneticFieldGrid(ctx, { x: 0, y: bEndY, w: canvasSize.width, h: bStartY - bEndY, B: effectiveB })

      // 下边界线
      ctx.beginPath()
      ctx.moveTo(0, bStartY)
      ctx.lineTo(canvasSize.width, bStartY)
      ctx.strokeStyle = PHYSICS_COLORS.magneticField
      ctx.lineWidth = 2
      ctx.stroke()

      // 上边界线
      ctx.beginPath()
      ctx.moveTo(0, bEndY)
      ctx.lineTo(canvasSize.width, bEndY)
      ctx.strokeStyle = PHYSICS_COLORS.magneticField
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = PHYSICS_COLORS.labelText
      ctx.font = `${font(CANVAS_STYLE.font.labelSize)}px sans-serif`
      ctx.fillText('磁场边界 y = 0', 16, bStartY + 18)
      ctx.fillText(`磁场边界 y = d (${d.toFixed(1)}m)`, 16, bEndY - 8)
    } else {
      // 圆形边界：圆心在 (0, Rb)，半径为 Rb
      const { px: bcx, py: bcy } = worldToPixel(0, Rb, sceneScale)
      const rPx = Rb * sceneScale.scale

      // 剪切磁场符号与背景
      ctx.save()
      ctx.beginPath()
      ctx.arc(bcx, bcy, rPx, 0, 2 * Math.PI)
      ctx.clip()

      ctx.fillStyle = PHYSICS_COLORS.magneticField
      ctx.globalAlpha = 0.04
      ctx.fillRect(bcx - rPx, bcy - rPx, rPx * 2, rPx * 2)

      drawMagneticFieldGrid(ctx, {
        x: bcx - rPx,
        y: bcy - rPx,
        w: rPx * 2,
        h: rPx * 2,
        B: effectiveB
      })
      ctx.restore()

      // 绘制磁场圆周边界
      ctx.beginPath()
      ctx.arc(bcx, bcy, rPx, 0, 2 * Math.PI)
      ctx.strokeStyle = PHYSICS_COLORS.magneticField
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = PHYSICS_COLORS.labelText
      ctx.font = `${font(CANVAS_STYLE.font.labelSize)}px sans-serif`
      ctx.fillText(`圆形磁场 (R_b = ${Rb.toFixed(1)}m)`, bcx - rPx + 8, bcy - rPx - 8)
    }

    // 绘制非焦点粒子的淡色虚线轨迹 (仅在进阶多解模式下)
    if (mode === 1) {
      particleFamily.forEach((part) => {
        if (part.isFocus) return // 焦点粒子下面单独高亮绘制
        
        // 采样画出完整偏转轨迹圆
        const pState = getParticleState(0, part.initX, 0, part.vVal, part.theta)
        const { px: cx, py: cy } = worldToPixel(pState.xc, pState.yc, sceneScale)
        const rpPx = pState.R * sceneScale.scale

        ctx.beginPath()
        ctx.arc(cx, cy, rpPx, 0, 2 * Math.PI)
        ctx.strokeStyle = withAlpha(PHYSICS_COLORS.negativeCharge, 0.12)
        ctx.setLineDash([2, 3])
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
      })

      // 绘制旋转圆特有的包络圆和圆心轨迹
      if (dynamicType === 0 && showEnvelope) {
        const { px: ox, py: oy } = worldToPixel(0, 0, sceneScale)
        
        // 包络圆（半径为 2R 的半圆）
        ctx.beginPath()
        ctx.arc(ox, oy, 2 * R * sceneScale.scale, Math.PI, 2 * Math.PI)
        ctx.fillStyle = withAlpha(PHYSICS_COLORS.appliedForce, 0.04)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(ox, oy, 2 * R * sceneScale.scale, Math.PI, 2 * Math.PI)
        ctx.strokeStyle = PHYSICS_COLORS.appliedForce
        ctx.setLineDash([6, 4])
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.setLineDash([])

        // 圆心轨迹（以原点为圆心，半径为 R 的半圆）
        ctx.beginPath()
        ctx.arc(ox, oy, R * sceneScale.scale, Math.PI, 2 * Math.PI)
        ctx.strokeStyle = PHYSICS_COLORS.lorentzForce
        ctx.setLineDash([3, 3])
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // 绘制焦点粒子相关的辅助线（几何定理可视化）
    const focusState = getParticleState(progressTime, 0, 0, v, activeTheta)
    
    if (showGeometry && mode === 0) {
      const { px: ox, py: oy } = worldToPixel(0, 0, sceneScale)
      const { px: cx, py: cy } = worldToPixel(focusState.xc, focusState.yc, sceneScale)
      const { px: ex, py: ey } = worldToPixel(focusState.xOut, focusState.yOut, sceneScale)

      ctx.save()
      ctx.strokeStyle = PHYSICS_COLORS.axis
      ctx.lineWidth = 1.2
      ctx.setLineDash([4, 4])

      // 1. 绘制轨迹圆心 O
      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, 2 * Math.PI)
      ctx.fillStyle = PHYSICS_COLORS.labelText
      ctx.fill()
      ctx.font = `bold ${font(11)}px sans-serif`
      ctx.fillText('O', cx + 6, cy + 4)

      // 2. 连接圆心到入射点、出射点的半径线
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(ox, oy)
      ctx.moveTo(cx, cy)
      ctx.lineTo(ex, ey)
      ctx.stroke()

      // 3. 连弦线
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.lineTo(ex, ey)
      ctx.strokeStyle = withAlpha(PHYSICS_COLORS.appliedForce, 0.7)
      ctx.stroke()

      // 弦上文字标注 L
      ctx.fillStyle = PHYSICS_COLORS.appliedForce
      ctx.fillText('弦 L', (ox + ex) / 2 - 8, (oy + ey) / 2 - 8)

      // 半径标注 R
      ctx.fillStyle = PHYSICS_COLORS.negativeCharge
      ctx.fillText('R', (cx + ox) / 2 + 8, (cy + oy) / 2 + 8)

      // 4. 显示圆心角高亮扇形
      if (showArc) {
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        const startAngle = Math.atan2(oy - cy, ox - cx)
        const deltaPhiVal = sign === -1 ? 2 * (activeTheta * Math.PI) / 180 : 2 * (Math.PI - (activeTheta * Math.PI) / 180)
        const endAngle = startAngle + sign * deltaPhiVal
        ctx.arc(cx, cy, R * sceneScale.scale, startAngle, endAngle, sign < 0)
        ctx.lineTo(cx, cy)
        ctx.fillStyle = withAlpha(PHYSICS_COLORS.positiveCharge, 0.08)
        ctx.fill()
      }

      ctx.restore()
    }

    // 绘制焦点粒子的主轨迹圆
    const { px: fcx, py: fcy } = worldToPixel(focusState.xc, focusState.yc, sceneScale)
    ctx.beginPath()
    ctx.arc(fcx, fcy, R * sceneScale.scale, 0, 2 * Math.PI)
    ctx.strokeStyle = PHYSICS_COLORS.positiveCharge
    ctx.setLineDash([4, 4])
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.setLineDash([])

    // 绘制粒子并渲染彗星拖尾
    const drawParticle = (part: { initX: number; vVal: number; theta: number; isFocus: boolean }) => {
      const pState = getParticleState(progressTime, part.initX, 0, part.vVal, part.theta)
      const { px: pX, py: pY } = worldToPixel(pState.px, pState.py, sceneScale)

      // 拖尾
      const tailPoints = []
      const tailDuration = pState.tOut * 0.35
      const steps = 18
      for (let i = 0; i <= steps; i++) {
        const tSample = progressTime - tailDuration * (1 - i / steps)
        if (tSample >= -tSlideIn) {
          const tState = getParticleState(tSample, part.initX, 0, part.vVal, part.theta)
          const { px: sX, py: sY } = worldToPixel(tState.px, tState.py, sceneScale)
          tailPoints.push({ x: sX, y: sY, alpha: i / steps })
        }
      }

      if (tailPoints.length > 1) {
        ctx.save()
        for (let i = 1; i < tailPoints.length; i++) {
          const p1 = tailPoints[i - 1]
          const p2 = tailPoints[i]
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.strokeStyle = part.isFocus ? PHYSICS_COLORS.positiveCharge : withAlpha(PHYSICS_COLORS.negativeCharge, 0.3)
          ctx.globalAlpha = p1.alpha * (part.isFocus ? 0.6 : 0.25)
          ctx.lineWidth = CANVAS_STYLE.object.pointMassRadius * (part.isFocus ? 0.7 : 0.4) * p1.alpha
          ctx.stroke()
        }
        ctx.restore()
      }

      // 本体球体
      ctx.beginPath()
      ctx.arc(pX, pY, part.isFocus ? CANVAS_STYLE.object.pointMassRadius : CANVAS_STYLE.object.pointMassRadius * 0.7, 0, 2 * Math.PI)
      ctx.fillStyle = part.isFocus ? PHYSICS_COLORS.positiveCharge : withAlpha(PHYSICS_COLORS.negativeCharge, 0.4)
      ctx.strokeStyle = PHYSICS_COLORS.white
      ctx.lineWidth = part.isFocus ? 1.5 : 1
      ctx.fill()
      ctx.stroke()
    }

    if (mode === 0) {
      // 基础模式绘制单个粒子
      drawParticle({ initX: 0, vVal: v, theta: activeTheta, isFocus: true })
    } else {
      // 进阶模式绘制全粒子族，非焦点粒子先画以减少视觉遮挡
      particleFamily.filter(p => !p.isFocus).forEach(p => drawParticle(p))
      particleFamily.filter(p => p.isFocus).forEach(p => drawParticle(p))
    }

  }, [
    mode,
    activeBoundaryType,
    dynamicType,
    q,
    m,
    v,
    effectiveB,
    activeTheta,
    d,
    Rb,
    showGeometry,
    showArc,
    showEnvelope,
    progressTime,
    sceneScale,
    canvasSize,
    tOut,
    R,
    sign,
    tSlideIn,
    getParticleState,
    particleFamily
  ])

  // 物理状态及矢量箭头参数计算 (仅对焦点粒子展示以控制信息密度)
  const focusState = getParticleState(progressTime, 0, 0, v, activeTheta)
  const inField = progressTime >= 0 && progressTime <= focusState.tOut
  const forceVector = {
    x: q * effectiveB * focusState.vy,
    y: -q * effectiveB * focusState.vx
  }

  return (
    <div ref={sizeRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute top-0 left-0"
      />
      {canvasSize.width > 0 && canvasSize.height > 0 && (
        <svg
          width={canvasSize.width}
          height={canvasSize.height}
          className="absolute top-0 left-0 pointer-events-none"
        >
          {/* 焦点粒子速度矢量 */}
          <VectorArrow
            origin={{ x: focusState.px, y: focusState.py }}
            vector={{ x: focusState.vx, y: focusState.vy }}
            type="velocity"
            sceneScale={sceneScale}
          />
          {/* 焦点粒子洛伦兹力矢量 (仅在磁场偏转区内) */}
          {inField && (
            <VectorArrow
              origin={{ x: focusState.px, y: focusState.py }}
              vector={forceVector}
              type="lorentzForce"
              sceneScale={sceneScale}
            />
          )}
        </svg>
      )}
    </div>
  )
}
