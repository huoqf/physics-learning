import React, { useState } from 'react'
import { Key, Target, Play, Award, Zap, ChevronRight, Layers } from 'lucide-react'
import type { Problem, ProblemStep } from '@/data/types'
import { ContentWithKatex } from './ContentWithKatex'
import { Button, Badge } from '@/components/UI'
import { colors } from '@/theme/colors'
import { getProblemMasterModel } from '@/data/masterModels'

interface ProblemDeconstructionProps {
  problem: Problem
  currentStepIndex: number
  onStepChange: (index: number) => void
  onLaunchAnimation?: (animId: string, params?: Record<string, number>) => void
}

/**
 * 高考大题三步破题拆解组件 (ProblemDeconstruction)
 * 严格遵从项目 UI 规范：
 * - 风格：精密学习工具（深海蓝主色 + 冷白/冷灰中性色背景 + 规范圆组与边框）
 * - 颜色 Token：完全引用 @/theme/colors 与通用 UI 组件
 */
export const ProblemDeconstruction: React.FC<ProblemDeconstructionProps> = ({
  problem,
  currentStepIndex,
  onStepChange,
  onLaunchAnimation,
}) => {
  const [activeTab, setActiveTab] = useState<'step1' | 'step2' | 'step3'>('step1')
  const masterModel = getProblemMasterModel(problem)

  const steps = problem.steps || []
  const currentStep: ProblemStep | undefined = steps[currentStepIndex] || steps[0]
  const totalScore = steps.reduce((sum, s) => sum + (s.scorePoints || 0), 0)

  const handleLaunchTargetAnim = (presetParams?: Record<string, number>) => {
    if (!problem.targetAnimation || !onLaunchAnimation) return
    onLaunchAnimation(
      problem.targetAnimation.animId,
      presetParams || problem.targetAnimation.presetParams
    )
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6 mb-6">
      {/* 头部：严格遵循 AnalysisPage 的卡片头部风格 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-md bg-primary-50 text-primary-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-800">高考大题三步破题拆解流</h2>
              <Badge variant="gaokao" className="text-xs">
                高考标准采分
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              条件关键词提取 · 临界物理定格剖析 · 高考阅卷采分点对齐
            </p>
          </div>
        </div>

        {masterModel && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 border border-primary-100 text-xs">
            <Zap className="w-3.5 h-3.5" style={{ color: colors.accent[600] }} />
            <span className="text-neutral-500">归属模型：</span>
            <span className="font-semibold text-primary-700">{masterModel.title}</span>
          </div>
        )}
      </div>

      {/* 三步 Tab 栏：使用项目统一的 Secondary / Primary 标签风格 */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 mb-4 text-xs">
        <button
          onClick={() => setActiveTab('step1')}
          className={`px-3 py-2 rounded-md font-medium flex items-center gap-1.5 transition-all ${
            activeTab === 'step1'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Step 1: 提取题干关键词</span>
        </button>

        <button
          onClick={() => setActiveTab('step2')}
          className={`px-3 py-2 rounded-md font-medium flex items-center gap-1.5 transition-all ${
            activeTab === 'step2'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Step 2: 临界定格与连通</span>
        </button>

        <button
          onClick={() => setActiveTab('step3')}
          className={`px-3 py-2 rounded-md font-medium flex items-center gap-1.5 transition-all ${
            activeTab === 'step3'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Step 3: 阅卷采分点 ({totalScore > 0 ? `${totalScore}分` : '标准步骤'})</span>
        </button>
      </div>

      {/* 主体拆解流体验区 */}
      <div>
        {/* Step 1: 题干关键词与条件方程 */}
        {activeTab === 'step1' && (
          <div className="space-y-3.5">
            <div className="bg-primary-50/60 border border-primary-100 rounded-lg p-4">
              <div className="flex items-center gap-2 text-primary-800 font-semibold text-xs mb-1.5">
                <Key className="w-4 h-4 text-primary-600" />
                <span>核心突破条件 (Key Condition)</span>
              </div>
              <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                {currentStep?.keyCondition || '审题关键：寻找运动状态变化的临界点与受力突变。'}
              </p>
            </div>

            {currentStep?.formula && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-neutral-600 mb-2">
                  📝 第一步建系与物理方程：
                </div>
                <div className="text-sm text-neutral-900 overflow-x-auto py-1">
                  <ContentWithKatex content={currentStep.formula} />
                </div>
              </div>
            )}

            {masterModel && (
              <div className="bg-primary-50/40 border border-primary-100 rounded-lg p-3 flex items-start gap-2.5">
                <Zap className="w-4 h-4 shrink-0 mt-0.5" style={{ color: colors.accent[600] }} />
                <div className="text-xs text-neutral-700">
                  <span className="font-semibold text-primary-800">18大模型秒杀点拨：</span>
                  <span>{masterModel.quickFormula.explanation}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: 临界定格与连通 */}
        {activeTab === 'step2' && (
          <div className="space-y-3.5">
            <div className="bg-primary-50/60 border border-primary-100 rounded-lg p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-primary-900 font-semibold text-xs">
                  <Target className="w-4 h-4 text-primary-600" />
                  <span>物理状态临界剖析</span>
                </div>
                {currentStep?.criticalMoment?.timestamp !== undefined && (
                  <Badge variant="gaokao" className="text-xs">
                    临界时刻: t = {currentStep.criticalMoment.timestamp}s
                  </Badge>
                )}
              </div>
              <p className="text-xs text-neutral-700 leading-relaxed mb-3">
                {currentStep?.criticalMoment?.description ||
                  currentStep?.explanation ||
                  '当系统达到临界状态时，静摩擦力达到最大值，两物体恰好不发生相对滑动。'}
              </p>

              {problem.targetAnimation && onLaunchAnimation && (
                <div className="pt-2.5 border-t border-primary-100 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-primary-700">
                    {problem.targetAnimation.presetDescription || '已准备好真题真实考场参数'}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-1.5 text-xs"
                    onClick={() => handleLaunchTargetAnim()}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>🎥 一键装载真题参数并运行动画</span>
                  </Button>
                </div>
              )}
            </div>

            <div className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3.5 rounded-lg border border-neutral-200">
              <ContentWithKatex content={currentStep?.explanation || ''} />
            </div>
          </div>
        )}

        {/* Step 3: 高考阅卷采分点 */}
        {activeTab === 'step3' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 mb-1 text-xs text-neutral-500">
              <span className="font-medium">高考阅卷标准步骤清单：</span>
              <span>点击步骤卡片可切换分析视角</span>
            </div>

            <div className="space-y-2">
              {steps.map((step, idx) => {
                const isSelected = idx === currentStepIndex
                return (
                  <div
                    key={step.id || idx}
                    onClick={() => onStepChange(idx)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary-50/50 border-primary-300 shadow-sm'
                        : 'bg-white border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-full text-[11px] flex items-center justify-center font-bold ${
                            isSelected
                              ? 'bg-primary-600 text-white'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-neutral-800">
                          {step.description}
                        </span>
                      </div>

                      {step.scorePoints && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-success-50 text-success-700 border border-success-200">
                          +{step.scorePoints} 分
                        </span>
                      )}
                    </div>

                    {step.formula && (
                      <div className="mt-1.5 text-xs text-neutral-800 bg-white p-2 rounded border border-neutral-100 overflow-x-auto">
                        <ContentWithKatex content={step.formula} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 底部控制区：遵从 02_UI_RULES 标准间距与控制 */}
      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
        <span>当前视点：步骤 {currentStepIndex + 1} / {steps.length}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={currentStepIndex === 0}
            onClick={() => onStepChange(Math.max(0, currentStepIndex - 1))}
            className="text-xs"
          >
            上一步
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={currentStepIndex === steps.length - 1}
            onClick={() => onStepChange(Math.min(steps.length - 1, currentStepIndex + 1))}
            className="text-xs flex items-center gap-1"
          >
            <span>下一步</span>
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
