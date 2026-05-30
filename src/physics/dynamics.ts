export function calculateNewtonSecond(F_net: number, m: number): { a: number } {
  return { a: F_net / m };
}

export function calculateFriction(mu: number, N: number, _isKinetic: boolean): { f: number } {
  return { f: mu * N };
}

export function calculateElasticForce(k: number, x: number): { F: number } {
  return { F: -k * x };
}

export function calculateCoulombForce(k: number, q1: number, q2: number, r: number): { F: number } {
  return { F: k * q1 * q2 / (r * r) };
}

export function calculateGravitation(G: number, m1: number, m2: number, r: number): { F: number } {
  return { F: G * m1 * m2 / (r * r) };
}

export function calculateInclinedPlane(m: number, angleDeg: number, mu: number, g: number): { N: number; f: number; a: number; F_parallel: number; F_vertical: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  const F_parallel = m * g * Math.sin(angleRad);
  const F_vertical = m * g * Math.cos(angleRad);
  const N = F_vertical;
  const f = mu * N;
  const a = (F_parallel - f) / m;
  return { N, f, a, F_parallel, F_vertical };
}

export function calculateConnectedBody(m1: number, m2: number, F: number, mu: number, g: number): { a: number; T: number } {
  const totalMass = m1 + m2;
  const f = mu * m2 * g;
  const a = (F - f) / totalMass;
  const T = m2 * (a + mu * g);
  return { a, T };
}