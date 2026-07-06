import { useEffect, useRef, useState } from 'react'
import { useAnimationStore } from '@/stores'

interface PhotonAnimation {
  x: number
  y: number
  targetX: number
  targetY: number
  progress: number
  energy: number
  color: string
  isIncoming: boolean // true 表示向上跃迁吸收，false 表示向下跃迁辐射
}

export default function BohrOrbits({ isPlaying, time }: { isPlaying: boolean; time: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  
  const params = useAnimationStore((s) => s.params)
  const targetLevel = params.targetLevel ?? 2 // 目标能级 1-4
  
  // 运行中的电子状态
  const [electronLevel, setElectronLevel] = useState<number>(targetLevel)
  const [angle, setAngle] = useState(0)
  
  // 跃迁与光子状态
  const [transitionProgress, setTransitionProgress] = useState(1) // 1表示已稳定在目标状态，0~1表示过渡中
  const [photon, setPhoton] = useState<PhotonAnimation | null>(null)
  
  const prevLevelRef = useRef<number>(targetLevel)
  const startLevelRef = useRef<number>(targetLevel)

  // 监听 targetLevel 改变，触发跃迁过渡
  useEffect(() => {
    const prev = prevLevelRef.current
    if (prev !== targetLevel) {
      startLevelRef.current = prev
      setTransitionProgress(0) // 开始过渡
      
      const E1 = -13.6
      const diff = Math.abs((E1 / (targetLevel * targetLevel)) - (E1 / (prev * prev)))
      
      // 根据能级差匹配光子颜色
      let photonColor = '#a855f7' // 默认紫色
      if (diff > 12.0) {
        photonColor = '#c084fc' // 亮紫 (4->1, 3->1)
      } else if (diff > 10.0) {
        photonColor = '#6366f1' // 靛蓝 (2->1)
      } else if (diff > 2.0) {
        photonColor = '#06b6d4' // 青蓝 (4->2, 可见光)
      } else if (diff > 1.5) {
        photonColor = '#ef4444' // 红色 (3->2, 可见光)
      } else {
        photonColor = '#b91c1c' // 暗红/红外 (4->3)
      }

      if (targetLevel > prev) {
        // 向上跃迁（吸收光子）：光子先从外部飞向电子，撞击后电子开始跃迁
        setPhoton({
          x: 100,
          y: 80,
          targetX: 0, // 动态计算
          targetY: 0,
          progress: 0,
          energy: diff,
          color: photonColor,
          isIncoming: true,
        })
      } else {
        // 向下跃迁（辐射光子）：电子开始跃迁，并向外发射光子
        setPhoton({
          x: 0, // 动态计算
          y: 0,
          targetX: 620,
          targetY: 100,
          progress: 0,
          energy: diff,
          color: photonColor,
          isIncoming: false,
        })
      }
    }
    prevLevelRef.current = targetLevel
  }, [targetLevel])

  // 物理与动画循环
  useEffect(() => {
    let animationFrameId: number
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      canvas.width = rect?.width || 680
      canvas.height = rect?.height || 360
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const update = () => {
      const cx = canvas.width > 300 ? canvas.width * 0.65 : canvas.width / 2
      const cy = canvas.height / 2
      
      // 轨道半径配置
      const realScale = params.realScale === 1
      const getRadius = (n: number) => {
        if (realScale) {
          // 真实物理比例 r_n = n^2 * r_1
          const r1 = 15
          return n * n * r1
        }
        // 为使画面美观紧凑，使用线性配合平方的调和轨道比例 (非纯平方比例，因为 16/1 太悬殊)
        const baseR = 38
        return (n + 0.6) * baseR
      }

      // 1. 更新电子角度 (处于不同轨道角速度不同)
      if (isPlaying) {
        const currentN = electronLevel
        // 物理机制：轨道半径越大，速度越慢。使用 1.8 / n^2 模拟速度
        const speedMultiplier = 2.4 / (currentN * currentN)
        setAngle((prev) => (prev + 0.02 * speedMultiplier) % (Math.PI * 2))
      }

      // 2. 更新跃迁进度与光子轨道
      let newElectronLevel = electronLevel
      if (transitionProgress < 1) {
        if (isPlaying) {
          const step = 0.015 // 跃迁速度

          if (photon && photon.isIncoming) {
            // 吸收模式：光子飞向轨道
            if (photon.progress < 1) {
              const nextProgress = Math.min(photon.progress + 0.03, 1)
              const electronRadius = getRadius(startLevelRef.current)
              const electronX = cx + Math.cos(angle) * electronRadius
              const electronY = cy + Math.sin(angle) * electronRadius
              
              setPhoton((p) => p ? {
                ...p,
                progress: nextProgress,
                x: 100 + (electronX - 100) * nextProgress,
                y: 80 + (electronY - 80) * nextProgress,
              } : null)
            } else {
              // 光子到达电子，吸收，电子开始螺旋向外跃迁
              setPhoton(null)
              const nextLvlProgress = transitionProgress + step
              if (nextLvlProgress >= 1) {
                setTransitionProgress(1)
                newElectronLevel = targetLevel
              } else {
                setTransitionProgress(nextLvlProgress)
                // 轨道半径螺旋扩大
                newElectronLevel = startLevelRef.current + (targetLevel - startLevelRef.current) * nextLvlProgress
              }
            }
          } else {
            // 辐射模式：电子收缩轨道，并发射光子飞向外侧
            const nextLvlProgress = transitionProgress + step
            if (nextLvlProgress >= 1) {
              setTransitionProgress(1)
              newElectronLevel = targetLevel
              
              // 激发辐射的光子飞行动画
              if (photon) {
                if (photon.progress < 1) {
                  const nextP = Math.min(photon.progress + 0.035, 1)
                  setPhoton({
                    ...photon,
                    progress: nextP,
                    x: photon.x + (photon.targetX - photon.x) * 0.06,
                    y: photon.y + (photon.targetY - photon.y) * 0.06,
                  })
                } else {
                  setPhoton(null)
                }
              }
            } else {
              setTransitionProgress(nextLvlProgress)
              newElectronLevel = startLevelRef.current + (targetLevel - startLevelRef.current) * nextLvlProgress
              
              // 在过渡中，光子从当前电子位置向外飞
              if (photon) {
                const electronRadius = getRadius(newElectronLevel)
                const electronX = cx + Math.cos(angle) * electronRadius
                const electronY = cy + Math.sin(angle) * electronRadius
                
                if (photon.progress === 0) {
                  setPhoton({
                    ...photon,
                    x: electronX,
                    y: electronY,
                    progress: 0.01,
                  })
                } else {
                  const nextP = Math.min(photon.progress + 0.035, 1)
                  setPhoton({
                    ...photon,
                    progress: nextP,
                    x: photon.x + (photon.targetX - photon.x) * 0.05,
                    y: photon.y + (photon.targetY - photon.y) * 0.05,
                  })
                }
              }
            }
          }
        }
      } else {
        newElectronLevel = targetLevel
        // 如果有残留的光子（非入射，且未播放完），继续播放完
        if (photon && !photon.isIncoming) {
          if (isPlaying) {
            const nextP = Math.min(photon.progress + 0.035, 1)
            if (nextP >= 1) {
              setPhoton(null)
            } else {
              setPhoton({
                ...photon,
                progress: nextP,
                x: photon.x + (photon.targetX - photon.x) * 0.06,
                y: photon.y + (photon.targetY - photon.y) * 0.06,
              })
            }
          }
        }
      }
      setElectronLevel(newElectronLevel)

      // 3. 开始清空画布绘制
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 3.1 绘制左侧的氢原子能级图
      const lx1 = 45
      const lx2 = 175
      
      const levels = [
        { n: 1, y: 310, e: -13.60, color: '#f87171' },
        { n: 2, y: 220, e: -3.40, color: '#fb923c' },
        { n: 3, y: 170, e: -1.51, color: '#facc15' },
        { n: 4, y: 140, e: -0.85, color: '#60a5fa' },
        { n: 5, y: 95, e: 0.00, color: '#a1a1aa', name: 'n = ∞ 电离态' },
      ]

      ctx.save()
      // 绘制能级背景图和刻度
      levels.forEach((lvl) => {
        // 能级横线
        ctx.strokeStyle = lvl.n === targetLevel ? 'rgba(99, 102, 241, 0.8)' : '#e4e4e7'
        ctx.lineWidth = lvl.n === targetLevel ? 3.5 : 1.5
        ctx.beginPath()
        ctx.moveTo(lx1, lvl.y)
        ctx.lineTo(lx2, lvl.y)
        ctx.stroke()

        // 标注文字和能量
        ctx.fillStyle = lvl.n === targetLevel ? '#4f46e5' : '#71717a'
        ctx.font = lvl.n === targetLevel ? 'bold 12px sans-serif' : '11px sans-serif'
        ctx.fillText(`n = ${lvl.n}`, lx1 - 32, lvl.y + 4)
        
        ctx.textAlign = 'right'
        ctx.fillText(`${lvl.e.toFixed(2)} eV`, lx2 + 58, lvl.y + 4)
        ctx.textAlign = 'left'
      })

      // 能级图上的当前状态点指示
      // 计算能在能级图上移动的 Y 坐标
      let indicatorY = levels[0].y
      if (transitionProgress >= 1) {
        const matchingLvl = levels.find((l) => l.n === targetLevel)
        if (matchingLvl) indicatorY = matchingLvl.y
      } else {
        const startLvlY = levels.find((l) => l.n === startLevelRef.current)?.y || levels[0].y
        const targetLvlY = levels.find((l) => l.n === targetLevel)?.y || levels[0].y
        indicatorY = startLvlY + (targetLvlY - startLvlY) * transitionProgress
      }

      // 绘制能级指示发光点
      ctx.shadowBlur = 6
      ctx.shadowColor = '#6366f1'
      ctx.fillStyle = '#4f46e5'
      ctx.beginPath()
      ctx.arc(lx1 + (lx2 - lx1) / 2, indicatorY, 5.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // 3.2 绘制右侧的同心圆轨道与原子核
      // 绘制原子核 (带正电质子，金色发光)
      ctx.save()
      const nuclearRadius = 11
      const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, nuclearRadius * 2.2)
      grad.addColorStop(0, '#fef08a')
      grad.addColorStop(0.3, '#f59e0b')
      grad.addColorStop(1, 'rgba(245, 158, 11, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, nuclearRadius * 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(cx, cy, nuclearRadius, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('H+', cx, cy)
      ctx.restore()

      // 绘制四圈轨道
      ctx.save()
      for (let n = 1; n <= 4; n++) {
        ctx.strokeStyle = n === targetLevel ? 'rgba(79, 70, 229, 0.25)' : '#f4f4f5'
        ctx.lineWidth = n === targetLevel ? 2.5 : 1
        ctx.beginPath()
        ctx.arc(cx, cy, getRadius(n), 0, Math.PI * 2)
        ctx.stroke()

        // 标示轨道 n 的层名
        ctx.fillStyle = '#a1a1aa'
        ctx.font = '10px monospace'
        ctx.fillText(`n=${n}`, cx + getRadius(n) - 6, cy + 12)
      }
      ctx.restore()

      // 3.3 绘制电子 (闪烁蓝色发光球)
      ctx.save()
      const currentRadius = getRadius(electronLevel)
      const ex = cx + Math.cos(angle) * currentRadius
      const ey = cy + Math.sin(angle) * currentRadius

      // 电子发光晕
      const elecGrad = ctx.createRadialGradient(ex, ey, 1, ex, ey, 12)
      elecGrad.addColorStop(0, '#93c5fd')
      elecGrad.addColorStop(0.3, '#3b82f6')
      elecGrad.addColorStop(1, 'rgba(59, 130, 246, 0)')
      ctx.fillStyle = elecGrad
      ctx.beginPath()
      ctx.arc(ex, ey, 12, 0, Math.PI * 2)
      ctx.fill()

      // 电子实体
      ctx.fillStyle = '#2563eb'
      ctx.beginPath()
      ctx.arc(ex, ey, 5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 8px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('e-', ex, ey)
      ctx.restore()

      // 3.4 绘制跃迁中产生的光子包
      if (photon) {
        ctx.save()
        ctx.strokeStyle = photon.color
        ctx.lineWidth = 2.5
        ctx.shadowBlur = 6
        ctx.shadowColor = photon.color
        
        // 绘制正弦波波形包以表征光子包
        ctx.beginPath()
        
        // 定义光子飞行方向
        const dx = photon.targetX - photon.x
        const dy = photon.targetY - photon.y
        const angleToTarget = Math.atan2(dy, dx)
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        // 绘制长度为 35px 的波包
        const waveLen = Math.min(35, dist)
        
        for (let i = 0; i <= waveLen; i++) {
          // 在沿飞行方向的法线上做正弦波动
          const ratio = i / waveLen
          // 振幅包络，两头窄中间宽，形成波包包络 (sin 函数包络)
          const amplitude = Math.sin(ratio * Math.PI) * 7.5
          // 正弦波动频次
          const wavePhase = (ratio * 4.5 * Math.PI) - (time * 16)
          const offsetDist = i
          
          const wx = photon.x + Math.cos(angleToTarget) * offsetDist - Math.sin(angleToTarget) * Math.sin(wavePhase) * amplitude
          const wy = photon.y + Math.sin(angleToTarget) * offsetDist + Math.cos(angleToTarget) * Math.sin(wavePhase) * amplitude
          
          if (i === 0) {
            ctx.moveTo(wx, wy)
          } else {
            ctx.lineTo(wx, wy)
          }
        }
        ctx.stroke()
        
        // 标注光子能量
        ctx.fillStyle = photon.color
        ctx.font = 'bold 10px sans-serif'
        ctx.fillText(`hν = ${photon.energy.toFixed(2)} eV`, photon.x - 25, photon.y - 12)
        ctx.restore()
      }

      // 3.5 绘制高考公式卡片
      drawFormulaCard(ctx, startLevelRef.current, targetLevel, canvas.width, canvas.height)

      animationFrameId = requestAnimationFrame(update)
    }

    // 绘制高考跃迁公式卡片
    const drawFormulaCard = (ctx: CanvasRenderingContext2D, prev: number, next: number, w: number, h: number) => {
      if (prev === next) return
      
      const px = w - 235
      const py = 50
      const pw = 220
      const ph = 80

      ctx.save()
      // 背景
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
      ctx.beginPath()
      ctx.roundRect(px, py, pw, ph, 8)
      ctx.fill()
      
      // 阴影与边框
      ctx.strokeStyle = '#e4e4e7'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // 标题
      ctx.fillStyle = '#18181b'
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText('高考重点：跃迁吸能/放能计算', px + 10, py + 18)

      // 算式
      const isEmission = prev > next
      const directionTxt = isEmission 
        ? `辐射光子退激：n = ${prev} → n = ${next}`
        : `吸收光子激发：n = ${prev} → n = ${next}`
      
      ctx.font = '10px sans-serif'
      ctx.fillStyle = '#71717a'
      ctx.fillText(directionTxt, px + 10, py + 36)

      // 能量计算公式
      const E_prev = (-13.6 / (prev * prev)).toFixed(2)
      const E_next = (-13.6 / (next * next)).toFixed(2)
      const diff = Math.abs(parseFloat(E_prev) - parseFloat(E_next)).toFixed(2)
      
      ctx.font = 'bold 11px monospace'
      ctx.fillStyle = isEmission ? '#ef4444' : '#10b981' // 辐射用红色，激发用绿色
      ctx.fillText(`hν = |E_末 - E_初|`, px + 10, py + 52)
      ctx.fillText(`   = |${E_next} - (${E_prev})| = ${diff} eV`, px + 10, py + 68)

      ctx.restore()
    }

    update()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [isPlaying, electronLevel, angle, transitionProgress, photon, targetLevel, params.realScale])

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-inner relative select-none">
      {/* 顶部指示牌 */}
      <div className="absolute top-3 left-4 z-10 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-100/50 shadow-sm">
        <span className="text-sm font-medium text-neutral-700">氢原子能级阶梯与跃迁轨道</span>
      </div>

      {/* 画布 */}
      <div className="flex-1 w-full min-h-0 bg-neutral-50 rounded-xl overflow-hidden">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* 底部物理参数注释 */}
      <div className="px-4 py-2 border-t border-neutral-100 text-xs text-neutral-500 bg-neutral-50/50 flex justify-between rounded-b-xl">
        <span>轨道半径 rn = n² * 0.53 Å {params.realScale === 1 ? '（已切换至真实 n² 物理比例）' : '（画面已作等比美化视觉优化）'}</span>
        <span>提示：在左侧参数栏调节目标能级 n 触发电子吸能/放能跃迁</span>
      </div>
    </div>
  )
}
