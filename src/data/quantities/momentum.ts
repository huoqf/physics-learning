import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from './types'
import { normalizeParams } from './types'
import { GRAVITY } from '@/physics/constants'
import {
  calculateFallVelocity,
  calculateAverageImpactForce,
  calculateCollisionTime,
  calculateFluidImpactForce,
} from '@/physics/momentumTheorem'
import {
  precomputeCurvedSlot,
  interpolateCurvedSlot,
  precomputeSpringBlocks,
  interpolateSpringBlocks,
  calculateManBoatState,
  getManBoatAutoMotion
} from '@/physics/momentumApplication'

/** 动量构建器参数类型 */
interface MomentumParams {
  advancedMode: number
  m: number
  v: number
  mA: number
  vA: number
  mB: number
  vB: number
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
  m1: number
  v1: number
  m2: number
  v2: number
  collisionType: number
  e_coefficient: number
  isElastic: number
  m_slider: number
  M_board: number
  mu: number
  L: number
  kLoss: number
  modelType: number
  m_block: number
  M_slot: number
  R_slot: number
  mA_spring: number
  mB_spring: number
  v0_spring: number
  k_spring: number
  m_person: number
  M_boat: number
  L_boat: number
  manBoatControl: number
  manRelS: number
  manVRel: number
}

const MOMENTUM_DEFAULTS: ParamDefs<MomentumParams> = {
  advancedMode: { default: 0 },
  m: { default: 3 },
  v: { default: 4 },
  mA: { default: 3 },
  vA: { default: 5 },
  mB: { default: 2 },
  vB: { default: -3 },
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
  m1: { default: 3 },
  v1: { default: 5 },
  m2: { default: 2 },
  v2: { default: 0 },
  collisionType: { default: 0 },
  e_coefficient: { default: 0.5 },
  isElastic: { default: 1 },
  m_slider: { default: 1 },
  M_board: { default: 3 },
  mu: { default: 0.3 },
  L: { default: 2 },
  kLoss: { default: 0 },
  modelType: { default: 0 },
  m_block: { default: 2 },
  M_slot: { default: 5 },
  R_slot: { default: 1.5 },
  mA_spring: { default: 2 },
  mB_spring: { default: 3 },
  v0_spring: { default: 5 },
  k_spring: { default: 20 },
  m_person: { default: 50 },
  M_boat: { default: 150 },
  L_boat: { default: 4 },
  manBoatControl: { default: 0 },
  manRelS: { default: 0 },
  manVRel: { default: 0 },
}

export function buildMomentumQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  const base: PhysicsQuantity[] = []
  const p = normalizeParams(params, MOMENTUM_DEFAULTS)

  switch (animId) {
    case 'anim-momentum': {
      const advancedMode = p.advancedMode ?? 0
      const isAdvanced = advancedMode === 1

      if (!isAdvanced) {
        // ── 基础模式：单球 ──
        const m = p.m ?? 3
        const v = p.v ?? 4
        const pVal = m * v

        return {
          quantities: [
            ...base,
            { label: '质量 m', value: m.toFixed(1), unit: 'kg' },
            { label: '速度 v', value: v.toFixed(1), unit: 'm/s' },
            { label: '动量 p', value: pVal.toFixed(1), unit: 'kg·m/s', highlight: 'positive' as const },
          ],
          formulas: [
            { name: '动量定义', latex: 'p = mv', level: 'core' as const },
            { name: '动量与动能关系', latex: 'E_k = \\frac{p^2}{2m}', level: 'important' as const, condition: '仅适用于动能与动量的数值关系' },
          ],
          gaokaoPoints: [
            { text: '动量是状态量，求某时刻动量须用该时刻的瞬时速度', importance: 'core' as const },
          ],
        }
      } else {
        // ── 进阶模式：双球一维 ──
        const mA = p.mA ?? 3
        const vA = p.vA ?? 5
        const mB = p.mB ?? 2
        const vB = p.vB ?? -3

        const pA = mA * vA
        const pB = mB * vB
        const pTotal = pA + pB
        const EkA = (pA * pA) / (2 * mA)
        const EkB = (pB * pB) / (2 * mB)

        return {
          quantities: [
            ...base,
            { label: 'A球动量 p_A', value: pA.toFixed(1), unit: 'kg·m/s', highlight: pA >= 0 ? 'positive' as const : 'negative' as const },
            { label: 'B球动量 p_B', value: pB.toFixed(1), unit: 'kg·m/s', highlight: pB >= 0 ? 'positive' as const : 'negative' as const },
            { label: '系统总动量 p_总', value: pTotal.toFixed(1), unit: 'kg·m/s', highlight: pTotal === 0 ? 'zero' as const : 'extreme' as const },
            { label: 'A球动能 E_kA', value: EkA.toFixed(1), unit: 'J' },
            { label: 'B球动能 E_kB', value: EkB.toFixed(1), unit: 'J' },
          ],
          formulas: [
            { name: '动量定义（一维）', latex: 'p = mv', level: 'core' as const, condition: '一维计算必须先规定正方向，用正负号表示方向' },
            { name: '系统总动量', latex: 'p_{\\text{总}} = p_A + p_B', level: 'core' as const },
            { name: '动量与动能转化', latex: 'E_k = \\frac{p^2}{2m}', level: 'important' as const, note: 'p 不变时，m↑ 则 E_k↓，动量大不代表动能一定大' },
          ],
          gaokaoPoints: [
            { text: '动量是矢量，一维计算必须先规定正方向，用正负号表示', importance: 'gaokao' as const },
            { text: '熟记 E_k = p²/(2m)，高考高频使用', importance: 'gaokao' as const },
            { text: '动量大则动能一定大？错！p 相同时 m 越大 E_k 越小', importance: 'hard' as const },
          ],
        }
      }
    }
    case 'anim-impulse': {
      const advancedMode = p.advancedMode ?? 0
      const isAdvanced = advancedMode === 1
      const g = GRAVITY

      if (!isAdvanced) {
        // ── 基础模式：缓冲垫碰撞 ──
        const m = p.m ?? 2
        const h = p.h ?? 2
        const k = p.k ?? 5
        const cushionMaxCompression = 30

        const fallV = calculateFallVelocity(h, g)
        const collisionDt = calculateCollisionTime(m, k)
        const F_avg = calculateAverageImpactForce(m, fallV, collisionDt, g)
        const fallTime = Math.sqrt((2 * h) / g)
        const totalTime = fallTime + collisionDt * 2
        const currentT = _time % (totalTime + 1)

        let phase: 'falling' | 'compressing' | 'recovering' | 'done'
        let cushionCompression = 0

        if (currentT < fallTime) {
          phase = 'falling'
        } else if (currentT < fallTime + collisionDt) {
          phase = 'compressing'
          const dt = currentT - fallTime
          const ratio = dt / collisionDt
          cushionCompression = ratio * cushionMaxCompression
          cushionCompression = ratio * cushionMaxCompression
        } else if (currentT < fallTime + collisionDt * 2) {
          phase = 'recovering'
          const dt = currentT - fallTime - collisionDt
          const ratio = 1 - dt / collisionDt
          cushionCompression = ratio * cushionMaxCompression
        } else {
          phase = 'done'
          cushionCompression = 0
        }

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
        const p2 = (() => {
          if (phase === 'falling') {
            return -(m * fallV * (currentT / fallTime))
          }
          if (phase === 'compressing' || phase === 'recovering') {
            return m * fallV * (1 - cushionCompression / cushionMaxCompression)
          }
          return 0
        })()

        return {
          quantities: [
            ...base,
            { label: '碰前动量 p₁', value: p1.toFixed(2), unit: 'kg·m/s', highlight: 'negative' as const },
            { label: '碰后动量 p₂', value: p2.toFixed(2), unit: 'kg·m/s', highlight: p2 >= 0 ? 'positive' as const : 'negative' as const },
            { label: '支持力冲量 I_N', value: currentImpulse.toFixed(2), unit: 'N·s', highlight: 'extreme' as const },
            { label: '合外力冲量 I_net', value: (2 * m * fallV).toFixed(2), unit: 'N·s', highlight: 'positive' as const },
            { label: '碰撞时间 Δt', value: collisionDt.toFixed(2), unit: 's' },
            { label: '平均支持力 F_avg', value: F_avg.toFixed(1), unit: 'N' },
          ],
          formulas: [
            { name: '动量变化量 (Δp)', latex: `\\Delta p = ${(2 * m * fallV).toFixed(2)}\\text{ kg·m/s}`, level: 'important' as const },
            { name: '支持力总冲量 (I_N)', latex: `I_N = ${(2 * m * fallV + 2 * m * g * collisionDt).toFixed(2)}\\text{ N·s}`, level: 'important' as const },
            { name: '重力总冲量 (I_g)', latex: `I_g = ${(2 * m * g * collisionDt).toFixed(2)}\\text{ N·s}`, level: 'important' as const },
            { name: '动量定理公式', latex: 'I_N - I_g = \\Delta p', level: 'core' as const, note: '重力冲量不可忽略，支持力冲量减去重力冲量等于动量变化量' },
          ],
          gaokaoPoints: [
            { text: '动量定理公式为 F_合Δt = Δp，必须使用合外力', importance: 'core' as const },
            { text: 'F-t 图线下方的面积等于对应的冲量', importance: 'gaokao' as const },
          ],
        }
      } else {
        // ── 进阶模式：流体冲击 ──
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
    case 'anim-impulse-concept': {
      const advancedMode = p.advancedMode ?? 0
      const isAdvanced = advancedMode === 1

      if (!isAdvanced) {
        // ── 基础模式：恒力 ──
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
            { name: '冲量定义', latex: 'I = Ft', level: 'core' as const },
          ],
          gaokaoPoints: [
            { text: '冲量是过程量，描述力在时间上的累积效应', importance: 'core' as const },
          ],
        }
      } else {
        // ── 进阶模式：变力 ──
        const FMax = p.FMax ?? 10
        const t_total = p.t_total ?? 3
        const forceType = p.forceType === 1 ? 'sine' : 'linear'
        // 解析积分
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
            { name: '微元法', latex: '\\Delta I = F\\Delta t', level: 'important' as const },
            { name: '积分冲量', latex: 'I = \\int F\\,dt', level: 'core' as const },
          ],
          gaokaoPoints: [
            { text: 'F-t 图像与时间轴所围面积等于该力在这段时间内的冲量', importance: 'gaokao' as const },
            { text: '变力冲量无法直接用 Ft 计算，高考常通过微元面积或动量定理求解', importance: 'gaokao' as const },
          ],
        }
      }
    }
    case 'anim-momentum-conservation': {
      const advancedMode = p.advancedMode ?? 0
      const isAdvanced = advancedMode === 1

      if (!isAdvanced) {
        // ── 基础模式：两球碰撞 ──
        const m1 = p.m1 ?? 3
        const v1 = p.v1 ?? 5
        const m2 = p.m2 ?? 2
        const v2 = p.v2 ?? 0
        const collisionType = p.collisionType ?? 0 // 0: 弹性, 1: 完全非弹性, 2: 恢复系数可调
        const e_coefficient = p.e_coefficient ?? 0.5

        let e = 1.0
        let typeName = '完全弹性碰撞'
        if (collisionType === 1) {
          e = 0.0
          typeName = '完全非弹性碰撞'
        } else if (collisionType === 2) {
          e = e_coefficient
          typeName = `非弹性碰撞 (e = ${e.toFixed(2)})`
        }

        const pInitial = m1 * v1 + m2 * v2
        const v1After = ((m1 - e * m2) * v1 + m2 * (1 + e) * v2) / (m1 + m2)
        const v2After = (m1 * (1 + e) * v1 + (m2 - e * m1) * v2) / (m1 + m2)

        const p1After = m1 * v1After
        const p2After = m2 * v2After
        const pTotalAfter = p1After + p2After

        const EkInitial = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2
        const EkAfter = 0.5 * m1 * v1After * v1After + 0.5 * m2 * v2After * v2After
        const EkLoss = EkInitial - EkAfter

        return {
          quantities: [
            ...base,
            { label: '碰撞类型', value: typeName, unit: '' },
            { label: '碰前总动量', value: pInitial.toFixed(1), unit: 'kg·m/s' },
            { label: '碰后A速度', value: v1After.toFixed(2), unit: 'm/s' },
            { label: '碰后B速度', value: v2After.toFixed(2), unit: 'm/s' },
            { label: '碰后总动量', value: pTotalAfter.toFixed(1), unit: 'kg·m/s', highlight: 'positive' as const },
            { label: '机械能损失', value: EkLoss.toFixed(2), unit: 'J', highlight: EkLoss > 0.01 ? 'extreme' : undefined },
          ],
          formulas: [
            { name: '动量守恒', latex: 'm_1v_1 + m_2v_2 = m_1v_1\' + m_2v_2\'', level: 'core' as const },
            { name: '恢复系数', latex: 'e = -\\frac{v_1\' - v_2\'}{v_1 - v_2}', level: 'important' as const },
          ],
          gaokaoPoints: [
            { text: '系统所受合外力为零，总动量在碰撞前后严格守恒', importance: 'core' as const },
            { text: '弹性碰撞 (e=1) 机械能守恒；完全非弹性碰撞 (e=0) 机械能损失最大', importance: 'gaokao' as const },
            { text: '高考常考恢复系数 e 在 0 到 1 之间的一般碰撞，此时动量守恒，动能减少', importance: 'gaokao' as const },
          ],
        }
      } else {
        // ── 进阶模式：滑块-木板 ──
        const m_slider = p.m_slider ?? 1
        const M_board = p.M_board ?? 3
        const v0 = p.v0 ?? 6
        const mu = p.mu ?? 0.3
        const L = p.L ?? 2
        const g = GRAVITY

        const pTotal = m_slider * v0
        const vCommon = (m_slider * v0) / (m_slider + M_board)
        const tCommon = (M_board * vCommon) / (mu * m_slider * g)
        const x1AtCommon = v0 * tCommon - 0.5 * mu * g * tCommon * tCommon
        const x2AtCommon = 0.5 * (mu * m_slider * g / M_board) * tCommon * tCommon
        const deltaXAtCommon = x1AtCommon - x2AtCommon

        const isFallen = deltaXAtCommon > L

        if (isFallen) {
          // 已经滑落飞出
          const a_rel = mu * g * (1 + m_slider / M_board)
          const tFall = (v0 - Math.sqrt(v0 * v0 - 2 * a_rel * L)) / a_rel
          const x1 = v0 * tFall - 0.5 * mu * g * tFall * tFall
          const x2 = 0.5 * (mu * m_slider * g / M_board) * tFall * tFall
          const Q = mu * m_slider * g * L
          const vSliderFall = v0 - mu * g * tFall
          const vBoardFall = (mu * m_slider * g / M_board) * tFall

          return {
            quantities: [
              ...base,
              { label: '系统总动量', value: pTotal.toFixed(1), unit: 'kg·m/s' },
              { label: '状态结论', value: '未达到共速，滑块已滑落', unit: '', highlight: 'negative' as const },
              { label: '滑落时刻', value: tFall.toFixed(2), unit: 's' },
              { label: '滑块滑落速度', value: vSliderFall.toFixed(2), unit: 'm/s' },
              { label: '木板滑落速度', value: vBoardFall.toFixed(2), unit: 'm/s' },
              { label: '滑块位移 x₁', value: x1.toFixed(2), unit: 'm' },
              { label: '木板位移 x₂', value: x2.toFixed(2), unit: 'm' },
              { label: '相对位移 Δx', value: L.toFixed(2), unit: 'm' },
              { label: '摩擦生热 Q', value: Q.toFixed(1), unit: 'J', highlight: 'extreme' as const },
            ],
            formulas: [
              { name: '滑落临界', latex: '\\Delta x_{\\text{相对}} = L', level: 'core' as const },
              { name: '摩擦生热', latex: 'Q = \\mu mgL', level: 'important' as const },
            ],
            gaokaoPoints: [
              { text: '当木板长度 L 小于达到共速所需的相对位移时，滑块会从木板上滑落', importance: 'gaokao' as const },
              { text: '滑落后，由于不受摩擦力，滑块与木板均做匀速直线运动，系统总动量守恒', importance: 'gaokao' as const },
              { text: '滑落临界问题是高考物理压轴题的高频考点，需注意相对位移与板长关系', importance: 'gaokao' as const },
            ],
          }
        } else {
          // 达共速，未滑落
          const Q = mu * m_slider * g * deltaXAtCommon

          return {
            quantities: [
              ...base,
              { label: '系统总动量', value: pTotal.toFixed(1), unit: 'kg·m/s' },
              { label: '状态结论', value: '达到共速，未滑落', unit: '', highlight: 'positive' as const },
              { label: '共同速度', value: vCommon.toFixed(2), unit: 'm/s' },
              { label: '达共速时间', value: tCommon.toFixed(2), unit: 's' },
              { label: '滑块位移 x₁', value: x1AtCommon.toFixed(2), unit: 'm' },
              { label: '木板位移 x₂', value: x2AtCommon.toFixed(2), unit: 'm' },
              { label: '相对位移 Δx', value: deltaXAtCommon.toFixed(2), unit: 'm' },
              { label: '摩擦生热 Q', value: Q.toFixed(1), unit: 'J', highlight: 'extreme' as const },
            ],
            formulas: [
              { name: '共同速度', latex: 'v_{\\text{共}} = \\frac{mv_0}{m+M}', level: 'core' as const },
              { name: '摩擦生热', latex: 'Q = \\mu mg \\Delta x_{\\text{相对}}', level: 'important' as const },
            ],
            gaokaoPoints: [
              { text: '滑块木板模型中，摩擦力为内力，系统总动量守恒', importance: 'gaokao' as const },
              { text: '达到共同速度是相对运动结束、内能损失最大的临界点', importance: 'gaokao' as const },
              { text: '系统内摩擦生热公式为 Q = f·Δx_相对', importance: 'gaokao' as const },
            ],
          }
        }
      }
    }
    case 'anim-collision': {
      const advancedMode = p.advancedMode ?? 0
      const isAdvanced = advancedMode === 1

      if (!isAdvanced) {
        // ── 基础模式 ──
        const m1 = p.m1 ?? 3
        const v1 = p.v1 ?? 5
        const m2 = p.m2 ?? 2
        const v2 = p.v2 ?? 0
        const isElastic = p.isElastic ?? 1
        const EkInitial = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2
        let EkFinal: number
        if (isElastic === 1) {
          const totalM = m1 + m2
          const v1f = ((m1 - m2) * v1 + 2 * m2 * v2) / totalM
          const v2f = ((m2 - m1) * v2 + 2 * m1 * v1) / totalM
          EkFinal = 0.5 * m1 * v1f * v1f + 0.5 * m2 * v2f * v2f
        } else {
          const vCommon = (m1 * v1 + m2 * v2) / (m1 + m2)
          EkFinal = 0.5 * (m1 + m2) * vCommon * vCommon
        }

        return {
          quantities: [
            ...base,
            { label: '初始动能', value: EkInitial.toFixed(1), unit: 'J' },
            { label: '末了动能', value: EkFinal.toFixed(1), unit: 'J' },
            { label: '机械能守恒', value: Math.abs(EkInitial - EkFinal) < 0.1 ? '✓ 守恒' : `损失 ${(EkInitial - EkFinal).toFixed(1)} J`, unit: '' },
          ],
          formulas: [
            { name: '动量守恒', latex: 'm_1v_1 + m_2v_2 = m_1v_1\' + m_2v_2\'', level: 'core' as const },
          ],
          gaokaoPoints: [
            { text: '完全弹性碰撞没有能量损失；完全非弹性碰撞损失机械能最多', importance: 'core' as const },
          ],
        }
      } else {
        // ── 进阶模式 ──
        const mA = p.mA ?? 3
        const vA = p.vA ?? 5
        const mB = p.mB ?? 2
        const kLoss = p.kLoss ?? 0
        const e = 1 - kLoss
        const totalM = mA + mB
        const vAf = (mA - e * mB) / totalM * vA
        const vBf = (1 + e) * mA / totalM * vA
        const deltaEkMax = (mA * mB) / (2 * totalM) * vA * vA

        return {
          quantities: [
            ...base,
            { label: "碰后 v_A'", value: vAf.toFixed(2), unit: 'm/s' },
            { label: "碰后 v_B'", value: vBf.toFixed(2), unit: 'm/s' },
            { label: '极大机械能损失', value: deltaEkMax.toFixed(1), unit: 'J', highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '碰后A速度', latex: 'v_A\' = \\frac{m_A - m_B}{m_A + m_B}v_A', level: 'core' as const },
            { name: '碰后B速度', latex: 'v_B\' = \\frac{2m_A}{m_A + m_B}v_A', level: 'core' as const },
            { name: '极大能量损失', latex: '\\Delta E_{k\\max} = \\frac{m_A m_B}{2(m_A+m_B)}v_A^2', level: 'important' as const },
          ],
          gaokaoPoints: [
            { text: '等质量完全弹性碰撞：两球速度直接交换', importance: 'gaokao' as const },
            { text: 'm_A≪m_B撞静止大球，小球原速反弹，大球近似静止', importance: 'gaokao' as const },
            { text: '碰撞必须满足：后球速度不大于前球，总机械能不增加', importance: 'gaokao' as const },
          ],
        }
      }
    }
    case 'anim-momentum-application': {
      const modelType = p.modelType ?? 0
      
      if (modelType === 0) {
        // 弧形槽-滑块模型
        const m = p.m_block ?? 2
        const M = p.M_slot ?? 5
        const R = p.R_slot ?? 1.5
        
        const states = precomputeCurvedSlot(m, M, R, 9.8, 6.0, 0.002)
        const st = interpolateCurvedSlot(states, _time)
        
        // 计算最低点极限秒杀速度（解析解）
        const v_block_bottom = -Math.sqrt((2 * 9.8 * R * M) / (M + m))
        const v_slot_bottom = -(m / M) * v_block_bottom
        
        return {
          quantities: [
            { label: '滑块质量 m', value: m.toFixed(1), unit: 'kg' },
            { label: '弧形槽质量 M', value: M.toFixed(1), unit: 'kg' },
            { label: '滑块水平速度 vx', value: st.v_x.toFixed(2), unit: 'm/s', highlight: st.v_x < 0 ? 'negative' as const : undefined },
            { label: '弧形槽速度 Vx', value: st.v_X.toFixed(2), unit: 'm/s', highlight: st.v_X > 0 ? 'positive' as const : undefined },
            { label: '最低点滑块速度 v_min', value: v_block_bottom.toFixed(2), unit: 'm/s', highlight: 'negative' as const },
            { label: '最低点槽速度 V_max', value: v_slot_bottom.toFixed(2), unit: 'm/s', highlight: 'positive' as const },
            { label: '相互作用弹力 N', value: st.N.toFixed(1), unit: 'N', highlight: 'extreme' as const },
            { label: '滑块动能 Ek', value: st.Ek_m.toFixed(1), unit: 'J' },
          ],
          formulas: [
            { name: '水平动量守恒', latex: 'm v_x + M V_x = 0', level: 'core' as const },
            { name: '机械能守恒', latex: '\\frac{1}{2}m(v_x^2 + v_y^2) + \\frac{1}{2}M V_x^2 + mgy = mgR', level: 'core' as const },
            { name: '最低点滑块速度', latex: 'v_x = -\\sqrt{\\frac{2gRM}{M+m}}', level: 'important' as const },
            { name: '最低点槽速度', latex: 'V_x = \\sqrt{\\frac{2gRm^2}{M(M+m)}}', level: 'important' as const },
          ],
          gaokaoPoints: [
            { text: '系统水平方向无外力且无摩擦，水平动量在下滑中严格守恒', importance: 'core' as const },
            { text: '由于重力做功，系统机械能守恒。求最低点速度时，联立代数方程最简单', importance: 'gaokao' as const },
            { text: '最低点时，弹力达到最大值，公式为 N = m(v_相对²/R + g)', importance: 'hard' as const },
          ],
        }
      } else if (modelType === 1) {
        // 弹簧双滑块
        const mA = p.mA_spring ?? 2
        const mB = p.mB_spring ?? 3
        const v0 = p.v0_spring ?? 5
        const k = p.k_spring ?? 20
        
        const states = precomputeSpringBlocks(mA, mB, v0, k, 1.5, 3.5, 6.0, 0.002)
        const st = interpolateSpringBlocks(states, _time)
        const pTotal = mA * v0
        
        return {
          quantities: [
            { label: '系统总动量 p_总', value: pTotal.toFixed(1), unit: 'kg·m/s' },
            { label: 'A球速度 v_A', value: st.vA.toFixed(2), unit: 'm/s' },
            { label: 'B球速度 v_B', value: st.vB.toFixed(2), unit: 'm/s' },
            { label: '弹簧形变量 δ', value: st.delta.toFixed(2), unit: 'm', highlight: st.delta > 0 ? 'extreme' as const : undefined },
            { label: '弹性势能 E_p', value: st.Ep.toFixed(1), unit: 'J', highlight: st.Ep > 0 ? 'positive' as const : undefined },
            { label: '系统总能量 E_总', value: st.Etotal.toFixed(1), unit: 'J' },
          ],
          formulas: [
            { name: '动量守恒', latex: 'm_A v_A + m_B v_B = m_A v_0', level: 'core' as const },
            { name: '能量守恒', latex: '\\frac{1}{2}m_A v_A^2 + \\frac{1}{2}m_B v_B^2 + \\frac{1}{2}k \\delta^2 = \\frac{1}{2}m_A v_0^2', level: 'core' as const },
            { name: '共速（压缩最短）速度', latex: 'v_{\\text{共}} = \\frac{m_A v_0}{m_A + m_B}', level: 'important' as const },
          ],
          gaokaoPoints: [
            { text: '弹簧压缩量最大（共速）时，系统弹性势能最大，动能最小', importance: 'core' as const },
            { text: '弹簧恢复原长（且即将分离）时，两滑块速度差最大，能量全部转化为动能', importance: 'gaokao' as const },
            { text: '若弹簧不与滑块粘连，恢复原长即为两滑块的分离临界点', importance: 'hard' as const },
          ],
        }
      } else {
        // 人船模型
        const m = p.m_person ?? 50
        const M = p.M_boat ?? 150
        const L = p.L_boat ?? 4
        const manBoatControl = p.manBoatControl ?? 0
        const manRelS = p.manRelS ?? 0
        const manVRel = p.manVRel ?? 0
        
        let s = manRelS
        let v_rel = manVRel
        if (manBoatControl === 0) {
          const motion = getManBoatAutoMotion(_time, L, 4.0)
          s = motion.s
          v_rel = motion.v_rel
        }
        
        const st = calculateManBoatState(s, v_rel, m, M, L)
        
        // 计算绝对位移（初始绝对位置 x_0 = -(M*L*0.5)/(m+M)）
        const x0 = -(M * L * 0.5) / (m + M)
        const disp_person = st.x_person - x0
        const disp_boat = st.x_boat - x0
        
        return {
          quantities: [
            { label: '人绝对位置 x1', value: st.x_person.toFixed(2), unit: 'm', highlight: 'positive' as const },
            { label: '船绝对位置 x2', value: st.x_boat.toFixed(2), unit: 'm', highlight: 'negative' as const },
            { label: '系统总质心 x_cm', value: st.x_cm.toFixed(3), unit: 'm', highlight: 'zero' as const },
            { label: '人绝对速度 v1', value: st.v_person.toFixed(2), unit: 'm/s' },
            { label: '船绝对速度 v2', value: st.v_boat.toFixed(2), unit: 'm/s' },
            { label: '人绝对位移 s1', value: disp_person.toFixed(2), unit: 'm', highlight: 'positive' as const },
            { label: '船绝对位移 s2', value: disp_boat.toFixed(2), unit: 'm', highlight: 'negative' as const },
            { label: '人位移乘积 m*s1', value: (m * Math.abs(disp_person)).toFixed(1), unit: 'kg·m', highlight: 'extreme' as const },
            { label: '船位移乘积 M*s2', value: (M * Math.abs(disp_boat)).toFixed(1), unit: 'kg·m', highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '瞬时动量平衡', latex: 'm v_1 + M v_2 = 0', level: 'core' as const },
            { name: '位移守恒关系', latex: 'm x_1 + M x_2 = 0 \\implies m x_1 = M x_2', level: 'core' as const },
            { name: '质心不变公式', latex: 'x_{\\text{cm}} = \\frac{m x_1 + M x_boatCenter}{m + M} = \\text{const}', level: 'important' as const },
          ],
          gaokaoPoints: [
            { text: '系统初始静止且水平方向无外力，系统的质心坐标绝对守恒', importance: 'core' as const },
            { text: '位移关系 m s1 = M s2 中的位移必须是以地面为参考系的绝对位移', importance: 'gaokao' as const },
            { text: '本模型适用于人走船停、人跑船动等过程，不受人走动速度是否均匀的影响', importance: 'gaokao' as const },
          ],
        }
      }
    }
    default:
      return null
  }
}
