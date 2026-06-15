/**
 * PowerTransmission.tsx — 远距离输电交互动画（[M4-1]）
 *
 * 三屏联动布局：左侧参数区 | 中间 SVG 动画 | 右侧数据看板
 *
 * 物理模型：发电厂 → 升压变压器 → 输电线 → 降压变压器 → 用户
 *   提高输电电压 → 减小电流 → 减少线路损耗（P_loss = I²R）
 *
 * 分镜一：发电厂旋转叶片 + 升压变压器 + 脉冲小球流动
 * 分镜二：长距离输电线热浪阴影 + 粒子流失效果
 * 分镜三：降压变压器 + 用户端房屋亮度 + 电器状态
 *
 * @agent-rule 遵循 useCanvasSize + theme token（CANVAS_STYLE / PHYSICS_COLORS）
 * @agent-rule 使用 useAnimationFrame 驱动动画，禁止裸调 requestAnimationFrame
 */
import { useRef, useMemo, useCallback, useState } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { calculatePowerTransmission } from '@/physics'
import { useAnimationFrame } from '@/utils/animation'

interface PulseBall {
  id: number
  progress: number
  speed: number
  radius: number
  opacity: number
}

interface Particle {
  id: number
  x: number
  y: number
  vy: number
  opacity: number
  life: number
  maxLife: number
  size: number
}

export default function PowerTransmission() {
    const {params, isPlaying, speed} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    isPlaying: s.isPlaying,
    speed: s.speed,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 800, height: 440 })
  const { font } = canvasSize
  const [, setFrameTick] = useState(0)

  const P_send = params.P_send ?? 100000
  const U_trans = params.U_trans ?? 10000
  const R_line = params.R_line ?? 10

  const n1_step_up = 100
  const n2_step_up = 1000
  const n1_step_down = 1000
  const n2_step_down = 100

  const {
    I_line,
    U_loss,
    P_loss,
    U_user,
    P_user,
    eta,
  } = calculatePowerTransmission(
    P_send, U_trans, R_line,
    n1_step_up, n2_step_up, n1_step_down, n2_step_down
  )

  const lossRatio = P_send === 0 ? 0 : P_loss / P_send
  const heatIntensity = Math.min(1, lossRatio * 5)

  const isHighVoltage = U_trans >= 10000

  const W = canvasSize.width
  const H = canvasSize.height

  const nodeY = H * 0.48
  const plantX = W * 0.08
  const stepUpX = W * 0.24
  const lineStartX = W * 0.34
  const lineEndX = W * 0.66
  const stepDownX = W * 0.76
  const userX = W * 0.92

  const pulseBallsRef = useRef<PulseBall[]>([])
  const particlesRef = useRef<Particle[]>([])
  const bladeAngleRef = useRef(0)
  const nextPulseId = useRef(0)
  const nextParticleId = useRef(0)
  const pulseSpawnTimer = useRef(0)

  const currentSpeed = useMemo(() => {
    const maxI = P_send / 1000
    return maxI === 0 ? 0 : I_line / maxI
  }, [I_line, P_send])

  const ballVisualRadius = useMemo(() => {
    const baseR = 4
    const voltageFactor = Math.log10(Math.max(U_trans, 100)) / Math.log10(50000)
    return baseR + voltageFactor * 5
  }, [U_trans])

  const ballSpeed = useMemo(() => {
    return 0.08 + currentSpeed * 0.25
  }, [currentSpeed])

  const ballDensity = useMemo(() => {
    return 0.3 + currentSpeed * 0.7
  }, [currentSpeed])

  const spawnInterval = useMemo(() => {
    return Math.max(80, 600 / (ballDensity + 0.1))
  }, [ballDensity])

  const updateAnimation = useCallback((deltaTime: number) => {
    const dt = deltaTime / 1000

    bladeAngleRef.current += dt * (1 + currentSpeed * 3) * 60

    pulseSpawnTimer.current += deltaTime
    if (pulseSpawnTimer.current >= spawnInterval) {
      pulseSpawnTimer.current = 0
      pulseBallsRef.current.push({
        id: nextPulseId.current++,
        progress: 0,
        speed: ballSpeed,
        radius: ballVisualRadius,
        opacity: 0.9,
      })
    }

    pulseBallsRef.current = pulseBallsRef.current
      .map(b => ({
        ...b,
        progress: b.progress + b.speed * dt,
        opacity: b.progress > 0.85 ? 0.9 * (1 - (b.progress - 0.85) / 0.15) : 0.9,
      }))
      .filter(b => b.progress <= 1)

    if (heatIntensity > 0.05 && Math.random() < heatIntensity * dt * 8) {
      const lineMidX = (lineStartX + lineEndX) / 2
      const spread = (lineEndX - lineStartX) * 0.4
      particlesRef.current.push({
        id: nextParticleId.current++,
        x: lineMidX + (Math.random() - 0.5) * spread,
        y: nodeY + (Math.random() - 0.5) * 16,
        vy: -(15 + Math.random() * 25 * heatIntensity),
        opacity: 0.6 + heatIntensity * 0.3,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.6,
        size: 2 + Math.random() * 3 * heatIntensity,
      })
    }

    particlesRef.current = particlesRef.current
      .map(p => ({
        ...p,
        y: p.y + p.vy * dt,
        x: p.x + (Math.random() - 0.5) * 8 * dt,
        life: p.life + dt,
        opacity: p.opacity * (1 - p.life / p.maxLife),
      }))
      .filter(p => p.life < p.maxLife)

    setFrameTick(t => t + 1)
  }, [currentSpeed, ballSpeed, ballVisualRadius, spawnInterval, heatIntensity, lineStartX, lineEndX, nodeY])

  useAnimationFrame(
    (deltaTime) => {
      updateAnimation(deltaTime)
    },
    { playing: isPlaying, speed }
  )

  const lineColor = useMemo(() => {
    const r = Math.round(147 + (185 - 147) * heatIntensity)
    const g = Math.round(197 + (28 - 197) * heatIntensity)
    const b = Math.round(253 + (28 - 253) * heatIntensity)
    return `rgb(${r},${g},${b})`
  }, [heatIntensity])

  const userBrightness = useMemo(() => {
    return Math.max(0.08, Math.min(1, eta))
  }, [eta])

  const houseCount = 3
  const houseSpacing = 36
  const housesStartX = stepDownX + 30

  const getBallPosition = (progress: number): { x: number; y: number } => {
    if (progress < 0.15) {
      const t = progress / 0.15
      return { x: plantX + 28 + (stepUpX - 28 - plantX) * t, y: nodeY }
    } else if (progress < 0.3) {
      const t = (progress - 0.15) / 0.15
      return { x: stepUpX + 28 + (lineStartX - stepUpX - 28) * t, y: nodeY }
    } else if (progress < 0.7) {
      const t = (progress - 0.3) / 0.4
      const lineIdx = Math.floor(t * 2) % 2
      const lineY = lineIdx === 0 ? nodeY - 10 : nodeY + 10
      return { x: lineStartX + (lineEndX - lineStartX) * t, y: lineY }
    } else if (progress < 0.85) {
      const t = (progress - 0.7) / 0.15
      return { x: lineEndX + (stepDownX - 28 - lineEndX) * t, y: nodeY }
    } else {
      const t = (progress - 0.85) / 0.15
      return { x: stepDownX + 28 + (userX - 28 - stepDownX - 28) * t, y: nodeY }
    }
  }

  const blurStd = 2 + heatIntensity * 14
  const shadowOpacity = 0.1 + heatIntensity * 0.5
  const lineWidth = 2 + heatIntensity * 3

  const bladeAngle = bladeAngleRef.current
  const pulseBalls = pulseBallsRef.current
  const particles = particlesRef.current

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={W} height={H}
        className="bg-white rounded-lg shadow-inner select-none"
        style={{ fontFamily: CANVAS_STYLE.font.family }}
      >
        <defs>
          <filter id="heatWave" x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={blurStd} />
          </filter>
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="houseGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={1 + userBrightness * 3} />
          </filter>
        </defs>

        <text x={W / 2} y={24} fontSize={CANVAS_STYLE.font.labelSize}
          fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          远距离输电 · {isHighVoltage ? '高压模式' : '低压模式'}
        </text>

        <line x1={plantX + 28} y1={nodeY} x2={stepUpX - 26} y2={nodeY}
          stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeDasharray="6 3" opacity="0.6" />
        <line x1={stepUpX + 26} y1={nodeY} x2={lineStartX} y2={nodeY}
          stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeDasharray="6 3" opacity="0.6" />

        {heatIntensity > 0.05 && (
          <g filter="url(#heatWave)" opacity={shadowOpacity}>
            <line x1={lineStartX} y1={nodeY - 10} x2={lineEndX} y2={nodeY - 10}
              stroke={PHYSICS_COLORS.temperature} strokeWidth={lineWidth + 6} />
            <line x1={lineStartX} y1={nodeY + 10} x2={lineEndX} y2={nodeY + 10}
              stroke={PHYSICS_COLORS.temperature} strokeWidth={lineWidth + 6} />
          </g>
        )}

        <line x1={lineStartX} y1={nodeY - 10} x2={lineEndX} y2={nodeY - 10}
          stroke={lineColor} strokeWidth={lineWidth} />
        <line x1={lineStartX} y1={nodeY + 10} x2={lineEndX} y2={nodeY + 10}
          stroke={lineColor} strokeWidth={lineWidth} />

        <text x={(lineStartX + lineEndX) / 2} y={nodeY - 24}
          fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText}
          textAnchor="middle" fontWeight="bold">
          R = {R_line} Ω
        </text>
        <text x={(lineStartX + lineEndX) / 2} y={nodeY + 30}
          fontSize={CANVAS_STYLE.font.smallSize} fill={PHYSICS_COLORS.temperature}
          textAnchor="middle">
          ΔP = {(P_loss / 1000).toFixed(1)} kW
        </text>

        <polygon
          points={`${(lineStartX + lineEndX) / 2 + 10},${nodeY - 14} ${(lineStartX + lineEndX) / 2 + 16},${nodeY - 10} ${(lineStartX + lineEndX) / 2 + 10},${nodeY - 6}`}
          fill={PHYSICS_COLORS.electricCurrent} opacity={0.7} />
        <polygon
          points={`${(lineStartX + lineEndX) / 2 - 10},${nodeY + 14} ${(lineStartX + lineEndX) / 2 - 16},${nodeY + 10} ${(lineStartX + lineEndX) / 2 - 10},${nodeY + 6}`}
          fill={PHYSICS_COLORS.electricCurrent} opacity={0.7} />

        <line x1={lineEndX} y1={nodeY} x2={stepDownX - 26} y2={nodeY}
          stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeDasharray="6 3" opacity="0.6" />
        <line x1={stepDownX + 26} y1={nodeY} x2={userX - 28} y2={nodeY}
          stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeDasharray="6 3" opacity="0.6" />

        <g transform={`translate(${plantX}, ${nodeY})`}>
          <rect x={-24} y={-28} width={48} height={56} rx={6}
            fill={PHYSICS_COLORS.objectFill}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          <g transform={`rotate(${bladeAngle}, 0, 0)`}>
            <line x1={0} y1={-16} x2={0} y2={-4}
              stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.vectorMain} strokeLinecap="round" />
            <line x1={0} y1={4} x2={14} y2={12}
              stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.vectorMain} strokeLinecap="round" />
            <line x1={0} y1={4} x2={-14} y2={12}
              stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.vectorMain} strokeLinecap="round" />
            <circle cx={0} cy={0} r={4}
              fill={PHYSICS_COLORS.electricCurrent} />
          </g>
          <text x={0} y={40} fontSize={CANVAS_STYLE.font.axisSize}
            fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            发电厂
          </text>
          <text x={0} y={54} fontSize={font(9)} fill={PHYSICS_COLORS.axis}
            textAnchor="middle">
            P₁={(P_send / 1000).toFixed(0)}kW
          </text>
        </g>

        <g transform={`translate(${stepUpX}, ${nodeY})`}>
          <rect x={-22} y={-22} width={44} height={44} rx={4}
            fill={PHYSICS_COLORS.objectFill}
            stroke={PHYSICS_COLORS.magneticField}
            strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          <circle cx={-6} cy={0} r={10}
            fill="none" stroke={PHYSICS_COLORS.magneticField} strokeWidth={CANVAS_STYLE.stroke.objectThin} />
          <circle cx={6} cy={0} r={10}
            fill="none" stroke={PHYSICS_COLORS.magneticField} strokeWidth={CANVAS_STYLE.stroke.objectThin} />
          <text x={0} y={34} fontSize={CANVAS_STYLE.font.axisSize}
            fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            升压
          </text>
          <text x={0} y={48} fontSize={font(9)} fill={PHYSICS_COLORS.axis}
            textAnchor="middle">
            1:{n2_step_up / n1_step_up}
          </text>
        </g>

        {pulseBalls.map(ball => {
          const pos = getBallPosition(ball.progress)
          return (
            <g key={ball.id}>
              <circle cx={pos.x} cy={pos.y}
                r={ball.radius + 2}
                fill={PHYSICS_COLORS.electricCurrent}
                opacity={ball.opacity * 0.3}
                filter="url(#glowFilter)" />
              <circle cx={pos.x} cy={pos.y}
                r={ball.radius}
                fill={PHYSICS_COLORS.electricCurrent}
                opacity={ball.opacity} />
            </g>
          )
        })}

        {particles.map(p => (
          <circle key={p.id}
            cx={p.x} cy={p.y}
            r={p.size}
            fill={PHYSICS_COLORS.temperature}
            opacity={Math.max(0, p.opacity)} />
        ))}

        <g transform={`translate(${stepDownX}, ${nodeY})`}>
          <rect x={-22} y={-22} width={44} height={44} rx={4}
            fill={PHYSICS_COLORS.objectFill}
            stroke={PHYSICS_COLORS.magneticField}
            strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          <circle cx={-6} cy={0} r={10}
            fill="none" stroke={PHYSICS_COLORS.magneticField} strokeWidth={CANVAS_STYLE.stroke.objectThin} />
          <circle cx={6} cy={0} r={10}
            fill="none" stroke={PHYSICS_COLORS.magneticField} strokeWidth={CANVAS_STYLE.stroke.objectThin} />
          <text x={0} y={34} fontSize={CANVAS_STYLE.font.axisSize}
            fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            降压
          </text>
          <text x={0} y={48} fontSize={font(9)} fill={PHYSICS_COLORS.axis}
            textAnchor="middle">
            {n1_step_down / n2_step_down}:1
          </text>
        </g>

        {Array.from({ length: houseCount }).map((_, i) => {
          const hx = housesStartX + i * houseSpacing
          const hy = nodeY
          const brightness = userBrightness
          const lightColor = brightness > 0.7
            ? `rgba(251, 191, 36, ${brightness})`
            : `rgba(251, 191, 36, ${brightness * 0.5})`
          const acWarning = brightness < 0.5 && i === 1

          return (
            <g key={i} transform={`translate(${hx}, ${hy})`}>
              <polygon
                points={`-12,-18 0,-28 12,-18`}
                fill={PHYSICS_COLORS.objectFill}
                stroke={PHYSICS_COLORS.objectStroke}
                strokeWidth={CANVAS_STYLE.stroke.objectThin} />
              <rect x={-12} y={-18} width={24} height={22}
                fill={PHYSICS_COLORS.objectFill}
                stroke={PHYSICS_COLORS.objectStroke}
                strokeWidth={CANVAS_STYLE.stroke.objectThin} />
              <rect x={-4} y={-10} width={8} height={14}
                fill={PHYSICS_COLORS.objectFill}
                stroke={PHYSICS_COLORS.objectStroke}
                strokeWidth={CANVAS_STYLE.stroke.grid} />
              <circle cx={0} cy={-8} r={3}
                fill={lightColor}
                filter="url(#houseGlow)" />
              {acWarning && (
                <g>
                  <rect x={-6} y={2} width={12} height={8} rx={1}
                    fill={colors.danger[100]}
                    stroke={colors.danger[500]}
                    strokeWidth={0.8} />
                  <text x={0} y={8} fontSize={font(6)}
                    fill={colors.danger[600]}
                    textAnchor="middle" fontWeight="bold">
                    ⚠
                  </text>
                </g>
              )}
              <text x={0} y={16} fontSize={font(8)}
                fill={PHYSICS_COLORS.axis}
                textAnchor="middle">
                {brightness > 0.7 ? '正常' : brightness > 0.4 ? '偏暗' : '停电'}
              </text>
            </g>
          )
        })}

        <text x={userX} y={nodeY + 40} fontSize={CANVAS_STYLE.font.axisSize}
          fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          用户端
        </text>
        <text x={userX} y={nodeY + 54} fontSize={font(9)} fill={PHYSICS_COLORS.axis}
          textAnchor="middle">
          P₃={(P_user / 1000).toFixed(1)}kW
        </text>

        <g transform={`translate(8, ${H - 70})`}>
          <rect width={W - 16} height="62" rx="5" fill={PHYSICS_COLORS.objectFill}
            opacity="0.9" stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid} />

          <text x="10" y="16" fontSize={CANVAS_STYLE.font.axisSize}
            fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            输电效率 η = {(eta * 100).toFixed(1)}%
          </text>
          <text x="10" y="32" fontSize={CANVAS_STYLE.font.smallSize} fill={PHYSICS_COLORS.axis}>
            I = {I_line.toFixed(1)} A
            &nbsp;|&nbsp;
            ΔU = {U_loss.toFixed(0)} V
            &nbsp;|&nbsp;
            ΔP = {(P_loss / 1000).toFixed(1)} kW
            &nbsp;|&nbsp;
            U_user = {U_user.toFixed(0)} V
          </text>
          <text x="10" y="48" fontSize={font(9)} fill={PHYSICS_COLORS.temperature}>
            {eta > 0.95
              ? '✓ 高压输电，损耗极低'
              : eta > 0.8
                ? '△ 中等损耗，可考虑提高输电电压'
                : '⚠ 损耗严重！必须提高输电电压或减小线路电阻'}
          </text>
        </g>

        <g transform={`translate(8, ${H - 88})`}>
          <text x="0" y="12" fontSize={CANVAS_STYLE.font.axisSize}
            fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            核心原理：P_loss = I²R = (P/U)²R → 提高电压 U → 减小电流 I → 大幅降低损耗
          </text>
        </g>
      </svg>
    </div>
  )
}
