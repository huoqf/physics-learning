/**
 * 能量与功动画物理量看板数据构建。
 */
import {
  GRAVITY,
  calculateWorkBasic,
  calculateWorkAdvanced,
  classifyWorkType,
  calculateConstantPowerParams,
  calculateConstantAccelParams,
  getPowerStateAtTime,
  precomputeConstantPowerTrajectory,
  precomputeConstantAccelTrajectory,
  precomputeConstantKETrajectory,
  precomputeCurvedTrackTrajectory,
  getKEStateAtTime,
  precomputeGravityTrajectory,
  precomputeSpringTrajectory,
  getPEStateAtTime,
  precomputePendulumTrajectory,
  precomputeValleyTrajectory,
  getECStateAtTime,
  precomputeVerticalSpringTrajectory,
  getVSStateAtTime,
  precomputeLightRodRopeTrajectory,
  getLRRStateAtTime,
} from '../../physics'
import type { PhysicsPanelData, PhysicsQuantity } from './types'
import { PHYSICS_COLORS, ENERGY_COLORS } from '@/theme/physics'


export function buildEnergyQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  const base: PhysicsQuantity[] = []

  switch (animId) {
    case 'anim-power': {
      const mode = params.mode ?? 0
      const P_rated = params.P ?? 60000
      const m = params.m ?? 2000
      const f = params.f ?? 2000
      const a_target = params.a ?? 1.5

      if (mode === 0) {
        // ── 基础模式：恒定功率起动 ──
        const cpParams = calculateConstantPowerParams(P_rated, m, f)
        const trajectory = precomputeConstantPowerTrajectory(P_rated, m, f, 30)
        const state = getPowerStateAtTime(trajectory, time)

        return {
          quantities: [
            ...base,
            { label: '速度 v', value: state.v.toFixed(1), unit: 'm/s' },
            { label: '牵引力 F', value: state.F.toFixed(0), unit: 'N' },
            { label: '加速度 a', value: state.a.toFixed(2), unit: 'm/s²' },
            { label: '实际功率 P', value: (state.P / 1000).toFixed(1), unit: 'kW' },
            { label: '最大速度 vmax', value: cpParams.v_max.toFixed(1), unit: 'm/s', highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '牵引力', latex: 'F = \\frac{P}{v}', note: '低速时限流 F_max = 3f' },
            { name: '加速度', latex: 'a = \\frac{F - f}{m}' },
            { name: '最大速度', latex: 'v_{\\max} = \\frac{P}{f}' },
          ],
          gaokaoPoints: [
            { text: '恒定功率起动：F=P/v，随速度增大牵引力减小，加速度减小，最终匀速。', importance: 'core' as const },
            { text: 'v=0 时 F 理论上无穷大，实际存在最大牵引力限制（低速限流）。', importance: 'gaokao' as const },
            { text: 'v-t 图为一条先陡后缓的曲线，渐近线为 vmax=P/f。', importance: 'hard' as const },
          ],
        }
      } else {
        // ── 进阶模式：恒定加速度起动 ──
        const caParams = calculateConstantAccelParams(P_rated, m, f, a_target)
        const { points: trajectory } = precomputeConstantAccelTrajectory(P_rated, m, f, a_target, 30)
        const state = getPowerStateAtTime(trajectory, time)

        return {
          quantities: [
            ...base,
            { label: '当前阶段', value: state.phase === 0 ? '匀加速' : state.phase === 1 ? '变加速' : '匀速', unit: '', highlight: state.phase === 0 ? 'positive' as const : state.phase === 1 ? 'negative' as const : 'zero' as const },
            { label: '速度 v', value: state.v.toFixed(1), unit: 'm/s' },
            { label: '牵引力 F', value: state.F.toFixed(0), unit: 'N' },
            { label: '加速度 a', value: state.a.toFixed(2), unit: 'm/s²' },
            { label: '实际功率 P', value: (state.P / 1000).toFixed(1), unit: 'kW' },
            { label: '临界速度 vc', value: caParams.v_c.toFixed(1), unit: 'm/s', highlight: 'extreme' as const },
            { label: '最大速度 vmax', value: caParams.v_max.toFixed(1), unit: 'm/s', highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '匀加速牵引力', latex: 'F = ma + f', condition: '第一阶段（匀加速），F 恒定' },
            { name: '临界速度', latex: 'v_c = \\frac{P_{\\text{rated}}}{ma + f}', note: '匀加速阶段结束时的速度' },
            { name: '变加速牵引力', latex: 'F = \\frac{P_{\\text{rated}}}{v}', condition: '第二阶段（恒功率），F 随 v 增大而减小' },
            { name: '最大速度', latex: 'v_{\\max} = \\frac{P_{\\text{rated}}}{f}' },
          ],
          gaokaoPoints: [
            { text: '恒定加速度起动分两阶段：先匀加速（F 恒定，P 递增），达到额定功率后变加速（P 恒定，F 递减）。', importance: 'core' as const },
            { text: '拐点 vc=Prated/(ma+f) 是高考高频考点，v-t 图在此处由直线变为曲线。', importance: 'gaokao' as const },
            { text: '两种起动模型最终都达到 vmax=Prated/f，区别在于到达的方式不同。', importance: 'hard' as const },
          ],
        }
      }
    }
    case 'anim-kinetic-energy': {
      const mode = params.mode ?? 0
      const m = params.m ?? 2
      const v0 = params.v0 ?? 0
      const F_pull = params.F ?? 15
      const s_target = params.s ?? 6
      const R = params.R ?? 5
      const mu = params.mu ?? 0.15
      if (mode === 0) {
        // ── 基础普通模式：恒力拉物块（撤去拉力） ──
        const x_end = s_target * 1.6
        const { points: trajectory } = precomputeConstantKETrajectory(m, v0, F_pull, s_target, x_end)
        const state = getKEStateAtTime(trajectory, time)
        const initialEk = 0.5 * m * v0 * v0
        const deltaEk = state.Ek - initialEk

        return {
          quantities: [
            ...base,
            { label: '运动状态', value: state.phase === 0 ? '受力加速中' : '拉力已撤去(匀速)', unit: '', highlight: state.phase === 0 ? 'positive' as const : undefined },
            { label: '实时速度 v', value: state.v.toFixed(2), unit: 'm/s' },
            { label: '拉力功 W_拉', value: state.W.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '动能变化量 ΔEk', value: deltaEk.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '实时动能 Ek', value: state.Ek.toFixed(1), unit: 'J' },
          ],
          formulas: [
            { name: '拉力功', latex: 'W = F \\cdot s', level: 'core', condition: '拉力作用阶段' },
            { name: '动能定义', latex: 'E_k = \\frac{1}{2}mv^2', level: 'core' },
            { name: '动能定理', latex: 'W = \\Delta E_k = E_{k\\text{末}} - E_{k\\text{初}}', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '动能是状态量，功是过程量。动能定理是状态变化与过程做功的纽带。', importance: 'core' as const },
            { text: '动能定理 W = ΔEk 适用于任何外力（包括恒力与变力）。', importance: 'gaokao' as const },
            { text: '合外力做的总功等于物体动能的变化量，注意正负号相加。', importance: 'basic' as const },
          ],
        }
      } else {
        // ── 进阶模式：物块圆弧曲面轨道下滑（变力做功） ──
        const x_end = (519 / 102) * R
        const { points: trajectory } = precomputeCurvedTrackTrajectory(m, v0, R, mu, x_end)
        const state = getKEStateAtTime(trajectory, time)
        const initialEk = 0.5 * m * v0 * v0
        const deltaEk = state.Ek - initialEk

        // 重力做功 W_G 存放在 state.Ep 中，合力功存放在 state.W 中
        const WG = state.Ep
        const Wf = state.W - WG // 摩擦力负功

        return {
          quantities: [
            ...base,
            { label: '运动状态', value: state.phase === 0 ? '曲面下滑中' : '已至水平面(匀速)', unit: '', highlight: state.phase === 0 ? 'positive' as const : undefined },
            { label: '下滑高度 y', value: state.y.toFixed(2), unit: 'm' },
            { label: '重力正功 W_重', value: `+${WG.toFixed(1)}`, unit: 'J', highlight: 'positive' as const },
            { label: '摩擦力功 W_摩', value: Wf.toFixed(1), unit: 'J', highlight: 'negative' as const },
            { label: '合外力总功 W_总', value: state.W.toFixed(1), unit: 'J', highlight: state.W >= 0 ? 'positive' as const : 'negative' as const },
            { label: '动能变化量 ΔEk', value: (deltaEk >= 0 ? '+' : '') + deltaEk.toFixed(1), unit: 'J', highlight: deltaEk >= 0 ? 'positive' as const : 'negative' as const },
            { label: '实时速度 v', value: state.v.toFixed(2), unit: 'm/s' },
          ],
          formulas: [
            { name: '重力做正功', latex: 'W_{\\text{重}} = mgh', level: 'core', condition: '与曲面路径无关' },
            { name: '摩擦变力做功', latex: 'W_{\\text{摩}} = \\int -f \\, ds', level: 'important', note: '切向摩擦力 f = \\mu N 随速度与角度变化' },
            { name: '动能定理', latex: 'W_{\\text{总}} = W_{\\text{重}} + W_{\\text{摩}} = \\Delta E_k', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '重力是恒力，在曲面下滑时位移方向时刻改变，但功只与垂直高度差相关：W_重 = mgh。', importance: 'core' as const },
            { text: '摩擦力是典型的变力，大小随支持力 N = mg·cosθ + mv²/R 实时变大。求变摩擦力功通常优先使用动能定理：W_摩 = ΔEk - W_重。', importance: 'gaokao' as const },
            { text: '在变加速度曲线运动中，应用动能定理直接跳过了向心力公式与牛二定律复杂的非线性积分，是高考解答题的首选法则。', importance: 'hard' as const },
          ],
        }
      }
    }
    case 'anim-potential-energy': {
      const mode = params.mode ?? 0
      const m = params.m ?? 2
      const g = params.g ?? 9.8
      const y0 = params.y0 ?? 8
      const y_ref = params.y_ref ?? 3
      const k = params.k ?? 100
      const x0 = params.x0 ?? 2.0

      if (mode === 0) {
        // ── 重力势能模式 ──
        const trajectory = precomputeGravityTrajectory(m, g, y0, y_ref, 0.7, 15)
        const state = getPEStateAtTime(trajectory, time)

        return {
          quantities: [
            ...base,
            { label: '相对零势能高度 h', value: (state.pos - y_ref).toFixed(2), unit: 'm' },
            { label: '实时高度 y', value: state.pos.toFixed(2), unit: 'm' },
            { label: '重力做功 W_重', value: state.W.toFixed(1), unit: 'J', highlight: state.W >= 0 ? 'positive' as const : 'negative' as const },
            { label: '重力势能 Ep', value: state.Ep.toFixed(1), unit: 'J', highlight: state.Ep >= 0 ? 'positive' as const : 'negative' as const },
            { label: '势能变化量 ΔEp', value: (state.deltaEp >= 0 ? '+' : '') + state.deltaEp.toFixed(1), unit: 'J', highlight: state.deltaEp >= 0 ? 'positive' as const : 'negative' as const },
            { label: '实时速度 v', value: state.v.toFixed(2), unit: 'm/s' },
          ],
          formulas: [
            { name: '重力势能', latex: 'E_p = mg(y - y_{\\text{ref}})', note: '零势能面下方为负值', level: 'core' },
            { name: '重力做功与能变', latex: 'W_G = -\\Delta E_p = E_{p1} - E_{p2}', note: '重力做功只与初末高度差有关', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '重力势能 Ep = mgh 中的 h 是相对于零势能面的高度。势能的正负仅代表比参考面高还是低。', importance: 'core' as const },
            { text: '重力势能是物体和地球系统共有的，不能脱离地球谈物体的重力势能。', importance: 'basic' as const },
            { text: '重力做正功势能减少，克服重力做功势能增加，且 WG = -ΔEp 严格成立。', importance: 'gaokao' as const },
            { text: '零势能面的选择是任意的，不同参考面下物体的势能值不同，但下落时的功与势能变化量 ΔEp 恒定。', importance: 'hard' as const },
          ],
        }
      } else {
        // ── 弹性势能模式 ──
        const trajectory = precomputeSpringTrajectory(m, k, x0, 15)
        const state = getPEStateAtTime(trajectory, time)

        return {
          quantities: [
            ...base,
            { label: '弹簧形变量 x', value: state.pos.toFixed(2), unit: 'm' },
            { label: '实时弹力 F_弹', value: state.F.toFixed(1), unit: 'N', highlight: Math.abs(state.F) > 0.05 ? 'positive' as const : undefined },
            { label: '弹性势能 E_p弹', value: state.Ep.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '弹力做功 W_弹', value: state.W.toFixed(1), unit: 'J', highlight: state.W >= 0 ? 'positive' as const : 'negative' as const },
            { label: '动能 E_k', value: state.Ek.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '实时速度 v', value: state.v.toFixed(2), unit: 'm/s' },
          ],
          formulas: [
            { name: '胡克定律', latex: 'F_s = -kx', note: '恢复力方向与形变方向相反', level: 'core' },
            { name: '弹性势能', latex: 'E_{pe} = \\frac{1}{2}kx^2', note: '拉伸或压缩相同位移弹性势能相等', level: 'core' },
            { name: '弹力功与能变', latex: 'W_s = -\\Delta E_{pe} = \\frac{1}{2}kx_1^2 - \\frac{1}{2}kx_2^2', level: 'important' },
          ],
          gaokaoPoints: [
            { text: '弹性势能的零点通常规定在弹簧处于自然原长处，拉伸和压缩时势能均非负（Epe ∝ x²）。', importance: 'core' as const },
            { text: '弹力是典型的随位移线性改变的变力。求弹力功可使用 F-x 面积积分或弹性势能公式。', importance: 'gaokao' as const },
            { text: '弹力做正功弹性势能减少，弹力做负功（克服弹力）弹性势能增加：Ws = -ΔEpe。', importance: 'core' as const },
          ],
        }
      }
    }
    case 'anim-energy-conservation': {
      const mode = params.mode ?? 0
      const m = params.m ?? 2
      const g = params.g ?? 9.8
      const theta0 = params.theta0 ?? 45
      const L = params.L ?? 5
      const R = params.R ?? 5
      const mu = params.mu ?? 0.1
      const hRef = params.hRef ?? 0.0
      const E_offset = m * g * hRef

      if (mode === 0) {
        // ── 单摆模式 ──
        const trajectory = precomputePendulumTrajectory(m, L, theta0, g, 15)
        const state = getECStateAtTime(trajectory, time)
        const thetaDeg = (state.theta * 180) / Math.PI

        const Ep_adj = state.Ep - E_offset
        const Etot_adj = state.Etot - E_offset

        return {
          quantities: [
            ...base,
            { label: '摆角 θ', value: `${thetaDeg.toFixed(1)}°`, unit: '' },
            { label: '重力势能 Ep', value: Ep_adj.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '实时动能 Ek', value: state.Ek.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '总机械能 E', value: Etot_adj.toFixed(1), unit: 'J', highlight: 'extreme' as const },
            { label: '实时速度 v', value: state.v.toFixed(2), unit: 'm/s' },
          ],
          formulas: [
            { name: '摆球高度', latex: 'h = L(1 - \\cos\\theta)', note: '以最低点为零参考面时', level: 'important' },
            { name: '重力势能', latex: 'E_p = mg(h - h_{\\text{参}})', note: 'h为距离最低点高度，h_参为零势能面高度', level: 'core' },
            { name: '机械能守恒', latex: 'E_k + E_p = \\text{常量}', level: 'core', condition: '无空气阻力下' },
          ],
          gaokaoPoints: [
            { text: '单摆振动过程中重力与拉力的合力提供回复力，仅有重力做功，系统机械能严格守恒。', importance: 'core' as const },
            { text: '在最高点小球速度为0，动能为0，重力势能达到最大值；在最低点高度为0，势能为0，速度达到最大值。', importance: 'basic' as const },
            { text: '动能和重力势能随着往复摆动进行此消彼长的正弦转化，总和恒定不变。', importance: 'gaokao' as const },
          ],
        }
      } else {
        // ── 山谷过山车阻尼模式 ──
        const trajectory = precomputeValleyTrajectory(m, R, mu, theta0, g, 15)
        const state = getECStateAtTime(trajectory, time)
        const thetaDeg = (state.theta * 180) / Math.PI

        const Ep_adj = state.Ep - E_offset
        const Emech_adj = state.Ep + state.Ek - E_offset
        const Etot_adj = state.Etot - E_offset

        return {
          quantities: [
            ...base,
            { label: '当前位置 θ', value: `${thetaDeg.toFixed(1)}°`, unit: '' },
            { label: '重力势能 Ep', value: Ep_adj.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '实时动能 Ek', value: state.Ek.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '机械能 E_机', value: Emech_adj.toFixed(1), unit: 'J' },
            { label: '内能(生热) Q', value: state.Q.toFixed(1), unit: 'J', highlight: 'negative' as const },
            { label: '总能量 E_总', value: Etot_adj.toFixed(1), unit: 'J', highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '支持力', latex: 'F_N = mg\\cos\\theta + \\frac{mv^2}{R}', note: '凹轨道底部滑块压力最大', level: 'important' },
            { name: '摩擦力', latex: 'f = \\mu F_N', level: 'core' },
            { name: '功能关系', latex: 'Q = \\Delta E_{\\text{损}} = E_{\\text{机初}} - E_{\\text{机末}}', note: '内能增加等于系统机械能的减少', level: 'core' },
            { name: '能量守恒', latex: 'E_k + E_p + Q = E_0', level: 'core', condition: '机械能不守恒，但总能量守恒' },
          ],
          gaokaoPoints: [
            { text: '在有摩擦阻力的情况下，滑块受阻力做负功，系统机械能不断耗散减少。', importance: 'core' as const },
            { text: '摩擦力做负功，使机械能转化为等量的内能（摩擦生热 Q），系统总能量严格守恒。', importance: 'gaokao' as const },
            { text: '滑块在往复摆动幅度逐渐变小后，若滑到最高点时重力切向分力小于最大静摩擦力（|tanθ| ≤ μ），将卡死停在坡上。', importance: 'hard' as const },
          ],
        }
      }
    }
    case 'anim-vertical-spring': {
      const m = params.m ?? 0.5
      const k = params.k ?? 50
      const h = params.h ?? 0.8
      const g = GRAVITY

      const trajectory = precomputeVerticalSpringTrajectory(m, k, h, g, 15)
      const state = getVSStateAtTime(trajectory, time)
      const xB = (m * g) / k

      // 根据当前位移 x 与平衡位置 xB 动态推导运动方程
      let equation = 'mg = ma (a = g, v↑)'
      let eqHighlight: 'positive' | 'negative' | 'zero' | 'extreme' | undefined = undefined

      if (state.x < -0.001) {
        equation = 'mg = ma (a = g, v↑)'
      } else if (state.x >= -0.001 && state.x < xB - 0.002) {
        equation = 'mg - kx = ma (a↓, v↑)'
        eqHighlight = 'positive'
      } else if (Math.abs(state.x - xB) <= 0.002) {
        equation = 'mg - kx_B = 0 (a = 0, v = vmax)'
        eqHighlight = 'extreme'
      } else {
        equation = 'kx - mg = ma (a↑, v↓)'
        eqHighlight = 'negative'
      }

      return {
        quantities: [
          ...base,
          { label: '当前运动方程', value: equation, unit: '', highlight: eqHighlight },
          { label: '瞬时合外力', symbol: 'F合', value: state.F_net, unit: 'N', highlight: state.F_net === 0 ? 'zero' as const : state.F_net < 0 ? 'negative' as const : undefined },
          { label: '瞬时动能', symbol: 'Ek', value: state.Ek, unit: 'J', highlight: 'positive' as const },
          { label: '弹簧弹力', symbol: 'F弹', value: state.F_spring, unit: 'N', highlight: state.F_spring > 0.05 ? 'positive' as const : undefined },
          { label: '瞬时速度', symbol: 'v', value: state.v, unit: 'm/s', highlight: state.v > 0.05 ? 'positive' as const : state.v < -0.05 ? 'negative' as const : 'zero' as const },
          { label: '弹簧形变量', symbol: 'x', value: Math.max(0, state.x), unit: 'm', highlight: state.x > 0.001 ? 'positive' as const : 'zero' as const },
        ],
        formulas: [
          { name: '触网前自由落体', latex: 'mg = ma \\implies a = g, v \\uparrow', condition: 'x < 0', level: 'important' },
          { name: '触网至平衡位置', latex: 'mg - kx = ma \\implies a \\downarrow, v \\uparrow', condition: '0 \\le x < x_B', level: 'core' },
          { name: '平衡位置瞬间', latex: 'mg - kx_B = 0 \\implies a = 0, v = v_{\\max}, E_k = \\max', condition: 'x = x_B', level: 'core', note: '此时速度及动能达到最大点' },
          { name: '过平衡点至最低点', latex: 'kx - mg = ma \\implies a \\uparrow (向上), v \\downarrow', condition: 'x_B < x \\le x_C', level: 'core' },
        ],
        gaokaoPoints: [
          { text: '【速度最大点误区】小球速度与动能最大的位置在平衡位置（mg = kx），而非刚接触弹簧的 A 点。', importance: 'hard' as const },
          { text: '【极值独立性】改变初始下落高度 h，小球振动最大速度所处平衡位置 B 的坐标（mg/k）保持绝对不变。', importance: 'extend' as const },
        ],
      }
    }
    case 'anim-light-rod-rope': {
      const m1 = params.m1 ?? 1.0
      const m2 = params.m2 ?? 1.0
      const L = params.L ?? 1.2
      const g = GRAVITY
      const constraint = params.constraint ?? 0 // 0=杆, 1=绳

      const trajectory = precomputeLightRodRopeTrajectory(m1, m2, L, g, constraint, 6)
      const state = getLRRStateAtTime(trajectory, time)

      return {
        quantities: [
          ...base,
          { label: 'A球机械能', symbol: 'EA', value: state.EA, unit: 'J', color: ENERGY_COLORS.potentialGravity },
          { label: 'B球机械能', symbol: 'EB', value: state.EB, unit: 'J', color: ENERGY_COLORS.potentialElastic },
          { label: '系统总能量', symbol: 'E总', value: state.Etot, unit: 'J', highlight: 'extreme' as const, color: PHYSICS_COLORS.kineticEnergy },
          ...(constraint === 0
            ? [{ label: '能量传输功率', symbol: 'P_trans', value: state.powerB, unit: 'W', highlight: state.powerB > 0.05 ? 'positive' as const : undefined }]
            : []),
          { label: 'A球线速度', symbol: 'v_A', value: state.vA, unit: 'm/s' },
          { label: 'B球线速度', symbol: 'v_B', value: state.vB, unit: 'm/s' },
        ],
        formulas: [
          { name: '角速度与线速度约束', latex: '\\omega_A = \\omega_B \\implies v_B = 2v_A', condition: '刚性轻杆连接下', level: 'important' },
          { name: '轻杆对个体做功', latex: 'W_{\\text{杆}\\to A} = \\Delta E_A < 0 \\quad W_{\\text{杆}\\to B} = \\Delta E_B > 0', condition: '刚性杆摆下时，能量从 A 向 B 转移', level: 'core' },
          { name: '系统总能量守恒', latex: 'W_{\\text{杆}\\to A} + W_{\\text{杆}\\to B} = 0 \\implies \\Delta E_{\\text{系统}} = 0', level: 'core' },
        ],
        gaokaoPoints: [
          { text: '【系统守恒，个体不守恒】轻杆拉力不沿杆方向，对个体做功不为零，故个体机械能不守恒；但弹力属于内力且总功之和为零，系统总机械能守恒。', importance: 'hard' as const },
          { text: '【杆-绳拓扑突变】切换为轻绳后，绳子松弛无法提供非径向力，无法进行能量传输，两球退化为独立单摆各自机械能守恒。', importance: 'extend' as const },
        ],
      }
    }
    case 'anim-work': {
      const mode = params.mode ?? 0
      const F = params.F ?? 10
      const angleDeg = params.angleDeg ?? 30
      const s = params.s ?? 5
      const m = params.m ?? 2
      const mu = params.mu ?? 0.3
      const g = params.g ?? GRAVITY

      const workType = classifyWorkType(angleDeg)

      if (mode === 0) {
        // ── 基础模式：理想恒力与方向投影 ──
        const { W, Fx, Fy } = calculateWorkBasic(F, s, angleDeg)
        const workLabel = workType === 'positive' ? '正功' : workType === 'negative' ? '负功' : '不做功'

        return {
          quantities: [
            ...base,
            { label: '做功类型', value: workLabel, unit: '', highlight: workType === 'positive' ? 'positive' as const : workType === 'negative' ? 'negative' as const : 'zero' as const },
            { label: '拉力做功 W', value: W.toFixed(1), unit: 'J', highlight: workType === 'positive' ? 'positive' as const : workType === 'negative' ? 'negative' as const : 'zero' as const },
            { label: '水平分力 Fx', value: Fx.toFixed(1), unit: 'N' },
            { label: '竖直分力 Fy', value: Fy.toFixed(1), unit: 'N' },
          ],
          formulas: [
            { name: '恒力做功', latex: 'W = Fs\\cos\\theta', note: 'θ 为力与位移方向的夹角', level: 'core' },
            { name: '水平分力', latex: 'F_x = F\\cos\\theta', level: 'important' },
            { name: '竖直分力', latex: 'F_y = F\\sin\\theta', level: 'important' },
          ],
          gaokaoPoints: [
            { text: 'W = Fscosθ，θ 为力与位移方向的夹角，cosθ 本质是力在位移方向上的投影系数。', importance: 'core' as const },
            { text: 'θ<90° 做正功，θ>90° 做负功，θ=90° 不做功——做功正负由力与位移的夹角决定。', importance: 'gaokao' as const },
            { text: '功是标量，正负不代表方向，代表力对物体运动是促进还是阻碍。', importance: 'hard' as const },
          ],
        }
      } else {
        // ── 进阶模式：摩擦力做功与脱地临界 ──
        const result = calculateWorkAdvanced(F, s, angleDeg, m, mu, g)

        return {
          quantities: [
            ...base,
            { label: '支持力 FN', value: result.F_N.toFixed(1), unit: 'N', highlight: result.isLiftedOff ? 'zero' as const : undefined },
            { label: '摩擦力 f', value: result.f.toFixed(1), unit: 'N' },
            { label: '拉力功 WF', value: result.W_F.toFixed(1), unit: 'J', highlight: result.W_F > 0.05 ? 'positive' as const : result.W_F < -0.05 ? 'negative' as const : 'zero' as const },
            { label: '摩擦力功 Wf', value: result.W_f.toFixed(1), unit: 'J', highlight: 'negative' as const },
            { label: '合力功 Wnet', value: result.W_net.toFixed(1), unit: 'J', highlight: result.W_net > 0.05 ? 'positive' as const : result.W_net < -0.05 ? 'negative' as const : 'zero' as const },
            ...(result.isLiftedOff
              ? [{ label: '脱地警告', value: 'FN=0, f=0', unit: '', highlight: 'extreme' as const }]
              : []),
          ],
          formulas: [
            { name: '支持力', latex: 'F_N = mg - F\\sin\\theta', condition: '斜向上拉时；斜向下推时 FN=mg+Fsinθ', level: 'important' },
            { name: '滑动摩擦力', latex: 'f = \\mu F_N', note: '脱地时 FN=0，摩擦力消失', level: 'core' },
            { name: '拉力做功', latex: 'W_F = Fs\\cos\\theta', level: 'core' },
            { name: '摩擦力做功', latex: 'W_f = -fs', level: 'important', note: '负号表示摩擦力做负功' },
            { name: '合力做功', latex: 'W_{\\text{net}} = W_F + W_f', note: '合力功即动能定理的左边', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '斜向上拉时 FN=mg−Fsinθ，摩擦力减小；斜向下推时 FN=mg+Fsinθ，摩擦力增大。', importance: 'core' as const },
            { text: '脱地临界条件：Fsinθ≥mg 时，FN=0，滑动摩擦力消失——这是高考受力分析的高频陷阱。', importance: 'gaokao' as const },
            { text: '合力功等于各力做功的代数和，Wnet = WF + Wf，正负号直接代入计算。', importance: 'hard' as const },
          ],
        }
      }
    }

    default:
      return null
  }
}
