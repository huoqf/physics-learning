import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getAnimationConfig } from '@/data/animationRegistry'
import { useAnimationStore, useProgressStore } from '@/stores'
import {
  AnimationControls,
  PhysicsPanel,
  ParamControl,
} from '@/components/UI'
import * as MechanicsAnimations from '@/features/mechanics'
import { duration, easing } from '@/theme'
import { LAYOUT } from '@/theme/spacing'
import { globalAnimationController } from '@/utils/animation'

interface PhysicsQuantity {
  label: string
  value: number | string
  unit: string
  highlight?: 'positive' | 'negative' | 'zero' | 'extreme'
}

function buildPhysicsQuantities(
  animId: string,
  params: Record<string, number>,
  time: number
): PhysicsQuantity[] {
  const g = 9.8
  const base: PhysicsQuantity[] = [
    { label: '时间 t', value: time, unit: 's' },
  ]

  switch (animId) {
    case 'anim-velocity': {
      const v = params.v ?? 5
      return [...base, { label: '速度 v', value: v, unit: 'm/s' }, { label: '位移 s', value: v * time, unit: 'm' }]
    }
    case 'anim-acceleration': {
      const v0 = params.v0 ?? 0
      const a = params.a ?? 2
      const v = v0 + a * time
      const s = v0 * time + 0.5 * a * time * time
      return [...base,
        { label: '初速度 v₀', value: v0, unit: 'm/s' },
        { label: '加速度 a', value: a, unit: 'm/s²', highlight: a > 0 ? 'positive' : a < 0 ? 'negative' : 'zero' },
        { label: '速度 v', value: v, unit: 'm/s', highlight: v > 0 ? 'positive' : v < 0 ? 'negative' : 'zero' },
        { label: '位移 s', value: s, unit: 'm' },
      ]
    }
    case 'anim-uniform-acceleration': {
      const v0 = params.v0 ?? 0
      const a = params.a ?? 1.5
      const v = v0 + a * time
      const s = v0 * time + 0.5 * a * time * time
      return [...base,
        { label: '初速度 v₀', value: v0, unit: 'm/s' },
        { label: '加速度 a', value: a, unit: 'm/s²' },
        { label: '速度 v', value: v, unit: 'm/s' },
        { label: '位移 s', value: s, unit: 'm' },
      ]
    }
    case 'anim-free-fall': {
      const v0 = params.v0 ?? 0
      const gf = params.g ?? g
      const v = v0 + gf * time
      const y = v0 * time + 0.5 * gf * time * time
      return [...base,
        { label: '初速度 v₀', value: v0, unit: 'm/s' },
        { label: '重力加速度 g', value: gf, unit: 'm/s²' },
        { label: '速度 v', value: v, unit: 'm/s' },
        { label: '位移 y', value: y, unit: 'm' },
      ]
    }
    case 'anim-vertical-throw': {
      const v0 = params.v0 ?? 15
      const gf = params.g ?? g
      const v = v0 - gf * time
      const y = v0 * time - 0.5 * gf * time * time
      return [...base,
        { label: '初速度 v₀', value: v0, unit: 'm/s' },
        { label: '重力加速度 g', value: gf, unit: 'm/s²' },
        { label: '速度 v', value: v, unit: 'm/s', highlight: v > 0 ? 'positive' : v < 0 ? 'negative' : 'zero' },
        { label: '位移 y', value: y, unit: 'm' },
      ]
    }
    case 'anim-projectile': {
      const v0x = params.v0x ?? 10
      const gf = params.g ?? g
      const x = v0x * time
      const vy = gf * time
      const y = 0.5 * gf * time * time
      return [...base,
        { label: '水平速度 v₀', value: v0x, unit: 'm/s' },
        { label: '重力加速度 g', value: gf, unit: 'm/s²' },
        { label: '水平位移 x', value: x, unit: 'm' },
        { label: '竖直速度 vy', value: vy, unit: 'm/s' },
        { label: '竖直位移 y', value: y, unit: 'm' },
      ]
    }
    case 'anim-oblique-throw': {
      const v0 = params.v0 ?? 15
      const angle = (params.angle ?? 45) * Math.PI / 180
      const gf = params.g ?? g
      const vx = v0 * Math.cos(angle)
      const vy = v0 * Math.sin(angle) - gf * time
      const x = vx * time
      const y = v0 * Math.sin(angle) * time - 0.5 * gf * time * time
      return [...base,
        { label: '初速度 v₀', value: v0, unit: 'm/s' },
        { label: '抛射角 θ', value: params.angle ?? 45, unit: '°' },
        { label: '水平速度 vx', value: vx, unit: 'm/s' },
        { label: '竖直速度 vy', value: vy, unit: 'm/s' },
        { label: '水平位移 x', value: x, unit: 'm' },
        { label: '竖直位移 y', value: y, unit: 'm' },
      ]
    }
    case 'anim-circular-motion': {
      const r = params.r ?? 2
      const omega = params.omega ?? 1
      const v = omega * r
      return [...base,
        { label: '半径 r', value: r, unit: 'm' },
        { label: '角速度 ω', value: omega, unit: 'rad/s' },
        { label: '线速度 v', value: v, unit: 'm/s' },
        { label: '周期 T', value: 2 * Math.PI / omega, unit: 's' },
      ]
    }
    case 'anim-satellite': {
      const r = params.r ?? 7
      const G = 6.67e-11
      const M = 5.97e24
      const r_meters = r * 1e6
      const v = Math.sqrt(G * M / r_meters)
      const T_seconds = 2 * Math.PI * Math.sqrt(Math.pow(r_meters, 3) / (G * M))
      const T_minutes = T_seconds / 60
      return [...base,
        { label: '轨道半径 r', value: r, unit: '×10⁶ m' },
        { label: '线速度 v', value: v, unit: 'm/s' },
        { label: '周期 T', value: T_minutes, unit: 'min' },
      ]
    }
    case 'anim-momentum-conservation': {
      const m1 = params.m1 ?? 2
      const m2 = params.m2 ?? 3
      const v1 = params.v1 ?? 5
      const v2 = params.v2 ?? 0
      const e = params.e ?? 0.8
      const totalP_before = m1 * v1 + m2 * v2
      const v1_final = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / (m1 + m2)
      const v2_final = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / (m1 + m2)
      const totalP_after = m1 * v1_final + m2 * v2_final
      return [...base,
        { label: '质量 m₁', value: m1, unit: 'kg' },
        { label: '质量 m₂', value: m2, unit: 'kg' },
        { label: '初速度 v₁', value: v1, unit: 'm/s' },
        { label: '初速度 v₂', value: v2, unit: 'm/s' },
        { label: '恢复系数 e', value: e, unit: '' },
        { label: '碰前总动量', value: totalP_before, unit: 'kg·m/s' },
        { label: '碰后总动量', value: totalP_after, unit: 'kg·m/s' },
        { label: 'v₁末', value: v1_final, unit: 'm/s' },
        { label: 'v₂末', value: v2_final, unit: 'm/s' },
      ]
    }
    default:
      return [...base, ...Object.entries(params).map(([key, value]) => ({
        label: key, value, unit: '',
      }))]
  }
}

const animationComponents: Record<string, React.ComponentType> = {
  'anim-velocity': MechanicsAnimations.VelocityAnimation,
  'anim-acceleration': MechanicsAnimations.AccelerationAnimation,
  'anim-uniform-acceleration': MechanicsAnimations.UniformAccelerationAnimation,
  'anim-free-fall': MechanicsAnimations.FreeFallAnimation,
  'anim-vertical-throw': MechanicsAnimations.VerticalThrowAnimation,
  'anim-spring-force': MechanicsAnimations.SpringForceAnimation,
  'anim-friction': MechanicsAnimations.FrictionAnimation,
  'anim-vector-addition': MechanicsAnimations.VectorAdditionAnimation,
  'anim-equilibrium': MechanicsAnimations.EquilibriumAnimation,
  'anim-newton-second': MechanicsAnimations.NewtonSecondAnimation,
  'anim-weightlessness': MechanicsAnimations.WeightlessnessAnimation,
  'anim-connected-bodies': MechanicsAnimations.ConnectedBodiesAnimation,
  'anim-projectile': MechanicsAnimations.ProjectileAnimation,
  'anim-oblique-throw': MechanicsAnimations.ObliqueThrowAnimation,
  'anim-circular-motion': MechanicsAnimations.CircularMotionAnimation,
  'anim-centripetal': MechanicsAnimations.CentripetalAnimation,
  'anim-kepler': MechanicsAnimations.KeplerAnimation,
  'anim-gravity': MechanicsAnimations.GravityAnimation,
  'anim-satellite': MechanicsAnimations.SatelliteAnimation,
  'anim-kinetic-energy': MechanicsAnimations.KineticEnergyAnimation,
  'anim-energy-conservation': MechanicsAnimations.EnergyConservationAnimation,
  'anim-impulse': MechanicsAnimations.MomentumTheoremAnimation,
  'anim-momentum-conservation': MechanicsAnimations.MomentumConservationAnimation,
  'anim-collision': MechanicsAnimations.CollisionAnimation,
}

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
    return () => {
      globalAnimationController.pause()
    }
  }, [config?.id, setParams, setTime, setIsPlaying, markAnimationViewed])

  useEffect(() => {
    globalAnimationController.setSpeed(speed)
  }, [speed])

  useEffect(() => {
    if (isPlaying) {
      globalAnimationController.start((deltaTime) => {
        currentTimeRef.current += deltaTime / 1000
        setTime(currentTimeRef.current)
      })
    } else {
      globalAnimationController.pause()
    }
    return () => {
      globalAnimationController.pause()
    }
  }, [isPlaying, setTime])

  const handleReset = () => {
    globalAnimationController.pause()
    setTime(0)
    currentTimeRef.current = 0
    setIsPlaying(false)
    if (config) {
      setParams(config.defaultParams)
    }
  }

  if (!config || !animationComponents[config.id]) {
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

  const AnimationComponent = animationComponents[config.id]
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
              style={{ transition: `all ${duration.normal}ms ${easing.standard}` }}
            >
              <AnimationComponent />
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
