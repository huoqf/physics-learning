/**
 * 电磁感应双杆模型纯物理计算函数库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 *
 * 物理模型：
 * 质量为 mA、mB 的两根平行金属棒 a、b 垂直置于间距为 L 的足够长光滑平行金属导轨上。
 * 整个系统处于磁感应强度为 B、方向垂直导轨平面向里的匀强磁场中。
 * 回路总电阻为 R（含两棒电阻及导轨接触电阻）。
 *
 * 1. 自由模式 (scenario === 0)：给 a 棒初速度 v0，b 棒初速度为 0。
 *    两棒受等大反向内力（安培力），系统动量严格守恒：mA * vA + mB * vB = mA * v0。
 *    最终收尾于共同速度 v_common = (mA * v0) / (mA + mB)。
 *
 * 2. 恒力驱动模式 (scenario === 1)：对 a 棒施加水平向右的恒定外力 F_ext。
 *    两棒经过变加速运动后，最终达到稳定的等加速度收尾状态：
 *    a_common = F_ext / (mA + mB)
 *    收尾稳定速度差 deltaV = (F_ext * R * mB) / (B^2 * L^2 * (mA + mB))
 */

export interface DualRodsState {
  /** a 棒位置 (m) */
  xA: number
  /** b 棒位置 (m) */
  xB: number
  /** a 棒瞬时速度 (m/s) */
  vA: number
  /** b 棒瞬时速度 (m/s) */
  vB: number
  /** 瞬时感应电动势差分 E = B * L * (vA - vB) (V) */
  emf: number
  /** 瞬时感应电流 I = E / R (A) */
  currentI: number
  /** 安培力大小 F_A = B * I * L (N) */
  forceAmpere: number
  /** 系统总动量 P = mA * vA + mB * vB (kg·m/s) */
  totalMomentum: number
  /** 系统动能 E_k (J) */
  kineticEnergy: number
}

/**
 * 内部状态导数计算
 */
function getDualRodsDerivatives(
  vA: number,
  vB: number,
  F_ext: number,
  B: number,
  L: number,
  R: number,
  mA: number,
  mB: number
) {
  const emf = B * L * (vA - vB)
  const currentI = emf / R
  const forceAmpere = B * currentI * L

  // a 棒受外力向右 (F_ext)，受安培力向左 (-forceAmpere)
  const dvA = (F_ext - forceAmpere) / mA
  // b 棒受安培力向右 (forceAmpere)
  const dvB = forceAmpere / mB

  return { dvA, dvB, dxA: vA, dxB: vB, emf, currentI, forceAmpere }
}

/**
 * 采用 4 阶龙格-库塔法 (RK4) 求解单步电磁感应双杆演化。
 *
 * @param state 上一帧物理状态
 * @param F_ext 施加在 a 棒上的恒定外力 (N)
 * @param B     磁感应强度 (T)
 * @param L     导轨间距 (m)
 * @param R     回路总电阻 (Ω)
 * @param mA    a 棒质量 (kg)
 * @param mB    b 棒质量 (kg)
 * @param dt    时间步长 (s)
 * @returns     下一帧物理状态
 */
export function stepDualRodsRK4(
  state: DualRodsState,
  F_ext: number,
  B: number,
  L: number,
  R: number,
  mA: number,
  mB: number,
  dt: number
): DualRodsState {
  const { xA, xB, vA, vB } = state

  // k1
  const d1 = getDualRodsDerivatives(vA, vB, F_ext, B, L, R, mA, mB)
  // k2
  const d2 = getDualRodsDerivatives(
    vA + 0.5 * dt * d1.dvA,
    vB + 0.5 * dt * d1.dvB,
    F_ext, B, L, R, mA, mB
  )
  // k3
  const d3 = getDualRodsDerivatives(
    vA + 0.5 * dt * d2.dvA,
    vB + 0.5 * dt * d2.dvB,
    F_ext, B, L, R, mA, mB
  )
  // k4
  const d4 = getDualRodsDerivatives(
    vA + dt * d3.dvA,
    vB + dt * d3.dvB,
    F_ext, B, L, R, mA, mB
  )

  let nextVA = vA + (dt / 6) * (d1.dvA + 2 * d2.dvA + 2 * d3.dvA + d4.dvA)
  let nextVB = vB + (dt / 6) * (d1.dvB + 2 * d2.dvB + 2 * d3.dvB + d4.dvB)
  const nextXA = xA + (dt / 6) * (d1.dxA + 2 * d2.dxA + 2 * d3.dxA + d4.dxA)
  const nextXB = xB + (dt / 6) * (d1.dxB + 2 * d2.dxB + 2 * d3.dxB + d4.dxB)

  // 物理保真校准：若外力为 0（自由模式），系统总动量必须严格守恒
  if (Math.abs(F_ext) < 1e-9) {
    const targetMomentum = mA * state.vA + mB * state.vB
    const currentMomentum = mA * nextVA + mB * nextVB
    const pDiff = targetMomentum - currentMomentum
    nextVA += pDiff / (mA + mB)
    nextVB += pDiff / (mA + mB)
  }

  const finalEmf = B * L * (nextVA - nextVB)
  const finalI = finalEmf / R
  const finalFA = B * finalI * L
  const totalMomentum = mA * nextVA + mB * nextVB
  const kineticEnergy = 0.5 * mA * nextVA * nextVA + 0.5 * mB * nextVB * nextVB

  return {
    xA: nextXA,
    xB: nextXB,
    vA: nextVA,
    vB: nextVB,
    emf: finalEmf,
    currentI: finalI,
    forceAmpere: finalFA,
    totalMomentum,
    kineticEnergy,
  }
}

/**
 * 计算理论收尾参数（用于解析参照与教学显示）
 */
export function calculateDualRodsTheoretical(
  scenario: number,
  v0: number,
  F_ext: number,
  B: number,
  L: number,
  R: number,
  mA: number,
  mB: number
) {
  if (scenario === 0) {
    // 自由模式：收尾共速
    const vCommon = (mA * v0) / (mA + mB)
    const totalMass = mA + mB
    const initialE = 0.5 * mA * v0 * v0
    const finalE = 0.5 * totalMass * vCommon * vCommon
    const jouleHeat = initialE - finalE
    return {
      vCommon,
      aCommon: 0,
      deltaV: 0,
      jouleHeat,
    }
  } else {
    // 恒力模式：收尾稳定等加速，恒定速度差
    const aCommon = F_ext / (mA + mB)
    const deltaV = (F_ext * R * mB) / (B * B * L * L * (mA + mB))
    return {
      vCommon: 0,
      aCommon,
      deltaV,
      jouleHeat: 0,
    }
  }
}

/**
 * 任意时刻 t 的解析解计算（确保任意时刻物理精度极高，且自由模式下系统动量 100% 严格守恒）
 *
 * @param t        当前时刻 (s)
 * @param scenario 0 为自由双杆，1 为恒力驱动双杆
 * @param v0       a 棒初速度 (m/s)
 * @param F_ext    外拉力 F (N)
 * @param B        磁感应强度 (T)
 * @param L        导轨间距 (m)
 * @param R        回路总电阻 (Ω)
 * @param mA       a 棒质量 (kg)
 * @param mB       b 棒质量 (kg)
 */
export function computeDualRodsStateAtTime(
  t: number,
  scenario: number,
  v0: number,
  F_ext: number,
  B: number,
  L: number,
  R: number,
  mA: number,
  mB: number
) {
  const totalMass = mA + mB
  // 相对运动阻尼系数 k = 1 / tau
  const k = (B * B * L * L / R) * (totalMass / (mA * mB))
  const decay = Math.exp(-k * t)

  if (scenario === 0) {
    // 自由双杆模式 (F_ext = 0)
    const vCommon = (mA * v0) / totalMass
    const vA = vCommon + (mB / totalMass) * v0 * decay
    const vB = vCommon - (mA / totalMass) * v0 * decay
    const deltaV = vA - vB
    const emf = B * L * deltaV
    const currentI = emf / R
    const forceAmpere = B * currentI * L
    const aA = -forceAmpere / mA
    const aB = forceAmpere / mB
    const totalMomentum = mA * vA + mB * vB
    const kineticEnergy = 0.5 * mA * vA * vA + 0.5 * mB * vB * vB

    // 位移积分解析式 (由 v(t) 对 t 积分)
    const xA = vCommon * t + ((mB * v0) / (totalMass * k)) * (1 - decay)
    const xB = vCommon * t - ((mA * v0) / (totalMass * k)) * (1 - decay)

    return {
      vA, vB, deltaV, aA, aB, xA, xB, emf, currentI, forceAmpere, totalMomentum, kineticEnergy, vCommon, aCommon: 0
    }
  } else {
    // 恒力驱动模式 (初速度均为 0，a 受拉力 F_ext)
    const aCommon = F_ext / totalMass
    const deltaVInf = (F_ext * R * mB) / (B * B * L * L * totalMass)
    const deltaV = deltaVInf * (1 - decay)
    const vCenter = aCommon * t
    const vA = vCenter + (mB / totalMass) * deltaV
    const vB = vCenter - (mA / totalMass) * deltaV
    const emf = B * L * deltaV
    const currentI = emf / R
    const forceAmpere = B * currentI * L
    const aA = (F_ext - forceAmpere) / mA
    const aB = forceAmpere / mB
    const totalMomentum = mA * vA + mB * vB
    const kineticEnergy = 0.5 * mA * vA * vA + 0.5 * mB * vB * vB

    const xA = 0.5 * aCommon * t * t + (mB / totalMass) * deltaVInf * (t - (1 - decay) / k)
    const xB = 0.5 * aCommon * t * t - (mA / totalMass) * deltaVInf * (t - (1 - decay) / k)

    return {
      vA, vB, deltaV, aA, aB, xA, xB, emf, currentI, forceAmpere, totalMomentum, kineticEnergy, vCommon: 0, aCommon
    }
  }
}
