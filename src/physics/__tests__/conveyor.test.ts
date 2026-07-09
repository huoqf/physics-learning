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