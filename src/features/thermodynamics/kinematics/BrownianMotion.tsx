import { useRef, useCallback, useState, useEffect } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { stepBrownianMotion } from '@/physics/brownianMotion'
import { THERMO_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { THERMAL_COLORS } from '@/theme/physics/sceneColors'
import { colors } from '@/theme/colors'

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

function generateHexagon(cx: number, cy: number, r: number): string {
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return points.join(' ')
}

function initMolecules(width: number, height: number): MoleculeState[] {
  return Array.from({ length: MOLECULE_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 200,
    vy: (Math.random() - 0.5) * 200,
  }))
}

export default function BrownianMotion() {
  const { params, isPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
    })),
  )

  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })
  const { width, height } = canvasSize

  const mode = params.mode ?? 0
  const temperature = params.temperature ?? 300
  const particleD = params.particleD ?? 5
  const showTrajectory = params.showTrajectory ?? 1
  const showMolecules = params.showMolecules ?? 1

  // 粒子状态 (useRef 避免高频 re-render)
  const particleRef = useRef<ParticleState>({
    x: width / 2,
    y: height / 2,
    vx: 0,
    vy: 0,
  })

  // 轨迹点
  const trajectoryRef = useRef<{ x: number; y: number }[]>([])

  // 分子状态
  const moleculesRef = useRef<MoleculeState[]>([])

  // 合力 (用于渲染箭头)
  const forceRef = useRef<{ fx: number; fy: number }>({ fx: 0, fy: 0 })

  // 触发重绘的 state (仅用于 force 更新)
  const [, setTick] = useState(0)

  // 初始化分子（仅进阶模式）
  useEffect(() => {
    if (mode === 1 && moleculesRef.current.length === 0) {
      moleculesRef.current = initMolecules(width, height)
    }
  }, [width, height, mode])

  // 重置粒子位置
  useEffect(() => {
    particleRef.current = { x: width / 2, y: height / 2, vx: 0, vy: 0 }
    trajectoryRef.current = []
    forceRef.current = { fx: 0, fy: 0 }
  }, [width, height])

  // 动画帧回调
  const handleFrame = useCallback(
    (deltaMs: number) => {
      const dt = deltaMs / 1000
      if (dt <= 0 || dt > 0.1) return

      // 更新花粉粒子
      const result = stepBrownianMotion(particleRef.current, {
        temperature,
        particleDiameter: particleD,
        dt,
      }, { width, height })

      particleRef.current = { x: result.x, y: result.y, vx: result.vx, vy: result.vy }
      forceRef.current = { fx: result.FnetX, fy: result.FnetY }

      // 记录轨迹
      trajectoryRef.current.push({ x: result.x, y: result.y })
      if (trajectoryRef.current.length > MAX_TRAJECTORY) {
        trajectoryRef.current.shift()
      }

      // 更新分子（简单随机游走 + 边界反弹）
      if (mode === 1 && showMolecules) {
        for (const mol of moleculesRef.current) {
          mol.x += mol.vx * dt
          mol.y += mol.vy * dt
          mol.vx += (Math.random() - 0.5) * 100 * dt
          mol.vy += (Math.random() - 0.5) * 100 * dt
          // 限速
          const speed = Math.sqrt(mol.vx * mol.vx + mol.vy * mol.vy)
          const maxSpeed = 150 + temperature * 0.3
          if (speed > maxSpeed) {
            mol.vx = (mol.vx / speed) * maxSpeed
            mol.vy = (mol.vy / speed) * maxSpeed
          }
          // 边界反弹
          if (mol.x < 5) { mol.x = 5; mol.vx = Math.abs(mol.vx) }
          if (mol.x > width - 5) { mol.x = width - 5; mol.vx = -Math.abs(mol.vx) }
          if (mol.y < 5) { mol.y = 5; mol.vy = Math.abs(mol.vy) }
          if (mol.y > height - 5) { mol.y = height - 5; mol.vy = -Math.abs(mol.vy) }
        }
      }

      // 触发 SVG 重绘
      setTick((t) => t + 1)
    },
    [temperature, particleD, width, height, mode, showMolecules],
  )

  useAnimationFrame(handleFrame, { playing: isPlaying })

  // 花粉视觉半径
  const pollenRadius = particleD * 3

  // 轨迹 polyline 点字符串（直接计算，不缓存）
  const trajectoryPoints = showTrajectory === 1
    ? trajectoryRef.current.map((p) => `${p.x},${p.y}`).join(' ')
    : ''

  // 合力箭头参数
  const force = forceRef.current
  const forceMagnitude = Math.sqrt(force.fx * force.fx + force.fy * force.fy)
  const forceScale = 0.0001 // 缩放到可视范围
  const forceArrowLen = Math.min(forceMagnitude * forceScale, 60)

  const px = particleRef.current.x
  const py = particleRef.current.y

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
      >
        <defs>
          {/* 液体背景渐变 */}
          <linearGradient id="liquid-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={THERMAL_COLORS.beakerFill} stopOpacity={0.3} />
            <stop offset="100%" stopColor={THERMAL_COLORS.beakerFill} stopOpacity={0.6} />
          </linearGradient>
          {/* 花粉径向渐变 */}
          <radialGradient id="pollen-grad" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>
          {/* 发光滤镜 */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
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
        {mode === 1 && showMolecules === 1 && moleculesRef.current.map((mol, i) => (
          <circle
            key={i}
            cx={mol.x}
            cy={mol.y}
            r={2.5}
            fill="#3B82F6"
            opacity={0.7}
          />
        ))}

        {/* 花粉微粒 */}
        <polygon
          points={generateHexagon(px, py, pollenRadius)}
          fill="url(#pollen-grad)"
          stroke="#B45309"
          strokeWidth={1.5}
          filter="url(#glow)"
        />

        {/* 合力矢量箭头（进阶模式） */}
        {mode === 1 && forceArrowLen > 2 && (
          <g>
            <line
              x1={px}
              y1={py}
              x2={px + (force.fx / forceMagnitude) * forceArrowLen}
              y2={py + (force.fy / forceMagnitude) * forceArrowLen}
              stroke={THERMO_COLORS.heatAbsorb}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <polygon
              points={(() => {
                const angle = Math.atan2(force.fy, force.fx)
                const headLen = 8
                const tx = px + (force.fx / forceMagnitude) * forceArrowLen
                const ty = py + (force.fy / forceMagnitude) * forceArrowLen
                const p1x = tx - headLen * Math.cos(angle - Math.PI / 6)
                const p1y = ty - headLen * Math.sin(angle - Math.PI / 6)
                const p2x = tx - headLen * Math.cos(angle + Math.PI / 6)
                const p2y = ty - headLen * Math.sin(angle + Math.PI / 6)
                return `${tx},${ty} ${p1x},${p1y} ${p2x},${p2y}`
              })()}
              fill={THERMO_COLORS.heatAbsorb}
            />
          </g>
        )}

        {/* 温度标签 */}
        <text
          x={12}
          y={24}
          fill={colors.neutral[600]}
          fontSize={CANVAS_STYLE.FONT.label}
          fontFamily={CANVAS_STYLE.FONT.family}
        >
          T = {temperature} K
        </text>
      </svg>
    </div>
  )
}
