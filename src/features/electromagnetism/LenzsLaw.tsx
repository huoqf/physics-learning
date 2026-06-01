import { useState, useRef, useEffect } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'
import { calculateLenzsLaw } from '@/physics'

export default function LenzsLaw() {
  const { params, time, isPlaying, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const { magnetPole = 1, coilN = 10, magnetSpeed = 2, motionMode = 1 } = params

  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2
  const coilY = cy + 40

  const y_top = cy - 130
  const y_coil = coilY - 35

  // 局部状态：拖拽位置、是否在拖拽中、强制刷新触发器
  const [magnetYState, setMagnetYState] = useState(y_top)
  const [isDragging, setIsDragging] = useState(false)
  const [, setForceUpdate] = useState(0)

  // 局部 Refs 用于拖动交互及粒子累加时钟
  const lastPointerY = useRef(0)
  const lastTime = useRef(0)
  const dragVelocity = useRef(0)
  const particleTime = useRef(0)
  const lastDecayTime = useRef(0)
  const decayTimer = useRef<number | null>(null)

  // 监听重置/模式切换，重置非播放状态下的磁铁位置
  useEffect(() => {
    if (!isPlaying) {
      const initialY = motionMode === 1 ? y_top : y_coil
      setMagnetYState(initialY)
      dragVelocity.current = 0
      if (decayTimer.current) {
        cancelAnimationFrame(decayTimer.current)
      }
    }
  }, [isPlaying, motionMode, y_top, y_coil])

  // 播放结束自动暂停机制 (T = 2秒)
  useEffect(() => {
    if (isPlaying) {
      const T = 2
      if (time >= T) {
        setIsPlaying(false)
      }
    }
  }, [time, isPlaying, setIsPlaying])

  // 清理动画计时器
  useEffect(() => {
    return () => {
      if (decayTimer.current) {
        cancelAnimationFrame(decayTimer.current)
      }
    }
  }, [])

  // 衰减速度的帧循环
  const decayVelocityDecay = () => {
    const now = performance.now()
    const dt = (now - lastDecayTime.current) / 1000
    lastDecayTime.current = now

    if (Math.abs(dragVelocity.current) > 0.05) {
      dragVelocity.current *= 0.82 // 物理衰减系数
      particleTime.current += Math.abs(dragVelocity.current) * dt * 6 // 衰减时依然累加粒子运动
      setForceUpdate(x => x + 1)
      decayTimer.current = requestAnimationFrame(decayVelocityDecay)
    } else {
      dragVelocity.current = 0
      setForceUpdate(x => x + 1)
    }
  }

  // Pointer Down 拖拽启动
  const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    if (isPlaying) return
    e.currentTarget.setPointerCapture(e.pointerId)
    lastPointerY.current = e.clientY
    lastTime.current = performance.now()
    dragVelocity.current = 0
    setIsDragging(true)
    if (decayTimer.current) {
      cancelAnimationFrame(decayTimer.current)
    }
  }

  // Pointer Move 拖动中位置和速度更新
  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!isDragging) return
    const now = performance.now()
    const dt = (now - lastTime.current) / 1000
    const dy = e.clientY - lastPointerY.current

    if (dt > 0.005) {
      const pixelSpeed = dy / dt
      // 将像素速度转换为适合 calculateLenzsLaw 计算的物理速度 (靠近负，远离正)
      const targetPhysVel = -pixelSpeed / 75
      dragVelocity.current = dragVelocity.current * 0.4 + targetPhysVel * 0.6
      
      // 累加粒子流动时间
      particleTime.current += Math.abs(dragVelocity.current) * dt * 6

      setMagnetYState(prev => {
        const nextY = prev + dy
        return Math.max(y_top, Math.min(y_coil, nextY))
      })

      lastPointerY.current = e.clientY
      lastTime.current = now
    }
  }

  // Pointer Up 拖拽结束，启动速度衰减
  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    setIsDragging(false)
    lastDecayTime.current = performance.now()
    if (decayTimer.current) {
      cancelAnimationFrame(decayTimer.current)
    }
    decayTimer.current = requestAnimationFrame(decayVelocityDecay)
  }

  // 根据当前状态，计算磁铁位置和速度
  let magnetY = y_top
  let velocity = 0

  if (isPlaying) {
    const T = 2
    const progress = Math.min(1, time / T)
    const smoothK = (1 - Math.cos(progress * Math.PI)) / 2

    if (motionMode === 1) {
      magnetY = y_top + (y_coil - y_top) * smoothK
      velocity = -magnetSpeed * Math.sin(progress * Math.PI) // 靠近为负值
    } else {
      magnetY = y_coil + (y_top - y_coil) * smoothK
      velocity = magnetSpeed * Math.sin(progress * Math.PI)  // 远离为正值
    }
  } else {
    magnetY = magnetYState
    velocity = dragVelocity.current
  }

  const lenzResult = calculateLenzsLaw(magnetPole, velocity)

  // 计算相对距离和磁通量视觉强度的系数 (0.1 ~ 1.0)
  const dist = coilY - magnetY
  const fluxIntensity = Math.max(0.1, Math.min(1.0, 1 - (dist - 35) / 135))

  // 受力方向：repulsion (排斥) 则向上推 (-1)，attraction (吸引) 则向下拉 (+1)
  const forceDirection = lenzResult.forceType === 'repulsion' ? -1 : (lenzResult.forceType === 'attraction' ? 1 : 0)
  
  // 受力大小对应的箭头长度
  const forceArrowLength = 15 + Math.min(45, Math.abs(velocity) * 12)

  // 粒子运行的时间源
  const currentParticleTime = isPlaying ? time * 4 : particleTime.current
  const dir = lenzResult.inducedCurrentDirection === 'counterclockwise' ? -1 : 1

  // 主磁场线方向（靠近/远离、磁极朝向的综合判断）
  const isDown = lenzResult.originalFieldDirection === 'down'
  const priY1 = isDown ? magnetY + 35 : coilY
  const priY2 = isDown ? coilY : magnetY + 35

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
          <marker id="arrowForce" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8" fill={PHYSICS_COLORS.forceNet} />
          </marker>
          <marker id="arrowBField" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill={PHYSICS_COLORS.magneticField} />
          </marker>
          <marker id="arrowInduced" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill={PHYSICS_COLORS.electricCurrent} />
          </marker>
        </defs>

        {/* --- 1. 线圈 --- */}
        <ellipse cx={cx} cy={coilY} rx={70} ry={25} fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth="8" />
        <ellipse cx={cx} cy={coilY} rx={70} ry={35} fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth="8" strokeDasharray="200 100" />
        <text x={cx + 85} y={coilY + 5} fill={PHYSICS_COLORS.labelText} fontWeight={CANVAS_STYLE.font.labelWeight} fontSize={CANVAS_STYLE.font.labelSize}>
          N={coilN}
        </text>

        {/* --- 2. 两侧弯曲的磁感线环 --- */}
        {[-1, 1].map((side) => (
          <g key={`loop-${side}`} opacity={0.15 + fluxIntensity * 0.45}>
            <path
              d={`M ${cx + side * 15} ${magnetY + 25} C ${cx + side * 110} ${magnetY + 50}, ${cx + side * 110} ${magnetY - 50}, ${cx + side * 15} ${magnetY - 25}`}
              fill="none"
              stroke={PHYSICS_COLORS.magneticField}
              strokeWidth={CANVAS_STYLE.stroke.reference}
            />
            <path
              d={`M ${cx + side * 15} ${magnetY + 30} C ${cx + side * 180} ${magnetY + 90}, ${cx + side * 180} ${magnetY - 90}, ${cx + side * 15} ${magnetY - 30}`}
              fill="none"
              stroke={PHYSICS_COLORS.magneticField}
              strokeWidth={CANVAS_STYLE.stroke.reference}
            />
          </g>
        ))}

        {/* --- 3. 中间直射的主磁场线 --- */}
        {[-20, 0, 20].map((dx, i) => (
          <line 
            key={`pri-${i}`} 
            x1={cx + dx} 
            y1={priY1} 
            x2={cx + dx} 
            y2={priY2} 
            stroke={PHYSICS_COLORS.magneticField} 
            strokeWidth={CANVAS_STYLE.stroke.reference} 
            strokeDasharray={CANVAS_STYLE.dash.reference.join(',')} 
            opacity={0.15 + fluxIntensity * 0.65} 
            markerEnd="url(#arrowBField)" 
          />
        ))}

        {/* --- 4. 感应磁场线 --- */}
        {lenzResult.fluxChange !== 'stable' && [-45, 45].map((dx, i) => {
          const isUp = lenzResult.inducedFieldDirection === 'up'
          const indY1 = isUp ? coilY + 45 : coilY - 45
          const indY2 = isUp ? coilY - 45 : coilY + 45
          return (
            <line 
              key={`ind-${i}`} 
              x1={cx + dx} 
              y1={indY1} 
              x2={cx + dx} 
              y2={indY2} 
              stroke={PHYSICS_COLORS.electricCurrent} 
              strokeWidth={CANVAS_STYLE.stroke.vectorSub} 
              markerEnd="url(#arrowInduced)" 
              opacity={0.3 + fluxIntensity * 0.7} 
            />
          )
        })}

        {/* --- 5. 感应电流粒子 --- */}
        {lenzResult.fluxChange !== 'stable' && Array.from({ length: 5 }).map((_, i) => {
          const t_i = (currentParticleTime * dir + i * Math.PI * 2 / 5) % (2 * Math.PI)
          const px = cx + 70 * Math.cos(t_i)
          const py = coilY + 25 * Math.sin(t_i)
          return <circle key={i} cx={px} cy={py} r="4.5" fill={PHYSICS_COLORS.electricCurrent} opacity={0.5 + fluxIntensity * 0.5} />
        })}

        {/* --- 6. 磁铁主体 --- */}
        <g 
          transform={`translate(${cx - 25}, ${magnetY - 35})`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ cursor: isPlaying ? 'default' : (isDragging ? 'grabbing' : 'grab') }}
          className="select-none"
        >
          <rect 
            width="50" 
            height="35" 
            fill={magnetPole > 0 ? PHYSICS_COLORS.magnetNorth : PHYSICS_COLORS.magnetSouth} 
            rx="4" 
            stroke={isDragging ? PHYSICS_COLORS.forceNet : 'none'}
            strokeWidth="1.5"
          />
          <text x="25" y="22" textAnchor="middle" fill="white" fontWeight={CANVAS_STYLE.font.labelWeight} fontSize={CANVAS_STYLE.font.bodySize}>
            {magnetPole > 0 ? 'N' : 'S'}
          </text>
          
          <rect 
            y="35" 
            width="50" 
            height="35" 
            fill={magnetPole > 0 ? PHYSICS_COLORS.magnetSouth : PHYSICS_COLORS.magnetNorth} 
            rx="4" 
            stroke={isDragging ? PHYSICS_COLORS.forceNet : 'none'}
            strokeWidth="1.5"
          />
          <text x="25" y="57" textAnchor="middle" fill="white" fontWeight={CANVAS_STYLE.font.labelWeight} fontSize={CANVAS_STYLE.font.bodySize}>
            {magnetPole > 0 ? 'S' : 'N'}
          </text>

          {forceDirection !== 0 && (
            <g>
              <line 
                x1="65" 
                y1="35" 
                x2="65" 
                y2={35 + forceDirection * forceArrowLength} 
                stroke={PHYSICS_COLORS.forceNet} 
                strokeWidth={CANVAS_STYLE.stroke.vectorMain} 
                markerEnd="url(#arrowForce)" 
              />
              <text 
                x="78" 
                y={35 + forceDirection * (forceArrowLength / 2) + 4} 
                fill={PHYSICS_COLORS.forceNet} 
                fontWeight={CANVAS_STYLE.font.labelWeight} 
                fontSize={CANVAS_STYLE.font.labelSize}
              >
                {lenzResult.forceType === 'repulsion' ? '排斥力' : '吸引力'}
              </text>
            </g>
          )}
        </g>

        {/* --- 7. 状态文本区 --- */}
        <g className="text-center">
          <text x={cx} y={40} textAnchor="middle" fill={PHYSICS_COLORS.labelText} fontSize={CANVAS_STYLE.font.bodySize} fontWeight="bold">
            {isDragging ? (velocity < 0 ? (magnetPole > 0 ? 'N极靠近(拖拽)' : 'S极靠近(拖拽)') : (magnetPole > 0 ? 'N极远离(拖拽)' : 'S极远离(拖拽)')) : lenzResult.currentAction}
          </text>
          
          <text x={cx} y={65} textAnchor="middle" fill={PHYSICS_COLORS.labelText} fontSize={CANVAS_STYLE.font.labelSize}>
            磁通量：{lenzResult.fluxChange === 'increasing' ? '正在增加' : (lenzResult.fluxChange === 'decreasing' ? '正在减少' : '不变')}
          </text>
          
          <text x={cx} y={85} textAnchor="middle" fill={lenzResult.fluxChange !== 'stable' ? PHYSICS_COLORS.magneticField : PHYSICS_COLORS.trackHistory} fontSize={CANVAS_STYLE.font.labelSize} fontWeight="bold">
            增反减同：感应磁场与原磁场 {lenzResult.fluxChange === 'stable' ? '无' : (lenzResult.fluxChange === 'increasing' ? '反向' : '同向')}
          </text>
        </g>

        {/* --- 8. 能量转化提示 --- */}
        {lenzResult.forceType && (
          <g>
            <text x={cx} y={cy + 130} textAnchor="middle" fill={PHYSICS_COLORS.forceNet} fontSize={CANVAS_STYLE.font.bodySize} fontWeight="bold">
              来拒去留：阻碍相对运动
            </text>
            <text x={cx} y={cy + 155} textAnchor="middle" fill={PHYSICS_COLORS.kineticEnergy} fontSize={CANVAS_STYLE.font.labelSize} fontWeight="bold">
              克服安培力做功，机械能转化为电能
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
