import { useRef, useCallback, useState, useEffect } from 'react'
import { useAnimationFrame } from '@/utils/animation'
import {
  initHeatConductionParticles,
  initDiffusionParticles,
  stepParticles,
  computeMicrostates,
  computeTemperatureDiff,
  computeParticleDistribution,
  type Particle,
  type Scenario,
} from '@/physics/secondLaw'
import { secondLawSharedState } from '../sharedState'

// ─── 常量 ─────────────────────────────────────────────────────────────
export const PARTICLE_COUNT = 160
const EQUILIBRIUM_DELTA_T = 15
const UNIFORMITY_THRESHOLD = 0.05

/** 物理容器边界 (基于 10.0 x 3.87 物理视口，y轴向上为正) */
export const PHYSICAL_CONTAINER = {
  xMin: 0.8,
  xMax: 9.2,
  yMin: 0.7,
  yMax: 3.1,
}

export interface SecondLawPhysicsResult {
  particlesRef: React.MutableRefObject<Particle[]>
  partitionProgressRef: React.MutableRefObject<number>
  entropy: { lnOmega: number; normalizedEntropy: number }
  isEquilibrium: boolean
}

interface UseSecondLawPhysicsParams {
  scenario: Scenario
  partitionOpened: number
  time: number
  isPlaying: boolean
}

export function useSecondLawPhysics({
  scenario,
  partitionOpened,
  time,
  isPlaying,
}: UseSecondLawPhysicsParams): SecondLawPhysicsResult {
  const partitionProgressRef = useRef(0)
  const particlesRef = useRef<Particle[]>([])
  const lastSampleTimeRef = useRef(-1)
  const [entropy, setEntropy] = useState({ lnOmega: 0, normalizedEntropy: 0 })
  const [isEquilibrium, setIsEquilibrium] = useState(false)

  // ─── 初始化粒子及共享状态 ─────────────────────────────────────────
  useEffect(() => {
    if (scenario === 'heat-conduction') {
      particlesRef.current = initHeatConductionParticles(
        PARTICLE_COUNT,
        PHYSICAL_CONTAINER.xMin,
        PHYSICAL_CONTAINER.xMax,
        PHYSICAL_CONTAINER.yMin,
        PHYSICAL_CONTAINER.yMax,
        0.5,
        42
      )
    } else {
      particlesRef.current = initDiffusionParticles(
        PARTICLE_COUNT,
        PHYSICAL_CONTAINER.xMin,
        PHYSICAL_CONTAINER.xMax,
        PHYSICAL_CONTAINER.yMin,
        PHYSICAL_CONTAINER.yMax,
        123
      )
    }
    partitionProgressRef.current = 0
    lastSampleTimeRef.current = -1
    secondLawSharedState.clear()
    return () => {
      secondLawSharedState.clear()
    }
  }, [scenario])

  // ─── 监听时间归零（如重置），同步重置分子状态 ──────────────────────
  useEffect(() => {
    if (time === 0) {
      if (scenario === 'heat-conduction') {
        particlesRef.current = initHeatConductionParticles(
          PARTICLE_COUNT,
          PHYSICAL_CONTAINER.xMin,
          PHYSICAL_CONTAINER.xMax,
          PHYSICAL_CONTAINER.yMin,
          PHYSICAL_CONTAINER.yMax,
          0.5,
          42
        )
      } else {
        particlesRef.current = initDiffusionParticles(
          PARTICLE_COUNT,
          PHYSICAL_CONTAINER.xMin,
          PHYSICAL_CONTAINER.xMax,
          PHYSICAL_CONTAINER.yMin,
          PHYSICAL_CONTAINER.yMax,
          123
        )
      }
      partitionProgressRef.current = 0
      lastSampleTimeRef.current = -1
      secondLawSharedState.clear()
    }
  }, [time, scenario])

  // ─── 粒子物理步进 ─────────────────────────────────────────────────
  const stepPhysics = useCallback(
    (dt: number) => {
      const isGasDiffusion = scenario === 'gas-diffusion'
      if (isGasDiffusion) {
        if (partitionOpened === 1) {
          partitionProgressRef.current = Math.min(1, partitionProgressRef.current + dt / 0.8)
        } else {
          partitionProgressRef.current = 0
        }
      }
      stepParticles(
        particlesRef.current,
        dt,
        scenario,
        PHYSICAL_CONTAINER.xMin,
        PHYSICAL_CONTAINER.xMax,
        PHYSICAL_CONTAINER.yMin,
        PHYSICAL_CONTAINER.yMax,
        isGasDiffusion ? partitionProgressRef.current : 0
      )
    },
    [scenario, partitionOpened],
  )

  // ─── 动画帧回调 ────────────────────────────────────────────────────
  const handleFrame = useCallback(
    (deltaMs: number) => {
      const dt = deltaMs / 1000
      if (dt <= 0 || dt > 0.1) return

      stepPhysics(dt)

      // 计算实时无序度并同步到 sharedState
      const entropyResult = computeMicrostates(
        particlesRef.current,
        PHYSICAL_CONTAINER.xMin,
        PHYSICAL_CONTAINER.xMax,
        PHYSICAL_CONTAINER.yMin,
        PHYSICAL_CONTAINER.yMax
      )
      secondLawSharedState.currentS = entropyResult.normalizedEntropy
      secondLawSharedState.lnOmega = entropyResult.lnOmega

      // 采样保存到历史
      const interval = 0.15
      if (time - lastSampleTimeRef.current >= interval || lastSampleTimeRef.current < 0) {
        lastSampleTimeRef.current = time
        secondLawSharedState.entropyHistory.push({ x: time, y: entropyResult.normalizedEntropy })
        if (secondLawSharedState.entropyHistory.length > 300) {
          secondLawSharedState.entropyHistory.shift()
        }
      }

      // 平衡态检测
      let eq = false
      if (scenario === 'heat-conduction') {
        const { deltaT } = computeTemperatureDiff(
          particlesRef.current,
          PHYSICAL_CONTAINER.xMin,
          PHYSICAL_CONTAINER.xMax
        )
        eq = deltaT < EQUILIBRIUM_DELTA_T
      } else {
        const { ratio } = computeParticleDistribution(
          particlesRef.current,
          PHYSICAL_CONTAINER.xMin,
          PHYSICAL_CONTAINER.xMax
        )
        eq = ratio < UNIFORMITY_THRESHOLD
      }

      setEntropy(entropyResult)
      setIsEquilibrium(eq)
    },
    [stepPhysics, time, scenario],
  )

  useAnimationFrame(handleFrame, { playing: isPlaying, speed: 1 })

  return {
    particlesRef,
    partitionProgressRef,
    entropy,
    isEquilibrium,
  }
}
