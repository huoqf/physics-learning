import { useMemo } from 'react'
import { ExternalLink } from 'lucide-react'
import { getKnowledgeNode } from '@/data/knowledgeTree'
import { Badge } from '@/components/UI/Badge'
import { glowRing } from '@/theme/shadow'
import type { KnowledgeNode } from '@/data/types'

interface KnowledgeChainProps {
  knowledgeIds: string[]
  currentStepKnowledgeId?: string
  completedKnowledgeIds: Set<string>
  onNodeClick: (animId: string) => void
}

export function KnowledgeChain({
  knowledgeIds,
  currentStepKnowledgeId,
  completedKnowledgeIds,
  onNodeClick,
}: KnowledgeChainProps) {
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
              ${isCurrent ? 'bg-white' : 'hover:bg-white hover:shadow-sm'}
              ${isCompleted ? 'border-l-[3px] border-l-success-500' : ''}
            `}
            style={isCurrent ? { boxShadow: glowRing.highlight } : undefined}
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