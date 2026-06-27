import {
  calculateLenzsLaw,
  calculateCuttingEMF,
  computeRodStateAtTime,
  calculateMagnetInduction,
  calculateCoilInduction,
  computeFaradayMagnetFlux,
} from '../../../physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { PhysicsPanelData, PhysicsQuantity } from '../types'

export function handleInduction(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[]
): PhysicsPanelData | null {
  switch (animId) {
    case 'anim-faraday-law': {
      const mode = params.mode ?? 0
      const N = params.N ?? 50
      const B_magnet = params.B ?? 1.2
      const magnetV = params.magnetV ?? 140
      const dBdt = params.dBdt ?? 0.5
      const B0 = -dBdt * 5
      const tNow = time % 10
      const COIL_AREA_M2 = 0.02

      let phi = 0
      let emf = 0
      let directionText = '无'

      if (mode === 0) {
        // 基础模式下的往返插值
        const range = 300 // MAGNET_MAX_X - MAGNET_MIN_X
        const cycle = 2 * range
        const dist = (magnetV * tNow) % cycle
        const goingForward = dist < range
        const x = goingForward ? 60 + dist : 360 - (dist - range)
        phi = computeFaradayMagnetFlux(x, B_magnet)

        // 数值微元导数
        const dt = 0.001
        const nextDist = (magnetV * (tNow + dt)) % cycle
        const nextGoingForward = nextDist < range
        const nextX = nextGoingForward ? 60 + nextDist : 360 - (nextDist - range)
        const nextPhi = computeFaradayMagnetFlux(nextX, B_magnet)
        const dPhi_dt = (nextPhi - phi) / dt
        emf = -N * dPhi_dt
      } else {
        // 进阶模式下的解析值
        phi = (B0 + dBdt * tNow) * COIL_AREA_M2
        emf = -N * dBdt * COIL_AREA_M2
      }

      if (emf > 0.001) {
        directionText = '正向 (顺时针)'
      } else if (emf < -0.001) {
        directionText = '反向 (逆时针)'
      } else {
        directionText = '无'
      }

      const dPhi_dt_val = -emf / N

      return {
        quantities: [
          ...base,
          {
            label: '磁通量变化率 dΦ/dt',
            symbol: '\\frac{\\Delta\\Phi}{\\Delta t}',
            value: dPhi_dt_val,
            unit: 'Wb/s',
            highlight: Math.abs(dPhi_dt_val) > 1e-5 ? 'extreme' as const : 'zero' as const
          },
          {
            label: '感应电动势 E',
            symbol: 'E',
            value: Math.abs(emf),
            unit: 'V',
            color: PHYSICS_COLORS.emf,
            highlight: Math.abs(emf) > 1e-4 ? 'extreme' as const : 'zero' as const
          },
          {
            label: '感应电动势方向',
            value: directionText,
            unit: '',
            highlight: emf > 0.001 ? 'positive' as const : (emf < -0.001 ? 'negative' as const : undefined)
          },
        ],
        formulas: [
          {
            name: '法拉第电磁感应定律',
            latex: 'E = n \\frac{\\Delta\\Phi}{\\Delta t}',
            level: 'core',
            condition: '电路中产生感应电动势的普适定律',
          },
          {
            name: '匀变磁场电动势式',
            latex: 'E = n S \\frac{\\Delta B}{\\Delta t}',
            level: 'core',
            condition: '适用于回路面积恒定且磁场匀速变化的场景',
          },
        ],
        gaokaoPoints: [
          {
            text: '【法拉第定律定量计算】感应电动势的大小由磁通量变化率 dΦ/dt 和线圈匝数 n 共同决定。高考常与闭合电路欧姆定律联立考查通过电荷量 q = n·ΔΦ / R_总。',
            importance: 'gaokao',
          },
          {
            text: '【易错点：混淆值与变化率】磁通量最大时，其变化率可能为 0（如条形磁铁到达线圈中心瞬间，Φ 最大，但 ΔΦ/Δt = 0，感应电动势 E = 0）。',
            importance: 'gaokao',
          },
          {
            text: '【方向与斜率关系】感应电动势的方向由磁通量的变化趋势决定。在 Φ-t 图像中，斜率为正和斜率为负代表的变化趋势相反，其感应电动势方向相反。',
            importance: 'core',
          },
        ],
        warnings: [
          {
            text: '方向易错防坑：感应电动势的方向并不是由磁通量的正负值决定，而是由磁通量随时间的导数（即变化率）的符号与楞次定律决定的！',
            level: 'warning',
          },
        ],
        mnemonic: '大不一定快，快不一定大；斜率定电动势，阻碍定方向',
      }
    }
    case 'anim-lenzs-law': {
      const {
        currentAction,
        fluxChange,
        inducedFieldDirection,
        equivalentPole,
        forceType,
      } = calculateLenzsLaw(params.magnetPole ?? 1, params.velocity ?? 0)

      return {
        quantities: [
          ...base,
          { label: '当前动作', value: currentAction, unit: '' },
          {
            label: '磁通量变化',
            value: fluxChange === 'increasing' ? '增加' : fluxChange === 'decreasing' ? '减少' : '稳定',
            unit: '',
            highlight: fluxChange === 'increasing' ? 'positive' : 'negative',
          },
          { label: '感应磁场方向', value: inducedFieldDirection === 'down' ? '向下' : '向上', unit: '' },
          { label: '等效磁极', value: equivalentPole ? `上端 ${equivalentPole}极` : '无', unit: '' },
          {
            label: '洛伦兹力表现',
            value: forceType === 'repulsion' ? '排斥(阻碍靠近)' : forceType === 'attraction' ? '吸引(阻碍远离)' : '无',
            unit: '',
          },
        ],
      }
    }
    case 'anim-cutting-emf': {
      // 导体切割磁感线：仅展示因变量，彻底禁绝自变量 B, L, R, m, F_ext
      const B = params.B ?? 1.5
      const absB = Math.abs(B)
      // 磁场方向由 B 的符号决定：B > 0 → 向里 ⊗ (B_out=0)；B < 0 → 向外 ⊙ (B_out=1)
      const B_out = B < 0 ? 1 : 0
      const L = params.L ?? 1.0
      const R = params.R ?? 2.0
      const m = params.m ?? 0.2
      const F_ext = params.F_ext ?? 2.0
      const mode = params.mode ?? 0 // 0=基础: 恒速, 1=进阶: 自由释放
      const showForceAnalysis = params.showForceAnalysis ?? 1

      let v = 0
      let a = 0
      let F_amp = 0
      let P_heat = 0
      let EMF = 0
      let I = 0

      if (mode === 0) {
        // 基础模式：恒速切割，速度 v 是参数，加速度 a 为 0
        v = params.v ?? 2.0
        a = 0
        const res = calculateCuttingEMF(absB, L, v, R, 90, 0, B_out)
        EMF = res.EMF
        I = res.I
        F_amp = res.F_ampere
        P_heat = F_amp * Math.abs(v)
      } else {
        // 进阶模式：自由释放，采用解析解计算
        const res = computeRodStateAtTime(time, absB, L, R, m, F_ext)
        v = res.v
        a = res.a
        F_amp = res.F_amp
        P_heat = res.P_heat
        const dirFactor = B_out === 0 ? 1 : -1
        EMF = absB * L * v * dirFactor
        I = R > 0 ? EMF / R : 0
      }

      const quantities = [
        ...base,
        { label: '感应电动势 E', value: Math.abs(EMF).toFixed(3), unit: 'V', color: PHYSICS_COLORS.emf },
        { label: '感应电流 I', value: Math.abs(I).toFixed(3), unit: 'A', color: PHYSICS_COLORS.electricCurrent },
        { label: '瞬时安培力 F_安', symbol: 'F_{安}', value: F_amp.toFixed(3), unit: 'N', color: PHYSICS_COLORS.lorentzForce, highlight: 'extreme' as const },
        { label: '回路发热功率 P_热', symbol: 'P_{热}', value: P_heat.toFixed(3), unit: 'W', color: PHYSICS_COLORS.heatLoss },
      ]

      if (mode === 1 || showForceAnalysis === 1) {
        quantities.push({
          label: '瞬时加速度 a',
          symbol: 'a',
          value: a.toFixed(3),
          unit: 'm/s²',
          color: PHYSICS_COLORS.acceleration,
          highlight: 'extreme' as const,
        })
      }

      return {
        quantities,
        formulas: [
          { name: '法拉第电磁感应', latex: 'E = BLv', level: 'core' },
          { name: '瞬时安培力', latex: 'F_{安} = \\frac{B^2 L^2 v}{R}', level: 'core' },
          { name: '单棒动力学加速度', latex: 'a = \\frac{F_{外} - F_{安}}{m}', level: 'core', condition: '自由释放模式下' },
        ],
        gaokaoPoints: [
          { text: '电磁感应中的单棒动力学平衡与能量转化：随着速度增加，电动势与安培力增大，合力和加速度逐渐减小。', importance: 'gaokao' },
          { text: '动态分析链条：v↑ ⇒ E↑ ⇒ F_安↑ ⇒ a↓。当 a=0 时，达到收尾速度 v_m。此时外力做功功率等于电路电热功率（P_外 = P_热）。', importance: 'gaokao' },
        ],
        warnings: [
          { text: '易错点：不知道安培力随速度动态变化，错误地将此过程当成匀变速运动去套公式。', level: 'danger' },
          { text: '模型说明：本节默认导轨光滑、磁场匀强、回路总电阻恒定，并忽略自感效应。', level: 'info' },
        ],
        mnemonic: '安培力阻碍相对运动，速度大则阻力大，最终合力为零达收尾',
      }
    }
    case 'anim-electromagnetic-induction': {
      const mode = params.mode ?? 0 // 0=基础: 磁铁运动, 1=进阶: 双线圈回路
      const N = 10 // 固定线圈匝数

      if (mode === 0) {
        // ── 基础模式：磁铁插入线圈 ──
        const magnetX = params.magnetX ?? 200
        const magnetSpeed = params.magnetSpeed ?? 0
        const magnetPole = params.magnetPole ?? 1 // 1=左S右N, -1=左N右S
        const coilX = 400

        const { phi, dPhi, theta } = calculateMagnetInduction(magnetX, magnetSpeed, coilX, N, magnetPole)

        // 判断电流计偏转方向文字
        let currentDirectionText = '无感应电流'
        if (Math.abs(theta) > 0.05) {
          currentDirectionText = theta > 0 ? '向右偏转 (+)' : '向左偏转 (-)'
        }

        return {
          quantities: [
            ...base,
            { label: '磁铁位置 x', value: magnetX.toFixed(0), unit: 'px' },
            { label: '磁铁速度 v', value: magnetSpeed.toFixed(1), unit: 'px/s', color: PHYSICS_COLORS.velocity },
            { label: '穿过线圈磁通量 Φ', value: phi.toFixed(3), unit: 'Wb', color: PHYSICS_COLORS.magneticField },
            { label: '磁通量变化率 dΦ/dt', value: dPhi.toFixed(3), unit: 'Wb/s', color: PHYSICS_COLORS.magneticField, highlight: Math.abs(dPhi) > 0.01 ? 'extreme' : undefined },
            { label: '电流计指针偏转', value: currentDirectionText, unit: '', color: PHYSICS_COLORS.kineticEnergy, highlight: Math.abs(theta) > 0.05 ? 'extreme' : 'zero' },
          ],
          formulas: [
            { name: '磁通量变化量定义', latex: '\\Delta\\Phi = \\Phi_{末} - \\Phi_{初}', level: 'core' },
            { name: '法拉第电磁感应定律', latex: 'E = N \\frac{\\Delta\\Phi}{\\Delta t}', level: 'core', condition: '计算平均感应电动势' },
          ],
          gaokaoPoints: [
            { text: '闭合回路内磁通量发生变化（ΔΦ ≠ 0）是产生感应电流的充要条件。', importance: 'gaokao' },
            { text: '高考常在大题的第一问中以各种隐蔽几何变化（如线圈旋转、滑条移动、磁铁位移）考查对"变化"的判断。', importance: 'gaokao' },
            { text: '磁通量变化率 dΦ/dt 决定了感应电动势的大小，即决定了电流计指针偏转的幅度。', importance: 'core' },
          ],
          warnings: [
            { text: '易错防坑：误认为有磁通量 Φ 就有感应电流。记住，磁铁静止在线圈中时，虽然 Φ 达到最大，但 ΔΦ = 0，此时感应电流为零，指针不偏转！', level: 'danger' }
          ],
        }
      } else {
        // ── 进阶模式：双线圈回路 ──
        const R = params.resistance ?? 50
        const dR_dt = params.dR_dt ?? 0
        const E_source = 10 // 原回路电源电压

        const { phi, dPhi, theta } = calculateCoilInduction(R, dR_dt, E_source, N)
        const I1 = E_source / R

        let currentDirectionText = '无感应电流'
        if (Math.abs(theta) > 0.05) {
          currentDirectionText = theta > 0 ? '向右偏转 (+)' : '向左偏转 (-)'
        }

        return {
          quantities: [
            ...base,
            { label: '原线圈电流 I₁', value: I1.toFixed(2), unit: 'A', color: PHYSICS_COLORS.electricCurrent },
            { label: '穿过副线圈磁通量 Φ', value: phi.toFixed(3), unit: 'Wb', color: PHYSICS_COLORS.magneticField },
            { label: '磁通量变化率 dΦ/dt', value: dPhi.toFixed(3), unit: 'Wb/s', color: PHYSICS_COLORS.magneticField, highlight: Math.abs(dPhi) > 0.01 ? 'extreme' : undefined },
            { label: '电流计指针偏转', value: currentDirectionText, unit: '', color: PHYSICS_COLORS.kineticEnergy, highlight: Math.abs(theta) > 0.05 ? 'extreme' : 'zero' },
          ],
          formulas: [
            { name: '互感磁通量关系', latex: '\\Phi = M I_1', level: 'core', condition: 'M为互感系数' },
            { name: '法拉第电磁感应定律', latex: 'E = -N \\frac{d\\Phi}{dt}', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '双线圈互感：原回路中电阻变化导致原电流变化，从而改变原线圈磁场，使得副线圈中磁通量发生变化。', importance: 'gaokao' },
            { text: '只要变阻器停止拖动，即使电阻很小（电流很大），由于电流恒定，磁通量变化率为零，副线圈就没有感应电流。', importance: 'gaokao' },
          ],
          warnings: [
            { text: '易错防坑：在变阻器滑动过程中，电阻变小导致电流增大，磁场增强，穿过副线圈的磁通量增大；电阻变大则相反。变阻器滑动的快慢（dR/dt）直接决定感应电流的强弱。', level: 'warning' }
          ],
        }
      }
    }
    default:
      return null
  }
}
