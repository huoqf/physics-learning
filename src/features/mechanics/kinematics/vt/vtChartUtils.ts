import type { MouseEvent } from 'react';

export function toSvgLocalX(e: MouseEvent<SVGElement>): number {
  const svg = e.currentTarget.ownerSVGElement;
  if (!svg) return 0;
  const rect = svg.getBoundingClientRect();
  const svgWidth = svg.viewBox.baseVal.width || svg.width.baseVal.value || rect.width;
  return (e.clientX - rect.left) * (svgWidth / Math.max(rect.width, 1));
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
