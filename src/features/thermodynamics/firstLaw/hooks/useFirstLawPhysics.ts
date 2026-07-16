import { useRef, useCallback, useState } from 'react'
import { useAnimationFrame } from '@/utils/animation'
import {
  PARTICLE_COUNT,
  BASE_SPEED,
  initGasParticles,
} from '@/physics/firstLaw'
import type { GasParticle, HeatParticle } from '@/physics/firstLaw'

interface UseFirstLawPhysicsResult {
  particlesRef: React.MutableRefObject<GasParticle[]>
  heatParticlesRef: React.MutableRefObject<HeatParticle[]>
}

interface UseFirstLawPhysicsParams {
  pistonY: number
  speedScale: number
  Q: number
  isPlaying: boolean
}

export function useFirstLawPhysics({
  pistonY,
  speedScale,
  Q,
  isPlaying,
}: UseFirstLawPhysicsParams): UseFirstLawPhysicsResult {
  const particlesRef = useRef<GasParticle[]>(initGasParticles(PARTICLE_COUNT))
  const heatParticlesRef = useRef<HeatParticle[]>([])
  const [, setTick] = useState(0)

  const handleFrame = useCallback(
    (deltaMs: number) => {
      const dt = deltaMs / 1000
      if (dt <= 0 || dt > 0.1) return

      // 气体内壁碰撞范围 (米)
      const xMin = -0.85
      const xMax = 0.85
      const yMin = 0.65
      const yMax = pistonY - 0.15

      for (const p of particlesRef.current) {
        p.x += p.vx * speedScale * dt
        p.y += p.vy * speedScale * dt

        if (p.x < xMin) { p.x = xMin; p.vx = Math.abs(p.vx) }
        else if (p.x > xMax) { p.x = xMax; p.vx = -Math.abs(p.vx) }

        if (p.y < yMin) { p.y = yMin; p.vy = Math.abs(p.vy) }
        else if (p.y > yMax) { p.y = yMax; p.vy = -Math.abs(p.vy) }

        p.vx += (Math.random() - 0.5) * 0.1 * dt
        p.vy += (Math.random() - 0.5) * 0.1 * dt

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        const targetSpeed = BASE_SPEED * speedScale
        if (speed > 0) {
          p.vx = (p.vx / speed) * targetSpeed
          p.vy = (p.vy / speed) * targetSpeed
        }
      }

      // 热流粒子效果
      if (Q > 0 && Math.random() < 0.35) {
        heatParticlesRef.current.push({
          x: (Math.random() - 0.5) * 1.5,
          y: 0.6,
          vy: 0.8 + Math.random() * 0.8,
          life: 1.0,
        })
      }
      if (Q < 0 && Math.random() < 0.35) {
        heatParticlesRef.current.push({
          x: (Math.random() - 0.5) * 1.6,
          y: 0.6 + Math.random() * (pistonY - 0.8),
          vy: -0.5 - Math.random() * 0.5,
          life: 1.0,
        })
      }

      for (const hp of heatParticlesRef.current) {
        if (Q > 0) {
          hp.y += hp.vy * dt
          hp.life -= dt * 0.8
        } else {
          hp.y += hp.vy * dt
          hp.x += (hp.x > 0 ? 0.3 : -0.3) * dt
          hp.life -= dt * 1.2
        }
      }

      heatParticlesRef.current = heatParticlesRef.current.filter(
        (hp) => hp.life > 0 && hp.y >= 0.5 && hp.y <= pistonY,
      )

      setTick((t) => t + 1)
    },
    [pistonY, speedScale, Q],
  )

  useAnimationFrame(handleFrame, { playing: isPlaying })

  return { particlesRef, heatParticlesRef }
}
