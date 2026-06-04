import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FlaskConical, Play } from 'lucide-react'
import { getAnimationConfig } from '@/data/animationRegistry'
import { buildPhysicsQuantities } from '@/data/physicsQuantities'
import { useAnimationStore, useProgressStore } from '@/stores'
import { useAppStore } from '@/stores/useAppStore'
import {
  AnimationControls,
  PhysicsPanel,
  ParamControl,
  ErrorBoundary,
  DiscoveryGuide,
} from '@/components/UI'
import type { DiscoveryStepData } from '@/components/UI/DiscoveryGuide'
import { duration, easing } from '@/theme/motion'
import { ThreePanel } from '@/components/Layout'
import { useAnimationFrame } from '@/utils/animation'
import TimeSliceFormulaPanel from '@/features/mechanics/TimeSliceFormulaPanel'

export default function AnimationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    params,
    time,
    isPlaying,
    speed,
    showTimeSlices,
    showDualObjects,
    setParams,
    setTime,
    setIsPlaying,
    setSpeed,
    updateParam,
    toggleTimeSlices,
    toggleDualObjects,
  } = useAnimationStore()
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

  useEffect(() => {
    if (config && config.id !== prevConfigIdRef.current) {
      prevConfigIdRef.current = config.id
      setParams(config.defaultParams)
      setTime(0)
      currentTimeRef.current = 0
      setIsPlaying(false)
      setMode('animation')
      markAnimationViewed(config.id)
    }
  }, [config, setParams, setTime, setIsPlaying, setMode, markAnimationViewed])

  useEffect(() => {
    if (!isPlaying) {
      const timer = setTimeout(() => setCanvasDimmed(true), duration.fast)
      return () => clearTimeout(timer)
    } else {
      setCanvasDimmed(false)
    }
  }, [isPlaying])

  useAnimationFrame(
    (deltaTime) => {
      currentTimeRef.current += deltaTime / 1000
      setTime(currentTimeRef.current)
    },
    { playing: isPlaying, speed }
  )

  const handleReset = () => {
    setTime(0)
    currentTimeRef.current = 0
    setIsPlaying(false)
    if (config) {
      setParams(config.defaultParams)
    }
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

  const AnimationComponent = config.Component
  const paramMeta = config.paramMeta || []

  // 构建 ParamControl 需要的参数格式
  const paramControlParams = paramMeta.map((p) => ({
    ...p,
    value: params[p.key] ?? 0,
  }))

  // 构建侧边栏扩展 props
  const sidebarExtraProps = {
    params,
    updateParam,
    showTimeSlices,
    toggleTimeSlices,
    showDualObjects,
    toggleDualObjects,
    disabled: isDiscoveryMode,
  }

  // 构建物理量看板
  const physicsQuantities = buildPhysicsQuantities(config.id, params, time)

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-neutral-50">
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
        left={paramControlParams.length > 0 ? (
          <div className="p-4">
            <ParamControl
              params={paramControlParams}
              onParamChange={updateParam}
              onReset={handleReset}
              disabled={isDiscoveryMode}
            />
            {/* 侧边栏扩展：通过 registry 挂载的特异 UI */}
            {config.SidebarExtra && !isDiscoveryMode && (
              <Suspense fallback={null}>
                <config.SidebarExtra {...sidebarExtraProps} />
              </Suspense>
            )}
          </div>
        ) : undefined}
        center={
          <div className="flex flex-col h-full p-4 gap-4">
            {isDiscoveryMode && config.DiscoveryComponent ? (
              // 发现模式
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
                <div className="px-4 pb-4 shrink-0 border-t border-neutral-100">
                  <AnimationControls
                    isPlaying={isPlaying}
                    speed={speed}
                    time={time}
                    maxTime={30}
                    onPlayPause={() => setIsPlaying(!isPlaying)}
                    onReset={handleReset}
                    onSpeedChange={setSpeed}
                    onTimeChange={setTime}
                  />
                </div>
              </div>
            ) : (
              // 动画模式
              <>
                {/* 中心区域扩展：VT图+公式面板等特异布局 */}
                {config.CenterExtra && (
                  <ErrorBoundary resetKey={config.id}>
                    <Suspense fallback={null}>
                      <config.CenterExtra />
                    </Suspense>
                  </ErrorBoundary>
                )}
                <div
                  className="w-full flex-1 bg-white rounded-xl shadow-md overflow-hidden"
                  style={{
                    transition: `opacity ${duration.normal}ms ${easing.standard}`,
                    opacity: canvasDimmed ? 0.9 : 1,
                  }}
                >
                  <ErrorBoundary resetKey={config.id}>
                    <Suspense
                      fallback={<div className="w-full h-full flex items-center justify-center text-neutral-400">加载动画中…</div>}
                    >
                      <AnimationComponent />
                    </Suspense>
                  </ErrorBoundary>
                </div>
                <div className="px-4 pb-4 shrink-0">
                  <AnimationControls
                    isPlaying={isPlaying}
                    speed={speed}
                    time={time}
                    maxTime={30}
                    onPlayPause={() => setIsPlaying(!isPlaying)}
                    onReset={handleReset}
                    onSpeedChange={setSpeed}
                    onTimeChange={setTime}
                  />
                </div>
              </>
            )}
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
            <div className="p-4 h-full flex flex-col">
              <div className="flex-1 min-h-0">
                <PhysicsPanel quantities={physicsQuantities} />
              </div>
              {id === 'anim-free-fall' && showTimeSlices && (
                <TimeSliceFormulaPanel
                  g={params.g ?? 9.8}
                  v0={params.v0 ?? 0}
                />
              )}
            </div>
          )
        }
      />
    </div>
  )
}
