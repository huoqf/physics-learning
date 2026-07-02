import { Suspense, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FlaskConical, Play, RotateCcw } from 'lucide-react'
import { buildPhysicsQuantities } from '@/data/physicsQuantities'
import { getAnimationConfig } from '@/data/animationRegistry'
import { knowledgeTree } from '@/data/knowledgeTree'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/stores/useAppStore'
import {
  AnimationControls,
  PhysicsPanel,
  ParamControl,
  ErrorBoundary,
  DiscoveryGuide,
  LeftPanel,
  LeftPanelSection,
  LeftPanelScrollArea,
  ControlPanel,
} from '@/components/UI'
import { LAYOUT } from '@/theme'
import { duration, easing } from '@/theme/motion'
import { ThreePanel } from '@/components/Layout'
import { useAnimationLifecycle } from '@/hooks/useAnimationLifecycle'
import { AnimationLayoutContext } from '@/context/AnimationLayoutContext'
import type { AnimationConfig } from '@/data/types'

/**
 * 中心动画区域 — 订阅 time（每帧更新），与左侧/右侧面板隔离。
 */
function AnimationCenter({
  config,
  isDiscoveryMode,
  canvasDimmed,
  handleReset,
}: {
  config: AnimationConfig
  isDiscoveryMode: boolean
  canvasDimmed: boolean
  handleReset: () => void
}) {
  const time = useAnimationStore((s) => s.time)
  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const speed = useAnimationStore((s) => s.speed)
  const setTime = useAnimationStore((s) => s.setTime)
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)
  const setSpeed = useAnimationStore((s) => s.setSpeed)
  const params = useAnimationStore((s) => s.params)

  const AnimationComponent = config.Component
  const CenterExtraComponent = config.CenterExtra
  const centerExtraModeKey = config.centerExtraMode
  const isCenterExtraFull = centerExtraModeKey != null && params[centerExtraModeKey] === 1
  const showCenterExtraInBasic = CenterExtraComponent && !centerExtraModeKey
  const maxTime = config.maxTime ?? 30

  const controlsMode = config.controlsMode ?? 'timed'

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
        controlsMode={controlsMode}
      />
    </div>
  )

  if (isDiscoveryMode && config.DiscoveryComponent) {
    return (
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
    )
  }

  // 进阶模式：CenterExtra 接管全部布局
  if (isCenterExtraFull && CenterExtraComponent) {
    return (
      <ErrorBoundary resetKey={config.id}>
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">加载动画中…</div>}>
          <CenterExtraComponent />
        </Suspense>
      </ErrorBoundary>
    )
  }

  const standardControlBar = controlBar('px-2 pb-2 pt-1 shrink-0')

  const centerHeightClass = config.centerExtraHeight ?? 'h-1/2'
  const restHeightClass = config.centerExtraHeight ? 'flex-1' : 'h-1/2'

  return (
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
            <div
              className="flex-1 min-h-0 w-full bg-white rounded-xl shadow-md overflow-hidden"
              style={{
                transition: `opacity ${duration.normal}ms ${easing.standard}`,
                opacity: canvasDimmed ? 0.9 : 1,
              }}
            >
              <ErrorBoundary resetKey={config.id}>
                <Suspense
                  fallback={<div className="w-full h-full flex items-center justify-center text-neutral-400">加载动画中…</div>}
                >
                  <AnimationLayoutContext.Provider value={config.sceneLayout}>
                    <AnimationComponent />
                  </AnimationLayoutContext.Provider>
                </Suspense>
              </ErrorBoundary>
            </div>
            {standardControlBar}
          </div>
        </>
      ) : (
        <>
          <div
            className="w-full flex-1 min-h-0 bg-white rounded-xl shadow-md overflow-hidden"
            style={{
              transition: `opacity ${duration.normal}ms ${easing.standard}`,
              opacity: canvasDimmed ? 0.9 : 1,
            }}
          >
            <ErrorBoundary resetKey={config.id}>
              <Suspense
                fallback={<div className="w-full h-full flex items-center justify-center text-neutral-400">加载动画中…</div>}
              >
                <AnimationLayoutContext.Provider value={config.sceneLayout}>
                  <AnimationComponent />
                </AnimationLayoutContext.Provider>
              </Suspense>
            </ErrorBoundary>
          </div>
          {standardControlBar}
        </>
      )}
    </div>
  )
}

/**
 * 右侧物理量面板 — 订阅 time（每帧更新），与左侧参数面板隔离。
 */
function RightPhysicsPanel({
  animId,
}: {
  animId: string
}) {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const lastChangedParam = useAnimationStore((s) => s.lastChangedParam)
  // 播放时用 0.1s 精度减少重算，拖动时用精确时间保持响应
  const effectiveTime = isPlaying ? Math.round(time * 10) / 10 : time
  const physicsQuantities = useMemo(
    () => buildPhysicsQuantities(animId, params, effectiveTime, lastChangedParam),
    [animId, params, effectiveTime, lastChangedParam]
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

  const {
    config,
    configLoading,
    isDiscoveryMode,
    canvasDimmed,
    handleReset,
    discoverySteps,
    discoveryStep,
    setDiscoveryStep,
    nextDiscoveryStep,
    prevDiscoveryStep,
  } = useAnimationLifecycle()

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
  const { params, showTimeSlices, showDualObjects } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      showTimeSlices: s.showTimeSlices,
      showDualObjects: s.showDualObjects,
    }))
  )

  // actions — 稳定引用，不需订阅
  const { setParams, setTime, setIsPlaying, updateParam, toggleTimeSlices, toggleDualObjects, toggleVectors, setDirection } = useAnimationStore.getState()

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

  const paramMeta = config.paramMeta || []
  const controlMeta = config.controlMeta || []

  // 左屏 0-6 顺序：§1/§2 的 group 名（模型选择、子模式）排在 ParamControl 之前，
  // 其余 group（显示辅助、快捷预设、教学提示）排在 ParamControl 之后。
  const MODE_GROUP_NAMES = ['模型选择', '子模式']
  const modeControls = controlMeta.filter((c) => MODE_GROUP_NAMES.includes(c.group ?? ''))
  const auxControls = controlMeta.filter((c) => !MODE_GROUP_NAMES.includes(c.group ?? ''))

  // 构建 ParamControl 需要的参数格式（过滤 showIf / hideIf 条件）
  const paramControlParams = paramMeta
    .filter((p) => {
      // showIf：正向条件
      if (p.showIf) {
        if (p.showIfValue != null) {
          if (params[p.showIf] !== p.showIfValue) return false
        } else if (!params[p.showIf]) {
          return false
        }
      }
      // hideIf：反向条件
      if (p.hideIf && p.hideIfValue != null) {
        if (params[p.hideIf] === p.hideIfValue) return false
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

  // 构建侧边栏扩展 props
  const sidebarExtraProps = {
    params,
    updateParam,
    setParams,
    animationActions: {
      resetAnimation: handleReset,
      pauseAnimation: () => { setIsPlaying(false) },
      restartAnimation: () => { setTime(0); setIsPlaying(true) },
      setDirection: (d: 1 | -1) => { setDirection(d) },
    },
    showTimeSlices,
    toggleTimeSlices,
    showDualObjects,
    toggleDualObjects,
    toggleVectors,
    disabled: isDiscoveryMode,
  }

  return (
    <div className="flex flex-col bg-neutral-50" style={{ height: `calc(100vh - ${LAYOUT.topBarHeight}px)` }}>
      {/* 顶部栏 */}
      <div className="flex items-center gap-4 px-6 h-14 bg-primary-800 shadow-sm border-b border-neutral-200">
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
        left={(paramControlParams.length > 0 || controlMeta.length > 0 || config.SidebarExtra || siblingAnimations.length > 1) ? (
          <LeftPanel>
            {/* 关联模型切换 Tab (高考考点变式切换) */}
            {siblingAnimations.length > 1 && (
              <LeftPanelSection
                title="💡 高考同考点经典模型切换"
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

            {/* 批量重置（右上角，仅无 ParamControl 时显示） */}
            {paramControlParams.length === 0 && config.SidebarExtra && !isDiscoveryMode && (
              <button
                onClick={() => { setParams(config.defaultParams); handleReset() }}
                className="absolute top-3 right-3 flex items-center gap-1 text-xs text-neutral-400 hover:text-primary-600 active:scale-[0.97] transition-all z-10"
                style={{ transitionDuration: '200ms' }}
                aria-label="重置参数"
              >
                <RotateCcw className="w-3 h-3" />
                重置
              </button>
            )}

            {/* §1+§2：模型选择 / 子模式（ParamControl 之前） */}
            {modeControls.length > 0 && !isDiscoveryMode && (
              <ControlPanel
                controls={modeControls}
                params={params}
                defaultParams={config.defaultParams}
                updateParam={updateParam}
                setParams={setParams}
                resetAnimation={handleReset}
                restartAnimation={() => { setTime(0); setIsPlaying(true) }}
                setDirection={(d) => setDirection(d)}
                toggleVectors={toggleVectors}
                toggleTimeSlices={toggleTimeSlices}
                toggleDualObjects={toggleDualObjects}
                disabled={isDiscoveryMode}
              />
            )}

            {/* §3：核心参数（paramMeta → ParamControl） */}
            {paramControlParams.length > 0 && (
              <div className="shrink-0">
                <ParamControl
                  params={paramControlParams}
                  onParamChange={handleParamControlChange}
                  onReset={() => { setParams({ ...config.defaultParams }); handleReset() }}
                  disabled={isDiscoveryMode}
                />
              </div>
            )}

            {/* §4+§5+§6：显示辅助 / 快捷预设 / 教学提示（ParamControl 之后） */}
            {auxControls.length > 0 && !isDiscoveryMode && (
              <ControlPanel
                controls={auxControls}
                params={params}
                defaultParams={config.defaultParams}
                updateParam={updateParam}
                setParams={setParams}
                resetAnimation={handleReset}
                restartAnimation={() => { setTime(0); setIsPlaying(true) }}
                setDirection={(d) => setDirection(d)}
                toggleVectors={toggleVectors}
                toggleTimeSlices={toggleTimeSlices}
                toggleDualObjects={toggleDualObjects}
                disabled={isDiscoveryMode}
              />
            )}
            {/* 侧边栏扩展：通过 registry 挂载的特异 UI */}
            {config.SidebarExtra && !isDiscoveryMode && (
              <LeftPanelScrollArea>
                <Suspense fallback={<div className="w-full h-8 flex items-center justify-center text-neutral-300 text-xs">加载中…</div>}>
                  <config.SidebarExtra {...sidebarExtraProps} />
                </Suspense>
              </LeftPanelScrollArea>
            )}
          </LeftPanel>
        ) : undefined}
        center={
          <div className="flex flex-col h-full p-1.5 gap-2">
            <AnimationCenter
              config={config}
              isDiscoveryMode={isDiscoveryMode}
              canvasDimmed={canvasDimmed}
              handleReset={handleReset}
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
            <RightPhysicsPanel animId={config.id} />
          )
        }
      />
    </div>
  )
}
