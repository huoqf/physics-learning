import { useRef, useCallback, useState, useMemo } from 'react'
import { useAnimationViewport } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { THERMO_COLORS, THERMAL_COLORS, PV_CHART_COLORS } from '@/theme/physics'
import { STROKE, FONT } from '@/theme/physics'
import {
  computeBoylePressure,
  computeGayLussacVolume,
  computeCharlesPressure,
  generateIsothermPoints,
  generateIsobarPoints,
  generateIsochorPoints,
} from '@/physics/gasLaws'
import { RelationChart } from '@/components/Chart'
import type { RelationMarker } from '@/components/Chart'

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

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })
  const { font } = canvasSize

  const mode = params.mode ?? 0
  const T = params.T ?? 300
  const V = params.V ?? 5e-3

  // 气缸内区域（像素）
  const scene = {
    x: vp.visibleX + vp.visibleW * LAYOUT.sceneLeftRatio,
    y: vp.visibleY + vp.visibleH * LAYOUT.sceneTopRatio,
    w: vp.visibleW * LAYOUT.sceneWidthRatio,
    h: vp.visibleH * LAYOUT.sceneHeightRatio,
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
          strokeWidth={STROKE.objectThin}
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

  // ─── 图表数据（按 mode 切换 P-V / V-T / P-T）─────────────────────────
  const chartConfig = useMemo(() => {
    if (mode === 0) {
      // 等温变化：P-V 图（反比例曲线）
      const data = generateIsothermPoints(T, N_DEFAULT, V_MIN, V_MAX, 50)
      return {
        title: 'P-V 图（等温线）',
        xLabel: 'V (m³)',
        yLabel: 'P (Pa)',
        xDomain: [V_MIN, V_MAX] as [number, number],
        yDomain: [0, data[0]?.p ?? 1e5] as [number, number],
        color: PV_CHART_COLORS.isotherm,
        points: data.map((d) => ({ x: d.v, y: d.p })),
        currentX: V,
        currentY: computeBoylePressure(V, T, N_DEFAULT),
      }
    } else if (mode === 1) {
      // 等压变化：V-T 图（正比例直线）
      const P_fixed = P
      const data = generateIsobarPoints(P_fixed, N_DEFAULT, T_MIN, T_MAX, 50)
      return {
        title: 'V-T 图（等压线）',
        xLabel: 'T (K)',
        yLabel: 'V (m³)',
        xDomain: [T_MIN, T_MAX] as [number, number],
        yDomain: [0, data[data.length - 1]?.v ?? 1e-2] as [number, number],
        color: PV_CHART_COLORS.isobar,
        points: data.map((d) => ({ x: d.t, y: d.v })),
        currentX: T,
        currentY: computeGayLussacVolume(T, P_fixed, N_DEFAULT),
      }
    } else {
      // 等容变化：P-T 图（正比例直线）
      const data = generateIsochorPoints(V, N_DEFAULT, T_MIN, T_MAX, 50)
      return {
        title: 'P-T 图（等容线）',
        xLabel: 'T (K)',
        yLabel: 'P (Pa)',
        xDomain: [T_MIN, T_MAX] as [number, number],
        yDomain: [0, data[data.length - 1]?.p ?? 1e5] as [number, number],
        color: PV_CHART_COLORS.isochor,
        points: data.map((d) => ({ x: d.t, y: d.p })),
        currentX: T,
        currentY: computeCharlesPressure(T, V, N_DEFAULT),
      }
    }
  }, [mode, T, V, P])

  // 当前状态点
  const markers: RelationMarker[] = useMemo(() => [{
    axis: 'point',
    x: chartConfig.currentX,
    y: chartConfig.currentY,
    color: PV_CHART_COLORS.statePoint,
  }], [chartConfig.currentX, chartConfig.currentY])

  return (
    <div ref={containerRef} className="w-full h-full flex">
      {/* 左侧：SVG 气缸场景 */}
      <div
        className="shrink-0 bg-white rounded-lg shadow-inner"
        style={{ width: `${(LAYOUT.sceneWidthRatio + LAYOUT.sceneLeftRatio) * 100}%` }}
      >
        <svg
          width={canvasSize.width}
          height={canvasSize.height}
          className="block"
        >
          {renderCylinder()}
        </svg>
      </div>

      {/* 右侧：RelationChart（HTML 层，无 foreignObject） */}
      <div className="flex-1 min-w-0 p-1">
        <RelationChart
          points={chartConfig.points}
          xLabel={chartConfig.xLabel}
          yLabel={chartConfig.yLabel}
          title={chartConfig.title}
          xDomain={chartConfig.xDomain}
          yDomain={chartConfig.yDomain}
          markers={markers}
          color={chartConfig.color}
          strokeWidth={2}
          showGrid
        />
      </div>
    </div>
  )
}
