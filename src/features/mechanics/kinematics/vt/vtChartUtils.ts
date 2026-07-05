import type { MouseEvent } from 'react';
import { clientToSvgPoint } from '@/utils';

export function toSvgLocalX(e: MouseEvent<SVGElement>): number {
  const svg = e.currentTarget.ownerSVGElement;
  if (!svg) return 0;
  return clientToSvgPoint(e.clientX, e.clientY, svg)?.x ?? 0;
}

export function buildPath(
  points: { x: number; y: number }[],
  toSvgX: (v: number) => number,
  toSvgY: (v: number) => number,
): string {
  if (points.length < 2) return '';
  return (
    'M ' +
    points
      .map((p) => `${toSvgX(p.x).toFixed(2)},${toSvgY(p.y).toFixed(2)}`)
      .join(' L ')
  );
}
