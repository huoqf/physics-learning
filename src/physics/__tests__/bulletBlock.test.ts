import { describe, it, expect } from 'vitest'
import {
  getBulletBlockTimeline,
  getBulletBlockState,
  generateBulletBlockVT,
  generateBulletBlockEnergy,
  type BulletBlockParam,
} from '../bulletBlock'

const BASE_PARAM: BulletBlockParam = {
  m: 0.1,
  M: 2.0,
  v0: 100,
  f: 2000,
  L: 0.3,
}

// ── getBulletBlockTimeline ────────────────────────────────────────────────

describe('getBulletBlockTimeline', () => {
  it('留存模式：计算共速时刻、共速速度、相对位移', () => {
    const tl = getBulletBlockTimeline(BASE_PARAM, 'retain')
    // tSync = v0 / (f/m + f/M) = 100 / (20000 + 1000) = 100 / 21000
    expect(tl.tSync).toBeCloseTo(100 / 21000, 6)
    // vSync = v0 * m / (m + M) = 100 * 0.1 / 2.1
    expect(tl.vSync).toBeCloseTo(100 / 21, 4)
    // deltaXMax 应小于 L
    expect(tl.deltaXMax).toBeLessThan(BASE_PARAM.L)
    // 留存模式不计算穿出
    expect(tl.tExit).toBe(Infinity)
  })

  it('穿透模式且 L < deltaXMax：计算穿出时刻', () => {
    const param = { ...BASE_PARAM, f: 500, L: 0.2 }
    const tl = getBulletBlockTimeline(param, 'penetrate')
    // f=500 时 deltaXMax 很大，L=0.2 应穿出
    expect(tl.deltaXMax).toBeGreaterThan(param.L)
    expect(tl.tExit).not.toBe(Infinity)
    expect(tl.tExit).toBeGreaterThan(0)
    expect(tl.tExit).toBeLessThan(tl.tSync)
  })

  it('穿透模式且 L > deltaXMax：不会穿出', () => {
    const tl = getBulletBlockTimeline(BASE_PARAM, 'penetrate')
    expect(tl.deltaXMax).toBeLessThan(BASE_PARAM.L)
    expect(tl.tExit).toBe(Infinity)
  })
})

// ── getBulletBlockState — 初始状态 ────────────────────────────────────────

describe('getBulletBlockState — 初始状态 (t=0)', () => {
  it('t=0 时子弹速度=v0，木块速度=0', () => {
    const s = getBulletBlockState(BASE_PARAM, 0, 'retain')
    expect(s.bulletV).toBe(BASE_PARAM.v0)
    expect(s.blockV).toBe(0)
    expect(s.bulletX).toBe(0)
    expect(s.blockX).toBe(0)
    expect(s.phase).toBe('penetrating')
    expect(s.Q).toBe(0)
  })
})

// ── getBulletBlockState — 留存模式 ────────────────────────────────────────

describe('getBulletBlockState — 留存模式', () => {
  it('穿透阶段：子弹减速、木块加速、相对深度增加', () => {
    const t = getBulletBlockTimeline(BASE_PARAM, 'retain').tSync * 0.5
    const s = getBulletBlockState(BASE_PARAM, t, 'retain')
    expect(s.phase).toBe('penetrating')
    expect(s.bulletV).toBeLessThan(BASE_PARAM.v0)
    expect(s.bulletV).toBeGreaterThan(0)
    expect(s.blockV).toBeGreaterThan(0)
    expect(s.relativeDepth).toBeGreaterThan(0)
    expect(s.Q).toBeGreaterThan(0)
  })

  it('共速后：两者速度相等，phase=synced', () => {
    const tl = getBulletBlockTimeline(BASE_PARAM, 'retain')
    const s = getBulletBlockState(BASE_PARAM, tl.tSync + 0.2, 'retain')
    expect(s.phase).toBe('synced')
    expect(s.bulletV).toBeCloseTo(tl.vSync, 4)
    expect(s.blockV).toBeCloseTo(tl.vSync, 4)
    expect(s.bulletA).toBe(0)
    expect(s.blockA).toBe(0)
  })

  it('动量守恒：任意时刻系统动量守恒', () => {
    const tl = getBulletBlockTimeline(BASE_PARAM, 'retain')
    const tMid = tl.tSync * 0.5
    const s = getBulletBlockState(BASE_PARAM, tMid, 'retain')
    const pInitial = BASE_PARAM.m * BASE_PARAM.v0
    const pCurrent = BASE_PARAM.m * s.bulletV + BASE_PARAM.M * s.blockV
    expect(pCurrent).toBeCloseTo(pInitial, 3)
  })

  it('能量关系：Q = Ek0 - EkTotal', () => {
    const tl = getBulletBlockTimeline(BASE_PARAM, 'retain')
    const s = getBulletBlockState(BASE_PARAM, tl.tSync * 0.7, 'retain')
    const Ek0 = 0.5 * BASE_PARAM.m * BASE_PARAM.v0 ** 2
    expect(s.EkTotal + s.Q).toBeCloseTo(Ek0, 2)
  })
})

// ── getBulletBlockState — 穿透模式 ────────────────────────────────────────

describe('getBulletBlockState — 穿透模式', () => {
  const PENETRATE_PARAM: BulletBlockParam = {
    m: 0.1,
    M: 2.0,
    v0: 100,
    f: 500,
    L: 0.2,
  }

  it('穿出前：phase=penetrating', () => {
    const tl = getBulletBlockTimeline(PENETRATE_PARAM, 'penetrate')
    const t = tl.tExit * 0.5
    const s = getBulletBlockState(PENETRATE_PARAM, t, 'penetrate')
    expect(s.phase).toBe('penetrating')
  })

  it('穿出后：phase=exited，各自匀速，子弹V > 木块V', () => {
    const tl = getBulletBlockTimeline(PENETRATE_PARAM, 'penetrate')
    const s = getBulletBlockState(PENETRATE_PARAM, tl.tExit + 0.1, 'penetrate')
    expect(s.phase).toBe('exited')
    expect(s.bulletV).toBeGreaterThan(s.blockV)
    expect(s.bulletA).toBe(0)
    expect(s.blockA).toBe(0)
  })

  it('穿出后位移：子弹超前木块，且差值 > L', () => {
    const tl = getBulletBlockTimeline(PENETRATE_PARAM, 'penetrate')
    const s = getBulletBlockState(PENETRATE_PARAM, tl.tExit + 0.2, 'penetrate')
    expect(s.bulletX - s.blockX).toBeGreaterThan(PENETRATE_PARAM.L)
  })
})

// ── 数据生成函数 ──────────────────────────────────────────────────────────

describe('generateBulletBlockVT', () => {
  it('生成 v-t 数据，长度等于 resolution+1', () => {
    const { bulletVT, blockVT } = generateBulletBlockVT(BASE_PARAM, 'retain', 100)
    expect(bulletVT.length).toBe(101)
    expect(blockVT.length).toBe(101)
    expect(bulletVT[0].v).toBe(BASE_PARAM.v0)
    expect(blockVT[0].v).toBe(0)
  })
})

describe('generateBulletBlockEnergy', () => {
  it('生成能量数据，t=0 时 Q=0', () => {
    const pts = generateBulletBlockEnergy(BASE_PARAM, 'retain', 50)
    expect(pts.length).toBe(51)
    expect(pts[0].Q).toBe(0)
    expect(pts[0].ekTotal).toBeCloseTo(0.5 * BASE_PARAM.m * BASE_PARAM.v0 ** 2, 4)
  })
})
