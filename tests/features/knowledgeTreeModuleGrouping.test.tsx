import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { KnowledgeTree } from '@/features/knowledge'
import { knowledgeTree } from '@/data/knowledgeTree'
import { MODULE_META } from '@/data/knowledge/modules'

/**
 * 知识树渲染验证：确认「学科模块」这一级真的渲染出来了。
 *
 * 背景：`KnowledgeNode.module` 与 buildKnowledgeTree 的 module 排序一直存在，
 * 但 UI 只按章平铺，数据层能力等于白写。本测试锁住「模块标题必须出现在页面上」，
 * 防止后续重构把它退回成单层章列表。
 */
describe('KnowledgeTree · 学科模块分组渲染', () => {
  it('渲染出全部已登记的模块标题（9 个学科模块）', () => {
    render(
      <MemoryRouter>
        <KnowledgeTree />
      </MemoryRouter>,
    )

    for (const meta of MODULE_META) {
      expect(
        screen.getAllByText(meta.label).length,
        `模块「${meta.label}」未在知识树中渲染`,
      ).toBeGreaterThan(0)
    }
  })

  it('模块内仍按章分组，章标题可见', () => {
    render(
      <MemoryRouter>
        <KnowledgeTree />
      </MemoryRouter>,
    )

    const firstChapter = knowledgeTree[0].chapter
    expect(screen.getAllByText(firstChapter).length).toBeGreaterThan(0)
  })

  it('不再出现「系统学习力学知识」这类只覆盖单学科的旧文案', () => {
    render(
      <MemoryRouter>
        <KnowledgeTree />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/系统学习力学知识/)).toBeNull()
  })
})
