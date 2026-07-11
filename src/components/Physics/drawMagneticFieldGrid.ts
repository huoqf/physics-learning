import { PHYSICS_COLORS } from '@/theme/physics'

/**
 * 在 Canvas 2D 上绘制磁场方向符号网格（⊗ 或 ⊙）。
 * 适用于 Canvas 渲染路径（如 BoundaryMagneticField）。
 */
function drawCrossSymbolCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  strokeWidth: number,
  color: string,
) {
  const arm = r * 0.6
  const haloWidth = strokeWidth + 1.2

  // 1. 绘制白色 Halo 描边
  ctx.strokeStyle = PHYSICS_COLORS.white
  ctx.lineWidth = haloWidth
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx - arm, cy - arm)
  ctx.lineTo(cx + arm, cy + arm)
  ctx.moveTo(cx + arm, cy - arm)
  ctx.lineTo(cx - arm, cy + arm)
  ctx.stroke()

  // 2. 绘制彩色主体
  ctx.strokeStyle = color
  ctx.lineWidth = strokeWidth
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx - arm, cy - arm)
  ctx.lineTo(cx + arm, cy + arm)
  ctx.moveTo(cx + arm, cy - arm)
  ctx.lineTo(cx - arm, cy + arm)
  ctx.stroke()
}

function drawDotSymbolCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  strokeWidth: number,
  color: string,
) {
  const dotR = r * 0.3
  const haloWidth = strokeWidth + 1.2

  // 1. 绘制白色 Halo 描边
  ctx.strokeStyle = PHYSICS_COLORS.white
  ctx.lineWidth = haloWidth
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = PHYSICS_COLORS.white
  ctx.beginPath()
  ctx.arc(cx, cy, dotR, 0, Math.PI * 2)
  ctx.fill()

  // 2. 绘制彩色主体
  ctx.strokeStyle = color
  ctx.lineWidth = strokeWidth
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy, dotR, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * 在 Canvas 2D 上绘制磁场方向符号网格（⊗ 或 ⊙）。
 * 适用于 Canvas 渲染路径（如 BoundaryMagneticField）。
 */
export function drawMagneticFieldGrid(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number
    y: number
    w: number
    h: number
    B: number
    spacing?: number
    fontSize?: number
    opacity?: number
  },
) {
  const { x, y, w, h, B, spacing = 50, fontSize = 18, opacity = 0.65 } = opts

  if (Math.abs(B) < 1e-4) return

  const isOut = B < 0
  const fillColor = isOut ? PHYSICS_COLORS.magneticFieldDot : PHYSICS_COLORS.magneticFieldCross

  ctx.save()
  ctx.globalAlpha = opacity

  const r = fontSize * 0.45
  const strokeWidth = fontSize * 0.085

  for (let px = x + spacing / 2; px < x + w; px += spacing) {
    for (let py = y + spacing / 2; py < y + h; py += spacing) {
      if (isOut) {
        drawDotSymbolCanvas(ctx, px, py, r, strokeWidth, fillColor)
      } else {
        drawCrossSymbolCanvas(ctx, px, py, r, strokeWidth, fillColor)
      }
    }
  }

  ctx.restore()
}
