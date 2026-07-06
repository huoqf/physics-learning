import { useEffect, useRef, useState } from 'react'
import { useCanvasSize } from '@/utils'
import { useSimulationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { MODERN_COLORS, EM_COLORS, PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics/colors'

interface IncidentParticle {
  x: number
  y: number
  vx: number
  vy: number
  energy: number
  type: 'photon' | 'electron'
  active: boolean
  hasCollided: boolean
}

interface OutgoingPhoton {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  energy: number
  active: boolean
}

interface TransitionLine {
  from: number
  to: number
  color: string
  life: number
}

interface CollisionCard {
  show: boolean
  inE: number
  absorbed: number
  remain: number
  lvl: number
}

interface ExcitationSimProps {
  isPlaying: boolean
  time: number
  atomQuantity: number
  excitationType: number
  incidentEnergy: number
  launchTrigger: number
  clearTrigger: number
  updateParam: (key: string, value: number) => void
}

export default function ExcitationSim({ isPlaying, time, atomQuantity, excitationType, incidentEnergy, launchTrigger, clearTrigger, updateParam }: ExcitationSimProps) {
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const atomQuantityRef = useRef(atomQuantity)
  const excitationTypeRef = useRef(excitationType)
  const incidentEnergyRef = useRef(incidentEnergy)

  useEffect(() => { atomQuantityRef.current = atomQuantity }, [atomQuantity])
  useEffect(() => { excitationTypeRef.current = excitationType }, [excitationType])
  useEffect(() => { incidentEnergyRef.current = incidentEnergy }, [incidentEnergy])

  // 模拟状态 → ref
  const particleRef = useRef<IncidentParticle | null>(null)
  const outPhotonsRef = useRef<OutgoingPhoton[]>([])
  const atomStateRef = useRef<'ground' | 'excited' | 'ionizing' | 'transitioning'>('ground')
  const atomLevelRef = useRef(1)
  const activeTransitionsRef = useRef<TransitionLine[]>([])
  const collisionCardRef = useRef<CollisionCard | null>(null)
  const isEmittingRef = useRef(false)

  // 需要渲染到 JSX 的状态保留 React state
  const [detectedLines, setDetectedLines] = useState<number[]>([])
  const [explanationText, setExplanationText] = useState('设置入射能量并点击"发射粒子"按钮开始实验。')

  // 参数变化时复位
  useEffect(() => {
    particleRef.current = null
    outPhotonsRef.current = []
    atomStateRef.current = 'ground'
    atomLevelRef.current = 1
    collisionCardRef.current = null
    activeTransitionsRef.current = []
    isEmittingRef.current = false
    const t = excitationTypeRef.current
    const e = incidentEnergyRef.current
    setExplanationText(t === 0
      ? `准备以 ${e.toFixed(1)} eV 的【光子】照射处于基态的氢原子。`
      : `准备以 ${e.toFixed(1)} eV 的【实物电子】碰撞处于基态的氢原子。`)
  }, [excitationType, incidentEnergy, atomQuantity])

  // 发射粒子
  const handleLaunch = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    particleRef.current = {
      x: canvas.width - 50, y: canvas.height / 2,
      vx: -4.5, vy: 0,
      energy: incidentEnergyRef.current,
      type: excitationTypeRef.current === 0 ? 'photon' : 'electron',
      active: true, hasCollided: false,
    }
    outPhotonsRef.current = []
    atomStateRef.current = 'ground'
    atomLevelRef.current = 1
    collisionCardRef.current = null
    activeTransitionsRef.current = []
    isEmittingRef.current = true
    setExplanationText('粒子发射中，正飞向处于基态的氢原子...')
  }

  // 重置
  const handleResetExperiment = () => {
    particleRef.current = null
    outPhotonsRef.current = []
    atomStateRef.current = 'ground'
    atomLevelRef.current = 1
    collisionCardRef.current = null
    activeTransitionsRef.current = []
    isEmittingRef.current = false
    setDetectedLines([])
    setExplanationText('已清空已测光谱线，可重新发射粒子进行测试。')
  }

  // 触发器监听
  useEffect(() => {
    if (launchTrigger === 1) { handleLaunch(); updateParam('launchTrigger', 0) }
  }, [launchTrigger])

  useEffect(() => {
    if (clearTrigger === 1) { handleResetExperiment(); updateParam('clearTrigger', 0) }
  }, [clearTrigger])

  // 时钟重置
  useEffect(() => {
    if (time === 0) {
      particleRef.current = null
      outPhotonsRef.current = []
      atomStateRef.current = 'ground'
      atomLevelRef.current = 1
      collisionCardRef.current = null
      activeTransitionsRef.current = []
      isEmittingRef.current = false
      setDetectedLines([])
    }
  }, [time])

  // 级联跃迁（从 setTimeout / rAF 回调中调用）
  const cascadeTransitions = (startLvl: number, cx: number, cy: number) => {
    const pathList: { from: number; to: number; e: number; color: string }[] = []
    const energyMap: Record<string, { e: number; color: string }> = {
      '4->3': { e: 0.66, color: MODERN_COLORS.photonInfrared },
      '4->2': { e: 2.55, color: '#06b6d4' },
      '4->1': { e: 12.75, color: MODERN_COLORS.photonUltraviolet },
      '3->2': { e: 1.89, color: MODERN_COLORS.photonInfrared },
      '3->1': { e: 12.09, color: MODERN_COLORS.photonUltraviolet },
      '2->1': { e: 10.20, color: MODERN_COLORS.photoelectron },
    }

    if (atomQuantityRef.current === 0) {
      if (startLvl === 4) {
        pathList.push(
          { from: 4, to: 3, ...energyMap['4->3'] }, { from: 4, to: 2, ...energyMap['4->2'] },
          { from: 4, to: 1, ...energyMap['4->1'] }, { from: 3, to: 2, ...energyMap['3->2'] },
          { from: 3, to: 1, ...energyMap['3->1'] }, { from: 2, to: 1, ...energyMap['2->1'] })
      } else if (startLvl === 3) {
        pathList.push(
          { from: 3, to: 2, ...energyMap['3->2'] }, { from: 3, to: 1, ...energyMap['3->1'] },
          { from: 2, to: 1, ...energyMap['2->1'] })
      } else if (startLvl === 2) {
        pathList.push({ from: 2, to: 1, ...energyMap['2->1'] })
      }
    } else {
      let curr = startLvl
      while (curr > 1) {
        const to = 1 + Math.floor(Math.random() * (curr - 1))
        pathList.push({ from: curr, to, ...energyMap[`${curr}->${to}`] })
        curr = to
      }
    }

    activeTransitionsRef.current = pathList.map((p) => ({ from: p.from, to: p.to, color: p.color, life: 1.0 }))

    const newPhotons = pathList.map((p, idx) => {
      const angleOffset = (idx / pathList.length) * Math.PI * 2 + Math.random() * 0.5
      setDetectedLines((prev) => prev.includes(p.e) ? prev : [...prev, p.e])
      return { x: cx, y: cy, vx: Math.cos(angleOffset) * 3.5, vy: Math.sin(angleOffset) * 3.5, color: p.color, energy: p.e, active: true }
    })
    outPhotonsRef.current = newPhotons
    atomStateRef.current = 'ground'
    atomLevelRef.current = 1
  }

  // 统一仿真帧循环
  useSimulationFrame(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvasSize.width
    const H = canvasSize.height
    const cx = W * 0.35
    const cy = H / 2
    const dE2 = 10.20, dE3 = 12.09, dE4 = 12.75, dE_ion = 13.60

    // 淡出过渡线
    if (isPlaying) {
      activeTransitionsRef.current = activeTransitionsRef.current
        .map((l) => ({ ...l, life: l.life - 0.015 }))
        .filter((l) => l.life > 0)
    }

    // 物理更新
    if (isPlaying && isEmittingRef.current) {
      const p = particleRef.current
      if (p && p.active) {
        const nextX = p.x + p.vx

        if (!p.hasCollided && nextX <= cx) {
          p.hasCollided = true
          const e = p.energy

          if (p.type === 'photon') {
            if (e >= dE_ion) {
              atomStateRef.current = 'ionizing'
              atomLevelRef.current = 5
              setExplanationText(`发生电离！由于光子能量 (${e.toFixed(2)} eV) 大于等于电离能 13.60 eV，光子被完全吸收，电子彻底脱离束缚飞离原子！`)
              outPhotonsRef.current = [{ x: cx, y: cy, vx: 6, vy: -3.5, color: EM_COLORS.negativeCharge, energy: e - dE_ion, active: true }]
              p.active = false
            } else {
              const th = 0.05
              let level = 1
              if (Math.abs(e - dE4) < th) level = 4
              else if (Math.abs(e - dE3) < th) level = 3
              else if (Math.abs(e - dE2) < th) level = 2

              if (level > 1) {
                atomStateRef.current = 'excited'
                atomLevelRef.current = level
                setExplanationText(`激发成功！光子能量正好等于能级差，被完全吸收！氢原子跃迁至 n=${level} 能级。`)
                p.active = false
                setTimeout(() => cascadeTransitions(level, cx, cy), 800)
              } else {
                setExplanationText(`激发失败！光子能量 (${e.toFixed(2)} eV) 不等于任何基态能级差。光子无法被吸收，直接穿过！`)
              }
            }
          } else {
            if (e >= dE_ion) {
              atomStateRef.current = 'ionizing'
              atomLevelRef.current = 5
              const remain = e - dE_ion
              setExplanationText(`碰撞电离！入射电子能量 (${e.toFixed(2)} eV) 大于电离能，原子被电离，碰撞后的电子带着剩余动能 (${remain.toFixed(2)} eV) 继续飞行。`)
              p.vx = -3.5; p.vy = -1.5; p.energy = remain
              outPhotonsRef.current = [{ x: cx, y: cy, vx: 5, vy: 2.0, color: EM_COLORS.negativeCharge, energy: 0, active: true }]
            } else {
              let lvl = 1, passedE = 0
              if (e >= dE4) { lvl = 4; passedE = dE4 }
              else if (e >= dE3) { lvl = 3; passedE = dE3 }
              else if (e >= dE2) { lvl = 2; passedE = dE2 }

              if (lvl > 1) {
                atomStateRef.current = 'excited'
                atomLevelRef.current = lvl
                const remain = e - passedE
                setExplanationText(`碰撞成功！入射电子将 ${passedE.toFixed(2)} eV 能量传递给氢原子使其跃迁至 n=${lvl}，自身带着剩余 ${remain.toFixed(2)} eV 的能量折射偏转飞出。`)
                collisionCardRef.current = { show: true, inE: e, absorbed: passedE, remain, lvl }
                p.vx = -3.5; p.vy = -1.8; p.energy = remain
                setTimeout(() => cascadeTransitions(lvl, cx, cy), 800)
              } else {
                setExplanationText(`碰撞失败！入射电子动能 (${e.toFixed(2)} eV) 低于最低激发能 10.2 eV，发生弹性碰撞被弹开，氢原子处于基态未发生激发。`)
                p.vx = -2.5; p.vy = 2.5
              }
            }
          }
        }

        p.x += p.vx; p.y += p.vy
        if (p.x < -40 || p.y < 0 || p.y > H) p.active = false
      }

      outPhotonsRef.current = outPhotonsRef.current
        .map((op) => {
          if (!op.active) return op
          const nx = op.x + op.vx, ny = op.y + op.vy
          return { ...op, x: nx, y: ny, active: !(nx < 0 || nx > W || ny < 0 || ny > H) }
        })
        .filter((op) => op.active)
    }

    // --- 绘制 ---
    const particle = particleRef.current
    const outPhotons = outPhotonsRef.current
    const atomState = atomStateRef.current
    const atomLevel = atomLevelRef.current
    const activeTransitions = activeTransitionsRef.current
    const collisionCard = collisionCardRef.current
    ctx.clearRect(0, 0, W, H)

    // 氢原子
    ctx.save()
    ctx.fillStyle = CANVAS_COLORS.referencePoint
    ctx.beginPath()
    ctx.arc(cx, cy, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 9px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('P+', cx, cy)

    const maxLvl = 4, baseR = 25
    for (let n = 1; n <= maxLvl; n++) {
      const r = (n + 0.6) * baseR
      ctx.strokeStyle = (atomLevel === n && atomState === 'excited') ? withAlpha(MODERN_COLORS.photoelectron, 0.4) : '#e4e4e7'
      ctx.lineWidth = (atomLevel === n && atomState === 'excited') ? 2 : 0.8
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#a1a1aa'
      ctx.font = '9px monospace'
      ctx.fillText(`n=${n}`, cx + r - 4, cy + 10)
    }

    // 跃迁箭头
    activeTransitions.forEach((t) => {
      const rFrom = (t.from + 0.6) * baseR, rTo = (t.to + 0.6) * baseR
      const a = -Math.PI / 4
      const fx = cx + Math.cos(a) * rFrom, fy = cy + Math.sin(a) * rFrom
      const tx = cx + Math.cos(a) * rTo, ty = cy + Math.sin(a) * rTo
      ctx.save()
      ctx.strokeStyle = t.color
      ctx.globalAlpha = t.life
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.moveTo(fx, fy); ctx.lineTo(tx, ty)
      ctx.stroke()
      const arrowSize = 6
      const dx = tx - fx, dy = ty - fy
      const la = Math.atan2(dy, dx)
      ctx.fillStyle = t.color
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(tx - arrowSize * Math.cos(la - Math.PI / 6), ty - arrowSize * Math.sin(la - Math.PI / 6))
      ctx.lineTo(tx - arrowSize * Math.cos(la + Math.PI / 6), ty - arrowSize * Math.sin(la + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    })

    // 轨道电子
    if (atomState !== 'ionizing') {
      const lvl = atomState === 'ground' ? 1 : atomLevel
      const r = (lvl + 0.6) * baseR
      const rotAngle = time * (1.8 / (lvl * lvl))
      const ex = cx + Math.cos(rotAngle) * r, ey = cy + Math.sin(rotAngle) * r
      ctx.fillStyle = MODERN_COLORS.photoelectron
      ctx.shadowBlur = atomState === 'excited' ? 10 : 0
      ctx.shadowColor = withAlpha(MODERN_COLORS.photoelectron, 0.6)
      ctx.beginPath()
      ctx.arc(ex, ey, 4.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = '7px sans-serif'
      ctx.fillText('e-', ex - 2, ey + 2)
    } else {
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText('⚡️ 电离态 (H+ 核)', cx - 45, cy - 25)
    }
    ctx.restore()

    // 入射粒子
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
          const phase = (ratio * 4.0 * Math.PI) - (time * 15)
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
        ctx.fillStyle = '#ffffff'
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

    // 出射光子/电子
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
        ctx.fillStyle = '#ffffff'
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
          const phase = (ratio * 3.5 * Math.PI) - (time * 18)
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
    drawSpectrum(ctx, W, H, detectedLines, atomLevel, atomQuantityRef.current)
  }, { active: true })

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-inner relative select-none">
      <div className="absolute top-3 left-4 z-10 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-100/50 shadow-sm">
        <span className="text-sm font-medium text-neutral-700">激发与退激辐射物理对比仿真</span>
      </div>
      <div ref={containerRef} className="flex-1 w-full min-h-0 bg-neutral-50 rounded-xl overflow-hidden relative">
        <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="block w-full h-full" />
        <div className="absolute bottom-[110px] left-6 right-6 pointer-events-none bg-black/5 border border-black/5 rounded-lg p-2 backdrop-blur-sm">
          <p className="text-xs text-neutral-600 leading-relaxed font-mono">
            <strong>实验实况</strong>：{explanationText}
          </p>
        </div>
      </div>
      <div className="px-4 py-2 border-t border-neutral-100 text-xs text-neutral-500 bg-neutral-50/50 flex justify-between rounded-b-xl">
        <span>最低跃迁能级差 (1→2)：10.20 eV | 电离势：13.60 eV</span>
        <span>提示：请在左侧参数栏切换"一群"与"一个"，发射 12.75 eV 粒子观察谱线种数差异</span>
      </div>
    </div>
  )
}

function drawCollisionCard(ctx: CanvasRenderingContext2D, card: CollisionCard | null, xVal: number, yVal: number) {
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
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 10px sans-serif'
  ctx.fillText('电子碰撞能量分配 (能量守恒)', x + 10, y + 15)
  ctx.font = '10px monospace'
  ctx.fillStyle = '#a1a1aa'
  ctx.fillText(`入射能量: ${card.inE.toFixed(2)} eV`, x + 10, y + 29)
  ctx.fillStyle = '#34d399'
  ctx.fillText(`跃迁吸收: ${card.absorbed.toFixed(2)} eV (n=${card.lvl})`, x + 10, y + 42)
  ctx.fillStyle = '#60a5fa'
  ctx.fillText(`折射余能: ${card.remain.toFixed(2)} eV`, x + 10, y + 54)
  ctx.restore()
}

function drawSpectrum(ctx: CanvasRenderingContext2D, w: number, h: number, detectedLines: number[], atomLevel: number, atomQuantity: number) {
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
