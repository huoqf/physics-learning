import React from 'react'
import { KatexFormula } from './KatexFormula'
import { colors } from '@/theme/colors'
import { duration } from '@/theme/motion'

interface PhysicsQuantity {
  label: string
  value: number | string
  unit: string
  color?: string
  highlight?: 'positive' | 'negative' | 'zero' | 'extreme'
}

interface Formula {
  name: string
  latex: string
}

interface GaokaoPoint {
  text: string
  importance: 'gaokao' | 'hard' | 'core' | 'basic' | 'extend'
}

interface PhysicsPanelProps {
  quantities: PhysicsQuantity[]
  formulas?: Formula[]
  gaokaoPoints?: GaokaoPoint[]
  title?: string
}

export const PhysicsPanel: React.FC<PhysicsPanelProps> = ({
  quantities,
  formulas = [],
  gaokaoPoints = [],
  title = '物理量',
}) => {
  const getValueColor = (quantity: PhysicsQuantity) => {
    if (quantity.highlight === 'positive') return colors.danger[600]
    if (quantity.highlight === 'negative') return colors.success[600]
    if (quantity.highlight === 'zero') return colors.neutral[400]
    if (quantity.highlight === 'extreme') return colors.accent[600]
    return colors.neutral[700]
  }

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-sm border border-neutral-200 p-4 overflow-y-auto">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-neutral-800 mb-3">{title}</h3>
        
        <div className="space-y-2">
          {quantities.map((q, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-1.5 border-b border-neutral-100 last:border-0 transition-all"
              style={{
                transitionProperty: 'all',
                transitionDuration: `${duration.fast}ms`,
                transitionTimingFunction: 'ease-out',
              }}
            >
              <span className="text-xs font-medium text-neutral-600 min-w-[60px]">
                {q.label}
              </span>
              <div className="flex items-center gap-1">
                <span
                  className="text-sm font-mono font-medium"
                  style={{ color: getValueColor(q) }}
                >
                  {typeof q.value === 'number' ? q.value.toFixed(2) : q.value}
                </span>
                <span className="text-xs text-neutral-500">{q.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {formulas.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-neutral-700 mb-2">公式</h3>
          <div className="space-y-3 bg-neutral-50 rounded-md p-3">
            {formulas.map((formula, index) => (
              <div key={index} className="text-xs">
                <span className="text-neutral-500 block mb-1">{formula.name}</span>
                <div className="flex justify-center">
                  <KatexFormula formula={formula.latex} mode="block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {gaokaoPoints.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-neutral-700 mb-2">高考要点</h3>
          <div className="space-y-2">
            {gaokaoPoints.map((point, index) => (
              <div
                key={index}
                className="p-2 rounded text-xs leading-relaxed"
                style={{
                  backgroundColor:
                    point.importance === 'gaokao'
                      ? colors.accent[100]
                      : point.importance === 'hard'
                      ? colors.danger[100]
                      : point.importance === 'core'
                      ? colors.primary[100]
                      : point.importance === 'basic'
                      ? colors.neutral[100]
                      : colors.secondary[100],
                  borderLeft: `4px solid ${
                    point.importance === 'gaokao'
                      ? colors.accent[600]
                      : point.importance === 'hard'
                      ? colors.danger[600]
                      : point.importance === 'core'
                      ? colors.primary[600]
                      : point.importance === 'basic'
                      ? colors.neutral[500]
                      : colors.secondary[600]
                  }`,
                }}
              >
                <span
                  className="block"
                  style={{
                    color:
                      point.importance === 'gaokao'
                        ? colors.accent[700]
                        : point.importance === 'hard'
                        ? colors.danger[700]
                        : point.importance === 'core'
                        ? colors.primary[700]
                        : point.importance === 'basic'
                        ? colors.neutral[600]
                        : colors.secondary[700],
                  }}
                >
                  {point.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {quantities.length === 0 && formulas.length === 0 && gaokaoPoints.length === 0 && (
        <div className="text-center text-neutral-400 py-8">
          <p className="text-sm">暂无数据</p>
        </div>
      )}
    </div>
  )
}

export default PhysicsPanel
