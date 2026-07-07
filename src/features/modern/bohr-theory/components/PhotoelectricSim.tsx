import { useEffect, useRef, useMemo } from 'react'
import { useSimulationFrame } from '@/utils/animation'
import { useCanvasSize } from '@/utils/useCanvasSize'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { RelationChart } from '@/components/Chart/RelationChart'
import { MODERN_COLORS, CANVAS_COLORS } from '@/theme/physics/colors'
import { setupCanvasDPR } from '@/hooks/useCanvasDPR'

interface PhotoElectron {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  initVx: number
  active: boolean
  hasTurnedAround: boolean
}

interface PhotoelectricSimProps {
  isPlaying: boolean
  time: number
  radiationPhotonIndex: number
  workFunction: number
  stoppingVoltage: number
}

const PHOTON_ENERGIES = [0.66, 2.55, 12.75, 1.89, 12.09, 10.20]

export default function PhotoelectricSim({ isPlaying, time, radiationPhotonIndex, workFunction, stoppingVoltage }: PhotoelectricSimProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.splitV)

  const hv = PHOTON_ENERGIES[radiationPhotonIndex]
  const isPhotoelectric = hv >= workFunction
  const Ekm = isPhotoelectric ? hv - workFunction : 0
  const Uc = Ekm
  const currentRatio = isPhotoelectric && stoppingVoltage < Uc
    ? (1 - Math.exp(-0.8 * (-stoppingVoltage + Uc))) : 0
  const hasCurrent = currentRatio > 0

  // 模拟状态 → ref
  const electronsRef = useRef<PhotoElectron[]>([])
  const circuitAngleRef = useRef(0)
  const radiationPhotonIndexRef = useRef(radiationPhotonIndex)
  const workFunctionRef = useRef(workFunction)
  const stoppingVoltageRef = useRef(stoppingVoltage)
  const isPhotoelectricRef = useRef(isPhotoelectric)
  const EkmRef = useRef(Ekm)
  const currentRatioRef = useRef(currentRatio)
  const hasCurrentRef = useRef(hasCurrent)
  const nextIdRef = useRef(0)
  const lastEmitTimeRef = useRef(0)

  useEffect(() => { radiationPhotonIndexRef.current = radiationPhotonIndex }, [radiationPhotonIndex])
  useEffect(() => { workFunctionRef.current = workFunction }, [workFunction])
  useEffect(() => { stoppingVoltageRef.current = stoppingVoltage }, [stoppingVoltage])
  useEffect(() => { isPhotoelectricRef.current = isPhotoelectric }, [isPhotoelectric])
  useEffect(() => { EkmRef.current = Ekm }, [Ekm])
  useEffect(() => { currentRatioRef.current = currentRatio }, [currentRatio])
  useEffect(() => { hasCurrentRef.current = hasCurrent }, [hasCurrent])

  // 时钟重置 & 参数变化清空
  useEffect(() => { if (time === 0) electronsRef.current = [] }, [time])
  useEffect(() => { electronsRef.current = [] }, [radiationPhotonIndex, workFunction])

  // 发射光电子（v ∈ [0, vmax] 均匀分布，方向随机）
  const emitPhotoElectron = (kPlateX: number, cy: number) => {
    if (!isPhotoelectricRef.current) return
    const vmax = Math.sqrt(EkmRef.current) * 2.0
    const v = Math.random() * vmax
    const angle = (Math.random() * 0.8 - 0.4)
    const randY = cy - 45 + Math.random() * 90
    electronsRef.current = [
      ...electronsRef.current,
      {
        id: nextIdRef.current++, x: kPlateX + 52, y: randY,
        vx: v, vy: angle,
        initVx: v, active: true, hasTurnedAround: false,
      },
    ]
  }

  // 统一仿真帧循环
  useSimulationFrame(() => {
    const ctx = setupCanvasDPR(canvasRef, canvasSize.width, canvasSize.height)
    if (!ctx) return

    const W = canvasSize.width
    const H = canvasSize.height
    const font = canvasSize.font
    const cx = W / 2, cy = H / 2
    const tubeLeft = cx - 110, tubeRight = cx + 110
    const tubeWidth = tubeRight - tubeLeft
    const kPlateX = cx - 50, aPlateX = cx + 50
    const rIdx = radiationPhotonIndexRef.current
    const sVoltage = stoppingVoltageRef.current
    const curRatio = currentRatioRef.current
    const hasCur = hasCurrentRef.current

    // 自动发射
    if (isPlaying && isPhotoelectricRef.current) {
      const now = Date.now()
      if (now - lastEmitTimeRef.current > 200) {
        emitPhotoElectron(kPlateX, cy)
        lastEmitTimeRef.current = now
      }
    }

    // 物理更新
    if (isPlaying) {
      if (hasCur) {
        circuitAngleRef.current = (circuitAngleRef.current + 0.05 * curRatio) % (Math.PI * 2)
      }

      electronsRef.current = electronsRef.current
        .map((p) => {
          if (!p.active) return p
          let nextX = p.x, nextY = p.y, nextVx = p.vx
          const nextVy = p.vy
          let turned = p.hasTurnedAround

          const d = aPlateX - kPlateX
          const ax = -0.16 * (sVoltage / d)
          nextVx += ax
          nextX += nextVx
          nextY += nextVy

          if (nextVx <= 0 && !turned && nextX < aPlateX) turned = true

          let active: boolean = p.active
          if (nextX >= aPlateX) active = false
          if (turned && nextX <= kPlateX) active = false
          if (nextY < cy - 60 || nextY > cy + 60) active = false

          return { ...p, x: nextX, y: nextY, vx: nextVx, hasTurnedAround: turned, active }
        })
        .filter((p) => p.active)
    }

    // --- 绘制 ---
    const electrons = electronsRef.current
    const cAngle = circuitAngleRef.current
    ctx.clearRect(0, 0, W, H)

    drawHydrogenAtomTransition(ctx, cx, cy, rIdx, time, font)
    drawPhotonBeam(ctx, cx, cy, kPlateX, rIdx, time)

    // 光电管外壳
    ctx.save()
    ctx.strokeStyle = CANVAS_COLORS.textMuted
    ctx.lineWidth = 2.5
    ctx.fillStyle = CANVAS_COLORS.objectFillNeutral
    ctx.beginPath()
    ctx.roundRect(tubeLeft - 5, cy - 65, tubeWidth + 10, 130, 20)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = CANVAS_COLORS.white
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(tubeLeft + 15, cy - 58)
    ctx.lineTo(tubeRight - 15, cy - 58)
    ctx.stroke()
    ctx.restore()

    // 极板 K
    ctx.save()
    ctx.fillStyle = MODERN_COLORS.cathodePlate
    ctx.beginPath()
    ctx.roundRect(kPlateX - 5, cy - 50, 8, 100, 2)
    ctx.fill()
    ctx.fillStyle = CANVAS_COLORS.labelText
    ctx.font = `bold ${font(11)}px sans-serif`
    ctx.fillText('阴极 K (钠)', kPlateX - 25, cy - 56)
    ctx.restore()

    // 极板 A
    ctx.save()
    ctx.fillStyle = MODERN_COLORS.anodePlate
    ctx.beginPath()
    ctx.roundRect(aPlateX - 3, cy - 50, 6, 100, 2)
    ctx.fill()
    ctx.fillStyle = CANVAS_COLORS.labelText
    ctx.font = `bold ${font(11)}px sans-serif`
    ctx.fillText('阳极 A', aPlateX - 10, cy - 56)
    ctx.restore()

    drawCircuit(ctx, cx, cy, kPlateX, aPlateX, sVoltage, hasCur, curRatio, cAngle, font)

    // 光电子
    electrons.forEach((e) => {
      ctx.save()
      ctx.shadowBlur = 6
      ctx.shadowColor = MODERN_COLORS.photoelectron
      ctx.fillStyle = MODERN_COLORS.photoelectron
      ctx.beginPath()
      ctx.arc(e.x, e.y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = CANVAS_COLORS.white
      ctx.font = `bold ${font(8)}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('-', e.x, e.y)
      ctx.restore()
    })
  }, { active: true })

  // RelationChart 数据
  const chartPoints = useMemo(() => {
    const pts = []
    for (let u = -4.0; u <= 3.0; u += 0.2) {
      let iVal = 0
      if (u >= -Uc) iVal = 1 - Math.exp(-0.9 * (u + Uc))
      pts.push({ x: u, y: iVal * 12.8 })
    }
    return pts
  }, [Uc])

  const chartMarkers = useMemo(() => {
    if (isPhotoelectric && Uc > 0) {
      return [{ x: -Uc, label: `-Uc(${-Uc.toFixed(2)}V)`, color: CANVAS_COLORS.alertRed }]
    }
    return []
  }, [isPhotoelectric, Uc])

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-inner relative select-none">
      <div className="flex-1 w-full min-h-0 flex flex-col gap-2 p-2 bg-neutral-50 rounded-xl overflow-hidden">
        <div className="flex-1 min-h-0 w-full bg-white rounded-lg border border-neutral-100 p-2 overflow-hidden shrink-0">
          <RelationChart
            title="光电流 I 与极板电压 U 特征关系曲线"
            xDomain={[-4.0, 3.0]}
            yDomain={[0, 15]}
            points={chartPoints}
            xLabel="极板电压 U (V)" yLabel="光电流 I (μA)"
            cursorX={-stoppingVoltage}
            markers={chartMarkers}
          />
        </div>
        <div ref={containerRef} className="flex-1 min-h-0 relative bg-neutral-50 rounded-lg overflow-hidden">
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
      </div>
    </div>
  )
}

function drawHydrogenAtomTransition(ctx: CanvasRenderingContext2D, cx: number, cy: number, rIdx: number, time: number, font: (v: number) => number) {
  const hx = cx - 215, hy = cy
  ctx.save()
  ctx.strokeStyle = CANVAS_COLORS.grid
  ctx.lineWidth = 0.8
  const radii = [14, 28, 42, 56]
  radii.forEach((r) => {
    ctx.beginPath()
    ctx.arc(hx, hy, r, 0, Math.PI * 2)
    ctx.stroke()
  })
  ctx.fillStyle = CANVAS_COLORS.referencePoint
  ctx.beginPath()
  ctx.arc(hx, hy, 5, 0, Math.PI * 2)
  ctx.fill()

  const transitions = [
    { from: 4, to: 3 }, { from: 4, to: 2 }, { from: 4, to: 1 },
    { from: 3, to: 2 }, { from: 3, to: 1 }, { from: 2, to: 1 },
  ]
  const trans = transitions[rIdx]
  const period = (time * 1.5) % 2.0
  let currentN = trans.from
  let isEmittingPhoton = false
  if (period < 0.6) { currentN = trans.from }
  else if (period < 1.3) { const t = (period - 0.6) / 0.7; currentN = trans.from + (trans.to - trans.from) * t; isEmittingPhoton = true }
  else { currentN = trans.to }

  const r = radii[Math.round(currentN - 1) % radii.length]
  const rotAngle = time * (3.0 / (currentN * currentN))
  const ex = hx + Math.cos(rotAngle) * r, ey = hy + Math.sin(rotAngle) * r
  ctx.fillStyle = MODERN_COLORS.photoelectron
  ctx.beginPath()
  ctx.arc(ex, ey, 3.5, 0, Math.PI * 2)
  ctx.fill()
  if (isEmittingPhoton) {
    ctx.strokeStyle = MODERN_COLORS.photonUltraviolet
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(hx, hy, r, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.fillStyle = CANVAS_COLORS.labelTextLight
  ctx.font = `${font(10)}px sans-serif`
  ctx.fillText('一群氢原子能级跃迁', hx - 42, hy + 76)
  ctx.restore()
}

function drawPhotonBeam(ctx: CanvasRenderingContext2D, cx: number, cy: number, kPlateX: number, rIdx: number, t: number) {
  const hx = cx - 215
  const startX = hx + 40, startY = cy, targetX = kPlateX - 5
  const dist = targetX - startX
  const colors = [MODERN_COLORS.photonInfrared, CANVAS_COLORS.annotation, MODERN_COLORS.photonUltraviolet, MODERN_COLORS.photonInfrared, MODERN_COLORS.photonUltraviolet, MODERN_COLORS.photoelectron]
  const beamColor = colors[rIdx]
  ctx.save()
  ctx.strokeStyle = beamColor
  ctx.shadowBlur = 8
  ctx.shadowColor = beamColor
  ctx.lineWidth = 2.0
  for (let bIdx = 0; bIdx < 3; bIdx++) {
    ctx.beginPath()
    const yOffset = (bIdx - 1) * 12
    const pathLen = dist - 25
    for (let i = 0; i <= pathLen; i += 2) {
      const ratio = i / pathLen
      const wavePhase = (ratio * 12 * Math.PI) - (t * 22) + bIdx
      const amp = 5.0 * Math.sin(ratio * Math.PI)
      const wx = startX + i, wy = startY + yOffset + Math.sin(wavePhase) * amp
      if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy)
    }
    ctx.stroke()
  }
  ctx.restore()
}

function drawCircuit(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  kPlateX: number, aPlateX: number,
  sVoltage: number, hasCur: boolean, curRatio: number, cAngle: number,
  font: (v: number) => number,
) {
  const kWireY = cy + 50, aWireY = cy + 50
  const bottomCircuitY = cy + 115

  ctx.save()
  ctx.strokeStyle = CANVAS_COLORS.labelTextLight
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(kPlateX - 1, kWireY)
  ctx.lineTo(kPlateX - 1, bottomCircuitY)
  ctx.lineTo(cx - 50, bottomCircuitY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(aPlateX + 1, aWireY)
  ctx.lineTo(aPlateX + 1, bottomCircuitY - 30)
  ctx.stroke()

  const meterY = bottomCircuitY - 15
  ctx.fillStyle = CANVAS_COLORS.white
  ctx.strokeStyle = CANVAS_COLORS.strokeDark
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(aPlateX + 1, meterY, 15, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = CANVAS_COLORS.labelText
  ctx.font = `${font(9)}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const curTxt = hasCur ? `${(12.8 * curRatio).toFixed(2)}μA` : '0.00μA'
  ctx.fillText(curTxt, aPlateX + 1, meterY + 6)
  ctx.fillText('μA', aPlateX + 1, meterY - 6)

  ctx.strokeStyle = CANVAS_COLORS.alertRed
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(aPlateX + 1, meterY)
  const ptrAngle = hasCur ? Math.PI * 0.25 * curRatio : 0
  ctx.lineTo(aPlateX + 1 + Math.sin(ptrAngle) * 9, meterY - Math.cos(ptrAngle) * 9)
  ctx.stroke()

  ctx.strokeStyle = CANVAS_COLORS.labelTextLight
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(aPlateX + 1, meterY + 15)
  ctx.lineTo(aPlateX + 1, bottomCircuitY)
  ctx.lineTo(cx + 50, bottomCircuitY)
  ctx.stroke()

  const powerX = cx - 25, powerY = bottomCircuitY
  ctx.strokeStyle = CANVAS_COLORS.labelText
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(powerX, powerY - 10)
  ctx.lineTo(powerX, powerY + 10)
  ctx.stroke()
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(powerX + 6, powerY - 6)
  ctx.lineTo(powerX + 6, powerY + 6)
  ctx.stroke()

  ctx.fillStyle = CANVAS_COLORS.labelText
  ctx.font = `bold ${font(11)}px sans-serif`
  ctx.fillText('+', powerX - 10, powerY - 6)
  ctx.fillText('-', powerX + 12, powerY - 6)

  const resX = cx + 18
  ctx.strokeStyle = CANVAS_COLORS.labelText
  ctx.fillStyle = CANVAS_COLORS.grid
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.rect(resX, powerY - 5, 24, 10)
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = CANVAS_COLORS.alertRed
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(resX + 12, powerY + 12)
  ctx.lineTo(resX + 12, powerY)
  ctx.lineTo(resX + 8, powerY + 4)
  ctx.moveTo(resX + 12, powerY)
  ctx.lineTo(resX + 16, powerY + 4)
  ctx.stroke()

  ctx.fillStyle = CANVAS_COLORS.labelTextLight
  ctx.font = `bold ${font(11)}px sans-serif`
  ctx.fillText(`反向电压 U = ${sVoltage.toFixed(1)} V`, cx - 55, bottomCircuitY + 28)

  if (hasCur) {
    ctx.fillStyle = MODERN_COLORS.photoelectron
    const points = [
      { x: kPlateX - 1, y: cy + 50 + (bottomCircuitY - (cy + 50)) * (cAngle / (Math.PI * 2)) },
      { x: (cx - 50) + 100 * (cAngle / (Math.PI * 2)), y: bottomCircuitY },
      { x: aPlateX + 1, y: bottomCircuitY - (bottomCircuitY - (cy + 50)) * (cAngle / (Math.PI * 2)) },
    ]
    points.forEach((pt) => {
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    })
  }
  ctx.restore()
}
