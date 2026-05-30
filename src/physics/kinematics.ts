export function calculateUniformMotion(v: number, t: number): { s: number } {
  return { s: v * t };
}

export function calculateAcceleratedMotion(v0: number, a: number, t: number): { v: number; s: number } {
  return {
    v: v0 + a * t,
    s: v0 * t + 0.5 * a * t * t
  };
}

export function calculateFreeFall(v0: number, g: number, t: number): { v: number; y: number } {
  return {
    v: v0 + g * t,
    y: v0 * t + 0.5 * g * t * t
  };
}

export function calculateProjectileMotion(v0x: number, g: number, t: number): { x: number; y: number; vx: number; vy: number; v: number; angle: number } {
  const x = v0x * t;
  const y = 0.5 * g * t * t;
  const vx = v0x;
  const vy = g * t;
  const v = Math.sqrt(vx * vx + vy * vy);
  const angle = Math.atan2(vy, vx);
  return { x, y, vx, vy, v, angle };
}

export function calculateObliqueThrow(v0: number, angleDeg: number, g: number, t: number): { x: number; y: number; vx: number; vy: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  const v0x = v0 * Math.cos(angleRad);
  const v0y = v0 * Math.sin(angleRad);
  return {
    x: v0x * t,
    y: v0y * t - 0.5 * g * t * t,
    vx: v0x,
    vy: v0y - g * t
  };
}

export function calculateObliqueThrowRange(v0: number, angleDeg: number, g: number): { range: number; maxHeight: number; totalTime: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  const totalTime = (2 * v0 * Math.sin(angleRad)) / g;
  const range = (v0 * v0 * Math.sin(2 * angleRad)) / g;
  const maxHeight = (v0 * v0 * Math.sin(angleRad) * Math.sin(angleRad)) / (2 * g);
  return { range, maxHeight, totalTime };
}

export function calculateCircularMotion(r: number, omega: number, t: number): { x: number; y: number; v: number; a_c: number; period: number } {
  const angle = omega * t;
  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle),
    v: r * omega,
    a_c: r * omega * omega,
    period: (2 * Math.PI) / omega
  };
}

export function calculateCircularFromPeriod(r: number, T: number): { omega: number; v: number; a_c: number } {
  const omega = (2 * Math.PI) / T;
  return {
    omega,
    v: r * omega,
    a_c: r * omega * omega
  };
}