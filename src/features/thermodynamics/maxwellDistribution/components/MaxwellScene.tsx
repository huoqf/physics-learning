import { useEffect, useRef, useState } from 'react'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_COLORS, PHYSICS_COLORS, THERMO_COLORS, withAlpha } from '@/theme/physics'
import { calcMostProbableSpeed } from '@/physics/maxwellDistribution'

interface MoleculeParticle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  speedRatio: number // v / vp
}

interface MaxwellSceneProps {
  temperature: number
  isPlaying: boolean
  width: number
  height: number
  font: (size: number) => number
}

const PARTICLE_COUNT = 60

export function MaxwellScene({
  temperature,
  isPlaying,
  width,
  height,
  font,
}: MaxwellSceneProps) {
  const containerPad = 24
  const boxX = containerPad
  const boxY = containerPad
  const boxW = width - containerPad * 2
  const boxH = height - containerPad * 2

  const vpSpeed = calcMostProbableSpeed(temperature)

  // 粒子状态引用保持
  const particlesRef = useRef<MoleculeParticle[]>([])

  useEffect(() => {
    // 依据温度重新初始化粒子群速度分布（符合麦克斯韦特征分布）
    const pts: MoleculeParticle[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Box-Muller 正态分布生成 2D 速度分量
      const u1 = Math.max(1e-6, Math.random())
      const u2 = Math.random()
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
      const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2)

      const baseScale = Math.sqrt(temperature / 300) * 1.5
      const vx = z0 * baseScale
      const vy = z1 * baseScale
      const speed = Math.sqrt(vx * vx + vy * vy)

      pts.push({
        x: boxX + 20 + Math.random() * (boxW - 40),
        y: boxY + 20 + Math.random() * (boxH - 40),
        vx,
        vy,
        radius: 4.5,
        speedRatio: speed / (baseScale * 1.414),
      })
    }
    particlesRef.current = pts
  }, [temperature, boxW, boxH, boxX, boxY])

  // 动画状态循环帧更新（严格遵循 useAnimationFrame 铁律）
  const [, setFrameTick] = useState(0)

  useAnimationFrame(
    (deltaMs) => {
      const dt = Math.min(deltaMs / 1000, 0.05)
      const pts = particlesRef.current
      const speedScale = 60 * dt

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        p.x += p.vx * speedScale
        p.y += p.vy * speedScale

        // 碰壁反弹
        if (p.x - p.radius < boxX) {
          p.x = boxX + p.radius
          p.vx = -p.vx
        } else if (p.x + p.radius > boxX + boxW) {
          p.x = boxX + boxW - p.radius
          p.vx = -p.vx
        }

        if (p.y - p.radius < boxY) {
          p.y = boxY + p.radius
          p.vy = -p.vy
        } else if (p.y + p.radius > boxY + boxH) {
          p.y = boxY + boxH - p.radius
          p.vy = -p.vy
        }
      }

      setFrameTick((t) => t + 1)
    },
    { playing: isPlaying }
  )

  const particles = particlesRef.current

  // 统计三种分子速率数量
  let lowCount = 0
  let midCount = 0
  let highCount = 0
  for (const p of particles) {
    if (p.speedRatio < 0.7) lowCount++
    else if (p.speedRatio <= 1.4) midCount++
    else highCount++
  }

  return (
    <g>
      {/* 气体容器边界 */}
      <rect
        x={boxX}
        y={boxY}
        width={boxW}
        height={boxH}
        rx={10}
        fill={CANVAS_COLORS.white}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={2}
      />

      {/* 容器上方标注 */}
      <text
        x={boxX + 16}
        y={boxY + 22}
        fontSize={font(11)}
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
      >
        气体微观热运动系综 (T = {temperature} K)
      </text>

      {/* 右上方图例与数量统计：“中间多、两头少” */}
      <g transform={`translate(${boxX + boxW - 250}, ${boxY + 12})`}>
        <rect
          x={0}
          y={0}
          width={240}
          height={26}
          rx={6}
          fill={withAlpha(CANVAS_COLORS.grid, 0.4)}
        />
        {/* 低速 */}
        <circle cx={14} cy={13} r={4} fill={PHYSICS_COLORS.averageVelocity} />
        <text x={24} y={17} fontSize={font(9)} fill={CANVAS_COLORS.axis}>
          低速 ({lowCount})
        </text>

        {/* 中速 */}
        <circle cx={80} cy={13} r={4} fill={PHYSICS_COLORS.velocity} />
        <text x={90} y={17} fontSize={font(9)} fill={CANVAS_COLORS.axis} fontWeight="bold">
          中速 ({midCount} 占多数)
        </text>

        {/* 高速 */}
        <circle cx={165} cy={13} r={4} fill={THERMO_COLORS.heatAbsorb} />
        <text x={175} y={17} fontSize={font(9)} fill={CANVAS_COLORS.axis}>
          高速 ({highCount})
        </text>
      </g>

      {/* 粒子批量渲染（轻量化 circle） */}
      {particles.map((p, idx) => {
        const fill =
          p.speedRatio < 0.7
            ? PHYSICS_COLORS.averageVelocity
            : p.speedRatio <= 1.4
              ? PHYSICS_COLORS.velocity
              : THERMO_COLORS.heatAbsorb
        return (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={p.radius}
            fill={fill}
            opacity={0.85}
          />
        )
      })}

      {/* 底部最概然速率参考指示 */}
      <text
        x={boxX + boxW / 2}
        y={boxY + boxH - 10}
        textAnchor="middle"
        fontSize={font(10)}
        fill={CANVAS_COLORS.labelText}
      >
        当前理论最概然速率 v_p ≈ {vpSpeed.toFixed(0)} m/s （分子不断碰撞，单个分子速率瞬息万变，但整体遵从统计律）
      </text>
    </g>
  )
}
