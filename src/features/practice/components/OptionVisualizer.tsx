import React, { useState } from 'react'
import { Eye, CheckCircle, XCircle, Play, Sparkles } from 'lucide-react'
import type { Problem } from '@/data/types'
import { Button } from '@/components/UI'
import { colors } from '@/theme/colors'

interface OptionVisualizerProps {
  problem: Problem
  onLaunchAnimation?: (animId: string, params?: Record<string, number>) => void
}

/**
 * 选择题选项可视化演练验证组件 (OptionVisualizer)
 * 严格遵从项目 UI 规范：与 PracticeSession 页面整体设计一致
 */
export const OptionVisualizer: React.FC<OptionVisualizerProps> = ({
  problem,
  onLaunchAnimation,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const optionExplanations = problem.optionExplanations || {}
  const optionsKeys = Object.keys(optionExplanations)

  if (optionsKeys.length === 0) {
    return null
  }

  const activeOptionData = selectedOption ? optionExplanations[selectedOption] : null

  return (
    <div className="mt-4 bg-white rounded-lg border border-neutral-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-neutral-100">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
          <Sparkles className="w-4 h-4" style={{ color: colors.accent[600] }} />
          <span>选项物理可视化演练与推断 (Option Visualizer)</span>
        </div>
        <span className="text-xs text-neutral-400">点击下方选项进行轨迹/受力推演</span>
      </div>

      {/* 选项按钮列表：直接使用 Button 组件变体 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {optionsKeys.map((key) => {
          const isSelected = selectedOption === key
          const opt = optionExplanations[key]

          return (
            <button
              key={key}
              onClick={() => setSelectedOption(isSelected ? null : key)}
              className={`px-3 py-2 rounded-md border text-xs font-medium flex items-center justify-between transition-all ${
                isSelected
                  ? opt?.isCorrect
                    ? 'bg-success-50 border-success-300 text-success-800 shadow-sm'
                    : 'bg-danger-50 border-danger-300 text-danger-800 shadow-sm'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <span>选项 {key}</span>
              <Eye className="w-3.5 h-3.5 opacity-60" />
            </button>
          )
        })}
      </div>

      {/* 展开选中选项推导板 */}
      {activeOptionData && (
        <div
          className={`p-3.5 rounded-lg border text-xs transition-all ${
            activeOptionData.isCorrect
              ? 'bg-success-50/60 border-success-200 text-success-900'
              : 'bg-danger-50/60 border-danger-200 text-danger-900'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5 font-semibold">
            <div className="flex items-center gap-1.5">
              {activeOptionData.isCorrect ? (
                <CheckCircle className="w-4 h-4 text-success-600" />
              ) : (
                <XCircle className="w-4 h-4 text-danger-600" />
              )}
              <span>
                选项 {selectedOption} 推断结果：{activeOptionData.isCorrect ? '物理结论正确' : '物理逻辑陷阱'}
              </span>
            </div>
          </div>

          <p className="text-neutral-700 leading-relaxed mb-2 font-normal">
            {activeOptionData.explanation}
          </p>

          {activeOptionData.visualHint && (
            <div className="bg-white p-2 rounded border border-neutral-200/80 text-neutral-600 mb-2">
              <span className="font-semibold text-neutral-800">💡 视觉演示提醒：</span>
              <span>{activeOptionData.visualHint}</span>
            </div>
          )}

          {problem.targetAnimation && onLaunchAnimation && (
            <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-end">
              <Button
                variant="secondary"
                size="sm"
                className="text-xs flex items-center gap-1"
                onClick={() =>
                  onLaunchAnimation(
                    problem.targetAnimation!.animId,
                    activeOptionData.animParams || problem.targetAnimation?.presetParams
                  )
                }
              >
                <Play className="w-3.5 h-3.5 text-primary-600" />
                <span>演示选项 {selectedOption} 运动演变</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
