const INITIAL_TEMP = 20
const MAX_TEMP = 80

export function tempToColor(temp: number): string {
  const t = Math.min(1, Math.max(0, (temp - INITIAL_TEMP) / (MAX_TEMP - INITIAL_TEMP)))
  const r = Math.round(180 + t * 60)
  const g = Math.round(210 - t * 120)
  const b = Math.round(240 - t * 170)
  return `rgb(${r}, ${g}, ${b})`
}
