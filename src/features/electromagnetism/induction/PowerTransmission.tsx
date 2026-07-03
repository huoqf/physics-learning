/**
 * PowerTransmission.tsx — 远距离输电交互动画（整体重构）
 *
 * 布局（上下分区）：
 *   上半区（40%）：电压剖面图（U₁ → U₂ → U₃跌落 → U₄）
 *   下半区（60%）：实体网络拓扑（发电厂→升压→输电线→降压→用户灯泡矩阵）
 *
 * 物理模型：发电厂 → 升压变压器 → 输电线 → 降压变压器 → 用户
 *   因果链：P₁ → I_line = P₁/U₂ → ΔU = I_line·r → P_loss = I_line²·r
 *           → U₃ = U₂ - ΔU → U₄ = U₃·(n₄/n₃) → P_user = P₁ - P_loss
 *
 * @agent-rule 遵循 useCanvasSize + CANVAS_PRESETS + theme token
 * @agent-rule 使用 useAnimationFrame 驱动动画，禁止裸调 requestAnimationFrame
 * @agent-rule 所有颜色使用 TRANSMISSION_COLORS / PHYSICS_COLORS
 * @agent-rule 所有字体使用 font()，所有像素使用 px()
 */
import { useRef, useMemo, useCallback, useState } from 'react'
import { colors } from '@/theme/colors'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE, TRANSMISSION_COLORS } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { calculatePowerTransmission } from '@/physics'
import { useAnimationFrame } from '@/utils/animation'
import { LightBulb, TransformerApparatus } from '@/components/Physics'


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
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.wide)
  const { font, px } = canvasSize
  const [, setFrameTick] = useState(0)

  // ─── 自变量（从 params 读取，单位转换为 SI）──────────────────────────────────
  const mode = params.mode ?? 0
  const scenario = params.scenario ?? 0
  const P1 = (params.P1 ?? 100) * 1000   // kW → W
  const U2 = (params.U2 ?? 10) * 1000    // kV → V
  const r = params.r ?? 10               // Ω
  const k = params.k ?? 0.02             // 降压变压器变比 k = n4/n3
  const N = params.N ?? 10               // 用户并联户数
  const showIdeal = (params.showIdeal ?? 0) === 1

  // ─── 因变量（纯函数计算）─────────────────────────────────────────────────────
  const { P1: P1_real, I_line, deltaU, P_loss, U3, U4, P_user, eta, isOverloaded } = calculatePowerTransmission(
    P1, U2, r, k, mode, N, scenario
  )

  // ─── 视觉强度计算 ────────────────────────────────────────────────────────────
  const lossRatio = P1_real === 0 ? 0 : P_loss / P1_real

  const heatIntensity = Math.min(1, lossRatio * 5)
  // 灯泡亮度：基于 U4 相对 220V 额定电压的比例
  const ratedVoltage = 220 // V 用户端额定电压
  const voltageRatio = Math.max(0, Math.min(1, U4 / ratedVoltage))
  const userBrightness = Math.max(0.08, voltageRatio)
  // ─── 布局坐标（响应式）───────────────────────────────────────────────────────
  const W = canvasSize.width
  const H = canvasSize.height

  // 上半区（电压剖面图 40%）
  const chartTop = H * 0.06
  const chartBottom = H * 0.36

  // 下半区（实体网络 60%）
  const networkTop = H * 0.44
  const networkBottom = H * 0.92
  const nodeY = (networkTop + networkBottom) / 2

  // X 轴锚点（上下对齐）
  const plantX = W * 0.08
  const stepUpX = W * 0.24
  const lineStartX = W * 0.34
  const lineEndX = W * 0.66
  const stepDownX = W * 0.76
  const userX = W * 0.92

  // ─── 动画状态 ────────────────────────────────────────────────────────────────
  const pulseBallsRef = useRef<PulseBall[]>([])
  const particlesRef = useRef<Particle[]>([])
  const bladeAngleRef = useRef(0)
  const nextPulseId = useRef(0)
  const nextParticleId = useRef(0)
  const pulseSpawnTimer = useRef(0)

  const currentSpeed = useMemo(() => {
    const maxI = P1 / 1000
    return maxI === 0 ? 0 : I_line / maxI
  }, [I_line, P1])

  const ballVisualRadius = useMemo(() => {
    const baseR = px(4)
    const voltageFactor = Math.log10(Math.max(U2, 100)) / Math.log10(50000)
    return baseR + voltageFactor * px(5)
  }, [U2, px])

  const ballSpeed = useMemo(() => {
    return 0.08 + currentSpeed * 0.25
  }, [currentSpeed])

  const ballDensity = useMemo(() => {
    return 0.3 + currentSpeed * 0.7
  }, [currentSpeed])

  const spawnInterval = useMemo(() => {
    return Math.max(80, 600 / (ballDensity + 0.1))
  }, [ballDensity])

  // ─── 动画帧更新 ──────────────────────────────────────────────────────────────
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

    // 熔岩粒子增强：损耗越大，粒子越粗、喷射越快、数量越多
    const particleSpawnRate = heatIntensity * dt * 20
    if (heatIntensity > 0.02 && Math.random() < particleSpawnRate) {
      const px_x = lineStartX + Math.random() * (lineEndX - lineStartX)
      const t_p = (px_x - lineStartX) / (lineEndX - lineStartX)
      const lineIdx = Math.random() > 0.5 ? 0 : 1
      const baseLineY = lineIdx === 0 ? nodeY - px(10) : nodeY + px(10)
      const arcY = baseLineY + 4 * t_p * (1 - t_p) * px(12)

      particlesRef.current.push({
        id: nextParticleId.current++,
        x: px_x,
        y: arcY,
        vy: -(px(15) + Math.random() * px(30) * heatIntensity),
        opacity: 0.7 + heatIntensity * 0.3,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.6,
        size: px(1.8) + Math.random() * px(3.5) * heatIntensity,
      })
    }

    particlesRef.current = particlesRef.current
      .map(p => ({
        ...p,
        y: p.y + p.vy * dt,
        x: p.x + (Math.random() - 0.5) * px(12) * dt,
        life: p.life + dt,
        opacity: p.opacity * (1 - p.life / p.maxLife),
      }))
      .filter(p => p.life < p.maxLife)

    setFrameTick(t => t + 1)
  }, [currentSpeed, ballSpeed, ballVisualRadius, spawnInterval, heatIntensity, lineStartX, lineEndX, nodeY, px])

  useAnimationFrame(
    (deltaTime) => {
      updateAnimation(deltaTime)
    },
    { playing: isPlaying, speed }
  )

  // ─── 视觉计算 ────────────────────────────────────────────────────────────────
  const lineColor = useMemo(() => {
    const rVal = Math.round(147 + (185 - 147) * heatIntensity)
    const gVal = Math.round(197 + (28 - 197) * heatIntensity)
    const bVal = Math.round(253 + (28 - 253) * heatIntensity)
    return `rgb(${rVal},${gVal},${bVal})`
  }, [heatIntensity])

  const blurStd = px(2) + heatIntensity * px(14)
  const shadowOpacity = 0.1 + heatIntensity * 0.5
  const lineWidth = px(2) + heatIntensity * px(3)

  const bladeAngle = bladeAngleRef.current
  const pulseBalls = pulseBallsRef.current
  const particles = particlesRef.current

  // ─── 脉冲球路径 ──────────────────────────────────────────────────────────────
  const getBallPosition = (progress: number): { x: number; y: number } => {
    if (progress < 0.15) {
      const t = progress / 0.15
      return { x: plantX + px(28) + (stepUpX - px(28) - plantX) * t, y: nodeY }
    } else if (progress < 0.3) {
      const t = (progress - 0.15) / 0.15
      return { x: stepUpX + px(28) + (lineStartX - stepUpX - px(28)) * t, y: nodeY }
    } else if (progress < 0.7) {
      const t = (progress - 0.3) / 0.4
      const lineIdx = Math.floor(t * 2) % 2
      const baseLineY = lineIdx === 0 ? nodeY - px(10) : nodeY + px(10)
      const arcY = baseLineY + 4 * t * (1 - t) * px(12)
      return { x: lineStartX + (lineEndX - lineStartX) * t, y: arcY }
    } else if (progress < 0.85) {
      const t = (progress - 0.7) / 0.15
      return { x: lineEndX + (stepDownX - px(28) - lineEndX) * t, y: nodeY }
    } else {
      const t = (progress - 0.85) / 0.15
      return { x: stepDownX + px(28) + (userX - px(28) - stepDownX - px(28)) * t, y: nodeY }
    }
  }

  // ─── 电压剖面图数据 ──────────────────────────────────────────────────────────
  // U1 是发电厂输出电压（升压前），假设固定为 10kV
  const U1_display = 10000 // V
  // 视觉夸张：最小可见跌落像素，确保即使 ΔU 很小也能看出下台阶
  const minVisibleDrop = px(30)
  const voltageDropRatio = Math.min(1, Math.max(0, deltaU / U2))
  const actualDropPixels = (chartBottom - chartTop) * voltageDropRatio
  const visibleDropPixels = Math.max(actualDropPixels, minVisibleDrop)
  const u3Y = chartTop + visibleDropPixels

  // U4 视觉折算高度映射（兼顾变比调节与电压跌落视觉成比例位移）
  const u4Target = 220 * (k / 0.02)
  const u4Y = chartBottom - (chartBottom - chartTop) * 0.7 * (u4Target === 0 ? 0 : U4 / u4Target)
  
  const voltagePoints = [
    { x: plantX, y: chartBottom, label: 'U₁', value: U1_display },
    { x: stepUpX, y: chartTop, label: 'U₂', value: U2 },
    { x: lineEndX, y: u3Y, label: 'U₃', value: U3 },
    { x: userX, y: u4Y, label: 'U₄', value: U4 },
  ]

  // 220V 标准电压基准线（在用户端位置绘制，与 U4 采用同等比例尺以保证对齐）
  const ratedY = chartBottom - (chartBottom - chartTop) * 0.7 * (u4Target === 0 ? 0 : 220 / u4Target)

  // 理想无损耗对比线（无 ΔU 跌落）
  const idealPoints = showIdeal ? [
    { x: plantX, y: chartBottom },
    { x: stepUpX, y: chartTop },
    { x: lineEndX, y: chartTop }, // 无跌落
    { x: userX, y: chartBottom - (chartBottom - chartTop) * 0.7 }, // 理想无损用户电压
  ] : []

  // ─── 用户端灯泡数量（进阶模式）────────────────────────────────────────────────
  const bulbCount = mode === 1 ? Math.min(20, Math.max(3, Math.ceil(N / 50))) : 3
  const bulbSpacing = px(22)
  const bulbsStartX = stepDownX + px(35)

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={W} height={H}
        className="bg-white rounded-lg shadow-inner select-none"
        style={{ fontFamily: CANVAS_STYLE.font.family }}
      >
        {isOverloaded && (
          <g>
            <rect x={px(12)} y={px(10)} width={W - px(24)} height={px(28)} rx={px(6)} fill={colors.danger[100]} stroke={colors.danger[500]} />
            <text x={W / 2} y={px(29)} textAnchor="middle" fontSize={font(12)} fill={colors.danger[700]} fontWeight="bold">
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
            <feGaussianBlur in="SourceGraphic" stdDeviation={px(1) + userBrightness * px(3)} />
          </filter>
          <linearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={TRANSMISSION_COLORS.voltageHigh} stopOpacity="0.25" />
            <stop offset="100%" stopColor={TRANSMISSION_COLORS.voltageHigh} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* ══════════════════════════════════════════════════════════════════════
            上半区：电压剖面图（40%高度）
            ══════════════════════════════════════════════════════════════════════ */}
        <g>
          {/* 标题 */}
          <text x={W / 2} y={chartTop - px(8)} fontSize={font(14)}
            fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            电压剖面图
          </text>

          {/* Y 轴参考线 */}
          <line x1={plantX} y1={chartTop} x2={plantX} y2={chartBottom}
            stroke={PHYSICS_COLORS.grid} strokeWidth={px(1)} strokeDasharray="4 2" />
          <line x1={plantX} y1={chartBottom} x2={userX + px(20)} y2={chartBottom}
            stroke={PHYSICS_COLORS.grid} strokeWidth={px(1)} />

          {/* 实际电压折线下方面积渐变填充 */}
          <path
            d={`M ${plantX} ${chartBottom} L ${plantX} ${chartBottom} L ${stepUpX} ${chartTop} L ${lineEndX} ${u3Y} L ${userX} ${u4Y} L ${userX} ${chartBottom} Z`}
            fill="url(#chartAreaGrad)"
          />

          {/* 输电线损耗高亮三角形区域 */}
          {deltaU > 5 && (
            <path
              d={`M ${stepUpX} ${chartTop} L ${lineEndX} ${chartTop} L ${lineEndX} ${u3Y} Z`}
              fill={TRANSMISSION_COLORS.powerLoss}
              opacity="0.1"
            />
          )}

          {/* 理想无损耗对比线 */}
          {showIdeal && idealPoints.length > 0 && (
            <polyline
              points={idealPoints.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={TRANSMISSION_COLORS.idealOverlay}
              strokeWidth={px(2)}
              strokeDasharray="6 3"
              opacity={0.7}
            />
          )}

          {/* 实际电压折线 */}
          <polyline
            points={voltagePoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={TRANSMISSION_COLORS.voltageHigh}
            strokeWidth={px(2.5)}
          />

          {/* 电压节点标注卡片 */}
          {voltagePoints.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={px(6)}
                fill={TRANSMISSION_COLORS.voltageHigh} opacity="0.3" filter="url(#glowFilter)" />
              <circle cx={p.x} cy={p.y} r={px(4)}
                fill={TRANSMISSION_COLORS.voltageHigh} />

              {/* 数值信息圆角胶囊背景卡片 */}
              <rect
                x={p.x - px(24)}
                y={p.y + px(8)}
                width={px(48)}
                height={px(15)}
                rx={px(4)}
                fill="rgba(255, 255, 255, 0.85)"
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={px(0.8)}
              />
              <text x={p.x} y={p.y - px(10)} fontSize={font(11)}
                fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
                {p.label}
              </text>
              <text x={p.x} y={p.y + px(19)} fontSize={font(8.5)}
                fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
                {p.value >= 1000 ? `${(p.value / 1000).toFixed(1)}kV` : `${p.value.toFixed(0)}V`}
              </text>
            </g>
          ))}

          {/* 220V 标准电压基准线 */}
          <line
            x1={stepDownX} y1={ratedY} x2={userX + px(20)} y2={ratedY}
            stroke={PHYSICS_COLORS.axis} strokeWidth={px(1)} strokeDasharray="4 3" opacity={0.6} />
          <text x={userX + px(22)} y={ratedY + px(3)} fontSize={font(9)}
            fill={PHYSICS_COLORS.axis} textAnchor="start">
            标准 220V
          </text>

          {/* ΔU 标注 */}
          <line x1={stepUpX + px(10)} y1={chartTop} x2={stepUpX + px(10)} y2={voltagePoints[2].y}
            stroke={TRANSMISSION_COLORS.powerLoss} strokeWidth={px(1.5)} strokeDasharray="3 2" />
          <text x={stepUpX + px(18)} y={(chartTop + voltagePoints[2].y) / 2} fontSize={font(10)}
            fill={TRANSMISSION_COLORS.powerLoss} textAnchor="start">
            ΔU={deltaU.toFixed(0)}V
          </text>
        </g>

        {/* ══════════════════════════════════════════════════════════════════════
            下半区：实体网络拓扑（60%高度）
            ══════════════════════════════════════════════════════════════════════ */}
        <g>
          {/* 连接线（虚线） */}
          <line x1={plantX + px(28)} y1={nodeY} x2={stepUpX - px(26)} y2={nodeY}
            stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={px(1.5)}
            strokeDasharray="6 3" opacity="0.6" />
          <line x1={stepUpX + px(26)} y1={nodeY} x2={lineStartX} y2={nodeY}
            stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={px(1.5)}
            strokeDasharray="6 3" opacity="0.6" />
          <line x1={lineEndX} y1={nodeY} x2={stepDownX - px(26)} y2={nodeY}
            stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={px(1.5)}
            strokeDasharray="6 3" opacity="0.6" />
          <line x1={stepDownX + px(26)} y1={nodeY} x2={userX - px(20)} y2={nodeY}
            stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={px(1.5)}
            strokeDasharray="6 3" opacity="0.6" />

          {/* ─── 输电线（双线悬垂弧线 + 热浪效果）────────────────────────────── */}
          {heatIntensity > 0.05 && (
            <g filter="url(#heatWave)" opacity={shadowOpacity}>
              <path
                d={`M ${lineStartX} ${nodeY - px(10)} Q ${(lineStartX + lineEndX) / 2} ${nodeY - px(10) + px(12)} ${lineEndX} ${nodeY - px(10)}`}
                fill="none"
                stroke={TRANSMISSION_COLORS.thermalGlow}
                strokeWidth={lineWidth + px(6)}
              />
              <path
                d={`M ${lineStartX} ${nodeY + px(10)} Q ${(lineStartX + lineEndX) / 2} ${nodeY + px(10) + px(12)} ${lineEndX} ${nodeY + px(10)}`}
                fill="none"
                stroke={TRANSMISSION_COLORS.thermalGlow}
                strokeWidth={lineWidth + px(6)}
              />
            </g>
          )}

          <path
            d={`M ${lineStartX} ${nodeY - px(10)} Q ${(lineStartX + lineEndX) / 2} ${nodeY - px(10) + px(12)} ${lineEndX} ${nodeY - px(10)}`}
            fill="none"
            stroke={lineColor}
            strokeWidth={lineWidth}
          />
          <path
            d={`M ${lineStartX} ${nodeY + px(10)} Q ${(lineStartX + lineEndX) / 2} ${nodeY + px(10) + px(12)} ${lineEndX} ${nodeY + px(10)}`}
            fill="none"
            stroke={lineColor}
            strokeWidth={lineWidth}
          />

          {/* 线路电阻标注 */}
          <text x={(lineStartX + lineEndX) / 2} y={nodeY - px(24)}
            fontSize={font(12)} fill={PHYSICS_COLORS.labelText}
            textAnchor="middle" fontWeight="bold">
            r = {r} Ω
          </text>
          <text x={(lineStartX + lineEndX) / 2} y={nodeY + px(32)}
            fontSize={font(10)} fill={TRANSMISSION_COLORS.powerLoss}
            textAnchor="middle">
            ΔP = {(P_loss / 1000).toFixed(1)} kW
          </text>

          {/* ─── 发电厂（带冷却塔、发电机房和高速汽轮转子） ────────────────────── */}
          <g transform={`translate(${plantX}, ${nodeY})`}>
            {/* 冷却塔 1 */}
            <path
              d={`M ${-px(24)} ${px(14)} C ${-px(18)} ${-px(4)}, ${-px(18)} ${-px(12)}, ${-px(20)} ${-px(16)} L ${-px(12)} ${-px(16)} C ${-px(14)} ${-px(12)}, ${-px(14)} ${-px(4)}, ${-px(8)} ${px(14)} Z`}
              fill={PHYSICS_COLORS.objectFill}
              stroke={PHYSICS_COLORS.objectStroke}
              strokeWidth={px(1)}
            />
            {/* 冷却塔 2 */}
            <path
              d={`M ${-px(10)} ${px(14)} C ${-px(4)} ${-px(4)}, ${-px(4)} ${-px(12)}, ${-px(6)} ${-px(16)} L ${px(2)} ${-px(16)} C ${px(0)} ${-px(12)}, ${px(0)} ${-px(4)}, ${px(6)} ${px(14)} Z`}
              fill={PHYSICS_COLORS.objectFill}
              stroke={PHYSICS_COLORS.objectStroke}
              strokeWidth={px(1)}
            />
            {/* 发电机厂房 */}
            <rect x={-px(4)} y={-px(2)} width={px(26)} height={px(16)} rx={px(2)}
              fill={PHYSICS_COLORS.objectFill}
              stroke={PHYSICS_COLORS.objectStroke}
              strokeWidth={px(1)} />
            <polygon points={`${-px(4)},${-px(2)} ${px(9)},${-px(10)} ${px(22)},${-px(2)}`}
              fill={PHYSICS_COLORS.objectFill}
              stroke={PHYSICS_COLORS.objectStroke}
              strokeWidth={px(1)} />

            {/* 汽轮发电机高速转子 */}
            <g transform={`translate(${px(9)}, ${px(6)})`}>
              <circle cx={0} cy={0} r={px(8)}
                fill="none"
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={px(0.8)}
                strokeDasharray="2 2"
              />
              <g transform={`rotate(${bladeAngle}, 0, 0)`}>
                <line x1={0} y1={-px(6)} x2={0} y2={px(6)}
                  stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={px(1.5)} strokeLinecap="round" />
                <line x1={-px(6)} y1={0} x2={px(6)} y2={0}
                  stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={px(1.5)} strokeLinecap="round" />
                <circle cx={0} cy={0} r={px(2)} fill={PHYSICS_COLORS.electricCurrent} />
              </g>
            </g>

            <text x={0} y={px(32)} fontSize={font(12)}
              fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
              发电厂
            </text>
            <text x={0} y={px(45)} fontSize={font(8.5)} fill={PHYSICS_COLORS.axis}
              textAnchor="middle">
              P₁={(P1_real / 1000).toFixed(1)}kW
            </text>
          </g>

          {/* ─── 升压变压器 ─── */}
          <g transform={`translate(${stepUpX}, ${nodeY})`}>
            <TransformerApparatus
              x={0}
              y={0}
              width={px(40)}
              height={px(70)}
              turns1={4}
              turns2={10}
              current1={I_line * 1.5}
              current2={I_line}
              voltage1={220}
              animated={isPlaying}
              px={px}
            />
            <text x={0} y={px(48)} fontSize={font(11)}
              fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
              升压变压器
            </text>
            <text x={0} y={px(60)} fontSize={font(8.5)} fill={PHYSICS_COLORS.axis}
              textAnchor="middle">
              U₂={(U2 / 1000).toFixed(0)}kV
            </text>
          </g>

          {/* ─── 脉冲球 ──────────────────────────────────────────────────────── */}
          {pulseBalls.map(ball => {
            const pos = getBallPosition(ball.progress)
            return (
              <g key={ball.id}>
                <circle cx={pos.x} cy={pos.y}
                  r={ball.radius + px(2)}
                  fill={TRANSMISSION_COLORS.currentLine}
                  opacity={ball.opacity * 0.3}
                  filter="url(#glowFilter)" />
                <circle cx={pos.x} cy={pos.y}
                  r={ball.radius}
                  fill={TRANSMISSION_COLORS.currentLine}
                  opacity={ball.opacity} />
              </g>
            )
          })}

          {/* ─── 发热粒子（熔岩渐变：核心亮黄→边缘暗红）────────────────────── */}
          {particles.map(p => {
            const lifeRatio = p.life / p.maxLife
            const particleColor = lifeRatio < 0.3
              ? colors.accent[400]
              : lifeRatio < 0.7
                ? colors.warning[500]
                : TRANSMISSION_COLORS.thermalGlow
            return (
              <g key={p.id}>
                <circle
                  cx={p.x} cy={p.y}
                  r={p.size * 2}
                  fill={particleColor}
                  opacity={Math.max(0, p.opacity * 0.3)}
                  filter="url(#glowFilter)" />
                <circle
                  cx={p.x} cy={p.y}
                  r={p.size}
                  fill={particleColor}
                  opacity={Math.max(0, p.opacity)} />
              </g>
            )
          })}

          {/* ─── 降压变压器 ─── */}
          <g transform={`translate(${stepDownX}, ${nodeY})`}>
            <TransformerApparatus
              x={0}
              y={0}
              width={px(40)}
              height={px(70)}
              turns1={10}
              turns2={Math.max(3, Math.round(10 * (k / 0.02)))}
              current1={I_line}
              current2={I_line / Math.max(0.01, k)}
              voltage1={U3 / 100}
              animated={isPlaying}
              px={px}
            />
            <text x={0} y={px(48)} fontSize={font(11)}
              fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
              降压变压器
            </text>
            <text x={0} y={px(60)} fontSize={font(8.5)} fill={PHYSICS_COLORS.axis}
              textAnchor="middle">
              k={k.toFixed(3)}
            </text>
          </g>

          {/* ─── 用户端：采用 LightBulb 既有公共组件矩阵 ───────────────────────── */}
          {Array.from({ length: bulbCount }).map((_, i) => {
            const hx = bulbsStartX + i * bulbSpacing
            const hy = nodeY
            const singlePower = P_user / bulbCount
            const visualPower = Math.min(2.5, singlePower / 5000)

            return (
              <LightBulb
                key={i}
                x={hx}
                y={hy - px(8)}
                power={visualPower}
                time={bladeAngle / 60}
                scale={px(0.68)}
                showLabel={false}
                font={font}
              />
            )
          })}

          {/* 用户端标注 */}
          <text x={userX} y={nodeY + px(40)} fontSize={font(12)}
            fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            用户端
          </text>
          <text x={userX} y={nodeY + px(54)} fontSize={font(9)} fill={PHYSICS_COLORS.axis}
            textAnchor="middle">
            P₄={(P_user / 1000).toFixed(1)}kW
          </text>
        </g>

        {/* ══════════════════════════════════════════════════════════════════════
            底部信息条：核心数据摘要
            ══════════════════════════════════════════════════════════════════════ */}
        <g transform={`translate(${px(8)}, ${H - px(60)})`}>
          <rect width={W - px(16)} height={px(52)} rx={px(5)}
            fill={PHYSICS_COLORS.objectFill}
            opacity="0.9"
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={px(1)} />

          <text x={px(10)} y={px(16)} fontSize={font(12)}
            fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            输电效率 η = {(eta * 100).toFixed(1)}%
          </text>
          <text x={px(10)} y={px(32)} fontSize={font(10)} fill={PHYSICS_COLORS.axis}>
            I = {I_line.toFixed(1)} A
            &nbsp;|&nbsp;
            ΔU = {deltaU.toFixed(0)} V
            &nbsp;|&nbsp;
            ΔP = {(P_loss / 1000).toFixed(1)} kW
            &nbsp;|&nbsp;
            U₄ = {U4.toFixed(0)} V
          </text>
          <text x={px(10)} y={px(46)} fontSize={font(9)}
            fill={voltageRatio >= 1
              ? TRANSMISSION_COLORS.efficiency
              : voltageRatio > 0.8
                ? TRANSMISSION_COLORS.voltageHigh
                : TRANSMISSION_COLORS.powerLoss}>
            {mode === 1
              ? (voltageRatio >= 1
                ? '✓ U₄ 达到标准 220V，用电器正常工作'
                : voltageRatio > 0.8
                  ? `△ U₄ 低于标准 220V（差 ${(220 - U4).toFixed(0)}V），请调节变比 k 稳压`
                  : `⚠ U₄ 严重偏低（${U4.toFixed(0)}V），用电器无法正常工作`)
              : (eta > 0.95
                ? '✓ 高压输电，损耗极低'
                : eta > 0.8
                  ? '△ 中等损耗，可考虑提高输电电压'
                  : '⚠ 损耗严重！必须提高输电电压或减小线路电阻')}
          </text>
        </g>
      </svg>
    </div>
  )
}
