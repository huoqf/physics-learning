export function calculateNewtonSecond(F_net: number, m: number): { a: number } {
  return { a: F_net / m };
}

export function calculateFriction(mu: number, N: number, _isKinetic: boolean): { f: number } {
  return { f: mu * N };
}

export function calculateCoulombForce(k: number, q1: number, q2: number, r: number): { F: number } {
  return { F: k * Math.abs(q1 * q2) / (r * r) };
}
