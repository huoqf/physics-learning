import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getAnimationConfig } from '@/data/animationRegistry'
import { buildPhysicsQuantities } from '@/data/physicsQuantities'
import { useAnimationStore, useProgressStore } from '@/stores'
import {
  AnimationControls,
  PhysicsPanel,
  ParamControl,
  ErrorBoundary,
} from '@/components/UI'
import { duration, easing } from '@/theme'
import { LAYOUT } from '@/theme/spacing'
import { useAnimationFrame } from '@/utils/animation'

// 每个动画的参数配置
const paramConfigs: Record<string, Array<{
  key: string
  label: string
  min: number
  max: number
  step?: number
  unit?: string
}>> = {
  'anim-acceleration': [
    { key: 'v0', label: '初速度 v₀', min: 0, max: 20, step: 0.1, unit: 'm/s' },
    { key: 'a', label: '加速度 a', min: -5, max: 5, step: 0.1, unit: 'm/s²' },
  ],
  'anim-velocity': [
    { key: 'v', label: '速度 v', min: 0, max: 20, step: 0.1, unit: 'm/s' },
  ],
  'anim-free-fall': [
    { key: 'v0', label: '初速度 v₀', min: -10, max: 10, step: 0.1, unit: 'm/s' },
    { key: 'g', label: '重力加速度 g', min: 5, max: 15, step: 0.1, unit: 'm/s²' },
  ],
  'anim-vertical-throw': [
    { key: 'v0', label: '初速度 v₀', min: 0, max: 30, step: 0.1, unit: 'm/s' },
    { key: 'g', label: '重力加速度 g', min: 5, max: 15, step: 0.1, unit: 'm/s²' },
  ],
  'anim-uniform-acceleration': [
    { key: 'v0', label: '初速度 v₀', min: 0, max: 20, step: 0.1, unit: 'm/s' },
    { key: 'a', label: '加速度 a', min: -5, max: 5, step: 0.1, unit: 'm/s²' },
  ],
  'anim-projectile': [
    { key: 'v0x', label: '初速度 v₀', min: 0, max: 20, step: 0.1, unit: 'm/s' },
    { key: 'g', label: '重力加速度 g', min: 5, max: 15, step: 0.1, unit: 'm/s²' },
  ],
  'anim-oblique-throw': [
    { key: 'v0', label: '初速度 v₀', min: 5, max: 30, step: 0.1, unit: 'm/s' },
    { key: 'angle', label: '抛射角 θ', min: 10, max: 80, step: 1, unit: '°' },
    { key: 'g', label: '重力加速度 g', min: 5, max: 15, step: 0.1, unit: 'm/s²' },
  ],
  'anim-circular-motion': [
    { key: 'r', label: '半径 r', min: 1, max: 10, step: 0.1, unit: 'm' },
    { key: 'omega', label: '角速度 ω', min: 0.1, max: 5, step: 0.1, unit: 'rad/s' },
  ],
  'anim-spring-force': [
    { key: 'k', label: '劲度系数 k', min: 10, max: 200, step: 5, unit: 'N/m' },
    { key: 'm', label: '质量 m', min: 0.5, max: 5, step: 0.1, unit: 'kg' },
  ],
  'anim-friction': [
    { key: 'm', label: '质量 m', min: 1, max: 20, step: 0.5, unit: 'kg' },
    { key: 'mu', label: '动摩擦系数 μ', min: 0, max: 1, step: 0.05, unit: '' },
    { key: 'g', label: '重力加速度 g', min: 5, max: 15, step: 0.1, unit: 'm/s²' },
  ],
  'anim-vector-addition': [
    { key: 'f1', label: '力 F₁', min: 1, max: 20, step: 0.5, unit: 'N' },
    { key: 'f2', label: '力 F₂', min: 1, max: 20, step: 0.5, unit: 'N' },
    { key: 'angle', label: '夹角 θ', min: 0, max: 180, step: 5, unit: '°' },
  ],
  'anim-equilibrium': [
    { key: 'f1', label: '力 F₁', min: 1, max: 20, step: 0.5, unit: 'N' },
    { key: 'f2', label: '力 F₂', min: 1, max: 20, step: 0.5, unit: 'N' },
    { key: 'f3', label: '力 F₃', min: 1, max: 20, step: 0.5, unit: 'N' },
  ],
  'anim-newton-second': [
    { key: 'F', label: '拉力 F', min: 0, max: 50, step: 1, unit: 'N' },
    { key: 'm', label: '质量 m', min: 0.5, max: 10, step: 0.5, unit: 'kg' },
    { key: 'mu', label: '动摩擦系数 μ', min: 0, max: 0.5, step: 0.05, unit: '' },
  ],
  'anim-weightlessness': [
    { key: 'a', label: '电梯加速度 a', min: -10, max: 10, step: 0.5, unit: 'm/s²' },
    { key: 'm', label: '质量 m', min: 20, max: 100, step: 5, unit: 'kg' },
  ],
  'anim-connected-bodies': [
    { key: 'm1', label: '质量 m₁', min: 1, max: 10, step: 0.5, unit: 'kg' },
    { key: 'm2', label: '质量 m₂', min: 1, max: 10, step: 0.5, unit: 'kg' },
    { key: 'F', label: '拉力 F', min: 5, max: 50, step: 1, unit: 'N' },
  ],
  'anim-centripetal': [
    { key: 'r', label: '半径 r', min: 1, max: 5, step: 0.1, unit: 'm' },
    { key: 'v', label: '线速度 v', min: 1, max: 10, step: 0.5, unit: 'm/s' },
    { key: 'm', label: '质量 m', min: 0.5, max: 5, step: 0.1, unit: 'kg' },
  ],
  'anim-kepler': [
    { key: 'a', label: '半长轴 a', min: 2, max: 10, step: 0.5, unit: '' },
    { key: 'b', label: '半短轴 b', min: 1, max: 8, step: 0.5, unit: '' },
    { key: 'period', label: '周期 T', min: 5, max: 30, step: 1, unit: 's' },
  ],
  'anim-gravity': [
    { key: 'm1', label: '质量 m₁', min: 100, max: 5000, step: 100, unit: '' },
    { key: 'm2', label: '质量 m₂', min: 1, max: 100, step: 1, unit: '' },
    { key: 'r', label: '距离 r', min: 1, max: 20, step: 0.5, unit: '' },
  ],
  'anim-satellite': [
    { key: 'r', label: '轨道半径', min: 1, max: 20, step: 0.5, unit: '×10⁶ m' },
  ],
  'anim-kinetic-energy': [
    { key: 'm', label: '质量 m', min: 0.5, max: 10, step: 0.5, unit: 'kg' },
    { key: 'F', label: '拉力 F', min: 0, max: 50, step: 1, unit: 'N' },
    { key: 's', label: '位移 s', min: 1, max: 20, step: 0.5, unit: 'm' },
  ],
  'anim-energy-conservation': [
    { key: 'm', label: '质量 m', min: 0.5, max: 10, step: 0.5, unit: 'kg' },
    { key: 'h', label: '高度 h', min: 1, max: 20, step: 0.5, unit: 'm' },
    { key: 'g', label: '重力加速度 g', min: 5, max: 15, step: 0.1, unit: 'm/s²' },
  ],
  'anim-impulse': [
    { key: 'm', label: '质量 m', min: 0.5, max: 10, step: 0.5, unit: 'kg' },
    { key: 'F', label: '力 F', min: 1, max: 20, step: 0.5, unit: 'N' },
    { key: 't_duration', label: '作用时间 Δt', min: 1, max: 10, step: 0.5, unit: 's' },
  ],
  'anim-momentum-conservation': [
    { key: 'm1', label: '质量 m₁', min: 0.5, max: 10, step: 0.5, unit: 'kg' },
    { key: 'm2', label: '质量 m₂', min: 0.5, max: 10, step: 0.5, unit: 'kg' },
    { key: 'v1', label: '速度 v₁', min: -10, max: 10, step: 0.5, unit: 'm/s' },
    { key: 'v2', label: '速度 v₂', min: -10, max: 10, step: 0.5, unit: 'm/s' },
    { key: 'e', label: '恢复系数 e', min: 0, max: 1, step: 0.1, unit: '' },
  ],
  'anim-collision': [
    { key: 'm1', label: '质量 m₁', min: 0.5, max: 10, step: 0.5, unit: 'kg' },
    { key: 'm2', label: '质量 m₂', min: 0.5, max: 10, step: 0.5, unit: 'kg' },
    { key: 'v1', label: '速度 v₁', min: -10, max: 10, step: 0.5, unit: 'm/s' },
    { key: 'v2', label: '速度 v₂', min: -10, max: 10, step: 0.5, unit: 'm/s' },
    { key: 'isElastic', label: '弹性碰撞', min: 0, max: 1, step: 1, unit: '0=非弹性 1=弹性' },
  ],
  // ===== 电磁学 · 静电场（[M4-1]）=====
  'anim-coulomb-law': [
    { key: 'q1', label: '电量 q₁', min: -5, max: 5, step: 0.5, unit: 'μC' },
    { key: 'q2', label: '电量 q₂', min: -5, max: 5, step: 0.5, unit: 'μC' },
    { key: 'r', label: '间距 r', min: 1, max: 8, step: 0.5, unit: 'cm' },
  ],
  'anim-electric-field': [
    { key: 'q', label: '源电量 q', min: -10, max: 10, step: 0.5, unit: 'μC' },
    { key: 'rTest', label: 'P 点距离', min: 1, max: 6, step: 0.5, unit: 'cm' },
  ],
  'anim-charge-in-efield': [
    { key: 'E', label: '电场强度 E', min: 1, max: 30, step: 1, unit: '×10³ N/C' },
    { key: 'q', label: '电量 q', min: 0.5, max: 10, step: 0.5, unit: 'μC' },
    { key: 'm', label: '质量 m', min: 50, max: 500, step: 10, unit: 'mg' },
    { key: 'v0', label: '初速度 v₀', min: 5, max: 40, step: 1, unit: 'm/s' },
  ],
  'anim-capacitor': [
    { key: 'connected', label: '电源状态', min: 0, max: 1, step: 1, unit: '1=接电源 0=断开' },
    { key: 'S', label: '正对面积 S', min: 20, max: 200, step: 10, unit: 'cm²' },
    { key: 'd', label: '板间距 d', min: 1, max: 10, step: 0.5, unit: 'mm' },
    { key: 'epsilon_r', label: '相对介电常数 εᵣ', min: 1, max: 8, step: 0.5, unit: '' },
    { key: 'U', label: '电源电压 U', min: 1, max: 50, step: 1, unit: 'V' },
  ],
  'anim-field-lines': [
    { key: 'q1', label: '电荷量 q₁', min: -10, max: 10, step: 1, unit: 'μC' },
    { key: 'q2', label: '电荷量 q₂', min: -10, max: 10, step: 1, unit: 'μC' },
    { key: 'distance', label: '电荷间距 d', min: 3, max: 15, step: 1, unit: 'cm' },
  ],
  'anim-electric-potential': [
    { key: 'q', label: '电荷量 q', min: -10, max: 10, step: 1, unit: 'μC' },
    { key: 'rTest', label: '试探点距离 r', min: 2, max: 10, step: 0.5, unit: 'cm' },
  ],
  // ===== 电磁学 · 恒定电流（[M4-1]）=====
  'anim-ohm-law': [
    { key: 'U', label: '电压 U', min: 0, max: 12, step: 0.5, unit: 'V' },
    { key: 'R', label: '电阻 R', min: 1, max: 10, step: 0.5, unit: 'Ω' },
  ],
  'anim-circuit-analysis': [
    { key: 'U', label: '电源电压 U', min: 1, max: 24, step: 1, unit: 'V' },
    { key: 'R1', label: '电阻 R₁', min: 1, max: 10, step: 1, unit: 'Ω' },
    { key: 'R2', label: '电阻 R₂', min: 1, max: 10, step: 1, unit: 'Ω' },
    { key: 'mode', label: '连接方式', min: 0, max: 1, step: 1, unit: '0=串联 1=并联' },
  ],
  'anim-closed-circuit': [
    { key: 'EMF', label: '电动势 EMF', min: 1, max: 12, step: 0.5, unit: 'V' },
    { key: 'r', label: '内阻 r', min: 0, max: 5, step: 0.5, unit: 'Ω' },
    { key: 'R', label: '外电阻 R', min: 0, max: 20, step: 0.5, unit: 'Ω' },
  ],
  // ===== 电磁学 · 磁场（[M4-1]）=====
  'anim-ampere-force': [
    { key: 'B', label: '磁感应强度 B', min: 0.1, max: 5, step: 0.1, unit: 'T' },
    { key: 'I', label: '电流 I', min: 0.1, max: 10, step: 0.1, unit: 'A' },
    { key: 'L', label: '导线长度 L', min: 0.5, max: 10, step: 0.5, unit: 'm' },
    { key: 'angle', label: '夹角 θ', min: 0, max: 180, step: 5, unit: '°' },
  ],
  'anim-lorentz-force': [
    { key: 'q', label: '电荷量 q', min: -5, max: 5, step: 0.1, unit: 'C' },
    { key: 'v', label: '速度 v', min: 1, max: 50, step: 1, unit: 'm/s' },
    { key: 'B', label: '磁感应强度 B', min: 0.1, max: 5, step: 0.1, unit: 'T' },
    { key: 'angle', label: '夹角 θ', min: 0, max: 180, step: 5, unit: '°' },
  ],
  'anim-charge-in-bfield': [
    { key: 'q', label: '电荷量 q', min: 0.1, max: 5, step: 0.1, unit: 'C' },
    { key: 'm', label: '质量 m', min: 0.1, max: 5, step: 0.1, unit: 'kg' },
    { key: 'v', label: '速度 v', min: 1, max: 50, step: 1, unit: 'm/s' },
    { key: 'B', label: '磁感应强度 B', min: 0.1, max: 5, step: 0.1, unit: 'T' },
  ],
}

export default function AnimationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    params,
    time,
    isPlaying,
    speed,
    setParams,
    setTime,
    setIsPlaying,
    setSpeed,
    updateParam,
  } = useAnimationStore()
  const { markAnimationViewed } = useProgressStore()
  const currentTimeRef = useRef(0)
  const [canvasDimmed, setCanvasDimmed] = useState(false)

  const config = id ? getAnimationConfig(id) : undefined

  const prevConfigIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (config && config.id !== prevConfigIdRef.current) {
      prevConfigIdRef.current = config.id
      setParams(config.defaultParams)
      setTime(0)
      currentTimeRef.current = 0
      setIsPlaying(false)
      markAnimationViewed(config.id)
    }
  }, [config, setParams, setTime, setIsPlaying, markAnimationViewed])

  useEffect(() => {
    if (!isPlaying) {
      const timer = setTimeout(() => setCanvasDimmed(true), duration.fast)
      return () => clearTimeout(timer)
    } else {
      setCanvasDimmed(false)
    }
  }, [isPlaying])

  // 按组件实例运行的动画循环（统一动画控制入口，跟随组件生命周期自动清理）
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
  const paramConfig = paramConfigs[config.id] || []
  
  // 构建 ParamControl 需要的参数格式
  const paramControlParams = paramConfig.map((p) => ({
    ...p,
    value: params[p.key] ?? 0,
  }))

  // 构建 PhysicsPanel 需要的物理量
  const physicsQuantities = buildPhysicsQuantities(config.id, params, time)

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-neutral-50">
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
      </div>

      <div className="flex-1 flex overflow-hidden">
        {paramControlParams.length > 0 && (
          <div className="bg-neutral-50 border-r border-neutral-200 p-4 overflow-y-auto" style={{ width: LAYOUT.leftPanelWidth }}>
            <ParamControl
              params={paramControlParams}
              onParamChange={updateParam}
              onReset={handleReset}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4">
            <div
              className="w-full h-full bg-white rounded-xl shadow-md overflow-hidden"
              style={{
                transition: `opacity ${duration.normal}ms ${easing.standard}`,
                opacity: canvasDimmed ? 0.9 : 1,
              }}
            >
              <ErrorBoundary resetKey={config.id}>
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      加载动画中…
                    </div>
                  }
                >
                  <AnimationComponent />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>

          <div className="h-12 px-4 pb-4">
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

        <div className="bg-neutral-50 border-l border-neutral-200 p-4 overflow-y-auto" style={{ width: LAYOUT.rightPanelWidth }}>
          <PhysicsPanel
            quantities={physicsQuantities}
          />
        </div>
      </div>
    </div>
  )
}
