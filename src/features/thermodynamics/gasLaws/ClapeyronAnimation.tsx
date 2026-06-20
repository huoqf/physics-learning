import { useRef, useCallback, useState, useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { THERMO_COLORS, THERMAL_COLORS, PV_CHART_COLORS, CHART_COLORS } from '@/theme/physics'
import { STROKE, FONT } from '@/theme/physics/canvasStyle'
import { solveClapeyron, generateIsothermFamily } from '@/physics/clapeyron'

// ─── 物理常量 ─────────────────────────────────────────────────────────────
const N_DEFAULT = 1
const T_MIN = 200
const T_MAX = 600
const V_MIN = 1e-4
const V_MAX = 1e-2
const PARTICLE_COUNT = 24
const BASE_SPEED = 2.5

// 等温线族温度梯度（用于进阶模式背景）
const ISOTHERM_FAMILY_TEMPS = [250, 300, 350, 400, 450, 500]

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

export default function ClapeyronAnimation() {
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

        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx) }
        if (p.x > 1) { p.x = 1; p.vx = -Math.abs(p.vx) }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy) }
        if (p.y > topBound) { p.y = topBound; p.vy = -Math.abs(p.vy) }

        p.vx += (Math.random() - 0.5) * 0.3 * dt
        p.vy += (Math.random() - 0.5) * 0.3 * dt

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

  // 计算当前压强（克拉珀龙方程约束）
  const P = solveClapeyron({ key: 'V', value: V }, { key: 'T', value: T }, 'P', N_DEFAULT)

  // 进阶模式等温线族数据（memo 化避免每帧重算）
  const isothermFamily = useMemo(
    () => generateIsothermFamily(ISOTHERM_FAMILY_TEMPS, N_DEFAULT, V_MIN, V_MAX, 50),
    [],
  )

  // 当前温度等温线数据（memo 化避免每帧重算）
  const currentIsothermPoints = useMemo(() => {
    const pts: { v: number; p: number }[] = []
    for (let i = 0; i <= 50; i++) {
      const v = V_MIN + ((V_MAX - V_MIN) * i) / 50
      const p = solveClapeyron({ key: 'V', value: v }, { key: 'T', value: T }, 'P', N_DEFAULT)
      pts.push({ v, p })
    }
    return pts
  }, [T])

  // ─── 气缸渲染 ──────────────────────────────────────────────────────────
  const renderCylinder = () => {
    const wallStroke = STROKE.objectLine

    // 温度颜色插值（冷蓝 → 热红）
    const tNorm = (T - T_MIN) / (T_MAX - T_MIN)
    const r = Math.round(59 + tNorm * (239 - 59))
    const g = Math.round(130 + tNorm * (68 - 130))
    const b = Math.round(246 + tNorm * (68 - 246))
    const tempColor = `rgb(${r},${g},${b})`

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
          <linearGradient id="clapeyron-gas-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={tempColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={tempColor} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <rect
          x={cylinderLeft + 1}
          y={cylinderTop + 1}
          width={cylinderWidth - 2}
          height={Math.max(0, gasHeight - 1)}
          fill="url(#clapeyron-gas-grad)"
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
          strokeWidth={STROKE.objectThin}
          rx={2}
          opacity={0.9}
        />

        {/* 压力箭头 */}
        {P > 0 && (() => {
          const arrowCount = Math.min(5, Math.max(1, Math.floor(P / 50000)))
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
                  strokeWidth={STROKE.objectLine}
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
          P = {P > 1000 ? (P / 1000).toFixed(1) + ' kPa' : P.toFixed(0) + ' Pa'}
        </text>
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

    const xLabel = 'V (m³)'
    const yLabel = 'P (Pa)'
    const xMin = V_MIN
    const xMax = V_MAX
    const yMin = 0
    const yMax = solveClapeyron({ key: 'V', value: V_MIN }, { key: 'T', value: T_MAX }, 'P', N_DEFAULT)

    const toPlotX = (v: number) => plotX + ((v - xMin) / (xMax - xMin || 1)) * plotW
    const toPlotY = (v: number) => plotY + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH

    // 当前温度等温线路径
    const currentPathD = currentIsothermPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toPlotX(p.v).toFixed(1)},${toPlotY(p.p).toFixed(1)}`)
      .join(' ')

    const cx = toPlotX(V)
    const cy = toPlotY(P)

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
          P-V 图（等温线）
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
          strokeWidth={STROKE.axis}
        />
        <line
          x1={plotX}
          y1={plotY}
          x2={plotX}
          y2={plotY + plotH}
          stroke={CHART_COLORS.axisLine}
          strokeWidth={STROKE.axis}
        />

        {/* 进阶模式：等温线族背景 */}
        {mode === 1 && isothermFamily.map((iso, idx) => {
          const pathD = iso.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toPlotX(p.v).toFixed(1)},${toPlotY(p.p).toFixed(1)}`)
            .join(' ')
          return (
            <g key={`iso-bg-${idx}`}>
              <path
                d={pathD}
                fill="none"
                stroke={PV_CHART_COLORS.isothermsGroup[idx % PV_CHART_COLORS.isothermsGroup.length]}
                strokeWidth={STROKE.chartRef}
                opacity={0.4}
              />
              <text
                x={toPlotX(iso.points[iso.points.length - 1]?.v ?? V_MAX) + 4}
                y={toPlotY(iso.points[iso.points.length - 1]?.p ?? 0) - 4}
                fontSize={font(8)}
                fill={CHART_COLORS.tickLabel}
                fontFamily={FONT.family}
                opacity={0.6}
              >
                {iso.T}K
              </text>
            </g>
          )
        })}

        {/* 当前温度等温线 */}
        {currentIsothermPoints.length >= 2 && (
          <path
            d={currentPathD}
            fill="none"
            stroke={PV_CHART_COLORS.isotherm}
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
          strokeWidth={STROKE.chartSub}
        />

        {/* PV/T 比值标注 */}
        <text
          x={plotX + plotW - 4}
          y={plotY + 14}
          fontSize={font(9)}
          fill={CHART_COLORS.labelText}
          textAnchor="end"
          fontFamily={FONT.family}
        >
          PV/T = {(P * V / T).toFixed(2)} J/K
        </text>

        {/* X 轴刻度 */}
        {Array.from({ length: 6 }, (_, i) => {
          const val = xMin + ((xMax - xMin) * i) / 5
          const x = toPlotX(val)
          return (
            <g key={`xt-${i}`}>
              <line x1={x} y1={plotY + plotH} x2={x} y2={plotY + plotH + 3} stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={x} y={plotY + plotH + FONT.small + 4} fontSize={font(9)} fill={CHART_COLORS.tickLabel} textAnchor="middle" fontFamily={FONT.family}>
                {val.toExponential(1)}
              </text>
            </g>
          )
        })}

        {/* Y 轴刻度 */}
        {[yMin, (yMin + yMax) / 2, yMax].map((val, i) => {
          const y = toPlotY(val)
          return (
            <g key={`yt-${i}`}>
              <line x1={plotX - 3} y1={y} x2={plotX} y2={y} stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={plotX - 5} y={y + 3} fontSize={font(9)} fill={CHART_COLORS.tickLabel} textAnchor="end" fontFamily={FONT.family}>
                {val > 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(1)}
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
