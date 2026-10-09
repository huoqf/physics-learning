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

const SUPERSCRIPT_MAP: Record<string, string> = {
  '-': '⁻',
  '+': '⁺',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
}

/**
 * 将数字或数字字符串转换为 Unicode 上标字符串
 */
export function toSuperscript(num: number | string): string {
  return String(num)
    .split('')
    .map((ch) => SUPERSCRIPT_MAP[ch] ?? ch)
    .join('')
}

/**
 * 高中课标规范科学记数法格式化 (如 "3.34 × 10⁻²⁶")
 */
export function formatScientific(v: number, precision = 2): string {
  if (!Number.isFinite(v) || v === 0) return '0'
  const [mantissaStr, expStr] = v.toExponential(precision).split('e')
  const expNum = parseInt(expStr, 10)
  if (expNum === 0) return mantissaStr
  return `${mantissaStr} × 10${toSuperscript(expNum)}`
}

/**
 * 拆解科学记数法为尾数与带量纲指数单位后缀，适配物理看板 { value, unit }
 * @example splitScientific(3.34e-26, 2, 'kg') => { value: '3.34', unit: '×10⁻²⁶ kg' }
 */
export function splitScientific(
  v: number,
  precision = 2,
  baseUnit = '',
): { value: string; unit: string } {
  if (!Number.isFinite(v) || v === 0) return { value: '0', unit: baseUnit }
  const [mantissaStr, expStr] = v.toExponential(precision).split('e')
  const expNum = parseInt(expStr, 10)
  if (expNum === 0) return { value: mantissaStr, unit: baseUnit }
  const prefix = `×10${toSuperscript(expNum)}`
  const unit = baseUnit ? `${prefix} ${baseUnit}` : prefix
  return { value: mantissaStr, unit }
}
