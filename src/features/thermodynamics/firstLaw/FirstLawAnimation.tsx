import { useRef, useCallback, useState } from 'react'
import { useCanvasSize, useViewport } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { THERMO_COLORS, THERMAL_COLORS } from '@/theme/physics'
import { FIRST_LAW_COLORS } from '@/theme/physics'
import { STROKE, FONT, CANVAS_COLORS } from '@/theme/physics'
import { SVGSingleBar } from '@/components/Physics/SVGSingleBar'
import { calculateInternalEnergy } from '@/physics/thermodynamics'
import { deltaUtoDeltaT, temperatureToSpeedScale, internalEnergyToColor } from '@/physics/firstLaw'

const FIRST_LAW_DESIGN = { width: 700, height: 400 } as const

// ─── 物理常量 ─────────────────────────────────────────────────────────────
const N_DEFAULT = 1
const CV_DEFAULT = 12.47
const T_MIN = 200
const T_MAX = 600
const PARTICLE_COUNT = 24
const BASE_SPEED = 2.5
const MAX_ABS_DU = 500

// ─── 布局比例常量 ──────────────────────────────────────────────────────────
const LAYOUT = {
  chartLeftRatio:   0.05,
  chartTopRatio:    0.06,
  chartWidthRatio:  0.90,
  chartHeightRatio: 0.34,
  sceneLeftRatio:   0.03,
  sceneTopRatio:    0.44,
  sceneWidthRatio:  0.94,
  sceneHeightRatio: 0.52,
} as const

// ─── 粒子类型 ──────────────────────────────────────────────────────────────
interface GasParticle {
  x: number
  y: number
  vx: number
  vy: number
}

interface HeatParticle {
  x: number
  y: number
  vy: number
  life: number
  maxLife: number
}

function initParticles(count: number): GasParticle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
  }))
}

function initHeatParticle(): HeatParticle {
  return {
    x: 0.2 + Math.random() * 0.6,
    y: 1.0,
    vy: -(0.3 + Math.random() * 0.4),
    life: 1.0,
    maxLife: 2.0 + Math.random() * 1.0,
  }
}

export default function FirstLawAnimation() {
  const { params, isPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
    })),
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const { font } = canvasSize

  const vp = useViewport(canvasSize, {
    designWidth: FIRST_LAW_DESIGN.width,
    designHeight: FIRST_LAW_DESIGN.height,
  })

  const W_input = params.W ?? 0
  const Q_raw = params.Q ?? 0
  const adiabatic = params.adiabatic ?? 0
  const T_input = params.T ?? 300

  const effectiveQ = adiabatic ? 0 : Q_raw
  const { deltaU } = calculateInternalEnergy(effectiveQ, W_input)
  const deltaT = deltaUtoDeltaT(deltaU, N_DEFAULT, CV_DEFAULT)
  const currentT = Math.max(T_MIN, Math.min(T_MAX, T_input + deltaT))
  const speedScale = temperatureToSpeedScale(currentT, T_input)

  // ─── 场景区域 ──────────────────────────────────────────────────────────
  const scene = {
    x: vp.visibleX + vp.visibleW * LAYOUT.sceneLeftRatio,
    y: vp.visibleY + vp.visibleH * LAYOUT.sceneTopRatio,
    w: vp.visibleW * LAYOUT.sceneWidthRatio,
    h: vp.visibleH * LAYOUT.sceneHeightRatio,
  }

  const cylinderMargin = scene.w * 0.15
  const cylinderLeft = scene.x + cylinderMargin
  const cylinderRight = scene.x + scene.w - cylinderMargin
  const cylinderWidth = cylinderRight - cylinderLeft
  const cylinderTop = scene.y + scene.h * 0.08
  const cylinderBottom = scene.y + scene.h * 0.88
  const cylinderHeight = cylinderBottom - cylinderTop

  // 活塞位置：W > 0 外界做功 → 活塞下压 → 气体空间变小
  const workOffset = (W_input / MAX_ABS_DU) * cylinderHeight * 0.3
  const pistonY = cylinderBottom - cylinderHeight * 0.45 + workOffset

  // ─── 粒子状态 ──────────────────────────────────────────────────────────
  const particlesRef = useRef<GasParticle[]>(initParticles(PARTICLE_COUNT))
  const heatParticlesRef = useRef<HeatParticle[]>([])
  const [, setTick] = useState(0)

  // ─── 动画帧回调 ────────────────────────────────────────────────────────
  const handleFrame = useCallback(
    (deltaMs: number) => {
      const dt = deltaMs / 1000
      if (dt <= 0 || dt > 0.1) return

      const topBound = (pistonY - cylinderTop) / cylinderHeight

      // 基础粒子更新
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

      // 热流粒子更新
      if (effectiveQ > 0 && Math.random() < 0.3) {
        heatParticlesRef.current.push(initHeatParticle())
      }
      for (const hp of heatParticlesRef.current) {
        hp.y += hp.vy * dt
        hp.life -= dt / hp.maxLife
      }
      heatParticlesRef.current = heatParticlesRef.current.filter(
        (hp) => hp.life > 0 && hp.y > topBound,
      )

      setTick((t) => t + 1)
    },
    [pistonY, cylinderTop, cylinderHeight, speedScale, effectiveQ],
  )

  useAnimationFrame(handleFrame, { playing: isPlaying })

  const tNorm = (currentT - T_MIN) / (T_MAX - T_MIN)

  // ─── 气缸渲染 ──────────────────────────────────────────────────────────
  const renderCylinder = () => {
    const wallStroke = STROKE.objectLine
    const gasHeight = pistonY - cylinderTop
    const bgColor = internalEnergyToColor(deltaU, MAX_ABS_DU)

    return (
      <g>
        {/* 气缸壁 */}
        <rect
          x={cylinderLeft}
          y={cylinderTop}
          width={cylinderWidth}
          height={cylinderHeight}
          fill={THERMAL_COLORS.gasChamberFill}
          stroke={adiabatic ? FIRST_LAW_COLORS.adiabaticWall : THERMAL_COLORS.gasChamberSt}
          strokeWidth={wallStroke}
          strokeDasharray={adiabatic === 1 ? '6 3' : undefined}
          rx={4}
        />

        {/* 气体区域背景（ΔU 变色） */}
        <defs>
          <linearGradient id="firstlaw-gas-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={bgColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={bgColor} stopOpacity={0.08} />
          </linearGradient>
        </defs>
        <rect
          x={cylinderLeft + 1}
          y={cylinderTop + 1}
          width={cylinderWidth - 2}
          height={Math.max(0, gasHeight - 1)}
          fill="url(#firstlaw-gas-grad)"
        />

        {/* 基础气体粒子 */}
        {particlesRef.current.filter((p) => {
          const py = cylinderTop + p.y * gasHeight
          return py <= pistonY && py >= cylinderTop
        }).map((p, i) => {
          const px = cylinderLeft + p.x * cylinderWidth
          const py = cylinderTop + p.y * gasHeight
          const particleColor = adiabatic && W_input > 0
            ? `hsl(220, ${70 + tNorm * 30}%, ${45 - tNorm * 15}%)`
            : THERMAL_COLORS.gasChamberSt
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r={3}
              fill={particleColor}
              opacity={0.8}
            />
          )
        })}

        {/* 热流粒子（Q > 0） */}
        {heatParticlesRef.current.map((hp, i) => {
          const px = cylinderLeft + hp.x * cylinderWidth
          const py = cylinderTop + hp.y * gasHeight
          return (
            <circle
              key={`heat-${i}`}
              cx={px}
              cy={py}
              r={2.5}
              fill={FIRST_LAW_COLORS.heat}
              opacity={hp.life * 0.7}
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

        {/* 做功箭头（W > 0） */}
        {W_input > 0 ? (() => {
          const arrowCount = Math.min(5, Math.max(1, Math.floor(Math.abs(W_input) / 100)))
          const arrows: React.JSX.Element[] = []
          for (let i = 0; i < arrowCount; i++) {
            const ax = cylinderLeft + cylinderWidth * (0.25 + (0.5 * i) / Math.max(1, arrowCount - 1))
            const ay = pistonY - 15
            arrows.push(
              <g key={`arrow-${i}`}>
                <line
                  x1={ax} y1={ay} x2={ax} y2={ay - 14}
                  stroke={FIRST_LAW_COLORS.work}
                  strokeWidth={STROKE.objectLine}
                  strokeLinecap="round"
                />
                <polygon
                  points={`${ax},${ay - 20} ${ax - 5},${ay - 12} ${ax + 5},${ay - 12}`}
                  fill={FIRST_LAW_COLORS.work}
                />
              </g>,
            )
          }
          return <g>{arrows}</g>
        })() : null}

        {/* 放热标识（Q < 0） */}
        {effectiveQ < 0 && (
          <text
            x={cylinderLeft + cylinderWidth * 0.5}
            y={cylinderBottom + 16}
            fontSize={font(9)}
            fill={FIRST_LAW_COLORS.heatRelease}
            textAnchor="middle"
            fontFamily={FONT.family}
          >
            放热 Q &lt; 0
          </text>
        )}

        {/* 加热丝（导热模式 + Q > 0） */}
        {adiabatic === 0 && effectiveQ > 0 && (
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

        {/* 温度标注 */}
        <text
          x={cylinderLeft + cylinderWidth + 8}
          y={cylinderTop + 20}
          fontSize={font(11)}
          fill={THERMO_COLORS.temperature}
          fontFamily={FONT.family}
        >
          T = {currentT.toFixed(0)} K
        </text>

        {/* 压强标注 */}
        <text
          x={cylinderLeft + 4}
          y={cylinderTop - 6}
          fontSize={font(10)}
          fill={THERMO_COLORS.pressure}
          fontFamily={FONT.family}
        >
          {adiabatic ? '绝热' : '导热'} | ΔU = {deltaU.toFixed(0)} J
        </text>
      </g>
    )
  }

  // ─── 能量天平柱状图渲染（上方） ────────────────────────────────────────
  const renderEnergyChart = () => {
    const chartX = vp.visibleX + vp.visibleW * LAYOUT.chartLeftRatio
    const chartY = vp.visibleY + vp.visibleH * LAYOUT.chartTopRatio
    const chartW = vp.visibleW * LAYOUT.chartWidthRatio
    const chartH = vp.visibleH * LAYOUT.chartHeightRatio

    const margin = { left: 48, right: 24, top: 20, bottom: 28 }
    const plotX = chartX + margin.left
    const plotY = chartY + margin.top
    const plotW = chartW - margin.left - margin.right
    const plotH = chartH - margin.top - margin.bottom

    const zeroY = plotY + plotH / 2
    const barWidth = plotW / 7
    const maxBarH = plotH / 2 * 0.85

    const bars = [
      { label: 'W', value: W_input, color: FIRST_LAW_COLORS.work },
      { label: 'Q', value: effectiveQ, color: FIRST_LAW_COLORS.heat },
      { label: 'ΔU', value: deltaU, color: FIRST_LAW_COLORS.internalEnergy },
    ]

    return (
      <g>
        {/* 图表标题 */}
        <text
          x={plotX}
          y={chartY + 12}
          fontSize={font(11)}
          fontWeight="bold"
          fill={CANVAS_COLORS.labelText}
          fontFamily={FONT.family}
        >
          实时能量收支天平
        </text>

        {/* 零线 */}
        <line
          x1={plotX}
          y1={zeroY}
          x2={plotX + plotW}
          y2={zeroY}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.reference}
          strokeDasharray="4 2"
        />
        <text
          x={plotX - 6}
          y={zeroY + 3}
          fontSize={font(9)}
          fill={CANVAS_COLORS.axis}
          textAnchor="end"
          fontFamily={FONT.family}
        >
          0
        </text>

        {/* 柱体 */}
        {bars.map((bar, i) => {
          const cx = plotX + plotW * (0.18 + i * 0.32)
          const barH = (bar.value / MAX_ABS_DU) * maxBarH
          const displayVal = Math.abs(bar.value) > 1000
            ? (bar.value / 1000).toFixed(1) + 'k'
            : bar.value.toFixed(0)

          return (
            <SVGSingleBar
              key={bar.label}
              x={cx - barWidth / 2}
              baseY={zeroY}
              height={-barH}
              barWidth={barWidth}
              color={bar.color}
              label={bar.label}
              valueText={`${displayVal} J`}
              font={font}
              showTrack={false}
            />
          )
        })}

        {/* 守恒等式 */}
        <text
          x={plotX + plotW}
          y={chartY + 12}
          fontSize={font(9)}
          fill={CANVAS_COLORS.labelTextLight}
          textAnchor="end"
          fontFamily={FONT.family}
        >
          {W_input.toFixed(0)} + {effectiveQ.toFixed(0)} = {deltaU.toFixed(0)}
        </text>
      </g>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
      >
        {renderEnergyChart()}
        {renderCylinder()}
      </svg>
    </div>
  )
}
