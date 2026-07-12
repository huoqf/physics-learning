
import { useEffect, useMemo, useCallback } from 'react'
import { useAnimationViewport, useSceneScale, useCanvasViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE, withAlpha } from '@/theme/physics'
import { worldToDesign } from '@/scene'
import {
  calcParticleRadius,
  calcParticlePeriod,
  calculateDoubleBoundaryExit,
  calculateCircularBoundaryExit,
  lorentzForceDir,
} from '@/physics'
import { VectorArrow, drawMagneticFieldGrid, drawCanvasParticleTrajectory } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'

export function SimulationView() {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)

  const mode = params.mode ?? 0 // 0: 基础, 1: 进阶
  const boundaryType = params.boundaryType ?? 0 // 0: 单边界, 1: 双平行边界, 2: 圆形边界
  const dynamicType = params.dynamicType ?? 0 // 0: 旋转圆, 1: 缩放圆, 2: 平移圆

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: mode === 0 ? CANVAS_PRESETS.splitH : CANVAS_PRESETS.full
  })
  const { canvasRef, setupFrame, designToPixel } = useCanvasViewport({ vp, canvasSize, mode: 'raw' })

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
  const sign = (q * effectiveB) >= 0 ? 1 : -1 // 1 为逆时针（向左），-1 为顺时针（向右）

  // 计算焦点粒子在磁场中偏转的时间 tOut
  const tOut = useMemo(() => {
    if (activeBoundaryType === 0) {
      const thetaRad = (activeTheta * Math.PI) / 180
      // 偏转角：逆时针 2π-2θ（长弧），顺时针 2θ（短弧）
      const deltaPhi = sign === 1 ? 2 * Math.PI - 2 * thetaRad : 2 * thetaRad
      const T = calcParticlePeriod(m, q, effectiveB)
      return T > 0 ? (deltaPhi / (2 * Math.PI)) * T : 0
    } else if (activeBoundaryType === 1) {
      return calculateDoubleBoundaryExit(q, m, v, effectiveB, activeTheta, d).t
    } else {
      return calculateCircularBoundaryExit(q, m, v, effectiveB, Rb).t
    }
  }, [q, m, v, effectiveB, activeTheta, activeBoundaryType, d, Rb, sign])

  const tSlideIn = 1.5 // 固定 1.5s 飞入，实现全局同步发射
  const progressTime = time - tSlideIn

  // ── VIEWPORT 架构 ──
  // 统一 sceneScale（设计坐标），SVG 和 Canvas 共用
  const worldWidth = activeBoundaryType === 2 ? 50 : Math.max(1.0, d * 4.8)
  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'center',
    physicsScaleDesign: preset.width / worldWidth,
    centerSource: 'custom',
    centerX: preset.width / 2,
    centerY: activeBoundaryType === 2 ? preset.height * 0.78 : preset.height * 0.70,
    maxVectorLength: Math.min(preset.width, preset.height) * 0.3,
    refMagnitudes: { force: 25, velocity: 45, lorentzForce: 25 },
  })

  // Canvas 绘制辅助：物理坐标 → 容器像素（通过 sceneScale + designToPixel）
  const toCanvasPixel = useCallback((wx: number, wy: number) => {
    const { px: dx, py: dy } = worldToDesign(wx, wy, sceneScale)
    return designToPixel(dx, dy)
  }, [sceneScale, designToPixel])

  // Canvas 绘制辅助：物理距离 → 容器像素距离
  const metersToPixels = sceneScale.scaleX * vp.scale

  // 统一的单粒子轨迹及物理状态求解函数
  const getParticleState = useCallback((
    tVal: number,
    initX: number = 0,
    initY: number = 0,
    vVal: number = v,
    thetaDeg: number = activeTheta
  ) => {
    const thetaRad = (thetaDeg * Math.PI) / 180
    const signVal = (q * effectiveB) >= 0 ? 1 : -1
    const omega = Math.abs((q * effectiveB) / m)
    const Rp = calcParticleRadius(m, vVal, q, effectiveB)

    let tOutVal = 0
    let xOut = 0
    let yOut = 0
    let vxOut = 0
    let vyOut = 0

    if (activeBoundaryType === 0) {
      // 单边界
      // 偏转角：逆时针 2π-2θ（长弧），顺时针 2θ（短弧）
      const deltaPhi = signVal === 1 ? 2 * Math.PI - 2 * thetaRad : 2 * thetaRad
      const T = calcParticlePeriod(m, q, effectiveB)
      tOutVal = T > 0 ? (deltaPhi / (2 * Math.PI)) * T : 0

      const cxAngle = thetaRad + signVal * Math.PI / 2
      xOut = initX + 2 * Rp * Math.cos(cxAngle)
      yOut = 0
      // 出射速度方向统一为 -θ
      const exitAngle = -thetaRad
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

  // 物理状态及矢量箭头参数计算 (仅对焦点粒子展示以控制信息密度)
  const focusState = getParticleState(progressTime, 0, 0, v, activeTheta)
  const inField = progressTime >= 0 && progressTime <= focusState.tOut
  const B_dir = effectiveB > 0 ? 'intoPage' as const : 'outOfPage' as const
  const forceDir = lorentzForceDir(
    { x: focusState.vx, y: focusState.vy },
    B_dir,
    q
  )
  const forceMag = Math.abs(q) * Math.hypot(focusState.vx, focusState.vy) * Math.abs(effectiveB)
  const forceVector = {
    x: forceDir.x * forceMag,
    y: forceDir.y * forceMag
  }
  // 速度矢量全程显示（入场前、磁场内、出场后）
  const showVelocityVector = progressTime >= -tSlideIn

  // ── 焦点粒子全程轨迹点集（入场前 + 磁场内偏转 + 出场后，用于 drawCanvasParticleTrajectory）──
  // 复用 getParticleState 三段式位置计算，统一采样 [tStart, tEnd] 全时间域。
  const focusArcPredicted = useMemo(() => {
    const tStart = -tSlideIn
    const tEnd = focusState.tOut + tSlideIn
    const steps = 160
    const points: { x: number; y: number; t: number }[] = []
    for (let i = 0; i <= steps; i++) {
      const t = tStart + (i / steps) * (tEnd - tStart)
      const state = getParticleState(t, 0, 0, v, activeTheta)
      const { px, py } = toCanvasPixel(state.px, state.py)
      points.push({ x: px, y: py, t })
    }
    return points
  }, [focusState.tOut, tSlideIn, v, activeTheta, getParticleState, sceneScale])

  // 历史轨迹：按真实时间过滤全程点集，三阶段连续
  const focusArcHistory = useMemo(() => {
    return focusArcPredicted.filter(p => p.t <= progressTime)
  }, [focusArcPredicted, progressTime])

  const focusArcTail = useMemo(() => {
    const tailLen = Math.min(20, focusArcHistory.length)
    return focusArcHistory.slice(-tailLen)
  }, [focusArcHistory])

  useEffect(() => {
    const ctx = setupFrame()
    if (!ctx) return
    const { font } = canvasSize

    // 绘制磁场区域底色与符号网格
    const { py: bStartY } = toCanvasPixel(0, 0)

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
      const { py: bEndY } = toCanvasPixel(0, d)
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
      const { px: bcx, py: bcy } = toCanvasPixel(0, Rb)
      const rPx = Rb * metersToPixels

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
        const { px: cx, py: cy } = toCanvasPixel(pState.xc, pState.yc)
        const rpPx = pState.R * metersToPixels

        ctx.beginPath()
        ctx.arc(cx, cy, rpPx, 0, 2 * Math.PI)
        ctx.strokeStyle = withAlpha(PHYSICS_COLORS.negativeCharge, 0.12)
        ctx.setLineDash([2, 3])
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
      })

      // 1. 旋转圆特有的包络圆 (当 showEnvelope 开启时)
      if (dynamicType === 0 && showEnvelope) {
        const { px: ox, py: oy } = toCanvasPixel(0, 0)

        // 包络圆（半径为 2R 的半圆）
        ctx.beginPath()
        ctx.arc(ox, oy, 2 * R * metersToPixels, Math.PI, 2 * Math.PI)
        ctx.fillStyle = withAlpha(PHYSICS_COLORS.appliedForce, 0.04)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(ox, oy, 2 * R * metersToPixels, Math.PI, 2 * Math.PI)
        ctx.strokeStyle = PHYSICS_COLORS.appliedForce
        ctx.setLineDash([6, 4])
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.setLineDash([])
      }

      // 2. 绘制圆心轨迹与各粒子圆心点 (当 showGeometry 开启时)
      if (showGeometry) {
        const { px: ox, py: oy } = toCanvasPixel(0, 0)

        // 2.1 绘制圆心轨迹参考线
        ctx.save()
        if (dynamicType === 0) {
          // 旋转圆：以原点为圆心，半径为 R 的半圆弧
          ctx.beginPath()
          ctx.arc(ox, oy, R * metersToPixels, Math.PI, 2 * Math.PI)
          ctx.strokeStyle = withAlpha(PHYSICS_COLORS.appliedForce, 0.5)
          ctx.setLineDash([3, 3])
          ctx.lineWidth = 1.2
          ctx.stroke()
          ctx.fillStyle = PHYSICS_COLORS.appliedForce
          ctx.font = `${font(9)}px sans-serif`
          ctx.fillText('圆心轨迹 (r = R)', ox + 8, oy - R * metersToPixels - 6)
        } else if (dynamicType === 1) {
          // 缩放圆：共线水平线（在 x 轴上）
          ctx.beginPath()
          ctx.moveTo(ox - 3 * R * metersToPixels, oy)
          ctx.lineTo(ox + 3 * R * metersToPixels, oy)
          ctx.strokeStyle = withAlpha(PHYSICS_COLORS.appliedForce, 0.5)
          ctx.setLineDash([3, 3])
          ctx.lineWidth = 1.2
          ctx.stroke()
          ctx.fillStyle = PHYSICS_COLORS.appliedForce
          ctx.font = `${font(9)}px sans-serif`
          ctx.fillText('圆心轨迹直线', ox + 16, oy - 6)
        } else {
          // 平移圆：平行于边界的水平线
          const { py: fcy } = toCanvasPixel(0, focusState.yc)
          ctx.beginPath()
          ctx.moveTo(0, fcy)
          ctx.lineTo(canvasSize.width, fcy)
          ctx.strokeStyle = withAlpha(PHYSICS_COLORS.appliedForce, 0.5)
          ctx.setLineDash([3, 3])
          ctx.lineWidth = 1.2
          ctx.stroke()
          ctx.fillStyle = PHYSICS_COLORS.appliedForce
          ctx.font = `${font(9)}px sans-serif`
          ctx.fillText('圆心轨迹平移线', 16, fcy - 6)
        }
        ctx.restore()

        // 2.2 绘制各粒子当前对应的圆心点
        particleFamily.forEach((part) => {
          const pState = getParticleState(0, part.initX, 0, part.vVal, part.theta)
          const { px: cx, py: cy } = toCanvasPixel(pState.xc, pState.yc)
          
          ctx.beginPath()
          ctx.arc(cx, cy, part.isFocus ? 4.5 : 3, 0, 2 * Math.PI)
          ctx.fillStyle = part.isFocus ? PHYSICS_COLORS.appliedForce : withAlpha(PHYSICS_COLORS.appliedForce, 0.4)
          ctx.strokeStyle = PHYSICS_COLORS.white
          ctx.lineWidth = 1
          ctx.fill()
          ctx.stroke()

          if (part.isFocus) {
            ctx.fillStyle = PHYSICS_COLORS.appliedForce
            ctx.font = `bold ${font(10)}px sans-serif`
            ctx.fillText('O (焦点)', cx + 6, cy + 3)
          }
        })
      }
    }

    // 绘制焦点粒子相关的辅助线（几何定理可视化）
    if (showGeometry && mode === 0) {
      const { px: ox, py: oy } = toCanvasPixel(0, 0)
      const { px: cx, py: cy } = toCanvasPixel(focusState.xc, focusState.yc)
      const { px: ex, py: ey } = toCanvasPixel(focusState.xOut, focusState.yOut)

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
        const thetaRadArc = (activeTheta * Math.PI) / 180
        const deltaPhiVal = sign === 1 ? 2 * Math.PI - 2 * thetaRadArc : 2 * thetaRadArc
        const endAngle = startAngle - sign * deltaPhiVal
        ctx.arc(cx, cy, R * metersToPixels, startAngle, endAngle, sign > 0)
        ctx.lineTo(cx, cy)
        ctx.fillStyle = withAlpha(PHYSICS_COLORS.positiveCharge, 0.08)
        ctx.fill()
      }

      ctx.restore()
    }

    // 绘制焦点粒子轨迹（统一组件：预测虚线 + 历史虚线 + 拖尾 + 本体）
    const { px: fpx, py: fpy } = toCanvasPixel(focusState.px, focusState.py)
    drawCanvasParticleTrajectory({
      ctx,
      px: fpx,
      py: fpy,
      predictedPoints: focusArcPredicted,
      historyPoints: focusArcHistory,
      tailPoints: focusArcTail,
      isFocus: true,
      chargeSign: q > 0 ? '+' : '-',
    })

    // 绘制非焦点粒子（进阶模式，保持原有拖尾效果）
    if (mode === 1) {
      particleFamily.filter(p => !p.isFocus).forEach(part => {
        const pState = getParticleState(progressTime, part.initX, 0, part.vVal, part.theta)
        const { px: pX, py: pY } = toCanvasPixel(pState.px, pState.py)

        // 拖尾
        const unfocusTail = []
        const tailDuration = pState.tOut * 0.35
        const tailSteps = 18
        for (let i = 0; i <= tailSteps; i++) {
          const tSample = progressTime - tailDuration * (1 - i / tailSteps)
          if (tSample >= -tSlideIn) {
            const tState = getParticleState(tSample, part.initX, 0, part.vVal, part.theta)
            const { px: sX, py: sY } = toCanvasPixel(tState.px, tState.py)
            unfocusTail.push({ x: sX, y: sY, alpha: i / tailSteps })
          }
        }

        if (unfocusTail.length > 1) {
          ctx.save()
          for (let i = 1; i < unfocusTail.length; i++) {
            const p1 = unfocusTail[i - 1]
            const p2 = unfocusTail[i]
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = withAlpha(PHYSICS_COLORS.negativeCharge, 0.3)
            ctx.globalAlpha = p1.alpha * 0.25
            ctx.lineWidth = CANVAS_STYLE.object.pointMassRadius * 0.4 * p1.alpha
            ctx.stroke()
          }
          ctx.restore()
        }

        // 本体球体
        ctx.beginPath()
        ctx.arc(pX, pY, CANVAS_STYLE.object.pointMassRadius * 0.7, 0, 2 * Math.PI)
        ctx.fillStyle = withAlpha(PHYSICS_COLORS.negativeCharge, 0.4)
        ctx.strokeStyle = PHYSICS_COLORS.white
        ctx.lineWidth = 1
        ctx.fill()
        ctx.stroke()
      })
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
    particleFamily,
    focusState,
    focusArcPredicted,
    focusArcHistory,
    focusArcTail
  ])


  // 矢量起点转为设计坐标（<g transform={vp.transform}> 内统一使用设计坐标）
  const particleDesign = worldToDesign(focusState.px, focusState.py, sceneScale)



  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      canvasRef={canvasRef}
    >
      {/* 焦点粒子速度矢量（全程显示） */}
      {showVelocityVector && (
        <VectorArrow
          originPixel={{ x: particleDesign.px, y: particleDesign.py }}
          vector={{ x: focusState.vx, y: focusState.vy }}
          type="velocity"
          sceneScale={sceneScale}
        />
      )}
      {/* 焦点粒子洛伦兹力矢量（仅在磁场偏转区内） */}
      {inField && (
        <VectorArrow
          originPixel={{ x: particleDesign.px, y: particleDesign.py }}
          vector={forceVector}
          type="lorentzForce"
          sceneScale={sceneScale}
        />
      )}
    </AnimationSvgCanvas>
  )
}
