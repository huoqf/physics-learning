import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ContentWithKatex, StepCard, KnowledgeChain, useAnalysisSteps } from '@/features/analysis'
import { getKnowledgeNode } from '@/data/knowledgeTree'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'

const difficultyLabels = ['入门', '基础', '中等', '较难', '困难']
const difficultyColors: Record<number, string> = {
  1: 'bg-success-100 text-success-700',
  2: 'bg-primary-100 text-primary-700',
  3: 'bg-accent-100 text-accent-700',
  4: 'bg-warning-100 text-warning-700',
  5: 'bg-danger-100 text-danger-700',
}

export default function AnalysisPage() {
  const navigate = useNavigate()
  const {
    id, problem, analysisEntry, wrongRecord,
    addWrong, markMastered,
    expandedSteps, currentStepIndex,
    completedKnowledgeIds, currentStepKnowledgeId,
    toggleStep, goToPrevStep, goToNextStep,
    handleAnimationClick, getStepStatus,
  } = useAnalysisSteps()

  if (!analysisEntry || !problem) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">题目未找到</h2>
          <p className="text-neutral-500 mb-4">ID: {id}</p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-[900px] mx-auto px-4 py-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-600 rounded">
              {analysisEntry.year}年
            </span>
            <span className="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-600 rounded">
              {analysisEntry.province}
            </span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${difficultyColors[analysisEntry.difficulty]}`}
            >
              {difficultyLabels[analysisEntry.difficulty - 1]}
            </span>
            {analysisEntry.knowledgeIds.slice(0, 3).map((kid) => {
              const node = getKnowledgeNode(kid)
              return node ? (
                <Badge key={kid} variant={node.importance as 'basic' | 'core' | 'gaokao' | 'hard' | 'extend'} className="text-xs">
                  {node.title}
                </Badge>
              ) : null
            })}
          </div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-lg font-semibold text-neutral-800">{analysisEntry.title}</h1>
            {wrongRecord && wrongRecord.status === 'mastered' ? (
              <span className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-success-100 text-success-700">✓ 已掌握</span>
            ) : wrongRecord ? (
              <Button variant="secondary" size="sm" className="shrink-0" onClick={() => markMastered(wrongRecord.problemId)}>
                标记已掌握
              </Button>
            ) : (
              <Button variant="secondary" size="sm" className="shrink-0" onClick={() => addWrong(problem.id, analysisEntry.knowledgeIds)}>
                加入错题本
              </Button>
            )}
          </div>
          <div className="text-base leading-[1.7] text-neutral-700">
            {problem.content.split('\n').map((line, i) => (
              <p key={i} className="mb-2"><ContentWithKatex content={line} /></p>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-neutral-800">分步解析</h2>
              <span className="text-xs text-neutral-400">
                步骤 {currentStepIndex + 1} / {problem.steps.length}
                <span className="ml-1">· 已展开 {expandedSteps.size}/2</span>
              </span>
            </div>
            <div className="space-y-3">
              {problem.steps.map((step, index) => {
                const expandedArr = Array.from(expandedSteps)
                const isFirstExpanded = expandedArr.length >= 2 && expandedArr[0] === index
                return (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={index}
                    status={getStepStatus(index)}
                    isExpanded={expandedSteps.has(index)}
                    isSvgDegraded={isFirstExpanded}
                    onToggle={() => toggleStep(index)}
                    onClickAnimation={handleAnimationClick}
                  />
                )
              })}
            </div>
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-200">
              <Button variant="primary" size="sm" onClick={goToPrevStep} disabled={currentStepIndex === 0}>
                <ChevronLeft size={16} className="mr-1" />上一步
              </Button>
              <Button variant="primary" size="sm" onClick={goToNextStep} disabled={currentStepIndex === problem.steps.length - 1}>
                下一步<ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
          <div className="lg:col-span-2 bg-neutral-50 rounded-lg border border-neutral-200 p-4">
            <h2 className="text-base font-semibold text-neutral-800 mb-4">知识链路</h2>
            <KnowledgeChain
              knowledgeIds={analysisEntry.knowledgeIds}
              currentStepKnowledgeId={currentStepKnowledgeId}
              completedKnowledgeIds={completedKnowledgeIds}
              onNodeClick={handleAnimationClick}
            />
          </div>
        </div>
      </div>
    </div>
  )
}