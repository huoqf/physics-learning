/**
 * NetworkTopology.tsx — 实体网络拓扑（下半区 60%）
 *
 * 纯 SVG 渲染组件，零物理计算。
 * 包含：连接线、输电线（悬垂弧线 + 热浪效果）、发电厂、升/降压变压器、脉冲球、发热粒子、用户灯泡矩阵。
 */
import { colors } from '@/theme/colors'
import { PHYSICS_COLORS, TRANSMISSION_COLORS } from '@/theme/physics'
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

interface NetworkTopologyProps {
  /** 物理数据 */
  I_line: number
  P_loss: number
  U2: number
  U3: number
  P_user: number
  P1_real: number
  /** 视觉参数 */
  heatIntensity: number
  lineColor: string
  shadowOpacity: number
  lineWidth: number
  bladeAngle: number
  r: number
  k: number
  /** 动画实体 */
  pulseBalls: PulseBall[]
  particles: Particle[]
  /** 布局坐标 */
  nodeY: number
  plantX: number
  stepUpX: number
  lineStartX: number
  lineEndX: number
  stepDownX: number
  userX: number
  /** 控制 */
  isPlaying: boolean
  /** 缩放 */
  px: (v: number) => number
  font: (v: number) => number
  /** 脉冲球路径函数 */
  getBallPosition: (progress: number) => { x: number; y: number }
  /** 灯泡参数 */
  bulbCount: number
  bulbSpacing: number
  bulbsStartX: number
}

export function NetworkTopology({
  I_line,
  P_loss,
  U2,
  U3,
  P_user,
  P1_real,
  heatIntensity,
  lineColor,
  shadowOpacity,
  lineWidth,
  bladeAngle,
  r,
  k,
  pulseBalls,
  particles,
  nodeY,
  plantX,
  stepUpX,
  lineStartX,
  lineEndX,
  stepDownX,
  userX,
  isPlaying,
  px,
  font,
  getBallPosition,
  bulbCount,
  bulbSpacing,
  bulbsStartX,
}: NetworkTopologyProps) {
  return (
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
  )
}
