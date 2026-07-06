import type { KnowledgeNode } from './types'

export interface TreeNode extends KnowledgeNode {
  children: TreeNode[]
}

export interface ChapterGroup {
  chapter: string
  module: string
  nodes: TreeNode[]
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

  const moduleOrder = ['mechanics', 'electricity', 'thermodynamics', 'optics', 'modern-physics']
  const getModuleRank = (m: string) => {
    const idx = moduleOrder.indexOf(m)
    return idx === -1 ? 999 : idx
  }
  const getChapterNumber = (ch: string) => {
    const match = ch.match(/第(\d+(?:\.\d+)?)章/)
    return match ? parseFloat(match[1]) : 999
  }

  const groups: ChapterGroup[] = []
  chapterMap.forEach((val, chapter) => {
    groups.push({ chapter, module: val.module, nodes: val.nodes })
  })

  return groups.sort((a, b) => {
    const mr = getModuleRank(a.module) - getModuleRank(b.module)
    if (mr !== 0) return mr
    return getChapterNumber(a.chapter) - getChapterNumber(b.chapter)
  })
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
