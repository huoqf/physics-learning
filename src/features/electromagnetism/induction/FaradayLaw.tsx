/**
 * FaradayLaw.tsx — 法拉第电磁感应定律交互动画（[M4-1]）
 *
 * 布局：左侧物理仿真沙盒（条形磁铁 + 线圈 + 闭合回路 + 磁感线）
 *       右侧数据与图像看板（Φ-t / E-t 实时滚动双图表）
 *
 * 物理模型：条形磁铁沿水平轴插入/拔出圆形线圈，
 *   轴线磁通量近似：Φ ≈ Φ₀ · B · ( u_N/√(u_N²+R²) - u_S/√(u_S²+R²) )
 *   其中 u_N = coilX - magnetCenterX + halfLen，u_S = u_N - magnetLen
 *   dΦ/dt 由位置差分得出，EMF = -N · dΦ/dt
 *
 * @agent-rule 遵循 useCanvasSize + theme token（CANVAS_STYLE / PHYSICS_COLORS）
 * @agent-rule 禁止组件内裸调 requestAnimationFrame（已通过 useAnimationStore time 驱动）
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE, CHART_COLORS, SCENE_COLORS, DASH } from '@/theme/physics'
import { colors } from '@/theme/colors'

// ─── 物理常数 ─────────────────────────────────────────────────────────────
const COIL_X = 280          // 线圈在 SVG 中的水平中心 px（左移以容纳右侧电路）
const COIL_RX = 42          // 线圈水平半径
const COIL_RY = 65          // 线圈垂直半径
const MAGNET_LEN = 100      // 条形磁铁水平长度 px
const MAGNET_H = 34         // 条形磁铁高度 px
const SCALE_PX_PER_M = 500  // 1 m = 500 px（用于归一化磁通量公式中的几何参数）
const COIL_RADIUS_M = COIL_RY / SCALE_PX_PER_M // 线圈等效半径（米）
const PHI0 = 0.45           // 磁通量归一化系数（使 B=1 时满幅≈0.45 Wb）

// 自动运动速度 px/s
const AUTO_SPEEDS = { slow: 70, medium: 140, fast: 350 }

// 磁铁 x 轴可移动范围（磁铁左端 px 坐标）
// 推入：磁铁右端(S极)到达线圈中心 → magnetX = COIL_X - MAGNET_LEN
// 拉出：磁铁左端(N极)远离线圈 → magnetX = MAGNET_MIN_X
// 穿过：磁铁从左侧完全穿过到右侧 → magnetX = COIL_X + COIL_RX
const MAGNET_MIN_X = 60
const MAGNET_PUSH_TARGET = COIL_X - MAGNET_LEN + 15  // 推入目标：S极接近线圈中心
const MAGNET_PULL_START = COIL_X - MAGNET_LEN + 15   // 拉出起始位置
const MAGNET_MAX_X = COIL_X + COIL_RX - 10           // 完全穿过线圈右侧

// ─── 工具函数 ─────────────────────────────────────────────────────────────
/**
 * 计算条形磁铁在线圈平面产生的近似轴线磁通量。
 * 参数：
 *   magnetLeftPx — 磁铁左端 x 坐标（px）
 *   B            — 磁铁磁感应强度（T）
 * 返回：Φ（Wb，有符号）
 */
function calcFlux(magnetLeftPx: number, B: number): number {
  const magnetCenterPx = magnetLeftPx + MAGNET_LEN / 2
  // 线圈中心到磁铁中心的距离（米，向右为正）
  const dist = (COIL_X - magnetCenterPx) / SCALE_PX_PER_M
  const R = COIL_RADIUS_M
  const halfLen = MAGNET_LEN / 2 / SCALE_PX_PER_M

  // 两极轴向分量之差（类安培圆环积分近似）
  const uN = dist + halfLen  // N极到线圈的有效距离
  const uS = dist - halfLen  // S极到线圈的有效距离
  const termN = uN / Math.sqrt(uN * uN + R * R)
  const termS = uS / Math.sqrt(uS * uS + R * R)
  return PHI0 * B * (termN - termS)
}

// ─── 历史数据缓冲 ─────────────────────────────────────────────────────────
interface HistoryPoint { t: number; phi: number; emf: number }

// ─── 主组件 ──────────────────────────────────────────────────────────────
export default function FaradayLaw() {
  const { params, time, isPlaying, setIsPlaying, updateParam } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 800, height: 440 })

  const N = params.N ?? 5
  const B = params.B ?? 1.2

  // ── 磁铁位置状态 ──────────────────────────────────────────────────────
  const [magnetX, setMagnetX] = useState(MAGNET_MIN_X)  // 磁铁左端 x px

  // ── 拖拽交互 refs ─────────────────────────────────────────────────────
  const isDragging = useRef(false)
  const dragStartMouseX = useRef(0)
  const dragStartMagnetX = useRef(0)
  const svgRef = useRef<SVGSVGElement>(null)

  // ── 自动运动 ──────────────────────────────────────────────────────────
  const [autoMode, setAutoMode] = useState<'none' | 'push' | 'pull' | 'through'>('none')
  const [autoSpeed, setAutoSpeed] = useState<'slow' | 'medium' | 'fast'>('medium')
  const autoStartTime = useRef(0)
  const autoStartX = useRef(0)
  const autoTargetX = useRef(0)

  // ── 物理量历史缓冲区 ──────────────────────────────────────────────────
  const historyRef = useRef<HistoryPoint[]>([])
  const prevPhiRef = useRef(calcFlux(MAGNET_MIN_X, B))
  const prevTimeRef = useRef(0)
  const particleOffsetRef = useRef(0)

  // ── 拖拽专用物理量追踪（与自动模式完全隔离）─────────────────────────────
  const dragPrevPhiRef = useRef(calcFlux(MAGNET_MIN_X, B))
  const dragPrevTimeRef = useRef(0)
  const dragEmfRef = useRef(0)
  const dragHistoryRef = useRef<HistoryPoint[]>([])

  // ── 当前物理量计算 ─────────────────────────────────────────────────────
  const phi = calcFlux(magnetX, B)

  // 根据当前模式选择正确的 EMF 来源
  const effectiveEmf = isDragging.current
    ? dragEmfRef.current
    : isPlaying && autoMode !== 'none'
      ? (() => {
          const dt = time - prevTimeRef.current
          return dt > 0.001 ? -N * (phi - prevPhiRef.current) / dt : 0
        })()
      : 0

  const emf = effectiveEmf
  const resistance = 10  // 回路等效电阻 Ω（固定，用于灯泡亮度计算）
  const current = emf / resistance

  // ── 自动运动逻辑 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || autoMode === 'none') return

    const speedPx = AUTO_SPEEDS[autoSpeed]
    const direction = autoMode === 'pull' ? -1 : 1

    const elapsed = (time - autoStartTime.current)
    const newX = autoStartX.current + elapsed * speedPx * direction
    const clamped = Math.max(MAGNET_MIN_X, Math.min(MAGNET_MAX_X, newX))
    setMagnetX(clamped)

    // 到达目标位置时停止
    if (
      (autoMode !== 'pull' && clamped >= autoTargetX.current) ||
      (autoMode === 'pull' && clamped <= autoTargetX.current)
    ) {
      setIsPlaying(false)
      setAutoMode('none')
    }

    // 穿过模式：先推入再拉出（简化为推入到最右）
  }, [time, isPlaying, autoMode, autoSpeed, setIsPlaying])

  // ── 同步 magnetX 到 store（供 physicsQuantities 读取）─────────────────
  useEffect(() => {
    if (params.magnetX !== magnetX) {
      updateParam('magnetX', magnetX)
    }
  }, [magnetX, params.magnetX, updateParam])

  // ── 自动模式：更新历史缓冲区 ──────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || autoMode === 'none') return

    const dt = time - prevTimeRef.current
    if (dt > 0.016) {  // 约 60fps 节流
      const newPhi = calcFlux(magnetX, B)
      const newDPhi_dt = dt > 0.001 ? (newPhi - prevPhiRef.current) / dt : 0
      const newEMF = -N * newDPhi_dt

      historyRef.current.push({ t: time, phi: newPhi, emf: newEMF })
      // 保留最近 15 秒数据
      const cutoff = time - 15
      historyRef.current = historyRef.current.filter(p => p.t >= cutoff)

      // 粒子偏移累加
      particleOffsetRef.current += Math.abs(newEMF) * dt * 0.12

      prevPhiRef.current = newPhi
      prevTimeRef.current = time
    }
  }, [time, isPlaying, autoMode, magnetX, B, N])

  // ── 重置时清理历史 ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying && time < 0.1 && !isDragging.current) {
      historyRef.current = []
      dragHistoryRef.current = []
      prevPhiRef.current = calcFlux(magnetX, B)
      prevTimeRef.current = 0
      dragPrevPhiRef.current = calcFlux(magnetX, B)
      dragPrevTimeRef.current = 0
      dragEmfRef.current = 0
      particleOffsetRef.current = 0
    }
  }, [isPlaying, time, magnetX, B])

  // ── SVG 拖拽事件处理 ──────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isPlaying) return
    isDragging.current = true
    dragStartMouseX.current = e.clientX
    dragStartMagnetX.current = magnetX
    // 初始化拖拽追踪
    dragPrevPhiRef.current = calcFlux(magnetX, B)
    dragPrevTimeRef.current = performance.now()
    dragEmfRef.current = 0
    dragHistoryRef.current = []
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }, [isPlaying, magnetX, B])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStartMouseX.current
    const svgWidth = svgRef.current?.clientWidth || canvasSize.width
    const scale = canvasSize.width / svgWidth
    const newX = Math.max(MAGNET_MIN_X, Math.min(MAGNET_MAX_X, dragStartMagnetX.current + dx * scale))
    setMagnetX(newX)

    // 计算瞬时 EMF（基于实际帧间隔）
    const now = performance.now()
    const dtSec = Math.max(0.001, (now - dragPrevTimeRef.current) / 1000)
    const newPhi = calcFlux(newX, B)
    const dPhi = newPhi - dragPrevPhiRef.current
    const newEMF = -N * dPhi / dtSec

    dragEmfRef.current = newEMF
    dragPrevPhiRef.current = newPhi
    dragPrevTimeRef.current = now

    // 拖拽时更新历史（使用 performance.now() 作为时间基准）
    const dragTime = now / 1000
    dragHistoryRef.current.push({ t: dragTime, phi: newPhi, emf: newEMF })
    // 保留最近 12 秒数据
    const cutoff = dragTime - 12
    dragHistoryRef.current = dragHistoryRef.current.filter(p => p.t >= cutoff)

    // 粒子偏移累加
    particleOffsetRef.current += Math.abs(newEMF) * dtSec * 0.12
  }, [N, B, canvasSize.width])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false
    dragEmfRef.current = 0
    ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
  }, [])

  // ── 自动运动启动函数 ──────────────────────────────────────────────────
  const startAuto = (mode: 'push' | 'pull' | 'through') => {
    let startX: number
    let targetX: number
    if (mode === 'push') {
      startX = MAGNET_MIN_X
      targetX = MAGNET_PUSH_TARGET
    } else if (mode === 'pull') {
      startX = MAGNET_PULL_START
      targetX = MAGNET_MIN_X
    } else {
      startX = MAGNET_MIN_X
      targetX = MAGNET_MAX_X
    }
    setMagnetX(startX)
    autoStartX.current = startX
    autoTargetX.current = targetX
    autoStartTime.current = time
    historyRef.current = []
    prevPhiRef.current = calcFlux(startX, B)
    prevTimeRef.current = time
    particleOffsetRef.current = 0
    setAutoMode(mode)
    setIsPlaying(true)
  }

  // ── 布局参数 ──────────────────────────────────────────────────────────
  const W = canvasSize.width
  const H = canvasSize.height
  const sandboxW = W * 0.53   // 左侧沙盒宽度
  const dashLeft = sandboxW + 10  // 右侧图表区起点
  const dashRight = W - 8
  const dashW = dashRight - dashLeft

  const sandboxCy = H / 2   // 沙盒垂直中心
  const coilY = sandboxCy - 55  // 线圈中心上移，给下方电路留空间

  // ── 磁感线绘制参数 ─────────────────────────────────────────────────────
  const magnetCenterX = magnetX + MAGNET_LEN / 2
  const magnetCenterY = coilY
  const distToCoil = Math.abs(COIL_X - magnetCenterX)
  // 判断磁铁与线圈的重叠程度（0=完全分离，1=完全重合）
  const overlapRatio = Math.max(0, 1 - distToCoil / (COIL_RX + MAGNET_LEN / 2))
  const overlapRatioClamped = Math.min(1, overlapRatio * 2)

  // ── 选择正确的历史数据源 ───────────────────────────────────────────────
  const activeHistory = isDragging.current ? dragHistoryRef.current : historyRef.current
  const activeTimeBase = isDragging.current
    ? (dragHistoryRef.current.length > 0 ? dragHistoryRef.current[dragHistoryRef.current.length - 1].t : 0)
    : (historyRef.current.length > 0 ? historyRef.current[historyRef.current.length - 1].t : 0)

  // ── 示波器图表数据 ─────────────────────────────────────────────────────
  const history = activeHistory
  const tNow = activeTimeBase
  const tMin = Math.max(0, tNow - 12)
  const tMax = tNow > 12 ? tNow : 12

  // 磁通量最大范围（用于纵轴归一化）
  const maxPhi = Math.max(PHI0 * B * 0.9, 0.01)
  const maxEMF = Math.max(N * maxPhi * 0.6, 0.1)

  // 图表上图（Φ-t）和下图（E-t）的垂直中心
  const chartPadTop = 18
  const chartH = (H - chartPadTop * 3) / 2
  const yPhiMid = chartPadTop + chartH / 2
  const yEmfMid = chartPadTop * 2 + chartH + chartH / 2
  const chartHalfH = chartH * 0.4

  function toChartX(t: number) {
    return dashLeft + ((t - tMin) / (tMax - tMin)) * dashW
  }
  function toPhiY(phi: number) {
    return yPhiMid - (phi / maxPhi) * chartHalfH * 0.85
  }
  function toEmfY(emf: number) {
    return yEmfMid - (emf / maxEMF) * chartHalfH * 0.85
  }

  // 构建 Φ-t 波形路径（y 轴钳位到图表上图范围）
  function buildPhiPath(points: HistoryPoint[]) {
    if (points.length < 2) return ''
    return points.map((p, i) => {
      const x = toChartX(p.t).toFixed(1)
      const raw = toPhiY(p.phi)
      const y = Math.max(chartPadTop + 2, Math.min(yPhiMid + chartHalfH + 2, raw)).toFixed(1)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }
  function buildEmfPath(points: HistoryPoint[]) {
    if (points.length < 2) return ''
    return points.map((p, i) => {
      const x = toChartX(p.t).toFixed(1)
      const raw = toEmfY(p.emf)
      const y = Math.max(yPhiMid + chartHalfH + chartPadTop + 2, Math.min(yEmfMid + chartHalfH + 2, raw)).toFixed(1)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }

  // 当前焦点竖线 x
  const nowX = history.length > 0 ? toChartX(tNow) : dashLeft

  // ── 电路布局参数（确保全部在 sandboxW 内，整体下移避免与线圈/磁铁重叠）───
  const circuitRightX = Math.min(COIL_X + COIL_RX + 40, sandboxW - 20)  // 右侧导线边界
  const circuitBottomY = coilY + COIL_RY + 75   // 底边导线 y（下移）
  const circuitLeftX = Math.max(COIL_X - COIL_RX - 40, 20)  // 左侧导线边界

  // 灯泡和电流表位置（下移，放在线圈下方两侧）
  const bulbX = circuitRightX - 15
  const bulbY = coilY + COIL_RY + 45
  const meterX = circuitLeftX + 15
  const meterY = coilY + COIL_RY + 45

  // ── 粒子位置计算 ─────────────────────────────────────────────────────
  // 回路路径：沿矩形导线（与 polyline 绘制完全对齐）
  // 线圈上端 → 上侧 → 右侧 → 灯泡 → 底边 → 电流表 → 左侧 → 回到线圈上端
  const circuitPath = [
    { x: COIL_X + COIL_RX, y: coilY - 25 },      // 0: 线圈上端引出
    { x: circuitRightX, y: coilY - 25 },          // 1: 右上拐角
    { x: circuitRightX, y: bulbY - 18 },          // 2: 灯泡上方
    { x: bulbX, y: bulbY - 18 },                  // 3: 灯泡上端
    { x: bulbX, y: bulbY + 18 },                  // 4: 灯泡下端
    { x: circuitRightX, y: bulbY + 18 },          // 5: 灯泡下方回拐角
    { x: circuitRightX, y: circuitBottomY },      // 6: 右下拐角
    { x: circuitLeftX, y: circuitBottomY },       // 7: 底边到左侧
    { x: circuitLeftX, y: meterY + 22 },          // 8: 电流表下方
    { x: meterX, y: meterY + 22 },                // 9: 电流表下端
    { x: meterX, y: meterY - 22 },                // 10: 电流表上端
    { x: circuitLeftX, y: meterY - 22 },          // 11: 电流表上方回拐角
    { x: circuitLeftX, y: coilY - 25 },           // 12: 左上拐角
    { x: COIL_X - COIL_RX, y: coilY - 25 },       // 13: 回到线圈上端
  ]

  const totalPathLen = (() => {
    let len = 0
    for (let i = 1; i < circuitPath.length; i++) {
      const dx = circuitPath[i].x - circuitPath[i - 1].x
      const dy = circuitPath[i].y - circuitPath[i - 1].y
      len += Math.sqrt(dx * dx + dy * dy)
    }
    return len
  })()

  function getParticlePos(frac: number) {
    const target = ((frac % 1) + 1) % 1 * totalPathLen
    let acc = 0
    for (let i = 1; i < circuitPath.length; i++) {
      const dx = circuitPath[i].x - circuitPath[i - 1].x
      const dy = circuitPath[i].y - circuitPath[i - 1].y
      const segLen = Math.sqrt(dx * dx + dy * dy)
      if (acc + segLen >= target) {
        const t = (target - acc) / segLen
        return { x: circuitPath[i - 1].x + dx * t, y: circuitPath[i - 1].y + dy * t }
      }
      acc += segLen
    }
    return circuitPath[0]
  }

  const particleCount = 12
  const particleDir = emf > 0 ? 1 : (emf < 0 ? -1 : 0)
  const particles = Math.abs(emf) > 0.05 ? Array.from({ length: particleCount }, (_, i) => {
    const frac = (particleOffsetRef.current * particleDir + i / particleCount) % 1
    return getParticlePos(frac)
  }) : []

  // ── 灯泡亮度 ─────────────────────────────────────────────────────────
  const bulbBrightness = Math.min(1, Math.abs(current) * 2.5)
  const bulbGlowRadius = 12 + bulbBrightness * 18

  // ── 电流表指针偏转 ────────────────────────────────────────────────────
  const meterAngleDeg = Math.max(-60, Math.min(60, current * 18))
  const meterRad = (meterAngleDeg * Math.PI) / 180

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        ref={svgRef}
        width={W}
        height={H}
        className="bg-white rounded-lg shadow-inner select-none"
        style={{ fontFamily: CANVAS_STYLE.font.family }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          {/* 磁铁渐变 */}
          <linearGradient id="magnetGradN" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.magnet.northBase} />
            <stop offset="100%" stopColor={SCENE_COLORS.magnet.northMid} />
          </linearGradient>
          <linearGradient id="magnetGradS" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.magnet.southLight} />
            <stop offset="100%" stopColor={SCENE_COLORS.magnet.southDark} />
          </linearGradient>
          {/* 灯泡光晕 */}
          <radialGradient id="bulbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SCENE_COLORS.bulb.glassNormal} stopOpacity={bulbBrightness * 0.95} />
            <stop offset="60%" stopColor={SCENE_COLORS.bulb.glowMid} stopOpacity={bulbBrightness * 0.5} />
            <stop offset="100%" stopColor={SCENE_COLORS.bulb.glowOuter} stopOpacity="0" />
          </radialGradient>
          {/* 磁感线 clipPath（限制在左侧沙盒区域） */}
          <clipPath id="sandboxClip">
            <rect x="0" y="0" width={sandboxW} height={H} />
          </clipPath>
          {/* 图表区 clipPath（限制在右侧看板区域） */}
          <clipPath id="dashClip">
            <rect x={dashLeft} y="0" width={dashW} height={H} />
          </clipPath>
          {/* 箭头 marker */}
          <marker id="arrFlux" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.magneticField} opacity="0.5" />
          </marker>
          <marker id="arrFluxGold" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={SCENE_COLORS.coil.copperBase} />
          </marker>
        </defs>

        {/* ═══════════════════ 左侧分界线 ═══════════════════ */}
        <line
          x1={sandboxW} y1={0} x2={sandboxW} y2={H}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={CANVAS_STYLE.stroke.reference}
        />

        {/* ═══════════════════ 左侧：物理仿真沙盒 ═══════════════════ */}
        <g clipPath="url(#sandboxClip)">

          {/* ── 磁感线（背景淡紫色，穿透线圈部分变金色）── */}
          {Array.from({ length: 7 }, (_, i) => {
            const offset = (i - 3) * 22
            const isThrough = Math.abs(offset) < COIL_RY * 0.85
            const isHighlighted = isThrough && overlapRatioClamped > 0.15
            const lineColor = isHighlighted ? SCENE_COLORS.coil.copperBase : PHYSICS_COLORS.magneticField
            const lineOpacity = isHighlighted
              ? 0.35 + overlapRatioClamped * 0.55
              : 0.08 + overlapRatioClamped * 0.12

            // 从磁铁 S 极延伸到磁铁 N 极的曲线（外部磁感线）
            const mx = magnetCenterX
            const my = magnetCenterY

            return (
              <g key={i} opacity={lineOpacity}>
                {/* 穿过线圈的直线段（从磁铁右端穿越到线圈） */}
                {isHighlighted && (
                  <line
                    x1={magnetX + MAGNET_LEN}
                    y1={my + offset}
                    x2={Math.min(sandboxW - 5, COIL_X + COIL_RX + 10)}
                    y2={my + offset}
                    stroke={lineColor}
                    strokeWidth={isHighlighted ? CANVAS_STYLE.stroke.vectorSub : CANVAS_STYLE.stroke.reference}
                    markerEnd={isHighlighted ? "url(#arrFluxGold)" : "url(#arrFlux)"}
                  />
                )}
                {/* 磁铁左侧的外部磁感线（半椭圆弧） */}
                {!isHighlighted && (
                  <path
                    d={`M ${mx - MAGNET_LEN / 2} ${my + offset} C ${mx - MAGNET_LEN - Math.abs(offset) * 1.2} ${my + offset * 2}, ${mx - MAGNET_LEN - Math.abs(offset) * 1.2} ${my - offset * 2}, ${mx - MAGNET_LEN / 2} ${my - offset}`}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth={CANVAS_STYLE.stroke.reference}
                  />
                )}
              </g>
            )
          })}

          {/* ── 闭合回路导线（与 circuitPath 完全对齐）── */}
          {/* 上侧导线：线圈右端 → 右上拐角 */}
          <polyline
            points={`${COIL_X + COIL_RX},${coilY - 25} ${circuitRightX},${coilY - 25}`}
            fill="none"
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 右侧导线：右上拐角 → 灯泡上方 */}
          <polyline
            points={`${circuitRightX},${coilY - 25} ${circuitRightX},${bulbY - 18} ${bulbX},${bulbY - 18}`}
            fill="none"
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 灯泡竖直连线 */}
          <line
            x1={bulbX} y1={bulbY - 18}
            x2={bulbX} y2={bulbY + 18}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
          />
          {/* 右侧导线：灯泡下方 → 右下拐角 */}
          <polyline
            points={`${bulbX},${bulbY + 18} ${circuitRightX},${bulbY + 18} ${circuitRightX},${circuitBottomY}`}
            fill="none"
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 底边导线：右下 → 左下 */}
          <line
            x1={circuitRightX} y1={circuitBottomY}
            x2={circuitLeftX} y2={circuitBottomY}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
          />
          {/* 左侧导线：左下 → 电流表下方 */}
          <polyline
            points={`${circuitLeftX},${circuitBottomY} ${circuitLeftX},${meterY + 22} ${meterX},${meterY + 22}`}
            fill="none"
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 电流表竖直连线 */}
          <line
            x1={meterX} y1={meterY + 22}
            x2={meterX} y2={meterY - 22}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
          />
          {/* 左上侧导线：电流表上方 → 左上拐角 → 线圈左端 */}
          <polyline
            points={`${meterX},${meterY - 22} ${circuitLeftX},${meterY - 22} ${circuitLeftX},${coilY - 25} ${COIL_X - COIL_RX},${coilY - 25}`}
            fill="none"
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ── 线圈（椭圆形，多匝） ── */}
          {Array.from({ length: Math.min(N, 6) }, (_, i) => {
            const offsetX = (i - Math.min(N, 6) / 2 + 0.5) * 5
            return (
              <ellipse
                key={`coil-${i}`}
                cx={COIL_X + offsetX}
                cy={coilY}
                rx={COIL_RX}
                ry={COIL_RY}
                fill="none"
                stroke={PHYSICS_COLORS.electricCurrent}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
                opacity={0.6 + i * 0.05}
              />
            )
          })}

          {/* 线圈匝数标注 */}
          <text
            x={COIL_X}
            y={coilY + COIL_RY + 20}
            fontSize={CANVAS_STYLE.font.axisSize}
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            N = {N} 匝
          </text>

          {/* ── 磁通量柱状图（线圈中心） ── */}
          {(() => {
            const barMaxH = 50
            const barH = Math.min(barMaxH, Math.abs(phi) / maxPhi * barMaxH)
            const barColor = phi >= 0 ? SCENE_COLORS.coil.copperBase : PHYSICS_COLORS.magneticField
            return (
              <g>
                <rect
                  x={COIL_X - 18}
                  y={coilY - barH}
                  width={36}
                  height={barH}
                  fill={barColor}
                  opacity={0.7}
                  rx="3"
                />
                <text
                  x={COIL_X}
                  y={coilY + 10}
                  fontSize={CANVAS_STYLE.font.smallSize}
                  fill={SCENE_COLORS.coil.copperBase}
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  Φ={phi.toFixed(3)}Wb
                </text>
              </g>
            )
          })()}

          {/* ── 灯泡 ── */}
          {/* 光晕 */}
          {bulbBrightness > 0.05 && (
            <circle
              cx={bulbX}
              cy={bulbY}
              r={bulbGlowRadius}
              fill="url(#bulbGlow)"
            />
          )}
          {/* 灯泡外壳 */}
          <circle
            cx={bulbX}
            cy={bulbY}
            r={12}
            fill={bulbBrightness > 0.05 ? `rgba(255,${Math.round(200 + bulbBrightness * 55)},${Math.round(50 + bulbBrightness * 50)},${0.6 + bulbBrightness * 0.4})` : SCENE_COLORS.circuit.bulbGlassOff}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectThin}
          />
          {/* 灯丝 */}
          <path
            d={`M ${bulbX - 5} ${bulbY + 3} Q ${bulbX} ${bulbY - 5} ${bulbX + 5} ${bulbY + 3}`}
            fill="none"
            stroke={bulbBrightness > 0.05 ? SCENE_COLORS.bulb.glassBright : SCENE_COLORS.circuit.bulbGlassStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectThin}
          />
          <text
            x={bulbX + 18}
            y={bulbY + 4}
            fontSize={CANVAS_STYLE.font.smallSize}
            fill={PHYSICS_COLORS.labelText}
          >
            灯泡
          </text>

          {/* ── 电流表 ── */}
          {/* 外圆盘 */}
          <circle
            cx={meterX}
            cy={meterY}
            r={26}
            fill={PHYSICS_COLORS.objectFillNeutral}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
          />
          {/* 刻度弧线 */}
          <path
            d={`M ${meterX - 22} ${meterY + 5} A 22 22 0 0 1 ${meterX + 22} ${meterY + 5}`}
            fill="none"
            stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={CANVAS_STYLE.stroke.grid}
          />
          {/* 零刻度线（中心竖线） */}
          <line
            x1={meterX} y1={meterY - 20}
            x2={meterX} y2={meterY - 14}
            stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={CANVAS_STYLE.stroke.grid}
          />
          {/* 指针 */}
          <line
            x1={meterX}
            y1={meterY + 2}
            x2={meterX + Math.sin(meterRad) * 20}
            y2={meterY - Math.cos(meterRad) * 20 + 2}
            stroke={PHYSICS_COLORS.forceNet}
            strokeWidth={CANVAS_STYLE.stroke.vectorSub}
            strokeLinecap="round"
          />
          {/* 中心轴 */}
          <circle cx={meterX} cy={meterY + 2} r="3" fill={PHYSICS_COLORS.forceNet} />
          <text
            x={meterX}
            y={meterY + 22}
            fontSize={CANVAS_STYLE.font.smallSize}
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
          >
            电流表
          </text>
          <text
            x={meterX}
            y={meterY + 34}
            fontSize={9}
            fill={PHYSICS_COLORS.electricCurrent}
            textAnchor="middle"
            fontWeight="bold"
          >
            I={current.toFixed(3)}A
          </text>

          {/* ── 自由电子粒子 ── */}
          {particles.map((p, i) => (
            <circle
              key={`ep-${i}`}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={PHYSICS_COLORS.negativeCharge}
              opacity={0.75}
            />
          ))}

          {/* ── 条形磁铁 ── */}
          <g
            onPointerDown={handlePointerDown}
            style={{ cursor: isPlaying ? 'default' : (isDragging.current ? 'grabbing' : 'grab') }}
          >
            {/* N 极（左半） */}
            <rect
              x={magnetX}
              y={coilY - MAGNET_H / 2}
              width={MAGNET_LEN / 2}
              height={MAGNET_H}
              fill={PHYSICS_COLORS.magnetNorth}
              rx="4"
            />
            <text
              x={magnetX + MAGNET_LEN / 4}
              y={coilY + 5}
              fontSize={CANVAS_STYLE.font.bodySize}
              fill="white"
              textAnchor="middle"
              fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >
              N
            </text>
            {/* S 极（右半） */}
            <rect
              x={magnetX + MAGNET_LEN / 2}
              y={coilY - MAGNET_H / 2}
              width={MAGNET_LEN / 2}
              height={MAGNET_H}
              fill={PHYSICS_COLORS.magnetSouth}
              rx="4"
            />
            <text
              x={magnetX + MAGNET_LEN * 3 / 4}
              y={coilY + 5}
              fontSize={CANVAS_STYLE.font.bodySize}
              fill="white"
              textAnchor="middle"
              fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >
              S
            </text>
            {/* 拖拽提示（静止状态下显示） */}
            {!isPlaying && (
              <text
                x={magnetX + MAGNET_LEN / 2}
                y={coilY - MAGNET_H / 2 - 8}
                fontSize={CANVAS_STYLE.font.smallSize}
                fill={PHYSICS_COLORS.trackHistory}
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                ← 拖拽 →
              </text>
            )}
          </g>

          {/* ── 磁铁强度标注 ── */}
          <text
            x={magnetX + MAGNET_LEN / 2}
            y={coilY + MAGNET_H / 2 + 16}
            fontSize={CANVAS_STYLE.font.axisSize}
            fill={PHYSICS_COLORS.magneticField}
            textAnchor="middle"
            fontWeight="bold"
          >
            B = {B.toFixed(1)} T
          </text>

          {/* ── 悬浮自动控制面板 ── */}
          <g transform="translate(8, 8)">
            <rect width="158" height="116" rx="8" fill={PHYSICS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} opacity="0.97" />
            <text x="79" y="17" fontSize="11" fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
              自动实验控制
            </text>
            {/* 实验动作按钮 */}
            {(['push', 'pull', 'through'] as const).map((mode, i) => {
              const labels = { push: '→ 推入', pull: '← 拉出', through: '↔ 穿过' }
              const active = autoMode === mode
              return (
                <g key={mode} onClick={() => startAuto(mode)} style={{ cursor: 'pointer' }}>
                  <rect
                    x={4 + i * 50}
                    y={24}
                    width={46}
                    height={20}
                    rx="4"
                    fill={active ? PHYSICS_COLORS.magneticField : PHYSICS_COLORS.grid}
                  />
                  <text
                    x={27 + i * 50}
                    y={38}
                    fontSize={9}
                    fill={active ? 'white' : PHYSICS_COLORS.labelText}
                    textAnchor="middle"
                    fontWeight={active ? 'bold' : 'normal'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {labels[mode]}
                  </text>
                </g>
              )
            })}
            {/* 速度选择 */}
            <text x="6" y="60" fontSize={CANVAS_STYLE.font.smallSize} fill={PHYSICS_COLORS.trackHistory}>速度：</text>
            {(['slow', 'medium', 'fast'] as const).map((sp, i) => {
              const labels = { slow: '慢速', medium: '中速', fast: '快速' }
              const active = autoSpeed === sp
              return (
                <g key={sp} onClick={() => setAutoSpeed(sp)} style={{ cursor: 'pointer' }}>
                  <rect
                    x={4 + i * 50}
                    y={64}
                    width={46}
                    height={20}
                    rx="4"
                    fill={active ? PHYSICS_COLORS.electricCurrent : PHYSICS_COLORS.grid}
                  />
                  <text
                    x={27 + i * 50}
                    y={78}
                    fontSize={9}
                    fill={active ? 'white' : PHYSICS_COLORS.labelText}
                    textAnchor="middle"
                    fontWeight={active ? 'bold' : 'normal'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {labels[sp]}
                  </text>
                </g>
              )
            })}
            {/* 重置按钮 */}
            <g
              onClick={() => {
                setMagnetX(MAGNET_MIN_X)
                setAutoMode('none')
                setIsPlaying(false)
                historyRef.current = []
                dragHistoryRef.current = []
                prevPhiRef.current = calcFlux(MAGNET_MIN_X, B)
                prevTimeRef.current = 0
                dragPrevPhiRef.current = calcFlux(MAGNET_MIN_X, B)
                dragPrevTimeRef.current = 0
                dragEmfRef.current = 0
                particleOffsetRef.current = 0
              }}
              style={{ cursor: 'pointer' }}
            >
              <rect x="4" y="90" width="150" height="20" rx="4" fill={colors.accent[100]} />
              <text x="79" y="104" fontSize={CANVAS_STYLE.font.smallSize} fill={colors.accent[800]} textAnchor="middle" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                ↺ 重置磁铁位置
              </text>
            </g>
          </g>

          {/* ── 底部物理定律说明 ── */}
          <g transform={`translate(8, ${H - 38})`}>
            <rect width={sandboxW - 16} height="32" rx="5" fill={PHYSICS_COLORS.objectFill} opacity="0.85" stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid} />
            <text x="10" y="13" fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
              法拉第定律：EMF = −N · ΔΦ/Δt
            </text>
            <text x="10" y="27" fontSize={CANVAS_STYLE.font.smallSize} fill={PHYSICS_COLORS.axis}>
              磁通量变化越快(|ΔΦ/Δt|↑) 或 匝数 N 越大 → 感应电动势 |EMF| 越大
            </text>
          </g>

        </g>

        {/* ═══════════════════ 右侧：数据与图像看板 ═══════════════════ */}
        <g clipPath="url(#dashClip)">
          {/* ── Φ-t 图像 ── */}
          <g>
            {/* 坐标轴 */}
            <line x1={dashLeft} y1={yPhiMid} x2={dashRight} y2={yPhiMid}
              stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.axis} />
            <line x1={dashLeft} y1={yPhiMid - chartHalfH - 4} x2={dashLeft} y2={yPhiMid + chartHalfH + 4}
              stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.axis} />
            {/* 虚线上下限 */}
            <line x1={dashLeft} y1={yPhiMid - chartHalfH} x2={dashRight} y2={yPhiMid - chartHalfH}
              stroke={PHYSICS_COLORS.axis} strokeWidth="0.5" strokeDasharray="3,3" />
            <line x1={dashLeft} y1={yPhiMid + chartHalfH} x2={dashRight} y2={yPhiMid + chartHalfH}
              stroke={PHYSICS_COLORS.axis} strokeWidth="0.5" strokeDasharray="3,3" />
            {/* 标签 */}
            <text x={dashLeft} y={yPhiMid - chartHalfH - 8} fontSize={CANVAS_STYLE.font.axisSize}
              fill={PHYSICS_COLORS.magneticField} fontWeight="bold">Φ − t 图 (磁通量)</text>
            <text x={dashLeft - 6} y={yPhiMid - chartHalfH + 4} fontSize={9}
              fill={PHYSICS_COLORS.trackHistory} textAnchor="end">+Φmax</text>
            <text x={dashLeft - 6} y={yPhiMid + 4} fontSize={9}
              fill={PHYSICS_COLORS.trackHistory} textAnchor="end">0</text>
            <text x={dashLeft - 6} y={yPhiMid + chartHalfH + 4} fontSize={9}
              fill={PHYSICS_COLORS.trackHistory} textAnchor="end">−Φmax</text>
            {/* 波形 */}
            {history.length > 1 && (
              <path
                d={buildPhiPath(history)}
                fill="none"
                stroke={PHYSICS_COLORS.magneticField}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {/* 当前焦点球 */}
            {history.length > 0 && (
              <>
                <line x1={nowX} y1={yPhiMid - chartHalfH} x2={nowX} y2={yPhiMid + chartHalfH}
                  stroke={CHART_COLORS.reference} strokeWidth={CANVAS_STYLE.stroke.chartRef} strokeDasharray={DASH.trackHistory.join(' ')} />
                <circle
                  cx={nowX}
                  cy={Math.max(yPhiMid - chartHalfH, Math.min(yPhiMid + chartHalfH, toPhiY(phi)))}
                  r="4.5"
                  fill={PHYSICS_COLORS.magneticField}
                  stroke="white" strokeWidth={CANVAS_STYLE.stroke.objectThin}
                />
                <text
                  x={nowX + 6}
                  y={Math.max(yPhiMid - chartHalfH + 14, Math.min(yPhiMid + chartHalfH - 2, toPhiY(phi) - 6))}
                  fontSize={CANVAS_STYLE.font.formulaSize}
                  fill={PHYSICS_COLORS.magneticField}
                  fontWeight="bold"
                >
                  {phi.toExponential(2)} Wb
                </text>
              </>
            )}
          </g>

          {/* ── E-t 图像 ── */}
          <g>
            {/* 坐标轴 */}
            <line x1={dashLeft} y1={yEmfMid} x2={dashRight} y2={yEmfMid}
              stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.axis} />
            <line x1={dashLeft} y1={yEmfMid - chartHalfH - 4} x2={dashLeft} y2={yEmfMid + chartHalfH + 4}
              stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.axis} />
            {/* 虚线上下限 */}
            <line x1={dashLeft} y1={yEmfMid - chartHalfH} x2={dashRight} y2={yEmfMid - chartHalfH}
              stroke={PHYSICS_COLORS.axis} strokeWidth="0.5" strokeDasharray="3,3" />
            <line x1={dashLeft} y1={yEmfMid + chartHalfH} x2={dashRight} y2={yEmfMid + chartHalfH}
              stroke={PHYSICS_COLORS.axis} strokeWidth="0.5" strokeDasharray="3,3" />
            {/* 标签 */}
            <text x={dashLeft} y={yEmfMid - chartHalfH - 8} fontSize={CANVAS_STYLE.font.axisSize}
              fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold">E − t 图 (感应电动势)</text>
            <text x={dashLeft - 6} y={yEmfMid - chartHalfH + 4} fontSize={9}
              fill={PHYSICS_COLORS.trackHistory} textAnchor="end">+Emax</text>
            <text x={dashLeft - 6} y={yEmfMid + 4} fontSize={9}
              fill={PHYSICS_COLORS.trackHistory} textAnchor="end">0</text>
            <text x={dashLeft - 6} y={yEmfMid + chartHalfH + 4} fontSize={9}
              fill={PHYSICS_COLORS.trackHistory} textAnchor="end">−Emax</text>
            {/* 时间轴刻度 */}
            <g fontSize="9" fill={PHYSICS_COLORS.trackHistory}>
              {[0, 0.25, 0.5, 0.75, 1].map(frac => (
                <text
                  key={frac}
                  x={dashLeft + dashW * frac}
                  y={yEmfMid + chartHalfH + 14}
                  textAnchor="middle"
                >
                  {(tMin + (tMax - tMin) * frac).toFixed(1)}
                </text>
              ))}
            </g>
            <text x={dashRight + 4} y={yEmfMid + 4} fontSize="9" fill={PHYSICS_COLORS.trackHistory}>t/s</text>
            {/* 波形 */}
            {history.length > 1 && (
              <path
                d={buildEmfPath(history)}
                fill="none"
                stroke={PHYSICS_COLORS.electricCurrent}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {/* 当前焦点球 */}
            {history.length > 0 && (
              <>
                <line x1={nowX} y1={yEmfMid - chartHalfH} x2={nowX} y2={yEmfMid + chartHalfH}
                  stroke={CHART_COLORS.reference} strokeWidth={CANVAS_STYLE.stroke.chartRef} strokeDasharray={DASH.trackHistory.join(' ')} />
                <circle
                  cx={nowX}
                  cy={Math.max(yEmfMid - chartHalfH, Math.min(yEmfMid + chartHalfH, toEmfY(emf)))}
                  r="4.5"
                  fill={PHYSICS_COLORS.electricCurrent}
                  stroke="white" strokeWidth={CANVAS_STYLE.stroke.objectThin}
                />
                <text
                  x={nowX + 6}
                  y={Math.max(yEmfMid - chartHalfH + 14, Math.min(yEmfMid + chartHalfH - 2, toEmfY(emf) - 6))}
                  fontSize={CANVAS_STYLE.font.formulaSize}
                  fill={PHYSICS_COLORS.electricCurrent}
                  fontWeight="bold"
                >
                  {emf.toFixed(3)} V
                </text>
              </>
            )}
          </g>

          {/* ── 右侧图表区标题 ── */}
          <text
            x={dashLeft + dashW / 2}
            y={chartPadTop - 4}
            fontSize={CANVAS_STYLE.font.labelSize}
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            实时数据看板
          </text>
        </g>

      </svg>
    </div>
  )
}
