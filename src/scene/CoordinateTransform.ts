import type { Vector2 } from '../physics/Vector2';

export interface CoordinateTransform {
  transform: (v: Vector2) => Vector2;
  inverse: (v: Vector2) => Vector2;
}

export const IDENTITY: CoordinateTransform = {
  transform: (v) => v,
  inverse: (v) => v,
};

export function createRotationTransform(angleRad: number): CoordinateTransform {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    transform: (v) => ({
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos,
    }),
    inverse: (v) => ({
      x: v.x * cos + v.y * sin,
      y: -v.x * sin + v.y * cos,
    }),
  };
}
