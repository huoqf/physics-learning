import { useRef, useCallback, useState } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { THERMO_COLORS, THERMAL_COLORS, PV_CHART_COLORS, CHART_COLORS } from '@/theme/physics'
import { STROKE, FONT } from '@/theme/physics/canvasStyle'
import {
  computeBoylePressure,
  computeGayLussacVolume,
  computeCharlesPressure,
  generateIsothermPoints,
  generateIsobarPoints,
  generateIsochorPoints,
} from '@/physics/gasLaws'

// ─── 物理常量 ─────────────────────────────────────────────────────────────
const N_DEFAULT = 1
const T_MIN = 200
const T_MAX = 600
const V_MIN = 1e-4
const V_MAX = 1e-2
const PARTICLE_COUNT = 24
const BASE_SPEED = 2.5

// ─── 布局比例常量 ──────────────────────────────────────────────────────────
const LAYOUT = {
  sceneLeftRatio: 0.03,
  sceneTopRatio: 0.08,
  sceneWidthRatio: 0.46,
  sceneHeightRatio: 0.84,
  chartLeftRatio: 0.54,
  chartTopRatio: 0.06,
  chartWidthRatio: 0.44,
  chartHeightRatio: 0.88,
} as const

// ─── 粒子类型 ──────────────────────────────────────────────────────────────
interface GasParticle {
  x: number
  y: number
  vx: number
  vy: number
}

function initParticles(count: number): GasParticle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
  }))
}

export default function GasLawsAnimation() {
  const { params, isPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
    })),
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.wide)
  const { width, height, font } = canvasSize

  const mode = params.mode ?? 0
  const T = params.T ?? 300
  const V = params.V ?? 5e-3

  // 气缸内区域（像素）
  const scene = {
    x: width * LAYOUT.sceneLeftRatio,
    y: height * LAYOUT.sceneTopRatio,
    w: width * LAYOUT.sceneWidthRatio,
    h: height * LAYOUT.sceneHeightRatio,
  }

  // 气缸壁参数
  const cylinderMargin = scene.w * 0.15
  const cylinderLeft = scene.x + cylinderMargin
  const cylinderRight = scene.x + scene.w - cylinderMargin
  const cylinderWidth = cylinderRight - cylinderLeft
  const cylinderTop = scene.y + scene.h * 0.08
  const cylinderBottom = scene.y + scene.h * 0.88
  const cylinderHeight = cylinderBottom - cylinderTop

  // 活塞位置：V 越大，活塞越低（气体空间越大）
  const volumeRatio = (V - V_MIN) / (V_MAX - V_MIN)
  const pistonY = cylinderBottom - volumeRatio * cylinderHeight * 0.85

  // 粒子状态
  const particlesRef = useRef<GasParticle[]>(initParticles(PARTICLE_COUNT))
  const [, setTick] = useState(0)

  // 动画帧回调：更新粒子
  const handleFrame = useCallback(
    (deltaMs: number) => {
      const dt = deltaMs / 1000
      if (dt <= 0 || dt > 0.1) return

      const speedScale = Math.sqrt(T / 300)
      const topBound = (pistonY - cylinderTop) / cylinderHeight

      for (const p of particlesRef.current) {
        p.x += p.vx * BASE_SPEED * speedScale * dt
        p.y += p.vy * BASE_SPEED * speedScale * dt

        // 墙壁反弹
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx) }
        if (p.x > 1) { p.x = 1; p.vx = -Math.abs(p.vx) }
        // 顶部（气缸顶）反弹
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy) }
        // 活塞碰撞
        if (p.y > topBound) { p.y = topBound; p.vy = -Math.abs(p.vy) }

        // 随机扰动
        p.vx += (Math.random() - 0.5) * 0.3 * dt
        p.vy += (Math.random() - 0.5) * 0.3 * dt

        // 速度限制
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        const maxSpeed = BASE_SPEED * speedScale * 1.5
        if (speed > maxSpeed) {
          p.vx = (p.vx / speed) * maxSpeed
          p.vy = (p.vy / speed) * maxSpeed
        }
      }

      setTick((t) => t + 1)
    },
    [T, pistonY, cylinderTop, cylinderHeight],
  )

  useAnimationFrame(handleFrame, { playing: isPlaying })

  // 计算当前状态
  const P = mode === 0
    ? computeBoylePressure(V, T, N_DEFAULT)
    : mode === 1
      ? (params.P ?? computeBoylePressure(V, T, N_DEFAULT))
      : computeCharlesPressure(T, V, N_DEFAULT)

  const displayP = mode === 1
    ? P
    : mode === 0
      ? computeBoylePressure(V, T, N_DEFAULT)
      : computeCharlesPressure(T, V, N_DEFAULT)

  // ─── 气缸渲染 ──────────────────────────────────────────────────────────
  const renderCylinder = () => {
    const wallStroke = STROKE.objectLine

    // 温度颜色插值（冷蓝 → 热红）
    const tNorm = (T - T_MIN) / (T_MAX - T_MIN)
    const r = Math.round(59 + tNorm * (239 - 59))
    const g = Math.round(130 + tNorm * (68 - 130))
    const b = Math.round(246 + tNorm * (68 - 246))
    const tempColor = `rgb(${r},${g},${b})`

    // 活塞上方的气体空间
    const gasHeight = pistonY - cylinderTop

    return (
      <g>
        {/* 气缸壁 */}
        <rect
          x={cylinderLeft}
          y={cylinderTop}
          width={cylinderWidth}
          height={cylinderHeight}
          fill={THERMAL_COLORS.gasChamberFill}
          stroke={THERMAL_COLORS.gasChamberSt}
          strokeWidth={wallStroke}
          rx={4}
        />

        {/* 气体区域（温度渐变背景） */}
        <defs>
          <linearGradient id="gas-temp-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={tempColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={tempColor} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <rect
          x={cylinderLeft + 1}
          y={cylinderTop + 1}
          width={cylinderWidth - 2}
          height={Math.max(0, gasHeight - 1)}
          fill="url(#gas-temp-grad)"
        />

        {/* 粒子 */}
        {particlesRef.current.map((p, i) => {
          const px = cylinderLeft + p.x * cylinderWidth
          const py = cylinderTop + p.y * gasHeight
          if (py > pistonY || py < cylinderTop) return null
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r={3}
              fill={THERMAL_COLORS.gasChamberSt}
              opacity={0.8}
            />
          )
        })}

        {/* 活塞 */}
        <rect
          x={cylinderLeft - 2}
          y={pistonY}
          width={cylinderWidth + 4}
          height={12}
          fill={THERMO_COLORS.volume}
          stroke={THERMO_COLORS.volume}
          strokeWidth={1.5}
          rx={2}
          opacity={0.9}
        />

        {/* 活塞上方的压力箭头 */}
        {displayP > 0 && (() => {
          const arrowCount = Math.min(5, Math.max(1, Math.floor(displayP / 50000)))
          const arrows: React.JSX.Element[] = []
          for (let i = 0; i < arrowCount; i++) {
            const ax = cylinderLeft + cylinderWidth * (0.25 + (0.5 * i) / Math.max(1, arrowCount - 1))
            const ay = pistonY - 15
            arrows.push(
              <g key={`arrow-${i}`}>
                <line
                  x1={ax}
                  y1={ay}
                  x2={ax}
                  y2={ay - 12}
                  stroke={THERMO_COLORS.pressure}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <polygon
                  points={`${ax},${ay - 16} ${ax - 4},${ay - 10} ${ax + 4},${ay - 10}`}
                  fill={THERMO_COLORS.pressure}
                />
              </g>,
            )
          }
          return <g>{arrows}</g>
        })()}

        {/* 温度标注 */}
        <text
          x={cylinderLeft + cylinderWidth + 8}
          y={cylinderTop + 20}
          fontSize={font(11)}
          fill={THERMO_COLORS.temperature}
          fontFamily={FONT.family}
        >
          T = {T} K
        </text>

        {/* 体积标注 */}
        <text
          x={cylinderLeft + 4}
          y={cylinderBottom + 16}
          fontSize={font(10)}
          fill={THERMO_COLORS.volume}
          fontFamily={FONT.family}
        >
          V = {(V * 1000).toFixed(1)} L
        </text>

        {/* 压强标注 */}
        <text
          x={cylinderLeft + 4}
          y={cylinderTop - 6}
          fontSize={font(10)}
          fill={THERMO_COLORS.pressure}
          fontFamily={FONT.family}
        >
          P = {displayP > 1000 ? (displayP / 1000).toFixed(1) + ' kPa' : displayP.toFixed(0) + ' Pa'}
        </text>

        {/* 加热丝（等容/等压模式） */}
        {mode !== 0 && (
          <g>
            <rect
              x={cylinderLeft + cylinderWidth * 0.2}
              y={cylinderBottom - 6}
              width={cylinderWidth * 0.6}
              height={4}
              fill={THERMAL_COLORS.heaterOn}
              rx={2}
              opacity={0.8}
            />
            <text
              x={cylinderLeft + cylinderWidth * 0.5}
              y={cylinderBottom + 14}
              fontSize={font(9)}
              fill={THERMAL_COLORS.heaterOn}
              textAnchor="middle"
              fontFamily={FONT.family}
            >
              加热丝
            </text>
          </g>
        )}
      </g>
    )
  }

  // ─── 图表渲染 ──────────────────────────────────────────────────────────
  const renderChart = () => {
    const chartX = width * LAYOUT.chartLeftRatio
    const chartY = height * LAYOUT.chartTopRatio
    const chartW = width * LAYOUT.chartWidthRatio
    const chartH = height * LAYOUT.chartHeightRatio

    const margin = { left: 48, right: 16, top: 24, bottom: 28 }
    const plotX = chartX + margin.left
    const plotY = chartY + margin.top
    const plotW = chartW - margin.left - margin.right
    const plotH = chartH - margin.top - margin.bottom

    let xLabel = ''
    let yLabel = ''
    let points: { x: number; y: number }[] = []
    let currentX = 0
    let currentY = 0
    let xMin = 0
    let xMax = 1
    let yMin = 0
    let yMax = 1
    let curveColor: string = PV_CHART_COLORS.isotherm

    if (mode === 0) {
      // 等温：P-V 图
      xLabel = 'V (m³)'
      yLabel = 'P (Pa)'
      curveColor = PV_CHART_COLORS.isotherm
      const data = generateIsothermPoints(T, N_DEFAULT, V_MIN, V_MAX, 50)
      xMin = V_MIN
      xMax = V_MAX
      yMin = 0
      yMax = data[0]?.p ?? 1e5
      points = data.map((d) => ({ x: d.v, y: d.p }))
      currentX = V
      currentY = computeBoylePressure(V, T, N_DEFAULT)
    } else if (mode === 1) {
      // 等压：V-T 图
      xLabel = 'T (K)'
      yLabel = 'V (m³)'
      curveColor = PV_CHART_COLORS.isobar
      const P_fixed = P
      const data = generateIsobarPoints(P_fixed, N_DEFAULT, T_MIN, T_MAX, 50)
      xMin = T_MIN
      xMax = T_MAX
      yMin = 0
      yMax = data[data.length - 1]?.v ?? 1e-2
      points = data.map((d) => ({ x: d.t, y: d.v }))
      currentX = T
      currentY = computeGayLussacVolume(T, P_fixed, N_DEFAULT)
    } else {
      // 等容：P-T 图
      xLabel = 'T (K)'
      yLabel = 'P (Pa)'
      curveColor = PV_CHART_COLORS.isochor
      const data = generateIsochorPoints(V, N_DEFAULT, T_MIN, T_MAX, 50)
      xMin = T_MIN
      xMax = T_MAX
      yMin = 0
      yMax = data[data.length - 1]?.p ?? 1e5
      points = data.map((d) => ({ x: d.t, y: d.p }))
      currentX = T
      currentY = computeCharlesPressure(T, V, N_DEFAULT)
    }

    const toPlotX = (v: number) => plotX + ((v - xMin) / (xMax - xMin || 1)) * plotW
    const toPlotY = (v: number) => plotY + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH

    // 曲线路径
    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toPlotX(p.x).toFixed(1)},${toPlotY(p.y).toFixed(1)}`)
      .join(' ')

    const cx = toPlotX(currentX)
    const cy = toPlotY(currentY)

    return (
      <g>
        {/* 图表标题 */}
        <text
          x={plotX}
          y={chartY + 14}
          fontSize={font(12)}
          fontWeight="bold"
          fill={CHART_COLORS.titleText}
          fontFamily={FONT.family}
        >
          {mode === 0 ? 'P-V 图（等温线）' : mode === 1 ? 'V-T 图（等压线）' : 'P-T 图（等容线）'}
        </text>

        {/* 网格线 */}
        {Array.from({ length: 5 }).map((_, i) => {
          const gy = plotY + (plotH * i) / 4
          return (
            <line
              key={`gy-${i}`}
              x1={plotX}
              y1={gy}
              x2={plotX + plotW}
              y2={gy}
              stroke={CHART_COLORS.gridLine}
              strokeWidth={0.5}
            />
          )
        })}
        {Array.from({ length: 6 }).map((_, i) => {
          const gx = plotX + (plotW * i) / 5
          return (
            <line
              key={`gx-${i}`}
              x1={gx}
              y1={plotY}
              x2={gx}
              y2={plotY + plotH}
              stroke={CHART_COLORS.gridLine}
              strokeWidth={0.5}
            />
          )
        })}

        {/* 坐标轴 */}
        <line
          x1={plotX}
          y1={plotY + plotH}
          x2={plotX + plotW}
          y2={plotY + plotH}
          stroke={CHART_COLORS.axisLine}
          strokeWidth={1}
        />
        <line
          x1={plotX}
          y1={plotY}
          x2={plotX}
          y2={plotY + plotH}
          stroke={CHART_COLORS.axisLine}
          strokeWidth={1}
        />

        {/* 曲线 */}
        {points.length >= 2 && (
          <path
            d={pathD}
            fill="none"
            stroke={curveColor}
            strokeWidth={STROKE.chartMain}
          />
        )}

        {/* 当前状态点 */}
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill={PV_CHART_COLORS.statePointFill}
          stroke={PV_CHART_COLORS.statePoint}
          strokeWidth={1.5}
        />

        {/* X 轴刻度 */}
        {Array.from({ length: 6 }, (_, i) => {
          const val = xMin + ((xMax - xMin) * i) / 5
          const x = toPlotX(val)
          return (
            <g key={`xt-${i}`}>
              <line x1={x} y1={plotY + plotH} x2={x} y2={plotY + plotH + 3}               stroke={CHART_COLORS.tickMark} strokeWidth={0.8} />
              <text x={x} y={plotY + plotH + FONT.small + 4} fontSize={font(9)} fill={CHART_COLORS.tickLabel} textAnchor="middle" fontFamily={FONT.family}>
                {mode === 0 ? val.toExponential(1) : val.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* Y 轴刻度 */}
        {[yMin, (yMin + yMax) / 2, yMax].map((val, i) => {
          const y = toPlotY(val)
          return (
            <g key={`yt-${i}`}>
              <line x1={plotX - 3} y1={y} x2={plotX} y2={y}               stroke={CHART_COLORS.tickMark} strokeWidth={0.8} />
              <text x={plotX - 5} y={y + 3} fontSize={font(9)} fill={CHART_COLORS.tickLabel} textAnchor="end" fontFamily={FONT.family}>
                {val > 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(mode === 0 ? 1 : 3)}
              </text>
            </g>
          )
        })}

        {/* 轴标签 */}
        <text
          x={plotX + plotW - 4}
          y={plotY + plotH + FONT.small + 4}
          fontSize={font(10)}
          fill={CHART_COLORS.labelText}
          textAnchor="end"
          fontWeight="bold"
          fontFamily={FONT.family}
        >
          {xLabel}
        </text>
        <text
          x={plotX - 4}
          y={plotY - 6}
          fontSize={font(10)}
          fill={CHART_COLORS.labelText}
          textAnchor="end"
          fontWeight="bold"
          fontFamily={FONT.family}
        >
          {yLabel}
        </text>
      </g>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {renderCylinder()}
        {renderChart()}
      </svg>
    </div>
  )
}
