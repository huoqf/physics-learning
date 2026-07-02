import { useEffect, useRef, useState, type RefObject } from 'react'
import { useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { getAnimationConfig, getAnimationConfigAsync } from '@/data/animationRegistry'
import { preloadQuantityBuilder } from '@/data/physicsQuantities'
import { useAnimationStore, useProgressStore, type PhysicsState } from '@/stores'
import { useAppStore } from '@/stores/useAppStore'
import type { DiscoveryStepData } from '@/components/UI/DiscoveryGuide'
import { useAnimationFrame } from '@/utils/animation'
import { duration } from '@/theme/motion'
import type { AnimationConfig } from '@/data/types'

export interface AnimationLifecycleResult {
  config: AnimationConfig | undefined
  configLoading: boolean
  isDiscoveryMode: boolean
  canvasDimmed: boolean
  handleReset: () => void
  discoverySteps: DiscoveryStepData[]
  discoveryStep: number
  setDiscoveryStep: (step: number) => void
  nextDiscoveryStep: () => void
  prevDiscoveryStep: () => void
}

/* ─── 子 hook: config 加载 + store 初始化 ─── */

function useAnimationConfig() {
  const { id } = useParams<{ id: string }>()
  const { setParams, setTime, setIsPlaying, setPhysicsState } = useAnimationStore(
    useShallow((s) => ({
      setParams: s.setParams,
      setTime: s.setTime,
      setIsPlaying: s.setIsPlaying,
      setPhysicsState: s.setPhysicsState,
    }))
  )
  const { setMode } = useAppStore()
  const { markAnimationViewed } = useProgressStore()

  const currentTimeRef = useRef(0)
  const [config, setConfig] = useState<AnimationConfig | undefined>(() => {
    // core 动画同步命中，避免不必要的 loading 闪烁
    return id ? getAnimationConfig(id) : undefined
  })
  const [configLoading, setConfigLoading] = useState(() => {
    // core 已命中则不需要 loading
    return id ? !getAnimationConfig(id) : false
  })
  const prevConfigIdRef = useRef<string | undefined>(undefined)

  // 异步加载 config（extended 动画走此路径）
  useEffect(() => {
    if (!id) {
      setConfig(undefined)
      setConfigLoading(false)
      return
    }
    // core 同步命中则跳过异步
    const syncConfig = getAnimationConfig(id)
    if (syncConfig) {
      setConfig(syncConfig)
      setConfigLoading(false)
      return
    }
    setConfigLoading(true)
    let cancelled = false
    getAnimationConfigAsync(id).then((c) => {
      if (!cancelled) {
        setConfig(c)
        setConfigLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [id])

  // config 变更时初始化 store
  useEffect(() => {
    if (config && config.id !== prevConfigIdRef.current) {
      prevConfigIdRef.current = config.id
      setParams(config.defaultParams)
      setTime(0)
      currentTimeRef.current = 0
      // loop 型动画自动开始播放；其余类型初始暂停
      setIsPlaying(config.controlsMode === 'loop')
      setPhysicsState({ position: { x: 0, y: 0 }, velocity: { vx: 0, vy: 0 }, trajectory: [] })
      setMode('animation')
      markAnimationViewed(config.id)
      preloadQuantityBuilder(config.id)
    }
  }, [config, setParams, setTime, setIsPlaying, setPhysicsState, setMode, markAnimationViewed])

  return { config, configLoading, currentTimeRef }
}

/* ─── 子 hook: 发现模式步骤管理 ─── */

function useDiscoveryMode(config: AnimationConfig | undefined) {
  const { mode, discoveryStep, setDiscoveryStep, setDiscoveryMaxStep, nextDiscoveryStep, prevDiscoveryStep } = useAppStore()
  const [discoverySteps, setDiscoverySteps] = useState<DiscoveryStepData[]>([])

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

  return {
    isDiscoveryMode,
    discoverySteps,
    discoveryStep,
    setDiscoveryStep,
    nextDiscoveryStep,
    prevDiscoveryStep,
  }
}

/* ─── 子 hook: 播放循环 (rAF + updatePhysics) ─── */

function usePlaybackLoop(
  config: AnimationConfig | undefined,
  currentTimeRef: RefObject<number>,
) {
  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const params = useAnimationStore((s) => s.params)
  const setTime = useAnimationStore((s) => s.setTime)
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)
  const setPhysicsState = useAnimationStore((s) => s.setPhysicsState)
  const speed = useAnimationStore((s) => s.speed)
  const direction = useAnimationStore((s) => s.direction)
  const [canvasDimmed, setCanvasDimmed] = useState(false)
  // 每个动画可在 config 中通过 maxTime 覆盖播放上限；不传则走全局默认 30s
  const maxTime = config?.maxTime ?? 30

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
  }, [time, isPlaying, currentTimeRef])

  // rAF 时间循环
  useAnimationFrame(
    (deltaTime) => {
      currentTimeRef.current += (deltaTime / 1000) * speed * direction
      if (currentTimeRef.current >= maxTime) {
        currentTimeRef.current = maxTime
        setTime(maxTime)
        setIsPlaying(false)
        return
      }
      if (direction === -1 && currentTimeRef.current <= 0) {
        currentTimeRef.current = 0
        setTime(0)
        setIsPlaying(false)
        return
      }

      const t = currentTimeRef.current
      setTime(t)

      // 只在 config 声明了 updatePhysics 时才计算物理状态
      if (config?.updatePhysics) {
        const dt = (deltaTime / 1000) * speed
        const result = config.updatePhysics(params, t, dt)
        if (result) {
          setPhysicsState((state: PhysicsState) => ({ ...state, ...result }))
        }
      }
    },
    { playing: isPlaying, speed }
  )

  const handleReset = () => {
    setTime(0)
    currentTimeRef.current = 0
    setIsPlaying(false)
    setPhysicsState({ position: { x: 0, y: 0 }, velocity: { vx: 0, vy: 0 }, trajectory: [] })
  }

  return { canvasDimmed, handleReset }
}

/* ─── 主 hook: 组合三个子 hook ─── */

export function useAnimationLifecycle(): AnimationLifecycleResult {
  const { config, configLoading, currentTimeRef } = useAnimationConfig()
  const discovery = useDiscoveryMode(config)
  const playback = usePlaybackLoop(config, currentTimeRef)

  return {
    config,
    configLoading,
    ...discovery,
    ...playback,
  }
}
