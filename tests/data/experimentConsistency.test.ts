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

  it('单摆测重力加速度知识树直达参数、无coverageNote与注册表严格一致', async () => {
    await ensureExtendedRegistry()
    const node = experimentKnowledge.find((k) => k.id === 'experiment-2-4')
    expect(node).toBeDefined()
    expect(node?.animationParams).toBeDefined()
    // 验证 coverageNote 已随高考实验模式内生落地而移除
    expect(node?.coverageNote).toBeUndefined()

    const config = await getAnimationConfigAsync('anim-simple-pendulum')
    expect(config).toBeDefined()

    const expParams = node!.animationParams!
    const defaultParams = config!.defaultParams as Record<string, unknown>

    expect(expParams.mode).toBe(3)
    expect(expParams.l_line).toBe(defaultParams.l_line)
    expect(expParams.d_mm).toBe(defaultParams.d_mm)
    expect(expParams.n_cycles).toBe(defaultParams.n_cycles)
    expect(expParams.timing_err).toBe(defaultParams.timing_err)
  })

  it('动量守恒高考实验时长：注册表 maxTime 与物理层 SSOT 在全参数网格上严格一致', async () => {
    await ensureExtendedRegistry()
    const config = await getAnimationConfigAsync('anim-momentum-conservation')
    expect(config).toBeDefined()

    const maxTime = config!.maxTime
    expect(typeof maxTime, 'maxTime 必须为函数形式才能随实验参数自适应').toBe('function')
    const resolve = maxTime as (p: Record<string, number>) => number

    // 曾经的分歧根因：注册表另写一套硬编码距离公式，且完全遗漏「滑块 1 同向穿门 2」，
    // 导致 8.7% 的参数组合下时间轴被截断、滑块 1 穿门演示不可达。此处把两处锁死。
    let checked = 0
    for (const collisionType_exp of [0, 1]) {
      for (const m1_exp of [0.1, 0.4, 0.7, 1.0]) {
        for (const m2_exp of [0.1, 0.4, 0.7, 1.0]) {
          for (const v1_exp of [0.2, 0.5, 0.8, 1.1, 1.4, 1.7, 2.0]) {
            const caseParams = { advancedMode: 2, m1_exp, m2_exp, v1_exp, collisionType_exp, timing_err: 0 }
            const registryMaxTime = resolve(caseParams)
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

    // 非实验模式（基础两球 / 滑块-木板）沿用固定 30s 时间轴
    expect(resolve({ advancedMode: 0 })).toBe(30)
    expect(resolve({ advancedMode: 1 })).toBe(30)
  })
})

