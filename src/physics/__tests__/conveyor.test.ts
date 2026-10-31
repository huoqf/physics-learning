import { describe, it, expect } from 'vitest'
import {
  getConveyorFrame,
  canConveyorKeepSynchronous,
  type ConveyorParam,
} from '../conveyor'

const HORIZONTAL_BASE: ConveyorParam = {
  vBelt: 3,
  v0: 0,
  mu: 0.2,
  L: 6,
  mode: 'horizontal',
}

const INCLINED_BASE: ConveyorParam = {
  vBelt: 2,
  v0: 0,
  mu: 0.35,
  L: 8,
  mode: 'inclined',
  thetaRad: Math.PI / 12,
}

// ── canConveyorKeepSynchronous ──────────────────────────────────────────

describe('canConveyorKeepSynchronous', () => {
  it('水平模式恒为 true', () => {
    expect(canConveyorKeepSynchronous({ ...HORIZONTAL_BASE, mu: 0 })).toBe(true)
    expect(canConveyorKeepSynchronous({ ...HORIZONTAL_BASE, mu: 10 })).toBe(true)
  })

  it('倾斜模式 μ >= tan15° 返回 true', () => {
    // tan(π/12) ≈ 0.2679
    const p = { ...INCLINED_BASE, mu: 0.27 }
    expect(canConveyorKeepSynchronous(p)).toBe(true)
  })

  it('倾斜模式 μ < tan15° 返回 false', () => {
    const p = { ...INCLINED_BASE, mu: 0.15 }
    expect(canConveyorKeepSynchronous(p)).toBe(false)
  })
})

// ── getConveyorFrame — 初始状态 ─────────────────────────────────────────

describe('getConveyorFrame — 初始状态 (t=0)', () => {
  it('水平带：v0=0, vBelt=3 → 初始为 sliding, velocity=0, x=0', () => {
    const frame = getConveyorFrame(HORIZONTAL_BASE, 0)
    expect(frame.xObj).toBe(0)
    expect(frame.vObj).toBe(0)
    expect(frame.phase).toBe('sliding')
    expect(frame.relativeVelocity).toBe(-3) // 0 - 3
    expect(frame.tSync).toBeNull()
    expect(frame.tExit).toBeNull()
    expect(frame.heat).toBe(0)
  })

  it('水平带：v0=vBelt → 初始直接共速', () => {
    const frame = getConveyorFrame({ ...HORIZONTAL_BASE, v0: 3, vBelt: 3 }, 0)
    expect(frame.phase).toBe('synchronous')
    expect(frame.vObj).toBe(3)
    expect(frame.hasSynced).toBe(true)
    expect(frame.tSync).toBe(0)
  })

  it('倾斜带：v0=0, vBelt=2, μ=0.35 → 初始为 sliding', () => {
    const frame = getConveyorFrame(INCLINED_BASE, 0)
    expect(frame.phase).toBe('sliding')
    expect(frame.xObj).toBe(0)
  })
})

// ── getConveyorFrame — 水平带加速共速 ───────────────────────────────────

describe('getConveyorFrame — 水平带加速共速', () => {
  const param: ConveyorParam = { vBelt: 3, v0: 0, mu: 0.2, L: 15, mode: 'horizontal' }

  it('t=0.5s: 加速中，仍为 sliding', () => {
    const frame = getConveyorFrame(param, 0.5)
    expect(frame.phase).toBe('sliding')
    expect(frame.vObj).toBeGreaterThan(0)
    expect(frame.vObj).toBeLessThan(3)
    expect(frame.xObj).toBeGreaterThan(0)
    expect(frame.heat).toBeGreaterThan(0)
    expect(frame.relativeDistanceAbs).toBeGreaterThan(0)
  })

  it('t=2s: 已共速，phase=synchronous', () => {
    const frame = getConveyorFrame(param, 2)
    expect(frame.phase).toBe('synchronous')
    expect(frame.vObj).toBeCloseTo(3, 1)
    expect(frame.aObj).toBe(0)
    expect(frame.friction).toBe(0)
    expect(frame.hasSynced).toBe(true)
    expect(frame.tSync).not.toBeNull()
    expect(frame.tSync!).toBeGreaterThan(0)
  })

  it('t=5s: 共速后匀速运动，x 持续增加', () => {
    const frame = getConveyorFrame(param, 5)
    expect(frame.phase).toBe('synchronous')
    expect(frame.vObj).toBeCloseTo(3, 1)
    expect(frame.xObj).toBeGreaterThan(3 * (5 - 2))
  })
})

// ── getConveyorFrame — 水平带减速共速 ───────────────────────────────────

describe('getConveyorFrame — 水平带减速共速', () => {
  const param: ConveyorParam = { vBelt: 2, v0: 5, mu: 0.2, L: 10, mode: 'horizontal' }

  it('t=0.3s: 减速中，仍为 sliding', () => {
    const frame = getConveyorFrame(param, 0.3)
    expect(frame.phase).toBe('sliding')
    expect(frame.vObj).toBeLessThan(5)
    expect(frame.relativeVelocity).toBeGreaterThan(0) // vObj > vBelt
  })

  it('t=2s: 已共速，phase=synchronous, v=2', () => {
    const frame = getConveyorFrame(param, 2)
    expect(frame.phase).toBe('synchronous')
    expect(frame.vObj).toBeCloseTo(2, 1)
    expect(frame.relativeVelocity).toBeCloseTo(0, 1)
  })
})

// ── getConveyorFrame — 水平带反向折返 ───────────────────────────────────

describe('getConveyorFrame — 水平带反向折返', () => {
  const param: ConveyorParam = { vBelt: -2, v0: 4, mu: 0.2, L: 6, mode: 'horizontal' }

  it('t=0.5s: 减速中，vObj > 0', () => {
    const frame = getConveyorFrame(param, 0.5)
    expect(frame.phase).toBe('sliding')
    expect(frame.vObj).toBeGreaterThan(0)
  })

  it('t=4s: 已共速到 vBelt=-2，phase=synchronous', () => {
    const frame = getConveyorFrame(param, 4)
    expect(frame.phase).toBe('synchronous')
    expect(frame.vObj).toBeCloseTo(-2, 1)
  })
})

// ── getConveyorFrame — 水平带右侧退出 ───────────────────────────────────

describe('getConveyorFrame — 水平带右侧退出', () => {
  const param: ConveyorParam = { vBelt: 3, v0: 0, mu: 0.2, L: 4, mode: 'horizontal' }

  it('t=6s: 物块已从右端离开', () => {
    const frame = getConveyorFrame(param, 6)
    expect(frame.phase).toBe('exitRight')
    expect(frame.xObj).toBe(4)
    expect(frame.tExit).not.toBeNull()
    expect(frame.friction).toBe(0)
    expect(frame.aObj).toBe(0)
  })
})

// ── getConveyorFrame — 水平带 v0 向左退出 ───────────────────────────────

describe('getConveyorFrame — 水平带向左退出', () => {
  const param: ConveyorParam = { vBelt: -1, v0: -3, mu: 0.2, L: 6, mode: 'horizontal' }

  it('向左退出时 phase=exitLeft, x=0', () => {
    const frame = getConveyorFrame(param, 5)
    expect(frame.phase).toBe('exitLeft')
    expect(frame.xObj).toBe(0)
    expect(frame.tExit).not.toBeNull()
    expect(frame.friction).toBe(0)
  })
})

// ── getConveyorFrame — 倾斜带全程滑动 (μ < tanθ) ───────────────────────

describe('getConveyorFrame — 倾斜带 μ < tanθ 全程滑动', () => {
  // 初始 v0=vBelt 但 μ < tanθ，无法保持共速，立即开始相对滑动
  const param: ConveyorParam = { vBelt: 2, v0: 2, mu: 0.15, L: 8, mode: 'inclined', thetaRad: Math.PI / 12 }

  it('t=0.1s: 已偏离共速，进入 sliding 但未退出', () => {
    const frame = getConveyorFrame(param, 0.1)
    expect(frame.phase).toBe('sliding')
    expect(frame.vObj).toBeLessThan(2)
    expect(frame.xObj).toBeGreaterThan(0)
  })

  it('t=0.5s: 持续下滑，sliding', () => {
    const frame = getConveyorFrame(param, 0.5)
    expect(frame.phase).toBe('sliding')
    expect(frame.vObj).toBeLessThan(2)
    expect(frame.xObj).toBeGreaterThan(0)
  })

  it('t=4s: 已从左端离开', () => {
    const frame = getConveyorFrame(param, 4)
    expect(frame.phase).toBe('exitLeft')
    expect(frame.xObj).toBe(0)
  })

  it('canConveyorKeepSynchronous 返回 false', () => {
    expect(canConveyorKeepSynchronous(param)).toBe(false)
  })
})

// ── getConveyorFrame — 倾斜带共速保持 (μ >= tanθ) ─────────────────────

describe('getConveyorFrame — 倾斜带 μ >= tanθ 共速保持', () => {
  const param: ConveyorParam = { vBelt: 2, v0: 0, mu: 0.35, L: 8, mode: 'inclined', thetaRad: Math.PI / 12 }

  it('t=1s: sliding 加速中', () => {
    const frame = getConveyorFrame(param, 1)
    expect(frame.phase).toBe('sliding')
    expect(frame.vObj).toBeGreaterThan(0)
  })

  it('t=4s: 已共速，phase=staticOnIncline', () => {
    const frame = getConveyorFrame(param, 4)
    expect(frame.phase).toBe('staticOnIncline')
    expect(frame.vObj).toBeCloseTo(2, 1)
    expect(frame.aObj).toBe(0)
    // 静摩擦力平衡重力分力
    expect(frame.friction).toBeGreaterThan(0)
  })

  it('canConveyorKeepSynchronous 返回 true', () => {
    expect(canConveyorKeepSynchronous(param)).toBe(true)
  })
})

// ── getConveyorFrame — 生热与相对位移 ───────────────────────────────────

describe('getConveyorFrame — 生热与相对位移', () => {
  it('水平带同步阶段生热为 0', () => {
    const param: ConveyorParam = { vBelt: 3, v0: 3, mu: 0.2, L: 10, mode: 'horizontal' }
    const frame = getConveyorFrame(param, 3)
    expect(frame.phase).toBe('synchronous')
    expect(frame.heat).toBe(0)
    expect(frame.relativeDistanceAbs).toBe(0)
  })

  it('滑动阶段生热和相对位移单调递增', () => {
    const param: ConveyorParam = { vBelt: 3, v0: 0, mu: 0.2, L: 6, mode: 'horizontal' }
    const frame1 = getConveyorFrame(param, 0.5)
    const frame2 = getConveyorFrame(param, 1)
    expect(frame2.heat).toBeGreaterThan(frame1.heat)
    expect(frame2.relativeDistanceAbs).toBeGreaterThan(frame1.relativeDistanceAbs)
  })

  it('共速后生热不再增加', () => {
    const param: ConveyorParam = { vBelt: 3, v0: 0, mu: 0.2, L: 6, mode: 'horizontal' }
    const frameSync = getConveyorFrame(param, 2.5) // 应已共速
    const frameLater = getConveyorFrame(param, 4)
    if (frameSync.phase === 'synchronous') {
      expect(frameLater.heat).toBeCloseTo(frameSync.heat, 1)
    }
  })

  it('倾斜传送带反向相对滑动时：scratchLength 为包络区间且小于累计路程 relativeDistanceAbs', () => {
    // 倾斜传送带：theta=30°, tan30° ≈ 0.577, 设 mu=0.2 < tan30°
    // 初速度 v0 = 4 > vBelt = 2，物块先向上相对皮带减速滑行直至共速
    // 共速后因为 mu < tan theta，合力向下，物块开始相对传送带反向下滑
    const param: ConveyorParam = {
      vBelt: 2,
      v0: 4,
      mu: 0.2,
      thetaRad: Math.PI / 6,
      L: 20,
      mode: 'inclined',
    }
    const frameAtSync = getConveyorFrame(param, 0.4)
    const frameLater = getConveyorFrame(param, 1.2)
    // 累计相对路程随时间单调增加
    expect(frameLater.relativeDistanceAbs).toBeGreaterThan(frameAtSync.relativeDistanceAbs)
    // 生热 Q 严格与累计相对路程成正比
    const normalForce = 1 * 9.8 * Math.cos(Math.PI / 6)
    expect(frameLater.heat).toBeCloseTo(0.2 * normalForce * frameLater.relativeDistanceAbs, 1)
    // 在反向阶段，几何划痕覆盖区间 scratchLength 必须小于累计相对路程
    expect(frameLater.scratchLength).toBeLessThan(frameLater.relativeDistanceAbs)
  })
})

// ── getConveyorFrame — 边界条件 ─────────────────────────────────────────

describe('getConveyorFrame — 边界条件', () => {
  it('exit 后 friction 和 aObj 为 0', () => {
    const param: ConveyorParam = { vBelt: 3, v0: 0, mu: 0.2, L: 4, mode: 'horizontal' }
    const frame = getConveyorFrame(param, 10)
    expect(frame.phase === 'exitLeft' || frame.phase === 'exitRight').toBe(true)
    expect(frame.friction).toBe(0)
    expect(frame.aObj).toBe(0)
  })

  it('xObj 始终限制在 [0, L] 内', () => {
    const param: ConveyorParam = { vBelt: 10, v0: 0, mu: 0.5, L: 3, mode: 'horizontal' }
    for (let t = 0; t <= 5; t += 0.5) {
      const frame = getConveyorFrame(param, t)
      expect(frame.xObj).toBeGreaterThanOrEqual(0)
      expect(frame.xObj).toBeLessThanOrEqual(3)
    }
  })

  it('正反向 vBelt 应正确，负值向左', () => {
    const framePos = getConveyorFrame({ ...HORIZONTAL_BASE, vBelt: 3, v0: 0 }, 0.5)
    const frameNeg = getConveyorFrame({ ...HORIZONTAL_BASE, vBelt: -3, v0: 0 }, 0.5)
    // 正向 vBelt → 正加速度
    expect(framePos.vObj).toBeGreaterThan(0)
    // 负向 vBelt → 负加速度
    expect(frameNeg.vObj).toBeLessThan(0)
  })
})

// ── getConveyorFrame — 倾斜带初始位置（放顶端下滑） ─────────────────────

/*
 * 这一组守的是「倾斜带物理是死的」那类回退：
 * 位置基准一律写 0 时，从顶端释放的题第一帧就判「左端离开」，
 * 画面永远定格在 x=0、v=0，ΔEp 也恒为 0 —— 三个倾斜带预设演的都是静止图。
 */
describe('getConveyorFrame — 倾斜带 x0Ratio', () => {
  const DOWN_BELT: ConveyorParam = {
    vBelt: -2,
    v0: 0,
    mu: 0.15,
    L: 8,
    mode: 'inclined',
    thetaRad: Math.PI / 12,
  }

  it('x0Ratio=1：t=0 站在顶端且不算离开', () => {
    const frame = getConveyorFrame({ ...DOWN_BELT, x0Ratio: 1 }, 0)
    expect(frame.xObj).toBeCloseTo(8, 6)
    expect(frame.phase).toBe('sliding')
    expect(frame.tExit).toBeNull()
    expect(frame.scratchLength).toBe(0) // 还没滑，划痕为 0（不能一上来就满带）
  })

  it('x0Ratio=1：物块真的沿斜面下滑', () => {
    const at0 = getConveyorFrame({ ...DOWN_BELT, x0Ratio: 1 }, 0)
    const at05 = getConveyorFrame({ ...DOWN_BELT, x0Ratio: 1 }, 0.5)
    expect(at05.xObj).toBeLessThan(at0.xObj)
    expect(at05.vObj).toBeLessThan(0)
    expect(at05.tExit).toBeNull()
  })

  it('μ < tanθ：共速瞬间之后摩擦反向、加速度绝对值变小（v-t 折点）', () => {
    const preSync = getConveyorFrame({ ...DOWN_BELT, x0Ratio: 1 }, 0.4)
    const postSync = getConveyorFrame({ ...DOWN_BELT, x0Ratio: 1 }, 0.8)
    // tSync 只有在积分跨过共速点之后才会被写入，所以从前一帧读不到、从后一帧读到
    expect(postSync.tSync).not.toBeNull()
    expect(postSync.tSync!).toBeGreaterThan(0.4)
    expect(postSync.hasSynced).toBe(true)
    // 共速前：摩擦沿斜面向下（与重力同向）
    expect(preSync.friction).toBeLessThan(0)
    // 共速后：摩擦沿斜面向上（μ<tanθ 撑不住，只能减小下滑加速度）
    expect(postSync.friction).toBeGreaterThan(0)
    expect(postSync.aObj).toBeLessThan(0)
    expect(Math.abs(postSync.aObj)).toBeLessThan(Math.abs(preSync.aObj))
  })

  it('μ ≥ tanθ：共速后转为静摩擦同步，随带向下匀速', () => {
    const param: ConveyorParam = { ...DOWN_BELT, mu: 0.35, x0Ratio: 1 }
    const frame = getConveyorFrame(param, 2)
    expect(frame.phase).toBe('staticOnIncline')
    expect(frame.vObj).toBeCloseTo(-2, 1)
    expect(frame.aObj).toBe(0)
    // 静摩擦沿斜面向上，大小恰为 mg·sinθ
    expect(frame.friction).toBeCloseTo(1 * 9.8 * Math.sin(Math.PI / 12), 1)
    expect(frame.tExit).toBeNull()
  })

  it('水平带忽略 x0Ratio（参数在水平模式下无定义，脏值不能把物块摆到右端）', () => {
    const frame = getConveyorFrame({ ...HORIZONTAL_BASE, x0Ratio: 1 }, 0)
    expect(frame.xObj).toBe(0)
    expect(frame.phase).toBe('sliding')
  })
})

// ── getConveyorFrame — 划痕区间 ────────────────────────────────────────

/*
 * scratchFrom/scratchTo 是划痕在场景里当前占的区间。
 * 曾经由动画层用 `xObj <= vBelt*time` 猜「物块相对皮带是快是慢」再决定
 * 往哪边加划痕长度，倾斜带（皮带向下跑、物块从顶端出发）会整个猜反。
 */
describe('getConveyorFrame — 划痕区间 scratchFrom / scratchTo', () => {
  const CASES: ConveyorParam[] = [
    { vBelt: 3, v0: 0, mu: 0.2, L: 6, mode: 'horizontal' },
    { vBelt: 2, v0: 5, mu: 0.2, L: 6, mode: 'horizontal' },
    { vBelt: -2, v0: 4, mu: 0.2, L: 6, mode: 'horizontal' },
    { vBelt: -2, v0: 0, mu: 0.15, L: 8, mode: 'inclined', thetaRad: Math.PI / 12, x0Ratio: 1 },
    { vBelt: -2, v0: 0, mu: 0.35, L: 8, mode: 'inclined', thetaRad: Math.PI / 12, x0Ratio: 1 },
    { vBelt: 3, v0: 0, mu: 0.35, L: 8, mode: 'inclined', thetaRad: Math.PI / 12, x0Ratio: 0 },
  ]

  it('区间永远包住物块当前位置，且不宽于累计划痕长度', () => {
    for (const param of CASES) {
      for (const t of [0, 0.2, 0.5, 1, 2, 3, 5]) {
        const frame = getConveyorFrame(param, t)
        expect(frame.scratchFrom).toBeLessThanOrEqual(frame.xObj + 1e-9)
        expect(frame.scratchTo).toBeGreaterThanOrEqual(frame.xObj - 1e-9)
        expect(frame.scratchTo - frame.scratchFrom).toBeLessThanOrEqual(frame.scratchLength + 1e-9)
        expect(frame.scratchFrom).toBeGreaterThanOrEqual(0)
        expect(frame.scratchTo).toBeLessThanOrEqual(param.L)
      }
    }
  })

  it('水平带放上加速：划痕长在物块前方（皮带比物块快）', () => {
    const param: ConveyorParam = { vBelt: 3, v0: 0, mu: 0.2, L: 6, mode: 'horizontal' }
    const frame = getConveyorFrame(param, 1)
    expect(frame.scratchFrom).toBeCloseTo(frame.xObj, 1)
    expect(frame.scratchTo).toBeCloseTo(3 * 1, 1) // 皮带自身走过 3 m
  })

  it('倾斜带顶端下滑：划痕长在物块后侧（皮带比物块跑得快）', () => {
    const param: ConveyorParam = {
      vBelt: -2,
      v0: 0,
      mu: 0.15,
      L: 8,
      mode: 'inclined',
      thetaRad: Math.PI / 12,
      x0Ratio: 1,
    }
    const frame = getConveyorFrame(param, 0.4)
    expect(frame.scratchTo).toBeCloseTo(frame.xObj, 1) // 物块在高端（后侧）
    expect(frame.scratchFrom).toBeLessThan(frame.xObj)
  })
})