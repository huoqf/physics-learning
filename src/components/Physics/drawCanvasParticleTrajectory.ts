import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import type { ChargeSign } from './types'

interface DrawParticleTrajectoryOptions {
  ctx: CanvasRenderingContext2D
  /** 粒子当前 X 像素坐标 */
  px: number
  /** 粒子当前 Y 像素坐标 */
  py: number
  /** 已走过的历史点集 */
  historyPoints?: { x: number; y: number }[]
  /** 预测的理论全轨迹点集 */
  predictedPoints?: { x: number; y: number }[]
  /** 可选：短拖尾点集 */
  tailPoints?: { x: number; y: number }[]
  /** 是否焦点 */
  isFocus: boolean
  /** 电荷极性 */
  chargeSign?: ChargeSign
  /** 经典力学自定义颜色 */
  customBaseColor?: string
}

/**
 * 粒子轨迹统一渲染函数（Canvas 2D）。
 *
 * 遵循"Canvas 控 globalAlpha，颜色本身只保留纯色"的透明度统一策略。
 * 所有线宽、透明度、虚线 Dash 参数均从 CANVAS_STYLE 统一读取，
 * 颜色复用电性色或小球主色，禁止硬编码及双重透明度叠加。
 *
 * 渲染层级（从底到顶）：
 * 1. 底层完整预测（理论）轨迹 — 细密虚线
 * 2. 已走过历史轨迹 — 标准虚线
 * 3. 短拖尾 — 实线渐变衰减
 * 4. 粒子本体
 */
export function drawCanvasParticleTrajectory({
  ctx,
  px,
  py,
  historyPoints = [],
  predictedPoints = [],
  tailPoints = [],
  isFocus,
  chargeSign = '+',
  customBaseColor,
}: DrawParticleTrajectoryOptions) {
  ctx.save()

  // 1. 确定粒子极性基准色（纯 Hex）
  let baseColor = customBaseColor ?? PHYSICS_COLORS.labelText
  if (chargeSign === '+') {
    baseColor = PHYSICS_COLORS.positiveCharge
  } else if (chargeSign === '-') {
    baseColor = PHYSICS_COLORS.negativeCharge
  }

  // 2. 绘制底层完整预测（理论）轨迹 — 使用细密虚线表示未来的预测
  if (predictedPoints.length > 1) {
    ctx.beginPath()
    ctx.moveTo(predictedPoints[0].x, predictedPoints[0].y)
    for (let i = 1; i < predictedPoints.length; i++) {
      ctx.lineTo(predictedPoints[i].x, predictedPoints[i].y)
    }
    ctx.strokeStyle = baseColor
    ctx.globalAlpha = isFocus
      ? CANVAS_STYLE.opacity.trackHistory * 0.5
      : CANVAS_STYLE.opacity.unfocusedTrackHistory * 0.5
    ctx.lineWidth = CANVAS_STYLE.stroke.trackHistory
    ctx.setLineDash(CANVAS_STYLE.dash.predictedTrajectory)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // 3. 绘制已走过的历史轨迹 — 使用标准虚线
  if (historyPoints.length > 1) {
    ctx.beginPath()
    ctx.moveTo(historyPoints[0].x, historyPoints[0].y)
    for (let i = 1; i < historyPoints.length; i++) {
      ctx.lineTo(historyPoints[i].x, historyPoints[i].y)
    }
    ctx.strokeStyle = baseColor
    ctx.globalAlpha = isFocus
      ? CANVAS_STYLE.opacity.trackHistory
      : CANVAS_STYLE.opacity.unfocusedTrackHistory
    ctx.lineWidth = CANVAS_STYLE.stroke.trackHistory
    ctx.setLineDash(CANVAS_STYLE.dash.trajectory)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // 4. 绘制短拖尾（实线渐变衰减）
  if (tailPoints.length > 1) {
    const baseAlpha = isFocus ? 0.6 : 0.25
    const tailWidth = CANVAS_STYLE.stroke.tailLineWidth

    for (let i = 1; i < tailPoints.length; i++) {
      const p1 = tailPoints[i - 1]
      const p2 = tailPoints[i]
      const ratio = i / tailPoints.length

      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.strokeStyle = baseColor
      ctx.globalAlpha = ratio * baseAlpha
      ctx.lineWidth = tailWidth * ratio
      ctx.stroke()
    }
  }

  // 5. 绘制顶层粒子本体
  ctx.globalAlpha = 1
  const radius = isFocus
    ? CANVAS_STYLE.object.pointMassRadius
    : CANVAS_STYLE.object.pointMassRadius * 0.7

  ctx.beginPath()
  ctx.arc(px, py, radius, 0, 2 * Math.PI)
  ctx.fillStyle = baseColor
  ctx.strokeStyle = PHYSICS_COLORS.white
  ctx.lineWidth = isFocus ? 1.5 : 1
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}
