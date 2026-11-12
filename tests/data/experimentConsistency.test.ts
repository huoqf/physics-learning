import { describe, it, expect } from 'vitest'
import { experimentKnowledge } from '@/data/knowledge/experiment'
import { experimentProblems } from '@/data/problems/experiment'
import { knowledgeIndex } from '@/data/knowledgeTree'
import { getAnimationConfigAsync, ensureExtendedRegistry } from '@/data/animationRegistry'
import {
  computeMomentumExperimentDuration,
  momentumExperimentInputFromParams,
} from '@/physics/experimentMomentum'

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
      expect(prob.optionExplanations, `题目 ${prob.id} 缺少选项解析`).toBeDefined()
      const options = Object.values(prob.optionExplanations ?? {})
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

  it('双缝干涉测波长知识树节点与独立实验动画默认参数严格一致 (守卫 N3)', async () => {
    await ensureExtendedRegistry()
    const node = experimentKnowledge.find((k) => k.id === 'experiment-3-4')
    expect(node).toBeDefined()
    expect(node?.animationIds).toEqual(['anim-experiment-double-slit'])

    const config = await getAnimationConfigAsync('anim-experiment-double-slit')
    expect(config).toBeDefined()
    const defaultParams = config!.defaultParams as Record<string, unknown>
    expect(defaultParams.wavelength).toBe(650)
    expect(defaultParams.slitDistance).toBe(0.3)
    expect(defaultParams.screenDistance).toBe(0.8)
    expect(defaultParams.targetFringe).toBe(4)
  })

  it('用单摆测重力加速度知识树节点与独立实验动画默认参数严格一致', async () => {
    await ensureExtendedRegistry()
    const node = experimentKnowledge.find((k) => k.id === 'experiment-2-4')
    expect(node).toBeDefined()
    expect(node?.animationIds).toEqual(['anim-experiment-pendulum'])
    expect(node?.coverageNote).toBeUndefined()

    const config = await getAnimationConfigAsync('anim-experiment-pendulum')
    expect(config).toBeDefined()
    const defaultParams = config!.defaultParams as Record<string, unknown>
    expect(defaultParams.l_line).toBe(0.985)
    expect(defaultParams.d_mm).toBe(20.0)
    expect(defaultParams.n_cycles).toBe(40)
    expect(defaultParams.timing_err).toBe(0)
  })

  it('动量守恒实验时长：注册表 maxTime 与物理层 SSOT 在全参数网格上严格一致', async () => {
    await ensureExtendedRegistry()
    const expConfig = await getAnimationConfigAsync('anim-experiment-momentum')
    expect(expConfig).toBeDefined()

    const expMaxTime = expConfig!.maxTime
    expect(typeof expMaxTime, 'maxTime 必须为函数形式才能随实验参数自适应').toBe('function')
    const resolveExp = expMaxTime as (p: Record<string, number>) => number

    // 全参数网格与 SSOT 保持一致
    let checked = 0
    for (const collisionType_exp of [0, 1]) {
      for (const m1_exp of [0.1, 0.4, 0.7, 1.0]) {
        for (const m2_exp of [0.1, 0.4, 0.7, 1.0]) {
          for (const v1_exp of [0.2, 0.5, 0.8, 1.1, 1.4, 1.7, 2.0]) {
            const caseParams = { m1_exp, m2_exp, v1_exp, collisionType_exp, timing_err: 0 }
            const registryMaxTime = resolveExp(caseParams)
            const ssot = computeMomentumExperimentDuration(
              momentumExperimentInputFromParams(caseParams),
            )
            expect(
              registryMaxTime,
              `参数 ${JSON.stringify(caseParams)} 下注册表 maxTime=${registryMaxTime}s 与物理层 SSOT=${ssot}s 不一致`,
            ).toBe(ssot)
            checked++
          }
        }
      }
    }
    expect(checked).toBe(4 * 4 * 7 * 2)

    // 动量守恒定律原理页面沿用固定 30s 时间轴
    const baseConfig = await getAnimationConfigAsync('anim-momentum-conservation')
    expect(baseConfig?.maxTime).toBe(30)
  })
})

