import { useRef, useEffect } from 'react'
import { useCanvasSize } from '@/utils/useCanvasSize'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { MODERN_COLORS, EM_COLORS, KINEMATICS_COLORS } from '@/theme/physics'
import { withAlpha } from '@/theme/physics/colors'
import type { Photoelectron, PhotonParticle } from '../hooks/usePhotoelectricSimulation'

interface PhototubeCanvasProps {
  photoelectrons: Photoelectron[]
  photonParticles: PhotonParticle[]
  beamColor: string
  isPE: boolean
  I: number
  voltage: number
  mode: number
  showPhotonModel: number
  frequency: number
}

/** 极板几何常量 */
const PLATE_GAP = 100
const PLATE_HALF_H = 50
const TUBE_PADDING = 15
const TUBE_CORNER_R = 20

export default function PhototubeCanvas({
  photoelectrons,
  photonParticles,
  beamColor,
  isPE,
  I,
  voltage,
  mode,
  showPhotonModel,
  frequency,
}: PhototubeCanvasProps) {
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvasSize
    canvas.width = width
    canvas.height = height

    const cx = width / 2
    const cy = height / 2
    const kPlateX = cx - PLATE_GAP / 2
    const aPlateX = cx + PLATE_GAP / 2
    const tubeLeft = kPlateX - TUBE_PADDING
    const tubeRight = aPlateX + TUBE_PADDING
    const tubeWidth = tubeRight - tubeLeft

    ctx.clearRect(0, 0, width, height)

    // ─── 1. 光电管外壳（玻璃壳） ───
    ctx.save()
    ctx.strokeStyle = withAlpha('#D4D4D8', 0.6)
    ctx.lineWidth = 2.5
    ctx.fillStyle = withAlpha('#F4F4F5', 0.25)
    ctx.beginPath()
    ctx.roundRect(tubeLeft, cy - PLATE_HALF_H - TUBE_PADDING, tubeWidth, PLATE_HALF_H * 2 + TUBE_PADDING * 2, TUBE_CORNER_R)
    ctx.fill()
    ctx.stroke()
    // 高光
    ctx.strokeStyle = withAlpha('#FFFFFF', 0.7)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(tubeLeft + 15, cy - PLATE_HALF_H - TUBE_PADDING + 7)
    ctx.lineTo(tubeRight - 15, cy - PLATE_HALF_H - TUBE_PADDING + 7)
    ctx.stroke()
    ctx.restore()

    // ─── 2. 阴极 K 板 ───
    ctx.save()
    ctx.fillStyle = MODERN_COLORS.cathodePlate
    ctx.beginPath()
    ctx.roundRect(kPlateX - 4, cy - PLATE_HALF_H, 8, PLATE_HALF_H * 2, 2)
    ctx.fill()
    ctx.fillStyle = '#18181B'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('K (铯)', kPlateX, cy - PLATE_HALF_H - 8)
    ctx.restore()

    // ─── 3. 阳极 A 板 ───
    ctx.save()
    ctx.fillStyle = MODERN_COLORS.anodePlate
    ctx.beginPath()
    ctx.roundRect(aPlateX - 3, cy - PLATE_HALF_H, 6, PLATE_HALF_H * 2, 2)
    ctx.fill()
    ctx.fillStyle = '#18181B'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('A', aPlateX, cy - PLATE_HALF_H - 8)
    ctx.restore()

    // ─── 4. 电场矢量箭头（通关模式 + 非零电压） ───
    if (mode === 1 && Math.abs(voltage) > 0.05) {
      ctx.save()
      const arrowY = cy
      const arrowLen = Math.min(Math.abs(voltage) * 12, PLATE_GAP * 0.6)
      const dir = voltage > 0 ? 1 : -1 // 正向电压：E 从 A→K（向左）；反向：E 从 K→A（向右）
      const startX = cx - dir * arrowLen / 2
      const endX = cx + dir * arrowLen / 2

      ctx.strokeStyle = EM_COLORS.electricField
      ctx.lineWidth = 2.5
      ctx.fillStyle = EM_COLORS.electricField
      ctx.beginPath()
      ctx.moveTo(startX, arrowY)
      ctx.lineTo(endX, arrowY)
      ctx.stroke()

      // 箭头头部
      const headLen = 8
      ctx.beginPath()
      ctx.moveTo(endX, arrowY)
      ctx.lineTo(endX - dir * headLen, arrowY - 4)
      ctx.lineTo(endX - dir * headLen, arrowY + 4)
      ctx.closePath()
      ctx.fill()

      // 标注 E
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('E', cx, arrowY - 12)
      ctx.restore()
    }

    // ─── 5. 光束 ───
    if (showPhotonModel === 0) {
      // 连续光束模式
      ctx.save()
      ctx.strokeStyle = beamColor
      ctx.shadowBlur = 8
      ctx.shadowColor = beamColor
      ctx.lineWidth = 2.0
      const beamStartX = tubeLeft - 120
      const beamEndX = kPlateX - 5
      const beamDist = beamEndX - beamStartX
      for (let b = 0; b < 3; b++) {
        ctx.beginPath()
        const yOff = (b - 1) * 12
        for (let i = 0; i <= beamDist; i += 2) {
          const ratio = i / beamDist
          const phase = ratio * 12 * Math.PI - (Date.now() * 0.022) + b
          const amp = 5.0 * Math.sin(ratio * Math.PI)
          const wx = beamStartX + i
          const wy = cy + yOff + Math.sin(phase) * amp
          if (i === 0) ctx.moveTo(wx, wy)
          else ctx.lineTo(wx, wy)
        }
        ctx.stroke()
      }
      ctx.restore()
    }

    // ─── 6. 光子微粒 ───
    if (showPhotonModel === 1) {
      ctx.save()
      for (const ph of photonParticles) {
        ctx.fillStyle = beamColor
        ctx.shadowBlur = 6
        ctx.shadowColor = beamColor
        ctx.beginPath()
        ctx.arc(ph.x, ph.y, 4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // ─── 7. 光电子粒子 ───
    ctx.save()
    for (const e of photoelectrons) {
      ctx.fillStyle = KINEMATICS_COLORS.velocity
      ctx.shadowBlur = 6
      ctx.shadowColor = KINEMATICS_COLORS.velocity
      ctx.beginPath()
      ctx.arc(e.x, e.y, 4, 0, Math.PI * 2)
      ctx.fill()
      // 负号标记
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 8px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('-', e.x, e.y)
    }
    ctx.restore()

    // ─── 8. 电路连线 ───
    const bottomY = cy + PLATE_HALF_H + TUBE_PADDING + 50
    ctx.save()
    ctx.strokeStyle = '#71717A'
    ctx.lineWidth = 2
    // K → 下方
    ctx.beginPath()
    ctx.moveTo(kPlateX, cy + PLATE_HALF_H)
    ctx.lineTo(kPlateX, bottomY)
    ctx.lineTo(cx - 30, bottomY)
    ctx.stroke()
    // A → 下方（经过微安表）
    ctx.beginPath()
    ctx.moveTo(aPlateX, cy + PLATE_HALF_H)
    ctx.lineTo(aPlateX, bottomY - 25)
    ctx.stroke()

    // ─── 9. 微安表 ───
    const meterY = bottomY - 12
    ctx.fillStyle = '#FFFFFF'
    ctx.strokeStyle = '#3F3F46'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(aPlateX, meterY, 15, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    // 读数
    ctx.fillStyle = '#18181B'
    ctx.font = '9px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${I.toFixed(2)}μA`, aPlateX, meterY + 5)
    ctx.fillText('μA', aPlateX, meterY - 6)
    // 指针
    ctx.strokeStyle = '#EF4444'
    ctx.lineWidth = 1.2
    const ptrAngle = I > 0 ? Math.PI * 0.25 * Math.min(I / 25, 1) : 0
    ctx.beginPath()
    ctx.moveTo(aPlateX, meterY)
    ctx.lineTo(aPlateX + Math.sin(ptrAngle) * 9, meterY - Math.cos(ptrAngle) * 9)
    ctx.stroke()

    // A 下方连线 → 底部回路
    ctx.strokeStyle = '#71717A'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(aPlateX, meterY + 15)
    ctx.lineTo(aPlateX, bottomY)
    ctx.lineTo(cx + 30, bottomY)
    ctx.stroke()

    // ─── 10. 电源 ───
    const powerX = cx
    ctx.strokeStyle = '#18181B'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(powerX, bottomY - 10)
    ctx.lineTo(powerX, bottomY + 10)
    ctx.stroke()
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(powerX + 6, bottomY - 6)
    ctx.lineTo(powerX + 6, bottomY + 6)
    ctx.stroke()
    // 极性
    ctx.fillStyle = '#18181B'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('+', powerX - 10, bottomY - 6)
    ctx.fillText('−', powerX + 14, bottomY - 6)

    // 电压标注
    if (mode === 1) {
      ctx.fillStyle = '#71717A'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText(`U = ${voltage.toFixed(1)} V`, cx, bottomY + 28)
    }
    ctx.restore()

    // ─── 11. 截止频率标注 ───
    if (!isPE) {
      ctx.save()
      ctx.fillStyle = withAlpha('#EF4444', 0.9)
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('ν < ν₀ — 无法产生光电子', cx, cy + PLATE_HALF_H + TUBE_PADDING + 15)
      ctx.restore()
    }
  }, [canvasSize, photoelectrons, photonParticles, beamColor, isPE, I, voltage, mode, showPhotonModel, frequency])

  return (
    <div ref={containerRef} className="w-full h-full bg-neutral-50 rounded-lg overflow-hidden relative">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  )
}
