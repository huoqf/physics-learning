import { useEffect, useRef, useState } from 'react'
import { useAnimationStore } from '@/stores'
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS } from '@/theme/physics/colors'


interface IncidentParticle {
  x: number
  y: number
  vx: number
  vy: number
  energy: number
  type: 'photon' | 'electron' // photon 或 electron
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

export default function ExcitationSim({ isPlaying, time }: { isPlaying: boolean; time: number }) {
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  
  const params = useAnimationStore((s) => s.params)
  const updateParam = useAnimationStore((s) => s.updateParam)
  
  const atomQuantity = params.atomQuantity ?? 0 // 0: 一群, 1: 单个
  const excitationType = params.excitationType ?? 0 // 0: 光子, 1: 电子
  const incidentEnergy = params.incidentEnergy ?? 10.2 // 入射能量 eV
  const launchTrigger = params.launchTrigger ?? 0
  const clearTrigger = params.clearTrigger ?? 0
  
  // 模拟控制状态
  const [particle, setParticle] = useState<IncidentParticle | null>(null)
  const [outPhotons, setOutPhotons] = useState<OutgoingPhoton[]>([])
  const [atomState, setAtomState] = useState<'ground' | 'excited' | 'ionizing' | 'transitioning'>('ground')
  const [atomLevel, setAtomLevel] = useState(1)
  const [detectedLines, setDetectedLines] = useState<number[]>([]) // 已收集的谱线能量列表
  const [explanationText, setExplanationText] = useState('设置入射能量并点击“发射粒子”按钮开始实验。')

  // 高考教学优化新状态
  interface TransitionLine {
    from: number
    to: number
    color: string
    life: number // 0 ~ 1, 用于退色淡出
  }
  const [activeTransitions, setActiveTransitions] = useState<TransitionLine[]>([])
  const [collisionCard, setCollisionCard] = useState<{
    show: boolean
    inE: number
    absorbed: number
    remain: number
    lvl: number
  } | null>(null)

  const isEmittingRef = useRef(false)

  // 当入射类型、能量变化时，复位并提示
  useEffect(() => {
    setParticle(null)
    setOutPhotons([])
    setAtomState('ground')
    setAtomLevel(1)
    setCollisionCard(null)
    setActiveTransitions([])
    isEmittingRef.current = false
    
    if (excitationType === 0) {
      setExplanationText(`准备以 ${incidentEnergy.toFixed(1)} eV 的【光子】照射处于基态的氢原子。`);
    } else {
      setExplanationText(`准备以 ${incidentEnergy.toFixed(1)} eV 的【实物电子】碰撞处于基态的氢原子。`);
    }
  }, [excitationType, incidentEnergy, atomQuantity])

  // 发射粒子
  const handleLaunch = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    
    setParticle({
      x: canvas.width - 50,
      y: canvas.height / 2,
      vx: -4.5,
      vy: 0,
      energy: incidentEnergy,
      type: excitationType === 0 ? 'photon' : 'electron',
      active: true,
      hasCollided: false,
    })
    setOutPhotons([])
    setAtomState('ground')
    setAtomLevel(1)
    setCollisionCard(null)
    setActiveTransitions([])
    isEmittingRef.current = true
    
    setExplanationText('粒子发射中，正飞向处于基态的氢原子...')
  }

  // 重置光谱和探测结果
  const handleResetExperiment = () => {
    setDetectedLines([])
    setParticle(null)
    setOutPhotons([])
    setAtomState('ground')
    setAtomLevel(1)
    setCollisionCard(null)
    setActiveTransitions([])
    isEmittingRef.current = false
    setExplanationText('已清空已测光谱线，可重新发射粒子进行测试。')
  }

  // 监听声明式面板发来的触发动作
  useEffect(() => {
    if (launchTrigger === 1) {
      handleLaunch()
      updateParam('launchTrigger', 0) // 复位
    }
  }, [launchTrigger])

  useEffect(() => {
    if (clearTrigger === 1) {
      handleResetExperiment()
      updateParam('clearTrigger', 0) // 复位
    }
  }, [clearTrigger])

  // 监听时钟重置
  useEffect(() => {
    if (time === 0) {
      setDetectedLines([])
      setParticle(null)
      setOutPhotons([])
      setAtomState('ground')
      setAtomLevel(1)
      setCollisionCard(null)
      setActiveTransitions([])
      isEmittingRef.current = false
    }
  }, [time])

  // 物理与动画更新
  useEffect(() => {
    let animationFrameId: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const update = () => {
      const cx = canvas.width * 0.35 // 氢原子在左偏三分之一位置
      const cy = canvas.height / 2

      // 能级差阈值定义
      const dE2 = 10.20
      const dE3 = 12.09
      const dE4 = 12.75
      const dE_ion = 13.60

      // 淡出过渡轨道线
      if (isPlaying) {
        setActiveTransitions((prev) =>
          prev
            .map((line) => ({ ...line, life: line.life - 0.015 }))
            .filter((line) => line.life > 0)
        )
      }

      if (isPlaying && isEmittingRef.current) {
        // 1. 更新入射粒子的位置
        if (particle && particle.active) {
          const nextX = particle.x + particle.vx

          // 碰撞判定：当到达氢原子外围（接近 cx 时）
          if (!particle.hasCollided && nextX <= cx) {
            particle.hasCollided = true
            const e = particle.energy

            if (particle.type === 'photon') {
              // ------------------- 光子照射判定 -------------------
              if (e >= dE_ion) {
                // 电离
                setAtomState('ionizing')
                setAtomLevel(5) // 游离态
                setExplanationText(`发生电离！由于光子能量 (${e.toFixed(2)} eV) 大于等于电离能 13.60 eV，光子被完全吸收，电子彻底脱离束缚飞离原子！`)
                
                // 电子以高速飞出
                setOutPhotons([{
                  x: cx,
                  y: cy,
                  vx: 6,
                  vy: -3.5,
                  color: '#10b981', // 绿色代表电离出的自由电子
                  energy: e - dE_ion,
                  active: true,
                }])
                particle.active = false // 光子被吸收
              } else {
                // 严格匹配能级差
                const th = 0.05 // 允许浮点微小偏差
                let level = 1
                if (Math.abs(e - dE4) < th) level = 4
                else if (Math.abs(e - dE3) < th) level = 3
                else if (Math.abs(e - dE2) < th) level = 2

                if (level > 1) {
                  setAtomState('excited')
                  setAtomLevel(level)
                  setExplanationText(`激发成功！光子能量正好等于能级差，被完全吸收！氢原子跃迁至 n=${level} 能级。`)
                  particle.active = false // 光子被完全吸收
                  
                  // 延时自发向上跃迁级联辐射
                  setTimeout(() => cascadeTransitions(level, cx, cy), 800)
                } else {
                  // 不匹配，未吸收直穿
                  setExplanationText(`激发失败！光子能量 (${e.toFixed(2)} eV) 不等于任何基态能级差。光子无法被吸收，直接穿过！`)
                  // 光子正常飞出，不减速
                }
              }
            } else {
              // ------------------- 电子碰撞判定 -------------------
              if (e >= dE_ion) {
                // 电离
                setAtomState('ionizing')
                setAtomLevel(5)
                const remain = e - dE_ion
                setExplanationText(`碰撞电离！入射电子能量 (${e.toFixed(2)} eV) 大于电离能，原子被电离，碰撞后的电子带着剩余动能 (${remain.toFixed(2)} eV) 继续飞行。`)
                
                // 碰撞电子改变方向飞出
                particle.vx = -3.5
                particle.vy = -1.5
                particle.energy = remain
                
                // 另有原本氢原子的电离电子飞出
                setOutPhotons([{
                  x: cx,
                  y: cy,
                  vx: 5,
                  vy: 2.0,
                  color: '#10b981',
                  energy: 0,
                  active: true,
                }])
              } else {
                let lvl = 1
                let passedE = 0
                if (e >= dE4) { lvl = 4; passedE = dE4; }
                else if (e >= dE3) { lvl = 3; passedE = dE3; }
                else if (e >= dE2) { lvl = 2; passedE = dE2; }

                if (lvl > 1) {
                  setAtomState('excited')
                  setAtomLevel(lvl)
                  const remain = e - passedE
                  setExplanationText(`碰撞成功！入射电子将 ${passedE.toFixed(2)} eV 能量传递给氢原子使其跃迁至 n=${lvl}，自身带着剩余 ${remain.toFixed(2)} eV 的能量折射偏转飞出。`)
                  
                  // 记录能量分配
                  setCollisionCard({
                    show: true,
                    inE: e,
                    absorbed: passedE,
                    remain: remain,
                    lvl: lvl,
                  })

                  // 入射电子偏转飞出
                  particle.vx = -3.5
                  particle.vy = -1.8
                  particle.energy = remain
                  
                  setTimeout(() => cascadeTransitions(lvl, cx, cy), 800)
                } else {
                  // 能量不足 10.2 eV，发生弹性散射被反弹/折射
                  setExplanationText(`碰撞失败！入射电子动能 (${e.toFixed(2)} eV) 低于最低激发能 10.2 eV，发生弹性碰撞被弹开，氢原子处于基态未发生激发。`)
                  particle.vx = -2.5
                  particle.vy = 2.5
                }
              }
            }
          }

          // 正常更新粒子位置
          particle.x += particle.vx
          particle.y += particle.vy

          // 飞出屏幕设为不活跃
          if (particle.x < -40 || particle.y < 0 || particle.y > canvas.height) {
            particle.active = false
          }
        }

        // 2. 更新向外辐射的电离电子/跃迁光子的运动
        setOutPhotons((prev) =>
          prev
            .map((p) => {
              if (!p.active) return p
              const nextX = p.x + p.vx
              const nextY = p.y + p.vy
              const out = nextX < 0 || nextX > canvas.width || nextY < 0 || nextY > canvas.height
              return {
                ...p,
                x: nextX,
                y: nextY,
                active: !out,
              }
            })
            .filter((p) => p.active)
        )
      }

      // 3. 开始清空画布绘制
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 3.2 绘制左侧氢原子
      ctx.save()
      
      // 绘制原子核
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(cx, cy, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('P+', cx, cy)

      // 绘制轨道
      const maxLvl = 4
      const baseR = 25
      for (let n = 1; n <= maxLvl; n++) {
        const r = (n + 0.6) * baseR
        ctx.strokeStyle = (atomLevel === n && atomState === 'excited') ? 'rgba(79, 70, 229, 0.4)' : '#e4e4e7'
        ctx.lineWidth = (atomLevel === n && atomState === 'excited') ? 2 : 0.8
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
        
        ctx.fillStyle = '#a1a1aa'
        ctx.font = '9px monospace'
        ctx.fillText(`n=${n}`, cx + r - 4, cy + 10)
      }

      // 绘制活动跃迁指向箭头
      activeTransitions.forEach((t) => {
        const rFrom = (t.from + 0.6) * baseR
        const rTo = (t.to + 0.6) * baseR
        
        // 渲染跃迁路径：使用45度倾角的径向内缩箭头线
        const angle = -Math.PI / 4
        const fx = cx + Math.cos(angle) * rFrom
        const fy = cy + Math.sin(angle) * rFrom
        const tx = cx + Math.cos(angle) * rTo
        const ty = cy + Math.sin(angle) * rTo

        ctx.save()
        ctx.strokeStyle = t.color
        ctx.globalAlpha = t.life
        ctx.lineWidth = 3.5
        ctx.beginPath()
        ctx.moveTo(fx, fy)
        ctx.lineTo(tx, ty)
        ctx.stroke()

        // 箭头头部
        const arrowSize = 6
        const dx = tx - fx
        const dy = ty - fy
        const lineAngle = Math.atan2(dy, dx)
        ctx.fillStyle = t.color
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(tx - arrowSize * Math.cos(lineAngle - Math.PI / 6), ty - arrowSize * Math.sin(lineAngle - Math.PI / 6))
        ctx.lineTo(tx - arrowSize * Math.cos(lineAngle + Math.PI / 6), ty - arrowSize * Math.sin(lineAngle + Math.PI / 6))
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      })

      // 绘制轨道上的电子
      if (atomState !== 'ionizing') {
        const lvl = atomState === 'ground' ? 1 : atomLevel
        const r = (lvl + 0.6) * baseR
        // 让电子在轨道上缓慢转动
        const rotAngle = time * (1.8 / (lvl * lvl))
        const ex = cx + Math.cos(rotAngle) * r
        const ey = cy + Math.sin(rotAngle) * r

        ctx.fillStyle = '#3b82f6'
        ctx.shadowBlur = atomState === 'excited' ? 10 : 0
        ctx.shadowColor = '#60a5fa'
        ctx.beginPath()
        ctx.arc(ex, ey, 4.5, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.fillStyle = '#ffffff'
        ctx.font = '7px sans-serif'
        ctx.fillText('e-', ex - 2, ey + 2)
      } else {
        // 电离态绘制阻拦提示
        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold 12px sans-serif'
        ctx.fillText('⚡️ 电离态 (H+ 核)', cx - 45, cy - 25)
      }
      ctx.restore()

      // 3.3 绘制入射粒子
      if (particle && particle.active) {
        ctx.save()
        if (particle.type === 'photon') {
          // 光子：绘制正弦波包
          ctx.strokeStyle = '#a855f7'
          ctx.lineWidth = 2.5
          ctx.shadowBlur = 6
          ctx.shadowColor = '#a855f7'
          ctx.beginPath()
          const waveLen = 35
          for (let i = 0; i <= waveLen; i++) {
            const ratio = i / waveLen
            const amp = Math.sin(ratio * Math.PI) * 7.0
            const phase = (ratio * 4.0 * Math.PI) - (time * 15)
            const wx = particle.x - i
            const wy = particle.y + Math.sin(phase) * amp
            if (i === 0) ctx.moveTo(wx, wy)
            else ctx.lineTo(wx, wy)
          }
          ctx.stroke()
          
          ctx.fillStyle = '#a855f7'
          ctx.font = 'bold 11px sans-serif'
          ctx.fillText(`hν: ${particle.energy.toFixed(1)} eV`, particle.x - 20, particle.y - 12)
        } else {
          // 电子：绘制带尾拖的小球
          ctx.shadowBlur = 8
          ctx.shadowColor = '#10b981'
          ctx.fillStyle = '#10b981'
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

      // 3.4 绘制所有向外辐射飞行的出射光子/电离电子
      outPhotons.forEach((op) => {
        ctx.save()
        ctx.strokeStyle = op.color
        ctx.shadowBlur = 6
        ctx.shadowColor = op.color
        ctx.lineWidth = 2
        
        if (op.color === '#10b981') {
          // 绿色：出射的电离自由电子
          ctx.fillStyle = '#10b981'
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
          // 跃迁产生的辐射光子 (正弦波)
          ctx.beginPath()
          const waveLen = 28
          const angleToTarget = Math.atan2(op.vy, op.vx)
          for (let i = 0; i <= waveLen; i++) {
            const ratio = i / waveLen
            const amp = Math.sin(ratio * Math.PI) * 5.0
            const phase = (ratio * 3.5 * Math.PI) - (time * 18)
            const wx = op.x + Math.cos(angleToTarget) * i - Math.sin(angleToTarget) * Math.sin(phase) * amp
            const wy = op.y + Math.sin(angleToTarget) * i + Math.cos(angleToTarget) * Math.sin(phase) * amp
            if (i === 0) ctx.moveTo(wx, wy)
            else ctx.lineTo(wx, wy)
          }
          ctx.stroke()
          
          ctx.fillStyle = op.color
          ctx.font = '9px sans-serif'
          ctx.fillText(`${op.energy.toFixed(2)} eV`, op.x - 15, op.y - 8)
        }
        ctx.restore()
      })

      // 绘制电子碰撞能量分配信息卡
      drawCollisionCard(ctx, collisionCard, canvas.width * 0.65, cy)

      // 3.5 绘制下方的已探测光谱线带 (Sleek Spectrum View)
      drawSpectrum(ctx, canvas.width, canvas.height)

      animationFrameId = requestAnimationFrame(update)
    }

    // 级联跃迁辐射粒子模拟
    const cascadeTransitions = (startLvl: number, cx: number, cy: number) => {
      const pathList: { from: number; to: number; e: number; color: string }[] = []
      
      const energyMap = {
        '4->3': { e: 0.66, color: '#b91c1c' },
        '4->2': { e: 2.55, color: '#06b6d4' },
        '4->1': { e: 12.75, color: '#c084fc' },
        '3->2': { e: 1.89, color: '#ef4444' },
        '3->1': { e: 12.09, color: '#a855f7' },
        '2->1': { e: 10.20, color: '#6366f1' },
      }

      if (atomQuantity === 0) {
        // 一群氢原子：退激产生所有可能的路径
        if (startLvl === 4) {
          pathList.push(
            { from: 4, to: 3, ...energyMap['4->3'] },
            { from: 4, to: 2, ...energyMap['4->2'] },
            { from: 4, to: 1, ...energyMap['4->1'] },
            { from: 3, to: 2, ...energyMap['3->2'] },
            { from: 3, to: 1, ...energyMap['3->1'] },
            { from: 2, to: 1, ...energyMap['2->1'] }
          )
        } else if (startLvl === 3) {
          pathList.push(
            { from: 3, to: 2, ...energyMap['3->2'] },
            { from: 3, to: 1, ...energyMap['3->1'] },
            { from: 2, to: 1, ...energyMap['2->1'] }
          )
        } else if (startLvl === 2) {
          pathList.push(
            { from: 2, to: 1, ...energyMap['2->1'] }
          )
        }
      } else {
        // 单个氢原子：随机产生一条级联退激通路
        let curr = startLvl
        while (curr > 1) {
          const to = 1 + Math.floor(Math.random() * (curr - 1))
          const key = `${curr}->${to}` as keyof typeof energyMap
          pathList.push({
            from: curr,
            to,
            ...energyMap[key],
          })
          curr = to
        }
      }

      // 将跃迁线段加入 activeTransitions 渲染
      const transLines = pathList.map((p) => ({
        from: p.from,
        to: p.to,
        color: p.color,
        life: 1.0,
      }))
      setActiveTransitions(transLines)

      // 将这些跃迁转换成向外飞散的光子波包
      const newPhotons = pathList.map((p, idx) => {
        const angleOffset = (idx / pathList.length) * Math.PI * 2 + Math.random() * 0.5
        
        setDetectedLines((prev) => {
          if (!prev.includes(p.e)) return [...prev, p.e]
          return prev
        })

        return {
          x: cx,
          y: cy,
          vx: Math.cos(angleOffset) * 3.5,
          vy: Math.sin(angleOffset) * 3.5,
          color: p.color,
          energy: p.e,
          active: true,
        }
      })

      setOutPhotons(newPhotons)
      setAtomState('ground') // 复位回基态
      setAtomLevel(1)
    }

    // 绘制已探测的光谱线谱
    const drawSpectrum = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const sx = 65
      const sy = h - 75 // 向上移动 15px 给多排标签留出空间
      const sw = w - 130
      const sh = 16

      // 计算关键分割点
      const x_vis_start = valToX(1.61)
      const x_uv_start = valToX(3.10)

      ctx.save()

      // 1. 绘制光谱背景外边框描边
      ctx.strokeStyle = PHYSICS_COLORS.strokeDark
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(sx, sy, sw, sh, 4)
      ctx.stroke()

      // 2. 裁剪圆角矩形，在里面填充渐变底色
      ctx.beginPath()
      ctx.roundRect(sx, sy, sw, sh, 4)
      ctx.clip()

      // 填充红外区底色
      const irGrad = ctx.createLinearGradient(sx, sy, x_vis_start, sy)
      irGrad.addColorStop(0, '#120404')
      irGrad.addColorStop(1, '#1b0808')
      ctx.fillStyle = irGrad
      ctx.fillRect(sx, sy, x_vis_start - sx, sh)

      // 填充可见光区底色（淡彩虹渐变色带）
      const visGrad = ctx.createLinearGradient(x_vis_start, sy, x_uv_start, sy)
      visGrad.addColorStop(0, 'rgba(239, 68, 68, 0.18)')   // 红
      visGrad.addColorStop(0.2, 'rgba(249, 115, 22, 0.18)') // 橙
      visGrad.addColorStop(0.4, 'rgba(234, 179, 8, 0.18)')  // 黄
      visGrad.addColorStop(0.6, 'rgba(34, 197, 94, 0.18)')  // 绿
      visGrad.addColorStop(0.75, 'rgba(6, 182, 212, 0.18)') // 青
      visGrad.addColorStop(0.9, 'rgba(59, 130, 246, 0.18)')  // 蓝
      visGrad.addColorStop(1, 'rgba(168, 85, 247, 0.18)')   // 紫
      ctx.fillStyle = visGrad
      ctx.fillRect(x_vis_start, sy, x_uv_start - x_vis_start, sh)

      // 填充紫外区底色
      const uvGrad = ctx.createLinearGradient(x_uv_start, sy, sx + sw, sy)
      uvGrad.addColorStop(0, '#130a24')
      uvGrad.addColorStop(1, '#080312')
      ctx.fillStyle = uvGrad
      ctx.fillRect(x_uv_start, sy, sx + sw - x_uv_start, sh)

      ctx.restore() // 还原 clip，用于后续绘制

      // 3. 在光谱条左右两侧绘制量程范围标注
      ctx.save()
      ctx.fillStyle = PHYSICS_COLORS.textMuted
      ctx.font = '9px monospace'
      ctx.textAlign = 'right'
      ctx.fillText('0.5 eV', sx - 8, sy + sh - 4)
      ctx.textAlign = 'left'
      ctx.fillText('13.0 eV', sx + sw + 8, sy + sh - 4)
      ctx.restore()

      // 4. 绘制区间分割虚线及顶部文字标注
      ctx.save()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
      ctx.setLineDash([2, 2])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x_vis_start, sy)
      ctx.lineTo(x_vis_start, sy + sh)
      ctx.moveTo(x_uv_start, sy)
      ctx.lineTo(x_uv_start, sy + sh)
      ctx.stroke()
      ctx.restore()

      ctx.save()
      ctx.fillStyle = PHYSICS_COLORS.textMuted
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'center'
      
      // 红外区标注
      ctx.fillText('红外区 (不可见)', sx + (x_vis_start - sx) / 2, sy - 6)
      
      // 可见光区标注
      ctx.fillStyle = '#f43f5e'
      ctx.fillText('可见光区', x_vis_start + (x_uv_start - x_vis_start) / 2, sy - 6)
      
      // 紫外区标注
      ctx.fillStyle = PHYSICS_COLORS.textMuted
      ctx.fillText('紫外区 (不可见)', x_uv_start + (sx + sw - x_uv_start) / 2, sy - 6)
      ctx.restore()

      // 5. 空状态提示：未测得明线时显示引导文本
      if (detectedLines.length === 0) {
        ctx.save()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
        ctx.font = '9px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('待测发射光谱 (激发原子退激辐射后在此捕获亮线)', sx + sw / 2, sy + sh - 4)
        ctx.restore()
      }

      // 6. 绘制已探测到的亮线及其引线交错文本标签
      const allPossibleLines = [
        { e: 0.66, color: '#ff4444', label: '0.66 eV (4→3 红外)' },
        { e: 1.89, color: '#ef4444', label: '1.89 eV (3→2 红光)' },
        { e: 2.55, color: '#00f0ff', label: '2.55 eV (4→2 青光)' },
        { e: 10.20, color: '#818cf8', label: '10.20 eV (2→1 紫外)' },
        { e: 12.09, color: '#c084fc', label: '12.09 eV (3→1 紫外)' },
        { e: 12.75, color: '#d8b4fe', label: '12.75 eV (4→1 紫外)' },
      ]

      // 绘制刻度参考背景虚线
      ctx.save()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 0.8
      ctx.setLineDash([2, 3])
      allPossibleLines.forEach((line) => {
        const x = valToX(line.e)
        ctx.beginPath()
        ctx.moveTo(x, sy)
        ctx.lineTo(x, sy + sh)
        ctx.stroke()
      })
      ctx.restore()

      // 绘制捕获的光谱线与指示标签
      detectedLines.forEach((lineEnergy) => {
        const matched = allPossibleLines.find((l) => Math.abs(l.e - lineEnergy) < 0.05)
        if (matched) {
          const x = valToX(matched.e)
          
          // 亮线强光效果
          ctx.save()
          ctx.strokeStyle = matched.color
          ctx.lineWidth = 4
          ctx.shadowBlur = 8
          ctx.shadowColor = matched.color
          ctx.beginPath()
          ctx.moveTo(x, sy)
          ctx.lineTo(x, sy + sh)
          ctx.stroke()
          ctx.restore()
          
          // 奇偶索引交错排列以防重叠
          const matchedIdx = allPossibleLines.findIndex((l) => l.e === matched.e)
          const isOdd = matchedIdx % 2 !== 0
          const textY = sy + sh + (isOdd ? 26 : 14)
          
          // 绘制极细白色半透明引线
          ctx.save()
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(x, sy + sh)
          ctx.lineTo(x, textY - 8)
          ctx.stroke()
          ctx.restore()
          
          // 交错谱线文字标签
          ctx.save()
          ctx.fillStyle = matched.color
          ctx.font = 'bold 9px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(matched.label, x, textY)
          ctx.restore()
        }
      })

      // 7. 绘制“已测光谱：”及高考公式验证文字
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
      ctx.fillStyle = '#4f46e5'
      ctx.fillText(`已测得明线：${detectedLines.length} 种`, sx + sw - 120, sy + sh + 42)
      ctx.restore()
    }

    // 辅助计算能量到X坐标的比例函数
    const valToX = (e: number) => {
      const sx = 65
      const sw = canvasSize.width - 130
      const ratio = (e - 0.5) / (13.0 - 0.5)
      return sx + ratio * sw
    }

    // 绘制电子能量分配卡
    const drawCollisionCard = (ctx: CanvasRenderingContext2D, card: typeof collisionCard, xVal: number, yVal: number) => {
      if (!card || !card.show) return

      const w = 220
      const h = 60
      const x = xVal - w / 2
      const y = yVal - 130

      ctx.save()
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, 6)
      ctx.fill()
      ctx.strokeStyle = '#10b981'
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

    update()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [isPlaying, particle, outPhotons, atomState, atomLevel, detectedLines, atomQuantity, excitationType, incidentEnergy, activeTransitions, collisionCard, canvasSize.width, canvasSize.height])

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-inner relative select-none">
      {/* 顶部标题 */}
      <div className="absolute top-3 left-4 z-10 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-100/50 shadow-sm">
        <span className="text-sm font-medium text-neutral-700">激发与退激辐射物理对比仿真</span>
      </div>

      {/* 画布 */}
      <div ref={containerRef} className="flex-1 w-full min-h-0 bg-neutral-50 rounded-xl overflow-hidden relative">
        <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="block w-full h-full" />
        
        {/* 底部中央的原理提示 - 修改 bottom 距离避开光谱区 */}
        <div className="absolute bottom-[110px] left-6 right-6 pointer-events-none bg-black/5 border border-black/5 rounded-lg p-2 backdrop-blur-sm">
          <p className="text-xs text-neutral-600 leading-relaxed font-mono">
            <strong>实验实况</strong>：{explanationText}
          </p>
        </div>
      </div>

      {/* 底部物理参数注释 */}
      <div className="px-4 py-2 border-t border-neutral-100 text-xs text-neutral-500 bg-neutral-50/50 flex justify-between rounded-b-xl">
        <span>最低跃迁能级差 (1→2)：10.20 eV | 电离势：13.60 eV</span>
        <span>提示：请在左侧参数栏切换“一群”与“一个”，发射 12.75 eV 粒子观察谱线种数差异</span>
      </div>
    </div>
  )
}
