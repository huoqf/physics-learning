import { describe, it, expect } from 'vitest'
import { allProblems } from '@/data/problems'
import { masterModels } from '@/data/masterModels'
import { ensureExtendedRegistry, getAnimationConfigAsync } from '@/data/animationRegistry'

/**
 * 「一键载入真实考场参数」链路守卫。
 *
 * ══════════════════════════════════════════════════════════════════════
 *  为什么要这个测试：
 *    以下四个入口都会把预置参数作为 URL 查询参数打开 `/animation/<animId>`，
 *    再由 useAnimationLifecycle / AnimationPage 合并进动画 params：
 *      1. problem.targetAnimation.presetParams      （PracticeSession / ProblemDeconstruction）
 *      2. problem.optionExplanations[*].animParams  （OptionVisualizer 选项演示）
 *      3. masterModel.presetParams                  （MasterModelCard 一键载入）
 *      4. masterModel.secondaryPresetParams         （MasterModelCard 辅助动画载入）
 *
 *    这条链路是**静默降级**的：键名写错（例如把 workFunction 写成 W0）不会报错，
 *    只是该键、以及它对应的滑块，从头到尾都不生效——学生点了按钮却看到默认参数，
 *    而页面没有任何提示。
 *
 *    本测试把「预置参数的每个键都必须存在于目标动画的 defaultParams」变成硬约束，
 *    让这类键名错配在 CI 里当场暴露。
 * ══════════════════════════════════════════════════════════════════════
 */
describe('预置动画参数一致性', () => {
  it('所有「一键载入参数」的键都存在于目标动画 defaultParams 中', async () => {
    await ensureExtendedRegistry()

    const errors: string[] = []
    let checked = 0

    const validate = async (
      owner: string,
      field: string,
      animId: string | undefined,
      params: Record<string, number> | undefined,
    ) => {
      if (!animId || !params) return
      checked++

      const config = await getAnimationConfigAsync(animId)
      if (!config) {
        errors.push(`[${owner}] ${field} 指向的动画 "${animId}" 在动画注册表中不存在`)
        return
      }

      const legalKeys = Object.keys(config.defaultParams ?? {})
      const legal = new Set(legalKeys)
      for (const key of Object.keys(params)) {
        if (!legal.has(key)) {
          errors.push(
            `[${owner}] ${field}."${key}" 不是 ${animId} 的参数` +
              `（合法键：${legalKeys.join(', ')}）`,
          )
        }
      }
    }

    for (const problem of allProblems) {
      const preset = problem.targetAnimation
      await validate(problem.id, 'targetAnimation.presetParams', preset?.animId, preset?.presetParams)

      for (const [optionKey, option] of Object.entries(problem.optionExplanations ?? {})) {
        await validate(
          problem.id,
          `optionExplanations.${optionKey}.animParams`,
          preset?.animId,
          option.animParams,
        )
      }
    }

    for (const model of masterModels) {
      await validate(model.id, 'presetParams', model.animId, model.presetParams)
      await validate(
        model.id,
        'secondaryPresetParams',
        model.secondaryAnimId,
        model.secondaryPresetParams,
      )
    }

    // 至少覆盖到全部带预置参数的数据，避免选择器写错导致空跑
    expect(checked).toBeGreaterThan(20)
    expect(errors).toEqual([])
  })
})
