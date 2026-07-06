import { useEffect, useRef, useState, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { RelationChart } from '@/components/Chart/RelationChart'

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

export default function PhotoelectricSim({ isPlaying, time }: { isPlaying: boolean; time: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  
  const params = useAnimationStore((s) => s.params)
  const radiationPhotonIndex = params.radiationPhotonIndex ?? 1
  const workFunction = params.workFunction ?? 2.29
  const stoppingVoltage = params.stoppingVoltage ?? 0.0

  const [electrons, setElectrons] = useState<PhotoElectron[]>([])
  const [circuitAngle, setCircuitAngle] = useState(0) // 用于绘制电路中流动的电流电子
  const nextIdRef = useRef(0)
  const lastEmitTimeRef = useRef(0)

  // 光子能量表 (0:4->3, 1:4->2, 2:4->1, 3:3->2, 4:3->1, 5:2->1)
  const photonEnergies = [0.66, 2.55, 12.75, 1.89, 12.09, 10.20]
  const hv = photonEnergies[radiationPhotonIndex]
  const isPhotoelectric = hv >= workFunction
  const Ekm = isPhotoelectric ? hv - workFunction : 0
  const Uc = Ekm // 遏止电压 (V)
  const currentRatio = isPhotoelectric && stoppingVoltage < Uc
    ? (1 - Math.exp(-0.8 * (-stoppingVoltage + Uc)))
    : 0
  const hasCurrent = currentRatio > 0

  // 监听时钟重置
  useEffect(() => {
    if (time === 0) {
      setElectrons([])
    }
  }, [time])

  // 清空所有电子
  useEffect(() => {
    setElectrons([])
  }, [radiationPhotonIndex, workFunction])

  // Canvas 动画逻辑
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

    // 发射一个光电子
    const emitPhotoElectron = (cx_val: number, cy_val: number) => {
      // 电子只在发生光电效应时产生
      if (!isPhotoelectric) return
      
      // 根据最大初动能计算屏幕速度 (Ekm 范围约 0.2 ~ 10 eV，速度设在 2.5 ~ 6.0 像素/帧)
      // 物理对应：v = sqrt(2 * Ekm / m_e)
      const baseVel = 2.0 + Math.sqrt(Ekm) * 1.15
      
      // 在极板的一定高度范围内随机分布逸出电子
      const randY = cy_val - 45 + Math.random() * 90
      
      const newElec: PhotoElectron = {
        id: nextIdRef.current++,
        x: cx_val + 52, // 阴极板右侧位置
        y: randY,
        vx: baseVel,
        vy: (Math.random() * 0.8 - 0.4), // 略带小角度散射
        initVx: baseVel,
        active: true,
        hasTurnedAround: false,
      }
      setElectrons((prev) => [...prev, newElec])
    }

    const update = () => {
      const cy = canvas.height / 2
      const cx = canvas.width / 2

      // 光电管结构核心几何位置
      const tubeLeft = cx - 110
      const tubeRight = cx + 110
      const tubeWidth = tubeRight - tubeLeft
      const kPlateX = cx - 50 // 阴极K
      const aPlateX = cx + 50 // 阳极A

      // 1. 自动发射光电子逻辑 (播放中且有光电效应)
      if (isPlaying && isPhotoelectric) {
        const now = Date.now()
        // 发射频率随光子能量（或光强）正相关，我们控制在 250ms 一颗
        if (now - lastEmitTimeRef.current > 200) {
          emitPhotoElectron(kPlateX, cy)
          lastEmitTimeRef.current = now
        }
      }

      // 2. 更新光电子的运动 (受反向电场减速)
      if (isPlaying) {
        // 电路电流电子流动的相位更新
        if (hasCurrent) {
          setCircuitAngle((prev) => (prev + 0.05 * currentRatio) % (Math.PI * 2))
        }

        setElectrons((prevElectrons) =>
          prevElectrons
            .map((p) => {
              if (!p.active) return p

              let nextX = p.x
              let nextY = p.y
              let nextVx = p.vx
              const nextVy = p.vy
              let turned = p.hasTurnedAround

              // 物理公式模型：反向减速电场
              // 加速度 ax 正比于反向电压 stoppingVoltage
              // 极板间距 d 为 (aPlateX - kPlateX) = 100px
              const d = aPlateX - kPlateX
              const ax = -0.16 * (stoppingVoltage / d) // 负的表示向左的力
              
              nextVx += ax
              nextX += nextVx
              nextY += nextVy

              // 如果速度降为 0 且还没到达阳极，发生掉头折返
              if (nextVx <= 0 && !turned && nextX < aPlateX) {
                turned = true
              }

              // 判定是否到达阳极 A
              let active: boolean = p.active
              if (nextX >= aPlateX) {
                // 到达阳极，被吸收，触发电流
                active = false 
              }

              // 折返回去撞击到阴极板 K
              if (turned && nextX <= kPlateX) {
                active = false
              }

              // 超出屏幕上下限也是不活跃
              if (nextY < cy - 60 || nextY > cy + 60) {
                active = false
              }

              return {
                ...p,
                x: nextX,
                y: nextY,
                vx: nextVx,
                hasTurnedAround: turned,
                active,
              }
            })
            .filter((p) => p.active)
        )
      }

      // 3. 开始清空画布绘制
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 3.2 绘制左侧的氢原子跃迁辐射发射端
      drawHydrogenAtomTransition(ctx, cx, cy)

      // 3.3 绘制从原子发出的光子束射向光电管
      drawPhotonBeam(ctx, cx, cy, kPlateX, time)

      // 3.4 绘制光电管外壳 (玻璃壳，毛玻璃与高光)
      ctx.save()
      ctx.strokeStyle = 'rgba(212, 212, 216, 0.6)'
      ctx.lineWidth = 2.5
      ctx.fillStyle = 'rgba(244, 244, 245, 0.25)'
      ctx.beginPath()
      ctx.roundRect(tubeLeft - 5, cy - 65, tubeWidth + 10, 130, 20)
      ctx.fill()
      ctx.stroke()
      
      // 光电管高光反射
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(tubeLeft + 15, cy - 58)
      ctx.lineTo(tubeRight - 15, cy - 58)
      ctx.stroke()
      ctx.restore()

      // 3.5 绘制两个极板
      // 阴极 K (左侧)
      ctx.save()
      ctx.fillStyle = '#71717a'
      ctx.beginPath()
      ctx.roundRect(kPlateX - 5, cy - 50, 8, 100, 2)
      ctx.fill()
      
      ctx.fillStyle = '#18181b'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText('阴极 K (钠)', kPlateX - 25, cy - 56)
      ctx.restore()

      // 阳极 A (右侧)
      ctx.save()
      ctx.fillStyle = '#a1a1aa'
      ctx.beginPath()
      ctx.roundRect(aPlateX - 3, cy - 50, 6, 100, 2)
      ctx.fill()
      
      ctx.fillStyle = '#18181b'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText('阳极 A', aPlateX - 10, cy - 56)
      ctx.restore()

      // 3.6 绘制电路连线、反向电源与微安表
      drawCircuit(ctx, cx, cy, kPlateX, aPlateX)

      // 3.7 绘制飞行的光电子
      electrons.forEach((e) => {
        ctx.save()
        ctx.shadowBlur = 6
        ctx.shadowColor = '#10b981'
        ctx.fillStyle = '#10b981'
        ctx.beginPath()
        ctx.arc(e.x, e.y, 4, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 8px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('-', e.x, e.y)
        ctx.restore()
      })
      animationFrameId = requestAnimationFrame(update)
    }

    // 绘制左侧氢原子能级跃迁辐射
    const drawHydrogenAtomTransition = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
      const hx = cx - 215 // 氢原子放置在最左侧
      const hy = cy
      
      ctx.save()
      // 绘制淡灰色轨道
      ctx.strokeStyle = '#e4e4e7'
      ctx.lineWidth = 0.8
      const radii = [14, 28, 42, 56]
      radii.forEach((r) => {
        ctx.beginPath()
        ctx.arc(hx, hy, r, 0, Math.PI * 2)
        ctx.stroke()
      })

      // 绘制原子核
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(hx, hy, 5, 0, Math.PI * 2)
      ctx.fill()

      // 获取跃迁初态和末态
      // 照射光子：0:4->3, 1:4->2, 2:4->1, 3:3->2, 4:3->1, 5:2->1
      const transitions = [
        { from: 4, to: 3 },
        { from: 4, to: 2 },
        { from: 4, to: 1 },
        { from: 3, to: 2 },
        { from: 3, to: 1 },
        { from: 2, to: 1 },
      ]
      const trans = transitions[radiationPhotonIndex]
      
      // 绘制正在从高能级下落到低能级的电子 (通过 time 来模拟周期性的落体和发光)
      const period = (time * 1.5) % 2.0 // 2秒一个大跃迁循环
      let currentN = trans.from
      let isEmittingPhoton = false
      
      if (period < 0.6) {
        // 高轨道定态旋转
        currentN = trans.from
      } else if (period < 1.3) {
        // 跃迁中 (螺旋收缩)
        const t = (period - 0.6) / 0.7
        currentN = trans.from + (trans.to - trans.from) * t
        isEmittingPhoton = true
      } else {
        // 低轨道定态旋转
        currentN = trans.to
      }

      // 计算电子坐标
      const r = radii[Math.round(currentN - 1) % radii.length]
      const rotAngle = time * (3.0 / (currentN * currentN))
      const ex = hx + Math.cos(rotAngle) * r
      const ey = hy + Math.sin(rotAngle) * r

      ctx.fillStyle = '#2563eb'
      ctx.beginPath()
      ctx.arc(ex, ey, 3.5, 0, Math.PI * 2)
      ctx.fill()
      
      // 发光的质感
      if (isEmittingPhoton) {
        ctx.strokeStyle = '#a855f7'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(hx, hy, r, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.fillStyle = '#71717a'
      ctx.font = '10px sans-serif'
      ctx.fillText('一群氢原子能级跃迁', hx - 42, hy + 76)
      ctx.restore()
    }

    // 绘制发出光子照射光电效应阴极板
    const drawPhotonBeam = (ctx: CanvasRenderingContext2D, cx: number, cy: number, kPlateX: number, t: number) => {
      const hx = cx - 215
      const hy = cy
      
      const startX = hx + 40
      const startY = hy
      const targetX = kPlateX - 5
      const dist = targetX - startX

      // 颜色由光子能量决定
      // 0:4->3 (0.66eV,红外), 1:4->2 (2.55eV,可见蓝绿), 2:4->1 (12.75eV,紫外), 3:3->2 (1.89eV,红), 4:3->1 (12.09eV,紫), 5:2->1 (10.20eV,靛蓝)
      const colors = ['#b91c1c', '#06b6d4', '#c084fc', '#ef4444', '#a855f7', '#6366f1']
      const beamColor = colors[radiationPhotonIndex]

      ctx.save()
      ctx.strokeStyle = beamColor
      ctx.shadowBlur = 8
      ctx.shadowColor = beamColor
      ctx.lineWidth = 2.0
      
      // 用 4 条连续的正弦光束表示光子照射
      const beamsCount = 3
      for (let bIdx = 0; bIdx < beamsCount; bIdx++) {
        ctx.beginPath()
        const yOffset = (bIdx - 1) * 12
        const pathLen = dist - 25
        
        for (let i = 0; i <= pathLen; i += 2) {
          const ratio = i / pathLen
          const wavePhase = (ratio * 12 * Math.PI) - (t * 22) + bIdx
          const amp = 5.0 * Math.sin(ratio * Math.PI)
          
          const wx = startX + i
          const wy = startY + yOffset + Math.sin(wavePhase) * amp
          
          if (i === 0) ctx.moveTo(wx, wy)
          else ctx.lineTo(wx, wy)
        }
        ctx.stroke()
      }
      ctx.restore()
    }

    // 绘制电路连线、滑动变阻器和微安表
    const drawCircuit = (ctx: CanvasRenderingContext2D, cx: number, cy: number, kPlateX: number, aPlateX: number) => {
      const kWireY = cy + 50
      const aWireY = cy + 50
      
      const bottomCircuitY = cy + 115
      
      ctx.save()
      ctx.strokeStyle = '#71717a'
      ctx.lineWidth = 2
      
      // 1. 从 K 往下的导线
      ctx.beginPath()
      ctx.moveTo(kPlateX - 1, kWireY)
      ctx.lineTo(kPlateX - 1, bottomCircuitY)
      ctx.lineTo(cx - 50, bottomCircuitY)
      ctx.stroke()

      // 2. 从 A 往下的导线（连接微安表）
      ctx.beginPath()
      ctx.moveTo(aPlateX + 1, aWireY)
      ctx.lineTo(aPlateX + 1, bottomCircuitY - 30) // 接微安表上方
      ctx.stroke()

      // 绘制微安表
      const meterY = bottomCircuitY - 15
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#3f3f46'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(aPlateX + 1, meterY, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      
      // 微安表内指针与读数
      ctx.fillStyle = '#18181b'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const curTxt = hasCurrent ? `${(12.8 * currentRatio).toFixed(2)}μA` : '0.00μA'
      ctx.fillText(curTxt, aPlateX + 1, meterY + 6)
      ctx.fillText('μA', aPlateX + 1, meterY - 6)
      
      // 指针
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(aPlateX + 1, meterY)
      // 根据是否有电流确定指针角度
      const ptrAngle = hasCurrent ? Math.PI * 0.25 * currentRatio : 0
      ctx.lineTo(aPlateX + 1 + Math.sin(ptrAngle) * 9, meterY - Math.cos(ptrAngle) * 9)
      ctx.stroke()

      // 接微安表下方往下的连线
      ctx.strokeStyle = '#71717a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(aPlateX + 1, meterY + 15)
      ctx.lineTo(aPlateX + 1, bottomCircuitY)
      ctx.lineTo(cx + 50, bottomCircuitY)
      ctx.stroke()

      // 3. 绘制底部的滑动变阻器和直流反向电源
      // 电源（由于是反向电压，左侧 K 极接正，右侧 A 极接负）
      const powerX = cx - 25
      const powerY = bottomCircuitY
      
      // 正极 (长细线) 和负极 (短粗线)
      ctx.strokeStyle = '#18181b'
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

      // 极性文字
      ctx.fillStyle = '#18181b'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText('+', powerX - 10, powerY - 6)
      ctx.fillText('-', powerX + 12, powerY - 6)
      
      // 滑线变阻器箱体 (cx + 10 -> cx + 45)
      const resX = cx + 18
      ctx.strokeStyle = '#27272a'
      ctx.fillStyle = '#e4e4e7'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.rect(resX, powerY - 5, 24, 10)
      ctx.fill()
      ctx.stroke()

      // 阻碍箭头
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(resX + 12, powerY + 12)
      ctx.lineTo(resX + 12, powerY)
      ctx.lineTo(resX + 8, powerY + 4) // 箭头
      ctx.moveTo(resX + 12, powerY)
      ctx.lineTo(resX + 16, powerY + 4)
      ctx.stroke()

      // 标注反向电压数值
      ctx.fillStyle = '#71717a'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText(`反向电压 U = ${stoppingVoltage.toFixed(1)} V`, cx - 55, bottomCircuitY + 28)

      // 4. 如果有电流，在导线里绘制流动的小圆点 (绿色) 表示流动方向（电流由 A 流向 K，电子由 K 流向 A）
      if (hasCurrent) {
        ctx.fillStyle = '#10b981'
        const points = [
          // 阴极极板下方导线
          { x: kPlateX - 1, y: cy + 50 + (bottomCircuitY - (cy + 50)) * (circuitAngle / (Math.PI * 2)) },
          // 底部回路
          { x: (cx - 50) + 100 * (circuitAngle / (Math.PI * 2)), y: bottomCircuitY },
          // 阳极极板下方导线
          { x: aPlateX + 1, y: bottomCircuitY - (bottomCircuitY - (cy + 50)) * (circuitAngle / (Math.PI * 2)) },
        ]
        points.forEach((pt) => {
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2)
          ctx.fill()
        })
      }
      ctx.restore()
    }

    update()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [isPlaying, electrons, radiationPhotonIndex, workFunction, stoppingVoltage, time])

  // 使用 useMemo 缓存用于 RelationChart 渲染的 I-U 点阵数据
  const chartPoints = useMemo(() => {
    const pts = []
    const step = 0.2
    for (let u = -4.0; u <= 3.0; u += step) {
      let iVal = 0
      if (u >= -Uc) {
        iVal = 1 - Math.exp(-0.9 * (u + Uc))
      }
      pts.push({ x: u, y: iVal * 12.8 })
    }
    return pts
  }, [Uc])

  // 使用 useMemo 缓存用于标示截止电压的 markers
  const chartMarkers = useMemo(() => {
    if (isPhotoelectric && Uc > 0) {
      return [
        {
          x: -Uc,
          label: `-Uc(${-Uc.toFixed(2)}V)`,
          color: '#ef4444',
        }
      ]
    }
    return []
  }, [isPhotoelectric, Uc])

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-inner relative select-none">
      {/* 顶部标题 */}
      <div className="absolute top-3 left-4 right-4 z-10 flex flex-wrap justify-between items-center gap-2 pointer-events-auto bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-100/50 shadow-sm">
        <span className="text-sm font-medium text-neutral-700">高考综合应用：能级跃迁结合光电效应实验</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isPhotoelectric ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isPhotoelectric ? '已触发光电效应' : '未触发光电效应'}
        </span>
      </div>

      {/* 中屏内容区：Canvas 动画与 I-U 特征图表平级并列 */}
      <div className="flex-1 w-full min-h-0 flex flex-col gap-2 p-2 bg-neutral-50 rounded-xl overflow-hidden">
        {/* Canvas 动画占大头 */}
        <div className="flex-[2.8] min-h-0 relative bg-neutral-50 rounded-lg overflow-hidden">
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
        
        {/* RelationChart 图表平级展示 */}
        <div className="flex-[1.2] min-h-0 w-full bg-white rounded-lg border border-neutral-100 p-2 overflow-hidden shrink-0">
          <RelationChart
            title="光电流 I 与极板电压 U 特征关系曲线 (高考图像重点)"
            xMin={-4.0}
            xMax={3.0}
            yMin={0}
            yMax={15}
            points={chartPoints}
            xLabel="极板电压 U (V)"
            yLabel="光电流 I (μA)"
            cursorX={-stoppingVoltage}
            markers={chartMarkers}
            minHeight={100}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* 底部物理常识与统计规律小贴士 */}
      <div className="px-4 py-2 border-t border-neutral-100 text-xs text-neutral-500 bg-neutral-50/50 flex justify-between rounded-b-xl">
        <span>阴极板逸出功 W₀ 决定发生光电效应的阈值频率</span>
        <span>提示：如果逸出功调为 4.5 eV，再照射可见光 (4→2) 还能发生光电效应吗？尝试调节反向电压直到电流归零。</span>
      </div>
    </div>
  )
}
