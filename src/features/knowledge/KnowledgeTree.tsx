import React, { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, CheckCircle2, Circle } from 'lucide-react'
import { knowledgeTree } from '@/data/knowledgeTree'
import { buildKnowledgeTree, countDescendants } from '@/data/buildKnowledgeTree'
import { getAnimationConfigAsync } from '@/data/animationRegistry'
import { useProgressStore } from '@/stores'
import { colors } from '@/theme/colors'
import { duration } from '@/theme/motion'
import type { TreeNode } from '@/data/buildKnowledgeTree'

const getImportanceColor = (importance: string) => {
  switch (importance) {
    case 'basic':
      return colors.neutral[500]
    case 'core':
      return colors.primary[600]
    case 'gaokao':
      return colors.accent[600]
    case 'hard':
      return colors.danger[600]
    case 'extend':
      return colors.secondary[600]
    default:
      return colors.neutral[500]
  }
}

const getImportanceBg = (importance: string) => {
  switch (importance) {
    case 'basic':
      return colors.neutral[50]
    case 'core':
      return colors.primary[50]
    case 'gaokao':
      return colors.accent[50]
    case 'hard':
      return colors.danger[100]
    case 'extend':
      return colors.secondary[50]
    default:
      return colors.neutral[50]
  }
}

const KnowledgeNodeItem: React.FC<{
  node: TreeNode
  isMastered: boolean
  level: number
  expandedNodes: Set<string>
  onToggle: (id: string) => void
  masteredKnowledge: string[]
}> = ({ node, isMastered, level, expandedNodes, onToggle, masteredKnowledge }) => {
  const navigate = useNavigate()
  const hasChildren = node.children.length > 0

  const handleClick = () => {
    if (hasChildren) {
      onToggle(node.id)
    } else if (node.animationIds.length > 0) {
      navigate(`/animation/${node.animationIds[0]}`)
    }
  }

  const handleHover = useCallback(() => {
    node.animationIds.forEach(async (id) => {
      const config = await getAnimationConfigAsync(id)
      config?.Component.preload?.()
    })
  }, [node.animationIds])

  const { mastered: childMastered } = useMemo(() => countDescendants(node), [node])

  return (
    <div>
      <div
        className="group flex items-center gap-2 py-2 px-3 rounded-md hover:bg-neutral-50 cursor-pointer transition-all active:scale-[0.99]"
        style={{
          paddingLeft: `${level * 20 + 8}px`,
          backgroundColor: getImportanceBg(node.importance),
          transitionDuration: `${duration.fast}ms`,
          transitionTimingFunction: 'ease-out'
        }}
        onClick={handleClick}
        onMouseEnter={handleHover}
      >
        <div className="flex-shrink-0">
          {hasChildren ? (
            expandedNodes.has(node.id) ? (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            )
          ) : isMastered ? (
            <CheckCircle2
              className="w-4 h-4"
              style={{ color: colors.success[600] }}
            />
          ) : (
            <Circle
              className="w-4 h-4"
              style={{ color: colors.neutral[300] }}
            />
          )}
        </div>
        <span
          className="text-sm flex-1"
          style={{ color: getImportanceColor(node.importance) }}
        >
          {node.title}
        </span>
        {hasChildren && (
          <span className="text-xs text-neutral-400">
            {childMastered}/{countDescendants(node).total}
          </span>
        )}
        {!hasChildren && node.animationIds.length > 0 && (
          <div
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: colors.primary[100],
              color: colors.primary[700]
            }}
          >
            动画
          </div>
        )}
      </div>
      {hasChildren && expandedNodes.has(node.id) && (
        <div>
          {node.children.map(child => (
            <KnowledgeNodeItem
              key={child.id}
              node={child}
              isMastered={masteredKnowledge.includes(child.id)}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              masteredKnowledge={masteredKnowledge}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const ChapterHeader: React.FC<{
  chapter: string
  isExpanded: boolean
  onToggle: () => void
  total: number
  mastered: number
}> = ({ chapter, isExpanded, onToggle, total, mastered }) => {
  const progress = total > 0 ? (mastered / total) * 100 : 0

  return (
    <div
      className="group flex items-center gap-2 py-3 px-3 rounded-md hover:bg-neutral-50 cursor-pointer transition-all active:scale-[0.99]"
      onClick={onToggle}
      style={{
        transitionDuration: `${duration.fast}ms`,
        transitionTimingFunction: 'ease-out'
      }}
    >
      <div className="flex-shrink-0">
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-neutral-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-neutral-500" />
        )}
      </div>
      <span className="text-sm font-semibold text-neutral-800 flex-1">
        {chapter}
      </span>
      <div className="text-xs text-neutral-500">
        {mastered}/{total}
      </div>
      <div className="w-20 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress}%`,
            backgroundColor: progress === 100 ? colors.success[500] : colors.primary[500],
            transitionDuration: `${duration.normal}ms`,
            transitionTimingFunction: 'ease-out'
          }}
        />
      </div>
    </div>
  )
}

export const KnowledgeTree: React.FC = () => {
  const { masteredKnowledge } = useProgressStore()
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(() => {
    const chapters = new Set<string>()
    knowledgeTree.forEach(node => {
      chapters.add(node.chapter)
    })
    return chapters
  })
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const chapters = useMemo(() => buildKnowledgeTree(knowledgeTree), [])

  const toggleChapter = (chapter: string) => {
    const newSet = new Set(expandedChapters)
    if (newSet.has(chapter)) {
      newSet.delete(chapter)
    } else {
      newSet.add(chapter)
    }
    setExpandedChapters(newSet)
  }

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  return (
    <div className="w-full">
      <div className="space-y-1">
        {chapters.map(({ chapter, nodes }) => {
          const isExpanded = expandedChapters.has(chapter)
          let totalNodes = 0
          let masteredNodes = 0
          nodes.forEach(n => {
            const d = countDescendants(n)
            totalNodes += d.total || 1
            masteredNodes += n.animationIds.length > 0 && masteredKnowledge.includes(n.id) ? 1 : 0
            n.children.forEach(c => {
              if (masteredKnowledge.includes(c.id)) masteredNodes++
            })
          })

          return (
            <div key={chapter} className="border-b border-neutral-100 last:border-b-0">
              <ChapterHeader
                chapter={chapter}
                isExpanded={isExpanded}
                onToggle={() => toggleChapter(chapter)}
                total={totalNodes}
                mastered={masteredNodes}
              />
              {isExpanded && (
                <div className="pl-4 pb-1">
                  {nodes.map(node => (
                    <KnowledgeNodeItem
                      key={node.id}
                      node={node}
                      isMastered={masteredKnowledge.includes(node.id)}
                      level={0}
                      expandedNodes={expandedNodes}
                      onToggle={toggleNode}
                      masteredKnowledge={masteredKnowledge}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default KnowledgeTree
