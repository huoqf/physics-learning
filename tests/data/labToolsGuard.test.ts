import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { ensureExtendedRegistry, getAllAnimationIds, getAnimationConfig } from '@/data/animationRegistry'
import { knowledgeTree } from '@/data/knowledgeTree'
import { useAnimationStore } from '@/stores/useAnimationStore'
import { resolveLabTools } from '@/utils/labTools'

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walkFiles(full, out)
    else if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(full)
  }
  return out
}

const EXPECTED_CHART_COMPARE_CONSUMERS: Record<string, string> = {
  'anim-ac-lc-impedance': join('src', 'features', 'electromagnetism', 'ac-impedance', 'ACImpedanceAnimation.tsx'),
  'anim-induction-single-rod': join('src', 'features', 'electromagnetism', 'induction', 'SingleRodCharts.tsx'),
  'anim-forced-resonance': join('src', 'features', 'vibration', 'forced-resonance', 'ForcedResonanceCenterExtra.tsx'),
  'anim-nuclear-half-life': join('src', 'features', 'modern', 'nuclear-decay', 'NuclearHalfLifeAnimation.tsx'),
}

describe('学科实验工具解耦守卫 (labTools)', () => {
  it('所有 strobe 与 chartCompare 动画必须在对应组件中实际消费状态，且不可同时开启虚影与图表对照', async () => {
    await ensureExtendedRegistry()
    const featureFiles = walkFiles(join(process.cwd(), 'src', 'features'))
    const strobeConsumers = new Set<string>()
    for (const file of featureFiles) {
      const code = readFileSync(file, 'utf8')
      if (code.includes('showTimeSlices')) {
        strobeConsumers.add(file)
      }
    }

    const ids = getAllAnimationIds()
    const actualChartCompareIds: string[] = []
    for (const id of ids) {
      const cfg = getAnimationConfig(id)!
      const node = knowledgeTree.find((n) => n.id === cfg.knowledgeId || n.animationIds.includes(id))
      const tools = resolveLabTools(cfg, node?.module)

      // 禁止同时开启空间虚影与图表参考线两种互斥模式
      expect(
        tools.includes('ghostOverlay') && tools.includes('chartCompare'),
        `${id} 不能同时声明 ghostOverlay 与 chartCompare`,
      ).toBe(false)

      if (tools.includes('strobe')) {
        expect(strobeConsumers.size).toBeGreaterThan(0)
        expect(['anim-free-fall', 'anim-projectile', 'anim-block-board']).toContain(id)
      }

      if (tools.includes('chartCompare')) {
        actualChartCompareIds.push(id)
        const expectedConsumer = EXPECTED_CHART_COMPARE_CONSUMERS[id]
        expect(expectedConsumer, `${id} 必须登记对应的 ghostSnapshot 消费组件`).toBeDefined()
        const code = readFileSync(join(process.cwd(), expectedConsumer), 'utf8')
        expect(code).toContain('ghostSnapshot')
      }
    }

    expect(actualChartCompareIds.sort()).toEqual(Object.keys(EXPECTED_CHART_COMPARE_CONSUMERS).sort())
  })

  it('静力学、实验仪器、电路与机械波等非轨迹页面严禁开启虚影/频闪；轨迹与图表对照按白名单生效', async () => {
    await ensureExtendedRegistry()

    // 图表对照页
    expect(resolveLabTools(getAnimationConfig('anim-ac-lc-impedance')!, 'electricity')).toEqual(['chartCompare'])
    expect(resolveLabTools(getAnimationConfig('anim-induction-single-rod')!, 'electricity')).toEqual(['chartCompare'])
    expect(resolveLabTools(getAnimationConfig('anim-forced-resonance')!, 'vibration')).toEqual(['chartCompare'])
    expect(resolveLabTools(getAnimationConfig('anim-nuclear-half-life')!, 'atomic')).toEqual(['chartCompare'])

    // 非轨迹类页面（静力学、实验读数、直流电路、波动干涉）：均不得开启虚影/频闪
    expect(resolveLabTools(getAnimationConfig('anim-equilibrium')!, 'mechanics')).toEqual([])
    expect(resolveLabTools(getAnimationConfig('anim-mechanics-experiment-base')!, 'mechanics')).toEqual([])
    expect(resolveLabTools(getAnimationConfig('anim-ohm-law')!, 'electricity')).toEqual([])
    expect(resolveLabTools(getAnimationConfig('anim-wave-interference')!, 'vibration')).toEqual([])

    // 清晰轨迹类页面保留虚影/频闪能力
    expect(resolveLabTools(getAnimationConfig('anim-charge-in-bfield')!, 'electricity')).toEqual(['ghostOverlay'])
    expect(resolveLabTools(getAnimationConfig('anim-simple-pendulum')!, 'vibration')).toEqual(['ghostOverlay'])
    expect(resolveLabTools(getAnimationConfig('anim-projectile')!, 'mechanics')).toEqual(['strobe', 'ghostOverlay'])
  })

  it('切换动画时自动清空 ghostSnapshot 与 showTimeSlices，防止跨页残留', () => {
    const store = useAnimationStore.getState()
    store.setAnimationType('anim-projectile')
    store.setParams({ v0: 10 })
    if (!useAnimationStore.getState().showTimeSlices) {
      store.toggleTimeSlices()
    }
    store.captureGhostSnapshot()

    expect(useAnimationStore.getState().showTimeSlices).toBe(true)
    expect(useAnimationStore.getState().ghostSnapshot).not.toBeNull()

    store.setAnimationType('anim-equilibrium')
    expect(useAnimationStore.getState().showTimeSlices).toBe(false)
    expect(useAnimationStore.getState().ghostSnapshot).toBeNull()
  })
})
