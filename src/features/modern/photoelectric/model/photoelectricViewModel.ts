import {
  frequencyToPhotonEnergy,
  calculateMaxKineticEnergy,
  calculateStoppingVoltage,
  isPhotoelectricEffect,
  intensityToSaturationCurrent,
  calculatePhotocurrent,
  frequencyToColor,
  calculateComptonWavelengthShift,
} from '@/physics/photoelectric'

/** 铯逸出功 (eV) */
const DEFAULT_W0 = 2.14

export interface PhotoelectricState {
  frequency: number
  intensity: number
  voltage: number
  mode: number
  showPhotonModel: number
  workFunction?: number
  theta?: number
}

export interface PhotoelectricDerived {
  /** 光子能量 hν (eV) */
  hv: number
  /** 是否发生光电效应 */
  isPE: boolean
  /** 最大初动能 E_km (eV) */
  Ekm: number
  /** 遏止电压 U_c (V) */
  Uc: number
  /** 饱和光电流 I_m (μA) */
  Imax: number
  /** 当前光电流 I (μA) */
  I: number
  /** 光束颜色 (hex) */
  beamColor: string
  /** 截止频率 (×10¹⁴ Hz) */
  cutoffFreq: number
  /** 逸出功 (eV) */
  W0: number
  /** 康普顿散射角 θ (度) */
  thetaDeg: number
  /** 康普顿波长改变量 Δλ (nm) */
  deltaLambdaNm: number
  /** 电子反冲角 φ (度) */
  recoilAngleDeg: number
}

/**
 * 将 store params 转为渲染所需的派生状态。
 */
export function computePhotoelectricDerived(
  params: PhotoelectricState,
): PhotoelectricDerived {
  const W0 = params.workFunction ?? DEFAULT_W0
  const hv = frequencyToPhotonEnergy(params.frequency)
  const isPE = isPhotoelectricEffect(params.frequency, W0)
  const Ekm = calculateMaxKineticEnergy(hv, W0)
  const Uc = calculateStoppingVoltage(Ekm)
  const Imax = intensityToSaturationCurrent(params.intensity)
  const effectiveU = params.mode === 1 ? params.voltage : 0
  const I = isPE ? calculatePhotocurrent(effectiveU, Uc, Imax) : 0
  const beamColor = frequencyToColor(params.frequency)
  const cutoffFreq = W0 / (4.135667696e-15 * 1e14) // ×10¹⁴ Hz

  const thetaDeg = params.theta ?? 60
  const deltaLambdaNm = calculateComptonWavelengthShift(thetaDeg)
  // 简化的弹性动量守恒反冲角推导示意
  const rad = (thetaDeg * Math.PI) / 180
  const recoilAngleRad = Math.atan2(Math.sin(rad), 2 - Math.cos(rad))
  const recoilAngleDeg = (recoilAngleRad * 180) / Math.PI

  return {
    hv,
    isPE,
    Ekm,
    Uc,
    Imax,
    I,
    beamColor,
    cutoffFreq,
    W0,
    thetaDeg,
    deltaLambdaNm,
    recoilAngleDeg,
  }
}
