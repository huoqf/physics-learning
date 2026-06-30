export function lensShape(cx: number, cy: number, halfH: number, isConcave: boolean): string {
  const bow = isConcave ? -8 : 8
  const top = cy - halfH
  const bot = cy + halfH
  return `M ${cx} ${top} Q ${cx + bow} ${cy} ${cx} ${bot} Q ${cx - bow} ${cy} ${cx} ${top} Z`
}
