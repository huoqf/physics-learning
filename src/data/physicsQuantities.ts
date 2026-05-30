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
  calculateCoulombForce,
  calculateElectricField,
  calculateCapacitor,
  calculateOhmLaw,
  calculateSeriesResistance,
  calculateParallelResistance,
  calculateClosedCircuit,
} from '@/physics'

const COULOMB_K = 9e9
const VACUUM_PERMITTIVITY = 8.85e-12

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
    case 'anim-coulomb-law': {
      const q1 = params.q1 ?? 2
      const q2 = params.q2 ?? -3
      const r = params.r ?? 4
      const { F } = calculateCoulombForce(COULOMB_K, Math.abs(q1 * 1e-6), Math.abs(q2 * 1e-6), (r || 0.01) * 0.01)
      return [
        ...base,
        { label: '电量 q₁', value: q1, unit: 'μC' },
        { label: '电量 q₂', value: q2, unit: 'μC' },
        { label: '间距 r', value: r, unit: 'cm' },
        { label: '库仑力 F', value: F, unit: 'N' },
        { label: '作用', value: q1 * q2 < 0 ? '相互吸引' : '相互排斥', unit: '' },
      ]
    }
    case 'anim-electric-field': {
      const q = params.q ?? 5
      const rTest = params.rTest ?? 3
      const { E } = calculateElectricField(COULOMB_K, Math.abs(q * 1e-6), (rTest || 0.01) * 0.01)
      return [
        ...base,
        { label: '源电量 q', value: q, unit: 'μC' },
        { label: 'P 点距离 r', value: rTest, unit: 'cm' },
        { label: '场强 E', value: E, unit: 'N/C' },
        { label: '方向', value: q >= 0 ? '背离正电荷' : '指向负电荷', unit: '' },
      ]
    }
    case 'anim-charge-in-efield': {
      const E = (params.E ?? 10) * 1e3
      const q = (params.q ?? 2) * 1e-6
      const m = (params.m ?? 5) * 1e-6
      const v0 = params.v0 ?? 8
      const a = (q * E) / m
      const vy = a * time
      const x = v0 * time
      const y = 0.5 * a * time * time
      return [
        ...base,
        { label: '加速度 a', value: a, unit: 'm/s²' },
        { label: '初速度 v₀', value: v0, unit: 'm/s' },
        { label: '水平位移 x', value: x, unit: 'm' },
        { label: '竖直速度 vy', value: vy, unit: 'm/s' },
        { label: '竖直位移 y', value: y, unit: 'm' },
      ]
    }
    case 'anim-capacitor': {
      const S = params.S ?? 100
      const d = params.d ?? 5
      const epsilon_r = params.epsilon_r ?? 1
      const U = params.U ?? 12
      const { C } = calculateCapacitor(VACUUM_PERMITTIVITY * epsilon_r, S * 1e-4, d * 1e-3)
      return [
        ...base,
        { label: '正对面积 S', value: S, unit: 'cm²' },
        { label: '板间距 d', value: d, unit: 'mm' },
        { label: '相对介电常数 εᵣ', value: epsilon_r, unit: '' },
        { label: '电容 C', value: C * 1e12, unit: 'pF' },
        { label: '电荷量 Q', value: C * U * 1e9, unit: 'nC' },
      ]
    }
    case 'anim-ohm-law': {
      const U = params.U ?? 6
      const R = params.R ?? 3
      const { I } = calculateOhmLaw(U, R)
      return [
        ...base,
        { label: '电压 U', value: U, unit: 'V' },
        { label: '电阻 R', value: R, unit: 'Ω' },
        { label: '电流 I', value: I, unit: 'A' },
      ]
    }
    case 'anim-circuit-analysis': {
      const U = params.U ?? 12
      const R1 = params.R1 ?? 4
      const R2 = params.R2 ?? 2
      const series = (params.mode ?? 0) < 0.5
      const Rtotal = series
        ? calculateSeriesResistance([R1, R2]).R_total
        : calculateParallelResistance([R1, R2]).R_total
      const Itotal = Rtotal > 0 ? calculateOhmLaw(U, Rtotal).I : 0
      return [
        ...base,
        { label: '连接方式', value: series ? '串联' : '并联', unit: '' },
        { label: '电阻 R₁', value: R1, unit: 'Ω' },
        { label: '电阻 R₂', value: R2, unit: 'Ω' },
        { label: '总电阻 R总', value: Rtotal, unit: 'Ω' },
        { label: '总电流 I总', value: Itotal, unit: 'A' },
      ]
    }
    case 'anim-closed-circuit': {
      const EMF = params.EMF ?? 6
      const r = params.r ?? 1
      const R = params.R ?? 5
      const { I, U_terminal, P_output, eta } = calculateClosedCircuit(EMF, r, R)
      return [
        ...base,
        { label: '电动势 EMF', value: EMF, unit: 'V' },
        { label: '内阻 r', value: r, unit: 'Ω' },
        { label: '外电阻 R', value: R, unit: 'Ω' },
        { label: '电流 I', value: I, unit: 'A' },
        { label: '路端电压 U', value: U_terminal, unit: 'V' },
        { label: '输出功率 P出', value: P_output, unit: 'W' },
        { label: '效率 η', value: eta * 100, unit: '%' },
      ]
    }
    default:
      return [
        ...base,
        ...Object.entries(params).map(([key, value]) => ({ label: key, value, unit: '' })),
      ]
  }
}
