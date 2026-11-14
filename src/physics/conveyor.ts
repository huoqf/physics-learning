/**
 * 传送带模型分段动力学计算。
 *
 * 约定：沿传送带向右为 x 正方向；倾斜模式下，向右表示沿斜面向上。
 * 本文件无 React/DOM/window 依赖，返回值为可序列化普通对象。
 */

import { GRAVITY } from './constants'
import { alignCriticalTime } from '@/utils/criticalTime'
import type { TimeStageSegment } from '@/data/types'

export type ConveyorMode = 'horizontal' | 'inclined'

export interface ConveyorParam {
  /** 传送带速度，单位：m/s；正值向右，负值向左 */
  vBelt: number
  /** 物块初速度，单位：m/s；正值向右 */
  v0: number
  /** 动摩擦因数；教学模型中近似同时作为最大静摩擦因数 */
  mu: number
  /** 传送带有效长度，单位：m */
  L: number
  /** 传送带模式：水平 / 倾斜 */
  mode: ConveyorMode
  /** 倾角，单位：rad；水平模式自动视为 0 */
  thetaRad?: number
  /**
   * 物块初始位置，取 [0, 1] 表示从低端到顶端的相对位置，缺省 0（放底端）。
   *
   * 这是**初始条件**，不是可有可无的修饰：倾斜带的两个经典题型要靠它区分 ——
   *   「物块放顶端下滑」x0Ratio=1：μ < tanθ 时物块有下滑空间，
   *   「物块放底端被带上去」x0Ratio=0：μ ≥ tanθ 时物块有上滑空间。
   * 写死 0 会让前者一放上去就滑出底端（实测物块全程不动），
   * 写死 1 会让后者一放上去就冲上顶端离开。
   */
  x0Ratio?: number
  /** 重力加速度，单位：m/s² */
  g?: number
}

export type ConveyorPhase =
  | 'sliding'
  | 'synchronous'
  | 'staticOnIncline'
  | 'exitLeft'
  | 'exitRight'

export interface ConveyorFrameState {
  /** 物块位置，单位：m，限制在 [0, L] */
  xObj: number
  /** 物块速度，单位：m/s */
  vObj: number
  /** 物块加速度，单位：m/s² */
  aObj: number
  /** 摩擦力，单位：N；正值沿 +x */
  friction: number
  /** 支持力，单位：N */
  normalForce: number
  /** 相对速度 vObj - vBelt，单位：m/s */
  relativeVelocity: number
  /** 累计相对位移绝对值，单位：m */
  relativeDistanceAbs: number
  /** 摩擦生热，单位：J */
  heat: number
  /** 皮带划痕几何包络长度（真实划过区间 max(x_rel) - min(x_rel)），单位：m */
  scratchLength: number
  /**
   * 划痕当前覆盖的区间（沿传送带、以低端 x=0 为基准的地面坐标），单位：m。
   *
   * 划痕是画在皮带上的，因此整体随皮带一起平移；某一时刻它在地面系里占的
   * 范围恰好是「物块曾到过的位置区间」[min xObj, max xObj]。用包络端点换算
   * 比用 `xObj` 加减 `scratchLength` 猜左右更可靠——后者要先判断物块相对
   * 皮带是快还是慢，倾斜带（皮带可能向下走）会猜反。
   */
  scratchFrom: number
  scratchTo: number
  /** 当前阶段 */
  phase: ConveyorPhase
  /** 是否已经达到过共速点 */
  hasSynced: boolean
  /** 共速时刻，单位：s；未共速则为 null */
  tSync: number | null
  /** 离开传送带时刻，单位：s；未离开则为 null */
  tExit: number | null
}

const MASS_DEFAULT = 1
const THETA_DEFAULT = Math.PI / 12
const SIM_DT = 0.005
const EPS_RELATIVE_V = 1e-4
const EPS_TIME = 1e-9

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function signNonZero(value: number, fallback: 1 | -1): 1 | -1 {
  if (value > 0) return 1
  if (value < 0) return -1
  return fallback
}

/**
 * 判断倾斜传送带共速后能否由静摩擦维持同步。
 *
 * @param param 传送带参数
 * @returns true 表示可保持同步；水平模式恒为 true
 */
export function canConveyorKeepSynchronous(param: ConveyorParam): boolean {
  if (param.mode === 'horizontal') return true
  const theta = param.thetaRad ?? THETA_DEFAULT
  return param.mu >= Math.tan(theta)
}

/**
 * 传送带模型的关键临界事件（供播放条「临界点」标记与深链定格复用）。
 *
 * 为什么放在物理层：
 *   临界时刻必须与 `getConveyorFrame` 的积分结果严格一致——另写一套解析解
 *   会在共速判据（EPS_RELATIVE_V）与离开判据（累积位置）上产生毫秒级漂移，
 *   导致播放条标记与画面「差一点点」。因此这里直接复用求解器自身的
 *   `tSync` / `tExit`，注册表只做参数适配。
 *
 * @param params 注册表参数（conveyorMode/vBelt/v0/mu/L/x0Ratio），缺省取默认值
 * @param maxTime 观察窗口（秒），超出窗口的时刻会被丢弃
 */
export function getConveyorCriticalTimes(
  params: Record<string, number>,
  maxTime = 12,
): Array<{ time: number; label: string; variant: 'critical' | 'info'; autoPause: boolean }> {
  const inclined = (params.conveyorMode ?? 0) === 1
  const frame = getConveyorFrame(
    {
      vBelt: params.vBelt ?? 0,
      v0: params.v0 ?? 0,
      mu: params.mu ?? 0.2,
      L: params.L ?? 6,
      mode: inclined ? 'inclined' : 'horizontal',
      thetaRad: THETA_DEFAULT,
      // 漏传会让临界点按「放底端」算，而画面按「放顶端」演，两者对不上
      x0Ratio: params.x0Ratio ?? 0,
    },
    maxTime,
    MASS_DEFAULT,
  )

  const events: Array<{ time: number; label: string; variant: 'critical' | 'info'; autoPause: boolean }> = []
  /*
   * 取整方向必须与「要学生看哪一侧」一致 —— 这里踩过坑：
   *
   * tSync 是解析解（本参数下 1.5306s），用 toFixed(2) 会舍到 1.53，落在相变**之前**
   * 0.0006s。深链 ?critical=first 定格到 1.53 时 phase 仍是 sliding、摩擦力仍是
   * -1.96N，而相对速度已显示为 0.00 —— 画面变成「相对速度是 0、摩擦还没变、阶段
   * 还写着相对滑动」，而这一帧的文案说的是「共速：摩擦突变」。差 0.0007s 的取整
   * 让整个错因标杆失去意义。
   *
   * 所以：**相变点向右对齐**，保证定格落在事件发生后的第一帧；
   *       离场点向左对齐，保证定格时物体还在观察窗口内。
   * 两条规则已收敛到 utils/criticalTime 的 alignCriticalTime，与其它动画同一份实现。
   * 两者都对齐到进度条刻度 0.01，与滑块的 step 一致，学生手动拖也能命中。
   */
  /** 对齐后越界（≤0 或超出观察窗口）就丢弃该标记 —— 宁可没有，也不给一个无意义时刻 */
  const inWindow = (t: number) => t > 0 && t <= maxTime

  if (frame.tSync != null) {
    const t = alignCriticalTime(frame.tSync, 'after')
    if (frame.tSync > 0 && inWindow(t)) {
      events.push({
        time: t,
        // 共速瞬间是「漏判摩擦力突变」的核心考点，必须作为可定格的临界点
        label: inclined ? '⚡ 共速：摩擦反向' : '⚡ 共速：摩擦突变',
        variant: 'critical',
        autoPause: true,
      })
    }
  }
  if (frame.tExit != null) {
    const t = alignCriticalTime(frame.tExit, 'before')
    if (inWindow(t)) {
      events.push({
        time: t,
        label: inclined ? '🎯 滑离斜面' : '🎯 离开传送带',
        variant: 'info',
        autoPause: false,
      })
    }
  }
  return events.sort((a, b) => a.time - b.time)
}

/**
 * 传送带模型进度条过程阶段分段（复用 getConveyorFrame 单一真源）。
 */
export function getConveyorTimeStages(
  params: Record<string, number>,
  maxTime = 12,
): TimeStageSegment[] {
  const inclined = (params.conveyorMode ?? 0) === 1
  const conveyorParam: ConveyorParam = {
    vBelt: params.vBelt ?? 0,
    v0: params.v0 ?? 0,
    mu: params.mu ?? 0.2,
    L: params.L ?? 6,
    mode: inclined ? 'inclined' : 'horizontal',
    thetaRad: THETA_DEFAULT,
    x0Ratio: params.x0Ratio ?? 0,
  }
  const frame = getConveyorFrame(conveyorParam, maxTime, MASS_DEFAULT)
  const canKeepSync = canConveyorKeepSynchronous(conveyorParam)
  const tSync = frame.tSync != null && frame.tSync > 0 ? Math.min(maxTime, frame.tSync) : null
  const tExit = frame.tExit != null && frame.tExit > 0 ? Math.min(maxTime, frame.tExit) : null

  const stages: TimeStageSegment[] = []
  const tPhase1End = Math.min(tSync ?? maxTime, tExit ?? maxTime)
  if (tPhase1End > 1e-4) {
    stages.push({ from: 0, to: tPhase1End, label: '相对滑动变速', variant: 'primary' })
  }

  if (tSync != null && tSync < (tExit ?? maxTime) - 1e-4) {
    const tPhase2End = tExit ?? maxTime
    if (canKeepSync) {
      stages.push({ from: tSync, to: tPhase2End, label: '共速随带匀速', variant: 'secondary' })
    } else {
      stages.push({ from: tSync, to: tPhase2End, label: '共速后继续滑动', variant: 'accent' })
    }
  }

  if (tExit != null && tExit < maxTime - 1e-4) {
    stages.push({ from: tExit, to: maxTime, label: '滑离传送带', variant: 'neutral' })
  }
  return stages
}

/**
 * 计算传送带模型在给定时刻的状态。
 *
 * @param param 传送带参数，单位见 ConveyorParam
 * @param t 时间，单位：s
 * @param mass 物块质量，单位：kg，默认 1 kg
 * @returns 指定时刻的运动、摩擦、生热与阶段状态
 */
export function getConveyorFrame(
  param: ConveyorParam,
  t: number,
  mass = MASS_DEFAULT,
): ConveyorFrameState {
  const g = param.g ?? GRAVITY
  const theta = param.mode === 'horizontal' ? 0 : (param.thetaRad ?? THETA_DEFAULT)
  const normalForce = mass * g * Math.cos(theta)
  const kineticFrictionAbs = param.mu * normalForce
  const gravityTangential = -g * Math.sin(theta)
  const staticFrictionNeeded = mass * g * Math.sin(theta)
  const canStaticSync = canConveyorKeepSynchronous(param)

  let elapsed = 0
  /*
   * 位置基准 xObj：沿传送带从**低端**算起的距离，取值 [0, L]。
   * （场景几何左低右高：`rightY = leftY - tanθ·beltLengthPx`，所以 x=0 是低端。）
   *
   * 初始位置由 x0Ratio 给出，缺省 0 = 放底端，与既有全部用例一致。
   * 这里曾经一律硬写 0 且没有任何办法表达「放顶端」，导致倾斜带的下滑类题型
   * 一放上去就滑出底端 —— 实测物块全程钉在 x=0.00、速度 −0.00、阶段恒为
   * 「左端离开」，三个倾斜带预设演示的都是静止画面，ΔEp 也恒为 0。
   *
   * 水平带不受此参数影响：水平带只有「从左端放上」一种放法，参数在水平模式下
   * 无定义，注册表也用 showIf 把它藏起来。这里按模式取 0 而不是信任传入值，
   * 是为了让深链 `?params={"conveyorMode":0,"x0Ratio":1}` 这类脏数据不会把
   * 物块直接摆到右端、第一帧就判成「右端离开」。
   */
  const initialX = param.mode === 'horizontal' ? 0 : clamp(param.x0Ratio ?? 0, 0, 1) * param.L

  let xObj = initialX
  let vObj = param.v0
  let aObj = 0
  let friction = 0
  let phase: ConveyorPhase = 'sliding'
  let relativeDistanceAbs = 0
  let heat = 0
  /*
   * 划痕包络的初值必须等于 **起点的相对位置**，不能一律取 0。
   * 放底端时与旧行为完全一致；放顶端（x0Ratio=1）时若仍写 0，
   * `scratchLength = max - min` 会从第一帧起就等于整条带长 L，
   * 物块尚未滑动就画出满带划痕。
   */
  let minRelDisp = initialX
  let maxRelDisp = initialX
  let hasSynced = Math.abs(param.v0 - param.vBelt) < EPS_RELATIVE_V
  let tSync: number | null = hasSynced ? 0 : null
  let tExit: number | null = null

  if (hasSynced && canStaticSync) {
    phase = param.mode === 'horizontal' ? 'synchronous' : 'staticOnIncline'
    vObj = param.vBelt
    aObj = 0
    friction = param.mode === 'horizontal' ? 0 : staticFrictionNeeded
  }

  while (elapsed < t - EPS_TIME && tExit == null) {
    const dt = Math.min(SIM_DT, t - elapsed)

    if (phase === 'synchronous' || phase === 'staticOnIncline') {
      aObj = 0
      vObj = param.vBelt
      friction = phase === 'synchronous' ? 0 : staticFrictionNeeded
      xObj += vObj * dt
      elapsed += dt
    } else {
      const relBefore = vObj - param.vBelt
      const fallbackSign = gravityTangential <= 0 ? -1 : 1
      const relSign = Math.abs(relBefore) < EPS_RELATIVE_V
        ? fallbackSign
        : signNonZero(relBefore, fallbackSign)
      friction = -kineticFrictionAbs * relSign
      aObj = friction / mass + gravityTangential

      const vNext = vObj + aObj * dt
      const relNext = vNext - param.vBelt
      const crossesSync = relBefore !== 0 && relBefore * relNext <= 0

      if (crossesSync) {
        const dtSync = clamp(Math.abs(relBefore / aObj), 0, dt)
        xObj += vObj * dtSync + 0.5 * aObj * dtSync * dtSync
        relativeDistanceAbs += Math.abs(relBefore) * dtSync / 2
        heat += kineticFrictionAbs * Math.abs(relBefore) * dtSync / 2
        elapsed += dtSync
        vObj = param.vBelt
        hasSynced = true
        tSync = tSync ?? elapsed

        const xRelSync = xObj - param.vBelt * elapsed
        if (xRelSync < minRelDisp) minRelDisp = xRelSync
        if (xRelSync > maxRelDisp) maxRelDisp = xRelSync

        const remaining = dt - dtSync
        if (canStaticSync) {
          phase = param.mode === 'horizontal' ? 'synchronous' : 'staticOnIncline'
          aObj = 0
          friction = phase === 'synchronous' ? 0 : staticFrictionNeeded
          xObj += param.vBelt * remaining
          elapsed += remaining
        } else {
          phase = 'sliding'
        }
      } else {
        xObj += vObj * dt + 0.5 * aObj * dt * dt
        relativeDistanceAbs += (Math.abs(relBefore) + Math.abs(relNext)) * dt / 2
        heat += kineticFrictionAbs * (Math.abs(relBefore) + Math.abs(relNext)) * dt / 2
        vObj = vNext
        elapsed += dt
      }
    }

    const xRel = xObj - param.vBelt * elapsed
    if (xRel < minRelDisp) minRelDisp = xRel
    if (xRel > maxRelDisp) maxRelDisp = xRel

    /*
     * 离开判据必须带上运动方向，否则「初始就在端点」会被误判为「已经离开」：
     * 倾斜带起点 xObj = L，若只看 `xObj >= L`，第 0 帧就判成从右端离开。
     * 现在只有**还在朝该端运动**才算出界。
     */
    if (xObj <= 0 && elapsed > EPS_TIME && vObj < 0) {
      xObj = 0
      phase = 'exitLeft'
      friction = 0
      aObj = 0
      tExit = elapsed
    } else if (xObj >= param.L && elapsed > EPS_TIME && vObj > 0) {
      xObj = param.L
      phase = 'exitRight'
      friction = 0
      aObj = 0
      tExit = elapsed
    }
  }

  /*
   * 划痕的地面坐标区间 = 皮带位移 + 相对包络。
   * 皮带在 t 时刻把整段划痕带着走了 vBelt·t，所以 [minRel, maxRel] 加上
   * vBelt·t 才是它在场景里的当前落点（推导见 ConveyorFrameState.scratchFrom）。
   */
  const scratchFrom = clamp(param.vBelt * elapsed + minRelDisp, 0, param.L)
  const scratchTo = clamp(param.vBelt * elapsed + maxRelDisp, 0, param.L)

  return {
    xObj: clamp(xObj, 0, param.L),
    vObj,
    aObj,
    friction,
    normalForce,
    relativeVelocity: vObj - param.vBelt,
    relativeDistanceAbs,
    scratchLength: maxRelDisp - minRelDisp,
    scratchFrom,
    scratchTo,
    heat,
    phase,
    hasSynced,
    tSync,
    tExit,
  }
}
