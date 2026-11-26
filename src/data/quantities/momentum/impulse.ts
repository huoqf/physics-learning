import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import {
  calculateFallVelocity,
  calculateAverageImpactForce,
  calculateCollisionTime,
  calculateFluidImpactForce,
} from '@/physics/momentumTheorem'
import { GRAVITY } from '@/physics/constants'

interface ImpulseParams {
  advancedMode: number
  m: number
  h: number
  k: number
  rho: number
  S: number
  v_fluid: number
  alpha: number
  F: number
  t_duration: number
  FMax: number
  t_total: number
  forceType: number
}

const DEFAULTS: ParamDefs<ImpulseParams> = {
  advancedMode: { default: 0 },
  m: { default: 2 },
  h: { default: 2 },
  k: { default: 5 },
  rho: { default: 1000 },
  S: { default: 0.01 },
  v_fluid: { default: 5 },
  alpha: { default: 0 },
  F: { default: 10 },
  t_duration: { default: 3 },
  FMax: { default: 10 },
  t_total: { default: 3 },
  forceType: { default: 0 },
}

export function handleImpulse(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-impulse' && animId !== 'anim-impulse-concept') return null
  const p = normalizeParams(params, DEFAULTS)

  if (animId === 'anim-impulse') {
    const advancedMode = p.advancedMode ?? 0
    const isAdvanced = advancedMode === 1
    const g = GRAVITY

    if (!isAdvanced) {
      const m = p.m ?? 2
      const h = p.h ?? 2
      const k = p.k ?? 5

      const fallV = calculateFallVelocity(h, g)
      const collisionDt = calculateCollisionTime(m, k)
      const F_avg = calculateAverageImpactForce(m, fallV, collisionDt, g)
      const fallTime = Math.sqrt((2 * h) / g)
      const totalTime = fallTime + collisionDt * 2
      const currentT = _time % (totalTime + 1)

      const F_max = F_avg * 2
      const currentImpulse = (() => {
        if (currentT <= fallTime) return 0
        if (currentT <= fallTime + collisionDt) {
          const dt = currentT - fallTime
          return 0.5 * F_max * ((dt * dt) / collisionDt)
        }
        if (currentT <= fallTime + collisionDt * 2) {
          const dt = currentT - fallTime - collisionDt
          const firstHalf = 0.5 * F_max * collisionDt
          const secondHalf = F_max * dt - 0.5 * F_max * ((dt * dt) / collisionDt)
          return firstHalf + secondHalf
        }
        return F_max * collisionDt
      })()

      const p1 = -(m * fallV)
      const totalCollisionDt = 2 * collisionDt
      const p2 = m * fallV

      return {
        quantities: [
          ...base,
          { label: '碰前动量 p₁', value: p1.toFixed(2), unit: 'kg·m/s', highlight: 'negative' as const },
          { label: '碰后末动量 p₂', value: p2.toFixed(2), unit: 'kg·m/s', highlight: 'positive' as const },
          { label: '当前支持力冲量 I_N', value: currentImpulse.toFixed(2), unit: 'N·s', highlight: 'extreme' as const },
          { label: '合外力总冲量 I_net', value: (2 * m * fallV).toFixed(2), unit: 'N·s', highlight: 'positive' as const },
          { label: '碰撞总时间 Δt', value: totalCollisionDt.toFixed(2), unit: 's' },
          { label: '平均支持力 F_avg', value: F_avg.toFixed(1), unit: 'N' },
        ],
        formulas: [
          { name: '动量变化量 (Δp)', latex: `\\Delta p = p_2 - p_1 = ${(2 * m * fallV).toFixed(2)}\\;\\text{kg·m/s}`, level: 'important' as const, condition: '取竖直向上为正方向，完全弹性反弹' },
          { name: '支持力总冲量 (I_N)', latex: `I_N = \\bar{F}_N\\Delta t = ${(2 * m * fallV + m * g * totalCollisionDt).toFixed(2)}\\;\\text{N·s}`, level: 'important' as const, condition: '取竖直向上为正方向，总接触时间 Δt = 2·Δt₁' },
          { name: '重力总冲量 (I_g)', latex: `I_g = mg\\Delta t = ${(m * g * totalCollisionDt).toFixed(2)}\\;\\text{N·s}`, level: 'important' as const, condition: '取大小，方向竖直向下' },
          { name: '动量定理公式', latex: 'I_N - I_g = \\Delta p', level: 'core' as const, condition: '取竖直向上为正方向，I_N 与 I_g 为各自大小', note: '重力冲量不可忽略，支持力冲量减去重力冲量等于动量变化量' },
        ],
        gaokaoPoints: [
          { text: '动量定理公式为 F_合Δt = Δp，必须使用合外力', importance: 'core' as const },
          { text: 'F-t 图线下方的面积等于对应的冲量', importance: 'gaokao' as const },
          { text: '反弹与停下的区别：弹性反弹时 Δp = mv - (-mv) = 2mv；若物体落入海绵等吸能停下，则 Δp = 0 - (-mv) = mv。本模型为完全弹性反弹模型', importance: 'gaokao' as const },
        ],
      }
    } else {
      const rho = p.rho ?? 1000
      const S = p.S ?? 0.01
      const v_fluid = p.v_fluid ?? 5
      const alpha = p.alpha ?? 0
      const impactForce = calculateFluidImpactForce(rho, S, v_fluid, alpha)
      const advancedXMax = 5
      const currentT_adv = _time % advancedXMax
      const currentImpulse_adv = impactForce * currentT_adv
      const dm_dt = rho * S * v_fluid

      return {
        quantities: [
          ...base,
          { label: '质量流量 dm/dt', value: dm_dt.toFixed(2), unit: 'kg/s' },
          { label: '流体冲击力 F', value: impactForce.toFixed(1), unit: 'N', highlight: 'extreme' as const },
          { label: '冲击时间 t', value: currentT_adv.toFixed(2), unit: 's' },
          { label: '累计冲击冲量 I', value: currentImpulse_adv.toFixed(2), unit: 'N·s', highlight: 'positive' as const },
        ],
        formulas: [
          { name: '碰前动量变化率 p_in\'', latex: `p_{\\text{in}}' = ${(rho * S * v_fluid * v_fluid).toFixed(1)}\\text{ N}`, level: 'important' as const },
          { name: '反弹动量变化率 p_out\'', latex: `p_{\\text{out}}' = -${(alpha * rho * S * v_fluid * v_fluid).toFixed(1)}\\text{ N}`, level: 'important' as const },
          { name: '冲击力公式', latex: 'F = p_{\\text{in}}\' - p_{\\text{out}}\'', level: 'core' as const, note: '冲击力等于流体流入与流出的动量变化率之差' },
        ],
        gaokaoPoints: [
          { text: '流体冲击物体的力等于单位时间内流体动量的变化量', importance: 'gaokao' as const },
          { text: '微元法是构建连续流体受力模型的关键物理方法', importance: 'core' as const },
        ],
      }
    }
  }

  // anim-impulse-concept
  const advancedMode = p.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  if (!isAdvanced) {
    const F = p.F ?? 10
    const t_duration = p.t_duration ?? 3
    const I = F * t_duration

    return {
      quantities: [
        ...base,
        { label: '恒力大小', value: F.toFixed(1), unit: 'N' },
        { label: '作用时间', value: t_duration.toFixed(1), unit: 's' },
        { label: '冲量大小', value: I.toFixed(1), unit: 'N·s', highlight: 'positive' as const },
      ],
      formulas: [
        { name: '冲量定义', latex: 'I = Ft', level: 'core' as const, condition: '仅适用于恒力作用过程（矢量，方向与恒力 F 一致）' },
      ],
      gaokaoPoints: [
        { text: '冲量是过程量，描述力在时间上的累积效应', importance: 'core' as const },
      ],
    }
  } else {
    const FMax = p.FMax ?? 10
    const t_total = p.t_total ?? 3
    const forceType = p.forceType === 1 ? 'sine' : 'linear'
    const totalI = forceType === 'sine'
      ? (FMax * t_total) / Math.PI * 2
      : FMax * t_total / 2
    const avgF = totalI / t_total

    return {
      quantities: [
        ...base,
        { label: '瞬时外力 F(t)', value: '—', unit: 'N' },
        { label: '平均外力 F̄', value: avgF.toFixed(1), unit: 'N' },
        { label: '微元面积积聚', value: '∑FΔt', unit: 'N·s' },
        { label: '总积分冲量', value: totalI.toFixed(1), unit: 'N·s', highlight: 'extreme' as const },
      ],
      formulas: [
        { name: '微元面积法', latex: 'I = \\sum F\\Delta t', level: 'core' as const, condition: '一般变力作用过程，可用 F-t 图像与时间轴所围面积求冲量' },
        { name: '积分表示（拓展）', latex: 'I = \\int F\\,dt', level: 'supplementary' as const, condition: '数学积分拓展记法，高中阶段通过 F-t 图像面积或动量定理求解' },
      ],
      gaokaoPoints: [
        { text: 'F-t 图像与时间轴所围面积等于该力在这段时间内的冲量', importance: 'gaokao' as const },
        { text: '变力冲量无法直接用 Ft 计算，常通过 F-t 图像微元面积或动量定理求解', importance: 'gaokao' as const },
      ],
    }
  }
}
