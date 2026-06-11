import React from 'react'
import { KatexFormula } from './KatexFormula'
import { colors } from '@/theme/colors'
import { duration } from '@/theme/motion'

interface PhysicsQuantity {
  label: string
  symbol?: string
  value: number | string
  unit: string
  color?: string
  highlight?: 'positive' | 'negative' | 'zero' | 'extreme'
}

interface Formula {
  name: string
  latex: string
  condition?: string
  note?: string
  level?: 'core' | 'important' | 'derived' | 'supplementary'
}

interface GaokaoPoint {
  text: string
  importance: 'gaokao' | 'hard' | 'core' | 'basic' | 'extend'
}

interface WarningItem {
  text: string
  level: 'info' | 'warning' | 'danger'
}

interface PhysicsPanelProps {
  quantities: PhysicsQuantity[]
  formulas?: Formula[]
  gaokaoPoints?: GaokaoPoint[]
  warnings?: WarningItem[]
  mnemonic?: string
  isTerminal?: boolean
  pauseReason?: 'boundary' | 'terminal' | 'brake' | 'none'
  title?: string
}

// 公式 level 标签样式（颜色走 token）
const FORMULA_LEVEL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  core: { bg: colors.primary[100], text: colors.primary[700], label: '核心' },
  important: { bg: colors.accent[100], text: colors.accent[700], label: '重要' },
  derived: { bg: colors.neutral[100], text: colors.neutral[500], label: '推导' },
  supplementary: { bg: colors.neutral[50], text: colors.neutral[400], label: '补充' },
}

// 高考要点级别样式
const GAOKAO_LEVEL_STYLES: Record<string, { bg: string; border: string; text: string; label: string; labelBg: string; labelText: string }> = {
  gaokao: { bg: colors.accent[100], border: colors.accent[600], text: colors.accent[700], label: '高考', labelBg: colors.accent[600], labelText: '#fff' },
  hard: { bg: colors.danger[100], border: colors.danger[600], text: colors.danger[700], label: '难点', labelBg: colors.danger[600], labelText: '#fff' },
  core: { bg: colors.primary[100], border: colors.primary[600], text: colors.primary[700], label: '核心', labelBg: colors.primary[600], labelText: '#fff' },
  basic: { bg: colors.neutral[100], border: colors.neutral[500], text: colors.neutral[600], label: '基础', labelBg: colors.neutral[500], labelText: '#fff' },
  extend: { bg: colors.secondary[100], border: colors.secondary[600], text: colors.secondary[700], label: '拓展', labelBg: colors.secondary[600], labelText: '#fff' },
}

// 易错警示级别样式
const WARNING_LEVEL_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  danger: { bg: colors.danger[50], border: colors.danger[500], text: colors.danger[700], icon: '⚠' },
  warning: { bg: colors.accent[50], border: colors.accent[500], text: colors.accent[700], icon: '⚡' },
  info: { bg: colors.primary[50], border: colors.primary[500], text: colors.primary[700], icon: '💡' },
}

// 暂停原因文案
const PAUSE_REASON_TEXT: Record<string, string> = {
  boundary: '到达边界',
  terminal: '已达收尾速度',
  brake: '刹车停止',
  none: '',
}

export const PhysicsPanel: React.FC<PhysicsPanelProps> = ({
  quantities,
  formulas = [],
  gaokaoPoints = [],
  warnings = [],
  mnemonic,
  isTerminal,
  pauseReason,
  title = '物理量',
}) => {
  // 数值颜色：正数 neutral-700、负数 danger-600、零值 neutral-400、极值 accent-600
  const getValueColor = (quantity: PhysicsQuantity) => {
    if (quantity.highlight === 'negative') return colors.danger[600]
    if (quantity.highlight === 'zero') return colors.neutral[400]
    if (quantity.highlight === 'extreme') return colors.accent[600]
    return colors.neutral[700]
  }

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-sm border border-neutral-200 p-4 overflow-y-auto">
      {/* ── 物理量区 ── */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-neutral-600 mb-3">{title}</h3>

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
              <div className="flex items-center gap-1.5 min-w-0">
                {q.color && (
                  <span
                    className="shrink-0 w-2 h-2 rounded-full"
                    style={{ backgroundColor: q.color }}
                  />
                )}
                <span className="text-xs font-medium text-neutral-600 truncate">
                  {q.symbol ? `${q.label} ${q.symbol}` : q.label}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className="text-sm font-mono font-medium"
                  style={{ color: getValueColor(q) }}
                >
                  {typeof q.value === 'number' ? q.value.toFixed(2) : q.value}
                </span>
                {q.unit && <span className="text-xs text-neutral-500">{q.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 终止态指示 ── */}
      {isTerminal && pauseReason && pauseReason !== 'none' && (
        <div
          className="mb-4 px-3 py-2 rounded-lg text-xs font-medium"
          style={{
            backgroundColor: colors.accent[50],
            color: colors.accent[700],
            border: `1px solid ${colors.accent[200]}`,
          }}
        >
          {PAUSE_REASON_TEXT[pauseReason] ?? '运动终止'}
        </div>
      )}

      {/* ── 公式区 ── */}
      {formulas.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-neutral-600 mb-2">公式</h3>
          <div className="space-y-1.5">
            {formulas.map((formula, index) => {
              const levelStyle = formula.level ? FORMULA_LEVEL_STYLES[formula.level] : undefined
              return (
                <div key={index} className="text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-neutral-500 inline">{formula.name}：</span>
                    <span className="ml-1 inline-block">
                      <KatexFormula formula={formula.latex} mode="inline" />
                    </span>
                    {levelStyle && (
                      <span
                        className="text-[9px] px-1 py-0.5 rounded font-medium"
                        style={{ backgroundColor: levelStyle.bg, color: levelStyle.text }}
                      >
                        {levelStyle.label}
                      </span>
                    )}
                  </div>
                  {formula.condition && (
                    <div className="mt-0.5 text-[10px] italic pl-1" style={{ color: colors.accent[600] }}>
                      适用条件：{formula.condition}
                    </div>
                  )}
                  {formula.note && (
                    <div className="mt-0.5 text-[10px] text-neutral-400 pl-1">
                      {formula.note}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 易错警示区 ── */}
      {warnings.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-neutral-600 mb-2">易错警示</h3>
          <div className="space-y-1.5">
            {warnings.map((w, index) => {
              const style = WARNING_LEVEL_STYLES[w.level] ?? WARNING_LEVEL_STYLES.info
              return (
                <div
                  key={index}
                  className="px-2.5 py-1.5 rounded text-xs leading-relaxed"
                  style={{
                    backgroundColor: style.bg,
                    borderLeft: `3px solid ${style.border}`,
                    color: style.text,
                  }}
                >
                  <span className="mr-1">{style.icon}</span>
                  {w.text}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 高考要点区 ── */}
      {gaokaoPoints.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-neutral-600 mb-2">高考要点</h3>
          <div className="space-y-2">
            {gaokaoPoints.map((point, index) => {
              const style = GAOKAO_LEVEL_STYLES[point.importance] ?? GAOKAO_LEVEL_STYLES.basic
              return (
                <div
                  key={index}
                  className="p-2 rounded text-xs leading-relaxed"
                  style={{
                    backgroundColor: style.bg,
                    borderLeft: `4px solid ${style.border}`,
                    color: style.text,
                  }}
                >
                  <div className="flex items-start gap-1.5">
                    <span
                      className="shrink-0 text-[9px] px-1 py-0.5 rounded font-medium leading-none mt-0.5"
                      style={{ backgroundColor: style.labelBg, color: style.labelText }}
                    >
                      {style.label}
                    </span>
                    <span className="block">{point.text}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 口诀区 ── */}
      {mnemonic && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-neutral-600 mb-2">口诀</h3>
          <div
            className="px-3 py-2 rounded-lg text-xs leading-relaxed"
            style={{
              backgroundColor: colors.secondary[50],
              border: `1px solid ${colors.secondary[200]}`,
              color: colors.secondary[700],
            }}
          >
            {mnemonic}
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
