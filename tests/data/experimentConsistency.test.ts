import { describe, it, expect } from 'vitest'
import { experimentKnowledge } from '@/data/knowledge/experiment'
import { experimentProblems } from '@/data/problems/experiment'
import { knowledgeIndex } from '@/data/knowledgeTree'
import { getAnimationConfigAsync, ensureExtendedRegistry } from '@/data/animationRegistry'

describe('高考实验专题 · 高中物理规范与知识体系守卫', () => {
  it('所有实验知识点 ID 唯一且合法', () => {
    const ids = experimentKnowledge.map((k) => k.id)
    const uniqueIds = new Set(ids)
    expect(ids.length).toBe(uniqueIds.size)
    expect(ids.every((id) => id.startsWith('experiment-'))).toBe(true)
  })

  it('所有实验知识点的前置依赖均在全局知识树中有效存在（无悬空前置）', () => {
    for (const node of experimentKnowledge) {
      for (const pre of node.prerequisites) {
        expect(
          knowledgeIndex[pre],
          `节点 ${node.id} 的前置依赖 ${pre} 在知识树中不存在`
        ).toBeDefined()
      }
    }
  })

  it('所有实验知识点挂载的 animationIds 均在动画注册表中已注册', async () => {
    await ensureExtendedRegistry()
    for (const node of experimentKnowledge) {
      expect(node.animationIds.length, `节点 ${node.id} 缺少动画绑定`).toBeGreaterThan(0)
      for (const animId of node.animationIds) {
        const config = await getAnimationConfigAsync(animId)
        expect(config, `节点 ${node.id} 绑定的动画 ${animId} 未在注册表中找到`).toBeDefined()
      }
    }
  })

  it('实验真题符合 SKILL 规范（无透题、解析完整、真题属性核验）', () => {
    for (const prob of experimentProblems) {
      // 1. 真题元数据核验
      expect(prob.verified).toBe(true)
      expect(prob.year).toBeGreaterThanOrEqual(2020)
      expect(prob.province).toBeTruthy()
      expect(prob.source).toBeTruthy()
      expect(prob.questionType).toBe('experiment')

      // 2. 双向关联核验
      expect(prob.knowledgeIds.length).toBeGreaterThan(0)
      for (const kId of prob.knowledgeIds) {
        expect(knowledgeIndex[kId], `题目 ${prob.id} 引用的知识点 ${kId} 不存在`).toBeDefined()
      }

      // 3. 步骤与选项严谨性
      expect(prob.steps.length).toBeGreaterThanOrEqual(2)
      expect(prob.steps.every((s) => s.formula && s.explanation)).toBe(true)
      const options = Object.values(prob.optionExplanations)
      expect(options.some((o) => o.isCorrect)).toBe(true)
    }
  })

  it('实验真题的 targetAnimation 均可有效联动', async () => {
    await ensureExtendedRegistry()
    for (const prob of experimentProblems) {
      if (prob.targetAnimation) {
        const { animId, presetParams } = prob.targetAnimation
        const config = await getAnimationConfigAsync(animId)
        expect(config, `题目 ${prob.id} 的联动动画 ${animId} 未注册`).toBeDefined()
        expect(presetParams).toBeDefined()
      }
    }
  })

  it('双缝干涉知识树直达参数与注册表物理参数保持严格一致 (守卫 N3)', async () => {
    await ensureExtendedRegistry()
    const node = experimentKnowledge.find((k) => k.id === 'experiment-3-4')
    expect(node).toBeDefined()
    expect(node?.animationParams).toBeDefined()

    const config = await getAnimationConfigAsync('anim-double-slit-interference')
    expect(config).toBeDefined()

    // 验证知识树直达参数的物理量 (除 mode 外) 与注册表默认值严格一致
    const expParams = node!.animationParams!
    const defaultParams = config!.defaultParams as Record<string, unknown>

    expect(expParams.mode).toBe(1)
    expect(expParams.wavelength).toBe(defaultParams.wavelength)
    expect(expParams.slitDistance).toBe(defaultParams.slitDistance)
    expect(expParams.screenDistance).toBe(defaultParams.screenDistance)
    expect(expParams.targetFringe).toBe(defaultParams.targetFringe)
  })
})
