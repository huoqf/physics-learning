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
import UniformAccelerationDiscovery from '@/features/mechanics/UniformAccelerationDiscovery'
import { useUniformAccelerationPhysics } from '@/features/mechanics/useUniformAccelerationPhysics'
import { VTChart } from '@/components/Physics/VTChart'

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
  'anim-faraday-law': [
    { key: 'N', label: '线圈匝数 N', min: 1, max: 10, step: 1, unit: '匝' },
    { key: 'B', label: '磁铁强度 B', min: 0.2, max: 2.0, step: 0.1, unit: 'T' },
  ],
  'anim-lenzs-law': [
    { key: 'magnetSpeed', label: '磁铁速度', min: 0.5, max: 5, step: 0.5, unit: '' },
    { key: 'magnetPole', label: '磁极朝向', min: -1, max: 1, step: 2, unit: '1=N下 -1=S下' },
    { key: 'coilN', label: '线圈匝数 N', min: 5, max: 30, step: 5, unit: '匝' },
    { key: 'motionMode', label: '运动模式', min: -1, max: 1, step: 2, unit: '1=插入 -1=拔出' },
  ],
  'anim-cutting-emf': [
    { key: 'B', label: '磁感应强度 B', min: 0.1, max: 5, step: 0.1, unit: 'T' },
    { key: 'L', label: '导轨宽度 L', min: 0.1, max: 2, step: 0.1, unit: 'm' },
    { key: 'v', label: '速度 v', min: -5, max: 5, step: 0.5, unit: 'm/s' },
    { key: 'R', label: '外电阻 R', min: 0.1, max: 10, step: 0.1, unit: 'Ω' },
    { key: 'theta', label: '夹角 θ', min: 0, max: 90, step: 5, unit: '°' },
    { key: 'r', label: '内阻 r', min: 0, max: 2, step: 0.1, unit: 'Ω' },
    { key: 'B_out', label: '磁场方向', min: 0, max: 1, step: 1, unit: '0=向里⊗ 1=向外⊙' },
    { key: 'handRule', label: '手指定则', min: 0, max: 2, step: 1, unit: '0=右手 1=左手 2=握拳' },
  ],
  'anim-ac-generation': [
    { key: 'B', label: '磁感应强度 B', min: 0.1, max: 2, step: 0.1, unit: 'T' },
    { key: 'S', label: '线圈面积 S', min: 0.01, max: 0.1, step: 0.01, unit: 'm²' },
    { key: 'omega', label: '角速度 ω', min: 0.5, max: 10, step: 0.5, unit: 'rad/s' },
    { key: 'N', label: '匝数 N', min: 1, max: 500, step: 10, unit: '匝' },
    { key: 'initialPhase', label: '初始位置', min: 0, max: 1, step: 1, unit: '0=中性面 1=最大值面' },
  ],
  'anim-ac-values': [
    { key: 'V_peak', label: '峰值电压 Vm', min: 50, max: 500, step: 10, unit: 'V' },
    { key: 'f', label: '频率 f', min: 0.5, max: 20, step: 0.5, unit: 'Hz' },
    { key: 'U_dc', label: '直流电压 Udc', min: 0, max: 350, step: 1, unit: 'V' },
    { key: 'R', label: '负载电阻 R', min: 10, max: 500, step: 10, unit: 'Ω' },
  ],
  'anim-transformer': [
    { key: 'n1', label: '原线圈匝数 n₁', min: 10, max: 500, step: 10, unit: '匝' },
    { key: 'n2', label: '副线圈匝数 n₂', min: 10, max: 500, step: 10, unit: '匝' },
    { key: 'U1', label: '输入电压 U₁', min: 10, max: 500, step: 10, unit: 'V' },
    { key: 'R', label: '负载电阻 R', min: 5, max: 200, step: 5, unit: 'Ω' },
  ],
  'anim-power-transmission': [
    { key: 'P_send', label: '输送功率 P', min: 10000, max: 500000, step: 10000, unit: 'W' },
    { key: 'U_trans', label: '输电电压 U', min: 1000, max: 50000, step: 1000, unit: 'V' },
    { key: 'R_line', label: '输电线电阻 R', min: 1, max: 50, step: 1, unit: 'Ω' },
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
  const { mode, setMode, discoveryStep, setDiscoveryStep, nextDiscoveryStep, prevDiscoveryStep } = useAppStore()
  const { markAnimationViewed } = useProgressStore()
  const currentTimeRef = useRef(0)
  const [canvasDimmed, setCanvasDimmed] = useState(false)

  const config = id ? getAnimationConfig(id) : undefined

  // 支持发现模式的动画 ID 列表
  const discoverySupportedIds = ['anim-uniform-acceleration']
  const isDiscoverySupported = config ? discoverySupportedIds.includes(config.id) : false
  const isDiscoveryMode = mode === 'discovery' && isDiscoverySupported

  // 发现模式步骤定义
  const discoverySteps = isDiscoverySupported ? [
    {
      title: '观看运动过程',
      description: '点击播放，观察小车的运动过程。注意速度箭头和位置的变化。',
      hint: '速度箭头的长度代表速度大小，方向代表运动方向。',
      content: (
        <div className="text-xs text-neutral-500 py-2">
          <p>观察要点：</p>
          <ul className="list-disc ml-4 mt-1 space-y-1">
            <li>速度箭头如何变化？</li>
            <li>小车的运动快慢是否改变？</li>
            <li>加速度箭头是否保持不变？</li>
          </ul>
        </div>
      ),
    },
    {
      title: '分析频闪数据',
      description: '频闪点每隔 0.5s 记录一次小车的位置，观察数据变化规律。',
      hint: '查看动画区域的频闪数据表格。',
      content: (
        <div className="text-xs text-neutral-500 py-2">
          <p>频闪数据已显示在动画区域右上角。</p>
          <p className="mt-1">比较相邻时刻的速度差，有什么特点？</p>
        </div>
      ),
    },
    {
      title: '发现速度规律',
      description: '计算相邻时间间隔的速度差，发现速度变化的规律。',
      hint: 'Δv/Δt 的结果就是加速度 a',
      content: (
        <div className="text-xs text-neutral-500 py-2">
          <p>v-t 图的斜率 = Δv/Δt = a（常量）</p>
          <p className="mt-1">速度随时间均匀变化。</p>
        </div>
      ),
    },
    {
      title: '推导 v = v₀ + at',
      description: '速度随时间均匀变化，由此推导速度公式。',
      hint: '由 Δv = a·t 推导',
      content: (
        <div className="text-xs text-neutral-500 py-2">
          <p>由 Δv = a·t 得：v = v₀ + at</p>
          <p className="mt-1">推导过程见动画区域。</p>
        </div>
      ),
    },
    {
      title: '推导 x = v₀t + ½at²',
      description: 'v-t 图像与时间轴围成的面积就是位移。',
      hint: '梯形面积 = (上底 + 下底) × 高 / 2',
      content: (
        <div className="text-xs text-neutral-500 py-2">
          <p>v-t 图面积 = 位移 x</p>
          <p className="mt-1">x = (v₀ + v)·t / 2 = v₀t + ½at²</p>
        </div>
      ),
    },
    {
      title: '验证 v²-v₀²=2ax',
      description: '消去时间 t，推导速度与位移的关系式。',
      hint: '注意刹车死区！',
      content: (
        <div className="text-xs text-neutral-500 py-2">
          <p>由 v = v₀ + at 消去 t：</p>
          <p className="mt-1 font-bold">v² - v₀² = 2ax</p>
          {params.v0 > 0 && params.a < 0 && (
            <div className="mt-2 p-2 rounded text-xs space-y-1" style={{ backgroundColor: '#fef2f2' }}>
              <p className="font-bold" style={{ color: '#dc2626' }}>
                 刹车死区
              </p>
              <p className="text-neutral-700">
                t &gt; {(-params.v0 / params.a).toFixed(1)}s 时汽车已停止 v=0
              </p>
              <p className="text-neutral-700">
                盲目代入公式会得到负速度！
              </p>
            </div>
          )}
        </div>
      ),
    },
  ] : [] as DiscoveryStepData[]

  // 获取物理引擎数据以用于 V-T 图
  const physics = useUniformAccelerationPhysics(params.v0 ?? 0, params.a ?? 1.5, time, 100)

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

        {/* 模式切换按钮 */}
        {isDiscoverySupported && (
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
          </div>
        ) : undefined}
        center={
          <div className="flex flex-col h-full p-4 gap-4">
            {isDiscoveryMode ? (
              // 模式A：公式发现模式，保持原版组件内部布局
              <div className="w-full h-full bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
 
                <div className="flex-1 overflow-auto">
                  <ErrorBoundary resetKey={config.id}>
                    <Suspense
                      fallback={<div className="w-full h-full flex items-center justify-center text-neutral-400">加载动画中…</div>}
                    >
                      <UniformAccelerationDiscovery />
                    </Suspense>
                  </ErrorBoundary>
                </div>
                {/* 底部控制栏 */}
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
              // 模式B：动画模式，上部分(左参数+右图表)，下部分动画
              <>
                {discoverySupportedIds.includes(config?.id || '') && (
                  <div className="h-[60%] w-full flex flex-row gap-4 mb-4">
                    {/* 左侧参数区：仅显示特定公式 */}
                    <div className="w-[40%] h-full bg-white rounded-xl shadow-md p-6 flex flex-col justify-center">
                      <h3 className="text-lg font-bold text-neutral-800 mb-6">匀变速直线运动</h3>
                      <div className="text-sm text-neutral-700 space-y-4">
                        <p>初速度 v₀ = {params.v0 ?? 0} m/s</p>
                        <p>加速度 a = {params.a ?? 1.5} m/s²</p>
                        <p>时间 t = {time.toFixed(2)} s</p>
                        <p className="font-bold text-blue-700 pt-2 border-t">v = v₀ + at = {((params.v0 ?? 0) + (params.a ?? 1.5) * time).toFixed(2)} m/s</p>
                        <p className="font-bold text-green-700">s = v₀t + ½at² = {((params.v0 ?? 0) * time + 0.5 * (params.a ?? 1.5) * Math.pow(time, 2)).toFixed(2)} m</p>
                      </div>
                    </div>
                    {/* 右侧 V-T 图 */}
                    <div className="w-[60%] h-full bg-white rounded-xl shadow-md p-2">
                      <VTChart 
                        physics={physics} 
                        params={{ 
                          v0: params.v0 ?? 0, 
                          a: params.a ?? 0 
                        }}
                        time={time} // 传递 time
                      />
                    </div>
                  </div>
                )}
                {/* 下部分：动画区域 */}
                <div
                  className={`w-full bg-white rounded-xl shadow-md overflow-hidden ${discoverySupportedIds.includes(config?.id || '') ? 'h-[40%]' : 'h-full'}`}
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
                {/* 底部控制栏 */}
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
            <div className="p-4">
              <PhysicsPanel quantities={physicsQuantities} />
            </div>
          )
        }
      />
    </div>
  )
}
