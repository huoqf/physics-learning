export function calculateOrbitalSpeed(M: number, r: number, G: number): { v: number; T: number; a_c: number } {
  const v = Math.sqrt(G * M / r);
  const T = (2 * Math.PI * r) / v;
  const a_c = v * v / r;
  return { v, T, a_c };
}

export function calculateKeplerThird(r1: number, T1: number, r2: number): { T2: number } {
  const T2 = T1 * Math.sqrt(Math.pow(r2 / r1, 3));
  return { T2 };
}

export function calculateCentralMass(r: number, T: number, G: number): { M: number } {
  const M = (4 * Math.PI * Math.PI * r * r * r) / (G * T * T);
  return { M };
}

export function calculatePlanetDensity(T_surface: number, G: number): { rho: number } {
  const rho = (3 * Math.PI) / (G * T_surface * T_surface);
  return { rho };
}

export function calculateEscapeSpeed(M: number, R: number, G: number): { v1: number; v2: number; v3: number } {
  const v1 = Math.sqrt(G * M / R);
  const v2 = Math.sqrt(2 * G * M / R);
  const v3 = Math.sqrt(11.2);
  return { v1, v2, v3 };
}