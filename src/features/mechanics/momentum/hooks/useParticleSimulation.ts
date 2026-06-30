import { useMemo } from 'react'

export interface Particle {
  x: number
  offsetY: number
  vx: number
  vy: number
  age: number
  hit: boolean
}

export function useParticleSimulation({ time, v_fluid, alpha, plateX, nozzleX, springCompression }: {
  time: number, v_fluid: number, alpha: number, plateX: number, nozzleX: number, springCompression: number
}) {
  const particles = useMemo(() => {
    const result: Particle[] = []

    const tGap = 0.6 / v_fluid
    const flyTime = (plateX + springCompression - (nozzleX - 15)) / (v_fluid * 10)
    const reboundTime = 0.8
    const lifeTime = flyTime + reboundTime

    const minI = Math.max(0, Math.floor((time - lifeTime) / tGap))
    const maxI = Math.ceil(time / tGap)

    for (let i = minI; i <= maxI; i++) {
      const tEmit = i * tGap
      const age = time - tEmit
      if (age < 0 || age >= lifeTime) continue

      if (age < flyTime) {
        const x = (nozzleX - 15) + (age / flyTime) * (plateX + springCompression - (nozzleX - 15))
        const offsetY = ((i % 3) - 1) * 8
        result.push({ x, offsetY, vx: v_fluid * 10, vy: 0, age, hit: false })
      } else {
        const dt = age - flyTime
        const reboundVx = alpha * v_fluid * 10
        const x = (plateX + springCompression) - reboundVx * dt
        const offsetY = ((i % 3) - 1) * 8 + dt * 25 * ((i % 2) === 0 ? 1 : -1)
        result.push({ x, offsetY, vx: -reboundVx, vy: dt * 25, age, hit: true })
      }
    }
    return result
  }, [time, v_fluid, alpha, plateX, nozzleX, springCompression])

  return particles
}
