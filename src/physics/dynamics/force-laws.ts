export function calculateNewtonSecond(F_net: number, m: number): { a: number } {
  return { a: F_net / m };
}

export function calculateFriction(mu: number, N: number, _isKinetic: boolean): { f: number } {
  return { f: mu * N };
}

export function calculateCoulombForce(k: number, q1: number, q2: number, r: number): { F: number } {
  return { F: k * Math.abs(q1 * q2) / (r * r) };
}

export function calculateGravitation(G: number, m1: number, m2: number, r: number): { F: number } {
  return { F: (G * m1 * m2) / (r * r) };
}

/**
 * 计算胡克定律弹力（恢复力）
 *
 * 以弹簧平衡位置为原点，x 为相对平衡位置的有符号位移：
 *   - 拉伸时 x > 0，返回 F < 0（指向平衡位置）
 *   - 压缩时 x < 0，返回 F > 0（指向平衡位置）
 *
 * 即 F = -k·x
 *
 * @param k 弹簧劲度系数 [N/m]
 * @param x 相对平衡位置的有符号位移 [m]；拉伸为正，压缩为负
 * @returns F 恢复力 [N]，方向总指向平衡位置
 *
 * @category M1
 */
export function calculateElasticForce(k: number, x: number): { F: number } {
  return { F: -k * x };
}

