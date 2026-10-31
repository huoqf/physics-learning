import { describe, it, expect } from 'vitest'
import { knowledgeTree } from '@/data/knowledgeTree'
import { MODULE_META, MODULE_LABELS, moduleRank } from '@/data/knowledge/modules'
import { buildKnowledgeTree, buildModuleGroups } from '@/data/buildKnowledgeTree'

/**
 * 学科模块分组守卫。
 *
 * 背景：`KnowledgeNode.module` 一直存在，但模块中文名表长期不全，
 * 知识树也只按章平铺，导致「学科分组」这一整体记忆维度缺失，
 * 且错题按模块筛选会静默漏掉未登记的模块。
 * 本测试保证：数据里出现的每个 module 都必须在 MODULE_META 登记，
 * 否则 buildModuleGroups 会把它们排到末尾、标签退化成英文 id。
 */
describe('knowledge modules · 模块元数据一致性', () => {
  const usedModules = [...new Set(knowledgeTree.map((n) => n.module))]

  it('数据中出现的每个 module 都已在 MODULE_META 登记', () => {
    const registered = new Set(MODULE_META.map((m) => m.id))
    const missing = usedModules.filter((m) => !registered.has(m))
    expect(missing, `以下 module 未登记（会退化为英文 id 并排到最后）：${missing.join(', ')}`).toEqual([])
  })

  it('MODULE_META 中的每个模块都有中文名且排序权重有效', () => {
    for (const meta of MODULE_META) {
      expect(meta.label, `模块 ${meta.id} 缺少中文名`).toBeTruthy()
      expect(meta.label).not.toBe(meta.id)
      expect(moduleRank(meta.id)).toBe(meta.order)
    }
    const orders = MODULE_META.map((m) => m.order)
    expect(new Set(orders).size, 'MODULE_META 的 order 存在重复').toBe(orders.length)
  })

  it('buildModuleGroups 不丢章、不丢知识点，且按模块顺序排列', () => {
    const chapters = buildKnowledgeTree(knowledgeTree)
    const groups = buildModuleGroups(chapters)

    const chapterTotal = chapters.reduce((sum, ch) => sum + ch.nodes.length, 0)
    const groupedTotal = groups.reduce(
      (sum, g) => sum + g.chapters.reduce((s, ch) => s + ch.nodes.length, 0),
      0,
    )
    expect(groupedTotal).toBe(chapterTotal)

    const ranks = groups.map((g) => moduleRank(g.module))
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('每个模块都会渲染出中文名（不出现英文 id 兜底）', () => {
    const groups = buildModuleGroups(buildKnowledgeTree(knowledgeTree))
    for (const g of groups) {
      expect(g.label).toBe(MODULE_LABELS[g.module])
      expect(g.label).not.toBe(g.module)
    }
  })
})
