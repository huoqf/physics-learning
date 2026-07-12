import { useCallback, useEffect, useRef } from 'react'
import { useSimulationFrame } from '@/utils/animation'
import { useAnimationViewport, useCanvasViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { MODERN_COLORS, EM_COLORS, PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics/colors'
import { colors } from '@/theme/colors'

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  trail: { x: number; y: number }[]
  color: string
  active: boolean
  isCounted?: boolean
}

interface ScatterSimProps {
  isPlaying: boolean
  time: number
  modelType: number
  impactParameter: number
  autoEmit: boolean
  keepTrails: boolean
  launchTrigger: number
  clearTrigger: number
  updateParam: (key: string, value: number) => void
}

export default function ScatterSim({ isPlaying, time: _time, modelType, impactParameter, autoEmit, keepTrails, launchTrigger, clearTrigger, updateParam }: ScatterSimProps) {
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full, presetCompensation: 1.2 })
  const { font } = canvasSize
  const { canvasRef, setupFrame } = useCanvasViewport({ vp, canvasSize, mode: 'raw' })

  const modelTypeRef = useRef(modelType)
  const bRef = useRef(impactParameter)
  const autoEmitRef = useRef(autoEmit)
  const keepTrailsRef = useRef(keepTrails)
  const particlesRef = useRef<Particle[]>([])
  const statsRef = useRef({ straight: 0, deflected: 0, rebounded: 0 })
  const nextIdRef = useRef(0)
  const lastEmitTimeRef = useRef(0)

  // 同步 props 到 ref
  useEffect(() => { modelTypeRef.current = modelType }, [modelType])
  useEffect(() => { bRef.current = impactParameter }, [impactParameter])
  useEffect(() => { autoEmitRef.current = autoEmit }, [autoEmit])
  useEffect(() => { keepTrailsRef.current = keepTrails }, [keepTrails])

  // 发射粒子
  const emitParticle = useCallback((offsetY?: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cy = canvasSize.height / 2
    const targetY = offsetY !== undefined ? cy - offsetY : cy - bRef.current
    particlesRef.current = [
      ...particlesRef.current,
      {
        id: nextIdRef.current++,
        x: 30, y: targetY, vx: 4.5, vy: 0,
        trail: [], color: MODERN_COLORS.photonInfrared, active: true,
      },
    ]
  }, [canvasRef, canvasSize.height])

  // 清空
  const handleClear = useCallback(() => {
    particlesRef.current = []
    statsRef.current = { straight: 0, deflected: 0, rebounded: 0 }
  }, [])

  // 监听触发器
  useEffect(() => {
    if (launchTrigger === 1) {
      emitParticle()
      updateParam('launchTrigger', 0)
    }
  }, [launchTrigger, emitParticle, updateParam])
  useEffect(() => {
    if (clearTrigger === 1) {
      handleClear()
      updateParam('clearTrigger', 0)
    }
  }, [clearTrigger, handleClear, updateParam])

  // 时钟重置
  useEffect(() => {
    if (_time === 0) handleClear()
  }, [_time, handleClear])

  // 参数 b / 模型类型变化时发射一颗演示粒子
  useEffect(() => { emitParticle() }, [modelType, impactParameter, emitParticle])

  // 统一仿真帧循环
  useSimulationFrame(() => {
    const ctx = setupFrame()
    if (!ctx) return

    const W = canvasSize.width
    const H = canvasSize.height
    const cx = W / 2
    const cy = H / 2
    const b = bRef.current
    const modelType = modelTypeRef.current

    // 自动发射
    if (isPlaying && autoEmitRef.current) {
      const now = Date.now()
      if (now - lastEmitTimeRef.current > 700) {
        emitParticle(b + (Math.random() * 16 - 8))
        lastEmitTimeRef.current = now
      }
    }

    // 物理更新
    if (isPlaying) {
      particlesRef.current = particlesRef.current
        .map((p) => {
          if (!p.active) return p
          const nextTrail = [...p.trail, { x: p.x, y: p.y }]
          if (nextTrail.length > 55 && !keepTrailsRef.current) nextTrail.shift()

          let nextX = p.x, nextY = p.y, nextVx = p.vx, nextVy = p.vy

          if (modelType === 0) {
            nextX += p.vx
            nextY += p.vy
          } else {
            // 库仑斥力: F = k·Z₁·Z₂·e² / r²
            // α粒子 Z₁=2, 金核 Z₂=79, 缩放到画布单位
            const dx = p.x - cx
            const dy = p.y - cy
            const r2 = dx * dx + dy * dy
            const r = Math.sqrt(r2)
            const COULOMB_K = 12000
            const rMin2 = 80
            const force = COULOMB_K / Math.max(r2, rMin2)
            nextVx += force * (dx / r) * 0.12
            nextVy += force * (dy / r) * 0.12
            nextX += nextVx
            nextY += nextVy
          }

          const isOut = nextX < 0 || nextX > W || nextY < 0 || nextY > H
          let isCounted = p.isCounted
          if (isOut && !isCounted) {
            isCounted = true
            const speed = Math.sqrt(nextVx * nextVx + nextVy * nextVy)
            const cosTheta = speed > 0 ? nextVx / speed : 1
            const angleDeg = Math.acos(Math.max(-1, Math.min(1, cosTheta))) * (180 / Math.PI)
            const s = statsRef.current
            if (angleDeg < 5) statsRef.current = { ...s, straight: s.straight + 1 }
            else if (angleDeg < 90) statsRef.current = { ...s, deflected: s.deflected + 1 }
            else statsRef.current = { ...s, rebounded: s.rebounded + 1 }
          }

          return { ...p, x: nextX, y: nextY, vx: nextVx, vy: nextVy, trail: nextTrail, active: !isOut, isCounted }
        })
        .filter((p) => keepTrailsRef.current ? true : p.active || p.trail.length > 0)
    }

    // --- 绘制 ---
    const particles = particlesRef.current
    const stats = statsRef.current
    ctx.clearRect(0, 0, W, H)

    // 原子模型
    if (modelType === 0) {
      ctx.save()
      ctx.fillStyle = withAlpha(EM_COLORS.positiveCharge, 0.08)
      ctx.strokeStyle = withAlpha(EM_COLORS.positiveCharge, 0.3)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, 110, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = withAlpha(EM_COLORS.positiveCharge, 0.4)
      ctx.font = `bold ${font(24)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('+', cx - 50, cy - 40)
      ctx.fillText('+', cx + 50, cy - 30)
      ctx.fillText('+', cx - 30, cy + 50)
      ctx.fillText('+', cx + 40, cy + 40)
      ctx.fillText('+', cx, cy - 70)
      const electrons = [
        { x: cx - 20, y: cy - 15 }, { x: cx + 30, y: cy + 10 },
        { x: cx - 40, y: cy + 25 }, { x: cx + 10, y: cy - 45 },
        { x: cx + 50, y: cy - 20 }, { x: cx - 60, y: cy - 30 },
        { x: cx + 15, y: cy + 60 },
      ]
      electrons.forEach((elec) => {
        ctx.beginPath()
        ctx.arc(elec.x, elec.y, 8, 0, Math.PI * 2)
        ctx.fillStyle = EM_COLORS.negativeCharge
        ctx.fill()
        ctx.fillStyle = CANVAS_COLORS.white
        ctx.font = `${font(12)}px monospace`
        ctx.fillText('-', elec.x, elec.y)
      })
      ctx.restore()
    } else {
      ctx.save()
      ctx.strokeStyle = withAlpha(PHYSICS_COLORS.strokeDark, 0.12)
      ctx.lineWidth = 1
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      ctx.arc(cx, cy, 160, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      const gradient = ctx.createRadialGradient(cx, cy, 1, cx, cy, 24)
      gradient.addColorStop(0, CANVAS_COLORS.referencePoint)
      gradient.addColorStop(0.2, withAlpha(CANVAS_COLORS.referencePoint, 0.8))
      gradient.addColorStop(0.5, withAlpha(CANVAS_COLORS.referencePoint, 0.4))
      gradient.addColorStop(1, withAlpha(CANVAS_COLORS.referencePoint, 0))
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(cx, cy, 24, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = CANVAS_COLORS.referencePoint
      ctx.beginPath()
      ctx.arc(cx, cy, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = CANVAS_COLORS.white
      ctx.font = `bold ${font(10)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Au+', cx, cy - 12)
    }

    // 粒子与轨迹
    particles.forEach((p) => {
      if (p.trail.length > 1) {
        ctx.beginPath()
        ctx.moveTo(p.trail[0].x, p.trail[0].y)
        for (let i = 1; i < p.trail.length; i++) ctx.lineTo(p.trail[i].x, p.trail[i].y)
        ctx.strokeStyle = p.active ? withAlpha(MODERN_COLORS.photonInfrared, 0.45) : withAlpha(MODERN_COLORS.photonInfrared, 0.15)
        ctx.lineWidth = 2.5
        ctx.stroke()
      }
      if (p.active) {
        ctx.save()
        ctx.shadowBlur = 8
        ctx.shadowColor = MODERN_COLORS.photonInfrared
        ctx.fillStyle = MODERN_COLORS.photonInfrared
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    })

    // 参考入射线
    ctx.save()
    ctx.strokeStyle = withAlpha(PHYSICS_COLORS.textMuted, 0.4)
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, cy - b)
    ctx.lineTo(W, cy - b)
    ctx.stroke()
    ctx.fillStyle = PHYSICS_COLORS.textMuted
    ctx.font = `${font(11)}px sans-serif`
    ctx.fillText(`b = ${b} px`, 10, cy - b - 6)
    ctx.restore()

    // 统计看板
    drawStatsPanel(ctx, stats, W, H, font)
  }, { active: true })

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-inner relative select-none">
      <div className="absolute top-3 left-4 z-10 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-100/50 shadow-sm">
        <span className="text-sm font-medium text-neutral-700">
          {modelTypeRef.current === 0 ? '汤姆孙"枣糕模型"散射仿真' : '卢瑟福"核式结构"散射仿真'}
        </span>
      </div>
      <div ref={containerRef} className="flex-1 w-full min-h-0 bg-neutral-50 rounded-xl overflow-hidden">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>
      <div className="px-4 py-2 border-t border-neutral-100 text-xs text-neutral-500 bg-neutral-50/50 flex justify-between rounded-b-xl">
        <span>α 粒子带 +2e 电荷，重金原子核带 +79e 电荷</span>
        <span>提示：请在左屏点击"发射 α 粒子"或调节偏导距离 b 探究大偏角散射规律</span>
      </div>
    </div>
  )
}

function drawStatsPanel(ctx: CanvasRenderingContext2D, s: { straight: number; deflected: number; rebounded: number }, w: number, h: number, font: (v: number) => number) {
  const px = w - 185, py = h - 145, pw = 170, ph = 85
  ctx.save()
  ctx.fillStyle = withAlpha(colors.neutral[900], 0.85)
  ctx.beginPath()
  ctx.roundRect(px, py, pw, ph, 8)
  ctx.fill()
  ctx.strokeStyle = withAlpha(colors.neutral.white, 0.15)
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = colors.neutral.white
  ctx.font = `bold ${font(10)}px sans-serif`
  ctx.fillText('α 粒子偏角累计统计', px + 10, py + 16)

  const total = s.straight + s.deflected + s.rebounded
  const pct = (v: number) => total > 0 ? `${((v / total) * 100).toFixed(1)}%` : '0%'
  ctx.font = `${font(10)}px monospace`
  ctx.fillStyle = colors.primary[400]
  ctx.fillText(`直穿(<5°):   ${s.straight} (${pct(s.straight)})`, px + 10, py + 34)
  ctx.fillStyle = colors.accent[400]
  ctx.fillText(`偏转(5-90°): ${s.deflected} (${pct(s.deflected)})`, px + 10, py + 50)
  ctx.fillStyle = colors.danger[400]
  ctx.fillText(`反弹(≥90°):  ${s.rebounded} (${pct(s.rebounded)})`, px + 10, py + 66)
  ctx.fillStyle = colors.neutral[200]
  ctx.font = `${font(9)}px sans-serif`
  ctx.fillText(`总射入粒子数: ${total}`, px + 10, py + 78)
  ctx.restore()
}
