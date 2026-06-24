import { useEffect, useRef, useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { createSceneScale, worldToPixel } from '@/scene'
import type { SceneConfig } from '@/scene'
import { calcTrajectoryCenter } from '@/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'

export function SimulationView() {
  const [sizeRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.square)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)

  const mode = params.mode ?? 0
  const q = params.q ?? 1
  const m = params.m ?? 1
  const v = params.v ?? 10
  const B = params.B ?? 1
  const thetaParam = params.theta ?? 90
  const showArc = params.showArc === 1
  const showEnvelope = params.showEnvelope === 1

  // 基础模式强制垂直入射 θ = 90，进阶模式使用用户调节的夹角
  const activeTheta = mode === 0 ? 90 : thetaParam

  // 计算粒子圆周运动的核心物理量
  const R = Math.abs((m * v) / (q * B))
  // 根据右手螺旋定则，当 q*B > 0 时，向上射入的粒子受力向右，即向右偏转（sign = -1）
  const sign = (q * B) >= 0 ? -1 : 1
  const omega = Math.abs((q * B) / m)
  const thetaRad = (activeTheta * Math.PI) / 180

  // 磁场内运动圆心角 (向左偏转逆时针 deltaPhi=2*(pi-thetaRad), 向右偏转顺时针 deltaPhi=2*thetaRad)
  const deltaPhi = sign === 1 ? 2 * (Math.PI - thetaRad) : 2 * thetaRad
  const tOut = deltaPhi / omega

  // 磁场外的直线运动滑行时间设计，以适配连贯动画
  const tSlideIn = 0.5 * tOut
  const tSlideOut = 1.0 * tOut
  const tCycle = tSlideIn + tOut + tSlideOut

  // 将 store 的 time 映射到动画大循环周期中
  const progressTime = time > 0 ? (time % tCycle) - tSlideIn : -tSlideIn

  // 物理配置：智能自适应 worldWidth，确保在任何滑块参数下回旋圆都能等比例完全展示
  const sceneConfig: SceneConfig = useMemo(() => {
    // 根据当前半径 R 自适应调整世界视口宽度，包络圆最大跨度为 4R，因此设为 4.5 * R 最佳
    const wWidth = Math.max(0.5, R * 4.5)
    const wHeight = canvasSize.width > 0 ? wWidth * (canvasSize.height / canvasSize.width) : 4.0

    return {
      vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
      // 物理原点(0,0)放在偏下方，以留给 y > 0 的磁场区域足够的纵深
      originX: canvasSize.width / 2,
      originY: canvasSize.height * 0.70,
      worldWidth: wWidth,
      worldHeight: wHeight,
      refMagnitudes: {
        force: 20,
        velocity: 50,
      },
    }
  }, [canvasSize, R])

  const sceneScale = createSceneScale(sceneConfig)

  // 粒子在指定时间进度 progressTime 下的运动坐标及速度状态计算函数
  const getParticleState = (tVal: number) => {
    const cxAngle = thetaRad + sign * Math.PI / 2
    const xc = R * Math.cos(cxAngle)
    const yc = R * Math.sin(cxAngle)
    const theta0 = cxAngle + Math.PI // 初始极角 (在原点时)

    let px = 0
    let py = 0
    let vx = v * Math.cos(thetaRad)
    let vy = v * Math.sin(thetaRad)

    if (tVal < 0) {
      // 阶段 1：射入前的直线运动
      px = v * tVal * Math.cos(thetaRad)
      py = v * tVal * Math.sin(thetaRad)
      vx = v * Math.cos(thetaRad)
      vy = v * Math.sin(thetaRad)
    } else if (tVal <= tOut) {
      // 阶段 2：磁场中偏转圆周运动
      const curAngle = theta0 + sign * omega * tVal
      px = xc + R * Math.cos(curAngle)
      py = yc + R * Math.sin(curAngle)
      
      const velocityAngle = curAngle + sign * Math.PI / 2
      vx = v * Math.cos(velocityAngle)
      vy = v * Math.sin(velocityAngle)
    } else {
      // 阶段 3：射出后的直线运动
      const exitAngle = theta0 + sign * omega * tOut
      const xOut = xc + R * Math.cos(exitAngle)
      const yOut = 0

      const exitVelocityAngle = exitAngle + sign * Math.PI / 2
      vx = v * Math.cos(exitVelocityAngle)
      vy = v * Math.sin(exitVelocityAngle)

      const dt = tVal - tOut
      px = xOut + vx * dt
      py = yOut + vy * dt
    }

    return { px, py, vx, vy }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 绘制边界 y = 0
    const { py: bStartY } = worldToPixel(0, 0, sceneScale)
    
    // 1. 绘制磁场区底色 (y > 0，使用全局主题色并以 0.05 透明度柔和渲染)
    ctx.save()
    ctx.fillStyle = PHYSICS_COLORS.magneticField
    ctx.globalAlpha = 0.05
    ctx.fillRect(0, 0, canvas.width, bStartY)
    ctx.restore()
    
    // 2. 绘制磁场方向背景网格符号 (⊙ 出纸面 / ⊗ 入纸面)，使用主题色中对应的 dot/cross 颜色，避免混淆与硬编码
    ctx.save()
    ctx.globalAlpha = 0.35 // 设置符号清晰度
    ctx.fillStyle = B >= 0 ? PHYSICS_COLORS.magneticFieldDot : PHYSICS_COLORS.magneticFieldCross
    ctx.font = '16px Courier New'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const symbol = B >= 0 ? '⊙' : '⊗'
    const spacing = 55
    for (let x = spacing / 2; x < canvas.width; x += spacing) {
      for (let y = spacing / 2; y < bStartY; y += spacing) {
        ctx.fillText(symbol, x, y)
      }
    }
    ctx.restore()
    
    // 3. 绘制磁场边界直线线段
    ctx.beginPath()
    ctx.moveTo(0, bStartY)
    ctx.lineTo(canvas.width, bStartY)
    ctx.strokeStyle = PHYSICS_COLORS.magneticField
    ctx.lineWidth = 2
    ctx.stroke()

    // 4. 绘制轨迹圆心或包络区
    if (mode === 0) {
      // 基础模式圆弧与高亮扇形
      const cxAngle = thetaRad + sign * Math.PI / 2
      const xc = R * Math.cos(cxAngle)
      const yc = R * Math.sin(cxAngle)
      const { px: cx, py: cy } = worldToPixel(xc, yc, sceneScale)

      // 完整轨迹圆形虚线
      ctx.beginPath()
      ctx.arc(cx, cy, R * sceneScale.scale, 0, 2 * Math.PI)
      ctx.strokeStyle = PHYSICS_COLORS.trackHistory
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.setLineDash([])

      // 扇形高亮显示圆心角
      if (showArc) {
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        // 磁场内圆弧起止角度
        const startAngle = cxAngle + Math.PI
        const endAngle = startAngle + sign * deltaPhi
        ctx.arc(cx, cy, R * sceneScale.scale, startAngle, endAngle, sign < 0)
        ctx.lineTo(cx, cy)
        ctx.fillStyle = PHYSICS_COLORS.positiveCharge + '1c'
        ctx.fill()
      }
    } else {
      // 进阶模式：多入射角“旋转圆”残影展示
      for (let angle = 10; angle <= 170; angle += 20) {
        const rad = (angle * Math.PI) / 180
        const c = calcTrajectoryCenter(rad, R, q, B)
        const { px: ccx, py: ccy } = worldToPixel(c.xc, c.yc, sceneScale)
        
        ctx.beginPath()
        ctx.arc(ccx, ccy, R * sceneScale.scale, 0, 2 * Math.PI)
        ctx.strokeStyle = angle === thetaParam ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.objectStroke
        ctx.globalAlpha = angle === thetaParam ? 1.0 : 0.15
        ctx.lineWidth = angle === thetaParam ? 2 : 1
        ctx.stroke()
      }
      ctx.globalAlpha = 1.0

      // 绘制包络区 (半圆)
      if (showEnvelope) {
        const { px: ox, py: oy } = worldToPixel(0, 0, sceneScale)
        ctx.beginPath()
        ctx.arc(ox, oy, 2 * R * sceneScale.scale, Math.PI, 2 * Math.PI)
        ctx.fillStyle = PHYSICS_COLORS.electricFieldLine + '1a'
        ctx.fill()
        
        ctx.beginPath()
        ctx.arc(ox, oy, 2 * R * sceneScale.scale, Math.PI, 2 * Math.PI)
        ctx.strokeStyle = PHYSICS_COLORS.electricFieldLine
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 5])
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // 5. 计算粒子当前物理状态并进行渲染
    const particleState = getParticleState(progressTime)
    const { px, py } = worldToPixel(particleState.px, particleState.py, sceneScale)

    // 绘制粒子运行的彗星拖尾效果 (连续平滑采样)
    const tailPoints = []
    const tailDuration = tOut * 0.4
    const steps = 25
    for (let i = 0; i <= steps; i++) {
      const tSample = progressTime - tailDuration * (1 - i / steps)
      if (tSample >= -tSlideIn) {
        const tState = getParticleState(tSample)
        const { px: sX, py: sY } = worldToPixel(tState.px, tState.py, sceneScale)
        tailPoints.push({ x: sX, y: sY, alpha: i / steps })
      }
    }

    if (tailPoints.length > 1) {
      for (let i = 1; i < tailPoints.length; i++) {
        const p1 = tailPoints[i - 1]
        const p2 = tailPoints[i]
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.strokeStyle = PHYSICS_COLORS.positiveCharge
        ctx.globalAlpha = p1.alpha * 0.5
        ctx.lineWidth = CANVAS_STYLE.object.pointMassRadius * 0.7 * p1.alpha
        ctx.stroke()
      }
      ctx.globalAlpha = 1.0
    }

    // 绘制粒子球体本体
    ctx.beginPath()
    ctx.arc(px, py, CANVAS_STYLE.object.pointMassRadius, 0, 2 * Math.PI)
    ctx.fillStyle = PHYSICS_COLORS.positiveCharge
    ctx.strokeStyle = colors.neutral.white
    ctx.lineWidth = 1.5
    ctx.fill()
    ctx.stroke()

  }, [
    mode,
    q,
    m,
    v,
    B,
    thetaParam,
    showArc,
    showEnvelope,
    progressTime,
    sceneScale,
    canvasSize,
    deltaPhi,
    omega,
    thetaRad,
    R,
    sign,
    tOut,
    tSlideIn
  ])

  // 为了 SVG 矢量箭头计算粒子实时状态与受力向量
  const particleState = getParticleState(progressTime)
  const inField = progressTime >= 0 && progressTime <= tOut
  const forceVector = {
    x: q * B * particleState.vy,
    y: -q * B * particleState.vx
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
          {/* 粒子速度矢量 */}
          <VectorArrow
            origin={{ x: particleState.px, y: particleState.py }}
            vector={{ x: particleState.vx, y: particleState.vy }}
            type="velocity"
            sceneScale={sceneScale}
          />
          {/* 粒子受洛伦兹力矢量 (仅在磁场内) */}
          {inField && (
            <VectorArrow
              origin={{ x: particleState.px, y: particleState.py }}
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
