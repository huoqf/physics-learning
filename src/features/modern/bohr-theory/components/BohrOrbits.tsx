import { useEffect, useRef } from 'react'
import { useSimulationFrame } from '@/utils/animation'
import { MODERN_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics/colors'
import { setupCanvasDPR, useDevicePixelRatio } from '@/hooks/useCanvasDPR'

interface PhotonAnimation {
  x: number
  y: number
  targetX: number
  targetY: number
  progress: number
  energy: number
  color: string
  isIncoming: boolean
}

interface BohrOrbitsProps {
  isPlaying: boolean
  time: number
  targetLevel: number
  realScale: boolean
}

export default function BohrOrbits({ isPlaying, time, targetLevel, realScale }: BohrOrbitsProps) {
  useDevicePixelRatio()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasWRef = useRef(680)
  const canvasHRef = useRef(360)

  // 动画状态全部用 ref，避免 rAF 回调依赖 state 导致循环重启
  const electronLevelRef = useRef(targetLevel)
  const angleRef = useRef(0)
  const transitionProgressRef = useRef(1)
  const photonRef = useRef<PhotonAnimation | null>(null)
  const prevLevelRef = useRef(targetLevel)
  const startLevelRef = useRef(targetLevel)

  // targetLevel 变化时触发跃迁过渡
  useEffect(() => {
    const prev = prevLevelRef.current
    if (prev !== targetLevel) {
      startLevelRef.current = prev
      transitionProgressRef.current = 0

      const E1 = -13.6
      const diff = Math.abs((E1 / (targetLevel * targetLevel)) - (E1 / (prev * prev)))

      let photonColor: string = MODERN_COLORS.photonUltraviolet
      if (diff > 12.0) photonColor = MODERN_COLORS.photonUltraviolet
      else if (diff > 10.0) photonColor = MODERN_COLORS.photoelectron
      else if (diff > 2.0) photonColor = '#06b6d4'
      else if (diff > 1.5) photonColor = MODERN_COLORS.photonInfrared
      else photonColor = MODERN_COLORS.photonInfrared

      if (targetLevel > prev) {
        photonRef.current = {
          x: 100, y: 80, targetX: 0, targetY: 0,
          progress: 0, energy: diff, color: photonColor, isIncoming: true,
        }
      } else {
        photonRef.current = {
          x: 0, y: 0, targetX: 620, targetY: 100,
          progress: 0, energy: diff, color: photonColor, isIncoming: false,
        }
      }
    }
    prevLevelRef.current = targetLevel
  }, [targetLevel])

  // Canvas 尺寸适配
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const sync = (w: number, h: number) => {
      canvasWRef.current = w
      canvasHRef.current = h
    }
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      sync(width, height)
    })
    ro.observe(parent)
    const rect = parent.getBoundingClientRect()
    sync(rect.width, rect.height)
    return () => ro.disconnect()
  }, [])

  // 统一仿真帧循环（铁律 1 合规）
  useSimulationFrame(() => {
    const W = canvasWRef.current
    const H = canvasHRef.current
    const ctx = setupCanvasDPR(canvasRef, W, H)
    if (!ctx) return
    const cx = W > 300 ? W * 0.65 : W / 2
    const cy = H / 2
    const angle = angleRef.current
    const eLevel = electronLevelRef.current
    const transProg = transitionProgressRef.current
    const photon = photonRef.current
    const tgtLevel = targetLevel

    const getRadius = (n: number) => {
      if (realScale) return n * n * 15
      return (n + 0.6) * 38
    }

    // 1. 更新电子角度
    if (isPlaying) {
      const speedMul = 2.4 / (eLevel * eLevel * eLevel)
      angleRef.current = (angle + 0.02 * speedMul) % (Math.PI * 2)
    }

    // 2. 更新跃迁进度与光子
    if (transProg < 1) {
      if (isPlaying) {
        const step = 0.015
        if (photon && photon.isIncoming) {
          if (photon.progress < 1) {
            const nextP = Math.min(photon.progress + 0.03, 1)
            const eR = getRadius(startLevelRef.current)
            const eX = cx + Math.cos(angle) * eR
            const eY = cy + Math.sin(angle) * eR
            photonRef.current = {
              ...photon, progress: nextP,
              x: 100 + (eX - 100) * nextP,
              y: 80 + (eY - 80) * nextP,
            }
          } else {
            photonRef.current = null
            const next = transProg + step
            if (next >= 1) {
              transitionProgressRef.current = 1
              electronLevelRef.current = tgtLevel
            } else {
              transitionProgressRef.current = next
              electronLevelRef.current = startLevelRef.current + (tgtLevel - startLevelRef.current) * next
            }
          }
        } else {
          const next = transProg + step
          if (next >= 1) {
            transitionProgressRef.current = 1
            electronLevelRef.current = tgtLevel
            if (photon) {
              if (photon.progress < 1) {
                const nextP = Math.min(photon.progress + 0.035, 1)
                photonRef.current = {
                  ...photon, progress: nextP,
                  x: photon.x + (photon.targetX - photon.x) * 0.06,
                  y: photon.y + (photon.targetY - photon.y) * 0.06,
                }
              } else {
                photonRef.current = null
              }
            }
          } else {
            transitionProgressRef.current = next
            const newEL = startLevelRef.current + (tgtLevel - startLevelRef.current) * next
            electronLevelRef.current = newEL
            if (photon) {
              const eR = getRadius(newEL)
              const eX = cx + Math.cos(angle) * eR
              const eY = cy + Math.sin(angle) * eR
              if (photon.progress === 0) {
                photonRef.current = { ...photon, x: eX, y: eY, progress: 0.01 }
              } else {
                const nextP = Math.min(photon.progress + 0.035, 1)
                photonRef.current = {
                  ...photon, progress: nextP,
                  x: photon.x + (photon.targetX - photon.x) * 0.05,
                  y: photon.y + (photon.targetY - photon.y) * 0.05,
                }
              }
            }
          }
        }
      }
    } else {
      electronLevelRef.current = tgtLevel
      if (photon && !photon.isIncoming && isPlaying) {
        const nextP = Math.min(photon.progress + 0.035, 1)
        if (nextP >= 1) {
          photonRef.current = null
        } else {
          photonRef.current = {
            ...photon, progress: nextP,
            x: photon.x + (photon.targetX - photon.x) * 0.06,
            y: photon.y + (photon.targetY - photon.y) * 0.06,
          }
        }
      }
    }

    // --- 绘制 ---
    const curLevel = electronLevelRef.current
    const curAngle = angleRef.current
    const curPhoton = photonRef.current
    ctx.clearRect(0, 0, W, H)

    // 3.1 能级图
    const lx1 = 45, lx2 = 175
    const levels = [
      { n: 1, y: 310, e: -13.60, color: '#f87171' },
      { n: 2, y: 220, e: -3.40, color: '#fb923c' },
      { n: 3, y: 170, e: -1.51, color: '#facc15' },
      { n: 4, y: 140, e: -0.85, color: '#60a5fa' },
      { n: 5, y: 95, e: 0.00, color: '#a1a1aa' },
    ]

    ctx.save()
    levels.forEach((lvl) => {
      ctx.strokeStyle = lvl.n === tgtLevel ? withAlpha(MODERN_COLORS.photoelectron, 0.8) : '#e4e4e7'
      ctx.lineWidth = lvl.n === tgtLevel ? 3.5 : 1.5
      ctx.beginPath()
      ctx.moveTo(lx1, lvl.y)
      ctx.lineTo(lx2, lvl.y)
      ctx.stroke()

      ctx.fillStyle = lvl.n === tgtLevel ? MODERN_COLORS.photoelectron : '#71717a'
      ctx.font = lvl.n === tgtLevel ? 'bold 12px sans-serif' : '11px sans-serif'
      ctx.fillText(`n = ${lvl.n}`, lx1 - 32, lvl.y + 4)
      ctx.textAlign = 'right'
      ctx.fillText(`${lvl.e.toFixed(2)} eV`, lx2 + 58, lvl.y + 4)
      ctx.textAlign = 'left'
    })

    let indicatorY = levels[0].y
    if (transitionProgressRef.current >= 1) {
      const match = levels.find((l) => l.n === tgtLevel)
      if (match) indicatorY = match.y
    } else {
      const startY = levels.find((l) => l.n === startLevelRef.current)?.y || levels[0].y
      const tgtY = levels.find((l) => l.n === tgtLevel)?.y || levels[0].y
      indicatorY = startY + (tgtY - startY) * transitionProgressRef.current
    }

    ctx.shadowBlur = 6
    ctx.shadowColor = MODERN_COLORS.photoelectron
    ctx.fillStyle = MODERN_COLORS.photoelectron
    ctx.beginPath()
    ctx.arc(lx1 + (lx2 - lx1) / 2, indicatorY, 5.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // 3.2 原子核
    ctx.save()
    const nuclearRadius = 11
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, nuclearRadius * 2.2)
    grad.addColorStop(0, CANVAS_COLORS.referencePoint)
    grad.addColorStop(0.3, withAlpha(CANVAS_COLORS.referencePoint, 0.8))
    grad.addColorStop(1, withAlpha(CANVAS_COLORS.referencePoint, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, nuclearRadius * 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = CANVAS_COLORS.referencePoint
    ctx.beginPath()
    ctx.arc(cx, cy, nuclearRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('H+', cx, cy)
    ctx.restore()

    // 3.3 轨道
    ctx.save()
    for (let n = 1; n <= 4; n++) {
      ctx.strokeStyle = n === tgtLevel ? withAlpha(MODERN_COLORS.photoelectron, 0.25) : '#f4f4f5'
      ctx.lineWidth = n === tgtLevel ? 2.5 : 1
      ctx.beginPath()
      ctx.arc(cx, cy, getRadius(n), 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#a1a1aa'
      ctx.font = '10px monospace'
      ctx.fillText(`n=${n}`, cx + getRadius(n) - 6, cy + 12)
    }
    ctx.restore()

    // 3.4 电子
    ctx.save()
    const curR = getRadius(curLevel)
    const ex = cx + Math.cos(curAngle) * curR
    const ey = cy + Math.sin(curAngle) * curR
    const elecGrad = ctx.createRadialGradient(ex, ey, 1, ex, ey, 12)
    elecGrad.addColorStop(0, withAlpha(MODERN_COLORS.photoelectron, 0.6))
    elecGrad.addColorStop(0.3, MODERN_COLORS.photoelectron)
    elecGrad.addColorStop(1, withAlpha(MODERN_COLORS.photoelectron, 0))
    ctx.fillStyle = elecGrad
    ctx.beginPath()
    ctx.arc(ex, ey, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = MODERN_COLORS.photoelectron
    ctx.beginPath()
    ctx.arc(ex, ey, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 8px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('e-', ex, ey)
    ctx.restore()

    // 3.5 光子波包
    if (curPhoton) {
      ctx.save()
      ctx.strokeStyle = curPhoton.color
      ctx.lineWidth = 2.5
      ctx.shadowBlur = 6
      ctx.shadowColor = curPhoton.color
      ctx.beginPath()
      const dx = curPhoton.targetX - curPhoton.x
      const dy = curPhoton.targetY - curPhoton.y
      const aTo = Math.atan2(dy, dx)
      const dist = Math.sqrt(dx * dx + dy * dy)
      const waveLen = Math.min(35, dist)
      for (let i = 0; i <= waveLen; i++) {
        const ratio = i / waveLen
        const amp = Math.sin(ratio * Math.PI) * 7.5
        const wavePhase = (ratio * 4.5 * Math.PI) - (time * 16)
        const wx = curPhoton.x + Math.cos(aTo) * i - Math.sin(aTo) * Math.sin(wavePhase) * amp
        const wy = curPhoton.y + Math.sin(aTo) * i + Math.cos(aTo) * Math.sin(wavePhase) * amp
        if (i === 0) ctx.moveTo(wx, wy)
        else ctx.lineTo(wx, wy)
      }
      ctx.stroke()
      ctx.fillStyle = curPhoton.color
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText(`hν = ${curPhoton.energy.toFixed(2)} eV`, curPhoton.x - 25, curPhoton.y - 12)
      ctx.restore()
    }

    // 3.6 公式卡片
    drawFormulaCard(ctx, startLevelRef.current, tgtLevel, W, H)
  }, { active: true })

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-inner relative select-none">
      <div className="absolute top-3 left-4 z-10 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-100/50 shadow-sm">
        <span className="text-sm font-medium text-neutral-700">氢原子能级阶梯与跃迁轨道</span>
      </div>
      <div className="flex-1 w-full min-h-0 bg-neutral-50 rounded-xl overflow-hidden">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>
      <div className="px-4 py-2 border-t border-neutral-100 text-xs text-neutral-500 bg-neutral-50/50 flex justify-between rounded-b-xl">
        <span>轨道半径 rn = n² * 0.53 Å {realScale ? '（已切换至真实 n² 物理比例）' : '（画面已作等比美化视觉优化）'}</span>
        <span>提示：在左侧参数栏调节目标能级 n 触发电子吸能/放能跃迁</span>
      </div>
    </div>
  )
}

function drawFormulaCard(ctx: CanvasRenderingContext2D, prev: number, next: number, w: number, _h: number) {
  if (prev === next) return
  const px = w - 235, py = 50, pw = 220, ph = 80

  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
  ctx.beginPath()
  ctx.roundRect(px, py, pw, ph, 8)
  ctx.fill()
  ctx.strokeStyle = '#e4e4e7'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#18181b'
  ctx.font = 'bold 10px sans-serif'
  ctx.fillText('高考重点：跃迁吸能/放能计算', px + 10, py + 18)

  const isEmission = prev > next
  const dirTxt = isEmission
    ? `辐射光子退激：n = ${prev} → n = ${next}`
    : `吸收光子激发：n = ${prev} → n = ${next}`
  ctx.font = '10px sans-serif'
  ctx.fillStyle = '#71717a'
  ctx.fillText(dirTxt, px + 10, py + 36)

  const E_prev = (-13.6 / (prev * prev)).toFixed(2)
  const E_next = (-13.6 / (next * next)).toFixed(2)
  const diff = Math.abs(parseFloat(E_prev) - parseFloat(E_next)).toFixed(2)
  ctx.font = 'bold 11px monospace'
  ctx.fillStyle = isEmission ? MODERN_COLORS.photonInfrared : MODERN_COLORS.photon
  ctx.fillText(`hν = |E_末 - E_初|`, px + 10, py + 52)
  ctx.fillText(`   = |${E_next} - (${E_prev})| = ${diff} eV`, px + 10, py + 68)

  ctx.restore()
}
