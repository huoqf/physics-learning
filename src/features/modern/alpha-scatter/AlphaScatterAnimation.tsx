import { useCallback, useEffect, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useSimulationFrame } from '@/utils/animation'
import { useAnimationViewport, useCanvasViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { MODERN_COLORS, EM_COLORS, PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import {
  ALPHA_SPEED_PX_PER_FRAME,
  classifyScatterAngle,
  velocityDeflectionDeg,
  integrateAlphaScatterFrame,
  type ScatterParticleState,
} from '@/physics/alphaScatter'

interface Particle extends ScatterParticleState {
  id: number
  trail: { x: number; y: number }[]
  active: boolean
  isCounted?: boolean
}

/** 自动发射间隔（ms）：使统计面板能在数秒内积累出可信的角分布 */
const AUTO_EMIT_INTERVAL_MS = 260

/** 单条径迹保留的最大采样点数 */
const MAX_TRAIL_POINTS = 55

export default function AlphaScatterAnimation() {
  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const time = useAnimationStore((s) => s.time)
  const params = useAnimationStore((s) => s.params)
  const updateParam = useAnimationStore((s) => s.updateParam)

  const modelType = params.modelType ?? 1
  const impactParameter = params.impactParameter ?? 15
  const autoEmit = params.autoEmit !== 0
  const keepTrails = params.keepTrails === 1
  const launchTrigger = params.launchTrigger ?? 0
  const clearTrigger = params.clearTrigger ?? 0

  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
  const { font } = canvasSize
  const { canvasRef, setupFrame } = useCanvasViewport({ vp, canvasSize, mode: 'raw' })

  const modelTypeRef = useRef(modelType)
  const bRef = useRef(impactParameter)
  const autoEmitRef = useRef(autoEmit)
  const keepTrailsRef = useRef(keepTrails)
  const particlesRef = useRef<Particle[]>([])
  const statsRef = useRef({ straight: 0, deflected: 0, rebound: 0 })
  const nextIdRef = useRef(0)
  const lastEmitTimeRef = useRef(0)

  useEffect(() => { modelTypeRef.current = modelType }, [modelType])
  useEffect(() => { bRef.current = impactParameter }, [impactParameter])
  useEffect(() => { autoEmitRef.current = autoEmit }, [autoEmit])
  useEffect(() => { keepTrailsRef.current = keepTrails }, [keepTrails])

  /**
   * 发射一个 α 粒子。
   * @param targetY 入射高度（px，设计坐标）；不传则取左屏“碰撞参数 b”对应的入射线
   */
  const emitParticle = useCallback((targetY?: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cy = canvasSize.height / 2
    particlesRef.current = [
      ...particlesRef.current,
      {
        id: nextIdRef.current++,
        x: 30,
        y: targetY !== undefined ? targetY : cy - bRef.current,
        vx: ALPHA_SPEED_PX_PER_FRAME,
        vy: 0,
        trail: [],
        active: true,
      },
    ]
  }, [canvasRef, canvasSize.height])

  const handleClear = useCallback(() => {
    particlesRef.current = []
    statsRef.current = { straight: 0, deflected: 0, rebound: 0 }
  }, [])

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

  useEffect(() => {
    if (time === 0) handleClear()
  }, [time, handleClear])

  useEffect(() => {
    emitParticle()
  }, [modelType, impactParameter, emitParticle])

  useSimulationFrame(() => {
    const ctx = setupFrame()
    if (!ctx) return

    const W = canvasSize.width
    const H = canvasSize.height
    const cx = W / 2
    const cy = H / 2
    const b = bRef.current
    const curModel = modelTypeRef.current

    // 束流在入射高度上均匀取样：绝大多数粒子的碰撞参数远大于库仑作用尺度 a，
    // 于是“绝大多数直穿、少数偏转、极少数反弹”由统计自然涌现，而非人为指定 b
    if (isPlaying && autoEmitRef.current) {
      const now = Date.now()
      if (now - lastEmitTimeRef.current > AUTO_EMIT_INTERVAL_MS) {
        emitParticle(Math.random() * H)
        lastEmitTimeRef.current = now
      }
    }

    if (isPlaying) {
      particlesRef.current = particlesRef.current
        .map((p) => {
          if (!p.active) return p
          const nextTrail = [...p.trail, { x: p.x, y: p.y }]
          if (nextTrail.length > MAX_TRAIL_POINTS && !keepTrailsRef.current) nextTrail.shift()

          // 汤姆孙“枣糕模型”：正电荷弥散，α 粒子几乎不受力而直穿
          // 卢瑟福“核式结构模型”：受金核库仑斥力，沿双曲线偏转
          const next = curModel === 0
            ? { x: p.x + p.vx, y: p.y + p.vy, vx: p.vx, vy: p.vy }
            : integrateAlphaScatterFrame(p, cx, cy)

          const isOut = next.x < 0 || next.x > W || next.y < 0 || next.y > H
          let isCounted = p.isCounted
          if (isOut && !isCounted) {
            isCounted = true
            const scatterClass = classifyScatterAngle(velocityDeflectionDeg(next.vx, next.vy))
            const s = statsRef.current
            statsRef.current = { ...s, [scatterClass]: s[scatterClass] + 1 }
          }

          return { ...p, ...next, trail: nextTrail, active: !isOut, isCounted }
        })
        .filter((p) => keepTrailsRef.current ? true : p.active || p.trail.length > 0)
    }

    ctx.clearRect(0, 0, W, H)

    // 绘制模型
    if (curModel === 0) {
      // 汤姆孙枣糕模型
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
      // 卢瑟福核式模型
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
      ctx.fillText('Au (79+)', cx, cy - 12)
    }

    // 粒子与轨迹
    particlesRef.current.forEach((p) => {
      if (p.trail.length > 1) {
        ctx.beginPath()
        ctx.moveTo(p.trail[0].x, p.trail[0].y)
        for (let i = 1; i < p.trail.length; i++) ctx.lineTo(p.trail[i].x, p.trail[i].y)
        ctx.strokeStyle = p.active
          ? withAlpha(MODERN_COLORS.photonInfrared, 0.45)
          : withAlpha(MODERN_COLORS.photonInfrared, 0.15)
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

    // 参考入射基线
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

    // 偏角统计看板
    drawStatsPanel(ctx, statsRef.current, W, H, font)
  }, { active: true })

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-inner relative select-none">
      <div className="absolute top-3 left-4 z-10 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-200/60 shadow-sm">
        <span className="text-sm font-semibold text-neutral-800">
          {modelType === 0 ? '汤姆孙“枣糕模型”散射检验' : '卢瑟福“核式结构”库仑散射模拟'}
        </span>
      </div>
      <div ref={containerRef} className="flex-1 w-full min-h-0 bg-neutral-50 rounded-xl overflow-hidden">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>
    </div>
  )
}

function drawStatsPanel(
  ctx: CanvasRenderingContext2D,
  s: { straight: number; deflected: number; rebound: number },
  w: number,
  h: number,
  font: (v: number) => number,
) {
  const px = w - 190, py = h - 140, pw = 176, ph = 86
  ctx.save()
  ctx.fillStyle = withAlpha(CANVAS_COLORS.strokeDark, 0.88)
  ctx.beginPath()
  ctx.roundRect(px, py, pw, ph, 8)
  ctx.fill()
  ctx.strokeStyle = withAlpha(CANVAS_COLORS.white, 0.15)
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = CANVAS_COLORS.white
  ctx.font = `bold ${font(11)}px sans-serif`
  ctx.fillText('α 粒子散射角度统计', px + 10, py + 16)

  const total = s.straight + s.deflected + s.rebound
  const pct = (v: number) => total > 0 ? `${((v / total) * 100).toFixed(1)}%` : '0%'
  ctx.font = `${font(10)}px monospace`
  ctx.fillStyle = CANVAS_COLORS.white
  ctx.fillText(`直穿 (<5°):    ${s.straight} (${pct(s.straight)})`, px + 10, py + 34)
  ctx.fillStyle = MODERN_COLORS.photon
  ctx.fillText(`大角偏转(5-90°): ${s.deflected} (${pct(s.deflected)})`, px + 10, py + 50)
  ctx.fillStyle = PHYSICS_COLORS.forceArrowRed
  ctx.fillText(`反弹 (≥90°):   ${s.rebound} (${pct(s.rebound)})`, px + 10, py + 66)
  ctx.fillStyle = CANVAS_COLORS.labelTextLight
  ctx.font = `${font(9)}px sans-serif`
  ctx.fillText(`总射入样本数: ${total}`, px + 10, py + 78)
  ctx.restore()
}
