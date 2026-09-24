import { describe, it, expect } from 'vitest'
import {
  ANIMATION_COUNT,
  ensureExtendedRegistry,
  getLoadedAnimationCount,
} from '@/data/animationRegistry'

/**
 * ANIMATION_COUNT 是人工维护的显示用计数（HomePage / KnowledgePage 的「已学 X / N」）。
 *
 * ══════════════════════════════════════════════════════════════════════
 *  为什么要这个测试：
 *  该常量与 src/data/registries/*.ts 的真实条目数之间**没有编译期约束**，
 *  历史上已发生过漂移（修正前 98，真实值 102），而漂移会让首页/知识页
 *  的"已学 N / 总数"显示错误。
 *  本测试把「计数必须等于真实条目数」变成强制约束。
 * ══════════════════════════════════════════════════════════════════════
 */
describe('animationRegistry · ANIMATION_COUNT 一致性守卫', () => {
  it('ANIMATION_COUNT 等于注册表中的真实动画条目数', async () => {
    await ensureExtendedRegistry()
    expect(getLoadedAnimationCount()).toBe(ANIMATION_COUNT)
  })

  it('新增的三个电磁振荡/电磁波动画均已注册', async () => {
    const { getAnimationConfigAsync } = await import('@/data/animationRegistry')
    const ids = [
      'anim-lc-oscillation',
      'anim-em-wave',
      'anim-em-spectrum',
      'anim-ac-lc-impedance',
      'anim-doppler-effect',
    ]
    for (const id of ids) {
      const config = await getAnimationConfigAsync(id)
      expect(config, `${id} 未注册`).toBeDefined()
      expect(config?.knowledgeId).toBeTruthy()
    }
  })
})
