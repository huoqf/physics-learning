/**
 * 纯物理计算：交流电路中电感感抗与电容容抗
 *
 * 铁律遵循：纯纯计算函数，无 React/DOM 依赖，所有函数具备 JSDoc 与物理单位注释。
 */

/**
 * 计算电感感抗 X_L
 * 公式：X_L = 2 * π * f * L
 *
 * @param f 交流电频率 (Hz)
 * @param L 自感系数 (H)
 * @returns 感抗 (Ω)
 */
export function calculateInductiveReactance(f: number, L: number): number {
  if (f <= 0 || L <= 0) return 0
  return 2 * Math.PI * f * L
}

/**
 * 计算电容容抗 X_C
 * 公式：X_C = 1 / (2 * π * f * C)
 *
 * @param f 交流电频率 (Hz)
 * @param C 电容大小 (F)
 * @returns 容抗 (Ω)，直流 (f=0) 时返回 Infinity
 */
export function calculateCapacitiveReactance(f: number, C: number): number {
  if (f <= 0 || C <= 0) return Number.POSITIVE_INFINITY
  return 1 / (2 * Math.PI * f * C)
}

/**
 * 计算 RL 或 RC 串联支路的交流总阻抗 Z
 * 公式：Z = √(R² + X²)
 *
 * @param R 电阻 (Ω)
 * @param X 感抗或容抗 (Ω)
 * @returns 总阻抗 (Ω)
 */
export function calculateImpedance(R: number, X: number): number {
  if (!Number.isFinite(X)) return Number.POSITIVE_INFINITY
  return Math.hypot(R, X)
}

/**
 * 计算支路正弦稳态有效值电流 I_rms 与消耗功率 P
 *
 * @param U 电源有效电压 (V)
 * @param R 负载电阻 (Ω)
 * @param X 电抗 (Ω)
 * @param isDC 是否为直流电源
 * @param DCResistance 电感线圈的直流内阻 (Ω)，电容直流为断路
 * @returns { current: number (A), power: number (W), impedance: number (Ω) }
 */
export function calculateBranchCurrentAndPower(
  U: number,
  R: number,
  X: number,
  isDC = false,
  DCResistance = 0,
): { current: number; power: number; impedance: number } {
  if (isDC) {
    // 直流模式：电容容抗无穷大(断路)，电感仅有线圈直流电阻
    if (!Number.isFinite(X)) {
      return { current: 0, power: 0, impedance: Number.POSITIVE_INFINITY }
    }
    const rTotal = Math.max(1e-4, R + DCResistance)
    const current = U / rTotal
    const power = current * current * R
    return { current, power, impedance: rTotal }
  }

  const Z = calculateImpedance(R, X)
  if (!Number.isFinite(Z) || Z <= 1e-6) {
    return { current: 0, power: 0, impedance: Z }
  }
  const current = U / Z
  const power = current * current * R
  return { current, power, impedance: Z }
}

/**
 * 计算 LC 谐振频率 f0 (使 X_L = X_C 的固有频率)
 * 公式：f_0 = 1 / (2 * π * √(L * C))
 *
 * @param L 电感 (H)
 * @param C 电容 (F)
 * @returns 谐振频率 (Hz)
 */
export function calculateResonanceFrequency(L: number, C: number): number {
  if (L <= 0 || C <= 0) return 0
  return 1 / (2 * Math.PI * Math.sqrt(L * C))
}
