import type { PhysicsPanelData, PhysicsQuantity } from './types'

export function buildMomentumQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  const base: PhysicsQuantity[] = []

  switch (animId) {
    case 'anim-momentum': {
      const advancedMode = params.advancedMode ?? 0
      const isAdvanced = advancedMode === 1

      if (!isAdvanced) {
        // ── 基础模式：单球 ──
        const m = params.m ?? 3
        const v = params.v ?? 4
        const p = m * v

        return {
          quantities: [
            ...base,
            { label: '质量 m', value: m.toFixed(1), unit: 'kg' },
            { label: '速度 v', value: v.toFixed(1), unit: 'm/s' },
            { label: '动量 p', value: p.toFixed(1), unit: 'kg·m/s', highlight: 'positive' as const },
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
        const mA = params.mA ?? 3
        const vA = params.vA ?? 5
        const mB = params.mB ?? 2
        const vB = params.vB ?? -3

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
      const advancedMode = params.advancedMode ?? 0
      const isAdvanced = advancedMode === 1

      if (!isAdvanced) {
        // ── 基础模式：缓冲垫碰撞 ──
        const m = params.m ?? 2
        const h = params.h ?? 2
        const k = params.k ?? 5
        const g = 9.8
        const v = Math.sqrt(2 * g * h)
        const dt = m / k
        const deltaP = m * v
        const F_avg = deltaP / dt + m * g

        return {
          quantities: [
            ...base,
            { label: '碰前速度', value: v.toFixed(2), unit: 'm/s' },
            { label: '动量变化', value: deltaP.toFixed(1), unit: 'kg·m/s' },
            { label: '碰撞时间', value: dt.toFixed(2), unit: 's' },
            { label: '平均冲力', value: F_avg.toFixed(1), unit: 'N', highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '碰前速度', latex: 'v = \\sqrt{2gh}', level: 'important' as const },
            { name: '动量定理', latex: 'F_{\\text{合}}\\Delta t = \\Delta p', level: 'core' as const },
            { name: '平均冲力', latex: 'F = \\frac{\\Delta p}{\\Delta t} + mg', level: 'important' as const },
          ],
          gaokaoPoints: [
            { text: '动量定理公式为 F_合Δt = Δp，注意必须是合外力', importance: 'core' as const },
          ],
        }
      } else {
        // ── 进阶模式：流体冲击 ──
        const rho = params.rho ?? 1000
        const S = params.S ?? 0.01
        const v_fluid = params.v_fluid ?? 5
        const alpha = params.alpha ?? 0
        const dm = rho * S * v_fluid * 0.001
        const p_initial = dm * v_fluid
        const p_final = -alpha * dm * v_fluid
        const F_impact = rho * S * v_fluid * v_fluid * (1 + alpha)

        return {
          quantities: [
            ...base,
            { label: '微元质量 Δm', value: dm.toFixed(4), unit: 'kg' },
            { label: '碰前总动量', value: p_initial.toFixed(2), unit: 'kg·m/s' },
            { label: '碰后总动量', value: p_final.toFixed(2), unit: 'kg·m/s' },
            { label: '动量变化率', value: (rho * S * v_fluid * v_fluid * (1 + alpha)).toFixed(1), unit: 'N' },
            { label: '挡板冲击力', value: F_impact.toFixed(1), unit: 'N', highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '微元质量', latex: '\\Delta m = \\rho S v \\Delta t', level: 'core' as const },
            { name: '冲击力', latex: 'F = \\rho S v^2 (1+\\alpha)', level: 'core' as const },
          ],
          gaokaoPoints: [
            { text: '流体冲击问题，核心是构建 Δm = ρSvΔt 微元模型', importance: 'gaokao' as const },
            { text: '区分流体碰后是"贴墙流下"还是"原速反弹"', importance: 'gaokao' as const },
          ],
        }
      }
    }
    case 'anim-impulse-concept': {
      const advancedMode = params.advancedMode ?? 0
      const isAdvanced = advancedMode === 1

      if (!isAdvanced) {
        // ── 基础模式：恒力 ──
        const F = params.F ?? 10
        const t_duration = params.t_duration ?? 3
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
        const FMax = params.FMax ?? 10
        const t_total = params.t_total ?? 3
        const forceType = params.forceType === 1 ? 'sine' : 'linear'
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
      const advancedMode = params.advancedMode ?? 0
      const isAdvanced = advancedMode === 1

      if (!isAdvanced) {
        // ── 基础模式：两球碰撞 ──
        const m1 = params.m1 ?? 3
        const v1 = params.v1 ?? 5
        const m2 = params.m2 ?? 2
        const v2 = params.v2 ?? 0
        const pInitial = m1 * v1 + m2 * v2
        const totalM = m1 + m2
        const vAfter = pInitial / totalM
        const p1After = m1 * vAfter
        const p2After = m2 * vAfter

        return {
          quantities: [
            ...base,
            { label: '碰前总动量', value: pInitial.toFixed(1), unit: 'kg·m/s' },
            { label: '碰后A动量', value: p1After.toFixed(1), unit: 'kg·m/s' },
            { label: '碰后B动量', value: p2After.toFixed(1), unit: 'kg·m/s' },
            { label: '碰后总动量', value: (p1After + p2After).toFixed(1), unit: 'kg·m/s', highlight: 'positive' as const },
          ],
          formulas: [
            { name: '动量守恒', latex: 'm_1v_1 + m_2v_2 = m_1v_1\' + m_2v_2\'', level: 'core' as const },
          ],
          gaokaoPoints: [
            { text: '守恒条件是系统合外力为零，内力交换不影响总动量', importance: 'core' as const },
          ],
        }
      } else {
        // ── 进阶模式：滑块-木板 ──
        const m_slider = params.m_slider ?? 1
        const M_board = params.M_board ?? 3
        const v0 = params.v0 ?? 6
        const mu = params.mu ?? 0.3
        const g = 9.8
        const pTotal = m_slider * v0
        const vCommon = (m_slider * v0) / (m_slider + M_board)
        const tCommon = (M_board * vCommon) / (mu * m_slider * g)
        const x1 = v0 * tCommon - 0.5 * mu * g * tCommon * tCommon
        const x2 = 0.5 * (mu * m_slider * g / M_board) * tCommon * tCommon
        const deltaX = x1 - x2
        const Q = mu * m_slider * g * deltaX

        return {
          quantities: [
            ...base,
            { label: '系统总动量', value: pTotal.toFixed(1), unit: 'kg·m/s' },
            { label: '共同速度', value: vCommon.toFixed(2), unit: 'm/s' },
            { label: '达共速时间', value: tCommon.toFixed(2), unit: 's' },
            { label: '滑块位移 x₁', value: x1.toFixed(2), unit: 'm' },
            { label: '木板位移 x₂', value: x2.toFixed(2), unit: 'm' },
            { label: '相对位移 Δx', value: deltaX.toFixed(2), unit: 'm' },
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
    case 'anim-collision': {
      const advancedMode = params.advancedMode ?? 0
      const isAdvanced = advancedMode === 1

      if (!isAdvanced) {
        // ── 基础模式 ──
        const m1 = params.m1 ?? 3
        const v1 = params.v1 ?? 5
        const m2 = params.m2 ?? 2
        const v2 = params.v2 ?? 0
        const isElastic = params.isElastic ?? 1
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
        const mA = params.mA ?? 3
        const vA = params.vA ?? 5
        const mB = params.mB ?? 2
        const kLoss = params.kLoss ?? 0
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
    default:
      return null
  }
}
