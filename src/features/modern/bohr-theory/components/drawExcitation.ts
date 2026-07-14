import { CANVAS_COLORS, EM_COLORS, MODERN_COLORS, PHYSICS_COLORS, withAlpha } from '@/theme/physics/colors'
import type { CollisionCard, TransitionLine } from './types'

export function drawCollisionCard(ctx: CanvasRenderingContext2D, card: CollisionCard | null, xVal: number, yVal: number) {
  if (!card || !card.show) return
  const w = 220, h = 60, x = xVal - w / 2, y = yVal - 130
  ctx.save()
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 6)
  ctx.fill()
  ctx.strokeStyle = EM_COLORS.negativeCharge
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = CANVAS_COLORS.white
  ctx.font = 'bold 10px sans-serif'
  ctx.fillText('电子碰撞能量分配 (能量守恒)', x + 10, y + 15)
  ctx.font = '10px monospace'
  ctx.fillStyle = CANVAS_COLORS.textMuted
  ctx.fillText(`入射能量: ${card.inE.toFixed(2)} eV`, x + 10, y + 29)
  ctx.fillStyle = '#34d399'
  ctx.fillText(`跃迁吸收: ${card.absorbed.toFixed(2)} eV (n=${card.lvl})`, x + 10, y + 42)
  ctx.fillStyle = '#60a5fa'
  ctx.fillText(`折射余能: ${card.remain.toFixed(2)} eV`, x + 10, y + 54)
  ctx.restore()
}

export function drawEnergyLevels(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  atomLevel: number,
  activeTransitions: TransitionLine[],
) {
  const lx1 = W * 0.72, lx2 = W * 0.88
  const levels = [
    { n: 1, e: -13.60, color: '#f87171' },
    { n: 2, e: -3.40, color: '#fb923c' },
    { n: 3, e: -1.51, color: '#facc15' },
    { n: 4, e: -0.85, color: '#60a5fa' },
  ]
  const topY = H * 0.15, botY = H * 0.65

  ctx.save()
  // 标题
  ctx.fillStyle = CANVAS_COLORS.textMuted
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('能级图', (lx1 + lx2) / 2, topY - 12)

  levels.forEach((lvl) => {
    const t = (lvl.e - (-13.6)) / (0 - (-13.6))
    const y = botY - t * (botY - topY)
    const isActive = lvl.n === Math.round(atomLevel)

    ctx.strokeStyle = isActive ? withAlpha(MODERN_COLORS.photoelectron, 0.8) : CANVAS_COLORS.grid
    ctx.lineWidth = isActive ? 2.5 : 1
    ctx.beginPath()
    ctx.moveTo(lx1, y); ctx.lineTo(lx2, y)
    ctx.stroke()

    ctx.fillStyle = isActive ? MODERN_COLORS.photoelectron : CANVAS_COLORS.textMuted
    ctx.font = isActive ? 'bold 11px sans-serif' : '10px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`n=${lvl.n}`, lx1 - 4, y + 4)
    ctx.textAlign = 'left'
    ctx.fillText(`${lvl.e.toFixed(2)} eV`, lx2 + 4, y + 4)
  })

  // 跃迁箭头
  activeTransitions.forEach((tr) => {
    const yFrom = botY - (((tr.from === 1 ? -13.6 : tr.from === 2 ? -3.4 : tr.from === 3 ? -1.51 : -0.85) + 13.6) / 13.6) * (botY - topY)
    const yTo = botY - (((tr.to === 1 ? -13.6 : tr.to === 2 ? -3.4 : tr.to === 3 ? -1.51 : -0.85) + 13.6) / 13.6) * (botY - topY)
    const mx = (lx1 + lx2) / 2
    ctx.save()
    ctx.globalAlpha = tr.life
    ctx.strokeStyle = tr.color
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(mx, yFrom); ctx.lineTo(mx, yTo)
    ctx.stroke()
    const arrowSize = 5
    const dir = yTo < yFrom ? -1 : 1
    ctx.fillStyle = tr.color
    ctx.beginPath()
    ctx.moveTo(mx, yTo)
    ctx.lineTo(mx - arrowSize, yTo + dir * arrowSize)
    ctx.lineTo(mx + arrowSize, yTo + dir * arrowSize)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  })

  // 当前电子位置指示
  const curE = atomLevel === 1 ? -13.6 : atomLevel === 2 ? -3.4 : atomLevel === 3 ? -1.51 : -0.85
  const curY = botY - ((curE + 13.6) / 13.6) * (botY - topY)
  const mx = (lx1 + lx2) / 2
  ctx.fillStyle = MODERN_COLORS.photoelectron
  ctx.shadowBlur = 6
  ctx.shadowColor = MODERN_COLORS.photoelectron
  ctx.beginPath()
  ctx.arc(mx, curY, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // 电离线
  ctx.strokeStyle = CANVAS_COLORS.textMuted
  ctx.setLineDash([3, 3])
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(lx1, topY - 8); ctx.lineTo(lx2, topY - 8)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = CANVAS_COLORS.textMuted
  ctx.font = '9px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('0 eV (电离)', (lx1 + lx2) / 2, topY - 14)

  ctx.restore()
}

export function drawSpectrum(ctx: CanvasRenderingContext2D, w: number, h: number, detectedLines: number[], atomLevel: number, atomQuantity: number) {
  const sx = 65, sy = h - 75, sw = w - 130, sh = 16
  const valToX = (e: number) => sx + ((e - 0.5) / 12.5) * sw
  const x_vis_start = valToX(1.61), x_uv_start = valToX(3.10)

  ctx.save()
  ctx.strokeStyle = PHYSICS_COLORS.strokeDark
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(sx, sy, sw, sh, 4)
  ctx.stroke()
  ctx.beginPath()
  ctx.roundRect(sx, sy, sw, sh, 4)
  ctx.clip()

  const irGrad = ctx.createLinearGradient(sx, sy, x_vis_start, sy)
  irGrad.addColorStop(0, '#120404'); irGrad.addColorStop(1, '#1b0808')
  ctx.fillStyle = irGrad
  ctx.fillRect(sx, sy, x_vis_start - sx, sh)

  const visGrad = ctx.createLinearGradient(x_vis_start, sy, x_uv_start, sy)
  visGrad.addColorStop(0, 'rgba(239, 68, 68, 0.18)')
  visGrad.addColorStop(0.2, 'rgba(249, 115, 22, 0.18)')
  visGrad.addColorStop(0.4, 'rgba(234, 179, 8, 0.18)')
  visGrad.addColorStop(0.6, 'rgba(34, 197, 94, 0.18)')
  visGrad.addColorStop(0.75, 'rgba(6, 182, 212, 0.18)')
  visGrad.addColorStop(0.9, 'rgba(59, 130, 246, 0.18)')
  visGrad.addColorStop(1, 'rgba(168, 85, 247, 0.18)')
  ctx.fillStyle = visGrad
  ctx.fillRect(x_vis_start, sy, x_uv_start - x_vis_start, sh)

  const uvGrad = ctx.createLinearGradient(x_uv_start, sy, sx + sw, sy)
  uvGrad.addColorStop(0, '#130a24'); uvGrad.addColorStop(1, '#080312')
  ctx.fillStyle = uvGrad
  ctx.fillRect(x_uv_start, sy, sx + sw - x_uv_start, sh)
  ctx.restore()

  ctx.save()
  ctx.fillStyle = PHYSICS_COLORS.textMuted
  ctx.font = '9px monospace'
  ctx.textAlign = 'right'
  ctx.fillText('0.5 eV', sx - 8, sy + sh - 4)
  ctx.textAlign = 'left'
  ctx.fillText('13.0 eV', sx + sw + 8, sy + sh - 4)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.setLineDash([2, 2])
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x_vis_start, sy); ctx.lineTo(x_vis_start, sy + sh)
  ctx.moveTo(x_uv_start, sy); ctx.lineTo(x_uv_start, sy + sh)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.fillStyle = PHYSICS_COLORS.textMuted
  ctx.font = '9px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('红外区 (不可见)', sx + (x_vis_start - sx) / 2, sy - 6)
  ctx.fillStyle = '#f43f5e'
  ctx.fillText('可见光区', x_vis_start + (x_uv_start - x_vis_start) / 2, sy - 6)
  ctx.fillStyle = PHYSICS_COLORS.textMuted
  ctx.fillText('紫外区 (不可见)', x_uv_start + (sx + sw - x_uv_start) / 2, sy - 6)
  ctx.restore()

  if (detectedLines.length === 0) {
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('待测发射光谱 (激发原子退激辐射后在此捕获亮线)', sx + sw / 2, sy + sh - 4)
    ctx.restore()
  }

  const allPossibleLines = [
    { e: 0.66, color: '#ff4444', label: '0.66 eV (4→3 红外)' },
    { e: 1.89, color: '#ef4444', label: '1.89 eV (3→2 红光)' },
    { e: 2.55, color: '#00f0ff', label: '2.55 eV (4→2 青光)' },
    { e: 10.20, color: '#818cf8', label: '10.20 eV (2→1 紫外)' },
    { e: 12.09, color: '#c084fc', label: '12.09 eV (3→1 紫外)' },
    { e: 12.75, color: '#d8b4fe', label: '12.75 eV (4→1 紫外)' },
  ]

  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.lineWidth = 0.8
  ctx.setLineDash([2, 3])
  allPossibleLines.forEach((line) => {
    const x = valToX(line.e)
    ctx.beginPath()
    ctx.moveTo(x, sy); ctx.lineTo(x, sy + sh)
    ctx.stroke()
  })
  ctx.restore()

  detectedLines.forEach((lineEnergy) => {
    const matched = allPossibleLines.find((l) => Math.abs(l.e - lineEnergy) < 0.05)
    if (matched) {
      const x = valToX(matched.e)
      ctx.save()
      ctx.strokeStyle = matched.color
      ctx.lineWidth = 4
      ctx.shadowBlur = 8
      ctx.shadowColor = matched.color
      ctx.beginPath()
      ctx.moveTo(x, sy); ctx.lineTo(x, sy + sh)
      ctx.stroke()
      ctx.restore()
      const matchedIdx = allPossibleLines.findIndex((l) => l.e === matched.e)
      const textY = sy + sh + (matchedIdx % 2 !== 0 ? 26 : 14)
      ctx.save()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(x, sy + sh); ctx.lineTo(x, textY - 8)
      ctx.stroke()
      ctx.restore()
      ctx.save()
      ctx.fillStyle = matched.color
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(matched.label, x, textY)
      ctx.restore()
    }
  })

  ctx.save()
  ctx.fillStyle = PHYSICS_COLORS.textMuted
  ctx.font = '10px sans-serif'
  ctx.fillText('已测光谱：', sx - 55, sy + 11)
  const n = atomLevel > 1 ? atomLevel : 4
  const formulaTxt = atomQuantity === 0
    ? `一群原子从 n=${n} 退激公式：N_max = n(n-1)/2 = ${n * (n - 1) / 2} 种明线`
    : `单个原子从 n=${n} 退激公式：一次退激最多 n-1 = ${n - 1} 种明线`
  ctx.font = 'bold 10px sans-serif'
  ctx.fillText(formulaTxt, sx, sy + sh + 42)
  ctx.fillStyle = MODERN_COLORS.photoelectron
  ctx.fillText(`已测得明线：${detectedLines.length} 种`, sx + sw - 120, sy + sh + 42)
  ctx.restore()
}
