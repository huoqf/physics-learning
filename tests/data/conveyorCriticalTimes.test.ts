import { describe, it, expect } from 'vitest'
import { mechanicsDynamicsAnimations } from '@/data/registries/mechanics-dynamics'
import { getConveyorFrame } from '@/physics/conveyor'

/**
 * anim-conveyor 的临界时刻守卫。
 *
 * 该动画的 criticalTimes 复用 `getConveyorFrame` 的积分结果，
 * 本测试用解析解反向校验「共速时刻」，确保注册表里的临界点与物理一致
 * （而不是把某个魔法数字写死在注册表里）。
 */
const conveyor = mechanicsDynamicsAnimations['anim-conveyor']
const criticalTimes = conveyor.criticalTimes as (p: Record<string, number>) => { time: number; label: string }[]

/** 水平带共速时刻：|v₀ − v带| / (μg) */
const analyticSync = (v0: number, vBelt: number, mu: number, g = 9.8) =>
  Math.abs(v0 - vBelt) / (mu * g)

describe('anim-conveyor · criticalTimes 物理正确性', () => {
  it('水平带放上加速：共速时刻 = v带/(μg)', () => {
    const params = { conveyorMode: 0, vBelt: 3.0, v0: 0, mu: 0.2, L: 6 }
    const points = criticalTimes(params)
    const sync = points.find((p) => p.label.includes('共速'))
    expect(sync).toBeDefined()
    expect(sync!.time).toBeCloseTo(analyticSync(0, 3, 0.2), 1)
  })

  it('水平带减速共速：共速时刻 = (v₀ − v带)/(μg)', () => {
    const params = { conveyorMode: 0, vBelt: 2.0, v0: 5.0, mu: 0.2, L: 6 }
    const sync = criticalTimes(params).find((p) => p.label.includes('共速'))
    expect(sync).toBeDefined()
    expect(sync!.time).toBeCloseTo(analyticSync(5, 2, 0.2), 1)
  })

  it('反向传送带：共速时刻按相对速度差计算', () => {
    const params = { conveyorMode: 0, vBelt: -2.0, v0: 4.0, mu: 0.2, L: 6 }
    const sync = criticalTimes(params).find((p) => p.label.includes('共速'))
    expect(sync).toBeDefined()
    expect(sync!.time).toBeCloseTo(analyticSync(4, -2, 0.2), 1)
  })

  it('所有临界时刻都在观察窗口内、为正、且按升序排列', () => {
    const presets = [
      { conveyorMode: 0, vBelt: 3.0, v0: 0, mu: 0.2, L: 6 },
      { conveyorMode: 0, vBelt: 2.0, v0: 5.0, mu: 0.2, L: 6 },
      { conveyorMode: 0, vBelt: -2.0, v0: 4.0, mu: 0.2, L: 6 },
      { conveyorMode: 1, vBelt: -2.0, v0: 0, mu: 0.35, L: 8, x0Ratio: 1 },
      // 倾斜带 μ=0.15：皮带向下、物块放顶端，共速后摩擦反向继续下滑（折点题）。
      // 曾经因为位置基准写死 0 而无法纳入——那时物块从底端"放上去"第一帧就判离开。
      { conveyorMode: 1, vBelt: -2.0, v0: 0, mu: 0.15, L: 8, x0Ratio: 1 },
    ]
    for (const p of presets) {
      const points = criticalTimes(p)
      expect(points.length).toBeGreaterThan(0)
      for (const point of points) {
        expect(point.time).toBeGreaterThan(0)
        expect(point.time).toBeLessThanOrEqual(12)
      }
      const times = points.map((x) => x.time)
      expect(times).toEqual([...times].sort((a, b) => a - b))
    }
  })

  it('共速时刻锚定求解器的 tSync，且必须落在相变之后（防止另写解析解造成漂移）', () => {
    const p = { conveyorMode: 0, vBelt: 2.0, v0: 5.0, mu: 0.2, L: 6 }
    const frame = getConveyorFrame(
      { vBelt: p.vBelt, v0: p.v0, mu: p.mu, L: p.L, mode: 'horizontal', thetaRad: Math.PI / 12 },
      12,
      1,
    )
    const sync = criticalTimes(p).find((x) => x.label.includes('共速'))
    const tSync = frame.tSync!

    /*
     * 不能断言「完全相等」：tSync 是解析解（本参数下 1.5306），若直接 toFixed(2)
     * 会舍到 1.53，定格帧的 phase 仍是 sliding、摩擦力仍是 1.96N，而相对速度已
     * 显示 0.00 —— 画面自相矛盾，正在讲解的那个错因（漏判摩擦突变）反而证不出来。
     * 所以要求的是：**不早于 tSync，且偏差不超过进度条一格（0.01）**。
     */
    expect(sync!.time).toBeGreaterThanOrEqual(tSync)
    expect(sync!.time - tSync).toBeLessThanOrEqual(0.01)
  })

  it('共速定格帧落在相变之后：摩擦力已归零、阶段已切到共速', () => {
    const p = { conveyorMode: 0, vBelt: 2.0, v0: 5.0, mu: 0.2, L: 6 }
    const sync = criticalTimes(p).find((x) => x.label.includes('共速'))!
    const frame = getConveyorFrame(
      { vBelt: p.vBelt, v0: p.v0, mu: p.mu, L: p.L, mode: 'horizontal', thetaRad: Math.PI / 12 },
      sync.time,
      1,
    )
    expect(frame.phase).toBe('synchronous')
    expect(frame.friction).toBe(0)
  })

  it('初始已共速时不产生「0 秒共速」这种无意义标记', () => {
    const points = criticalTimes({ conveyorMode: 0, vBelt: 3.0, v0: 3.0, mu: 0.2, L: 6 })
    expect(points.every((p) => p.time > 0)).toBe(true)
  })
})

// ── 注册表预设的「活画面」守卫 ─────────────────────────────────────────

/** 按注册表参数还原物理调用，与中屏/图表/右屏三处消费方保持同一取法 */
function frameAt(p: Record<string, number>, t: number) {
  const inclined = (p.conveyorMode ?? 0) === 1
  return getConveyorFrame(
    {
      vBelt: p.vBelt ?? 3,
      v0: p.v0 ?? 0,
      mu: p.mu ?? 0.2,
      L: p.L ?? 6,
      mode: inclined ? 'inclined' : 'horizontal',
      thetaRad: Math.PI / 12,
      x0Ratio: equippedX0(p),
    },
    t,
    1,
  )
}

/** 与三处消费方一致：水平带没有「初始位置」这一说 */
function equippedX0(p: Record<string, number>) {
  return (p.conveyorMode ?? 0) === 1 ? (p.x0Ratio ?? 0) : 0
}

const conveyorPresets = (conveyor.controlMeta ?? [])
  .filter((c): c is Extract<typeof c, { type: 'preset' }> => c.type === 'preset')
  .map((c) => ({
    label: c.label,
    params: (typeof c.params === 'function' ? c.params({}) : c.params) as Record<string, number>,
  }))

describe('anim-conveyor · 每个「高考经典场景」预设都必须真的动起来', () => {
  it('预设数量齐全（3 水平 + 3 倾斜）', () => {
    expect(conveyorPresets.length).toBe(6)
  })

  /*
   * 这一条守的是最伤人的一类回退：参数组合在物理上"合法"、不报错、不崩，
   * 只是物块一放上去就判离场，然后整段动画定格在端点。
   * 曾经的倾斜带三个预设就是这样 —— x 恒为 0.00、v 恒为 −0.00。
   */
  it('前 1 s 内物块确实在动，且不是「一放上去就离场」', () => {
    for (const preset of conveyorPresets) {
      const f0 = frameAt(preset.params, 0)
      const f1 = frameAt(preset.params, 1)
      expect(['exitLeft', 'exitRight'], preset.label).not.toContain(f0.phase)
      expect(f0.tExit, preset.label).toBeNull()
      expect(Math.abs(f1.xObj - f0.xObj), preset.label).toBeGreaterThan(0.2)
    }
  })

  it('倾斜带预设的放置位置与运动方向自洽（下滑题从顶端出发，上滑题从底端出发）', () => {
    for (const preset of conveyorPresets) {
      const p = preset.params
      if ((p.conveyorMode ?? 0) !== 1) continue
      const x0 = p.x0Ratio ?? 0
      const f1 = frameAt(p, 1)
      if (p.vBelt < 0) {
        // 皮带向下跑：物块必须从顶端释放，且第 1 s 时还在向下走
        expect(x0, preset.label).toBe(1)
        expect(f1.vObj, preset.label).toBeLessThan(0)
      } else {
        expect(x0, preset.label).toBe(0)
        expect(f1.vObj, preset.label).toBeGreaterThan(0)
      }
    }
  })
})

describe('anim-conveyor · 临界点必须跟着 x0Ratio 走', () => {
  /*
   * 注册表的 criticalTimes 自己重新组一次 `getConveyorFrame` 的参数。
   * 漏传 x0Ratio 时它会按「放底端」算，而画面按「放顶端」演 ——
   * 播放条上的共速标记就落在了一个画面上根本没有共速的时刻。
   */
  it('放顶端的下滑题：共速标记与同一 x0Ratio 下的 tSync 对齐', () => {
    const p = { conveyorMode: 1, vBelt: -2.0, v0: 0, mu: 0.15, L: 8, x0Ratio: 1 }
    const frame = frameAt(p, 12)
    expect(frame.tSync).not.toBeNull()

    const sync = criticalTimes(p).find((x) => x.label.includes('共速'))
    expect(sync).toBeDefined()
    expect(sync!.time).toBeGreaterThanOrEqual(frame.tSync!)
    expect(sync!.time - frame.tSync!).toBeLessThanOrEqual(0.01)
  })

  it('漏传 x0Ratio 会得到完全不同的结果（放底端根本没有共速）', () => {
    const p = { conveyorMode: 1, vBelt: -2.0, v0: 0, mu: 0.15, L: 8, x0Ratio: 1 }
    const bottom = frameAt({ ...p, x0Ratio: 0 }, 12)
    expect(bottom.tSync).toBeNull()
    expect(criticalTimes({ ...p, x0Ratio: 0 })).toHaveLength(0)
  })
})
