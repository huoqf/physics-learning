/**
 * PowerTransmission.tsx — 远距离输电交互动画（薄编排层）
 *
 * 布局（上下分区）：
 *   上半区（40%）：电压剖面图（U₁ → U₂ → U₃跌落 → U₄）
 *   下半区（60%）：实体网络拓扑（发电厂→升压→输电线→降压→用户灯泡矩阵）
 *
 * @agent-rule 遵循 useCanvasSize + CANVAS_PRESETS + theme token
 * @agent-rule 使用 useAnimationFrame 驱动动画，禁止裸调 requestAnimationFrame
 * @agent-rule 所有颜色使用 TRANSMISSION_COLORS / PHYSICS_COLORS
 * @agent-rule 所有字体使用 font()，所有像素使用 px()
 */
import { useRef, useCallback, useState, useMemo } from 'react'
import { colors } from '@/theme/colors'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { TRANSMISSION_COLORS } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationFrame } from '@/utils/animation'
import { usePowerTransmissionPhysics } from './hooks/usePowerTransmissionPhysics'
import { VoltageProfileChart } from './components/VoltageProfileChart'
import { NetworkTopology } from './components/NetworkTopology'
import { PowerInfoBar } from './components/PowerInfoBar'

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
  const { params, isPlaying, speed } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      speed: s.speed,
    }))
  )
  const font = (v: number) => Math.max(7, Math.min(16, v))
  const [, setFrameTick] = useState(0)

  // 设计坐标系 metrics 供物理计算 hook 使用
  const preset = CANVAS_PRESETS.full
  const designMetrics = useMemo(() => ({
    width: preset.width,
    height: preset.height,
    px: (v: number) => v,
    font: (v: number) => v,
  }), [preset])

  // ─── 物理 + 视觉派生计算（纯数据，零 JSX）────────────────────────────────
  const pt = usePowerTransmissionPhysics(params, designMetrics)
  const {
    physics, heatIntensity, currentSpeed, ballVisualRadius, ballSpeed,
    spawnInterval, lineColor, blurStd, shadowOpacity, lineWidth,
    chartTop, chartBottom, nodeY, plantX, stepUpX, lineStartX, lineEndX,
    stepDownX, userX, voltagePoints, idealPoints, ratedY, u3Y,
    bulbCount, bulbSpacing, bulbsStartX,
  } = pt
  const {
    P1: P1_real, I_line, deltaU, P_loss, U3, U4, P_user, eta, isOverloaded,
  } = physics
  const { userBrightness } = pt
  const mode = params.mode ?? 0
  const k = params.k ?? 0.02
  const r = params.r ?? 10
  const showIdeal = (params.showIdeal ?? 0) === 1

  // ─── 动画状态 ──────────────────────────────────────────────────────────────
  const pulseBallsRef = useRef<PulseBall[]>([])
  const particlesRef = useRef<Particle[]>([])
  const bladeAngleRef = useRef(0)
  const nextPulseId = useRef(0)
  const nextParticleId = useRef(0)
  const pulseSpawnTimer = useRef(0)

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

    const particleSpawnRate = heatIntensity * dt * 20
    if (heatIntensity > 0.02 && Math.random() < particleSpawnRate) {
      const px_x = lineStartX + Math.random() * (lineEndX - lineStartX)
      const t_p = (px_x - lineStartX) / (lineEndX - lineStartX)
      const lineIdx = Math.random() > 0.5 ? 0 : 1
      const baseLineY = lineIdx === 0 ? nodeY - 10 : nodeY + 10
      const arcY = baseLineY + 4 * t_p * (1 - t_p) * 12

      particlesRef.current.push({
        id: nextParticleId.current++,
        x: px_x,
        y: arcY,
        vy: -(15 + Math.random() * 30 * heatIntensity),
        opacity: 0.7 + heatIntensity * 0.3,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.6,
        size: 1.8 + Math.random() * 3.5 * heatIntensity,
      })
    }

    particlesRef.current = particlesRef.current
      .map(p => ({
        ...p,
        y: p.y + p.vy * dt,
        x: p.x + (Math.random() - 0.5) * 12 * dt,
        life: p.life + dt,
        opacity: p.opacity * (1 - p.life / p.maxLife),
      }))
      .filter(p => p.life < p.maxLife)

    setFrameTick(t => t + 1)
  }, [currentSpeed, ballSpeed, ballVisualRadius, spawnInterval, heatIntensity, lineStartX, lineEndX, nodeY])

  useAnimationFrame(
    (deltaTime) => { updateAnimation(deltaTime) },
    { playing: isPlaying, speed },
  )

  const bladeAngle = bladeAngleRef.current
  const pulseBalls = pulseBallsRef.current
  const particles = particlesRef.current

  // ─── 脉冲球路径 ────────────────────────────────────────────────────────────
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
      const baseLineY = lineIdx === 0 ? nodeY - 10 : nodeY + 10
      const arcY = baseLineY + 4 * t * (1 - t) * 12
      return { x: lineStartX + (lineEndX - lineStartX) * t, y: arcY }
    } else if (progress < 0.85) {
      const t = (progress - 0.7) / 0.15
      return { x: lineEndX + (stepDownX - 28 - lineEndX) * t, y: nodeY }
    } else {
      const t = (progress - 0.85) / 0.15
      return { x: stepDownX + 28 + (userX - 28 - stepDownX - 28) * t, y: nodeY }
    }
  }

  const W = preset.width
  const H = preset.height

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
        {isOverloaded && (
          <g>
            <rect x={12} y={10} width={W - 24} height={28} rx={6} fill={colors.danger[100]} stroke={colors.danger[500]} />
            <text x={W / 2} y={29} textAnchor="middle" fontSize={font(12)} fill={colors.danger[700]} fontWeight="bold">
              线路过载：损耗超过供电能力，用户端电压/功率已按 0 处理
            </text>
          </g>
        )}
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
          <linearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={TRANSMISSION_COLORS.voltageHigh} stopOpacity="0.25" />
            <stop offset="100%" stopColor={TRANSMISSION_COLORS.voltageHigh} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* 上半区：电压剖面图 */}
        <VoltageProfileChart
          voltagePoints={voltagePoints}
          idealPoints={idealPoints}
          ratedY={ratedY}
          deltaU={deltaU}
          u3Y={u3Y}
          showIdeal={showIdeal}
          chartTop={chartTop}
          chartBottom={chartBottom}
          plantX={plantX}
          stepUpX={stepUpX}
          lineEndX={lineEndX}
          stepDownX={stepDownX}
          userX={userX}
          W={W}
          px={(v: number) => v}
          font={font}
        />

        {/* 下半区：实体网络拓扑 */}
        <NetworkTopology
          I_line={I_line}
          P_loss={P_loss}
          U2={(params.U2 ?? 10) * 1000}
          U3={U3}
          P_user={P_user}
          P1_real={P1_real}
          heatIntensity={heatIntensity}
          lineColor={lineColor}
          shadowOpacity={shadowOpacity}
          lineWidth={lineWidth}
          bladeAngle={bladeAngle}
          r={r}
          k={k}
          pulseBalls={pulseBalls}
          particles={particles}
          nodeY={nodeY}
          plantX={plantX}
          stepUpX={stepUpX}
          lineStartX={lineStartX}
          lineEndX={lineEndX}
          stepDownX={stepDownX}
          userX={userX}
          isPlaying={isPlaying}
          px={(v: number) => v}
          font={font}
          getBallPosition={getBallPosition}
          bulbCount={bulbCount}
          bulbSpacing={bulbSpacing}
          bulbsStartX={bulbsStartX}
        />

        {/* 底部信息条 */}
        <PowerInfoBar
          eta={eta}
          I_line={I_line}
          deltaU={deltaU}
          P_loss={P_loss}
          U4={U4}
          voltageRatio={pt.voltageRatio}
          mode={mode}
          px={(v: number) => v}
          font={font}
          W={W}
          H={H}
        />
    </svg>
  )
}
