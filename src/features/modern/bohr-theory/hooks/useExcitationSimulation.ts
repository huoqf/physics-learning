import { useCallback, useEffect, useRef, useState } from 'react'
import { useAnimationViewport, useCanvasViewport } from '@/hooks'
import { useSimulationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { MODERN_COLORS, EM_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics/colors'
import type { AtomState, IncidentParticle, OutgoingPhoton, CascadeStep, TransitionLine, CollisionCard } from '../components/types'
import { ENERGY_MAP } from '../components/types'
import { drawCollisionCard, drawEnergyLevels, drawSpectrum } from '../components/drawExcitation'

interface UseExcitationSimulationParams {
  isPlaying: boolean
  time: number
  atomQuantity: number
  excitationType: number
  incidentEnergy: number
  launchTrigger: number
  clearTrigger: number
  updateParam: (key: string, value: number) => void
}

export function useExcitationSimulation({
  isPlaying: _isPlaying,
  time,
  atomQuantity,
  excitationType,
  incidentEnergy,
  launchTrigger,
  clearTrigger,
  updateParam,
}: UseExcitationSimulationParams) {
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full, presetCompensation: 1.2 })
  const { canvasRef, setupFrame } = useCanvasViewport({ vp, canvasSize, mode: 'raw' })

  const atomQuantityRef = useRef(atomQuantity)
  const excitationTypeRef = useRef(excitationType)
  const incidentEnergyRef = useRef(incidentEnergy)

  useEffect(() => { atomQuantityRef.current = atomQuantity }, [atomQuantity])
  useEffect(() => { excitationTypeRef.current = excitationType }, [excitationType])
  useEffect(() => { incidentEnergyRef.current = incidentEnergy }, [incidentEnergy])

  // ── 原子态 ──
  const atomStateRef = useRef<AtomState>('orbiting')
  const atomLevelRef = useRef(1)

  // ── 电子轨道角度（本地帧计数，始终旋转）──
  const electronAngleRef = useRef(0)
  const frameRef = useRef(0)

  // ── 入射粒子 ──
  const particleRef = useRef<IncidentParticle | null>(null)

  // ── 出射光子 ──
  const outPhotonsRef = useRef<OutgoingPhoton[]>([])

  // ── 级联跃迁队列 ──
  const cascadeQueueRef = useRef<CascadeStep[]>([])
  const cascadeTimerRef = useRef(0)
  const activeTransitionsRef = useRef<TransitionLine[]>([])

  // ── 碰撞卡片 ──
  const collisionCardRef = useRef<CollisionCard | null>(null)

  // ── 光谱检测 ──
  const [detectedLines, setDetectedLines] = useState<number[]>([])

  // ── 参数变化时复位 ──
  useEffect(() => {
    particleRef.current = null
    outPhotonsRef.current = []
    atomStateRef.current = 'orbiting'
    atomLevelRef.current = 1
    cascadeQueueRef.current = []
    activeTransitionsRef.current = []
    collisionCardRef.current = null
    isEmittingRef.current = false
  }, [excitationType, incidentEnergy, atomQuantity])

  // ── 时钟重置 ──
  useEffect(() => {
    if (time === 0) {
      particleRef.current = null
      outPhotonsRef.current = []
      atomStateRef.current = 'orbiting'
      atomLevelRef.current = 1
      cascadeQueueRef.current = []
      activeTransitionsRef.current = []
      collisionCardRef.current = null
      isEmittingRef.current = false
      setDetectedLines([])
    }
  }, [time])

  // ── 发射入射粒子 ──
  const isEmittingRef = useRef(false)

  const handleLaunch = useCallback(() => {
    if (atomStateRef.current === 'transitioning') return
    particleRef.current = {
      x: canvasSize.width - 50,
      y: canvasSize.height / 2,
      vx: -4.5, vy: 0,
      energy: incidentEnergyRef.current,
      type: excitationTypeRef.current === 0 ? 'photon' : 'electron',
      active: true, hasCollided: false,
    }
    isEmittingRef.current = true
  }, [canvasSize.width, canvasSize.height])

  // ── 重置实验 ──
  const handleReset = useCallback(() => {
    particleRef.current = null
    outPhotonsRef.current = []
    atomStateRef.current = 'orbiting'
    atomLevelRef.current = 1
    cascadeQueueRef.current = []
    activeTransitionsRef.current = []
    collisionCardRef.current = null
    isEmittingRef.current = false
    setDetectedLines([])
  }, [])

  // ── 触发器监听 ──
  useEffect(() => {
    if (launchTrigger === 1) { handleLaunch(); updateParam('launchTrigger', 0) }
  }, [launchTrigger, handleLaunch, updateParam])

  useEffect(() => {
    if (clearTrigger === 1) { handleReset(); updateParam('clearTrigger', 0) }
  }, [clearTrigger, handleReset, updateParam])

  // ── 构建级联队列 ──
  const buildCascadeQueue = (startLvl: number): CascadeStep[] => {
    const steps: CascadeStep[] = []
    if (atomQuantityRef.current === 0) {
      // 一群原子：所有可能路径
      if (startLvl === 4) {
        steps.push(
          { from: 4, to: 3, ...ENERGY_MAP['4->3'] },
          { from: 4, to: 2, ...ENERGY_MAP['4->2'] },
          { from: 4, to: 1, ...ENERGY_MAP['4->1'] },
          { from: 3, to: 2, ...ENERGY_MAP['3->2'] },
          { from: 3, to: 1, ...ENERGY_MAP['3->1'] },
          { from: 2, to: 1, ...ENERGY_MAP['2->1'] },
        )
      } else if (startLvl === 3) {
        steps.push(
          { from: 3, to: 2, ...ENERGY_MAP['3->2'] },
          { from: 3, to: 1, ...ENERGY_MAP['3->1'] },
          { from: 2, to: 1, ...ENERGY_MAP['2->1'] },
        )
      } else if (startLvl === 2) {
        steps.push({ from: 2, to: 1, ...ENERGY_MAP['2->1'] })
      }
    } else {
      // 单个原子：随机一条路径
      let curr = startLvl
      while (curr > 1) {
        const to = 1 + Math.floor(Math.random() * (curr - 1))
        steps.push({ from: curr, to, ...ENERGY_MAP[`${curr}->${to}`] })
        curr = to
      }
    }
    return steps
  }

  // ── 帧循环 ──
  useSimulationFrame(() => {
    const ctx = setupFrame()
    if (!ctx) return

    const W = canvasSize.width
    const H = canvasSize.height
    const cx = W * 0.35
    const cy = H / 2
    const dE2 = 10.20, dE3 = 12.09, dE4 = 12.75, dE_ion = 13.60
    const dt = 1 / 60

    // ── 0. 本地帧计数（始终递增）──
    frameRef.current += 1
    const t = frameRef.current / 60
    const lvl = atomLevelRef.current
    electronAngleRef.current += 0.02 * (1.8 / (lvl * lvl * lvl))

    // ── 1. 级联跃迁步进 ──
    if (atomStateRef.current === 'transitioning' && cascadeQueueRef.current.length > 0) {
      cascadeTimerRef.current += dt
      if (cascadeTimerRef.current >= 0.4) {
        cascadeTimerRef.current = 0
        const step = cascadeQueueRef.current.shift()!
        atomLevelRef.current = step.to

        // 添加视觉跃迁箭头
        activeTransitionsRef.current.push({
          from: step.from, to: step.to, color: step.color, life: 1.0,
        })

        // 发射光子
        const angle = Math.random() * Math.PI * 2
        outPhotonsRef.current.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * 3.5, vy: Math.sin(angle) * 3.5,
          color: step.color, energy: step.e, active: true,
        })

        // 记录光谱线
        setDetectedLines((prev) => prev.includes(step.e) ? prev : [...prev, step.e])

        // 队列空了 → 回到轨道态
        if (cascadeQueueRef.current.length === 0) {
          atomStateRef.current = 'orbiting'
        }
      }
    }

    // ── 2. 淡出过渡箭头 ──
    activeTransitionsRef.current = activeTransitionsRef.current
      .map((l) => ({ ...l, life: l.life - 0.015 }))
      .filter((l) => l.life > 0)

    // ── 3. 入射粒子物理更新 ──
    if (isEmittingRef.current) {
      const p = particleRef.current
      if (p && p.active) {
        const nextX = p.x + p.vx

        // 碰撞检测：粒子到达原子核位置
        if (!p.hasCollided && nextX <= cx) {
          p.hasCollided = true
          const e = p.energy

          if (p.type === 'photon') {
            if (e >= dE_ion) {
              // ── 光子电离 ──
              atomStateRef.current = 'ionized'
              atomLevelRef.current = 5
              outPhotonsRef.current.push({
                x: cx, y: cy, vx: 6, vy: -3.5,
                color: EM_COLORS.negativeCharge, energy: e - dE_ion, active: true,
              })
              p.active = false
              isEmittingRef.current = false
            } else {
              // ── 光子激发判定 ──
              const th = 0.05
              let level = 1
              if (Math.abs(e - dE4) < th) level = 4
              else if (Math.abs(e - dE3) < th) level = 3
              else if (Math.abs(e - dE2) < th) level = 2

              if (level > 1) {
                // 激发成功：电子跳到高能级，开始级联回落
                atomStateRef.current = 'excited'
                atomLevelRef.current = level
                p.active = false
                isEmittingRef.current = false
                setTimeout(() => {
                  cascadeQueueRef.current = buildCascadeQueue(level)
                  atomStateRef.current = 'transitioning'
                  cascadeTimerRef.current = 0.4
                }, 800)
              }
              // 激发失败：光子未被吸收，继续穿过原子
            }
          } else {
            // ── 电子碰撞 ──
            if (e >= dE_ion) {
              // 碰撞电离
              atomStateRef.current = 'ionized'
              atomLevelRef.current = 5
              const remain = e - dE_ion
              p.vx = -3.5; p.vy = -1.5; p.energy = remain
              outPhotonsRef.current.push({
                x: cx, y: cy, vx: 5, vy: 2.0,
                color: EM_COLORS.negativeCharge, energy: 0, active: true,
              })
              isEmittingRef.current = false
            } else {
              let lvl = 1, passedE = 0
              if (e >= dE4) { lvl = 4; passedE = dE4 }
              else if (e >= dE3) { lvl = 3; passedE = dE3 }
              else if (e >= dE2) { lvl = 2; passedE = dE2 }

              if (lvl > 1) {
                // 碰撞激发成功
                atomStateRef.current = 'excited'
                atomLevelRef.current = lvl
                const remain = e - passedE
                collisionCardRef.current = { show: true, inE: e, absorbed: passedE, remain, lvl }
                p.vx = -3.5; p.vy = -1.8; p.energy = remain
                setTimeout(() => {
                  cascadeQueueRef.current = buildCascadeQueue(lvl)
                  atomStateRef.current = 'transitioning'
                  cascadeTimerRef.current = 0.4
                }, 800)
              } else {
                // 碰撞失败：弹性散射，电子向右弹回
                p.vx = 2.5; p.vy = 2.5
              }
            }
          }
        }

        p.x += p.vx; p.y += p.vy
        if (p.x < -40 || p.y < 0 || p.y > H) {
          p.active = false
          isEmittingRef.current = false
        }
      }

      // 出射光子更新
      outPhotonsRef.current = outPhotonsRef.current
        .map((op) => {
          if (!op.active) return op
          const nx = op.x + op.vx, ny = op.y + op.vy
          return { ...op, x: nx, y: ny, active: !(nx < 0 || nx > W || ny < 0 || ny > H) }
        })
        .filter((op) => op.active)
    }

    // ── 绘制 ──
    const particle = particleRef.current
    const outPhotons = outPhotonsRef.current
    const atomState = atomStateRef.current
    const atomLevel = atomLevelRef.current
    const activeTransitions = activeTransitionsRef.current
    const collisionCard = collisionCardRef.current
    ctx.clearRect(0, 0, W, H)

    // ── 氢原子核 ──
    ctx.save()
    ctx.fillStyle = CANVAS_COLORS.referencePoint
    ctx.beginPath()
    ctx.arc(cx, cy, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = CANVAS_COLORS.white
    ctx.font = 'bold 9px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('P+', cx, cy)

    // ── 轨道环 ──
    const maxLvl = 4, baseR = 25
    for (let n = 1; n <= maxLvl; n++) {
      const r = (n + 0.6) * baseR
      const isActive = (atomLevel === n && atomState === 'excited')
      ctx.strokeStyle = isActive ? withAlpha(MODERN_COLORS.photoelectron, 0.4) : CANVAS_COLORS.grid
      ctx.lineWidth = isActive ? 2 : 0.8
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = CANVAS_COLORS.textMuted
      ctx.font = '9px monospace'
      ctx.fillText(`n=${n}`, cx + r - 4, cy + 10)
    }

    // ── 跃迁箭头（视觉辅助）──
    activeTransitions.forEach((tr) => {
      const rFrom = (tr.from + 0.6) * baseR, rTo = (tr.to + 0.6) * baseR
      const a = -Math.PI / 4
      const fx = cx + Math.cos(a) * rFrom, fy = cy + Math.sin(a) * rFrom
      const tx = cx + Math.cos(a) * rTo, ty = cy + Math.sin(a) * rTo
      ctx.save()
      ctx.strokeStyle = tr.color
      ctx.globalAlpha = tr.life
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.moveTo(fx, fy); ctx.lineTo(tx, ty)
      ctx.stroke()
      const arrowSize = 6
      const dx = tx - fx, dy = ty - fy
      const la = Math.atan2(dy, dx)
      ctx.fillStyle = tr.color
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(tx - arrowSize * Math.cos(la - Math.PI / 6), ty - arrowSize * Math.sin(la - Math.PI / 6))
      ctx.lineTo(tx - arrowSize * Math.cos(la + Math.PI / 6), ty - arrowSize * Math.sin(la + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    })

    // ── 轨道电子（始终旋转）──
    if (atomState !== 'ionized') {
      const lvl = atomState === 'orbiting' ? atomLevel : atomLevel
      const r = (lvl + 0.6) * baseR
      const rotAngle = electronAngleRef.current
      const ex = cx + Math.cos(rotAngle) * r, ey = cy + Math.sin(rotAngle) * r
      ctx.fillStyle = MODERN_COLORS.photoelectron
      ctx.shadowBlur = atomState === 'excited' ? 10 : 0
      ctx.shadowColor = withAlpha(MODERN_COLORS.photoelectron, 0.6)
      ctx.beginPath()
      ctx.arc(ex, ey, 4.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = CANVAS_COLORS.white
      ctx.font = '7px sans-serif'
      ctx.fillText('e-', ex - 2, ey + 2)
    } else {
      ctx.fillStyle = CANVAS_COLORS.alertRed
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText('⚡️ 电离态 (H+ 核)', cx - 45, cy - 25)
    }
    ctx.restore()

    // ── 入射粒子 ──
    if (particle && particle.active) {
      ctx.save()
      if (particle.type === 'photon') {
        ctx.strokeStyle = MODERN_COLORS.photonUltraviolet
        ctx.lineWidth = 2.5
        ctx.shadowBlur = 6
        ctx.shadowColor = MODERN_COLORS.photonUltraviolet
        ctx.beginPath()
        for (let i = 0; i <= 35; i++) {
          const ratio = i / 35
          const amp = Math.sin(ratio * Math.PI) * 7.0
          const phase = (ratio * 4.0 * Math.PI) - (t * 15)
          const wx = particle.x - i, wy = particle.y + Math.sin(phase) * amp
          if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy)
        }
        ctx.stroke()
        ctx.fillStyle = MODERN_COLORS.photonUltraviolet
        ctx.font = 'bold 11px sans-serif'
        ctx.fillText(`hν: ${particle.energy.toFixed(1)} eV`, particle.x - 20, particle.y - 12)
      } else {
        ctx.shadowBlur = 8
        ctx.shadowColor = EM_COLORS.negativeCharge
        ctx.fillStyle = EM_COLORS.negativeCharge
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = CANVAS_COLORS.white
        ctx.font = 'bold 9px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('-', particle.x, particle.y)
        ctx.fillStyle = '#0f766e'
        ctx.font = 'bold 11px sans-serif'
        ctx.fillText(`e⁻: ${particle.energy.toFixed(1)} eV`, particle.x - 20, particle.y - 12)
      }
      ctx.restore()
    }

    // ── 出射光子 ──
    outPhotons.forEach((op) => {
      ctx.save()
      ctx.strokeStyle = op.color
      ctx.shadowBlur = 6
      ctx.shadowColor = op.color
      ctx.lineWidth = 2
      if (op.color === EM_COLORS.negativeCharge) {
        ctx.fillStyle = EM_COLORS.negativeCharge
        ctx.beginPath()
        ctx.arc(op.x, op.y, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = CANVAS_COLORS.white
        ctx.font = 'bold 8px monospace'
        ctx.fillText('-', op.x - 2, op.y + 2)
        if (op.energy > 0) {
          ctx.fillStyle = '#0f766e'
          ctx.font = '9px sans-serif'
          ctx.fillText(`${op.energy.toFixed(2)} eV`, op.x - 15, op.y - 8)
        }
      } else {
        ctx.beginPath()
        const aTo = Math.atan2(op.vy, op.vx)
        for (let i = 0; i <= 28; i++) {
          const ratio = i / 28
          const amp = Math.sin(ratio * Math.PI) * 5.0
          const phase = (ratio * 3.5 * Math.PI) - (t * 18)
          const wx = op.x + Math.cos(aTo) * i - Math.sin(aTo) * Math.sin(phase) * amp
          const wy = op.y + Math.sin(aTo) * i + Math.cos(aTo) * Math.sin(phase) * amp
          if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy)
        }
        ctx.stroke()
        ctx.fillStyle = op.color
        ctx.font = '9px sans-serif'
        ctx.fillText(`${op.energy.toFixed(2)} eV`, op.x - 15, op.y - 8)
      }
      ctx.restore()
    })

    drawCollisionCard(ctx, collisionCard, W * 0.65, cy)
    drawEnergyLevels(ctx, W, H, atomLevel, activeTransitions)
    drawSpectrum(ctx, W, H, detectedLines, atomLevel, atomQuantityRef.current)
  }, { active: true })

  return { containerRef, canvasRef }
}
