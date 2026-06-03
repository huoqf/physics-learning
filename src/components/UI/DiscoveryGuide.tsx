import React, { useState } from 'react'
import { ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react'
import { colors } from '@/theme/colors'
import { duration, easing } from '@/theme/motion'

export interface DiscoveryStepData {
  title: string
  description: string
  content: React.ReactNode
  hint?: string
}

interface DiscoveryGuideProps {
  steps: DiscoveryStepData[]
  currentStep: number
  onNext: () => void
  onPrev: () => void
  onStepClick: (step: number) => void
}

export const DiscoveryGuide: React.FC<DiscoveryGuideProps> = ({
  steps,
  currentStep,
  onNext,
  onPrev,
  onStepClick,
}) => {
  const [showHint, setShowHint] = useState(false)
  const step = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100
  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0

  // 步骤切换时重置提示
  const handleStepClick = (s: number) => {
    setShowHint(false)
    onStepClick(s)
  }
  const handleNext = () => {
    setShowHint(false)
    onNext()
  }
  const handlePrev = () => {
    setShowHint(false)
    onPrev()
  }

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
      {/* 进度条 */}
      <div className="h-1 bg-neutral-200 shrink-0">
        <div
          className="h-full transition-all"
          style={{
            width: `${progress}%`,
            backgroundColor: colors.primary[600],
            transitionProperty: 'all',
            transitionDuration: `${duration.normal}ms`,
            transitionTimingFunction: easing.standard,
          }}
        />
      </div>

      {/* 步骤指示器 */}
      <div className="flex items-center gap-1 px-3 py-2 bg-neutral-50 border-b border-neutral-200 shrink-0">
        {steps.map((_, index) => (
          <button
            key={index}
            onClick={() => handleStepClick(index)}
            className="flex-1 h-1.5 rounded-full transition-all hover:scale-110"
            style={{
              backgroundColor:
                index <= currentStep
                  ? colors.primary[600]
                  : colors.neutral[300],
              transitionProperty: 'all',
              transitionDuration: `${duration.fast}ms`,
              transitionTimingFunction: easing.standard,
            }}
          />
        ))}
      </div>

      {/* 步骤标题 */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: colors.primary[600] }}
          >
            {currentStep + 1}
          </span>
          <h4
            className="text-sm font-bold"
            style={{ color: colors.primary[700] }}
          >
            {step.title}
          </h4>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed mt-1.5 ml-7">
          {step.description}
        </p>
      </div>

      {/* 步骤内容区（可滚动） */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-0">
        {step.content}
      </div>

      {/* 提示区 */}
      {step.hint && (
        <div className="px-3 pb-2 shrink-0">
          {!showHint ? (
            <button
              onClick={() => setShowHint(true)}
              className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 transition-all"
              style={{
                transitionProperty: 'all',
                transitionDuration: `${duration.fast}ms`,
                transitionTimingFunction: easing.standard,
              }}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>需要提示？</span>
            </button>
          ) : (
            <div
              className="p-2 rounded text-xs leading-relaxed border-l-4"
              style={{
                backgroundColor: colors.accent[50],
                color: colors.accent[800],
                borderLeftColor: colors.accent[500],
                transitionProperty: 'all',
                transitionDuration: `${duration.normal}ms`,
                transitionTimingFunction: easing.standard,
              }}
            >
              <div className="flex items-start gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{step.hint}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 导航按钮 */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 border-t border-neutral-200 shrink-0">
        <button
          onClick={handlePrev}
          disabled={isFirst}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-200 active:scale-[0.98]"
          style={{
            transitionProperty: 'all',
            transitionDuration: `${duration.fast}ms`,
            transitionTimingFunction: easing.standard,
            color: colors.neutral[700],
          }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>上一步</span>
        </button>

        <span className="text-xs text-neutral-500">
          {currentStep + 1} / {steps.length}
        </span>

        <button
          onClick={handleNext}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            backgroundColor: colors.primary[600],
            transitionProperty: 'all',
            transitionDuration: `${duration.fast}ms`,
            transitionTimingFunction: easing.standard,
          }}
        >
          <span>{isLast ? '完成' : '下一步'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default DiscoveryGuide
