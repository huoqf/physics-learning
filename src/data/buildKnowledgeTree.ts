import type { KnowledgeNode } from './types'
import { moduleLabel, moduleRank } from './knowledge/modules'

export interface TreeNode extends KnowledgeNode {
  children: TreeNode[]
}

export interface ChapterGroup {
  chapter: string
  module: string
  nodes: TreeNode[]
}

/** 学科模块分组（知识树一级结构）：模块 → 章 → 知识点 */
export interface ModuleGroup {
  module: string
  label: string
  chapters: ChapterGroup[]
}

export function buildKnowledgeTree(nodes: KnowledgeNode[]): ChapterGroup[] {
  const nodeMap = new Map<string, TreeNode>()
  nodes.forEach(n => nodeMap.set(n.id, { ...n, children: [] }))

  const roots: TreeNode[] = []
  nodeMap.forEach(node => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  const chapterMap = new Map<string, { module: string; nodes: TreeNode[] }>()
  roots.forEach(node => {
    const key = node.chapter
    if (!chapterMap.has(key)) {
      chapterMap.set(key, { module: node.module, nodes: [] })
    }
    chapterMap.get(key)!.nodes.push(node)
  })

  const getChapterNumber = (ch: string) => {
    const match = ch.match(/第(\d+(?:\.\d+)?)章/)
    return match ? parseFloat(match[1]) : 999
  }

  const groups: ChapterGroup[] = []
  chapterMap.forEach((val, chapter) => {
    groups.push({ chapter, module: val.module, nodes: val.nodes })
  })

  return groups.sort((a, b) => {
    const mr = moduleRank(a.module) - moduleRank(b.module)
    if (mr !== 0) return mr
    return getChapterNumber(a.chapter) - getChapterNumber(b.chapter)
  })
}

/**
 * 把「章分组」进一步收敛为「模块 → 章」两级结构。
 *
 * 为什么放在数据层：学科分组是知识体系的固有属性，不是某个组件的渲染细节；
 * 放在这里可以被单测覆盖，也保证 KnowledgePage / 未来其它视图拿到同一套分组。
 * 未在 MODULE_META 登记的模块统一排在末尾（保持相对顺序，不会被丢弃）。
 */
export function buildModuleGroups(chapters: ChapterGroup[]): ModuleGroup[] {
  const byModule = new Map<string, ChapterGroup[]>()
  for (const chapter of chapters) {
    const list = byModule.get(chapter.module)
    if (list) list.push(chapter)
    else byModule.set(chapter.module, [chapter])
  }

  return [...byModule.entries()]
    .map(([module, list]) => ({ module, label: moduleLabel(module), chapters: list }))
    .sort((a, b) => moduleRank(a.module) - moduleRank(b.module))
}

export function flattenTree(nodes: TreeNode[]): KnowledgeNode[] {
  const result: KnowledgeNode[] = []
  const walk = (list: TreeNode[]) => {
    list.forEach(n => {
      const { children, ...rest } = n
      result.push(rest)
      if (children.length > 0) walk(children)
    })
  }
  walk(nodes)
  return result
}

export function countDescendants(node: TreeNode): { total: number; mastered: number } {
  let total = node.animationIds.length > 0 ? 1 : 0
  let mastered = 0
  node.children.forEach(child => {
    const d = countDescendants(child)
    total += d.total
    mastered += d.mastered
  })
  return { total, mastered }
}
