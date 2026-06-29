import { GRAVITY, getLRRStateAtTime, precomputeLightRodRopeTrajectory } from '@/physics'
import { ENERGY_COLORS, PHYSICS_COLORS } from '@/theme/physics'
import type { PhysicsPanelData, PhysicsQuantity } from '../types'

export function buildLightRodRopeQuantities(
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[] = [],
): PhysicsPanelData {
  const m1 = params.m1 ?? 1.0
  const m2 = params.m2 ?? 1.0
  const constraint = params.constraint ?? 0 // 0=杆, 1=绳
  const L = constraint === 0 ? (params.L ?? 1.2) : 1.2
  const g = GRAVITY

  const trajectory = precomputeLightRodRopeTrajectory(m1, m2, L, g, constraint, 6)
  const state = getLRRStateAtTime(trajectory, time)

  if (constraint === 0) {
    // ── 轻杆双球 ──
    return {
      quantities: [
        ...base,
        { label: 'A球机械能', symbol: 'EA', value: state.EA, unit: 'J', color: ENERGY_COLORS.potentialGravity },
        { label: 'B球机械能', symbol: 'EB', value: state.EB, unit: 'J', color: ENERGY_COLORS.potentialElastic },
        { label: '系统总能量', symbol: 'E总', value: state.Etot, unit: 'J', highlight: 'extreme' as const, color: PHYSICS_COLORS.kineticEnergy },
        { label: '能量传输功率', symbol: 'P_trans', value: state.powerB, unit: 'W', highlight: state.powerB > 0.05 ? 'positive' as const : undefined },
        { label: 'A球线速度', symbol: 'v_A', value: state.vA, unit: 'm/s' },
        { label: 'B球线速度', symbol: 'v_B', value: state.vB, unit: 'm/s' },
      ],
      formulas: [
        { name: '运动学约束', latex: '\\omega_A = \\omega_B \\implies \\frac{v_A}{v_B} = \\frac{r_A}{r_B}', level: 'important' },
        { name: '能量与做功约束', latex: 'W_{\\text{杆}\\to A} + W_{\\text{杆}\\to B} = 0', level: 'core' },
        { name: '系统守恒', latex: '\\Delta E_A = -\\Delta E_B \\implies E_{\\text{总}} = \\text{常数}', level: 'core' },
      ],
      gaokaoPoints: [
        { text: '【个体不守恒，系统守恒】杆对单个小球做功（P≠0），导致个体机械能不守恒；但杆对系统做总功为 0，系统总机械能守恒（E-t 图中灰线绝对水平）。', importance: 'hard' as const },
        { text: '【无速度底线】杆既能拉也能"托"（支持力）。小球到达最高点的临界速度可以为 0。', importance: 'extend' as const },
      ],
    }
  }

  if (constraint === 1) {
    // ── 定滑轮绳连（跨定滑轮高考模型） ──
    return {
      quantities: [
        ...base,
        { label: 'A球机械能', symbol: 'EA', value: state.EA, unit: 'J', color: ENERGY_COLORS.potentialGravity },
        { label: 'B球机械能', symbol: 'EB', value: state.EB, unit: 'J', color: ENERGY_COLORS.potentialElastic },
        { label: '系统总能量', symbol: 'E总', value: state.Etot, unit: 'J', highlight: 'extreme' as const, color: PHYSICS_COLORS.kineticEnergy },
        { label: '绳中张力', symbol: 'T', value: state.T_B, unit: 'N', highlight: state.T_B < 0.01 ? 'zero' as const : undefined },
        { label: 'A球速度 (v_A)', symbol: 'v_A', value: state.vA, unit: 'm/s' },
        { label: 'B球速度 (v_B)', symbol: 'v_B', value: state.vB, unit: 'm/s' },
        { label: '沿绳速度分量', symbol: 'v_\\parallel', value: state.vr, unit: 'm/s', color: PHYSICS_COLORS.velocity },
      ],
      formulas: [
        { name: '初始瞬时张力', latex: 'T_0 = \\frac{g(1+\\cos\\theta_0)}{1/m_1 + 1/m_2}', note: '静止释放瞬时，绳中拉力大小', level: 'important' },
        { name: '初始瞬时加速度', latex: 'a_{A0} = g - \\frac{T_0}{m_1}, \\quad a_{Bt0} = g\\sin\\theta_0', note: 'A球竖直加速度，B球摆动切向加速度', level: 'important' },
        { name: '沿绳速度约束', latex: 'v_A = v_B\\cos\\phi = v_\\parallel', note: '由于绳不可伸长，两球沿绳分速度相等', level: 'core' },
        { name: '系统机械能守恒', latex: '\\Delta E_{\\text{k增}} = \\Delta E_{\\text{p减}}', note: '第一运动阶段系统总机械能守恒', level: 'core' },
      ],
      gaokaoPoints: [
        { text: '【初始瞬时】释放瞬时两球速度及向心加速度为0，但沿绳方向加速度大小相等。对两球分别列牛顿第二定律，可隔离解出初始拉力T_0与A、B球的加速度。', importance: 'gaokao' as const },
        { text: '【速度关联】任意时刻，小球 A 的竖直速度 v_A 等于小球 B 在沿绳方向的速度分量 v_∥。摆球 B 的合速度为沿绳与切向分速度的矢量和，因此恒有 v_B >= v_A。', importance: 'hard' as const },
        { text: '【能量守恒】第一运动阶段，系统无非保守外力做功，系统总机械能守恒。到达最低点或绳松弛瞬时，机械能守恒方程（动能增量等于势能减量）完全成立。', importance: 'core' as const },
      ],
    }
  }

  // ── 双绳串联（新模式） ──
  return {
    quantities: [
      ...base,
      { label: 'A球机械能', symbol: 'EA', value: state.EA, unit: 'J', color: ENERGY_COLORS.potentialGravity },
      { label: 'B球机械能', symbol: 'EB', value: state.EB, unit: 'J', color: ENERGY_COLORS.potentialElastic },
      { label: '系统总能量', symbol: 'E总', value: state.Etot, unit: 'J', highlight: 'extreme' as const, color: PHYSICS_COLORS.kineticEnergy },
      { label: 'OA绳张力', symbol: 'T_OA', value: state.T_A, unit: 'N', highlight: state.T_A < 0.01 ? 'zero' as const : undefined },
      { label: 'AB绳张力', symbol: 'T_AB', value: state.T_B, unit: 'N', highlight: state.T_B < 0.01 ? 'zero' as const : undefined },
      { label: 'A球速度 (v_A)', symbol: 'v_A', value: state.vA, unit: 'm/s' },
      { label: 'B球速度 (v_B)', symbol: 'v_B', value: state.vB, unit: 'm/s' },
      { label: '沿绳速度分量', symbol: 'v_\\parallel', value: state.vr, unit: 'm/s', color: PHYSICS_COLORS.velocity },
    ],
    formulas: [
      { name: '沿绳速度关联', latex: 'v_{A\\parallel} = v_{B\\parallel} = v_\\parallel', note: 'AB绳绷紧时，两球沿绳分速度相等', level: 'important' },
      { name: '单体与系统能量', latex: 'W_{\\text{绳}} = \\Delta E_{\\text{单}}, \\quad E_{\\text{系统}} = E_A + E_B', note: '绳不做功阶段各自守恒，绳做功阶段系统守恒', level: 'core' },
      { name: '拉直碰撞损失', latex: '\\Delta E_{\\text{内}} = \\frac{1}{2}\\frac{m_1 m_2}{m_1 + m_2}(v_{A\\parallel} - v_{B\\parallel})^2', note: '拉直瞬间沿绳方向发生完全非弹性碰撞，系统机械能损失', level: 'core' },
    ],
    gaokaoPoints: [
      { text: '【状态判断】绳子张力为 0 时进入松弛阶段，小球各自做抛体或单摆，各自机械能守恒；拉直瞬间发生碰撞，机械能发生损失。', importance: 'gaokao' as const },
      { text: '【速度关联】绷紧摆动时，小球 A 和 B 沿绳连线方向的速度分量相等。小球 B 的合速度为沿绳与垂直绳方向的速度矢量和。', importance: 'hard' as const },
      { text: '【高考口诀】记住高考解题三大步骤：“看绳辨状态，沿绳解速度，分段列守恒”。这能帮助你快速理清多状态突变大题。', importance: 'gaokao' as const },
    ],
  }
}
