export function calculateNewtonSecond(F_net: number, m: number): { a: number; valid: boolean } {
  if (m <= 0) return { a: NaN, valid: false };
  return { a: F_net / m, valid: true };
}

export function calculateFriction(mu: number, N: number): { f: number; valid: boolean } {
  if (mu < 0 || N < 0) return { f: NaN, valid: false };
  return { f: mu * N, valid: true };
}

export function calculateCoulombForce(k: number, q1: number, q2: number, r: number): { F: number; valid: boolean; singular: boolean } {
  if (r === 0) return { F: Math.abs(q1 * q2) === 0 ? 0 : Infinity, valid: false, singular: true };
  if (r < 0) return { F: NaN, valid: false, singular: false };
  return { F: k * Math.abs(q1 * q2) / (r * r), valid: true, singular: false };
}

export function calculateGravitation(G: number, m1: number, m2: number, r: number): { F: number; valid: boolean; singular: boolean } {
  if (r === 0) return { F: m1 * m2 === 0 ? 0 : Infinity, valid: false, singular: true };
  if (r < 0) return { F: NaN, valid: false, singular: false };
  return { F: (G * m1 * m2) / (r * r), valid: true, singular: false };
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

