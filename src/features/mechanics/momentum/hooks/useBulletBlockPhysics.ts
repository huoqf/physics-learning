/**
 * useBulletBlockPhysics.ts
 * 子弹打木块动画 view model：物理状态、图表数据、场景坐标参数
 *
 * 零 JSX，纯数据计算，可独立单测
 */
import { useMemo } from 'react'
import {
  getBulletBlockTimeline,
  getBulletBlockState,
  generateBulletBlockVT,
  generateBulletBlockEnergy,
  type BulletBlockParam,
  type BulletBlockMode,
} from '@/physics/bulletBlock'

/** 时间慢放比例：物理时间极短，需放大以便观察 */
export const BB_TIME_SCALE = 100

/** 子弹打木块动画布局常量 */
export const BB_LAYOUT = {
  /** 地面 Y 坐标（设计坐标 px） */
  groundY: 240,
  /** 木块高度（设计坐标 px） */
  blockHeight: 50,
  /** 子弹半径（设计坐标 px，视觉尺寸非真实比例） */
  bulletRadius: 8,
  /** 矢量最大长度（px） */
  vectorMaxLength: 70,
  /** 木块左侧初始偏移（设计坐标 px） */
  blockInitX: 120,
} as const

export interface BulletBlockPhysics {
  /** 物理参数 */
  param: BulletBlockParam
  /** 当前模式 */
  mode: BulletBlockMode
  /** 时间线 */
  timeline: ReturnType<typeof getBulletBlockTimeline>
  /** 当前物理状态 */
  state: ReturnType<typeof getBulletBlockState>
  /** v-t 图表数据（物理时间以毫秒为单位） */
  vtData: {
    bulletVT: { t: number; v: number }[]
    blockVT: { t: number; v: number }[]
  }
  /** 能量图表数据（物理时间以毫秒为单位） */
  energyData: { t: number; ekTotal: number; Q: number; ekBullet: number; ekBlock: number }[]
  /** 建议物理世界宽度（m），供组件计算比例尺 */
  worldWidth: number
  /** 建议物理世界高度（m） */
  worldHeight: number
  /** 速度参考量级（m/s），供矢量归一化 */
  refVelocity: number
  /** 当前动画时间对应的物理时间（s） */
  physicsTime: number
  /** 临界穿透速度 (m/s) */
  vCrit: number
  /** 慢放比例 */
  timeScale: number
  /** 飞入物理时长（s） */
  tPre: number
}

/**
 * 子弹打木块动画物理计算 Hook
 *
 * @param params 动画参数（来自 store）
 * @param time 当前动画时间（s，已含 TIME_SCALE 缩放）
 */
export function useBulletBlockPhysics(
  params: Record<string, number>,
  time: number,
): BulletBlockPhysics {
  const param = useMemo<BulletBlockParam>(
    () => ({
      m: params.m ?? 0.1,
      M: params.M ?? 0.4,
      v0: params.v0 ?? 30,
      f: params.f ?? 10,
      L: params.L ?? 1,
    }),
    [params.m, params.M, params.v0, params.f, params.L],
  )

  // 物理判定：根据初速度与临界穿出速度的关系，自动决定运动模式
  const vCrit = useMemo(() => {
    const { m, M, f, L } = param
    if (m <= 0 || M <= 0 || f <= 0 || L <= 0) return 0
    return Math.sqrt((2 * f * L * (m + M)) / (m * M))
  }, [param])

  const mode: BulletBlockMode = useMemo(() => {
    return param.v0 > vCrit ? 'penetrate' : 'retain'
  }, [param.v0, vCrit])

  const timeline = useMemo(() => getBulletBlockTimeline(param, mode), [param, mode])

  // 动态计算慢放比例：目标打入动画播放时长固定为 4.0 秒
  const targetDuration = 4.0
  const timeScale = useMemo(() => targetDuration / timeline.tMax, [timeline.tMax])

  // 飞入段：子弹从屏幕外飞入，v0 越大飞入越快
  const flyingDistance = 1.0
  const flyingTime = flyingDistance / param.v0
  const tPre = flyingTime
  const physicsTime = Math.min((time - 1.0) * flyingTime, timeline.tMax)

  // 物理状态：物理时间 physicsTime < 0 时为飞入匀速段，>= 0 时为正常碰撞打入段
  const state = useMemo(() => {
    if (physicsTime < 0) {
      const Ek0 = 0.5 * param.m * param.v0 * param.v0
      return {
        t: physicsTime,
        bulletX: param.v0 * physicsTime,
        blockX: 0,
        bulletV: param.v0,
        blockV: 0,
        bulletA: 0,
        blockA: 0,
        relativeDepth: 0,
        phase: 'penetrating' as const,
        Q: 0,
        EkBullet: Ek0,
        EkBlock: 0,
        EkTotal: Ek0,
      }
    }
    return getBulletBlockState(param, physicsTime, mode)
  }, [param, physicsTime, mode])

  const rawVt = useMemo(() => generateBulletBlockVT(param, mode, 200), [param, mode])
  const rawEnergy = useMemo(() => generateBulletBlockEnergy(param, mode, 200), [param, mode])

  // 图表数据时间轴转为物理毫秒 ms (p.t * 1000)，包含飞入匀速段
  const vtData = useMemo(() => {
    const tPreMs = -tPre * 1000
    const bulletFly = [
      { t: tPreMs, v: param.v0 },
      { t: 0, v: param.v0 },
    ]
    const blockFly = [
      { t: tPreMs, v: 0 },
      { t: 0, v: 0 },
    ]

    return {
      bulletVT: [...bulletFly, ...rawVt.bulletVT.map((p) => ({ t: p.t * 1000, v: p.v }))],
      blockVT: [...blockFly, ...rawVt.blockVT.map((p) => ({ t: p.t * 1000, v: p.v }))],
    }
  }, [rawVt, param.v0, tPre])

  const energyData = useMemo(() => {
    const tPreMs = -tPre * 1000
    const Ek0 = 0.5 * param.m * param.v0 * param.v0
    const flyPoints = [
      { t: tPreMs, ekTotal: Ek0, Q: 0, ekBullet: Ek0, ekBlock: 0 },
      { t: 0, ekTotal: Ek0, Q: 0, ekBullet: Ek0, ekBlock: 0 },
    ]

    return [
      ...flyPoints,
      ...rawEnergy.map((p) => ({
        t: p.t * 1000,
        ekTotal: p.ekTotal,
        Q: p.Q,
        ekBullet: p.ekBullet,
        ekBlock: p.ekBlock,
      })),
    ]
  }, [rawEnergy, param.m, param.v0, tPre])

  // 固定世界宽度：三种预设都能装进 600px 画布，标尺不缩放
  // 完全穿透最远 ≈2.8m（飞入0.5m + 穿出后匀速），加边距取 3.5m
  const worldWidth = 3.5
  const worldHeight = 0.6
  const refVelocity = param.v0

  return {
    param,
    mode,
    timeline,
    state,
    vtData,
    energyData,
    worldWidth,
    worldHeight,
    refVelocity,
    physicsTime,
    vCrit: timeline.vCrit,
    timeScale,
    tPre,
  }
}
