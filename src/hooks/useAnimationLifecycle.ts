import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { getAnimationConfig, getAnimationConfigAsync } from '@/data/animationRegistry'
import { preloadQuantityBuilder } from '@/data/physicsQuantities'
import { useAnimationStore, useProgressStore, type PhysicsState } from '@/stores'
import { useAppStore } from '@/stores/useAppStore'
import type { DiscoveryStepData } from '@/components/UI'
import { useAnimationFrame } from '@/utils/animation'
import { parseUrlParamOverrides } from '@/utils/animationDeepLink'
import { duration } from '@/theme/motion'
import type { AnimationConfig, CriticalTimePoint } from '@/data/types'

export interface AnimationLifecycleResult {
  config: AnimationConfig | undefined
  configLoading: boolean
  isDiscoveryMode: boolean
  canvasDimmed: boolean
  handleReset: () => void
  /** 当前实际生效的控制模式（已解析函数形式） */
  effectiveControlsMode: 'timed' | 'loop' | 'param' | 'pause-only'
  /** 当前参数下解析后的临界时刻列表 */
  criticalTimes: CriticalTimePoint[] | undefined
  discoverySteps: DiscoveryStepData[]
  discoveryStep: number
  setDiscoveryStep: (step: number) => void
  nextDiscoveryStep: () => void
  prevDiscoveryStep: () => void
}

function resolveCriticalTimes(
  config: AnimationConfig | undefined,
  params: Record<string, number>,
): CriticalTimePoint[] | undefined {
  if (!config?.criticalTimes) return undefined
  const raw = typeof config.criticalTimes === 'function' ? config.criticalTimes(params) : config.criticalTimes
  if (!raw || raw.length === 0) return raw
  return [...raw].sort((a, b) => a.time - b.time)
}

/* ─── 子 hook: config 加载 + store 初始化 ─── */

function useAnimationConfig() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { setAnimationType, setParams, setTime, setIsPlaying, setPhysicsState, setRepeatLoop, setAutoPauseOnCritical } = useAnimationStore(
    useShallow((s) => ({
      setAnimationType: s.setAnimationType,
      setParams: s.setParams,
      setTime: s.setTime,
      setIsPlaying: s.setIsPlaying,
      setPhysicsState: s.setPhysicsState,
      setRepeatLoop: s.setRepeatLoop,
      setAutoPauseOnCritical: s.setAutoPauseOnCritical,
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
  const prevSearchRef = useRef<string>('')

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
    if (config && (config.id !== prevConfigIdRef.current || location.search !== prevSearchRef.current)) {
      prevConfigIdRef.current = config.id
      prevSearchRef.current = location.search
      // 读取 URL search params，覆盖 defaultParams 中的同名参数。
      // 走 parseUrlParamOverrides 这个唯一真源：它会跳过 `t` / `critical` / `params`
      // 等保留键，并只接受该动画声明过的参数（否则 `?t=1.84` 会被当成参数 `t`）。
      const defaultParams = config.defaultParams as Record<string, number>
      const urlOverrides = parseUrlParamOverrides(location.search, defaultParams)
      const mergedInitParams = { ...config.defaultParams, ...urlOverrides }
      setAnimationType(config.id)
      setParams(mergedInitParams)
      setTime(0)
      currentTimeRef.current = 0
      setRepeatLoop(false)
      const initCriticals = resolveCriticalTimes(config, mergedInitParams as Record<string, number>)
      setAutoPauseOnCritical(Boolean(initCriticals?.some((ct) => ct.autoPause === true)))
      // 解析函数式 controlsMode：初始化时用 defaultParams
      const initMode = typeof config.controlsMode === 'function'
        ? config.controlsMode(mergedInitParams as Record<string, number>)
        : (config.controlsMode ?? 'timed')
      // loop 型加载即自动播放；其余型（timed/param/pause-only）初始为暂停
      setIsPlaying(initMode === 'loop')
      setPhysicsState({ position: { x: 0, y: 0 }, velocity: { vx: 0, vy: 0 }, trajectory: [] })
      setMode('animation')
      markAnimationViewed(config.id)
      preloadQuantityBuilder(config.id)
    }
  }, [config, location.search, setAnimationType, setParams, setTime, setIsPlaying, setPhysicsState, setRepeatLoop, setAutoPauseOnCritical, setMode, markAnimationViewed])

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
  const repeatLoop = useAnimationStore((s) => s.repeatLoop)
  const autoPauseOnCritical = useAnimationStore((s) => s.autoPauseOnCritical)
  const [canvasDimmed, setCanvasDimmed] = useState(false)
  const hasExplicitMaxTime = config?.maxTime != null
  // 每个动画可在 config 中通过 maxTime 覆盖播放上限；不传则走全局默认 30s（loop 型未声明 maxTime 时不强制截断归零）
  const maxTime = typeof config?.maxTime === 'function' ? config.maxTime(params) : (config?.maxTime ?? 30)
  const criticalTimes = useMemo(() => resolveCriticalTimes(config, params), [config, params])

  // 暂停时延迟 dimmed
  useEffect(() => {
    if (!isPlaying) {
      const timer = setTimeout(() => setCanvasDimmed(true), duration.fast)
      return () => clearTimeout(timer)
    } else {
      setCanvasDimmed(false)
    }
  }, [isPlaying])

  // 外部修改 store time 时同步到 ref（包括播放中触发 restartAnimation 等重置到 0 的情况）
  const time = useAnimationStore((s) => s.time)
  const lastLifecycleTimeRef = useRef<number>(0)
  useEffect(() => {
    if (!isPlaying || time !== lastLifecycleTimeRef.current) {
      currentTimeRef.current = time
      lastLifecycleTimeRef.current = time
    }
  }, [time, isPlaying, currentTimeRef])

  // 计算当前生效的 controlsMode（支持函数形式）
  const effectiveControlsMode: 'timed' | 'loop' | 'param' | 'pause-only' = typeof config?.controlsMode === 'function'
    ? config.controlsMode(params)
    : (config?.controlsMode ?? 'timed')

  const isLoop = effectiveControlsMode === 'loop'

  // 动态 controlsMode 切换时同步播放状态：
  // loop → 自动开始播放；非 loop（timed/param/pause-only）→ 暂停（由用户手动触发或场景触发）
  useEffect(() => {
    setIsPlaying(isLoop)
  }, [isLoop, setIsPlaying])

  // rAF 时间循环（注：useAnimationFrame 已将 deltaTime 按 speed 缩放，此处不得再乘 speed）
  useAnimationFrame(
    (deltaTime) => {
      const commitTime = (t: number) => {
        currentTimeRef.current = t
        lastLifecycleTimeRef.current = t
        setTime(t)
      }
      const prevTime = currentTimeRef.current
      const dtSec = deltaTime / 1000
      let nextTime = prevTime + dtSec * direction

      // 临界时刻自动暂停引擎（仅 timed / pause-only 正向播放且开启自动停靠时生效）
      if (!isLoop && direction === 1 && autoPauseOnCritical && criticalTimes && criticalTimes.length > 0) {
        const hit = criticalTimes.find(
          (ct) => ct.autoPause !== false && ct.time > prevTime + 1e-6 && ct.time <= nextTime + 1e-6
        )
        if (hit) {
          commitTime(hit.time)
          setIsPlaying(false)
          if (config?.updatePhysics) {
            const result = config.updatePhysics(params, hit.time, Math.max(0, hit.time - prevTime))
            if (result) {
              setPhysicsState((state: PhysicsState) => ({ ...state, ...result }))
            }
          }
          return
        }
      }

      if (isLoop) {
        // loop 型：仅当显式声明了周期/上限 maxTime 时做平滑取模回绕；未声明时持续递增，避免 30s 强行归零跳变
        if (hasExplicitMaxTime && maxTime > 0) {
          if (nextTime >= maxTime) {
            nextTime = nextTime % maxTime
          } else if (direction === -1 && nextTime < 0) {
            nextTime = ((nextTime % maxTime) + maxTime) % maxTime
          }
        } else if (direction === -1 && nextTime <= 0) {
          commitTime(0)
          setIsPlaying(false)
          return
        }
      } else {
        if (nextTime >= maxTime) {
          if (repeatLoop && effectiveControlsMode === 'timed') {
            commitTime(0)
            return
          }
          commitTime(maxTime)
          setIsPlaying(false)
          if (config?.updatePhysics) {
            const result = config.updatePhysics(params, maxTime, Math.max(0, maxTime - prevTime))
            if (result) {
              setPhysicsState((state: PhysicsState) => ({ ...state, ...result }))
            }
          }
          return
        }
        if (direction === -1 && nextTime <= 0) {
          if (repeatLoop && effectiveControlsMode === 'timed') {
            commitTime(maxTime)
            return
          }
          commitTime(0)
          setIsPlaying(false)
          return
        }
      }

      commitTime(nextTime)

      // 只在 config 声明了 updatePhysics 时才计算物理状态
      if (config?.updatePhysics) {
        const result = config.updatePhysics(params, nextTime, dtSec)
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
    lastLifecycleTimeRef.current = 0
    // loop 型：重置后继续播放（切换模式等触发 reset 不应停播）
    setIsPlaying(isLoop)
    setPhysicsState({ position: { x: 0, y: 0 }, velocity: { vx: 0, vy: 0 }, trajectory: [] })
  }

  return { canvasDimmed, handleReset, effectiveControlsMode, criticalTimes }
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
