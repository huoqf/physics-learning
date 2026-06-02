/**
 * Transformer.tsx — 变压器原理（[M4-1]）
 *
 * 物理模型：理想变压器
 *   U2/U1 = n2/n1，I1/I2 = n2/n1，P1 = P2（功率守恒）
 *
 * 布局：左侧原线圈 + 铁芯 + 右侧副线圈，右侧灯泡亮度反馈
 *   默认显示磁通量虚线环，toggle 开启后显示相位差波形
 *
 * @agent-rule 遵循 useCanvasSize + theme token（CANVAS_STYLE / PHYSICS_COLORS）
 * @agent-rule 使用 useAnimationFrame 驱动动画，禁止裸调 requestAnimationFrame
 */
import { useMemo, useRef } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'
import { useAnimationFrame } from '@/utils/animation'
import { calculateTransformerWithLoad } from '@/physics'

// ─── 布局参数 ─────────────────────────────────────────────────────────────
const CORE_W = 60       // 铁芯宽度
const CORE_H = 140      // 铁芯高度
const COIL_W = 28       // 线圈宽度
const MAX_DISPLAY_TURNS = 20  // 线圈最大显示匝数

// ─── 灯泡功率 → 光晕档位映射 ───────────────────────────────────────────────
function getBulbGlowLevel(power: number): { stdDev: number; opacity: number } {
  if (power < 50) return { stdDev: 3, opacity: 0.3 }
  if (power < 200) return { stdDev: 8, opacity: 0.6 }
  return { stdDev: 15, opacity: 0.9 }
}

// ─── 生成单条线圈路径（贝塞尔曲线连续绕线）─────────────────────────────────
/**
 * 生成线圈绕线 SVG path 的 d 属性。
 * 每匝由两段二次贝塞尔曲线组成，模拟导线在铁芯前/后的缠绕效果。
 *
 * @param left     线圈左边界 x
 * @param right    线圈右边界 x
 * @param top      铁芯上边界 y
 * @param bottom   铁芯下边界 y
 * @param n        实际匝数
 * @param isPrimary true=原线圈（弧线向右凸），false=副线圈（弧线向左凸）
 */
function generateCoilPath(
  left: number,
  right: number,
  top: number,
  bottom: number,
  n: number,
  isPrimary: boolean
): string {
  const turns = Math.min(n, MAX_DISPLAY_TURNS)
  const availableH = bottom - top - 10
  const gap = availableH / (turns + 1)

  let d = ''
  for (let i = 0; i < turns; i++) {
    const yStart = top + 10 + i * gap
    const yEnd = yStart + gap * 0.8
    const midY = (yStart + yEnd) / 2
    const bulge = COIL_W / 2

    if (i === 0) {
      d += `M ${right} ${yStart}`
    }

    if (isPrimary) {
      // 原线圈：弧线向右凸
      d += ` Q ${right + bulge} ${midY} ${right} ${yEnd}`
    } else {
      // 副线圈：弧线向左凸
      d += ` Q ${left - bulge} ${midY} ${left} ${yEnd}`
    }
  }
  return d
}

// ─── 生成电子轨道路径（与线圈路径相同，用于 stroke-dasharray 动画）──────────
function generateElectronPath(
  left: number,
  right: number,
  top: number,
  bottom: number,
  n: number,
  isPrimary: boolean
): string {
  return generateCoilPath(left, right, top, bottom, n, isPrimary)
}

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
  const omega = 2 * Math.PI * 4 // 4 Hz

  // ── 瞬时电压/电流 ─────────────────────────────────────────────────────
  const u2_inst = U2 * Math.sin(omega * t)
  const i1 = I1 * Math.sin(omega * t)
  const i2 = I2 * Math.sin(omega * t)
  const p2_inst = u2_inst * i2

  // ── 磁通量动画参数 ────────────────────────────────────────────────────
  const fluxIntensity = Math.abs(Math.sin(omega * t))

  // ── 布局尺寸 ──────────────────────────────────────────────────────────
  const W = canvasSize.width
  const H = canvasSize.height

  const cx = W / 2
  const cy = H / 2 - 20

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

  // ── 线圈路径 ──────────────────────────────────────────────────────────
  const primaryCoilPath = useMemo(
    () => generateCoilPath(primaryLeft, primaryRight, coreTop, coreBottom, n1, true),
    [primaryLeft, primaryRight, coreTop, coreBottom, n1]
  )

  const secondaryCoilPath = useMemo(
    () => generateCoilPath(secondaryLeft, secondaryRight, coreTop, coreBottom, n2, false),
    [secondaryLeft, secondaryRight, coreTop, coreBottom, n2]
  )

  // ── 电子轨道路径 ──────────────────────────────────────────────────────
  const primaryElectronPath = useMemo(
    () => generateElectronPath(primaryLeft, primaryRight, coreTop, coreBottom, n1, true),
    [primaryLeft, primaryRight, coreTop, coreBottom, n1]
  )

  const secondaryElectronPath = useMemo(
    () => generateElectronPath(secondaryLeft, secondaryRight, coreTop, coreBottom, n2, false),
    [secondaryLeft, secondaryRight, coreTop, coreBottom, n2]
  )

  // ── 磁通量虚线环 ──────────────────────────────────────────────────────
  const fluxRings = useMemo(() => {
    const rings = []
    const ringCount = 3
    for (let i = 0; i < ringCount; i++) {
      const inset = 6 + i * 10
      const path = `M ${coreLeft + inset} ${coreTop + inset} L ${coreRight - inset} ${coreTop + inset} L ${coreRight - inset} ${coreBottom - inset} L ${coreLeft + inset} ${coreBottom - inset} Z`
      rings.push(
        <path
          key={`flux-ring-${i}`}
          d={path}
          fill="none"
          stroke={PHYSICS_COLORS.magneticField}
          strokeWidth={1}
          strokeDasharray={CANVAS_STYLE.dash.reference.join(' ')}
          strokeDashoffset={-t * 30 - i * 15}
          opacity={fluxIntensity * (0.7 - i * 0.15)}
        />
      )
    }
    return rings
  }, [coreLeft, coreRight, coreTop, coreBottom, t, fluxIntensity])

  // ── 电子往复运动偏移量 ────────────────────────────────────────────────
  const primaryDashOffset = (i1 / (I1 || 1)) * 12
  const secondaryDashOffset = -(i2 / (I2 || 1)) * 12

  // ── 灯泡亮度（瞬时功率，随 AC 周期脉动）─────────────────────────────────
  const p2InstAbs = Math.abs(p2_inst)
  const bulbGlow = getBulbGlowLevel(p2InstAbs)

  // ── 灯泡位置 ──────────────────────────────────────────────────────────
  const bulbX = secondaryRight + 50
  const bulbY = cy

  // ── 相位差波形（扫描点即曲线：用 ref 缓存历史轨迹）─────────────────────
  const waveH = 80
  const waveY = H - 42 - waveH - 8
  const waveW = W - 16
  const waveX = 8
  const wavePeriod = 2 * Math.PI / omega

  // 扫描线位置：基于实时时间 t，在 waveW 范围内循环
  const phase = (t % wavePeriod) / wavePeriod
  const scanX = waveX + phase * waveW

  // 历史轨迹缓存（用 ref 避免触发重渲染，但渲染时读取）
  const phiHistoryRef = useRef<{ x: number; y: number }[]>([])
  const e2HistoryRef = useRef<{ x: number; y: number }[]>([])
  const lastPhaseRef = useRef(0)

  // 检测扫描线是否回到起点（phase 从接近 1 跳到接近 0）
  if (lastPhaseRef.current > 0.9 && phase < 0.1) {
    phiHistoryRef.current = []
    e2HistoryRef.current = []
  }

  // 计算当前扫描点位置
  const phiY = waveY + waveH / 2 - Math.sin(omega * t) * waveH * 0.3
  const e2Y = waveY + waveH / 2 - (-Math.cos(omega * t)) * waveH * 0.3

  // 添加到历史轨迹（每帧添加 3 个插值点，提高曲线密度）
  const prevLen = phiHistoryRef.current.length
  if (prevLen > 0) {
    const lastPhi = phiHistoryRef.current[prevLen - 1]
    const lastE2 = e2HistoryRef.current[prevLen - 1]
    for (let i = 1; i <= 3; i++) {
      const ratio = i / 4
      const ix = lastPhi.x + (scanX - lastPhi.x) * ratio
      const iPhiY = lastPhi.y + (phiY - lastPhi.y) * ratio
      const iE2Y = lastE2.y + (e2Y - lastE2.y) * ratio
      phiHistoryRef.current.push({ x: ix, y: iPhiY })
      e2HistoryRef.current.push({ x: ix, y: iE2Y })
    }
  } else {
    phiHistoryRef.current.push({ x: scanX, y: phiY })
    e2HistoryRef.current.push({ x: scanX, y: e2Y })
  }

  // 限制历史长度：保留约 4 个周期的轨迹（每周期约 240 点，4 周期 ≈ 960 点）
  if (phiHistoryRef.current.length > 1200) {
    phiHistoryRef.current = phiHistoryRef.current.slice(-960)
    e2HistoryRef.current = e2HistoryRef.current.slice(-960)
  }

  lastPhaseRef.current = phase

  // 将历史点数组转为 SVG path
  const historyToPath = (history: { x: number; y: number }[]): string => {
    if (history.length === 0) return ''
    return history.reduce((path, point, i) => {
      return path + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`)
    }, '')
  }

  const phiWavePath = historyToPath(phiHistoryRef.current)
  const e2WavePath = historyToPath(e2HistoryRef.current)

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={W} height={H}
        className="bg-white rounded-lg shadow-inner select-none"
        style={{ fontFamily: CANVAS_STYLE.font.family }}
      >
        {/* ── SVG 滤镜定义 ──────────────────────────────────────────────── */}
        <defs>
          <filter id="bulb-glow">
            <feGaussianBlur stdDeviation={bulbGlow.stdDev} />
          </filter>
        </defs>

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

        {/* ═══════════════════ 磁通量虚线环 ═══════════════════ */}
        {fluxRings}

        {/* ═══════════════════ 原线圈（左侧）═══════════════════ */}
        <g>
          {/* 线圈绕线 */}
          <path
            d={primaryCoilPath}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            strokeLinecap="round"
          />
          {/* 原线圈标注 */}
          <text x={(primaryLeft + primaryRight) / 2} y={coreTop - 8}
            fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText}
            textAnchor="middle" fontWeight="bold">
            原线圈 n₁={n1}
          </text>
          {/* 输入电压 */}
          <text x={(primaryLeft + primaryRight) / 2} y={coreBottom + 18}
            fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.electricCurrent}
            textAnchor="middle" fontWeight="bold">
            U₁ = {U1} V
          </text>
        </g>

        {/* ═══════════════════ 副线圈（右侧）═══════════════════ */}
        <g>
          {/* 线圈绕线 */}
          <path
            d={secondaryCoilPath}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            strokeLinecap="round"
          />
          {/* 副线圈标注 */}
          <text x={(secondaryLeft + secondaryRight) / 2} y={coreTop - 8}
            fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText}
            textAnchor="middle" fontWeight="bold">
            副线圈 n₂={n2}
          </text>
          {/* 输出电压 */}
          <text x={(secondaryLeft + secondaryRight) / 2} y={coreBottom + 18}
            fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.electricCurrent}
            textAnchor="middle" fontWeight="bold">
            U₂ = {U2.toFixed(1)} V
          </text>
        </g>

        {/* ═══════════════════ 电子往复运动 ═══════════════════ */}
        <g>
          {/* 原线圈电子 */}
          <path
            d={primaryElectronPath}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth={CANVAS_STYLE.stroke.objectLine + 1}
            strokeDasharray="4 20"
            strokeDashoffset={primaryDashOffset}
            opacity={0.6 + fluxIntensity * 0.4}
            strokeLinecap="round"
          />
          {/* 副线圈电子 */}
          <path
            d={secondaryElectronPath}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth={CANVAS_STYLE.stroke.objectLine + 1}
            strokeDasharray="4 20"
            strokeDashoffset={secondaryDashOffset}
            opacity={0.6 + fluxIntensity * 0.4}
            strokeLinecap="round"
          />
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

        {/* ═══════════════════ 负载灯泡 ═══════════════════ */}
        <g>
          {/* 连接线 */}
          <line x1={secondaryRight + 5} y1={cy - 15} x2={bulbX} y2={cy - 15}
            stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          <line x1={secondaryRight + 5} y1={cy + 15} x2={bulbX} y2={cy + 15}
            stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          <line x1={bulbX} y1={cy - 15} x2={bulbX} y2={cy - 10}
            stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          <line x1={bulbX} y1={cy + 15} x2={bulbX} y2={cy + 10}
            stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />

          {/* 灯泡光晕 */}
          <circle
            cx={bulbX} cy={bulbY}
            r={18 + bulbGlow.stdDev}
            fill={PHYSICS_COLORS.lightRay}
            opacity={bulbGlow.opacity}
            filter="url(#bulb-glow)"
          />

          {/* 灯泡玻璃壳 */}
          <circle
            cx={bulbX} cy={bulbY}
            r={14}
            fill={PHYSICS_COLORS.objectFill}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={1.5}
            opacity={0.9}
          />

          {/* 钨丝 */}
          <path
            d={`M ${bulbX - 5} ${bulbY + 3} L ${bulbX - 2} ${bulbY - 4} L ${bulbX + 2} ${bulbY - 4} L ${bulbX + 5} ${bulbY + 3}`}
            fill="none"
            stroke={PHYSICS_COLORS.lightRay}
            strokeWidth={1.5}
            opacity={0.5 + bulbGlow.opacity * 0.5}
          />

          {/* 灯座 */}
          <rect
            x={bulbX - 6} y={bulbY + 12}
            width={12} height={6}
            fill={PHYSICS_COLORS.axis}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={1}
            rx="1"
          />

          {/* 负载标注 */}
          <text x={bulbX} y={bulbY + 30}
            fontSize={10} fill={PHYSICS_COLORS.labelText}
            textAnchor="middle">
            R = {R} Ω
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

        {/* ═══════════════════ 相位差波形（toggle 开启）═══════════════════ */}
        {showVectors && (
          <g>
            {/* 波形背景 */}
            <rect x={waveX} y={waveY} width={waveW} height={waveH}
              rx="5" fill={PHYSICS_COLORS.objectFill}
              opacity="0.9" stroke={PHYSICS_COLORS.grid} strokeWidth="1" />

            {/* 零线 */}
            <line x1={waveX} y1={waveY + waveH / 2} x2={waveX + waveW} y2={waveY + waveH / 2}
              stroke={PHYSICS_COLORS.axis} strokeWidth={1} strokeDasharray="4 4" />

            {/* Φ(t) 波形轨迹（扫描点走过的路径） */}
            <path
              d={phiWavePath}
              fill="none"
              stroke={PHYSICS_COLORS.magneticField}
              strokeWidth={1.5}
              strokeDasharray={CANVAS_STYLE.dash.reference.join(' ')}
            />
            <text x={waveX + 4} y={waveY + 12}
              fontSize={9} fill={PHYSICS_COLORS.magneticField} fontWeight="bold">
              Φ(t) 磁通量
            </text>

            {/* e₂(t) 波形轨迹（扫描点走过的路径） */}
            <path
              d={e2WavePath}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={1.5}
            />
            <text x={waveX + 4} y={waveY + 24}
              fontSize={9} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold">
              e₂(t) 感应电动势
            </text>

            {/* 扫描点（当前时刻的瞬时值，走在轨迹最前端） */}
            <circle cx={scanX} cy={phiY} r={3}
              fill={PHYSICS_COLORS.magneticField} />
            <circle cx={scanX} cy={e2Y} r={3}
              fill={PHYSICS_COLORS.electricCurrent} />

            {/* 相位差标注 */}
            <text x={waveX + waveW - 160} y={waveY + 12}
              fontSize={9} fill={PHYSICS_COLORS.labelText}>
              Φ=0 时 ΔΦ/Δt 最大 → e₂ 峰值（90° 相位差）
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
