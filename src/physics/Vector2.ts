export interface Vector2 {
  x: number;
  y: number;
}

export function magnitude(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalize(v: Vector2): Vector2 {
  const m = magnitude(v);
  return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
}

export function direction(v: Vector2): number {
  return Math.atan2(v.y, v.x);
}

export function scale(v: Vector2, s: number): Vector2 {
  return { x: v.x * s, y: v.y * s };
}

export function add(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function fromPhysics(mag: number, angleRad: number): Vector2 {
  return { x: mag * Math.cos(angleRad), y: mag * Math.sin(angleRad) };
}
