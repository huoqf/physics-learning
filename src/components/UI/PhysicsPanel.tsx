import React, { useState } from 'react'
import { ChevronDown, Award, AlertTriangle, AlertCircle, Info, BookOpen } from 'lucide-react'
import { KatexFormula } from './KatexFormula'
import { colors } from '@/theme/colors'
import { duration } from '@/theme/motion'
import { useTimedPulse } from '@/hooks/useTimedPulse'

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
  gaokao: { bg: colors.accent[50], border: colors.accent[500], text: colors.accent[700], label: '高考要点', labelBg: colors.accent[600], labelText: '#fff' },
  hard: { bg: colors.danger[50], border: colors.danger[400], text: colors.danger[700], label: '重难点', labelBg: colors.danger[500], labelText: '#fff' },
  core: { bg: colors.primary[50], border: colors.primary[400], text: colors.primary[700], label: '核心考点', labelBg: colors.primary[600], labelText: '#fff' },
  basic: { bg: colors.neutral[50], border: colors.neutral[300], text: colors.neutral[600], label: '基础概念', labelBg: colors.neutral[500], labelText: '#fff' },
  extend: { bg: colors.secondary[50], border: colors.secondary[400], text: colors.secondary[700], label: '拓展延伸', labelBg: colors.secondary[600], labelText: '#fff' },
}

// 易错警示级别样式
const WARNING_LEVEL_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  danger: { bg: colors.danger[50], border: colors.danger[500], text: colors.danger[700] },
  warning: { bg: colors.accent[50], border: colors.accent[500], text: colors.accent[700] },
  info: { bg: colors.primary[50], border: colors.primary[500], text: colors.primary[700] },
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
  const [formulasOpen, setFormulasOpen] = useState(true)
  const [warningsOpen, setWarningsOpen] = useState(true)
  const [gaokaoOpen, setGaokaoOpen] = useState(true)
  const [mnemonicOpen, setMnemonicOpen] = useState(true)
  const showPulse = useTimedPulse(!!isTerminal, 3000)

  // 数值颜色：正数 neutral-700、负数 danger-600、零值 neutral-400、极值 accent-600
  const getValueColor = (quantity: PhysicsQuantity) => {
    if (quantity.highlight === 'negative') return colors.danger[600]
    if (quantity.highlight === 'zero') return colors.neutral[400]
    if (quantity.highlight === 'extreme') return colors.accent[600]
    return colors.neutral[700]
  }

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-sm border border-neutral-200 p-4 overflow-y-auto space-y-5">
      {/* ── 物理量区 ── */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-600 mb-3 border-b border-neutral-100 pb-1.5">{title}</h3>

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
                    className="shrink-0 w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: q.color }}
                  />
                )}
                <span className="text-xs font-medium text-neutral-600 truncate">
                  {q.symbol ? `${q.label} ${q.symbol}` : q.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1 shrink-0">
                <span
                  className="text-sm font-mono font-semibold"
                  style={{ color: getValueColor(q) }}
                >
                  {typeof q.value === 'number' ? q.value.toFixed(2) : q.value}
                </span>
                {q.unit && <span className="text-[10px] text-neutral-500 font-medium ml-1">{q.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 终止态指示 ── */}
      {isTerminal && pauseReason && pauseReason !== 'none' && (
        <div
          className={`px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 border shadow-sm ${showPulse ? 'animate-pulse' : ''}`}
          style={{
            backgroundColor: colors.accent[50],
            color: colors.accent[700],
            borderColor: colors.accent[200],
          }}
        >
          <span className="text-sm">🛑</span>
          <span>系统提示：{PAUSE_REASON_TEXT[pauseReason] ?? '运动终止'}</span>
        </div>
      )}

      {/* ── 公式区 ── */}
      {formulas.length > 0 && (
        <div>
          <button
            onClick={() => setFormulasOpen(!formulasOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-neutral-600 mb-2.5 hover:text-neutral-900 transition-colors focus:outline-none cursor-pointer border-b border-neutral-100 pb-1.5"
          >
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary-500" />
              <span>公式体系</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${formulasOpen ? 'rotate-0' : '-rotate-90'}`} />
          </button>
          {formulasOpen && (
            <div className="space-y-2.5 transition-all duration-200">
              {formulas.map((formula, index) => {
                const levelStyle = formula.level ? FORMULA_LEVEL_STYLES[formula.level] : undefined
                return (
                  <div key={index} className="p-2.5 rounded-lg border border-primary-100 bg-primary-50/20 text-xs shadow-sm flex flex-col gap-1">
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <span className="font-semibold text-neutral-800">{formula.name}</span>
                      {levelStyle && (
                        <span
                          className="text-[9px] px-1 py-0.5 rounded font-semibold"
                          style={{ backgroundColor: levelStyle.bg, color: levelStyle.text }}
                        >
                          {levelStyle.label}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-center py-1.5 bg-white rounded border border-neutral-100/50 my-1 overflow-x-auto min-h-[36px] items-center">
                      <KatexFormula formula={formula.latex} mode="inline" />
                    </div>
                    {formula.condition && (
                      <div className="text-[10px] text-accent-700 mt-0.5 flex items-start gap-1 font-medium">
                        <span className="shrink-0 text-[8px] bg-accent-100 text-accent-700 px-1 py-0.2 rounded font-semibold leading-none mt-0.5">条件</span>
                        <span>{formula.condition}</span>
                      </div>
                    )}
                    {formula.note && (
                      <div className="text-[10px] text-neutral-400 mt-0.5 pl-1">
                        💡 {formula.note}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 易错警示区 ── */}
      {warnings.length > 0 && (
        <div>
          <button
            onClick={() => setWarningsOpen(!warningsOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-neutral-600 mb-2.5 hover:text-neutral-900 transition-colors focus:outline-none cursor-pointer border-b border-neutral-100 pb-1.5"
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-danger-500" />
              <span>易错警示</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${warningsOpen ? 'rotate-0' : '-rotate-90'}`} />
          </button>
          {warningsOpen && (
            <div className="space-y-2 transition-all duration-200">
              {warnings.map((w, index) => {
                const style = WARNING_LEVEL_STYLES[w.level] ?? WARNING_LEVEL_STYLES.info
                const IconComponent = w.level === 'danger' ? AlertCircle : (w.level === 'warning' ? AlertTriangle : Info)
                return (
                  <div
                    key={index}
                    className="p-3 rounded-lg border-l-4 text-xs leading-relaxed flex items-start gap-2 shadow-sm border border-neutral-100"
                    style={{
                      backgroundColor: style.bg,
                      borderLeftColor: style.border,
                      color: style.text,
                    }}
                  >
                    <IconComponent className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{w.text}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 高考要点区 ── */}
      {gaokaoPoints.length > 0 && (
        <div>
          <button
            onClick={() => setGaokaoOpen(!gaokaoOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-neutral-600 mb-2.5 hover:text-neutral-900 transition-colors focus:outline-none cursor-pointer border-b border-neutral-100 pb-1.5"
          >
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-accent-600" />
              <span>高考要点</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${gaokaoOpen ? 'rotate-0' : '-rotate-90'}`} />
          </button>
          {gaokaoOpen && (
            <div className="space-y-2 transition-all duration-200">
              {gaokaoPoints.map((point, index) => {
                const style = GAOKAO_LEVEL_STYLES[point.importance] ?? GAOKAO_LEVEL_STYLES.basic
                return (
                  <div
                    key={index}
                    className="p-3 rounded-lg border-l-4 text-xs leading-relaxed flex items-start gap-2 shadow-sm border border-neutral-100"
                    style={{
                      backgroundColor: style.bg,
                      borderLeftColor: style.border,
                      color: style.text,
                    }}
                  >
                    <Award className="w-4 h-4 shrink-0 mt-0.5 text-accent-600" />
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center">
                        <span
                          className="text-[9px] px-1 py-0.5 rounded font-semibold leading-none"
                          style={{ backgroundColor: style.labelBg, color: style.labelText }}
                        >
                          {style.label}
                        </span>
                      </div>
                      <span className="text-neutral-700 font-medium">{point.text}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 口诀区 ── */}
      {mnemonic && (
        <div>
          <button
            onClick={() => setMnemonicOpen(!mnemonicOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-neutral-600 mb-2.5 hover:text-neutral-900 transition-colors focus:outline-none cursor-pointer border-b border-neutral-100 pb-1.5"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🗣️</span>
              <span>记忆口诀</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${mnemonicOpen ? 'rotate-0' : '-rotate-90'}`} />
          </button>
          {mnemonicOpen && (
            <div
              className="px-3 py-2.5 rounded-lg text-xs leading-relaxed border shadow-sm font-medium"
              style={{
                backgroundColor: colors.secondary[50],
                borderColor: colors.secondary[200],
                color: colors.secondary[700],
              }}
            >
              {mnemonic}
            </div>
          )}
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
