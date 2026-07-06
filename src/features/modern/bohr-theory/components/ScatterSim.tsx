import { useEffect, useRef, useState } from 'react'
import { useAnimationStore } from '@/stores'
import { Plus, Trash2 } from 'lucide-react'

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  trail: { x: number; y: number }[]
  color: string
  active: boolean
}

export default function ScatterSim({ isPlaying, time: _time }: { isPlaying: boolean; time: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const [stats, setStats] = useState({ straight: 0, deflected: 0, rebounded: 0 })
  
  const params = useAnimationStore((s) => s.params)
  const updateParam = useAnimationStore((s) => s.updateParam)
  
  const modelType = params.modelType ?? 1 // 0: 汤姆孙枣糕, 1: 卢瑟福核式
  const b = params.impactParameter ?? 15 // 偏导距离
  const autoEmit = params.autoEmit !== 0 // 默认为 1 (自动发射)
  const keepTrails = params.keepTrails === 1 // 默认为 0 (保留历史轨迹)
  const launchTrigger = params.launchTrigger ?? 0
  const clearTrigger = params.clearTrigger ?? 0
  
  const nextIdRef = useRef(0)
  const lastEmitTimeRef = useRef(0)

  // 清空所有粒子和轨迹
  const handleClear = () => {
    setParticles([])
    setStats({ straight: 0, deflected: 0, rebounded: 0 })
  }

  // 发射一颗粒子
  const emitParticle = (offsetY?: number) => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const cy = canvas.height / 2
    const targetY = offsetY !== undefined ? cy - offsetY : cy - b
    
    const newParticle: Particle = {
      id: nextIdRef.current++,
      x: 30,
      y: targetY,
      vx: 4.5,
      vy: 0,
      trail: [],
      color: '#f97316', // 橙色/红色高能粒子
      active: true,
    }
    setParticles((prev) => [...prev, newParticle])
  }

  // 监听触发器变化
  useEffect(() => {
    if (launchTrigger === 1) {
      emitParticle()
      updateParam('launchTrigger', 0) // 主动置回 0
    }
  }, [launchTrigger])

  useEffect(() => {
    if (clearTrigger === 1) {
      handleClear()
      updateParam('clearTrigger', 0) // 主动置回 0
    }
  }, [clearTrigger])

  // 监听时钟重置
  useEffect(() => {
    if (_time === 0) {
      setParticles([])
      setStats({ straight: 0, deflected: 0, rebounded: 0 })
    }
  }, [_time])

  // 当参数 b 发生改变时，自动发射一颗粒子以演示变化
  useEffect(() => {
    emitParticle()
  }, [b, modelType])

  // Canvas 动画主循环
  useEffect(() => {
    let animationFrameId: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 适配容器尺寸
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      canvas.width = rect?.width || 680
      canvas.height = rect?.height || 360
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const update = () => {
      const cx = canvas.width / 2
      const cy = canvas.height / 2

      // 自动发射粒子逻辑 (播放中且开启自动发射)
      if (isPlaying && autoEmit) {
        const now = Date.now()
        if (now - lastEmitTimeRef.current > 700) {
          // 随机小幅波动偏导距离展示统计效应，或者发射当前设定的 b
          const randomB = b + (Math.random() * 16 - 8)
          emitParticle(randomB)
          lastEmitTimeRef.current = now
        }
      }

      // 更新物理位置
      if (isPlaying) {
        setParticles((prevParticles) =>
          prevParticles
            .map((p) => {
              if (!p.active) return p

              // 记录轨迹 (如果 active === false，不再添加新点)
              const nextTrail = p.active ? [...p.trail, { x: p.x, y: p.y }] : p.trail
              
              // 若未开启 keepTrails，则多于 55 帧的轨迹出屏后进行 shift
              if (p.active && nextTrail.length > 55 && !keepTrails) {
                nextTrail.shift()
              }

              let nextX = p.x
              let nextY = p.y
              let nextVx = p.vx
              let nextVy = p.vy

              if (modelType === 0) {
                // 汤姆孙模型：粒子沿直线直接穿过
                nextX += p.vx
                nextY += p.vy
              } else {
                // 卢瑟福模型：原子核施加库仑斥力
                const dx = p.x - cx
                const dy = p.y - cy
                const r2 = dx * dx + dy * dy
                const r = Math.sqrt(r2)

                // 物理参数：库仑斥力常数 (大数值以在屏幕上有明显的偏折效果)
                const kqQ = 7500 
                const force = kqQ / Math.max(r2, 120)

                // 斥力朝向粒子
                const ax = force * (dx / r)
                const ay = force * (dy / r)

                nextVx += ax * 0.15
                nextVy += ay * 0.15
                nextX += nextVx
                nextY += nextVy
              }

              // 超出屏幕边界设为不活跃
              const isOut = nextX < 0 || nextX > canvas.width || nextY < 0 || nextY > canvas.height
              
              // 进行出屏角度统计
              let isCounted = p.isCounted
              if (isOut && !isCounted) {
                isCounted = true
                const speed = Math.sqrt(nextVx * nextVx + nextVy * nextVy)
                const cosTheta = speed > 0 ? nextVx / speed : 1
                const angleDeg = Math.acos(Math.max(-1, Math.min(1, cosTheta))) * (180 / Math.PI)
                
                setStats((prev) => {
                  if (angleDeg < 5) return { ...prev, straight: prev.straight + 1 }
                  if (angleDeg < 90) return { ...prev, deflected: prev.deflected + 1 }
                  return { ...prev, rebounded: prev.rebounded + 1 }
                })
              }

              return {
                ...p,
                x: nextX,
                y: nextY,
                vx: nextVx,
                vy: nextVy,
                trail: nextTrail,
                active: !isOut,
                isCounted,
              }
            })
            // 过滤掉早已飞出屏幕且轨迹淡化的粒子
            .filter((p) => {
              if (keepTrails) return true // 开启保留轨迹时永远不删除，形成轨迹族
              return p.active || p.trail.length > 0
            })
        )
      }

      // 绘制画面
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 2. 绘制原子模型本身
      const cx_val = canvas.width / 2
      const cy_val = canvas.height / 2

      if (modelType === 0) {
        // 汤姆孙模型：红色的带正电的球体，里面嵌着电子
        ctx.save()
        // 绘制正电荷背景
        ctx.fillStyle = 'rgba(239, 68, 68, 0.08)'
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx_val, cy_val, 110, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // 绘制正电号符号 "+" 标识
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'
        ctx.font = 'bold 24px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('+', cx_val - 50, cy_val - 40)
        ctx.fillText('+', cx_val + 50, cy_val - 30)
        ctx.fillText('+', cx_val - 30, cy_val + 50)
        ctx.fillText('+', cx_val + 40, cy_val + 40)
        ctx.fillText('+', cx_val, cy_val - 70)

        // 绘制镶嵌的电子 "-"
        const electrons = [
          { x: cx_val - 20, y: cy_val - 15 },
          { x: cx_val + 30, y: cy_val + 10 },
          { x: cx_val - 40, y: cy_val + 25 },
          { x: cx_val + 10, y: cy_val - 45 },
          { x: cx_val + 50, y: cy_val - 20 },
          { x: cx_val - 60, y: cy_val - 30 },
          { x: cx_val + 15, y: cy_val + 60 },
        ]
        electrons.forEach((elec) => {
          ctx.beginPath()
          ctx.arc(elec.x, elec.y, 8, 0, Math.PI * 2)
          ctx.fillStyle = '#10b981' // 绿色电子
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.font = '12px monospace'
          ctx.fillText('-', elec.x, elec.y)
        })
        ctx.restore()
      } else {
        // 卢瑟福模型：中间一个极小但发光的金原子核 (核式结构)
        ctx.save()
        
        // 绘制原子的电场范围（淡淡的外轮廓，说明核外其实很空旷）
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)'
        ctx.lineWidth = 1
        ctx.setLineDash([6, 6])
        ctx.beginPath()
        ctx.arc(cx_val, cy_val, 160, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        // 金原子核发光
        const gradient = ctx.createRadialGradient(cx_val, cy_val, 1, cx_val, cy_val, 24)
        gradient.addColorStop(0, '#fef08a') // 明黄
        gradient.addColorStop(0.2, '#eab308') // 金黄
        gradient.addColorStop(0.5, 'rgba(234, 179, 8, 0.4)')
        gradient.addColorStop(1, 'rgba(234, 179, 8, 0)')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(cx_val, cy_val, 24, 0, Math.PI * 2)
        ctx.fill()

        // 实体核心小球
        ctx.fillStyle = '#ca8a04'
        ctx.beginPath()
        ctx.arc(cx_val, cy_val, 6, 0, Math.PI * 2)
        ctx.fill()
        
        // 标注重核正电
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Au+', cx_val, cy_val - 12)
      }

      // 3. 绘制所有的 α 粒子和它们的轨迹
      particles.forEach((p) => {
        // 绘制渐变轨迹
        if (p.trail.length > 1) {
          ctx.beginPath()
          ctx.moveTo(p.trail[0].x, p.trail[0].y)
          for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y)
          }
          // 根据活跃度绘制透明度
          ctx.strokeStyle = p.active ? 'rgba(249, 115, 22, 0.45)' : 'rgba(249, 115, 22, 0.15)'
          ctx.lineWidth = 2.5
          ctx.stroke()
        }

        // 绘制粒子头部的发光球体
        if (p.active) {
          ctx.save()
          ctx.shadowBlur = 8
          ctx.shadowColor = '#ea580c'
          ctx.fillStyle = '#f97316'
          ctx.beginPath()
          ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      })

      // 4. 绘制参考入射线 (虚线指示当前设定的 b)
      ctx.save()
      ctx.strokeStyle = 'rgba(163, 163, 163, 0.4)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(0, cy - b)
      ctx.lineTo(canvas.width, cy - b)
      ctx.stroke()
      
      // 标注偏导距离 b
      ctx.fillStyle = '#737373'
      ctx.font = '11px sans-serif'
      ctx.fillText(`b = ${b} px`, 10, cy - b - 6)
      ctx.restore()

      // 5. 绘制偏角累计统计看板
      drawStatsPanel(ctx, stats, canvas.width, canvas.height)

      // 继续主循环
      animationFrameId = requestAnimationFrame(update)
    }

    // 绘制偏角统计看板
    const drawStatsPanel = (ctx: CanvasRenderingContext2D, s: typeof stats, w: number, h: number) => {
      const px = w - 185
      const py = h - 145
      const pw = 170
      const ph = 85

      ctx.save()
      ctx.fillStyle = 'rgba(24, 24, 27, 0.85)'
      ctx.beginPath()
      ctx.roundRect(px, py, pw, ph, 8)
      ctx.fill()

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText('α 粒子偏角累计统计', px + 10, py + 16)

      const total = s.straight + s.deflected + s.rebounded
      const getPct = (val: number) => total > 0 ? `${((val / total) * 100).toFixed(1)}%` : '0%'

      ctx.font = '10px monospace'
      
      ctx.fillStyle = '#60a5fa' // 蓝色代表直穿
      ctx.fillText(`直穿(<5°):   ${s.straight} (${getPct(s.straight)})`, px + 10, py + 34)
      
      ctx.fillStyle = '#fb923c' // 橙色代表小角偏转
      ctx.fillText(`偏转(5-90°): ${s.deflected} (${getPct(s.deflected)})`, px + 10, py + 50)
      
      ctx.fillStyle = '#f87171' // 红色代表反弹
      ctx.fillText(`反弹(≥90°):  ${s.rebounded} (${getPct(s.rebounded)})`, px + 10, py + 66)

      ctx.fillStyle = '#e4e4e7'
      ctx.font = '9px sans-serif'
      ctx.fillText(`总射入粒子数: ${total}`, px + 10, py + 78)
      ctx.restore()
    }

    update()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [isPlaying, particles, modelType, b, autoEmit, keepTrails])

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-inner relative select-none">
      {/* 顶部标题指示 */}
      <div className="absolute top-3 left-4 z-10 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-100/50 shadow-sm">
        <span className="text-sm font-medium text-neutral-700">
          {modelType === 0 ? '汤姆孙“枣糕模型”散射仿真' : '卢瑟福“核式结构”散射仿真'}
        </span>
      </div>

      {/* 画布 */}
      <div className="flex-1 w-full min-h-0 bg-neutral-50 rounded-xl overflow-hidden">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* 底部物理常识与统计规律小贴士 */}
      <div className="px-4 py-2 border-t border-neutral-100 text-xs text-neutral-500 bg-neutral-50/50 flex justify-between rounded-b-xl">
        <span>α 粒子带 +2e 电荷，重金原子核带 +79e 电荷</span>
        <span>提示：请在左屏点击“发射 α 粒子”或调节偏导距离 b 探究大偏角散射规律</span>
      </div>
    </div>
  )
}

