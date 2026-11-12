import React, { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, CheckCircle2, Circle, Info } from 'lucide-react'
import { knowledgeTree } from '@/data/knowledgeTree'
import { buildKnowledgeTree, buildModuleGroups, countDescendants } from '@/data/buildKnowledgeTree'
import { getAnimationConfigAsync } from '@/data/animationRegistry'
import { getProblemsByKnowledgeId } from '@/data/problems'
import { useProgressStore } from '@/stores'
import { colors } from '@/theme/colors'
import { duration } from '@/theme/motion'
import type { ChapterGroup, TreeNode } from '@/data/buildKnowledgeTree'

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
      let url = `/animation/${node.animationIds[0]}`
      if (node.animationParams) {
        const qs = new URLSearchParams(
          Object.entries(node.animationParams).map(([k, v]) => [k, String(v)])
        ).toString()
        if (qs) url += `?${qs}`
      }
      navigate(url)
    }
  }

  const handleHover = useCallback(() => {
    node.animationIds.forEach(async (id) => {
      const config = await getAnimationConfigAsync(id)
      config?.Component.preload?.()
    })
  }, [node.animationIds])

  const { mastered: childMastered } = useMemo(() => countDescendants(node), [node])

  const relatedProblemCount = useMemo(() => {
    if (hasChildren) return 0
    const ids = new Set(node.problemIds)
    for (const p of getProblemsByKnowledgeId(node.id)) {
      ids.add(p.id)
    }
    return ids.size
  }, [hasChildren, node.id, node.problemIds])

  const handleOpenProblems = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/practice?knowledge=${encodeURIComponent(node.id)}`)
  }

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
        {!hasChildren && relatedProblemCount > 0 && (
          <button
            type="button"
            onClick={handleOpenProblems}
            className="text-xs px-2 py-0.5 rounded-full font-medium transition-transform active:scale-[0.97] hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: colors.accent[100],
              color: colors.accent[700]
            }}
            title={`前往练习该知识点的 ${relatedProblemCount} 道真题`}
          >
            真题 ({relatedProblemCount})
          </button>
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
      {/* 覆盖度声明：该节点借用了非专用实验动画时，直接把"缺哪些实验要素"摊开写，避免误导 */}
      {!hasChildren && node.coverageNote && (
        <div
          className="flex items-start gap-1.5 mx-1 mb-2 rounded-md border-l-2 py-1.5 pr-2"
          style={{
            marginLeft: `${level * 20 + 8}px`,
            backgroundColor: colors.warning[50],
            borderLeftColor: colors.warning[400]
          }}
        >
          <Info
            className="w-3.5 h-3.5 flex-shrink-0 mt-[1px] ml-1.5"
            style={{ color: colors.warning[600] }}
          />
          <span
            className="text-[11px] leading-snug"
            style={{ color: colors.warning[800] }}
          >
            {node.coverageNote}
          </span>
        </div>
      )}
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
      <ProgressBar percent={progress} width="w-20" />
    </div>
  )
}

/** 单章统计：总知识点数 / 已掌握数（口径与既有知识树一致，勿单独改动） */
const chapterStats = (nodes: TreeNode[], masteredKnowledge: string[]) => {
  let total = 0
  let mastered = 0
  nodes.forEach((n) => {
    const d = countDescendants(n)
    total += d.total || 1
    if (n.animationIds.length > 0 && masteredKnowledge.includes(n.id)) mastered += 1
    n.children.forEach((c) => {
      if (masteredKnowledge.includes(c.id)) mastered += 1
    })
  })
  return { total, mastered }
}

const ProgressBar: React.FC<{ percent: number; width?: string }> = ({ percent, width = 'w-20' }) => (
  <div className={`${width} h-1.5 bg-neutral-200 rounded-full overflow-hidden`}>
    <div
      className="h-full rounded-full transition-all"
      style={{
        width: `${percent}%`,
        backgroundColor: percent === 100 ? colors.success[500] : colors.primary[500],
        transitionDuration: `${duration.normal}ms`,
        transitionTimingFunction: 'ease-out',
      }}
    />
  </div>
)

/** 一级：学科模块（力学 / 电磁学 / 热学 / …） */
const ModuleHeader: React.FC<{
  label: string
  isExpanded: boolean
  onToggle: () => void
  total: number
  mastered: number
  chapterCount: number
}> = ({ label, isExpanded, onToggle, total, mastered, chapterCount }) => {
  const progress = total > 0 ? (mastered / total) * 100 : 0

  return (
    <div
      className="group flex items-center gap-2 py-2.5 px-3 rounded-lg cursor-pointer transition-all active:scale-[0.99] mb-1"
      onClick={onToggle}
      style={{
        backgroundColor: colors.primary[50],
        transitionDuration: `${duration.fast}ms`,
        transitionTimingFunction: 'ease-out',
      }}
    >
      <div className="flex-shrink-0">
        {isExpanded ? (
          <ChevronDown className="w-5 h-5" style={{ color: colors.primary[600] }} />
        ) : (
          <ChevronRight className="w-5 h-5" style={{ color: colors.primary[600] }} />
        )}
      </div>
      <span className="text-sm font-bold flex-1" style={{ color: colors.primary[800] }}>
        {label}
      </span>
      <span className="text-xs" style={{ color: colors.primary[600] }}>
        {chapterCount} 章 · {mastered}/{total}
      </span>
      <ProgressBar percent={progress} width="w-24" />
    </div>
  )
}

export const KnowledgeTree: React.FC = () => {
  const { masteredKnowledge } = useProgressStore()
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const modules = new Set<string>()
    knowledgeTree.forEach((node) => {
      modules.add(node.module)
    })
    return modules
  })
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(() => {
    const chapters = new Set<string>()
    knowledgeTree.forEach(node => {
      chapters.add(node.chapter)
    })
    return chapters
  })
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const moduleGroups = useMemo(
    () => buildModuleGroups(buildKnowledgeTree(knowledgeTree)),
    [],
  )

  const toggleModule = (module: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(module)) next.delete(module)
      else next.add(module)
      return next
    })
  }

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
      <div className="space-y-4">
        {moduleGroups.map((group) => {
          const isModuleExpanded = expandedModules.has(group.module)
          const moduleStats = group.chapters.reduce(
            (acc, ch) => {
              const s = chapterStats(ch.nodes, masteredKnowledge)
              return { total: acc.total + s.total, mastered: acc.mastered + s.mastered }
            },
            { total: 0, mastered: 0 },
          )

          return (
            <div key={group.module}>
              <ModuleHeader
                label={group.label}
                isExpanded={isModuleExpanded}
                onToggle={() => toggleModule(group.module)}
                total={moduleStats.total}
                mastered={moduleStats.mastered}
                chapterCount={group.chapters.length}
              />

              {isModuleExpanded && (
                <div className="pl-3">
                  {group.chapters.map(({ chapter, nodes }: ChapterGroup) => {
                    const isExpanded = expandedChapters.has(chapter)
                    const { total, mastered } = chapterStats(nodes, masteredKnowledge)

                    return (
                      <div key={chapter} className="border-b border-neutral-100 last:border-b-0">
                        <ChapterHeader
                          chapter={chapter}
                          isExpanded={isExpanded}
                          onToggle={() => toggleChapter(chapter)}
                          total={total}
                          mastered={mastered}
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
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default KnowledgeTree
