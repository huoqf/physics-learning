import { deg2rad } from '@/math/angle'

/** 生成箭头三角形的 SVG points 属性值 */
export function arrowHeadPoints(
  tipX: number, tipY: number,
  dirX: number, dirY: number,
  len: number, halfW: number,
): string {
  const px = -dirY, py = dirX
  const bx = tipX - len * dirX, by = tipY - len * dirY
  return `${tipX},${tipY} ${bx + halfW * px},${by + halfW * py} ${bx - halfW * px},${by - halfW * py}`
}

/** 生成圆弧 SVG path（角度制，顺时针方向） */
export function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = deg2rad(startDeg)
  const e = deg2rad(endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(e)} ${cy + r * Math.sin(e)}`
}
