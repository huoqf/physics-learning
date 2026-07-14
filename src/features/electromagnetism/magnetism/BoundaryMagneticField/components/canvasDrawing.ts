import { PHYSICS_COLORS, CANVAS_STYLE, withAlpha } from '@/theme/physics'
import { drawMagneticFieldGrid } from '@/components/Physics'
import { ParticleState } from '../hooks/useParticleState'
import { ParticleFamilyItem } from '../hooks/useParticleFamily'

type ToCanvasPixel = (wx: number, wy: number) => { px: number; py: number }
type FontFn = (size: number) => number
type GetParticleState = (t: number, initX?: number, initY?: number, vVal?: number, thetaDeg?: number) => ParticleState

// ─── 磁场区域底色与边界 ───

interface MagneticFieldRegionParams {
  ctx: CanvasRenderingContext2D
  canvasWidth: number
  font: FontFn
  activeBoundaryType: number
  effectiveB: number
  d: number
  Rb: number
  toCanvasPixel: ToCanvasPixel
  metersToPixels: number
}

export function drawMagneticFieldRegion(params: MagneticFieldRegionParams) {
  const { ctx, canvasWidth, font, activeBoundaryType, effectiveB, d, Rb, toCanvasPixel, metersToPixels } = params

  const { py: bStartY } = toCanvasPixel(0, 0)

  ctx.save()
  if (activeBoundaryType === 0) {
    // 单边界：y > 0 的半平面
    ctx.fillStyle = PHYSICS_COLORS.magneticField
    ctx.globalAlpha = 0.04
    ctx.fillRect(0, 0, canvasWidth, bStartY)
    ctx.restore()

    drawMagneticFieldGrid(ctx, { x: 0, y: 0, w: canvasWidth, h: bStartY, B: effectiveB })

    // 绘制单边界线
    ctx.beginPath()
    ctx.moveTo(0, bStartY)
    ctx.lineTo(canvasWidth, bStartY)
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
    ctx.fillRect(0, bEndY, canvasWidth, bStartY - bEndY)
    ctx.restore()

    drawMagneticFieldGrid(ctx, { x: 0, y: bEndY, w: canvasWidth, h: bStartY - bEndY, B: effectiveB })

    // 下边界线
    ctx.beginPath()
    ctx.moveTo(0, bStartY)
    ctx.lineTo(canvasWidth, bStartY)
    ctx.strokeStyle = PHYSICS_COLORS.magneticField
    ctx.lineWidth = 2
    ctx.stroke()

    // 上边界线
    ctx.beginPath()
    ctx.moveTo(0, bEndY)
    ctx.lineTo(canvasWidth, bEndY)
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
}

// ─── 进阶模式叠加层（粒子族轨迹 + 包络 + 圆心几何） ───

interface AdvancedOverlayParams {
  ctx: CanvasRenderingContext2D
  canvasWidth: number
  canvasHeight: number
  font: FontFn
  mode: number
  dynamicType: number
  showEnvelope: boolean
  showGeometry: boolean
  R: number
  activeTheta: number
  sign: number
  particleFamily: ParticleFamilyItem[]
  getParticleState: GetParticleState
  toCanvasPixel: ToCanvasPixel
  metersToPixels: number
  focusState: ParticleState
}

export function drawAdvancedOverlay(params: AdvancedOverlayParams) {
  const { ctx, canvasWidth, font, mode, dynamicType, showEnvelope, showGeometry, R, particleFamily, getParticleState, toCanvasPixel, metersToPixels, focusState } = params

  if (mode !== 1) return

  // 绘制非焦点粒子的淡色虚线轨迹
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
      ctx.lineTo(canvasWidth, fcy)
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

// ─── 基础模式几何辅助线 ───

interface BasicGeometryParams {
  ctx: CanvasRenderingContext2D
  font: FontFn
  showGeometry: boolean
  showArc: boolean
  mode: number
  activeTheta: number
  sign: number
  R: number
  focusState: ParticleState
  toCanvasPixel: ToCanvasPixel
  metersToPixels: number
}

export function drawBasicGeometry(params: BasicGeometryParams) {
  const { ctx, font, showGeometry, showArc, mode, activeTheta, sign, R, focusState, toCanvasPixel, metersToPixels } = params

  if (!showGeometry || mode !== 0) return

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

// ─── 非焦点粒子（进阶模式拖尾+本体） ───

interface NonFocusParticlesParams {
  ctx: CanvasRenderingContext2D
  mode: number
  progressTime: number
  tSlideIn: number
  particleFamily: ParticleFamilyItem[]
  getParticleState: GetParticleState
  toCanvasPixel: ToCanvasPixel
}

export function drawNonFocusParticles(params: NonFocusParticlesParams) {
  const { ctx, mode, progressTime, tSlideIn, particleFamily, getParticleState, toCanvasPixel } = params

  if (mode !== 1) return

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
