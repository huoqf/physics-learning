/**
 * 智能数字格式化 — 用于图表坐标轴刻度标签
 *
 * 根据数值大小自动选择最紧凑的显示格式：
 * - |v| >= 1e8  →  科学计数法 1.23e8
 * - |v| >= 1e4  →  缩写     1.23万 / 1.23M（取决于语言习惯，这里用科学计数法）
 * - |v| >= 1    →  小数位自适应  123 / 12.3 / 1.23
 * - |v| > 0     →  科学计数法 1.23e-4
 * - v === 0     →  "0"
 */
export function smartFormat(v: number): string {
  if (!Number.isFinite(v)) return String(v)
  if (v === 0) return '0'

  const abs = Math.abs(v)

  // 极大数：科学计数法
  if (abs >= 1e8) {
    return v.toExponential(1)
  }

  // 大数：科学计数法
  if (abs >= 1e4) {
    return v.toExponential(2)
  }

  // 中等数：自适应小数位
  if (abs >= 100) {
    return v.toFixed(0)
  }
  if (abs >= 10) {
    return v.toFixed(1)
  }
  if (abs >= 1) {
    return v.toFixed(2)
  }

  // 极小数：科学计数法
  if (abs >= 0.01) {
    return v.toFixed(3)
  }

  return v.toExponential(1)
}

/**
 * 生成带单位的格式化函数
 * @example formatYWithUnit(5, 'N/C') => "5.00 N/C"
 */
export function smartFormatWith(unit: string): (v: number) => string {
  return (v: number) => `${smartFormat(v)} ${unit}`
}
