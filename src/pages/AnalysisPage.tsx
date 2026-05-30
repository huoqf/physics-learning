import React, { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { getAnalysisEntry, getProblemById } from '@/data/analysisRegistry'
import { getKnowledgeNode } from '@/data/knowledgeTree'
import { KatexFormula } from '@/components/UI/KatexFormula'
import { Badge } from '@/components/UI/Badge'
import { Button } from '@/components/UI/Button'
import type { ProblemStep, KnowledgeNode } from '@/data/types'

function ContentWithKatex({ content }: { content: string }) {
  const segments = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g)
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.startsWith('$$') && seg.endsWith('$$')) {
          const formula = seg.slice(2, -2).trim()
          return <KatexFormula key={i} formula={formula} mode="block" />
        }
        if (seg.startsWith('$') && seg.endsWith('$')) {
          const formula = seg.slice(1, -1).trim()
          return <KatexFormula key={i} formula={formula} mode="inline" />
        }
        return (
          <span key={i} className="whitespace-pre-wrap">{seg}</span>
        )
      })}
    </>
  )
}

interface StepCardProps {
  step: ProblemStep
  index: number
  status: 'unreached' | 'current' | 'completed'
  isExpanded: boolean
  onToggle: () => void
  onClickAnimation?: (animId: string) => void
}

const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  status,
  isExpanded,
  onToggle,
  onClickAnimation,
}) => {
  const knowledgeNode = step.knowledgeId ? getKnowledgeNode(step.knowledgeId) : null
  const animId = knowledgeNode?.animationIds?.[0]

  const borderColors = {
    unreached: 'border-l-neutral-200',
    current: 'border-l-primary-600',
    completed: 'border-l-success-500',
  }

  const bgColors = {
    unreached: 'bg-white',
    current: 'bg-primary-50',
    completed: 'bg-white',
  }

  const statusIcons = {
    unreached: null,
    current: (
      <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-medium">
        {index + 1}
      </span>
    ),
    completed: (
      <span className="w-5 h-5 rounded-full bg-success-500 text-white text-xs flex items-center justify-center">
        ✓
      </span>
    ),
  }

  return (
    <div
      className={`
        border-l-4 ${borderColors[status]} rounded-r-md overflow-hidden
        transition-colors duration-300
      `}
    >
      <button
        onClick={onToggle}
        className={`
          w-full px-4 py-3 flex items-center gap-3 text-left
          ${bgColors[status]} hover:bg-neutral-50 transition-colors duration-200
        `}
      >
        <div className="flex-shrink-0">
          {statusIcons[status]}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-neutral-400 mr-2">步骤 {index + 1}</span>
          <span className="text-sm font-medium text-neutral-700 truncate">{step.description}</span>
        </div>
        <div className="flex-shrink-0 text-neutral-400">
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      <div
        className={`
          overflow-hidden transition-all duration-[250ms] ease-in-out
          ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className={`px-4 py-4 ${bgColors[status]}`}>
          {step.formula && (
            <div className="mb-4">
              <KatexFormula formula={step.formula} mode="block" />
            </div>
          )}
          <p className="text-sm text-neutral-600 leading-relaxed mb-3">{step.explanation}</p>
          {knowledgeNode && animId && (
            <div className="flex items-center gap-2">
              <Badge variant={knowledgeNode.importance as 'basic' | 'core' | 'gaokao' | 'hard' | 'extend'}>
                {knowledgeNode.title}
              </Badge>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClickAnimation?.(animId)
                }}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <ExternalLink size={12} />
                查看动画
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface KnowledgeChainProps {
  knowledgeIds: string[]
  currentStepKnowledgeId?: string
  completedKnowledgeIds: Set<string>
  onNodeClick: (animId: string) => void
}

const KnowledgeChain: React.FC<KnowledgeChainProps> = ({
  knowledgeIds,
  currentStepKnowledgeId,
  completedKnowledgeIds,
  onNodeClick,
}) => {
  const nodes = useMemo(() => {
    return knowledgeIds
      .map((kid) => getKnowledgeNode(kid))
      .filter((node): node is KnowledgeNode => node !== undefined)
  }, [knowledgeIds])

  if (nodes.length === 0) {
    return (
      <div className="text-sm text-neutral-400 text-center py-8">
        暂无关联知识点
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {nodes.map((node) => {
        const isCurrent = node.id === currentStepKnowledgeId
        const isCompleted = completedKnowledgeIds.has(node.id)
        const animId = node.animationIds?.[0]

        return (
          <button
            key={node.id}
            onClick={() => { if (animId) onNodeClick(animId) }}
            title={node.chapter}
            className={`
              w-full flex items-center gap-2 px-3 py-2 rounded-md text-left
              transition-all duration-200
              ${isCurrent ? 'shadow-[0_0_0_2px_#60A5FA] bg-white' : 'hover:bg-white hover:shadow-sm'}
              ${isCompleted ? 'border-l-[3px] border-l-success-500' : ''}
            `}
          >
            <Badge variant={node.importance as 'basic' | 'core' | 'gaokao' | 'hard' | 'extend'}>
              {node.importance === 'gaokao' ? '⭐' : ''}
            </Badge>
            <span className="text-xs font-medium text-neutral-700 truncate">{node.title}</span>
            {animId && <ExternalLink size={12} className="text-neutral-400 flex-shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]))
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const analysisEntry = id ? getAnalysisEntry(id) : undefined
  const problem = id ? getProblemById(id) : undefined

  const completedKnowledgeIds = useMemo(() => {
    const completed = new Set<string>()
    for (let i = 0; i < currentStepIndex; i++) {
      const step = problem?.steps[i]
      if (step?.knowledgeId) {
        completed.add(step.knowledgeId)
      }
    }
    return completed
  }, [problem, currentStepIndex])

  const currentStepKnowledgeId = useMemo(() => {
    return problem?.steps[currentStepIndex]?.knowledgeId
  }, [problem, currentStepIndex])

  const toggleStep = useCallback((index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        if (next.size >= 2) {
          const firstItem = next.values().next().value as number | undefined
          if (firstItem !== undefined) {
            next.delete(firstItem)
          }
        }
        next.add(index)
      }
      return next
    })
  }, [])

  const goToPrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1
      setCurrentStepIndex(newIndex)
      setExpandedSteps(new Set([newIndex]))
    }
  }, [currentStepIndex])

  const goToNextStep = useCallback(() => {
    if (problem && currentStepIndex < problem.steps.length - 1) {
      const newIndex = currentStepIndex + 1
      setCurrentStepIndex(newIndex)
      setExpandedSteps(new Set([newIndex]))
    }
  }, [problem, currentStepIndex])

  const handleAnimationClick = useCallback(
    (animId: string) => {
      window.open(`/#/animation/${animId}`, '_blank')
    },
    []
  )

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

  const difficultyLabels = ['入门', '基础', '中等', '较难', '困难']
  const difficultyColors: Record<number, string> = {
    1: 'bg-success-100 text-success-700',
    2: 'bg-primary-100 text-primary-700',
    3: 'bg-accent-100 text-accent-700',
    4: 'bg-warning-100 text-warning-700',
    5: 'bg-danger-100 text-danger-700',
  }

  const getStepStatus = (index: number): 'unreached' | 'current' | 'completed' => {
    if (index < currentStepIndex) return 'completed'
    if (index === currentStepIndex) return 'current'
    return 'unreached'
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
                <Badge
                  key={kid}
                  variant={node.importance as 'basic' | 'core' | 'gaokao' | 'hard' | 'extend'}
                  className="text-xs"
                >
                  {node.title}
                </Badge>
              ) : null
            })}
          </div>
          <h1 className="text-lg font-semibold text-neutral-800 mb-3">{analysisEntry.title}</h1>
          <div className="text-base leading-[1.7] text-neutral-700">
            {problem.content.split('\n').map((line, i) => (
              <p key={i} className="mb-2">
                <ContentWithKatex content={line} />
              </p>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-neutral-800">分步解析</h2>
              <span className="text-xs text-neutral-400">
                步骤 {currentStepIndex + 1} / {problem.steps.length}
              </span>
            </div>

            <div className="space-y-3">
              {problem.steps.map((step, index) => (
                <StepCard
                  key={step.id}
                  step={step}
                  index={index}
                  status={getStepStatus(index)}
                  isExpanded={expandedSteps.has(index)}
                  onToggle={() => toggleStep(index)}
                  onClickAnimation={handleAnimationClick}
                />
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-200">
              <Button
                variant="primary"
                size="sm"
                onClick={goToPrevStep}
                disabled={currentStepIndex === 0}
              >
                <ChevronLeft size={16} className="mr-1" />
                上一步
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={goToNextStep}
                disabled={currentStepIndex === problem.steps.length - 1}
              >
                下一步
                <ChevronRight size={16} className="ml-1" />
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
