import { PHYSICS_COLORS } from '@/theme/physics'

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
  const { x, y, w, h, B, spacing = 55, fontSize = 16, opacity = 0.35 } = opts

  if (Math.abs(B) < 1e-4) return

  const isOut = B >= 0
  const symbol = isOut ? '⊙' : '⊗'

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.fillStyle = isOut ? PHYSICS_COLORS.magneticFieldDot : PHYSICS_COLORS.magneticFieldCross
  ctx.font = `${fontSize}px Courier New`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let px = x + spacing / 2; px < x + w; px += spacing) {
    for (let py = y + spacing / 2; py < y + h; py += spacing) {
      ctx.fillText(symbol, px, py)
    }
  }
  ctx.restore()
}
