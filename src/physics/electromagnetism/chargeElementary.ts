/**
 * 电荷、起电方式、元电荷与密立根油滴实验物理纯函数库。
 * 无副作用，不依赖 React/DOM/window。
 */

import {
  ELEMENTARY_CHARGE,
  ELECTRON_MASS,
  GRAVITY,
  PROTON_MASS,
} from '../constants'
import { calculateContactCharges } from '../electrostatics'

/** 起电方式：0=摩擦起电，1=接触起电，2=感应起电 */
export type ChargingMethod = 0 | 1 | 2

/** 起电实验步骤：0=初态，1=转移/感应态，2=分离/定态 */
export type ChargingStep = 0 | 1 | 2

/** 自由电子移动方向 */
export type ElectronFlowDirection =
  | 'none'
  | 'AtoB'
  | 'BtoA'
  | 'GroundToB'
  | 'BtoGround'

export interface ChargingProcessConfig {
  /** 起电方式：0=摩擦起电，1=接触起电，2=感应起电 */
  method: number
  /** 实验步骤：0=初态，1=转移/感应态，2=分离/定态 */
  step: number
  /** 导体 A 初始电荷量 (nC) */
  qAInit: number
  /** 导体 B 初始电荷量 (nC) */
  qBInit: number
  /** 施感带电体 C 电荷量 (nC) */
  inducerQ: number
  /** 是否手指/导线接地（0=不接地，1=接地） */
  isGrounded: number
}

export interface ChargingProcessResult {
  method: ChargingMethod
  step: ChargingStep
  /** 导体/棒 A 当前电荷量 (nC) */
  qA: number
  /** 导体/丝绸 B 当前电荷量 (nC) */
  qB: number
  /** 流入或流出大地的净电荷量 (nC) */
  qGround: number
  /** 初态系统总电荷量 (nC) */
  qTotalInit: number
  /** 当前系统（含大地）总电荷量 (nC) */
  qTotalAfter: number
  /** 转移电荷量绝对值 (nC) */
  deltaQ: number
  /** 转移电子数（单位：个） */
  transferredElectrons: number
  /** 转移电子数（单位：10¹⁰ 个） */
  transferredElectronsIn1e10: number
  /** 自由电子定向移动方向 */
  electronFlowDir: ElectronFlowDirection
  /** 验电器检出电荷量（取 B 端净电荷，单位 nC） */
  electroscopeQ: number
  /** 验电器金箔单侧偏转角 (deg) */
  foilAngleDeg: number
  /** 施感带电体 C 当前显示电荷量 (nC，仅 method=2 有意义) */
  inducerQ: number
  isGrounded: boolean
  /** 摩擦起电时是否为毛皮摩擦橡胶棒（A 得电子带负电，B 带正电） */
  isRubberFur: boolean
}

/**
 * 计算摩擦起电、接触起电与感应起电各阶段的电荷分布、电荷守恒量及转移电子数。
 */
export function calculateChargingProcess(
  config: ChargingProcessConfig,
): ChargingProcessResult {
  const method = (config.method === 0 || config.method === 2 ? config.method : 1) as ChargingMethod
  const step = (config.step === 1 || config.step === 2 ? config.step : 0) as ChargingStep
  const qAInit = config.qAInit ?? 4
  const qBInit = config.qBInit ?? -2
  const rawInducerQ = config.inducerQ ?? 6
  const inducerQ = rawInducerQ === 0 ? 6 : rawInducerQ
  const isGrounded = (config.isGrounded ?? 0) >= 0.5
  const isRubberFur = method === 0 && qAInit < 0

  let qA = 0
  let qB = 0
  let qGround = 0
  let qTotalInit = 0
  let deltaQ = 0
  let electronFlowDir: ElectronFlowDirection = 'none'

  if (method === 0) {
    // 摩擦起电：
    // qAInit >= 0：丝绸(B)摩擦玻璃棒(A)，A 失电子带正电，B 得电子带等量负电
    // qAInit < 0 ：毛皮(B)摩擦橡胶棒(A)，A 得电子带负电，B 失电子带等量正电
    const signA = qAInit < 0 ? -1 : 1
    const qRub = Math.max(1, Math.abs(qAInit === 0 ? 4 : qAInit))
    qTotalInit = 0
    if (step === 0) {
      qA = 0
      qB = 0
      deltaQ = 0
      electronFlowDir = 'none'
    } else {
      qA = signA * qRub
      qB = -signA * qRub
      deltaQ = qRub
      electronFlowDir = signA > 0 ? 'AtoB' : 'BtoA'
    }
  } else if (method === 1) {
    // 接触起电：两个完全相同金属球 A 与 B 接触后均分电荷（异号先中和再平分）
    qTotalInit = qAInit + qBInit
    if (step === 0) {
      qA = qAInit
      qB = qBInit
      deltaQ = 0
      electronFlowDir = 'none'
    } else {
      const { q1New, q2New } = calculateContactCharges(qAInit, qBInit)
      qA = q1New
      qB = q2New
      deltaQ = Math.abs(q1New - qAInit)
      if (qAInit < qBInit) {
        electronFlowDir = 'AtoB'
      } else if (qAInit > qBInit) {
        electronFlowDir = 'BtoA'
      } else {
        electronFlowDir = 'none'
      }
    }
  } else {
    // 感应起电：带电体 C 靠近由 A、B 组成的枕形导体
    qTotalInit = 0
    const qInd = Math.abs(inducerQ) * 0.5
    const signC = Math.sign(inducerQ)
    if (step === 0) {
      qA = 0
      qB = 0
      qGround = 0
      deltaQ = 0
      electronFlowDir = 'none'
    } else if (step === 1) {
      if (!isGrounded) {
        qA = -signC * qInd
        qB = signC * qInd
        qGround = 0
        deltaQ = qInd
        electronFlowDir = signC > 0 ? 'BtoA' : 'AtoB'
      } else {
        qA = -signC * qInd
        qB = 0
        qGround = signC * qInd
        deltaQ = qInd
        electronFlowDir = signC > 0 ? 'GroundToB' : 'BtoGround'
      }
    } else {
      // step === 2：移走 C（不接地时已先分开 A/B；接地时先断接地再移走 C 后 A/B 均分）
      if (!isGrounded) {
        qA = -signC * qInd
        qB = signC * qInd
        qGround = 0
        deltaQ = qInd
        electronFlowDir = 'none'
      } else {
        qA = (-signC * qInd) / 2
        qB = (-signC * qInd) / 2
        qGround = signC * qInd
        deltaQ = qInd
        electronFlowDir = 'none'
      }
    }
  }

  const qTotalAfter = +(qA + qB + qGround).toFixed(2)
  const transferredElectrons = (deltaQ * 1e-9) / ELEMENTARY_CHARGE
  const transferredElectronsIn1e10 = +(transferredElectrons / 1e10).toFixed(2)
  const electroscopeQ = qB
  const foilAngleDeg = +Math.min(42, Math.abs(electroscopeQ) * 6.5).toFixed(1)

  return {
    method,
    step,
    qA: +qA.toFixed(2),
    qB: +qB.toFixed(2),
    qGround: +qGround.toFixed(2),
    qTotalInit: +qTotalInit.toFixed(2),
    qTotalAfter,
    deltaQ: +deltaQ.toFixed(2),
    transferredElectrons,
    transferredElectronsIn1e10,
    electronFlowDir,
    electroscopeQ: +electroscopeQ.toFixed(2),
    foilAngleDeg,
    inducerQ,
    isGrounded,
    isRubberFur,
  }
}

export interface MillikanOilDropConfig {
  /** 平行极板间电压 U (V) */
  voltageU: number
  /** 平行极板间距 d (mm) */
  plateGapMm: number
  /** 油滴带电的元电荷倍数 n (个) */
  chargeMultipleN: number
  /** 油滴质量 m (单位: 10⁻¹⁵ kg) */
  dropMass1e15: number
}

export interface MillikanSamplePoint {
  x: number
  y: number
  n: number
}

export interface MillikanOilDropResult {
  voltageU: number
  plateGapMm: number
  /** 极板间距 d (m) */
  plateGapM: number
  /** 油滴质量 m (kg) */
  massKg: number
  /** 元电荷倍数 n */
  n: number
  /** 油滴电荷量 q (C) */
  chargeQ: number
  /** 油滴电荷量（单位：10⁻¹⁹ C） */
  chargeQIn1e19: number
  /** 板间匀强电场强度 E = U/d (V/m) */
  electricField: number
  /** 油滴所受重力 G = mg (N) */
  gravityForce: number
  /** 油滴所受电场力 F_e = qE (N) */
  electricForce: number
  /** 合力 F_合 = F_e - mg (N，向上为正) */
  netForce: number
  /** 竖直加速度 a (m/s²，向上为正) */
  acceleration: number
  /** 刚好悬浮平衡时所需极板电压 U_平 (V) */
  balanceVoltage: number
  /** 是否近似处于悬浮平衡态 */
  isBalanced: boolean
  /** 油滴比荷 q/m (C/kg) */
  specificChargeDrop: number
  /** 电子比荷 e/m_e (C/kg) */
  specificChargeElectron: number
  /** 质子比荷 e/m_p (C/kg) */
  specificChargeProton: number
  /** 8 组油滴测得电荷量散点数据（y 单位：10⁻¹⁹ C） */
  measuredSamples: MillikanSamplePoint[]
}

/**
 * 计算密立根油滴实验中的油滴受力、平衡电压、电荷量子化倍数及比荷。
 */
export function calculateMillikanOilDrop(
  config: MillikanOilDropConfig,
): MillikanOilDropResult {
  const voltageU = Math.max(0, config.voltageU ?? 490)
  const plateGapMm = Math.max(1, config.plateGapMm ?? 5)
  const n = Math.max(1, Math.round(config.chargeMultipleN ?? 2))
  const dropMass1e15 = Math.max(0.5, config.dropMass1e15 ?? 3.2)

  const plateGapM = plateGapMm * 1e-3
  const massKg = dropMass1e15 * 1e-15
  const chargeQ = n * ELEMENTARY_CHARGE
  const chargeQIn1e19 = +(n * 1.6).toFixed(2)
  const electricField = voltageU / plateGapM
  const gravityForce = massKg * GRAVITY
  const electricForce = chargeQ * electricField
  const netForce = electricForce - gravityForce
  const acceleration = netForce / massKg
  const balanceVoltage = +((massKg * GRAVITY * plateGapM) / chargeQ).toFixed(1)
  const isBalanced = Math.abs(acceleration) < 0.25

  const specificChargeDrop = chargeQ / massKg
  const specificChargeElectron = ELEMENTARY_CHARGE / ELECTRON_MASS
  const specificChargeProton = ELEMENTARY_CHARGE / PROTON_MASS

  const sampleMultiples = [1, 2, 4, 3, 5, 2, 6, n]
  const measuredSamples: MillikanSamplePoint[] = sampleMultiples.map((mult, idx) => ({
    x: idx + 1,
    y: +(mult * 1.6).toFixed(2),
    n: mult,
  }))

  return {
    voltageU,
    plateGapMm,
    plateGapM,
    massKg,
    n,
    chargeQ,
    chargeQIn1e19,
    electricField,
    gravityForce,
    electricForce,
    netForce,
    acceleration,
    balanceVoltage,
    isBalanced,
    specificChargeDrop,
    specificChargeElectron,
    specificChargeProton,
    measuredSamples,
  }
}
