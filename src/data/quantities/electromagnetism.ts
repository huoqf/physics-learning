/**
 * 电磁学动画物理量看板数据构建。
 */
import {
  calculateCoulombForce,
  calculateElectricField,
  calculateElectricPotential,
  calculateCapacitor,
  calculateOhmLaw,
  calculateSeriesResistance,
  calculateParallelResistance,
  calculateClosedCircuit,
  calculateAmpereForce,
  calculateLorentzForce,
  calculateChargeInMagField,
  calculateFaradayEMF,
  calculateLenzsLaw,
  calculateCuttingEMF,
  calculateACRMS,
  calculateTransformerWithLoad,
  calculatePowerTransmission,
} from '../../physics'
import type { PhysicsPanelData, PhysicsQuantity } from './types'

const COULOMB_K = 9e9
const VACUUM_PERMITTIVITY = 8.85e-12

export function buildElectromagnetismQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  const base: PhysicsQuantity[] = []

  switch (animId) {
    case 'anim-coulomb-law': {
      const q1 = params.q1 ?? 2
      const q2 = params.q2 ?? -3
      const r = params.r ?? 4
      const mode = params.mode ?? 0
      const attractive = q1 * q2 < 0
      const k = 9e9
      const q1SI = Math.abs(q1 * 1e-6)
      const q2SI = Math.abs(q2 * 1e-6)

      if (mode === 0) {
        // ── 基础模式：两点电荷 ──
        const rSI = (r || 0.01) * 0.01
        const { F } = calculateCoulombForce(k, q1SI, q2SI, rSI)
        return {
          quantities: [
            ...base,
            { label: 'q₁', value: `${q1 > 0 ? '+' : ''}${q1.toFixed(1)}`, unit: 'μC', highlight: q1 > 0 ? 'positive' as const : 'negative' as const },
            { label: 'q₂', value: `${q2 > 0 ? '+' : ''}${q2.toFixed(1)}`, unit: 'μC', highlight: q2 > 0 ? 'positive' as const : 'negative' as const },
            { label: '间距 r', value: r.toFixed(1), unit: 'cm' },
            { label: '库仑力 F', value: F.toExponential(2), unit: 'N', highlight: 'extreme' as const },
            { label: '作用类型', value: attractive ? '相互吸引' : '相互排斥', unit: '', highlight: attractive ? 'negative' as const : 'positive' as const },
          ],
          formulas: [
            { name: '库仑定律', latex: 'F = k \\frac{q_1 q_2}{r^2}', level: 'core', condition: '仅适用于点电荷与真空' },
            { name: '静电力常量', latex: 'k = 9 \\times 10^9 \\;\\text{N·m}^2\\text{/C}^2', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '库仑定律仅适用于点电荷与真空（或空气近似）。', importance: 'gaokao' as const },
            { text: '库仑力与万有引力具有相似形式（都与距离平方成反比），但本质不同。', importance: 'core' as const },
            { text: '同号电荷相斥，异号电荷相吸——方向由符号决定。', importance: 'basic' as const },
          ],
        }
      } else {
        // ── 进阶模式：三个点电荷平衡 ──
        const q3 = params.q3 ?? 1
        // 注：实际位置由动画组件管理，此处仅显示电荷量信息
        return {
          quantities: [
            ...base,
            { label: 'Q₁', value: `${q1 > 0 ? '+' : ''}${q1.toFixed(1)}`, unit: 'μC', highlight: q1 > 0 ? 'positive' as const : 'negative' as const },
            { label: 'Q₂', value: `${q2 > 0 ? '+' : ''}${q2.toFixed(1)}`, unit: 'μC', highlight: q2 > 0 ? 'positive' as const : 'negative' as const },
            { label: 'Q₃', value: `${q3 > 0 ? '+' : ''}${q3.toFixed(1)}`, unit: 'μC', highlight: q3 > 0 ? 'positive' as const : 'negative' as const },
          ],
          formulas: [
            { name: '库仑定律', latex: 'F = k \\frac{q_1 q_2}{r^2}', level: 'core', condition: '仅适用于点电荷与真空' },
            { name: '平衡条件', latex: '\\sum \\vec{F} = 0', level: 'core', condition: '三电荷平衡时各电荷合力为零' },
          ],
          gaokaoPoints: [
            { text: '库仑定律仅适用于点电荷与真空。', importance: 'gaokao' as const },
            { text: '三个点电荷平衡条件：两大夹小、两同夹异、远小近大。', importance: 'gaokao' as const },
            { text: '中间电荷一定与两侧电荷电性相反。', importance: 'core' as const },
            { text: '中间电荷的电荷量一定小于两侧电荷。', importance: 'core' as const },
          ],
        }
      }
    }
    case 'anim-electric-field': {
      const mode = params.mode ?? 0
      const qTest = params.qTest ?? 1.0 // μC
      const rTest = params.rTest ?? 3.0 // cm
      const rSI = (rTest || 0.01) * 0.01

      if (mode === 0) {
        // ── 基础模式：单电荷 ──
        const q = params.q ?? 5.0 // μC
        const qSI = q * 1e-6
        const qTestSI = qTest * 1e-6

        const { E } = calculateElectricField(COULOMB_K, Math.abs(qSI), rSI)
        const F = Math.abs(qTestSI * E) // 力的大小

        return {
          quantities: [
            ...base,
            { label: '场强 E', value: E.toExponential(2), unit: 'N/C', highlight: 'extreme' as const },
            { label: '静电力 F', value: F.toExponential(2), unit: 'N', highlight: 'extreme' as const },
            { label: '力与场强方向', value: qTest === 0 ? '无作用力' : (qTest > 0 ? '两者同向' : '两者反向'), unit: '', highlight: qTest >= 0 ? 'positive' as const : 'negative' as const },
          ],
          formulas: [
            { name: '电场强度定义式', latex: 'E = \\frac{F}{|q|}', level: 'core', condition: '适用于一切电场，比值定义法' },
            { name: '点电荷场强决定式', latex: 'E = k \\frac{|Q|}{r^2}', level: 'core', condition: '真空中点电荷场强' },
          ],
          gaokaoPoints: [
            { text: '电场强度 E 是描述电场自身力性质的物理量，与试探电荷 q 的电性及大小无关。', importance: 'gaokao' as const },
            { text: '正试探电荷受到的电场力方向与 E 同向；负试探电荷受到的电场力方向与 E 反向。', importance: 'gaokao' as const },
            { text: '场强大小由场源电荷及位置决定，与距离的平方成反比。', importance: 'core' as const },
          ],
        }
      } else {
        // ── 进阶模式：等量双电荷场强叠加 ──
        const chargeConfig = params.chargeConfig ?? 0
        let q1 = 5.0
        let q2 = -5.0
        let configName = '等量异种电荷'

        if (chargeConfig === 1) {
          q1 = 5.0
          q2 = 5.0
          configName = '等量同种正电荷'
        } else if (chargeConfig === 2) {
          q1 = -5.0
          q2 = -5.0
          configName = '等量同种负电荷'
        }

        // 计算水平连线上（以中点为原点，位置为 rTest cm）的合场强与力
        // 设两电荷间距为 10.5 cm (由 cx1=22%, cx2=52% 得出真实比例约为 10.5cm)
        const d_half = 5.25 * 0.01 // 5.25 cm to m
        const xp = rTest * 0.01 // P 点 x 坐标 m
        
        const r1 = Math.abs(xp + d_half) // 到左电荷的距离
        const r2 = Math.abs(xp - d_half) // 到右电荷的距离

        const E1 = calculateElectricField(COULOMB_K, Math.abs(q1 * 1e-6), Math.max(0.005, r1)).E * (q1 >= 0 ? 1 : -1) * (xp >= -d_half ? 1 : -1)
        const E2 = calculateElectricField(COULOMB_K, Math.abs(q2 * 1e-6), Math.max(0.005, r2)).E * (q2 >= 0 ? 1 : -1) * (xp >= d_half ? 1 : -1)
        
        const Enet = Math.abs(E1 + E2)
        const Fnet = Enet * Math.abs(qTest * 1e-6)

        return {
          quantities: [
            ...base,
            { label: '电荷配置', value: configName, unit: '' },
            { label: '合场强 E', value: Enet.toExponential(2), unit: 'N/C', highlight: 'extreme' as const },
            { label: '合力 F', value: Fnet.toExponential(2), unit: 'N', highlight: 'extreme' as const },
            { label: '力与场强方向', value: qTest === 0 ? '无作用力' : (qTest > 0 ? '两者同向' : '两者反向'), unit: '', highlight: qTest >= 0 ? 'positive' as const : 'negative' as const },
          ],
          formulas: [
            { name: '电场叠加原理', latex: '\\vec{E} = \\vec{E}_1 + \\vec{E}_2', level: 'core', condition: '多个点电荷电场强度的矢量合成' },
            { name: '平行四边形定则', latex: 'E = \\sqrt{E_1^2 + E_2^2 + 2E_1E_2\\cos\\theta}', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '空间中某点的合场强等于各场源电荷在该点产生分场强的矢量和（遵循平行四边形定则）。', importance: 'gaokao' as const },
            { text: '等量异种电荷中垂线上场强方向处处相同（均与连线平行且指向负电荷一侧），中点场强最大，向两侧递减。', importance: 'gaokao' as const },
            { text: '等量同种正电荷中垂线上，中点合场强为零，从中心向外侧中垂线场强先增大后减小。', importance: 'gaokao' as const },
          ],
        }
      }
    }
    case 'anim-charge-in-efield': {
      // 偏转电场（示波管）模型：板长 L、板间距 D，单位 E ×10³N/C、q μC、m mg
      const PLATE_LENGTH = 0.4
      const HALF_GAP = 0.1
      const E = (params.E ?? 10) * 1e3
      const q = (params.q ?? 5) * 1e-6
      const m = (params.m ?? 200) * 1e-6
      const v0 = params.v0 ?? 20
      const a = m > 0 ? (q * E) / m : 0
      const tExit = v0 > 0 ? PLATE_LENGTH / v0 : 0
      const tHit = a > 0 ? Math.sqrt((2 * HALF_GAP) / a) : Infinity
      return {
        quantities: [
          ...base,
          { label: '结局', value: tHit < tExit ? '打在极板上' : '射出电场', unit: '' },
        ],
      }
    }
    case 'anim-capacitor': {
      const S = params.S ?? 100
      const d = params.d ?? 5
      const epsilon_r = params.epsilon_r ?? 1
      const U = params.U ?? 12
      const isConnected = (params.connected ?? 1) >= 0.5
      // 断开电源时保持的电荷基准（默认状态充电后断开）
      const Q_FIXED = VACUUM_PERMITTIVITY * (100 * 1e-4) / (5 * 1e-3) * 12
      const { C } = calculateCapacitor(VACUUM_PERMITTIVITY * epsilon_r, S * 1e-4, d * 1e-3)
      const voltage = isConnected ? U : Q_FIXED / C
      const field = voltage / (d * 1e-3)
      return {
        quantities: [
          ...base,
          { label: '电容 C', value: C * 1e12, unit: 'pF' },
          { label: '场强 E', value: field, unit: 'V/m' },
        ],
      }
    }
    case 'anim-field-lines': {
      const q1 = params.q1 ?? 5
      const q2 = params.q2 ?? -5
      const positive1 = q1 > 0
      const positive2 = q2 > 0
      const negative1 = q1 < 0
      const negative2 = q2 < 0
      const isOpposite = (positive1 && negative2) || (negative1 && positive2)
      const isSame = (positive1 && positive2) || (negative1 && negative2)
      let chargeType = ''
      if (q1 === 0 && q2 === 0) chargeType = '无电场'
      else if (q1 === 0 || q2 === 0) chargeType = '单电荷'
      else if (isOpposite) chargeType = '异种电荷'
      else chargeType = '同种电荷'
      let fieldLineDir = ''
      if (isOpposite) fieldLineDir = '从正电荷→负电荷'
      else if (isSame) fieldLineDir = '从两电荷向外辐射（或指向两电荷）'
      else fieldLineDir = '从非零电荷向外辐射（或指向非零电荷）'
      return {
        quantities: [
          ...base,
          { label: '电荷类型', value: chargeType, unit: '' },
          { label: '电场线方向', value: fieldLineDir, unit: '' },
        ],
      }
    }
    case 'anim-electric-potential': {
      const q = params.q ?? 5
      const rTest = params.rTest ?? 5
      const k = 9e9
      const qSI = Math.abs(q) * 1e-6
      const rTestSI = rTest * 0.01
      const { V } = calculateElectricPotential(k, qSI, rTestSI)
      const { E } = calculateElectricField(k, qSI, rTestSI)
      return {
        quantities: [
          ...base,
          { label: '电势 V', value: V, unit: 'V' },
          { label: '场强 E', value: E, unit: 'N/C' },
        ],
      }
    }
    case 'anim-ohm-law': {
      const U = params.U ?? 6
      const R = params.R ?? 3
      const { I } = calculateOhmLaw(U, R)
      return {
        quantities: [
          ...base,
          { label: '电流 I', value: I, unit: 'A' },
        ],
      }
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
      return {
        quantities: [
          ...base,
          { label: '总电流 I总', value: Itotal, unit: 'A' },
        ],
      }
    }
    case 'anim-closed-circuit': {
      const EMF = params.EMF ?? 6
      const r = params.r ?? 1
      const R = params.R ?? 5
      const { P_output, eta } = calculateClosedCircuit(EMF, r, R)
      return {
        quantities: [
          ...base,
          { label: '输出功率 P出', value: P_output, unit: 'W' },
          { label: '效率 η', value: eta * 100, unit: '%' },
        ],
      }
    }
    case 'anim-ampere-force': {
      const B = params.B ?? 1
      const I = params.I ?? 2
      const L = params.L ?? 5
      const angle = params.angle ?? 90
      const { F } = calculateAmpereForce(B, I, L, angle)
      return {
        quantities: [
          ...base,
          { label: '安培力 F', value: F, unit: 'N' },
        ],
      }
    }
    case 'anim-lorentz-force': {
      const q = params.q ?? 1
      const v = params.v ?? 10
      const B = params.B ?? 1
      const angle = params.angle ?? 90
      const { F } = calculateLorentzForce(Math.abs(q), Math.abs(v), B, angle)
      return {
        quantities: [
          ...base,
          { label: '洛伦兹力 F', value: F, unit: 'N' },
        ],
      }
    }
    case 'anim-charge-in-bfield': {
      const q = params.q ?? 1
      const m = params.m ?? 1
      const v = params.v ?? 10
      const B = params.B ?? 1
      const { r, T, omega } = calculateChargeInMagField(Math.abs(q), m, Math.abs(v), B)
      return {
        quantities: [
          ...base,
          { label: '轨道半径 r', value: r, unit: 'm' },
          { label: '周期 T', value: T, unit: 's' },
          { label: '角速度 ω', value: omega, unit: 'rad/s' },
        ],
      }
    }
    case 'anim-faraday-law': {
      const N = params.N ?? 5
      const B = params.B ?? 1.2
      const PHI0 = 0.45
      const COIL_X_PX = 380
      const MAGNET_LEN_PX = 110
      const SCALE = 500
      const COIL_RADIUS_M = 72 / SCALE
      const MAGNET_MIN = 60
      const magnetLeftPx = params.magnetX ?? MAGNET_MIN
      const magnetVPx = params.magnetV ?? 0
      const magnetCenterPx = magnetLeftPx + MAGNET_LEN_PX / 2
      const dist = (COIL_X_PX - magnetCenterPx) / SCALE
      const R = COIL_RADIUS_M
      const halfLen = MAGNET_LEN_PX / 2 / SCALE
      const uN = dist + halfLen
      const uS = dist - halfLen
      const termN = uN / Math.sqrt(uN * uN + R * R)
      const termS = uS / Math.sqrt(uS * uS + R * R)
      const phi = PHI0 * B * (termN - termS)
      const v_m = magnetVPx / SCALE
      const dx = 1 / SCALE
      const dist2 = dist - dx
      const uN2 = dist2 + halfLen
      const uS2 = dist2 - halfLen
      const termN2 = uN2 / Math.sqrt(uN2 * uN2 + R * R)
      const termS2 = uS2 / Math.sqrt(uS2 * uS2 + R * R)
      const phi2 = PHI0 * B * (termN2 - termS2)
      const dPhi_dx = (phi2 - phi) / dx
      const dPhi_dt = dPhi_dx * v_m
      const { EMF } = calculateFaradayEMF(N, dPhi_dt)
      return {
        quantities: [
          ...base,
          { label: 'dΦ/dt', value: dPhi_dt, unit: 'Wb/s' },
          { label: '感应电动势 E', value: Math.abs(EMF), unit: 'V' },
        ],
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
      // 导体切割磁感线：EMF=BLv·sinθ，I=EMF/(R+r)，F_安=BIL·sinθ
      const B = params.B ?? 1
      const L = params.L ?? 0.5
      const v = params.v ?? 2
      const R = params.R ?? 2
      const theta = params.theta ?? 90
      const r = params.r ?? 0
      const B_out = params.B_out ?? 0
      const { EMF, I, F_ampere } = calculateCuttingEMF(B, L, v, R, theta, r, B_out)
      return {
        quantities: [
          ...base,
          { label: '感应电动势 EMF', value: Math.abs(EMF), unit: 'V' },
          { label: '感应电流 I', value: Math.abs(I), unit: 'A' },
          { label: '安培力 F安', value: F_ampere, unit: 'N' },
        ],
      }
    }

    // ===== 电磁学 · 交变电流（[M4-1]）=====
    case 'anim-ac-generation': {
      const B = params.B ?? 0.5
      const S = params.S ?? 0.04
      const omega = params.omega ?? 2
      const N = params.N ?? 100
      // 峰值电动势 Em = NBSω
      const Em = N * B * S * omega
      const { V_rms } = calculateACRMS(Em)
      const freq = omega / (2 * Math.PI)
      return {
        quantities: [
          ...base,
          { label: '峰值电动势 Em', value: Em, unit: 'V' },
          { label: '有效值 Erms', value: V_rms, unit: 'V' },
          { label: '频率 f', value: freq, unit: 'Hz' },
        ],
      }
    }

    case 'anim-ac-values': {
      const V_peak = params.V_peak ?? 311
      const R = params.R ?? 100
      const U_dc = params.U_dc ?? 220
      const I_peak = V_peak / R
      const { V_rms, I_rms } = calculateACRMS(V_peak, I_peak)
      const P_avg = V_rms * I_rms
      const errorPercent = Math.abs((U_dc - V_rms) / V_rms) * 100
      return {
        quantities: [
          ...base,
          { label: '有效电压 Vrms', value: V_rms, unit: 'V' },
          { label: '有效电流 Irms', value: I_rms, unit: 'A' },
          { label: '平均功率 P', value: P_avg, unit: 'W' },
          { label: '误差', value: errorPercent.toFixed(1), unit: '%', highlight: errorPercent <= 5 ? 'positive' : 'negative' },
        ],
      }
    }

    case 'anim-transformer': {
      const n1 = params.n1 ?? 100
      const n2 = params.n2 ?? 200
      const U1 = params.U1 ?? 220
      const R = params.R ?? 50
      const { U2, I2, I1, P_output } = calculateTransformerWithLoad(n1, n2, U1, R)
      const turnsRatio = n1 === 0 ? 0 : n2 / n1
      return {
        quantities: [
          ...base,
          { label: '匝数比 n₂/n₁', value: turnsRatio, unit: '' },
          { label: '输出电压 U₂', value: U2, unit: 'V' },
          { label: '原线圈电流 I₁', value: I1, unit: 'A' },
          { label: '副线圈电流 I₂', value: I2, unit: 'A' },
          { label: '输出功率 P₂', value: P_output, unit: 'W' },
        ],
      }
    }

    case 'anim-power-transmission': {
      const P_send = params.P_send ?? 100000
      const U_trans = params.U_trans ?? 10000
      const R_line = params.R_line ?? 10
      // 使用默认匝数比：升压 1:10，降压 10:1
      const n1_step_up = 100
      const n2_step_up = 1000
      const n1_step_down = 1000
      const n2_step_down = 100
      const { I_line, P_loss, U_user, eta } = calculatePowerTransmission(
        P_send, U_trans, R_line, n1_step_up, n2_step_up, n1_step_down, n2_step_down
      )
      return {
        quantities: [
          ...base,
          { label: '输电线电流 I', value: I_line, unit: 'A' },
          { label: '损耗功率 ΔP', value: P_loss / 1000, unit: 'kW' },
          { label: '用户电压 U', value: U_user, unit: 'V' },
          { label: '输电效率 η', value: eta * 100, unit: '%' },
        ],
      }
    }

    default:
      return null
  }
}
