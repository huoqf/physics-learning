/**
 * 动画物理量看板数据类型定义。
 */

export interface PhysicsQuantity {
  label: string
  value: number | string
  unit: string
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

export interface PhysicsPanelData {
  quantities: PhysicsQuantity[]
  formulas?: Formula[]
  gaokaoPoints?: GaokaoPoint[]
}

/** 物理量构建器函数签名 */
export type QuantityBuilder = (
  animId: string,
  params: Record<string, number>,
  time: number,
) => PhysicsPanelData | null
