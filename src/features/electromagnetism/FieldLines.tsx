import { useRef, useEffect, useCallback } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'
import { colors } from '@/theme/colors'
import { radius } from '@/theme/radius'

const FONT = {
  title: CANVAS_STYLE.font.bodySize,
  label: CANVAS_STYLE.font.labelSize,
  axis: CANVAS_STYLE.font.axisSize,
  family: CANVAS_STYLE.font.family,
}

const CHARGE_RADIUS = CANVAS_STYLE.object.pointMassRadius + 4

interface Charge {
  x: number
  y: number
  q: number
}

function electricField(charges: Charge[], px: number, py: number) {
  let ex = 0, ey = 0
  for (const c of charges) {
    const dx = px - c.x
    const dy = py - c.y
    const r2 = dx * dx + dy * dy
    if (r2 < 1) continue
    const r = Math.sqrt(r2)
    const mag = c.q / r2
    ex += mag * (dx / r)
    ey += mag * (dy / r)
  }
  return { ex, ey }
}

function potential(charges: Charge[], px: number, py: number) {
  let v = 0
  for (const c of charges) {
    const dx = px - c.x
    const dy = py - c.y
    const r = Math.sqrt(dx * dx + dy * dy)
    if (r < 1) continue
    v += c.q / r
  }
  return v
}

const FIELD_LINE_STEP = 3
const MAX_FIELD_STEPS = 3000
const ARROW_INTERVAL = 60
const FIELD_LINE_INNER_OFFSET = CHARGE_RADIUS + 2
const EQUIPOTENTIAL_LINE_COUNT = 10
const CANVAS_BG = colors.neutral[0]
const PANEL_BG = `${colors.neutral[50]}EE`
const PANEL_BORDER = PHYSICS_COLORS.grid
const GLOW_POS = `${PHYSICS_COLORS.positiveCharge}59`
const GLOW_NEG = `${PHYSICS_COLORS.negativeCharge}59`

function traceFieldLine(
  charges: Charge[],
  sx: number,
  sy: number,
  direction: 1 | -1,
  width: number,
  height: number
): { points: [number, number][]; arrowAt: [number, number, number][] } {
  const points: [number, number][] = [[sx, sy]]
  const arrowAt: [number, number, number][] = []
  let x = sx, y = sy
  let distSinceArrow = 0

  const step = (px: number, py: number) => {
    const { ex, ey } = electricField(charges, px, py)
    const mag = Math.sqrt(ex * ex + ey * ey)
    if (mag === 0) return { dx: 0, dy: 0 }
    return { dx: (direction * ex) / mag, dy: (direction * ey) / mag }
  }

  for (let i = 0; i < MAX_FIELD_STEPS; i++) {
    const k1 = step(x, y)
    const k2 = step(x + 0.5 * FIELD_LINE_STEP * k1.dx, y + 0.5 * FIELD_LINE_STEP * k1.dy)
    const k3 = step(x + 0.5 * FIELD_LINE_STEP * k2.dx, y + 0.5 * FIELD_LINE_STEP * k2.dy)
    const k4 = step(x + FIELD_LINE_STEP * k3.dx, y + FIELD_LINE_STEP * k3.dy)

    const dx = (FIELD_LINE_STEP / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx)
    const dy = (FIELD_LINE_STEP / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy)

    x += dx
    y += dy

    if (x < -20 || x > width + 20 || y < -20 || y > height + 20) break

    let nearCharge = false
    for (const c of charges) {
      const d = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2)
      if (d < CHARGE_RADIUS * 0.85) {
        nearCharge = true
        break
      }
    }
    if (nearCharge) break

    points.push([x, y])
    distSinceArrow += FIELD_LINE_STEP
    if (distSinceArrow >= ARROW_INTERVAL) {
      arrowAt.push([x, y, Math.atan2(dy, dx)])
      distSinceArrow = 0
    }
  }
  return { points, arrowAt }
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size = 7
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-size, -size * 0.45)
  ctx.lineTo(-size, size * 0.45)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export default function FieldLines() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 500 })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { q1 = 5, q2 = -5, distance = 8 } = params

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvasSize.width || 700
    const H = canvasSize.height || 500
    ctx.clearRect(0, 0, W, H)

    // Background: clean white (project spec)
    ctx.fillStyle = CANVAS_BG
    ctx.fillRect(0, 0, W, H)

    // Grid (faint, project spec)
    if (showGrid) {
      ctx.strokeStyle = PHYSICS_COLORS.grid
      ctx.lineWidth = CANVAS_STYLE.stroke.reference
      ctx.setLineDash([...CANVAS_STYLE.dash.reference])
      for (let gx = 0; gx < W; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke()
      }
      for (let gy = 0; gy < H; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke()
      }
      ctx.setLineDash([])
    }

    const cx = W / 2
    const cy = H / 2
    const pxPerCm = 22
    const separation = distance * pxPerCm

    const charges: Charge[] = [
      { x: cx - separation / 2, y: cy, q: q1 },
      { x: cx + separation / 2, y: cy, q: q2 },
    ]

    const isPositive1 = q1 > 0
    const isNegative1 = q1 < 0
    const isPositive2 = q2 > 0
    const isNegative2 = q2 < 0
    const q1Zero = Math.abs(q1) < 0.01
    const q2Zero = Math.abs(q2) < 0.01
    const bothZero = q1Zero && q2Zero
    const anyZero = q1Zero || q2Zero
    const isOpposite = (isPositive1 && isNegative2) || (isNegative1 && isPositive2)

    // ── Equipotential lines ───────────────────────────────────────────────
    if (showVectors && !bothZero) {
      const samplePots: number[] = []
      const sampleStep = 20
      for (let sx = 0; sx < W; sx += sampleStep) {
        for (let sy = 0; sy < H; sy += sampleStep) {
          let skip = false
          for (const c of charges) {
            if (Math.sqrt((sx - c.x) ** 2 + (sy - c.y) ** 2) < CHARGE_RADIUS * 1.5) {
              skip = true; break
            }
          }
          if (!skip) samplePots.push(potential(charges, sx, sy))
        }
      }
      samplePots.sort((a, b) => a - b)
      const pMin = samplePots[Math.floor(samplePots.length * 0.05)] ?? samplePots[0]
      const pMax = samplePots[Math.floor(samplePots.length * 0.95)] ?? samplePots[samplePots.length - 1]

      const numContours = EQUIPOTENTIAL_LINE_COUNT

      const gridStep = 6
      const cols = Math.floor(W / gridStep)
      const rows = Math.floor(H / gridStep)

      const potGrid: number[][] = []
      for (let r = 0; r <= rows; r++) {
        potGrid[r] = []
        for (let c2 = 0; c2 <= cols; c2++) {
          potGrid[r][c2] = potential(charges, c2 * gridStep, r * gridStep)
        }
      }

      for (let ci = 0; ci < numContours; ci++) {
        const t = (ci + 0.5) / numContours
        const targetV = pMin + t * (pMax - pMin)

        const alpha = 0.25 + 0.35 * t
        ctx.strokeStyle = PHYSICS_COLORS.electricPotential
        ctx.lineWidth = CANVAS_STYLE.stroke.reference
        ctx.globalAlpha = alpha
        ctx.setLineDash([6, 5])

        for (let r = 0; r < rows; r++) {
          for (let c2 = 0; c2 < cols; c2++) {
            const v00 = potGrid[r][c2]
            const v10 = potGrid[r][c2 + 1]
            const v01 = potGrid[r + 1][c2]
            const v11 = potGrid[r + 1][c2 + 1]

            const cellCx = (c2 + 0.5) * gridStep
            const cellCy = (r + 0.5) * gridStep
            let nearAny = false
            for (const ch of charges) {
              if (Math.sqrt((cellCx - ch.x) ** 2 + (cellCy - ch.y) ** 2) < CHARGE_RADIUS * 2) {
                nearAny = true; break
              }
            }
            if (nearAny) continue

            const interp = (a: number, b: number) =>
              gridStep * ((targetV - a) / (b - a))

            const x0 = c2 * gridStep
            const y0 = r * gridStep

            const pts: [number, number][] = []
            if ((v00 < targetV) !== (v10 < targetV)) pts.push([x0 + interp(v00, v10), y0])
            if ((v10 < targetV) !== (v11 < targetV)) pts.push([x0 + gridStep, y0 + interp(v10, v11)])
            if ((v01 < targetV) !== (v11 < targetV)) pts.push([x0 + interp(v01, v11), y0 + gridStep])
            if ((v00 < targetV) !== (v01 < targetV)) pts.push([x0, y0 + interp(v00, v01)])

            if (pts.length === 2) {
              ctx.beginPath()
              ctx.moveTo(pts[0][0], pts[0][1])
              ctx.lineTo(pts[1][0], pts[1][1])
              ctx.stroke()
            }
          }
        }
      }

      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }

    // ── Field lines ───────────────────────────────────────────────────────
    if (showVectors && !bothZero) {
      const allLines: {
        points: [number, number][]
        arrowAt: [number, number, number][]
        color: string
      }[] = []

      const posColor = PHYSICS_COLORS.positiveCharge
      const negColor = PHYSICS_COLORS.negativeCharge

      const emitFromCharge = (
        charge: Charge,
        dir: 1 | -1,
        lineCount: number,
        color: string
      ) => {
        for (let i = 0; i < lineCount; i++) {
          const angle = (2 * Math.PI * i) / lineCount
          const sx = charge.x + FIELD_LINE_INNER_OFFSET * Math.cos(angle)
          const sy = charge.y + FIELD_LINE_INNER_OFFSET * Math.sin(angle)
          const result = traceFieldLine(charges, sx, sy, dir, W, H)
          if (result.points.length > 2) {
            allLines.push({ ...result, color })
          }
        }
      }

      const maxQ = Math.max(...charges.map(c => Math.abs(c.q)))
      const baseLineCount = 16

      charges.forEach((ch) => {
        const lineCount = Math.round((Math.abs(ch.q) / maxQ) * baseLineCount)
        const lc = Math.max(4, lineCount)
        if (ch.q > 0) {
          emitFromCharge(ch, 1, lc, posColor)
        } else {
          emitFromCharge(ch, -1, lc, negColor)
        }
      })

      for (const line of allLines) {
        if (line.points.length < 2) continue
        ctx.beginPath()
        ctx.moveTo(line.points[0][0], line.points[0][1])
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i][0], line.points[i][1])
        }
        ctx.strokeStyle = line.color
        ctx.lineWidth = CANVAS_STYLE.stroke.vectorSub
        ctx.globalAlpha = 0.75
        ctx.stroke()
        ctx.globalAlpha = 1

        ctx.fillStyle = line.color
        for (const [ax, ay, angle] of line.arrowAt) {
          drawArrowHead(ctx, ax, ay, angle, 6)
        }
      }
    }

    // ── Draw charges ──────────────────────────────────────────────────────
    charges.forEach((ch, idx) => {
      const isPos = ch.q > 0
      const color = isPos ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge
      const glowColor = isPos ? GLOW_POS : GLOW_NEG

      // Glow
      const grd = ctx.createRadialGradient(ch.x, ch.y, 2, ch.x, ch.y, CHARGE_RADIUS * 2.5)
      grd.addColorStop(0, glowColor)
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(ch.x, ch.y, CHARGE_RADIUS * 2.5, 0, Math.PI * 2)
      ctx.fill()

      // Circle
      ctx.beginPath()
      ctx.arc(ch.x, ch.y, CHARGE_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = PHYSICS_COLORS.objectStroke
      ctx.lineWidth = CANVAS_STYLE.stroke.objectLine
      ctx.stroke()

      // Symbol
      ctx.fillStyle = CANVAS_BG
      ctx.font = `bold ${FONT.title}px ${FONT.family}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(isPos ? '+' : '−', ch.x, ch.y)

      // Label
      ctx.font = `${FONT.axis}px ${FONT.family}`
      ctx.fillStyle = PHYSICS_COLORS.labelText
      ctx.fillText(`q${idx + 1} = ${ch.q > 0 ? '+' : ''}${ch.q} μC`, ch.x, ch.y + CHARGE_RADIUS + 16)
    })

    // ── Distance annotation ───────────────────────────────────────────────
    if (!bothZero) {
      const leftX = charges[0].x
      const rightX = charges[1].x
      ctx.strokeStyle = PHYSICS_COLORS.axis
      ctx.lineWidth = CANVAS_STYLE.stroke.reference
      ctx.beginPath()
      ctx.moveTo(leftX, cy + 50)
      ctx.lineTo(rightX, cy + 50)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(leftX, cy + 45)
      ctx.lineTo(leftX, cy + 55)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(rightX, cy + 45)
      ctx.lineTo(rightX, cy + 55)
      ctx.stroke()

      ctx.font = `${FONT.axis}px ${FONT.family}`
      ctx.fillStyle = PHYSICS_COLORS.labelText
      ctx.textAlign = 'center'
      ctx.fillText(`d = ${distance} cm`, cx, cy + 68)
    }

    // ── Legend / Formulas ─────────────────────────────────────────────────
    if (showFormulas) {
      let title = ''
      let fieldLineDesc = ''
      if (bothZero) {
        title = '无电场（两电荷均为零）'
        fieldLineDesc = '无电场线'
      } else if (anyZero) {
        title = '单电荷电场'
        fieldLineDesc = (q1Zero ? q2 : q1) > 0
          ? '从正电荷向外辐射'
          : '从无限远指向负电荷'
      } else if (isOpposite) {
        title = '异种电荷电场'
        fieldLineDesc = '从正电荷出发，终止于负电荷'
      } else {
        title = '同种电荷电场'
        fieldLineDesc = isPositive1
          ? '从两正电荷向外辐射，中间相互排斥'
          : '从无限远指向两负电荷，中间相互排斥'
      }

      const lx = 16
      const ly = 16
      const legendH = showVectors ? 110 : 60

      const panelRadius = parseInt(radius.base, 10)

      ctx.fillStyle = PANEL_BG
      ctx.beginPath()
      ctx.roundRect(lx, ly, 260, legendH, panelRadius)
      ctx.fill()
      ctx.strokeStyle = PANEL_BORDER
      ctx.lineWidth = CANVAS_STYLE.stroke.reference
      ctx.stroke()

      ctx.font = `bold ${FONT.title}px ${FONT.family}`
      ctx.fillStyle = PHYSICS_COLORS.labelText
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(title, lx + 10, ly + 8)

      if (showVectors && !bothZero) {
        ctx.font = `${FONT.axis}px ${FONT.family}`
        ctx.fillStyle = PHYSICS_COLORS.electricField
        ctx.fillText(`电场线：${fieldLineDesc}`, lx + 10, ly + 30)

        ctx.fillStyle = PHYSICS_COLORS.electricPotential
        ctx.fillText('等势面（虚线）：与电场线处处垂直', lx + 10, ly + 48)

        ctx.fillStyle = PHYSICS_COLORS.axis
        ctx.fillText('高考要点：沿电场线方向电势降低', lx + 10, ly + 68)
        ctx.fillText('高考要点：等势面上移动电荷，电场力不做功', lx + 10, ly + 86)
      }

      // Legend items
      if (showVectors) {
        const ly2 = ly + legendH + 8
        ctx.fillStyle = PANEL_BG
        ctx.beginPath()
        ctx.roundRect(lx, ly2, 200, 36, panelRadius)
        ctx.fill()
        ctx.strokeStyle = PANEL_BORDER
        ctx.lineWidth = CANVAS_STYLE.stroke.reference
        ctx.stroke()

        ctx.strokeStyle = PHYSICS_COLORS.positiveCharge
        ctx.lineWidth = CANVAS_STYLE.stroke.vectorSub
        ctx.beginPath()
        ctx.moveTo(lx + 10, ly2 + 12)
        ctx.lineTo(lx + 32, ly2 + 12)
        ctx.stroke()
        drawArrowHead(ctx, lx + 32, ly2 + 12, 0, 5)

        ctx.font = `${FONT.axis}px ${FONT.family}`
        ctx.fillStyle = PHYSICS_COLORS.labelText
        ctx.textBaseline = 'middle'
        ctx.fillText('电场线', lx + 40, ly2 + 12)

        ctx.strokeStyle = PHYSICS_COLORS.electricPotential
        ctx.lineWidth = CANVAS_STYLE.stroke.reference
        ctx.setLineDash([5, 4])
        ctx.beginPath()
        ctx.moveTo(lx + 10, ly2 + 26)
        ctx.lineTo(lx + 32, ly2 + 26)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillText('等势面', lx + 40, ly2 + 26)
      }
    }
  }, [canvasSize, q1, q2, distance, showVectors, showFormulas, showGrid])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvasSize.width
    canvas.height = canvasSize.height
    draw()
  }, [draw, canvasSize])

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block bg-white rounded-lg shadow-inner"
      />
    </div>
  )
}
