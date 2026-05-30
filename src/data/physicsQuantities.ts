/**
 * 动画物理量看板数据构建（数据层）。
 *
 * 统一调用 `src/physics/` 纯函数计算物理量，避免在页面层重复实现物理公式，
 * 并消除硬编码 g=9.8（改用 physics/constants 的 GRAVITY）。
 */
import {
  GRAVITY,
  GRAVITATIONAL_CONSTANT,
  EARTH_MASS,
  calculateUniformMotion,
  calculateAcceleratedMotion,
  calculateFreeFall,
  calculateProjectileMotion,
  calculateObliqueThrow,
  calculateCircularMotion,
  calculateOrbitalSpeed,
  calculateRestitutionCollision,
} from '@/physics'

export interface PhysicsQuantity {
  label: string
  value: number | string
  unit: string
  highlight?: 'positive' | 'negative' | 'zero' | 'extreme'
}

function sign(v: number): 'positive' | 'negative' | 'zero' {
  return v > 0 ? 'positive' : v < 0 ? 'negative' : 'zero'
}

export function buildPhysicsQuantities(
  animId: string,
  params: Record<string, number>,
  time: number
): PhysicsQuantity[] {
  const base: PhysicsQuantity[] = [{ label: '时间 t', value: time, unit: 's' }]

  switch (animId) {
    case 'anim-velocity': {
      const v = params.v ?? 5
      const { s } = calculateUniformMotion(v, time)
      return [...base, { label: '速度 v', value: v, unit: 'm/s' }, { label: '位移 s', value: s, unit: 'm' }]
    }
    case 'anim-acceleration': {
      const v0 = params.v0 ?? 0
      const a = params.a ?? 2
      const { v, s } = calculateAcceleratedMotion(v0, a, time)
      return [
        ...base,
        { label: '初速度 v₀', value: v0, unit: 'm/s' },
        { label: '加速度 a', value: a, unit: 'm/s²', highlight: sign(a) },
        { label: '速度 v', value: v, unit: 'm/s', highlight: sign(v) },
        { label: '位移 s', value: s, unit: 'm' },
      ]
    }
    case 'anim-uniform-acceleration': {
      const v0 = params.v0 ?? 0
      const a = params.a ?? 1.5
      const { v, s } = calculateAcceleratedMotion(v0, a, time)
      return [
        ...base,
        { label: '初速度 v₀', value: v0, unit: 'm/s' },
        { label: '加速度 a', value: a, unit: 'm/s²' },
        { label: '速度 v', value: v, unit: 'm/s' },
        { label: '位移 s', value: s, unit: 'm' },
      ]
    }
    case 'anim-free-fall': {
      const v0 = params.v0 ?? 0
      const g = params.g ?? GRAVITY
      const { v, y } = calculateFreeFall(v0, g, time)
      return [
        ...base,
        { label: '初速度 v₀', value: v0, unit: 'm/s' },
        { label: '重力加速度 g', value: g, unit: 'm/s²' },
        { label: '速度 v', value: v, unit: 'm/s' },
        { label: '位移 y', value: y, unit: 'm' },
      ]
    }
    case 'anim-vertical-throw': {
      const v0 = params.v0 ?? 15
      const g = params.g ?? GRAVITY
      // 竖直上抛：取向上为正，等价于自由落体公式中 g 取负
      const { v, y } = calculateFreeFall(v0, -g, time)
      return [
        ...base,
        { label: '初速度 v₀', value: v0, unit: 'm/s' },
        { label: '重力加速度 g', value: g, unit: 'm/s²' },
        { label: '速度 v', value: v, unit: 'm/s', highlight: sign(v) },
        { label: '位移 y', value: y, unit: 'm' },
      ]
    }
    case 'anim-projectile': {
      const v0x = params.v0x ?? 10
      const g = params.g ?? GRAVITY
      const { x, y, vy } = calculateProjectileMotion(v0x, g, time)
      return [
        ...base,
        { label: '水平速度 v₀', value: v0x, unit: 'm/s' },
        { label: '重力加速度 g', value: g, unit: 'm/s²' },
        { label: '水平位移 x', value: x, unit: 'm' },
        { label: '竖直速度 vy', value: vy, unit: 'm/s' },
        { label: '竖直位移 y', value: y, unit: 'm' },
      ]
    }
    case 'anim-oblique-throw': {
      const v0 = params.v0 ?? 15
      const angle = params.angle ?? 45
      const g = params.g ?? GRAVITY
      const { x, y, vx, vy } = calculateObliqueThrow(v0, angle, g, time)
      return [
        ...base,
        { label: '初速度 v₀', value: v0, unit: 'm/s' },
        { label: '抛射角 θ', value: angle, unit: '°' },
        { label: '水平速度 vx', value: vx, unit: 'm/s' },
        { label: '竖直速度 vy', value: vy, unit: 'm/s' },
        { label: '水平位移 x', value: x, unit: 'm' },
        { label: '竖直位移 y', value: y, unit: 'm' },
      ]
    }
    case 'anim-circular-motion': {
      const r = params.r ?? 2
      const omega = params.omega ?? 1
      const { v, period } = calculateCircularMotion(r, omega, time)
      return [
        ...base,
        { label: '半径 r', value: r, unit: 'm' },
        { label: '角速度 ω', value: omega, unit: 'rad/s' },
        { label: '线速度 v', value: v, unit: 'm/s' },
        { label: '周期 T', value: period, unit: 's' },
      ]
    }
    case 'anim-satellite': {
      const r = params.r ?? 7
      const rMeters = r * 1e6
      const { v, T } = calculateOrbitalSpeed(EARTH_MASS, rMeters, GRAVITATIONAL_CONSTANT)
      return [
        ...base,
        { label: '轨道半径 r', value: r, unit: '×10⁶ m' },
        { label: '线速度 v', value: v, unit: 'm/s' },
        { label: '周期 T', value: T / 60, unit: 'min' },
      ]
    }
    case 'anim-momentum-conservation': {
      const m1 = params.m1 ?? 2
      const m2 = params.m2 ?? 3
      const v1 = params.v1 ?? 5
      const v2 = params.v2 ?? 0
      const e = params.e ?? 0.8
      const { v1f, v2f, pBefore, pAfter } = calculateRestitutionCollision(m1, v1, m2, v2, e)
      return [
        ...base,
        { label: '质量 m₁', value: m1, unit: 'kg' },
        { label: '质量 m₂', value: m2, unit: 'kg' },
        { label: '初速度 v₁', value: v1, unit: 'm/s' },
        { label: '初速度 v₂', value: v2, unit: 'm/s' },
        { label: '恢复系数 e', value: e, unit: '' },
        { label: '碰前总动量', value: pBefore, unit: 'kg·m/s' },
        { label: '碰后总动量', value: pAfter, unit: 'kg·m/s' },
        { label: 'v₁末', value: v1f, unit: 'm/s' },
        { label: 'v₂末', value: v2f, unit: 'm/s' },
      ]
    }
    default:
      return [
        ...base,
        ...Object.entries(params).map(([key, value]) => ({ label: key, value, unit: '' })),
      ]
  }
}
