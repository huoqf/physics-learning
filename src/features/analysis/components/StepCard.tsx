import React from 'react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { getKnowledgeNode } from '@/data/knowledgeTree'
import { Badge } from '@/components/UI/Badge'
import { KatexFormula } from '@/components/UI/KatexFormula'
import type { ProblemStep } from '@/data/types'

interface StepCardProps {
  step: ProblemStep
  index: number
  status: 'unreached' | 'current' | 'completed'
  isExpanded: boolean
  isSvgDegraded: boolean
  onToggle: () => void
  onClickAnimation?: (animId: string) => void
}

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

const statusIcons: Record<string, React.ReactNode> = {
  unreached: null,
  current: null,  // rendered inline with index
  completed: (
    <span className="w-5 h-5 rounded-full bg-success-500 text-white text-xs flex items-center justify-center">
      ✓
    </span>
  ),
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  status,
  isExpanded,
  isSvgDegraded,
  onToggle,
  onClickAnimation,
}) => {
  const knowledgeNode = step.knowledgeId ? getKnowledgeNode(step.knowledgeId) : null
  const animId = knowledgeNode?.animationIds?.[0]

  const icon = status === 'current'
    ? (
      <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-medium">
        {index + 1}
      </span>
    )
    : statusIcons[status]

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
        <div className="flex-shrink-0">{icon}</div>
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
          {step.svgContent && (
            <div
              className="mb-4 flex justify-center"
              style={{
                opacity: isSvgDegraded ? 0.5 : 1,
                transform: isSvgDegraded ? 'scale(0.5)' : 'scale(1)',
                transformOrigin: 'top center',
                transition: 'opacity 250ms ease-in-out, transform 250ms ease-in-out',
              }}
              dangerouslySetInnerHTML={{ __html: step.svgContent }}
            />
          )}
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