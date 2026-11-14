/**
 * 能量守恒定律与能源 —— 物理层（纯函数，无 React / 无颜色）。
 *
 * 三个情境共用一本「能量账本」：每一焦耳都必须落到
 * `输入 = 有用输出 + 损失 + 储存增量` 的某一项上，账本闭合是单测的硬约束。
 *
 * 单位约定（故意混用，各自贴合工程习惯，禁止在展示层再换算）：
 *   · 光伏电站 —— 功率 kW、电量 kWh、时刻 h
 *   · 抽水蓄能 —— 能量 J（与 E = ρVgh 同源）、库容 m³、落差 m
 *   · 车辆     —— 一律按「每 100 单位输入能量」的百分比分配，避免编造具体油箱容量
 */

import { GRAVITY } from './constants'
import { finalizeCriticalPoints, type RawCriticalPoint } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

// ─── ① 光伏 + 电化学储能调峰 ────────────────────────────────────────────────

/** 光伏有效日照起止时刻 (h)：06:00 日出、18:00 日落 */
export const PV_DAY_START_H = 6
export const PV_DAY_END_H = 18

/** 一日调度积分步长 (h)：0.025 h = 90 s，960 步足以让账本闭合到 1e-9 量级 */
export const DISPATCH_STEP_H = 0.025

/** 曲线采样间隔 (h)：0.25 h 一个点，一日 97 个点 */
export const DISPATCH_SAMPLE_H = 0.25
const SAMPLE_EVERY = Math.round(DISPATCH_SAMPLE_H / DISPATCH_STEP_H)

/** 光伏出力 (kW)：日照时段内按 sin 半波，正午最大 */
export function pvPowerKW(tHour: number, peakKW: number): number {
  if (peakKW <= 0) return 0
  if (tHour <= PV_DAY_START_H || tHour >= PV_DAY_END_H) return 0
  const phase = (tHour - PV_DAY_START_H) / (PV_DAY_END_H - PV_DAY_START_H)
  return peakKW * Math.sin(Math.PI * phase)
}

/**
 * 用电负荷形状（无量纲，峰值归一到 1）：
 * 早高峰 09:30、晚高峰 20:00 双峰叠加一条 0.5 的基线负荷。
 * 取双峰而不是恒定负荷，是因为"光伏正午发电、负荷晚高峰"这个错配，
 * 正是储能存在的理由——负荷画成平的，储能就失去了教学意义。
 */
export function loadShape(tHour: number): number {
  const gauss = (mu: number, sigma: number) => Math.exp(-((tHour - mu) ** 2) / (2 * sigma * sigma))
  return 0.5 + 0.5 * gauss(9.5, 1.6) + 0.55 * gauss(20, 1.5)
}

/** 归一化因子：让 loadShape 的最大值恰好为 1（在 t=20 附近取到） */
export const LOAD_SHAPE_PEAK = Math.max(
  ...Array.from({ length: 2401 }, (_, i) => loadShape(i / 100)),
)

/** 用电负荷 (kW) */
export function loadPowerKW(tHour: number, peakKW: number): number {
  if (peakKW <= 0) return 0
  return (peakKW * loadShape(tHour)) / LOAD_SHAPE_PEAK
}

export interface StorageDispatchInput {
  /** 光伏装机峰值功率 (kW) */
  pvPeakKW: number
  /** 负荷峰值功率 (kW) */
  loadPeakKW: number
  /** 电池可用容量 (kWh) */
  capacityKWh: number
  /** 充电效率 0~1 */
  chargeEfficiency: number
  /** 放电效率 0~1 */
  dischargeEfficiency: number
  /** 初始荷电比例 0~1 */
  initialSOC: number
  /**
   * 统计时长 (h)，默认 24。
   *
   * 用于播放中的「截至当前时刻」读数：动画游标走到 10:00 时，能量条应显示
   * 到 10:00 为止的累计量，而不是把整天的结果一次性亮出来。
   */
  hours?: number
}

export interface DispatchSample {
  /** 时刻 (h) */
  t: number
  /** 光伏出力 (kW) */
  pv: number
  /** 负荷 (kW) */
  load: number
  /** 电池出力 (kW)：正=放电供负荷，负=充电吸收 */
  battery: number
  /** 电网补电功率 (kW) */
  gridImport: number
  /** 荷电比例 0~1 */
  soc: number
}

export interface StorageDispatchResult {
  /** 光伏总发电量 (kWh) */
  pvEnergyKWh: number
  /** 负荷总需求 (kWh) */
  loadEnergyKWh: number
  /** 电网补电量 (kWh) */
  gridImportKWh: number
  /** 弃光量 (kWh)：电池充满后无处可去的富余光伏 */
  curtailKWh: number
  /** 充放电损耗 (kWh) */
  lossKWh: number
  /** 电池净增电量 (kWh) = 期末 − 期初 */
  batteryDeltaKWh: number
  /** 期末荷电比例 0~1 */
  finalSOC: number
  /** 新能源自给率 = (负荷 − 电网补电) / 负荷 */
  selfSufficiency: number
  /** 电池往返效率 η_ch × η_dis */
  roundTripEfficiency: number
  /** 逐时曲线（每 0.25 h 一个采样点，供图表使用） */
  samples: DispatchSample[]
}

/**
 * 一日调度：光伏优先供负荷 → 富余充电 → 不足放电 → 仍不足由电网补。
 *
 * 账本恒等式（单测逐条断言）：
 *   pvEnergy + gridImport = loadEnergy + curtail + loss + batteryDelta
 */
export function dispatchStorageDay(input: StorageDispatchInput): StorageDispatchResult {
  const { pvPeakKW, loadPeakKW, capacityKWh } = input
  const etaCh = clamp01(input.chargeEfficiency)
  const etaDis = clamp01(input.dischargeEfficiency)
  const cap = Math.max(0, capacityKWh)
  const endHour = Math.max(0, Math.min(24, input.hours ?? 24))

  let stored = clamp01(input.initialSOC) * cap
  const storedStart = stored

  let pvEnergy = 0
  let loadEnergy = 0
  let gridImport = 0
  let curtail = 0
  let loss = 0
  const samples: DispatchSample[] = []

  const steps = Math.round(endHour / DISPATCH_STEP_H)
  for (let i = 0; i < steps; i++) {
    const t = i * DISPATCH_STEP_H
    const pv = pvPowerKW(t, pvPeakKW)
    const load = loadPowerKW(t, loadPeakKW)
    const dt = DISPATCH_STEP_H

    pvEnergy += pv * dt
    loadEnergy += load * dt

    let batteryPower = 0 // 正=放电，负=充电
    let grid = 0

    const surplus = pv - load
    if (surplus > 1e-12) {
      // 富余：先充电（受容量与效率约束），充不下的弃光
      const room = cap - stored
      const maxInput = room / Math.max(etaCh, 1e-9) // 能把电池充满的输入电量
      const chargeInput = Math.min(surplus * dt, maxInput)
      stored += chargeInput * etaCh
      loss += chargeInput * (1 - etaCh)
      curtail += surplus * dt - chargeInput
      batteryPower = -(chargeInput / dt)
    } else if (surplus < -1e-12) {
      // 缺口：先放电（受存量与效率约束），放不够的由电网补
      const deficit = -surplus
      const maxOutput = stored * etaDis
      const dischargeOut = Math.min(deficit * dt, maxOutput)
      const storedDraw = dischargeOut / Math.max(etaDis, 1e-9)
      stored -= storedDraw
      loss += storedDraw - dischargeOut
      grid = deficit - dischargeOut / dt
      batteryPower = dischargeOut / dt
    }

    gridImport += grid * dt

    // 每 SAMPLE_EVERY 步采一个点（另加末点），供图表画 P-t 曲线。
    // 用步数取模而不是比较 t 的浮点余数：0.02 这类步长除不尽 0.25，
    // 早先按余数判等会静默漏采一半的点。
    if (i % SAMPLE_EVERY === 0) {
      samples.push({
        t,
        pv,
        load,
        battery: batteryPower,
        gridImport: grid,
        soc: cap > 0 ? stored / cap : 0,
      })
    }
  }

  if (cap > 0)
    samples.push({
      t: endHour,
      pv: 0,
      load: loadPowerKW(endHour, loadPeakKW),
      battery: 0,
      gridImport: 0,
      soc: stored / cap,
    })

  return {
    pvEnergyKWh: pvEnergy,
    loadEnergyKWh: loadEnergy,
    gridImportKWh: gridImport,
    curtailKWh: curtail,
    lossKWh: loss,
    batteryDeltaKWh: stored - storedStart,
    finalSOC: cap > 0 ? stored / cap : 0,
    selfSufficiency: loadEnergy > 0 ? (loadEnergy - gridImport) / loadEnergy : 0,
    roundTripEfficiency: etaCh * etaDis,
    samples,
  }
}

// ─── ② 抽水蓄能 ────────────────────────────────────────────────────────────

/** 水的密度 (kg/m³) */
export const WATER_DENSITY = 1000

/** 上库储存的重力势能 E = ρVgh (J) */
export function hydraulicEnergyJ(volumeM3: number, headM: number): number {
  return WATER_DENSITY * Math.max(0, volumeM3) * GRAVITY * Math.max(0, headM)
}

/**
 * 提升该水量所需电能 (J) = 重力势能 / η_pump。
 * η 是「电能 → 水势能」的转换效率，取倒数得到耗电，切勿写成乘 η。
 */
export function pumpInputEnergyJ(volumeM3: number, headM: number, pumpEfficiency: number): number {
  const eta = clamp01(pumpEfficiency)
  if (eta <= 0) return Infinity
  return hydraulicEnergyJ(volumeM3, headM) / eta
}

/** 该水量可发出的电能 (J) = 重力势能 × η_turbine */
export function turbineOutputEnergyJ(volumeM3: number, headM: number, turbineEfficiency: number): number {
  return hydraulicEnergyJ(volumeM3, headM) * clamp01(turbineEfficiency)
}

export interface PumpedStorageCycle {
  /** 上库势能 (J) */
  potentialJ: number
  /** 抽水耗电 (J) */
  pumpInputJ: number
  /** 发电输出 (J) */
  turbineOutputJ: number
  /** 往返效率 η_pump × η_turbine */
  roundTripEfficiency: number
  /** 一次循环净损耗 (J) = 抽水耗电 − 发电输出 */
  lossJ: number
}

/** 一次「抽水—发电」循环的能量账本 */
export function pumpedStorageCycle({
  volumeM3,
  headM,
  pumpEfficiency,
  turbineEfficiency,
}: {
  volumeM3: number
  headM: number
  pumpEfficiency: number
  turbineEfficiency: number
}): PumpedStorageCycle {
  const potentialJ = hydraulicEnergyJ(volumeM3, headM)
  const pumpInputJ = pumpInputEnergyJ(volumeM3, headM, pumpEfficiency)
  const turbineOutputJ = turbineOutputEnergyJ(volumeM3, headM, turbineEfficiency)
  return {
    potentialJ,
    pumpInputJ,
    turbineOutputJ,
    roundTripEfficiency: clamp01(pumpEfficiency) * clamp01(turbineEfficiency),
    lossJ: pumpInputJ - turbineOutputJ,
  }
}

// ─── ③ 燃油车 / 电动车能量流 ────────────────────────────────────────────────

/** 车辆能量流的每一支（用于能量条与流箭头） */
export interface VehicleEnergyBranch {
  key: string
  label: string
  /** 占输入能量的比例 0~1 */
  share: number
}

export interface VehicleEnergySplit {
  /** 有用机械能占比 */
  usefulShare: number
  /** 有用功（按输入能量计，J） */
  usefulJ: number
  /** 损失支（占比之和应等于 1 − usefulShare） */
  lossBranches: VehicleEnergyBranch[]
}

/**
 * 燃油车：化学能 → 发动机 → 传动 → 车轮，其余变成废热。
 *
 * 损失按教材常见的示意比例分配（排气 45% / 冷却 30% / 摩擦与附件 25%），
 * **这是示意分配，不是实测标定**：真实发动机的排温和负荷工况会大幅改变这个比例。
 * 之所以固定分配，是为了让学生看到"同样 100 份能量，燃油车七成以上变成热"。
 */
const FUEL_LOSS_SPLIT: readonly VehicleEnergyBranch[] = [
  { key: 'exhaust', label: '排气废热', share: 0.45 },
  { key: 'cooling', label: '冷却散热', share: 0.3 },
  { key: 'friction', label: '摩擦与附件', share: 0.25 },
]

/** 电动车：电网电能 → 充电 → 电池 → 电机 → 车轮 */
const EV_LOSS_SPLIT: readonly VehicleEnergyBranch[] = [
  { key: 'charging', label: '充电损耗', share: 0.2 },
  { key: 'battery', label: '电池内阻', share: 0.4 },
  { key: 'motor', label: '电机与逆变', share: 0.4 },
]

/** 按给定有用效率与损失分配表，把输入能量切成「有用 + 各支损失」 */
export function splitVehicleEnergy(
  inputJ: number,
  usefulShare: number,
  lossSplit: readonly VehicleEnergyBranch[],
): VehicleEnergySplit {
  const useful = clamp01(usefulShare)
  return {
    usefulShare: useful,
    usefulJ: Math.max(0, inputJ) * useful,
    lossBranches: lossSplit.map((branch) => ({
      ...branch,
      // 损失总额按输入能量计，再按比例拆到各支
      share: branch.share * (1 - useful),
    })),
  }
}

/** 燃油车能量流（输入 = 燃料化学能） */
export function fuelVehicleSplit(inputJ: number, engineEfficiency: number): VehicleEnergySplit {
  return splitVehicleEnergy(inputJ, engineEfficiency, FUEL_LOSS_SPLIT)
}

/** 电动车能量流（输入 = 电网电能） */
export function electricVehicleSplit(inputJ: number, systemEfficiency: number): VehicleEnergySplit {
  return splitVehicleEnergy(inputJ, systemEfficiency, EV_LOSS_SPLIT)
}

// ─── 工具 ──────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.min(1, Math.max(0, v))
}

/** 能量守恒与能源演示时间轴常数 (与 useEnergyFlowPhysics 共享) */
export const ENERGY_FLOW_TIMING = {
  cycleS: 30,
  runS: 26,
  batteryEfficiency: 0.95,
  initialSOC: 0.2,
} as const

export interface EnergyFlowCriticalParams {
  scene?: number
  pv?: number
  load?: number
  cap?: number
}

/**
 * 计算能量守恒定律与能源演示关键时刻（SSOT）
 */
export function getEnergyFlowCriticalTimes(
  params: EnergyFlowCriticalParams = {},
  maxTime: number = ENERGY_FLOW_TIMING.cycleS,
): CriticalTimePoint[] {
  const scene = params.scene ?? 0
  const { runS, batteryEfficiency, initialSOC } = ENERGY_FLOW_TIMING
  const raw: RawCriticalPoint[] = []

  if (scene === 0) {
    const dispatch = dispatchStorageDay({
      pvPeakKW: params.pv ?? 200,
      loadPeakKW: params.load ?? 90,
      capacityKWh: params.cap ?? 400,
      chargeEfficiency: batteryEfficiency,
      dischargeEfficiency: batteryEfficiency,
      initialSOC,
    })

    const hourToTime = (h: number) => (h / 24) * runS

    const firstCharge = dispatch.samples.find((s) => s.battery < -1e-6)
    if (firstCharge) {
      raw.push({
        rawTime: hourToTime(firstCharge.t),
        align: 'after',
        label: '光伏富余·开始储能充电',
        variant: 'info',
      })
    }

    raw.push({
      rawTime: hourToTime(12),
      align: 'nearest',
      label: '正午光伏出力峰值 (12:00)',
      variant: 'critical',
    })

    if (dispatch.curtailKWh > 0.5) {
      const fullSample = dispatch.samples.find(
        (s) => firstCharge && s.t >= firstCharge.t && s.soc >= 0.995,
      )
      if (fullSample) {
        raw.push({
          rawTime: hourToTime(fullSample.t),
          align: 'after',
          label: '电池充满·多余电量弃光',
          variant: 'warning',
        })
      }
    }

    const firstDischarge = dispatch.samples.find(
      (s) => (!firstCharge || s.t > firstCharge.t) && s.battery > 1e-6,
    )
    if (firstDischarge) {
      raw.push({
        rawTime: hourToTime(firstDischarge.t),
        align: 'after',
        label: '晚峰来袭·储能转入放电',
        variant: 'warning',
      })
    }

    raw.push({
      rawTime: runS,
      align: 'nearest',
      label: '一日调度统计定格 (24:00)',
      variant: 'info',
      autoPause: false,
    })
  } else {
    raw.push({
      rawTime: runS / 2,
      align: 'nearest',
      label: scene === 1 ? '抽水储能蓄水过半' : '能量输入过半 (50 MJ)',
      variant: 'info',
    })
    raw.push({
      rawTime: runS,
      align: 'nearest',
      label: scene === 1 ? '完成一次往返循环账本' : '100 MJ 效率对比完成',
      variant: 'warning',
      autoPause: false,
    })
  }

  return finalizeCriticalPoints(raw, maxTime)
}
