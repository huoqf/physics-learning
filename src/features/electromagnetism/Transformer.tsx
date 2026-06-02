/**
 * Transformer.tsx — 变压器原理（[M4-1]）
 *
 * 物理模型：理想变压器
 *   U2/U1 = n2/n1，I1/I2 = n2/n1，P1 = P2（功率守恒）
 *
 * 布局：左侧原线圈 + 铁芯 + 右侧副线圈，上方电压波形对比（toggle）
 *
 * @agent-rule 遵循 useCanvasSize + theme token（CANVAS_STYLE / PHYSICS_COLORS）
 * @agent-rule 使用 useAnimationFrame 驱动动画，禁止裸调 requestAnimationFrame
 */
import { useRef } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'
import { useAnimationFrame } from '@/utils/animation'
import { calculateTransformerWithLoad } from '@/physics'

// ─── 布局参数 ─────────────────────────────────────────────────────────────
const CORE_W = 60       // 铁芯宽度
const CORE_H = 140      // 铁芯高度
const COIL_W = 28       // 线圈宽度

// ─── 主组件 ──────────────────────────────────────────────────────────────
export default function Transformer() {
  const { params, isPlaying, speed, showVectors } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 800, height: 440 })

  const n1 = params.n1 ?? 100
  const n2 = params.n2 ?? 200
  const U1 = params.U1 ?? 220
  const R = params.R ?? 50

  const { U2, I2, I1, P_input, P_output } = calculateTransformerWithLoad(n1, n2, U1, R)

  // ── 动画时间 ──────────────────────────────────────────────────────────
  const simTimeRef = useRef(0)

  useAnimationFrame(
    (deltaTime) => {
      simTimeRef.current += (deltaTime / 1000) * (speed ?? 1)
    },
    { playing: isPlaying, speed: speed ?? 1 }
  )

  const t = simTimeRef.current
  const omega = 2 * Math.PI * 2 // 2 Hz

  // ── 瞬时电压/电流 ─────────────────────────────────────────────────────
  const u1 = U1 * Math.sin(omega * t)
  const u2 = U2 * Math.sin(omega * t)
  const i1 = I1 * Math.sin(omega * t)
  const i2 = I2 * Math.sin(omega * t)

  // ── 磁通量动画参数 ────────────────────────────────────────────────────
  const fluxIntensity = Math.abs(Math.sin(omega * t))
  const particleSpeed = (Math.abs(u1) / (U1 || 1)) * 0.8 + 0.2

  // ── 布局尺寸 ──────────────────────────────────────────────────────────
  const W = canvasSize.width
  const H = canvasSize.height

  const cx = W / 2
  const cy = H / 2 + 10

  // 铁芯位置
  const coreLeft = cx - CORE_W / 2
  const coreRight = cx + CORE_W / 2
  const coreTop = cy - CORE_H / 2
  const coreBottom = cy + CORE_H / 2

  // 原线圈位置（左侧）
  const primaryLeft = coreLeft - COIL_W - 8
  const primaryRight = coreLeft - 8

  // 副线圈位置（右侧）
  const secondaryLeft = coreRight + 8
  const secondaryRight = coreRight + COIL_W + 8

  // ── 绘制线圈匝 ────────────────────────────────────────────────────────
  function drawCoilTurns(
    left: number,
    right: number,
    top: number,
    bottom: number,
    n: number,
    color: string,
    isPrimary: boolean
  ) {
    const turns = Math.min(n, 20) // 最多显示 20 匝
    const availableH = bottom - top - 10
    const gap = availableH / (turns + 1)
    const lines = []

    for (let i = 0; i < turns; i++) {
      const y = top + 10 + i * gap
      // 半圆弧
      const d = isPrimary
        ? `M ${right} ${y} A ${COIL_W / 2} ${gap * 0.4} 0 0 1 ${right} ${y + gap * 0.8}`
        : `M ${left} ${y} A ${COIL_W / 2} ${gap * 0.4} 0 0 0 ${left} ${y + gap * 0.8}`

      lines.push(
        <path
          key={`turn-${i}`}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          opacity={0.7 + (i % 3) * 0.1}
        />
      )
    }
    return lines
  }

  // ── 磁通量虚线粒子 ────────────────────────────────────────────────────
  const fluxParticles = []
  const particleCount = 8
  for (let i = 0; i < particleCount; i++) {
    const frac = (t * particleSpeed * 0.5 + i / particleCount) % 1
    // 沿铁芯矩形路径运动
    const perimeter = (CORE_W + CORE_H) * 2
    const dist = frac * perimeter

    let px: number, py: number
    if (dist < CORE_H) {
      // 左侧边：从上到下
      px = coreLeft + 4
      py = coreTop + dist
    } else if (dist < CORE_H + CORE_W) {
      // 底边：从左到右
      px = coreLeft + (dist - CORE_H)
      py = coreBottom - 4
    } else if (dist < CORE_H * 2 + CORE_W) {
      // 右侧边：从下到上
      px = coreRight - 4
      py = coreBottom - (dist - CORE_H - CORE_W)
    } else {
      // 顶边：从右到左
      px = coreRight - (dist - CORE_H * 2 - CORE_W)
      py = coreTop + 4
    }

    fluxParticles.push(
      <circle
        key={`flux-${i}`}
        cx={px}
        cy={py}
        r={2 + fluxIntensity * 1.5}
        fill={PHYSICS_COLORS.magneticField}
        opacity={0.4 + fluxIntensity * 0.5}
      />
    )
  }

  // ── 电流球（上方）─────────────────────────────────────────────────────
  const currentBalls = []
  const ballCount = 6
  for (let i = 0; i < ballCount; i++) {
    const frac = (t * 0.3 + i / ballCount) % 1
    // 原线圈电流球（从左向右）
    const pBallX = primaryLeft + frac * (primaryRight - primaryLeft)
    // 副线圈电流球（从右向左）
    const sBallX = secondaryRight - frac * (secondaryRight - secondaryLeft)

    currentBalls.push(
      <circle
        key={`cb-p-${i}`}
        cx={pBallX}
        cy={coreTop - 18}
        r={3}
        fill={PHYSICS_COLORS.electricCurrent}
        opacity={0.5 + Math.abs(i1) / (I1 || 1) * 0.5}
      />
    )
    currentBalls.push(
      <circle
        key={`cb-s-${i}`}
        cx={sBallX}
        cy={coreTop - 18}
        r={3}
        fill={PHYSICS_COLORS.electricCurrent}
        opacity={0.5 + Math.abs(i2) / (I2 || 1) * 0.5}
      />
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={W} height={H}
        className="bg-white rounded-lg shadow-inner select-none"
        style={{ fontFamily: CANVAS_STYLE.font.family }}
      >
        {/* ═══════════════════ 铁芯（闭合矩形）═══════════════════ */}
        <rect
          x={coreLeft} y={coreTop}
          width={CORE_W} height={CORE_H}
          fill="none"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={CANVAS_STYLE.stroke.objectLine + 1}
          rx="4"
        />
        <text x={cx} y={cy + 5} fontSize={11} fill={PHYSICS_COLORS.axis}
          textAnchor="middle" fontWeight="bold">
          铁芯
        </text>

        {/* ═══════════════════ 磁通量粒子 ═══════════════════ */}
        {fluxParticles}

        {/* ═══════════════════ 原线圈（左侧）═══════════════════ */}
        <g>
          {drawCoilTurns(primaryLeft, primaryRight, coreTop, coreBottom, n1, PHYSICS_COLORS.electricCurrent, true)}
          {/* 原线圈标注 */}
          <text x={(primaryLeft + primaryRight) / 2} y={coreTop - 8}
            fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText}
            textAnchor="middle" fontWeight="bold">
            原线圈 n₁={n1}
          </text>
          {/* 输入电压 */}
          <text x={(primaryLeft + primaryRight) / 2} y={coreBottom + 18}
            fontSize={11} fill={PHYSICS_COLORS.electricCurrent}
            textAnchor="middle" fontWeight="bold">
            U₁ = {U1} V
          </text>
          <text x={(primaryLeft + primaryRight) / 2} y={coreBottom + 32}
            fontSize={10} fill={PHYSICS_COLORS.electricCurrent}
            textAnchor="middle">
            I₁ = {I1.toFixed(2)} A
          </text>
        </g>

        {/* ═══════════════════ 副线圈（右侧）═══════════════════ */}
        <g>
          {drawCoilTurns(secondaryLeft, secondaryRight, coreTop, coreBottom, n2, PHYSICS_COLORS.electricCurrent, false)}
          {/* 副线圈标注 */}
          <text x={(secondaryLeft + secondaryRight) / 2} y={coreTop - 8}
            fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText}
            textAnchor="middle" fontWeight="bold">
            副线圈 n₂={n2}
          </text>
          {/* 输出电压 */}
          <text x={(secondaryLeft + secondaryRight) / 2} y={coreBottom + 18}
            fontSize={11} fill={PHYSICS_COLORS.electricCurrent}
            textAnchor="middle" fontWeight="bold">
            U₂ = {U2.toFixed(1)} V
          </text>
          <text x={(secondaryLeft + secondaryRight) / 2} y={coreBottom + 32}
            fontSize={10} fill={PHYSICS_COLORS.electricCurrent}
            textAnchor="middle">
            I₂ = {I2.toFixed(2)} A
          </text>
        </g>

        {/* ═══════════════════ 电流球 ═══════════════════ */}
        {currentBalls}

        {/* ═══════════════════ 负载电阻 ═══════════════════ */}
        <g>
          {/* 负载连线 */}
          <line x1={secondaryRight + 5} y1={cy - 15} x2={secondaryRight + 35} y2={cy - 15}
            stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          <line x1={secondaryRight + 35} y1={cy - 15} x2={secondaryRight + 35} y2={cy + 15}
            stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          <line x1={secondaryRight + 35} y1={cy + 15} x2={secondaryRight + 5} y2={cy + 15}
            stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          {/* 电阻符号 */}
          <rect
            x={secondaryRight + 25} y={cy - 10}
            width={20} height={20}
            fill={PHYSICS_COLORS.objectFill}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={1.5}
          />
          <text x={secondaryRight + 35} y={cy + 4}
            fontSize={10} fill={PHYSICS_COLORS.labelText}
            textAnchor="middle" fontWeight="bold">
            R
          </text>
          <text x={secondaryRight + 35} y={cy + 30}
            fontSize={10} fill={PHYSICS_COLORS.labelText}
            textAnchor="middle">
            {R} Ω
          </text>
        </g>

        {/* ═══════════════════ 输入电源 ═══════════════════ */}
        <g>
          <line x1={primaryLeft - 30} y1={cy - 15} x2={primaryLeft - 5} y2={cy - 15}
            stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          <line x1={primaryLeft - 30} y1={cy + 15} x2={primaryLeft - 5} y2={cy + 15}
            stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          {/* 交流符号 */}
          <circle cx={primaryLeft - 30} cy={cy} r={14}
            fill={PHYSICS_COLORS.objectFill}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={1.5} />
          <text x={primaryLeft - 30} y={cy + 5}
            fontSize={14} fill={PHYSICS_COLORS.electricCurrent}
            textAnchor="middle" fontWeight="bold">
            ~
          </text>
        </g>

        {/* ═══════════════════ 底部公式 ═══════════════════ */}
        <g transform={`translate(8, ${H - 42})`}>
          <rect width={W - 16} height="36" rx="5" fill={PHYSICS_COLORS.objectFill}
            opacity="0.85" stroke={PHYSICS_COLORS.grid} strokeWidth="1" />
          <text x="10" y="14" fontSize={CANVAS_STYLE.font.axisSize}
            fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            理想变压器：U₂/U₁ = n₂/n₁，I₁/I₂ = n₂/n₁，P₁ = P₂
          </text>
          <text x="10" y="28" fontSize={10} fill={PHYSICS_COLORS.axis}>
            输入功率 P₁ = {P_input.toFixed(0)} W，输出功率 P₂ = {P_output.toFixed(0)} W
            {Math.abs(P_input - P_output) < 0.01 ? '（功率守恒 ✓）' : ''}
          </text>
        </g>

        {/* ═══════════════════ 波形对比（toggle 开启）═══════════════════ */}
        {showVectors && (
          <g transform={`translate(${W * 0.05}, 8)`}>
            <rect width={W * 0.9} height="50" rx="5" fill="#F8FAFC"
              opacity="0.9" stroke={PHYSICS_COLORS.grid} strokeWidth="1" />
            {/* 原线圈电压波形（简化为正弦示意） */}
            <path
              d={`M 10 35 Q 30 ${35 - u1 / (U1 || 1) * 12} 50 35 Q 70 ${35 + u1 / (U1 || 1) * 12} 90 35`}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={1.5}
            />
            <text x="10" y="14" fontSize={9} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold">
              U₁（原边）
            </text>
            {/* 副线圈电压波形 */}
            <path
              d={`M ${W * 0.9 - 90} 35 Q ${W * 0.9 - 70} ${35 - u2 / (U2 || 1) * 12} ${W * 0.9 - 50} 35 Q ${W * 0.9 - 30} ${35 + u2 / (U2 || 1) * 12} ${W * 0.9 - 10} 35`}
              fill="none"
              stroke={PHYSICS_COLORS.magneticField}
              strokeWidth={1.5}
            />
            <text x={W * 0.9 - 90} y="14" fontSize={9} fill={PHYSICS_COLORS.magneticField} fontWeight="bold">
              U₂（副边）
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
