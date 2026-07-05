import { useRef, useCallback, useState, useMemo } from 'react'
import { useCanvasSize, useViewport } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { THERMO_COLORS, THERMAL_COLORS, PV_CHART_COLORS, CHART_COLORS } from '@/theme/physics'
import { STROKE, FONT } from '@/theme/physics'
import { solveClapeyron, generateIsothermFamily } from '@/physics/clapeyron'
import { RelationChart } from '@/components/Chart'
import type { RelationDataSeries, RelationMarker } from '@/components/Chart'

const CLAPEYRON_DESIGN = { width: 700, height: 400 } as const

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

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const { font } = canvasSize

  const vp = useViewport(canvasSize, {
    designWidth: CLAPEYRON_DESIGN.width,
    designHeight: CLAPEYRON_DESIGN.height,
  })

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
  // ── P-V 图：迁移到 RelationChart ──
  // 图表区位置（保留原 LAYOUT 比例，外层 <foreignObject> 定位）
  const chartX = vp.visibleX + vp.visibleW * LAYOUT.chartLeftRatio
  const chartY = vp.visibleY + vp.visibleH * LAYOUT.chartTopRatio
  const chartW = vp.visibleW * LAYOUT.chartWidthRatio
  const chartH = vp.visibleH * LAYOUT.chartHeightRatio

  // Y 轴上界：取 (V_MIN, T_MAX) 的极端 P 值，让所有等温线族都在视图内
  const pMaxAll = useMemo(
    () => solveClapeyron({ key: 'V', value: V_MIN }, { key: 'T', value: T_MAX }, 'P', N_DEFAULT),
    [],
  )

  // 主曲线：当前温度等温线
  const currentIsothermXY = useMemo(
    () => currentIsothermPoints.map((p) => ({ x: p.v, y: p.p })),
    [currentIsothermPoints],
  )

  // 附加曲线：等温线族（仅进阶模式 mode=1）
  const isothermSeries: RelationDataSeries[] = useMemo(() => {
    if (mode !== 1) return []
    return isothermFamily.map((iso, idx) => ({
      points: iso.points.map((p) => ({ x: p.v, y: p.p })),
      label: `${iso.T}K`,
      color: PV_CHART_COLORS.isothermsGroup[idx % PV_CHART_COLORS.isothermsGroup.length],
      strokeWidth: 1,
    }))
  }, [mode, isothermFamily])

  // markers：当前状态点 + PV/T 比值标注（用 horizontal label 放右上角）
  const markers: RelationMarker[] = useMemo(() => [
    {
      axis: 'point',
      x: V,
      y: P,
      color: PV_CHART_COLORS.statePoint,
    },
  ], [V, P])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
      >
        {renderCylinder()}

        {/* P-V 图：通过 foreignObject 嵌入 RelationChart */}
        <foreignObject x={chartX} y={chartY} width={chartW} height={chartH}>
          <div style={{ width: '100%', height: '100%' }}>
            <RelationChart
              points={currentIsothermXY}
              additionalSeries={isothermSeries}
              xLabel="V (m³)"
              yLabel="P (Pa)"
              title="P-V 图（等温线）"
              xDomain={[V_MIN, V_MAX]}
              yDomain={[0, pMaxAll]}
              markers={markers}
              color={PV_CHART_COLORS.isotherm}
              strokeWidth={2}
              showGrid
            />
          </div>
        </foreignObject>

        {/* PV/T 比值标注（保留为外层 SVG 文字，避开 RelationChart 标题区） */}
        <text
          x={chartX + chartW - 8}
          y={chartY + 16}
          fontSize={font(9)}
          fill={CHART_COLORS.labelText}
          textAnchor="end"
          fontFamily={FONT.family}
        >
          PV/T = {(P * V / T).toFixed(2)} J/K
        </text>
      </svg>
    </div>
  )
}
