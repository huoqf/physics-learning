import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getAnimationConfig } from '@/data/animationRegistry'
import { preloadQuantityBuilder } from '@/data/physicsQuantities'
import { useAnimationStore, useProgressStore, type PhysicsState } from '@/stores'
import { useAppStore } from '@/stores/useAppStore'
import type { DiscoveryStepData } from '@/components/UI/DiscoveryGuide'
import { useAnimationFrame } from '@/utils/animation'
import { duration } from '@/theme/motion'
import { calculateLorentzTrajectory } from '@/physics'

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
  const params = useAnimationStore((s) => s.params)
  const setParams = useAnimationStore((s) => s.setParams)
  const setTime = useAnimationStore((s) => s.setTime)
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)
  const setPhysicsState = useAnimationStore((s) => s.setPhysicsState)

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
      setPhysicsState({ position: { x: 0, y: 0 }, velocity: { vx: 0, vy: 0 }, trajectory: [] })
      setMode('animation')
      markAnimationViewed(config.id)
      preloadQuantityBuilder(config.id)
    }
  }, [config, setParams, setTime, setIsPlaying, setPhysicsState, setMode, markAnimationViewed])

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
  
  // 物理参数订阅用于触发轨迹重算
  const { q = 1, v = 10, B = 1, m = 1 } = params

  useAnimationFrame(
    (deltaTime) => {
      currentTimeRef.current += (deltaTime / 1000) * speed
      if (currentTimeRef.current >= maxTime) {
        currentTimeRef.current = maxTime
        setTime(maxTime)
        setIsPlaying(false)
        return
      }
      
      const t = currentTimeRef.current
      setTime(t)
      
      // 计算当前位置与更新轨迹
      const res = calculateLorentzTrajectory(q, m, B, v, t)
      
      // 更新轨迹点（简单处理，实际应考虑采样频率）
      setPhysicsState((state: PhysicsState) => ({
        position: { x: res.x, y: res.y },
        velocity: { vx: res.vx, vy: res.vy },
        trajectory: [...state.trajectory, { x: res.x, y: res.y }].slice(-200) // 保留最近 200 点
      }))
    },
    { playing: isPlaying, speed }
  )

  const handleReset = () => {
    setTime(0)
    currentTimeRef.current = 0
    setIsPlaying(false)
    setPhysicsState({ position: { x: 0, y: 0 }, velocity: { vx: 0, vy: 0 }, trajectory: [] })
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
