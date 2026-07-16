import { useRef, useCallback, useState, useEffect } from 'react'
import { useAnimationFrame } from '@/utils/animation'
import { stepBrownianMotion } from '@/physics/brownianMotion'
import type { SceneScale } from '@/scene'

export const WORLD_WIDTH = 100
export const WORLD_HEIGHT = 150
const MOLECULE_COUNT = 45
const MAX_TRAJECTORY = 400

interface ParticleState {
  x: number; y: number; vx: number; vy: number
}

interface MoleculeState {
  x: number; y: number; vx: number; vy: number
}

export interface CollisionWorldPoint {
  id: number
  worldX: number
  worldY: number
  age: number
}

export interface BrownianPhysicsResult {
  particleWorld: { x: number; y: number }
  force: { fx: number; fy: number }
  trajectory: { x: number; y: number }[]
  molecules: MoleculeState[]
  collisions: CollisionWorldPoint[]
  pollenRadius: number
  molRadius: number
  vTarget: number
}

interface UseBrownianPhysicsParams {
  mode: number
  temperature: number
  particleD: number
  isPlaying: boolean
  sceneScale: SceneScale
}

export function useBrownianPhysics({
  mode, temperature, particleD, isPlaying, sceneScale,
}: UseBrownianPhysicsParams): BrownianPhysicsResult {
  const R_phys = 1.6 + 0.32 * particleD
  const r_phys = 0.8
  const pollenRadius = R_phys * sceneScale.scaleX
  const molRadius = r_phys * sceneScale.scaleX

  const vTarget = 7 * Math.sqrt(temperature / 300)

  const particleRef = useRef<ParticleState>({
    x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, vx: 0, vy: 0,
  })
  const trajectoryRef = useRef<{ x: number; y: number }[]>([])
  const moleculesRef = useRef<MoleculeState[]>([])
  const forceRef = useRef<{ fx: number; fy: number }>({ fx: 0, fy: 0 })
  const collisionPointsRef = useRef<CollisionWorldPoint[]>([])

  const [, setTick] = useState(0)

  // 初始化或重置分子
  useEffect(() => {
    if (mode === 1) {
      moleculesRef.current = Array.from({ length: MOLECULE_COUNT }, () => {
        const angle = Math.random() * Math.PI * 2
        return {
          x: Math.random() * (WORLD_WIDTH - 2) + 1,
          y: Math.random() * (WORLD_HEIGHT - 2) + 1,
          vx: Math.cos(angle) * vTarget,
          vy: Math.sin(angle) * vTarget,
        }
      })
    } else {
      moleculesRef.current = []
    }
    collisionPointsRef.current = []
  }, [mode, temperature, vTarget])

  // 重置粒子位置
  useEffect(() => {
    particleRef.current = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, vx: 0, vy: 0 }
    trajectoryRef.current = []
    forceRef.current = { fx: 0, fy: 0 }
    collisionPointsRef.current = []
  }, [])

  const handleFrame = useCallback(
    (deltaMs: number) => {
      const dt = deltaMs / 1000
      if (dt <= 0 || dt > 0.1) return

      let nextX = particleRef.current.x
      let nextY = particleRef.current.y
      let nextVx = particleRef.current.vx
      let nextVy = particleRef.current.vy
      let netFx = 0
      let netFy = 0

      // 更新碰撞亮点生命周期
      collisionPointsRef.current = collisionPointsRef.current
        .map((p) => ({ ...p, age: p.age + 1 }))
        .filter((p) => p.age <= 10)

      if (mode === 0) {
        // 基础模式：Langevin 方程宏观模拟
        const result = stepBrownianMotion(particleRef.current, {
          temperature,
          particleDiameter: particleD,
          dt,
        }, { width: WORLD_WIDTH, height: WORLD_HEIGHT })

        nextX = result.x
        nextY = result.y
        nextVx = result.vx
        nextVy = result.vy
        netFx = result.FnetX
        netFy = result.FnetY
      } else {
        // 进阶模式：分子弹性碰撞动力学引擎
        const M_phys = 5 * particleD * particleD
        const gamma = 3.5

        let fCollX = 0
        let fCollY = 0

        for (const mol of moleculesRef.current) {
          mol.x += mol.vx * dt * 60
          mol.y += mol.vy * dt * 60

          if (mol.x < r_phys) { mol.x = r_phys; mol.vx = Math.abs(mol.vx) }
          if (mol.x > WORLD_WIDTH - r_phys) { mol.x = WORLD_WIDTH - r_phys; mol.vx = -Math.abs(mol.vx) }
          if (mol.y < r_phys) { mol.y = r_phys; mol.vy = Math.abs(mol.vy) }
          if (mol.y > WORLD_HEIGHT - r_phys) { mol.y = WORLD_HEIGHT - r_phys; mol.vy = -Math.abs(mol.vy) }

          const dx = mol.x - nextX
          const dy = mol.y - nextY
          const dist = Math.sqrt(dx * dx + dy * dy)
          const limit = R_phys + r_phys

          if (dist < limit) {
            const nx = dx / dist
            const ny = dy / dist

            const vRelN = (mol.vx - nextVx) * nx + (mol.vy - nextVy) * ny
            if (vRelN < 0) {
              const J = 2.0 * (-vRelN)
              mol.vx += -J * nx
              mol.vy += -J * ny

              fCollX += (J * nx) / dt * 0.4
              fCollY += (J * ny) / dt * 0.4

              mol.x = nextX + (limit + 0.05) * nx
              mol.y = nextY + (limit + 0.05) * ny

              const hitX = nextX + R_phys * nx
              const hitY = nextY + R_phys * ny
              collisionPointsRef.current.push({
                id: Math.random(),
                worldX: hitX,
                worldY: hitY,
                age: 0,
              })
            }
          }

          const speed = Math.sqrt(mol.vx * mol.vx + mol.vy * mol.vy)
          if (speed > 0.01) {
            const angle = Math.atan2(mol.vy, mol.vx) + (Math.random() - 0.5) * 0.15
            mol.vx = Math.cos(angle) * vTarget
            mol.vy = Math.sin(angle) * vTarget
          }
        }

        const fDragX = -gamma * nextVx
        const fDragY = -gamma * nextVy

        netFx = fCollX + fDragX
        netFy = fCollY + fDragY

        nextVx += (netFx / M_phys) * dt
        nextVy += (netFy / M_phys) * dt
        nextX += nextVx * dt * 60
        nextY += nextVy * dt * 60
      }

      // 边界反弹
      if (nextX < R_phys) { nextX = R_phys; nextVx = Math.abs(nextVx) * 0.8 }
      if (nextX > WORLD_WIDTH - R_phys) { nextX = WORLD_WIDTH - R_phys; nextVx = -Math.abs(nextVx) * 0.8 }
      if (nextY < R_phys) { nextY = R_phys; nextVy = Math.abs(nextVy) * 0.8 }
      if (nextY > WORLD_HEIGHT - R_phys) { nextY = WORLD_HEIGHT - R_phys; nextVy = -Math.abs(nextVy) * 0.8 }

      particleRef.current = { x: nextX, y: nextY, vx: nextVx, vy: nextVy }
      forceRef.current = { fx: netFx, fy: netFy }

      trajectoryRef.current.push({ x: nextX, y: nextY })
      if (trajectoryRef.current.length > MAX_TRAJECTORY) {
        trajectoryRef.current.shift()
      }

      setTick((t) => t + 1)
    },
    [temperature, particleD, mode, vTarget, R_phys, r_phys],
  )

  useAnimationFrame(handleFrame, { playing: isPlaying })

  return {
    particleWorld: particleRef.current,
    force: forceRef.current,
    trajectory: trajectoryRef.current,
    molecules: moleculesRef.current,
    collisions: collisionPointsRef.current,
    pollenRadius,
    molRadius,
    vTarget,
  }
}
