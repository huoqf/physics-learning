import { describe, it, expect } from 'vitest'
import { mechanicsDynamicsAnimations } from '@/data/registries/mechanics-dynamics'
import { mechanicsKinematicsAnimations } from '@/data/registries/mechanics-kinematics'
import { electromagnetismEmOscillationAnimations } from '@/data/registries/electromagnetism-em-oscillation'
import { electromagnetismElectrostaticsAnimations } from '@/data/registries/electromagnetism-electrostatics'
import { getBoardTimeline } from '@/physics/blockBoard'
import { calculateLCConstants } from '@/physics/lcOscillation'
import { rcTauFromParams, rcWindowFromParams } from '@/physics'
import {
  ensureExtendedRegistry,
  getAllAnimationIds,
  getAnimationConfig,
} from '@/data/animationRegistry'
import { CRITICAL_TIME_STEP } from '@/utils/criticalTime'

/**
 * 临界时刻的取整方向守卫。
 *
 * `toFixed(2)` 落到事件哪一侧是随机的，而深链定格能不能自证就取决于这一点：
 * 相变点落在事件之前，画面还是旧的（摩擦力没突变、vy 还没归零）；
 * 离场点落在事件之后，物块已经不在画面里。这一组把「方向」锁死。
 */

interface CriticalPoint {
  time: number
  label: string
}

type CriticalTimesFn = (p: Record<string, number>) => CriticalPoint[]

const onGrid = (t: number) => Math.abs(Math.round(t * 100) - t * 100) < 1e-6

describe('临界时刻 · 必须落在播放条 0.01 s 网格上', () => {
  it('滑块滑离木板：定格时滑块还在板上（向左对齐）', () => {
    const anim = mechanicsDynamicsAnimations['anim-block-board']
    const points = (anim.criticalTimes as CriticalTimesFn)({
      m: 1,
      M: 3,
      mu1: 0.3,
      mu2: 0.05,
      v0: 5,
      L: 2.5,
    })
    expect(points).toHaveLength(1)
    const tFall = getBoardTimeline({ m: 1, M: 3, mu1: 0.3, mu2: 0.05, v0: 5, L: 2.5 }).tFall

    // 默认参数下滑离早于共速，真正的临界事件就是滑离
    expect(points[0].label).toBe('滑块滑离木板')
    expect(onGrid(points[0].time)).toBe(true)
    // 向左对齐：不晚于滑离时刻，且不超过一格
    expect(points[0].time).toBeLessThanOrEqual(tFall)
    expect(tFall - points[0].time).toBeLessThanOrEqual(CRITICAL_TIME_STEP)
  })

  it('抛体：最高点向右、落地向左，且各自只差一格以内', () => {
    const anim = mechanicsKinematicsAnimations['anim-oblique-throw']
    const p = { v0: 20, angle: 45, g: 9.8 }
    const points = (anim.criticalTimes as CriticalTimesFn)(p)

    const v0y = 20 * Math.sin(Math.PI / 4)
    const topTime = v0y / 9.8
    const groundTime = (2 * v0y) / 9.8

    const apex = points.find((x) => x.label.includes('最高点'))!
    const land = points.find((x) => x.label.includes('落地'))!

    // 相变点：定格必须在 vy 由正转负之后，否则画面里 vy 还没归零
    expect(apex.time).toBeGreaterThanOrEqual(topTime)
    expect(apex.time - topTime).toBeLessThanOrEqual(CRITICAL_TIME_STEP)
    // 离场点：定格必须还在空中
    expect(land.time).toBeLessThanOrEqual(groundTime)
    expect(groundTime - land.time).toBeLessThanOrEqual(CRITICAL_TIME_STEP)

    for (const point of points) expect(onGrid(point.time)).toBe(true)
  })

  it('LC 振荡：理想模式保留精确 T/4 相位读数点（不做 0.01s 近似吸附），阻尼模式取消相位标签', () => {
    const anim = electromagnetismEmOscillationAnimations['anim-lc-oscillation']
    const points = (anim.criticalTimes as CriticalTimesFn)({ scene: 0, L: 0.4, C: 0.4, dRatio: 1, showDamping: 0 })
    const { T } = calculateLCConstants({ L: 0.4, C: 0.4, Q0: 1 })

    expect(points).toHaveLength(5)
    const expected = [T / 4, T / 2, (3 * T) / 4, T, 2 * T]
    points.forEach((point, idx) => {
      expect(point.time).toBeCloseTo(expected[idx], 12)
    })

    const dampedPoints = (anim.criticalTimes as CriticalTimesFn)({ scene: 0, L: 0.4, C: 0.4, dRatio: 1, showDamping: 1 })
    expect(dampedPoints).toEqual([])
  })

  it('RC 暂态：三点都在窗口内且在网格上，5τ 不越过窗口末端', () => {
    const anim = electromagnetismElectrostaticsAnimations['anim-capacitor']
    const params = { mode: 1, phase: 0, emf: 6, R_t: 10, C_t: 200, S: 100, d: 5, epsilon_r: 1, U: 12, connected: 1, savedQ: 2.12496e-10 }
    const points = (anim.criticalTimes as CriticalTimesFn)(params)
    const tau = rcTauFromParams(params)
    const window = rcWindowFromParams(params)

    expect(points).toHaveLength(3)
    for (const point of points) {
      expect(onGrid(point.time)).toBe(true)
      expect(point.time).toBeLessThanOrEqual(window)
    }
    // 5τ 就是观察窗口末端，只能向前对齐，不能推到窗口外
    expect(points[2].time).toBeLessThanOrEqual(window)
    expect(points[0].time).toBeGreaterThanOrEqual(tau - CRITICAL_TIME_STEP)
    expect(points[0].time).toBeLessThanOrEqual(tau + CRITICAL_TIME_STEP)
  })

  it('RC 暂态：放电模式的读数标签不能写「达 63.2%」', () => {
    const anim = electromagnetismElectrostaticsAnimations['anim-capacitor']
    const base = { mode: 1, emf: 6, R_t: 10, C_t: 200, S: 100, d: 5, epsilon_r: 1, U: 12, connected: 1, savedQ: 2.12496e-10 }
    const charging = (anim.criticalTimes as CriticalTimesFn)({ ...base, phase: 0 })
    const discharging = (anim.criticalTimes as CriticalTimesFn)({ ...base, phase: 1 })

    expect(charging[0].label).toContain('63.2%')
    // 放电 u_C = E·e^{−t/τ}，τ 时只剩 36.8%
    expect(discharging[0].label).toContain('36.8%')
    expect(discharging[2].label).toContain('放完')
    expect(charging[2].label).toContain('充满')
  })

  it('全量注册表：所有 timed 动画须提供 criticalTimes 且（除精确读数点外）对齐 0.01s 网格', async () => {
    await ensureExtendedRegistry()
    const ids = getAllAnimationIds()
    expect(ids.length).toBeGreaterThanOrEqual(130)

    const exactTimeExceptions = new Set(['anim-lc-oscillation'])

    for (const id of ids) {
      const cfg = getAnimationConfig(id)
      expect(cfg, `${id} 配置缺失`).toBeDefined()
      if (!cfg) continue

      const params = { ...(cfg.defaultParams ?? {}) } as Record<string, number>
      const controlsMode =
        typeof cfg.controlsMode === 'function' ? cfg.controlsMode(params) : (cfg.controlsMode ?? 'timed')

      if (controlsMode !== 'timed') continue

      expect(cfg.criticalTimes, `${id} 为 timed 模式但未配置 criticalTimes`).toBeDefined()
      const maxTime =
        typeof cfg.maxTime === 'function' ? (cfg.maxTime(params) ?? 30) : (cfg.maxTime ?? 30)
      const list =
        typeof cfg.criticalTimes === 'function' ? cfg.criticalTimes(params) : (cfg.criticalTimes ?? [])

      let prev = 0
      for (const pt of list) {
        expect(pt.time, `${id} 临界点 ${pt.label} <= 0`).toBeGreaterThan(0)
        expect(pt.time, `${id} 临界点 ${pt.label} 超出 maxTime=${maxTime}`).toBeLessThanOrEqual(maxTime + 1e-9)
        expect(pt.time, `${id} 临界点未按时间严格升序`).toBeGreaterThan(prev)
        prev = pt.time
        if (!exactTimeExceptions.has(id)) {
          expect(onGrid(pt.time), `${id} 临界点 ${pt.label}=${pt.time} 未落在 0.01s 网格`).toBe(true)
        }
      }
    }
  })
})
