import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getAnimationConfig } from '@/data/animationRegistry'
import { preloadQuantityBuilder } from '@/data/physicsQuantities'
import { useAnimationStore, useProgressStore } from '@/stores'
import { useAppStore } from '@/stores/useAppStore'
import type { DiscoveryStepData } from '@/components/UI/DiscoveryGuide'
import { useAnimationFrame } from '@/utils/animation'
import { duration } from '@/theme/motion'

export interface AnimationLifecycleResult {
  config: ReturnType<typeof getAnimationConfig>
  isDiscoveryMode: boolean
  canvasDimmed: boolean
  handleReset: () => void
  discoverySteps: DiscoveryStepData[]
  discoveryStep: number
  setDiscoveryStep: (step: number) => void
  nextDiscoveryStep: () => void
  prevDiscoveryStep: () => void
}

export function useAnimationLifecycle(): AnimationLifecycleResult {
  const { id } = useParams<{ id: string }>()

  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const setParams = useAnimationStore((s) => s.setParams)
  const setTime = useAnimationStore((s) => s.setTime)
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)

  const { mode, setMode, discoveryStep, setDiscoveryStep, setDiscoveryMaxStep, nextDiscoveryStep, prevDiscoveryStep } = useAppStore()
  const { markAnimationViewed } = useProgressStore()

  const currentTimeRef = useRef(0)
  const [canvasDimmed, setCanvasDimmed] = useState(false)
  const [discoverySteps, setDiscoverySteps] = useState<DiscoveryStepData[]>([])

  const config = id ? getAnimationConfig(id) : undefined
  const isDiscoveryMode = mode === 'discovery' && !!config?.supportsDiscovery

  // 异步加载发现模式步骤
  useEffect(() => {
    if (config?.discoverySteps) {
      config.discoverySteps().then(m => {
        setDiscoverySteps(m.default)
        setDiscoveryMaxStep(m.default.length - 1)
      })
    } else {
      setDiscoverySteps([])
    }
  }, [config, setDiscoveryMaxStep])

  const prevConfigIdRef = useRef<string | undefined>(undefined)

  // config 变更时初始化 store
  useEffect(() => {
    if (config && config.id !== prevConfigIdRef.current) {
      prevConfigIdRef.current = config.id
      setParams(config.defaultParams)
      setTime(0)
      currentTimeRef.current = 0
      setIsPlaying(false)
      setMode('animation')
      markAnimationViewed(config.id)
      preloadQuantityBuilder(config.id)
    }
  }, [config, setParams, setTime, setIsPlaying, setMode, markAnimationViewed])

  // 暂停时延迟 dimmed
  useEffect(() => {
    if (!isPlaying) {
      const timer = setTimeout(() => setCanvasDimmed(true), duration.fast)
      return () => clearTimeout(timer)
    } else {
      setCanvasDimmed(false)
    }
  }, [isPlaying])

  // 外部修改 store time 时同步到 ref
  const time = useAnimationStore((s) => s.time)
  useEffect(() => {
    if (!isPlaying) {
      currentTimeRef.current = time
    }
  }, [time, isPlaying])

  // rAF 时间循环
  const speed = useAnimationStore((s) => s.speed)
  const maxTime = 30
  useAnimationFrame(
    (deltaTime) => {
      currentTimeRef.current += deltaTime / 1000
      if (currentTimeRef.current >= maxTime) {
        currentTimeRef.current = maxTime
        setTime(maxTime)
        setIsPlaying(false)
        return
      }
      setTime(currentTimeRef.current)
    },
    { playing: isPlaying, speed }
  )

  const handleReset = () => {
    setTime(0)
    currentTimeRef.current = 0
    setIsPlaying(false)
  }

  return {
    config,
    isDiscoveryMode,
    canvasDimmed,
    handleReset,
    discoverySteps,
    discoveryStep,
    setDiscoveryStep,
    nextDiscoveryStep,
    prevDiscoveryStep,
  }
}
