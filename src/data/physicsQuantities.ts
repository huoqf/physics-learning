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
} from '../physics'

const COULOMB_K = 9e9
const VACUUM_PERMITTIVITY = 8.85e-12

export interface PhysicsQuantity {
  label: string
  value: number | string
  unit: string
  highlight?: 'positive' | 'negative' | 'zero' | 'extreme'
}

export interface GaokaoPoint {
  text: string
  importance: 'gaokao' | 'hard' | 'core' | 'basic' | 'extend'
}

export interface Formula {
  name: string
  latex: string
}

export interface PhysicsPanelData {
  quantities: PhysicsQuantity[]
  formulas?: Formula[]
  gaokaoPoints?: GaokaoPoint[]
}

function sign(v: number): 'positive' | 'negative' | 'zero' {
  return v > 0 ? 'positive' : v < 0 ? 'negative' : 'zero'
}

export function buildPhysicsQuantities(
  animId: string,
  params: Record<string, number>,
  time: number
): PhysicsPanelData {
  const base: PhysicsQuantity[] = [{ label: '时间 t', value: time, unit: 's' }]

  switch (animId) {
    case 'anim-velocity': {
      const v = params.v ?? 5
      const { s } = calculateUniformMotion(v, time)
      return { quantities: [...base, { label: '速度 v', value: v, unit: 'm/s' }, { label: '位移 s', value: s, unit: 'm' }] }
    }
    case 'anim-acceleration': {
      const v0 = params.v0 ?? 0
      const a = params.a ?? 2
      const { v, s } = calculateAcceleratedMotion(v0, a, time)
      return {
        quantities: [
          ...base,
          { label: '初速度 v₀', value: v0, unit: 'm/s' },
          { label: '加速度 a', value: a, unit: 'm/s²', highlight: sign(a) },
          { label: '速度 v', value: v, unit: 'm/s', highlight: sign(v) },
          { label: '位移 s', value: s, unit: 'm' },
        ],
      }
    }
    case 'anim-uniform-acceleration': {
      const v0 = params.v0 ?? 0
      const a = params.a ?? 1.5
      const { v, s } = calculateAcceleratedMotion(v0, a, time)
      return {
        quantities: [
          ...base,
          { label: '初速度 v₀', value: v0, unit: 'm/s' },
          { label: '加速度 a', value: a, unit: 'm/s²' },
          { label: '速度 v', value: v, unit: 'm/s' },
          { label: '位移 s', value: s, unit: 'm' },
        ],
      }
    }
    case 'anim-free-fall': {
      const v0 = params.v0 ?? 0
      const g = params.g ?? GRAVITY
      const { v, y } = calculateFreeFall(v0, g, time)
      return {
        quantities: [
          ...base,
          { label: '初速度 v₀', value: v0, unit: 'm/s' },
          { label: '重力加速度 g', value: g, unit: 'm/s²' },
          { label: '速度 v', value: v, unit: 'm/s' },
          { label: '位移 y', value: y, unit: 'm' },
        ],
      }
    }
    case 'anim-vertical-throw': {
      const v0 = params.v0 ?? 15
      const g = params.g ?? GRAVITY
      const advancedMode = params.advancedMode ?? 0
      const targetHeight = params.targetHeight ?? 0
      const totalTime = (2 * v0) / g
      // 竖直上抛：取向上为正，等价于自由落体公式中 g 取负
      const { v, y } = calculateFreeFall(v0, -g, time)
      const isLanded = time >= totalTime && totalTime > 0
      const isAtPeak = !isLanded && Math.abs(v) < 0.3 && time > 0.05
      const phase = isLanded ? '落地' : isAtPeak ? '最高点' : v > 0 ? '上升' : v < 0 ? '下落' : '起抛'

      // 基础公式
      const baseFormulas: Formula[] = [
        { name: '速度公式', latex: `v = v_0 - gt = ${v.toFixed(2)}\\;\\text{m/s}` },
        { name: '速度-位移关系', latex: `v^2 - v_0^2 = -2gy` },
      ]

      // 进阶公式
      const advancedFormulas: Formula[] = advancedMode ? [
        ...baseFormulas,
        { name: '位移方程', latex: `y = v_0 t - \\frac{1}{2}gt^2` },
        { name: '求根公式', latex: `t = \\frac{v_0 \\pm \\sqrt{v_0^2 - 2gy}}{g}` },
        { name: '相邻等时差', latex: `\\Delta y = gT^2` },
      ] : baseFormulas

      // 双解拦截索
      const targetGaokaoPoints: GaokaoPoint[] = []
      if (advancedMode && targetHeight > 0) {
        const discriminant = v0 * v0 - 2 * g * targetHeight
        if (discriminant >= 0) {
          const t1 = (v0 - Math.sqrt(discriminant)) / g
          const t2 = (v0 + Math.sqrt(discriminant)) / g
          targetGaokaoPoints.push({
            text: `目标高度 y=${targetHeight.toFixed(1)}m：t₁=${t1.toFixed(2)}s（上升经过），t₂=${t2.toFixed(2)}s（下落经过）`,
            importance: 'gaokao' as const,
          })
        } else {
          targetGaokaoPoints.push({
            text: `目标高度 y=${targetHeight.toFixed(1)}m：无法到达（超过最大高度）`,
            importance: 'basic' as const,
          })
        }
      }

      // 落地对称性结论
      if (isLanded) {
        targetGaokaoPoints.push({
          text: '对称性：上升时间 = 下落时间，落地速度 = 初速度（方向相反）',
          importance: 'core' as const,
        })
      }

      return {
        quantities: [
          ...base,
          { label: '速度 v', value: v, unit: 'm/s', highlight: v > 0 ? 'positive' : v < 0 ? 'negative' : 'zero' },
          { label: '位移 y', value: y, unit: 'm', highlight: y > 0 ? 'positive' : y < 0 ? 'negative' : 'zero' },
          { label: '运动阶段', value: phase, unit: '', highlight: isAtPeak ? 'extreme' : undefined },
        ],
        formulas: advancedFormulas,
        gaokaoPoints: [
          { text: '上升段与下落段关于最高点对称', importance: 'core' as const },
          ...(isAtPeak ? [{ text: '注意：v=0，但加速度 ≠ 0！', importance: 'hard' as const }] : []),
          ...targetGaokaoPoints,
        ],
      }
    }
    case 'anim-projectile': {
      const v0x = params.v0x ?? 10
      const g = params.g ?? GRAVITY
      const { x, y, vy } = calculateProjectileMotion(v0x, g, time)
      return {
        quantities: [
          ...base,
          { label: '水平速度 v₀', value: v0x, unit: 'm/s' },
          { label: '重力加速度 g', value: g, unit: 'm/s²' },
          { label: '水平位移 x', value: x, unit: 'm' },
          { label: '竖直速度 vy', value: vy, unit: 'm/s' },
          { label: '竖直位移 y', value: y, unit: 'm' },
        ],
      }
    }
    case 'anim-oblique-throw': {
      const v0 = params.v0 ?? 15
      const angle = params.angle ?? 45
      const g = params.g ?? GRAVITY
      const { x, y, vx, vy } = calculateObliqueThrow(v0, angle, g, time)
      return {
        quantities: [
          ...base,
          { label: '初速度 v₀', value: v0, unit: 'm/s' },
          { label: '抛射角 θ', value: angle, unit: '°' },
          { label: '水平速度 vx', value: vx, unit: 'm/s' },
          { label: '竖直速度 vy', value: vy, unit: 'm/s' },
          { label: '水平位移 x', value: x, unit: 'm' },
          { label: '竖直位移 y', value: y, unit: 'm' },
        ],
      }
    }
    case 'anim-circular-motion': {
      const r = params.r ?? 2
      const omega = params.omega ?? 1
      const { v, period } = calculateCircularMotion(r, omega, time)
      return {
        quantities: [
          ...base,
          { label: '半径 r', value: r, unit: 'm' },
          { label: '角速度 ω', value: omega, unit: 'rad/s' },
          { label: '线速度 v', value: v, unit: 'm/s' },
          { label: '周期 T', value: period, unit: 's' },
        ],
      }
    }
    case 'anim-satellite': {
      const r = params.r ?? 7
      const rMeters = r * 1e6
      const { v, T } = calculateOrbitalSpeed(EARTH_MASS, rMeters, GRAVITATIONAL_CONSTANT)
      return {
        quantities: [
          ...base,
          { label: '轨道半径 r', value: r, unit: '×10⁶ m' },
          { label: '线速度 v', value: v, unit: 'm/s' },
          { label: '周期 T', value: T / 60, unit: 'min' },
        ],
      }
    }
    case 'anim-momentum-conservation': {
      const m1 = params.m1 ?? 2
      const m2 = params.m2 ?? 3
      const v1 = params.v1 ?? 5
      const v2 = params.v2 ?? 0
      const e = params.e ?? 0.8
      const { v1f, v2f, pBefore, pAfter } = calculateRestitutionCollision(m1, v1, m2, v2, e)
      return {
        quantities: [
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
        ],
      }
    }
    case 'anim-coulomb-law': {
      const q1 = params.q1 ?? 2
      const q2 = params.q2 ?? -3
      const r = params.r ?? 4
      const { F } = calculateCoulombForce(COULOMB_K, Math.abs(q1 * 1e-6), Math.abs(q2 * 1e-6), (r || 0.01) * 0.01)
      return {
        quantities: [
          ...base,
          { label: '电量 q₁', value: q1, unit: 'μC' },
          { label: '电量 q₂', value: q2, unit: 'μC' },
          { label: '间距 r', value: r, unit: 'cm' },
          { label: '库仑力 F', value: F, unit: 'N' },
          { label: '作用', value: q1 * q2 < 0 ? '相互吸引' : '相互排斥', unit: '' },
        ],
      }
    }
    case 'anim-electric-field': {
      const q = params.q ?? 5
      const rTest = params.rTest ?? 3
      const { E } = calculateElectricField(COULOMB_K, Math.abs(q * 1e-6), (rTest || 0.01) * 0.01)
      return {
        quantities: [
          ...base,
          { label: '源电量 q', value: q, unit: 'μC' },
          { label: 'P 点距离 r', value: rTest, unit: 'cm' },
          { label: '场强 E', value: E, unit: 'N/C' },
          { label: '方向', value: q >= 0 ? '背离正电荷' : '指向负电荷', unit: '' },
        ],
      }
    }
    case 'anim-charge-in-efield': {
      // 偏转电场（示波管）模型：板长 L、板间距 D，单位 E ×10³N/C、q μC、m mg
      const PLATE_LENGTH = 0.4
      const HALF_GAP = 0.1
      const TIME_SCALE = 0.02
      const E = (params.E ?? 10) * 1e3
      const q = (params.q ?? 5) * 1e-6
      const m = (params.m ?? 200) * 1e-6
      const v0 = params.v0 ?? 20
      const a = m > 0 ? (q * E) / m : 0
      const tExit = v0 > 0 ? PLATE_LENGTH / v0 : 0
      const tHit = a > 0 ? Math.sqrt((2 * HALF_GAP) / a) : Infinity
      const tEnd = Math.min(tExit, tHit)
      const tSim = Math.min(time * TIME_SCALE, tEnd)
      const x = v0 * tSim
      const y = 0.5 * a * tSim * tSim
      const vy = a * tSim
      return {
        quantities: [
          ...base,
          { label: '加速度 a', value: a, unit: 'm/s²' },
          { label: '初速度 v₀', value: v0, unit: 'm/s' },
          { label: '水平位移 x', value: x, unit: 'm' },
          { label: '竖直速度 vy', value: vy, unit: 'm/s' },
          { label: '竖直位移 y', value: y, unit: 'm' },
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
      const charge = isConnected ? C * voltage : Q_FIXED
      const field = voltage / (d * 1e-3)
      return {
        quantities: [
          ...base,
          { label: '电源状态', value: isConnected ? '接电源(U不变)' : '断开(Q不变)', unit: '' },
          { label: '正对面积 S', value: S, unit: 'cm²' },
          { label: '板间距 d', value: d, unit: 'mm' },
          { label: '相对介电常数 εᵣ', value: epsilon_r, unit: '' },
          { label: '电容 C', value: C * 1e12, unit: 'pF' },
          { label: '电压 U', value: voltage, unit: 'V' },
          { label: '电荷量 Q', value: charge * 1e9, unit: 'nC' },
          { label: '场强 E', value: field, unit: 'V/m' },
        ],
      }
    }
    case 'anim-field-lines': {
      const q1 = params.q1 ?? 5
      const q2 = params.q2 ?? -5
      const distance = params.distance ?? 8
      const positive1 = q1 > 0
      const positive2 = q2 > 0
      const negative1 = q1 < 0
      const negative2 = q2 < 0
      const isOpposite = (positive1 && negative2) || (negative1 && positive2)
      const isSame = (positive1 && positive2) || (negative1 && negative2)
      const k = 9e9
      const q1SI = Math.abs(q1) * 1e-6
      const q2SI = Math.abs(q2) * 1e-6
      const rSI = distance * 0.01
      const F_coulomb = calculateCoulombForce(k, q1SI, q2SI, rSI).F
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
          { label: '电荷量 q₁', value: q1, unit: 'μC' },
          { label: '电荷量 q₂', value: q2, unit: 'μC' },
          { label: '间距 d', value: distance, unit: 'cm' },
          { label: '库仑力 F', value: F_coulomb, unit: 'N' },
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
          { label: '电荷量 q', value: q, unit: 'μC' },
          { label: '试探点距离 r', value: rTest, unit: 'cm' },
          { label: '电势 V', value: V, unit: 'V' },
          { label: '场强 E', value: E, unit: 'N/C' },
          { label: '电势符号', value: q >= 0 ? '正（电势为正）' : '负（电势为负）', unit: '' },
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
          { label: '电压 U', value: U, unit: 'V' },
          { label: '电阻 R', value: R, unit: 'Ω' },
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
          { label: '连接方式', value: series ? '串联' : '并联', unit: '' },
          { label: '电阻 R₁', value: R1, unit: 'Ω' },
          { label: '电阻 R₂', value: R2, unit: 'Ω' },
          { label: '总电阻 R总', value: Rtotal, unit: 'Ω' },
          { label: '总电流 I总', value: Itotal, unit: 'A' },
        ],
      }
    }
    case 'anim-closed-circuit': {
      const EMF = params.EMF ?? 6
      const r = params.r ?? 1
      const R = params.R ?? 5
      const { I, U_terminal, P_output, eta } = calculateClosedCircuit(EMF, r, R)
      return {
        quantities: [
          ...base,
          { label: '电动势 EMF', value: EMF, unit: 'V' },
          { label: '内阻 r', value: r, unit: 'Ω' },
          { label: '外电阻 R', value: R, unit: 'Ω' },
          { label: '电流 I', value: I, unit: 'A' },
          { label: '路端电压 U', value: U_terminal, unit: 'V' },
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
          { label: '磁感应强度 B', value: B, unit: 'T' },
          { label: '电流 I', value: I, unit: 'A' },
          { label: '导线长度 L', value: L, unit: 'm' },
          { label: '夹角 θ', value: angle, unit: '°' },
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
          { label: '电荷量 q', value: q, unit: 'C' },
          { label: '速度 v', value: v, unit: 'm/s' },
          { label: '磁感应强度 B', value: B, unit: 'T' },
          { label: '夹角 θ', value: angle, unit: '°' },
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
          { label: '电荷量 q', value: q, unit: 'C' },
          { label: '质量 m', value: m, unit: 'kg' },
          { label: '速度 v', value: v, unit: 'm/s' },
          { label: '磁感应强度 B', value: B, unit: 'T' },
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
      const current = EMF / 10
      return {
        quantities: [
          ...base,
          { label: '匝数 N', value: N, unit: '匝' },
          { label: '磁铁强度 B', value: B, unit: 'T' },
          { label: '磁通量 Φ', value: phi, unit: 'Wb' },
          { label: 'dΦ/dt', value: dPhi_dt, unit: 'Wb/s' },
          { label: '感应电动势 E', value: Math.abs(EMF), unit: 'V' },
          { label: '感应电流 I', value: Math.abs(current), unit: 'A' },
        ],
      }
    }
    case 'anim-lenzs-law': {
      const {
        currentAction,
        originalFieldDirection,
        fluxChange,
        inducedFieldDirection,
        equivalentPole,
        forceType,
      } = calculateLenzsLaw(params.magnetPole ?? 1, params.velocity ?? 0)

      return {
        quantities: [
          ...base,
          { label: '当前动作', value: currentAction, unit: '' },
          { label: '原磁场方向', value: originalFieldDirection === 'down' ? '向下' : '向上', unit: '' },
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
          { label: '线圈匝数 N', value: params.coilN ?? 10, unit: '匝' },
          { label: '时间 t', value: time.toFixed(2), unit: 's' },
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
          { label: '磁感应强度 B', value: B, unit: 'T' },
          { label: '导轨宽度 L', value: L, unit: 'm' },
          { label: '速度 v', value: v, unit: 'm/s' },
          { label: '外电阻 R', value: R, unit: 'Ω' },
          { label: '夹角 θ', value: theta, unit: '°' },
          { label: '内阻 r', value: r, unit: 'Ω' },
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
      const initialPhase = params.initialPhase ?? 0
      // 峰值电动势 Em = NBSω
      const Em = N * B * S * omega
      const { V_rms } = calculateACRMS(Em)
      const freq = omega / (2 * Math.PI)
      return {
        quantities: [
          ...base,
          { label: '磁感应强度 B', value: B, unit: 'T' },
          { label: '线圈面积 S', value: S, unit: 'm²' },
          { label: '角速度 ω', value: omega, unit: 'rad/s' },
          { label: '匝数 N', value: N, unit: '匝' },
          { label: '峰值电动势 Em', value: Em, unit: 'V' },
          { label: '有效值 Erms', value: V_rms, unit: 'V' },
          { label: '频率 f', value: freq, unit: 'Hz' },
          { label: '初始位置', value: initialPhase < 0.5 ? '中性面' : '最大值面', unit: '' },
        ],
      }
    }

    case 'anim-ac-values': {
      const V_peak = params.V_peak ?? 311
      const R = params.R ?? 100
      const f = params.f ?? 2
      const U_dc = params.U_dc ?? 220
      const I_peak = V_peak / R
      const { V_rms, I_rms } = calculateACRMS(V_peak, I_peak)
      const P_avg = V_rms * I_rms
      const errorPercent = Math.abs((U_dc - V_rms) / V_rms) * 100
      return {
        quantities: [
          ...base,
          { label: '峰值电压 Vm', value: V_peak, unit: 'V' },
          { label: '频率 f', value: f, unit: 'Hz' },
          { label: '负载电阻 R', value: R, unit: 'Ω' },
          { label: '直流电压 Udc', value: U_dc, unit: 'V', highlight: errorPercent <= 5 ? 'positive' : undefined },
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
          { label: '原线圈匝数 n₁', value: n1, unit: '匝' },
          { label: '副线圈匝数 n₂', value: n2, unit: '匝' },
          { label: '匝数比 n₂/n₁', value: turnsRatio, unit: '' },
          { label: '输入电压 U₁', value: U1, unit: 'V' },
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
      const { I_line, U_loss, P_loss, U_user, P_user, eta } = calculatePowerTransmission(
        P_send, U_trans, R_line, n1_step_up, n2_step_up, n1_step_down, n2_step_down
      )
      return {
        quantities: [
          ...base,
          { label: '输送功率 P', value: P_send / 1000, unit: 'kW' },
          { label: '输电电压 U', value: U_trans / 1000, unit: 'kV' },
          { label: '输电线电流 I', value: I_line, unit: 'A' },
          { label: '损耗电压 ΔU', value: U_loss, unit: 'V' },
          { label: '损耗功率 ΔP', value: P_loss / 1000, unit: 'kW' },
          { label: '用户电压 U', value: U_user, unit: 'V' },
          { label: '用户功率 P', value: P_user / 1000, unit: 'kW' },
          { label: '输电效率 η', value: eta * 100, unit: '%' },
        ],
      }
    }

    default:
      return {
        quantities: [
          ...base,
          ...Object.entries(params).map(([key, value]) => ({ label: key, value, unit: '' })),
        ],
      }
  }
}
