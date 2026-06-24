export function isThisWeek(ts: number): boolean {
  return Date.now() - ts <= 7 * 24 * 60 * 60 * 1000
}