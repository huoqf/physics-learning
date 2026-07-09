import { VectorArrow } from '@/components/Physics'
import { useRef, useCallback, useState, useEffect } from 'react'
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { computeScale, physicsToCanvasWithOrigin } from '@/utils/coordinate'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { stepBrownianMotion } from '@/physics/brownianMotion'
import { THERMO_COLORS, SCENE_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { THERMAL_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

import type { SceneScale } from '@/scene'

interface ParticleState {
  x: number
  y: number
  vx: number
  vy: number
}

interface MoleculeState {
  x: number
  y: number
  vx: number
  vy: number
}

const MOLECULE_COUNT = 40
const MAX_TRAJECTORY = 600

// 物理世界边界（模拟单位）
const WORLD = { xMin: 0, xMax: 100, yMin: 0, yMax: 60 }
const PADDING = 20

function generateHexagon(cx: number, cy: number, r: number): string {
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return points.join(' ')
}

function initMolecules(): MoleculeState[] {
  return Array.from({ length: MOLECULE_COUNT }, () => ({
    x: Math.random() * WORLD.xMax,
    y: Math.random() * WORLD.yMax,
    vx: (Math.random() - 0.5) * 3,
    vy: (Math.random() - 0.5) * 3,
  }))
}

export default function BrownianMotion() {
  const { params, isPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
    })),
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const { width, height, font } = canvasSize

  const mode = params.mode ?? 0
  const temperature = params.temperature ?? 300
  const particleD = params.particleD ?? 5
  const showTrajectory = params.showTrajectory ?? 1
  const showMolecules = params.showMolecules ?? 1

  // 计算缩放比
  const scale = computeScale(width, height, WORLD, PADDING)

  // 花粉视觉半径（通过 scale 缩放）
  const pollenRadius = Math.max(8, particleD * scale * 0.15)

  // 粒子状态（模拟单位坐标）
  const particleRef = useRef<ParticleState>({
    x: WORLD.xMax / 2,
    y: WORLD.yMax / 2,
    vx: 0,
    vy: 0,
  })

  // 轨迹点（模拟单位坐标）
  const trajectoryRef = useRef<{ x: number; y: number }[]>([])

  // 分子状态（模拟单位坐标）
  const moleculesRef = useRef<MoleculeState[]>([])

  // 合力（用于渲染箭头）
  const forceRef = useRef<{ fx: number; fy: number }>({ fx: 0, fy: 0 })

  // 触发重绘
  const [, setTick] = useState(0)

  // 初始化分子（仅进阶模式）
  useEffect(() => {
    if (mode === 1 && moleculesRef.current.length === 0) {
      moleculesRef.current = initMolecules()
    }
  }, [mode])

  // 重置粒子位置
  useEffect(() => {
    particleRef.current = { x: WORLD.xMax / 2, y: WORLD.yMax / 2, vx: 0, vy: 0 }
    trajectoryRef.current = []
    forceRef.current = { fx: 0, fy: 0 }
  }, [])

  // 动画帧回调
  const handleFrame = useCallback(
    (deltaMs: number) => {
      const dt = deltaMs / 1000
      if (dt <= 0 || dt > 0.1) return

      // 更新花粉粒子（模拟单位）
      const result = stepBrownianMotion(particleRef.current, {
        temperature,
        particleDiameter: particleD,
        dt,
      }, { width: WORLD.xMax, height: WORLD.yMax })

      // 边界反弹（模拟单位）
      const r = pollenRadius / scale
      let { x, y, vx, vy } = result
      if (x < r) { x = r; vx = Math.abs(vx) * 0.8 }
      if (x > WORLD.xMax - r) { x = WORLD.xMax - r; vx = -Math.abs(vx) * 0.8 }
      if (y < r) { y = r; vy = Math.abs(vy) * 0.8 }
      if (y > WORLD.yMax - r) { y = WORLD.yMax - r; vy = -Math.abs(vy) * 0.8 }

      particleRef.current = { x, y, vx, vy }
      forceRef.current = { fx: result.FnetX, fy: result.FnetY }

      // 记录轨迹
      trajectoryRef.current.push({ x, y })
      if (trajectoryRef.current.length > MAX_TRAJECTORY) {
        trajectoryRef.current.shift()
      }

      // 更新分子（模拟单位）
      if (mode === 1 && showMolecules) {
        const maxMolSpeed = 2 + temperature * 0.005
        for (const mol of moleculesRef.current) {
          mol.x += mol.vx * dt * 60
          mol.y += mol.vy * dt * 60
          mol.vx += (Math.random() - 0.5) * 0.5 * dt * 60
          mol.vy += (Math.random() - 0.5) * 0.5 * dt * 60
          const speed = Math.sqrt(mol.vx * mol.vx + mol.vy * mol.vy)
          if (speed > maxMolSpeed) {
            mol.vx = (mol.vx / speed) * maxMolSpeed
            mol.vy = (mol.vy / speed) * maxMolSpeed
          }
          if (mol.x < 1) { mol.x = 1; mol.vx = Math.abs(mol.vx) }
          if (mol.x > WORLD.xMax - 1) { mol.x = WORLD.xMax - 1; mol.vx = -Math.abs(mol.vx) }
          if (mol.y < 1) { mol.y = 1; mol.vy = Math.abs(mol.vy) }
          if (mol.y > WORLD.yMax - 1) { mol.y = WORLD.yMax - 1; mol.vy = -Math.abs(mol.vy) }
        }
      }

      setTick((t) => t + 1)
    },
    [temperature, particleD, mode, showMolecules, scale, pollenRadius],
  )

  useAnimationFrame(handleFrame, { playing: isPlaying })

  // 物理坐标 → 画布像素
  const { cx: px, cy: py } = physicsToCanvasWithOrigin(
    particleRef.current.x, particleRef.current.y,
    width / 2, height / 2, scale,
  )

  // 轨迹 polyline 点字符串
  const trajectoryPoints = showTrajectory === 1
    ? trajectoryRef.current.map((p) => {
        const { cx, cy } = physicsToCanvasWithOrigin(p.x, p.y, width / 2, height / 2, scale)
        return `${cx},${cy}`
      }).join(' ')
    : ''

  // 合力箭头（转换到像素坐标）
  const force = forceRef.current
  const forceMagnitude = Math.sqrt(force.fx * force.fx + force.fy * force.fy)
  const forceScale = scale * 8
  const forceArrowLen = Math.min(forceMagnitude * forceScale, 60)

  const sceneScale: SceneScale = {
    scaleX: scale,
    scaleY: scale,
    scale,
    originX: width / 2,
    originY: height / 2,
    maxVectorLength: 60,
    refMagnitudes: {},
  }

  // 分子像素坐标
  const moleculePixels = mode === 1 && showMolecules === 1
    ? moleculesRef.current.map((mol) => {
        const { cx, cy } = physicsToCanvasWithOrigin(mol.x, mol.y, width / 2, height / 2, scale)
        return { cx, cy }
      })
    : []

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={width}
        height={height}
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="liquid-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={THERMAL_COLORS.beakerFill} stopOpacity={0.3} />
            <stop offset="100%" stopColor={THERMAL_COLORS.beakerFill} stopOpacity={0.6} />
          </linearGradient>
          <radialGradient id="pollen-grad" cx="40%" cy="35%">
            <stop offset="0%" stopColor={THERMO_COLORS.temperatureHigh} stopOpacity={0.6} />
            <stop offset="60%" stopColor={THERMO_COLORS.heatAbsorb} stopOpacity={0.8} />
            <stop offset="100%" stopColor={THERMO_COLORS.heatAbsorb} />
          </radialGradient>
          <filter id={CANVAS_STYLE.SVG_FILTER.glow.id}>
            <feGaussianBlur stdDeviation={CANVAS_STYLE.SVG_FILTER.glow.stdDeviation} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 液体环境背景 */}
        <rect
          x={0} y={0}
          width={width} height={height}
          fill="url(#liquid-bg)"
          rx={8}
        />

        {/* 轨迹折线 */}
        {showTrajectory === 1 && trajectoryPoints && (
          <polyline
            points={trajectoryPoints}
            fill="none"
            stroke={THERMO_COLORS.heatAbsorb}
            strokeWidth={1.5}
            strokeOpacity={0.6}
            strokeLinejoin="round"
          />
        )}

        {/* 分子粒子（进阶模式） */}
        {moleculePixels.map((mol, i) => (
          <circle
            key={i}
            cx={mol.cx}
            cy={mol.cy}
            r={Math.max(2, scale * 0.3)}
            fill={SCENE_COLORS.materials.sliderMetalGrad[2]}
            opacity={0.7}
          />
        ))}

        {/* 花粉微粒 */}
        <polygon
          points={generateHexagon(px, py, pollenRadius)}
          fill="url(#pollen-grad)"
          stroke={SCENE_COLORS.circuit.meterFrame}
          strokeWidth={1.5}
          filter="url(#glow)"
        />

        {/* 合力矢量箭头（进阶模式） */}
        {mode === 1 && forceArrowLen > 2 && (
          <VectorArrow
            origin={{ x: particleRef.current.x, y: particleRef.current.y }}
            vector={{ x: force.fx, y: force.fy }}
            type="force"
            sceneScale={sceneScale}
            color={THERMO_COLORS.heatAbsorb}
            pixelLength={forceArrowLen}
          />
        )}

        {/* 温度标签 */}
        <text
          x={12}
          y={24}
          fill={colors.neutral[600]}
          fontSize={font(CANVAS_STYLE.FONT.label)}
          fontFamily={CANVAS_STYLE.FONT.family}
        >
          T = {temperature} K
        </text>
      </svg>
    </div>
  )
}
