/**
 * 动画物理量看板数据类型定义。
 */

export interface PhysicsQuantity {
  label: string
  symbol?: string
  value: number | string
  unit: string
  color?: string
  highlight?: 'positive' | 'negative' | 'zero' | 'extreme'
}

export interface GaokaoPoint {
  text: string
  importance: 'gaokao' | 'hard' | 'core' | 'basic' | 'extend'
}

export interface Formula {
  name: string
  latex: string
  /** 公式适用条件（如"仅斜向上拉时"） */
  condition?: string
  /** 补充说明（如"脱地时 FN=0"） */
  note?: string
  /** 重要性/高考频率 */
  level?: 'core' | 'important' | 'derived' | 'supplementary'
}

export interface WarningItem {
  text: string
  level: 'info' | 'warning' | 'danger'
}

export interface PhysicsPanelData {
  quantities: PhysicsQuantity[]
  formulas?: Formula[]
  gaokaoPoints?: GaokaoPoint[]
  warnings?: WarningItem[]
  mnemonic?: string
  isTerminal?: boolean
  pauseReason?: 'boundary' | 'terminal' | 'brake' | 'none'
}

/** 物理量构建器函数签名 */
export type QuantityBuilder = (
  animId: string,
  params: Record<string, number>,
  time: number,
) => PhysicsPanelData | null

/** 参数归一化工具类型 */
export type ParamDefs<T> = { [K in keyof T]: { default: T[K]; required?: boolean } }

/**
 * 将 Record<string, number> 归一化为具名接口。
 * 仅处理 params 中存在的 key，缺失的用 defaults 补齐。
 */
export function normalizeParams<T extends Record<string, number>>(
  params: Record<string, number>,
  defs: ParamDefs<T>,
): T {
  const result = {} as Record<string, number>
  for (const key in defs) {
    result[key] = params[key] ?? defs[key].default
  }
  return result as T
}
