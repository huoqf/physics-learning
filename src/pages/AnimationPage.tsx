import { Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FlaskConical, Play } from 'lucide-react'
import { buildPhysicsQuantities, preloadQuantityBuilder } from '@/data/physicsQuantities'
import { buildParamVocabulary } from '@/data/paramVocabulary'
import type { ControlMeta, ParamMeta } from '@/data/types'
import { getAnimationConfig } from '@/data/animationRegistry'
import { knowledgeTree } from '@/data/knowledgeTree'
import { useAnimationStore, AnimationStoreOverrideProvider } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/stores/useAppStore'
import {
  AnimationControls,
  ParamControl,
  ErrorBoundary,
  DiscoveryGuide,
  LeftPanel,
  LeftPanelSection,
  ControlPanel,
} from '@/components/UI'
import { PhysicsPanel } from '@/components/Formula'
import { LAYOUT } from '@/theme'
import { duration, easing } from '@/theme/motion'
import { ThreePanel } from '@/components/Layout'
import { useAnimationLifecycle } from '@/hooks/useAnimationLifecycle'
import { resolveDeepLinkTime, resolveDeepLinkHint, shouldShowFreezeHint, resolveUrlMergedParams } from '@/utils/animationDeepLink'
import type { DeepLinkFreezeHint } from '@/utils/animationDeepLink'
import { WRONG_REASONS } from '@/data/wrongReasons'
import { ChartTimeScrubProvider } from '@/context/ChartTimeScrubContext'

import { AnimationLayoutContext } from '@/context/AnimationLayoutContext'
import type { AnimationConfig, CriticalTimePoint, TimeStageSegment } from '@/data/types'

/**
 * 中心动画区域 — 订阅 time（每帧更新），与左侧/右侧面板隔离。
 */
function AnimationCenter({
  config,
  isDiscoveryMode,
  handleReset,
  effectiveControlsMode,
  criticalTimes,
  timeStages,
  paramMeta,
  deepLinkHint,
}: {
  config: AnimationConfig
  isDiscoveryMode: boolean
  handleReset: () => void
  effectiveControlsMode: 'timed' | 'loop' | 'param' | 'pause-only'
  criticalTimes: CriticalTimePoint[] | undefined
  timeStages: TimeStageSegment[] | undefined
  paramMeta: ParamMeta[]
  deepLinkHint: DeepLinkFreezeHint | null
}) {
  const {
    time,
    isPlaying,
    speed,
    params,
    repeatLoop,
    autoPauseOnCritical,
    showTimeSlices,
    timeSliceInterval,
    ghostSnapshot,
  } = useAnimationStore(
    useShallow((s) => ({
      time: s.time,
      isPlaying: s.isPlaying,
      speed: s.speed,
      params: s.params,
      repeatLoop: s.repeatLoop,
      autoPauseOnCritical: s.autoPauseOnCritical,
      showTimeSlices: s.showTimeSlices,
      timeSliceInterval: s.timeSliceInterval,
      ghostSnapshot: s.ghostSnapshot,
    }))
  )
  const setTime = useAnimationStore((s) => s.setTime)
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)
  const setSpeed = useAnimationStore((s) => s.setSpeed)
  const toggleRepeatLoop = useAnimationStore((s) => s.toggleRepeatLoop)
  const toggleAutoPauseOnCritical = useAnimationStore((s) => s.toggleAutoPauseOnCritical)
  const toggleTimeSlices = useAnimationStore((s) => s.toggleTimeSlices)
  const setTimeSliceInterval = useAnimationStore((s) => s.setTimeSliceInterval)
  const captureGhostSnapshot = useAnimationStore((s) => s.captureGhostSnapshot)
  const clearGhostSnapshot = useAnimationStore((s) => s.clearGhostSnapshot)

  const AnimationComponent = config.Component
  const CenterExtraComponent = config.CenterExtra
  const centerExtraModeKey = config.centerExtraMode
  const isCenterExtraFull = centerExtraModeKey != null && params[centerExtraModeKey] === 1
  const showCenterExtraInBasic = CenterExtraComponent && !centerExtraModeKey
  const maxTime = useMemo(() => {
    if (typeof config.maxTime === 'function') {
      return config.maxTime(params) ?? 30
    }
    return config.maxTime ?? 30
  }, [config, params])
  const isSpringForceCutMode = config.id === 'anim-spring-force' && params.mode === 1
  const isLightWeightMutation = config.id === 'anim-light-weight-mutation'
  const isSplitH = config.centerLayout === 'splitH' || isSpringForceCutMode || isLightWeightMutation

  const chartTimeScrubValue = useMemo(
    () => ({
      maxTime,
      scrubToTime: (targetTime: number) => {
        if (!Number.isFinite(targetTime)) return
        const clamped = maxTime > 0 ? Math.min(maxTime, Math.max(0, targetTime)) : Math.max(0, targetTime)
        setIsPlaying(false)
        setTime(Number(clamped.toFixed(3)))
      },
    }),
    [maxTime, setIsPlaying, setTime],
  )

  const { hasGhostDiff, ghostDiffSummary } = useMemo(() => {
    if (!ghostSnapshot) return { hasGhostDiff: false, ghostDiffSummary: null as string | null }
    const diffs: string[] = []
    const allKeys = new Set([...Object.keys(ghostSnapshot.params), ...Object.keys(params)])
    for (const k of allKeys) {
      const prev = ghostSnapshot.params[k]
      const curr = params[k]
      if (typeof prev === 'number' && typeof curr === 'number' && Math.abs(prev - curr) > 1e-6) {
        const meta = paramMeta.find((m) => m.key === k)
        const shortLabel = meta ? meta.label.split(/\s+/)[0] : k
        diffs.push(`${shortLabel}: ${Number(prev.toFixed(2))}→${Number(curr.toFixed(2))}`)
      }
    }
    if (diffs.length === 0) return { hasGhostDiff: false, ghostDiffSummary: null }
    const summary = diffs.length <= 2 ? diffs.join(' · ') : `${diffs.slice(0, 2).join(' · ')} +${diffs.length - 2}`
    return { hasGhostDiff: true, ghostDiffSummary: summary }
  }, [ghostSnapshot, params, paramMeta])

  /**
   * 定格提示的显示条件由 `shouldShowFreezeHint` 统一裁定（纯函数，已单测覆盖）：
   * 播放中 → 收起；时间偏离这一帧 → 收起。用派生值而不是 effect 清除，
   * 既覆盖了拖滑块/点临界刻度/点重置全部路径，也避开父子 effect 的执行顺序陷阱
   * （子先跑时 time 还是上一帧的值，首帧就把刚到手的提示误清掉）。
   */
  const visibleDeepLinkHint = shouldShowFreezeHint(deepLinkHint, time, isPlaying)

  const renderSceneWithGhost = () => (
    <div className="relative w-full h-full">
      <ErrorBoundary resetKey={config.id}>
        <Suspense
          fallback={<div className="w-full h-full flex items-center justify-center text-neutral-400">加载动画中…</div>}
        >
          <AnimationLayoutContext.Provider value={config.sceneLayout}>
            <AnimationComponent />
          </AnimationLayoutContext.Provider>
        </Suspense>
      </ErrorBoundary>
      {ghostSnapshot && hasGhostDiff && (
        <div
          className="absolute inset-0 pointer-events-none mix-blend-multiply"
          aria-hidden
        >
          <ErrorBoundary resetKey={`${config.id}-ghost`}>
            <Suspense fallback={null}>
              <AnimationStoreOverrideProvider params={ghostSnapshot.params} renderRole="ghost">
                <AnimationLayoutContext.Provider value={config.sceneLayout}>
                  <AnimationComponent />
                </AnimationLayoutContext.Provider>
              </AnimationStoreOverrideProvider>
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
    </div>
  )

  const controlBar = (wrapperClassName: string) => (
    <div className={wrapperClassName}>
      <AnimationControls
        isPlaying={isPlaying}
        speed={speed}
        time={time}
        maxTime={maxTime}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onReset={handleReset}
        onSpeedChange={setSpeed}
        onTimeChange={setTime}
        controlsMode={effectiveControlsMode}
        criticalTimes={criticalTimes}
        timeStages={timeStages}
        enableFrameStep={config.enableFrameStep}
        repeatLoop={repeatLoop}
        onToggleRepeatLoop={toggleRepeatLoop}
        autoPauseCritical={autoPauseOnCritical}
        onToggleAutoPauseCritical={toggleAutoPauseOnCritical}
        ghostActive={Boolean(ghostSnapshot)}
        ghostDiffSummary={ghostDiffSummary}
        onCaptureGhost={captureGhostSnapshot}
        onClearGhost={clearGhostSnapshot}
        showTimeSlices={showTimeSlices}
        timeSliceInterval={timeSliceInterval}
        onToggleTimeSlices={toggleTimeSlices}
        onTimeSliceIntervalChange={setTimeSliceInterval}
        deepLinkHint={visibleDeepLinkHint}
      />
    </div>
  )

  if (isDiscoveryMode && config.DiscoveryComponent) {
    return (
      <ChartTimeScrubProvider value={chartTimeScrubValue}>
        <div className="w-full h-full bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <ErrorBoundary resetKey={config.id}>
              <Suspense
                fallback={<div className="w-full h-full flex items-center justify-center text-neutral-400">加载动画中…</div>}
              >
                <config.DiscoveryComponent />
              </Suspense>
            </ErrorBoundary>
          </div>
          {controlBar('px-4 pb-4 shrink-0 border-t border-neutral-100')}
        </div>
      </ChartTimeScrubProvider>
    )
  }

  // 进阶模式：CenterExtra 接管全部布局
  if (isCenterExtraFull && CenterExtraComponent) {
    return (
      <ChartTimeScrubProvider value={chartTimeScrubValue}>
        <ErrorBoundary resetKey={config.id}>
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">加载动画中…</div>}>
            <CenterExtraComponent />
          </Suspense>
        </ErrorBoundary>
      </ChartTimeScrubProvider>
    )
  }

  const standardControlBar = controlBar('px-2 pb-1 pt-1 shrink-0')

  const centerHeightClass = config.centerExtraHeight ?? 'h-1/2'
  const restHeightClass = config.centerExtraHeight ? 'flex-1' : 'h-1/2'

  if (isSplitH && CenterExtraComponent) {
    return (
      <ChartTimeScrubProvider value={chartTimeScrubValue}>
        <div className="flex flex-col h-full gap-2">
          <div className="flex-1 min-h-0 flex flex-row gap-2">
            {/* 左侧：物理动画 */}
            <div className="flex-1 w-0 min-h-0 bg-white rounded-xl shadow-md overflow-hidden">
              {renderSceneWithGhost()}
            </div>
            {/* 右侧：图表对比 */}
            <div className="flex-1 w-0 min-h-0 bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
              <ErrorBoundary resetKey={config.id}>
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">加载图表中…</div>}>
                  <CenterExtraComponent />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
          {standardControlBar}
        </div>
      </ChartTimeScrubProvider>
    )
  }

  return (
    <ChartTimeScrubProvider value={chartTimeScrubValue}>
      <div className="flex flex-col h-full">
        {showCenterExtraInBasic && CenterExtraComponent ? (
          <>
            <div className={`${centerHeightClass} shrink-0 min-h-0`}>
              <ErrorBoundary resetKey={config.id}>
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">加载动画中…</div>}>
                  <CenterExtraComponent />
                </Suspense>
              </ErrorBoundary>
            </div>
            <div className={`${restHeightClass} min-h-0 flex flex-col gap-2`}>
              <div className="flex-1 min-h-0 w-full bg-white rounded-xl shadow-md overflow-hidden">
                {renderSceneWithGhost()}
              </div>
              {standardControlBar}
            </div>
          </>
        ) : (
          <>
            <div className="w-full flex-1 min-h-0 bg-white rounded-xl shadow-md overflow-hidden">
              {renderSceneWithGhost()}
            </div>
            {standardControlBar}
          </>
        )}
      </div>
    </ChartTimeScrubProvider>
  )
}

/**
 * 右侧物理量面板 — 订阅 time（每帧更新），与左侧参数面板隔离。
 */
function RightPhysicsPanel({
  animId,
  paramMeta,
  controlMeta,
}: {
  animId: string
  paramMeta: ParamMeta[]
  controlMeta?: ControlMeta[]
}) {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const lastChangedParam = useAnimationStore((s) => s.lastChangedParam)
  // 物理量构建器懒加载：预载完成后触发一次重渲染，
  // 避免右面板长期停留在兜底参数列表、直到首次交互才跳变为完整物理量
  const [builderReady, setBuilderReady] = useState(false)
  useEffect(() => {
    let alive = true
    setBuilderReady(false)
    // 用 finally 而不是 then：无论加载成功、失败还是超时，都要翻转一次就绪标记，
    // 否则右面板会一直停在英文参数兜底列表，直到用户碰一下参数才刷新。
    preloadQuantityBuilder(animId).finally(() => {
      if (alive) setBuilderReady(true)
    })
    return () => { alive = false }
  }, [animId])
  // 播放时用 0.1s 精度减少重算，拖动时用精确时间保持响应
  const effectiveTime = isPlaying ? Math.round(time * 10) / 10 : time
  // 兜底看板的中文名与单位一律取自本动画自己的 paramMeta / controlMeta，
  // 不做任何"按键名猜标签"的全域映射（同一个 L 在不同动画里是不同物理量）。
  const vocabulary = useMemo(
    () => buildParamVocabulary(paramMeta, controlMeta, params),
    [paramMeta, controlMeta, params],
  )
  const physicsQuantities = useMemo(
    () => {
      void builderReady // 引用就绪标记：构建器预载完成翻转时触发重算，从兜底数据切换为真实物理量
      return buildPhysicsQuantities(animId, params, effectiveTime, lastChangedParam, vocabulary)
    },
    [animId, params, effectiveTime, lastChangedParam, builderReady, vocabulary]
  )

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <PhysicsPanel
          quantities={physicsQuantities.quantities}
          formulas={physicsQuantities.formulas}
          gaokaoPoints={physicsQuantities.gaokaoPoints}
          warnings={physicsQuantities.warnings}
          mnemonic={physicsQuantities.mnemonic}
          isTerminal={physicsQuantities.isTerminal}
          pauseReason={physicsQuantities.pauseReason}
        />
      </div>
    </div>
  )
}

export default function AnimationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const customParamsStr = searchParams.get('params')
  const tParam = searchParams.get('t')
  const criticalParam = searchParams.get('critical')
  /** 错因 id：从「错因打靶台」进来时携带，用于在定格条上说明「这一帧该看什么」 */
  const reasonParam = searchParams.get('reason')
  /** 供 effect 依赖：URL 查询串变化时才重新注入参数 */
  const searchParamsKey = searchParams.toString()

  /** 深链定格提示（null = 不是从定格帧进来的，控制条不显示提示行） */
  const [deepLinkHint, setDeepLinkHint] = useState<DeepLinkFreezeHint | null>(null)

  const {
    config,
    configLoading,
    isDiscoveryMode,
    handleReset,
    handleRestart,
    effectiveControlsMode,
    criticalTimes,
    timeStages,
    discoverySteps,
    discoveryStep,
    setDiscoveryStep,
    nextDiscoveryStep,
    prevDiscoveryStep,
  } = useAnimationLifecycle()

  // 派生定格提示（参数与时间注入已由 useAnimationConfig 统一在初始化时完成）
  useEffect(() => {
    if (!config) return
    const defaultParams = config.defaultParams as Record<string, number>
    const { mergedParams } = resolveUrlMergedParams(searchParamsKey, defaultParams)

    const rawDuration =
      typeof config.maxTime === 'function'
        ? config.maxTime(mergedParams)
        : config.maxTime
    const duration = rawDuration ?? 30
    const target = resolveDeepLinkTime({
      tParam,
      criticalParam,
      criticalTimes: config.criticalTimes,
      params: mergedParams,
      maxTime: duration,
    })
    const reasonNote = reasonParam
      ? WRONG_REASONS.find((r) => r.id === reasonParam)?.benchmark.highlight
      : undefined
    setDeepLinkHint(resolveDeepLinkHint(target, reasonNote))
  }, [customParamsStr, tParam, criticalParam, reasonParam, searchParamsKey, config])

  // 查找同属一个知识点的关联动画列表 (高考同考点经典模型切换)
  const siblingAnimations = useMemo(() => {
    if (!config) return []
    const currentKnowledgeNode = knowledgeTree.find((node) =>
      node.animationIds.includes(config.id)
    )
    if (!currentKnowledgeNode || currentKnowledgeNode.animationIds.length <= 1) {
      return []
    }
    return currentKnowledgeNode.animationIds
      .map((aid) => {
        const cfg = getAnimationConfig(aid)
        return cfg ? { id: aid, title: cfg.title } : null
      })
      .filter(Boolean) as Array<{ id: string; title: string }>
  }, [config])

  // 低频状态：selector 订阅，避免 time 变化触发重渲染
  const { params, showTimeSlices, showDualObjects, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      showTimeSlices: s.showTimeSlices,
      showDualObjects: s.showDualObjects,
      showVectors: s.showVectors,
    }))
  )

  // actions — 稳定引用，不需订阅
  const { setParams, updateParam, toggleTimeSlices, toggleDualObjects, toggleVectors, setDirection } = useAnimationStore.getState()

  // 重置参数时保留当前模式，不回到默认模式
  const MODE_KEYS = ['mode', 'advancedMode', 'manBoatMode']
  const resetParams = () => {
    if (!config) return
    const currentParams = useAnimationStore.getState().params
    const preserved: Record<string, number> = {}
    for (const key of MODE_KEYS) {
      if (currentParams[key] != null) preserved[key] = currentParams[key]
    }
    setParams({ ...config.defaultParams, ...preserved })
  }

  const storeStates = { showVectors, showTimeSlices, showDualObjects }

  const paramMeta = useMemo(
    () => config?.buildParamMeta ? config.buildParamMeta(params) : (config?.paramMeta ?? []),
    [config, params]
  )

  const { setMode } = useAppStore()

  // config 加载中
  if (configLoading) {
    return (
      <div className="flex flex-col bg-neutral-50" style={{ height: `calc(100vh - ${LAYOUT.topBarHeight}px)` }}>
        <div className="flex-1 flex items-center justify-center text-neutral-400">
          加载动画配置中…
        </div>
      </div>
    )
  }

  if (!config || !config.Component) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold text-neutral-700 mb-4">动画未找到</h2>
        <button
          onClick={() => navigate('/knowledge')}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:scale-[0.97]"
        >
          返回知识树
        </button>
      </div>
    )
  }

  const normalControlMeta = (config?.controlMeta || []).filter((c) => c.type !== 'tip')
  const tipControlMeta = (config?.controlMeta || []).filter((c) => c.type === 'tip')

  // 构建 ParamControl 需要的参数格式（过滤 showIf / hideIf 条件）
  const paramControlParams = paramMeta
    .filter((p) => {
      // showIf：正向条件
      if (p.showIf) {
        if (p.showIfValue != null) {
          if (Array.isArray(p.showIfValue)) {
            if (params[p.showIf] == null || !(p.showIfValue as readonly number[]).includes(params[p.showIf])) return false
          } else if (params[p.showIf] !== p.showIfValue) {
            return false
          }
        } else if (!params[p.showIf]) {
          return false
        }
      }
      // hideIf：反向条件
      if (p.hideIf && p.hideIfValue != null) {
        if (Array.isArray(p.hideIfValue)) {
          if (params[p.hideIf] != null && (p.hideIfValue as readonly number[]).includes(params[p.hideIf])) return false
        } else if (params[p.hideIf] === p.hideIfValue) {
          return false
        }
      }
      return true
    })
    .map((p) => ({
      ...p,
      value: params[p.key] ?? 0,
    }))

  const handleParamControlChange = (key: string, value: number) => {
    const shouldReset = paramControlParams.find((p) => p.key === key)?.resetOnChange === true
    const changed = params[key] !== value
    updateParam(key, value)
    if (shouldReset && changed) handleReset()
  }

  return (
    <div className="flex flex-col bg-neutral-50" style={{ height: `calc(100vh - ${LAYOUT.topBarHeight}px)` }}>
      {/* 顶部栏：shrink-0 防止被 flex 压缩（页面壳高度恒定，ThreePanel 以 flex-1 填满剩余空间）；h-11 紧凑化为中屏画布回收竖向空间 */}
      <div className="flex items-center gap-4 px-6 h-11 shrink-0 bg-primary-800 shadow-sm border-b border-neutral-200">
        <button
          onClick={() => navigate('/knowledge')}
          className="flex items-center gap-2 text-white/80 hover:text-white active:scale-[0.97]"
          style={{ transition: `all ${duration.fast}ms ${easing.standard}` }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">返回</span>
        </button>
        <h1 className="text-xl font-bold text-white">{config.title}</h1>

        {config.supportsDiscovery && (
          <button
            onClick={() => setMode(isDiscoveryMode ? 'animation' : 'discovery')}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 active:scale-[0.97]"
            style={{ transition: `all ${duration.fast}ms ${easing.standard}` }}
          >
            {isDiscoveryMode ? (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>动画模式</span>
              </>
            ) : (
              <>
                <FlaskConical className="w-3.5 h-3.5" />
                <span>公式发现</span>
              </>
            )}
          </button>
        )}
      </div>

      <ThreePanel
        left={(paramControlParams.length > 0 || (config?.controlMeta || []).length > 0 || siblingAnimations.length > 1) ? (
          <LeftPanel>
            {/* 1. 同知识点关联演示切换 Tab */}
            {siblingAnimations.length > 1 && (
              <LeftPanelSection
                title="关联演示切换"
                compact
                className="bg-neutral-100/80"
                bodyClassName="grid gap-1 p-0.5"
              >
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${siblingAnimations.length}, minmax(0, 1fr))` }}>
                  {siblingAnimations.map((anim) => {
                    const isActive = anim.id === config.id
                    return (
                      <button
                        key={anim.id}
                        onClick={() => {
                          if (!isActive) {
                            navigate(`/animation/${anim.id}`)
                          }
                        }}
                        className={`px-1 py-1.5 rounded-lg text-ui-base font-bold leading-tight transition-all duration-200 text-center flex items-center justify-center min-h-[32px] cursor-pointer ${
                          isActive
                            ? 'bg-white shadow-sm text-primary-700 border border-neutral-200/30'
                            : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/40 active:scale-[0.97]'
                        }`}
                      >
                        {anim.title.replace('模型', '')}
                      </button>
                    )
                  })}
                </div>
              </LeftPanelSection>
            )}

            {/* 2. 声明式控制组：模式选择、快捷预设、辅助开关 (ControlPanel) */}
            {normalControlMeta.length > 0 && !isDiscoveryMode && (
              <ControlPanel
                controls={normalControlMeta}
                params={params}
                defaultParams={config.defaultParams}
                updateParam={updateParam}
                setParams={setParams}
                resetAnimation={handleReset}
                restartAnimation={handleRestart}
                setDirection={(d) => setDirection(d)}
                toggleVectors={toggleVectors}
                toggleTimeSlices={toggleTimeSlices}
                toggleDualObjects={toggleDualObjects}
                storeStates={storeStates}
                disabled={isDiscoveryMode}
              />
            )}

            {/* 3. 核心数值参数 (ParamControl) */}
            {paramControlParams.length > 0 && (
              <div className="shrink-0">
                <ParamControl
                  params={paramControlParams}
                  onParamChange={handleParamControlChange}
                  onReset={() => { resetParams(); handleReset() }}
                  disabled={isDiscoveryMode}
                />
              </div>
            )}

            {/* 4. 左屏最底部：教学提示 / TipCard 卡片 */}
            {tipControlMeta.length > 0 && !isDiscoveryMode && (
              <ControlPanel
                controls={tipControlMeta}
                params={params}
                defaultParams={config.defaultParams}
                updateParam={updateParam}
                setParams={setParams}
                resetAnimation={handleReset}
                restartAnimation={handleRestart}
                setDirection={(d) => setDirection(d)}
                toggleVectors={toggleVectors}
                toggleTimeSlices={toggleTimeSlices}
                toggleDualObjects={toggleDualObjects}
                storeStates={storeStates}
                disabled={isDiscoveryMode}
              />
            )}
          </LeftPanel>
        ) : undefined}
        center={
          <div className="flex flex-col h-full p-1.5 gap-2">
          <AnimationCenter
              config={config}
              isDiscoveryMode={isDiscoveryMode}
              handleReset={handleReset}
              effectiveControlsMode={effectiveControlsMode}
              criticalTimes={criticalTimes}
              timeStages={timeStages}
              paramMeta={paramMeta}
              deepLinkHint={deepLinkHint}
            />
          </div>
        }
        right={
          isDiscoveryMode ? (
            <div className="p-3 h-full">
              <DiscoveryGuide
                steps={discoverySteps}
                currentStep={discoveryStep}
                onNext={nextDiscoveryStep}
                onPrev={prevDiscoveryStep}
                onStepClick={setDiscoveryStep}
              />
            </div>
          ) : (
            <RightPhysicsPanel animId={config.id} paramMeta={paramMeta} controlMeta={config.controlMeta} />
          )
        }
      />
    </div>
  )
}
