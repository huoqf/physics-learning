import { useMemo } from 'react'

import { ENERGY_COLORS } from '@/theme/physics'
import {
  dispatchStorageDay,
  electricVehicleSplit,
  fuelVehicleSplit,
  pumpedStorageCycle,
  pvPowerKW,
  loadPowerKW,
  type DispatchSample,
  type PumpedStorageCycle,
  type StorageDispatchResult,
  type VehicleEnergySplit,
} from '@/physics/energyFlow'
import type { EnergyFlowReservoir } from '@/components/Physics/EnergyFlowBars'

/** 一个播放循环的时长 (s)：与底部进度条默认 30 s 一致 */
export const ENERGY_CYCLE_S = 30

/** 有效推进时长 (s)：前 26 s 走完一天/一次循环，最后 4 s 停在终态，
 *  留时间让学生对着账本读数把数字与柱子对上（进度条走完会归零重播）。 */
const RUN_S = 26

/** 单位换算：1 万 m³ = 1e4 m³；1 GJ = 1e9 J */
const WAN_M3 = 1e4
const GJ = 1e9

export interface UseEnergyFlowParams {
  /** 0 光伏储能 | 1 抽水蓄能 | 2 燃油车vs电动车 */
  mode: number
  /** 光伏装机峰值功率 (kW) */
  pvPeakKW: number
  /** 负荷峰值功率 (kW) */
  loadPeakKW: number
  /** 电池可用容量 (kWh) */
  capacityKWh: number
  /** 上库落差 (m) */
  headM: number
  /** 单次循环提升水量 (万 m³) */
  volumeWanM3: number
  /** 燃油车有用效率 (%) */
  fuelEffPct: number
  /** 电动车有用效率 (%) */
  evEffPct: number
  /** 动画累计时间 (s) */
  time: number
}

export interface EnergyChartConfig {
  points: { x: number; y: number }[]
  secondary?: { x: number; y: number }[]
  mainLabel: string
  secondaryLabel?: string
  xLabel: string
  yLabel: string
  title: string
  xDomain?: [number, number]
  yDomain?: [number, number]
  cursorX?: number
}

export interface EnergyFlowView {
  mode: number
  /** 播放进度 0~1（当日时刻或循环相位） */
  progress: number
  /** 当日时刻 (h)，仅模式 0 有效 */
  hour: number
  reservoirs: EnergyFlowReservoir[]
  barsMax: number
  barsTotal: { label: string; value: string }
  chart: EnergyChartConfig
  dispatch: { full: StorageDispatchResult; now: StorageDispatchResult }
  pumped: PumpedStorageCycle & { volumeM3: number }
  vehicles: {
    inputJ: number
    fuel: VehicleEnergySplit
    ev: VehicleEnergySplit
  }
}

/** 充电/放电效率固定为 0.95：这是锂电池储能电站的典型工程值，不开放调节，
 *  免得学生在"效率"上分散注意力——本页要讲的是"错配"与"搬运"。 */
const BATTERY_EFFICIENCY = 0.95

/**
 * 能量守恒与能源 —— 中屏物理计算 Hook。
 *
 * 与右屏看板（`data/quantities/energyConservation.ts`）共用 `@/physics/energyFlow`
 * 的同一批纯函数，因此"图上的柱子 / 看板的数字 / 结论文字"永远同源。
 */
export function useEnergyFlowPhysics({
  mode,
  pvPeakKW,
  loadPeakKW,
  capacityKWh,
  headM,
  volumeWanM3,
  fuelEffPct,
  evEffPct,
  time,
}: UseEnergyFlowParams): EnergyFlowView {
  return useMemo(() => {
    // 进度条走完 30 s 会归零重播：前 26 s 推进，后 4 s 停在终态
    const cycle = time % ENERGY_CYCLE_S
    const phase = Math.min(1, Math.max(0, cycle) / RUN_S)
    const hour = phase * 24

    // ── 模式 0：光伏 + 储能调峰 ──
    const dispatchInput = {
      pvPeakKW,
      loadPeakKW,
      capacityKWh,
      chargeEfficiency: BATTERY_EFFICIENCY,
      dischargeEfficiency: BATTERY_EFFICIENCY,
      initialSOC: 0.2,
    }
    const dispatchFull = dispatchStorageDay(dispatchInput)
    const dispatchNow = dispatchStorageDay({ ...dispatchInput, hours: hour })

    const chartPv = dispatchFull.samples.map((s: DispatchSample) => ({ x: s.t, y: s.pv }))
    const chartLoad = dispatchFull.samples.map((s: DispatchSample) => ({ x: s.t, y: s.load }))

    // ── 模式 1：抽水蓄能 ──
    const volumeM3 = Math.max(0, volumeWanM3) * WAN_M3
    const pumped = {
      ...pumpedStorageCycle({
        volumeM3,
        headM,
        pumpEfficiency: 0.88,
        turbineEfficiency: 0.9,
      }),
      volumeM3,
    }

    // ── 模式 2：燃油车 / 电动车 ──
    // 取 100 MJ 作为共同输入基准：两种车装的是完全不同的能量载体，
    // 只有"输入相同能量、比有用功"才是公平比较，比"每公里成本"更接近热学考点。
    const INPUT_J = 100e6
    const vehicles = {
      inputJ: INPUT_J,
      fuel: fuelVehicleSplit(INPUT_J, fuelEffPct / 100),
      ev: electricVehicleSplit(INPUT_J, evEffPct / 100),
    }

    const reservoirs: EnergyFlowReservoir[] =
      mode === 1
        ? [
            {
              key: 'pump-input',
              label: '抽水耗电',
              value: pumped.pumpInputJ / GJ,
              color: ENERGY_COLORS.work,
              displayValue: `${(pumped.pumpInputJ / GJ).toFixed(2)} GJ`,
              subLabel: '电能输入',
            },
            {
              key: 'potential',
              label: '上库势能',
              value: pumped.potentialJ / GJ,
              color: ENERGY_COLORS.potentialEnergy,
              displayValue: `${(pumped.potentialJ / GJ).toFixed(2)} GJ`,
              subLabel: 'ρVgh',
            },
            {
              key: 'turbine-out',
              label: '发电输出',
              value: pumped.turbineOutputJ / GJ,
              color: ENERGY_COLORS.kineticEnergy,
              displayValue: `${(pumped.turbineOutputJ / GJ).toFixed(2)} GJ`,
              subLabel: '回到电网',
            },
            {
              key: 'pump-loss',
              label: '往返损耗',
              value: pumped.lossJ / GJ,
              color: ENERGY_COLORS.heatLoss,
              displayValue: `${(pumped.lossJ / GJ).toFixed(2)} GJ`,
              subLabel: '摩擦与涡流',
              isLoss: true,
            },
          ]
        : mode === 2
          ? [
              {
                key: 'fuel-useful',
                label: '燃油有用功',
                value: vehicles.fuel.usefulJ / 1e6,
                color: ENERGY_COLORS.mechanicalEnergy,
                displayValue: `${(vehicles.fuel.usefulJ / 1e6).toFixed(0)} MJ`,
                subLabel: `${(vehicles.fuel.usefulShare * 100).toFixed(0)}%`,
              },
              {
                key: 'fuel-loss',
                label: '燃油废热',
                value: (vehicles.inputJ - vehicles.fuel.usefulJ) / 1e6,
                color: ENERGY_COLORS.heatLoss,
                displayValue: `${((vehicles.inputJ - vehicles.fuel.usefulJ) / 1e6).toFixed(0)} MJ`,
                subLabel: `${((1 - vehicles.fuel.usefulShare) * 100).toFixed(0)}%`,
                isLoss: true,
              },
              {
                key: 'ev-useful',
                label: '电动有用功',
                value: vehicles.ev.usefulJ / 1e6,
                color: ENERGY_COLORS.mechanicalEnergy,
                displayValue: `${(vehicles.ev.usefulJ / 1e6).toFixed(0)} MJ`,
                subLabel: `${(vehicles.ev.usefulShare * 100).toFixed(0)}%`,
              },
              {
                key: 'ev-loss',
                label: '电动损耗',
                value: (vehicles.inputJ - vehicles.ev.usefulJ) / 1e6,
                color: ENERGY_COLORS.heatLoss,
                displayValue: `${((vehicles.inputJ - vehicles.ev.usefulJ) / 1e6).toFixed(0)} MJ`,
                subLabel: `${((1 - vehicles.ev.usefulShare) * 100).toFixed(0)}%`,
                isLoss: true,
              },
            ]
          : [
              {
                key: 'pv',
                label: '光伏发电',
                value: dispatchNow.pvEnergyKWh,
                color: ENERGY_COLORS.power,
                displayValue: `${dispatchNow.pvEnergyKWh.toFixed(0)} kWh`,
                subLabel: '日照时段',
              },
              {
                key: 'grid-in',
                label: '电网补电',
                value: dispatchNow.gridImportKWh,
                color: ENERGY_COLORS.work,
                displayValue: `${dispatchNow.gridImportKWh.toFixed(0)} kWh`,
                subLabel: '储能不足',
              },
              {
                key: 'load',
                label: '负荷用电',
                value: dispatchNow.loadEnergyKWh,
                color: ENERGY_COLORS.kineticEnergy,
                displayValue: `${dispatchNow.loadEnergyKWh.toFixed(0)} kWh`,
                subLabel: '全天需求',
              },
              {
                key: 'curtail',
                label: '弃光',
                value: dispatchNow.curtailKWh,
                color: ENERGY_COLORS.heatLoss,
                displayValue: `${dispatchNow.curtailKWh.toFixed(0)} kWh`,
                subLabel: '无处可存',
                isLoss: true,
              },
              {
                key: 'loss',
                label: '充放损耗',
                value: dispatchNow.lossKWh,
                color: ENERGY_COLORS.heatLoss,
                displayValue: `${dispatchNow.lossKWh.toFixed(0)} kWh`,
                subLabel: '往返 90%',
                isLoss: true,
              },
            ]

    // 能量条共用一把尺：取整日口径的最大值，柱子才在播放中稳定地"长高"而不是被反复重标定
    const barsMax =
      mode === 1
        ? Math.max(1e-9, pumped.pumpInputJ / GJ)
        : mode === 2
          ? vehicles.inputJ / 1e6
          : Math.max(
              1e-9,
              dispatchFull.pvEnergyKWh,
              dispatchFull.loadEnergyKWh,
              dispatchFull.gridImportKWh,
            )

    const barsTotal =
      mode === 1
        ? { label: '往返效率', value: `${(pumped.roundTripEfficiency * 100).toFixed(1)}%` }
        : mode === 2
          ? { label: '共同输入', value: `${vehicles.inputJ / 1e6} MJ` }
          : { label: '自给率', value: `${(dispatchNow.selfSufficiency * 100).toFixed(0)}%` }

    const chart: EnergyChartConfig =
      mode === 1
        ? {
            points: [0, 0.25, 0.5, 0.75, 1].map((k) => ({
              x: (volumeM3 / WAN_M3) * k,
              y: (pumped.potentialJ / GJ) * k,
            })),
            mainLabel: 'Eₚ = ρVgh',
            xLabel: '提升水量 V / 万m³',
            yLabel: '上库势能 Eₚ / GJ',
            title: '上库势能与提升水量成正比（斜率 = ρgh）',
            xDomain: [0, Math.max(0.1, (volumeM3 / WAN_M3) * 1.15)],
            yDomain: [0, Math.max(0.1, (pumped.potentialJ / GJ) * 1.15)],
          }
        : mode === 2
          ? {
              points: [0, 25, 50, 75, 100].map((k) => ({
                x: k,
                y: (k * fuelEffPct) / 100,
              })),
              secondary: [0, 25, 50, 75, 100].map((k) => ({
                x: k,
                y: (k * evEffPct) / 100,
              })),
              mainLabel: '燃油车',
              secondaryLabel: '电动车',
              xLabel: '输入能量 E / MJ',
              yLabel: '有用机械能 / MJ',
              title: '同样输入能量下两种车的有用功（斜率即效率）',
              xDomain: [0, 100],
              yDomain: [0, 100],
            }
          : {
              points: chartPv,
              secondary: chartLoad,
              mainLabel: '光伏出力',
              secondaryLabel: '负荷',
              xLabel: '时刻 t / h',
              yLabel: '功率 P / kW',
              title: '光伏正午发、负荷晚间用：错配就是储能存在的理由',
              xDomain: [0, 24],
              yDomain: [0, Math.max(1, pvPeakKW, loadPeakKW) * 1.15],
              cursorX: hour,
            }

    return {
      mode,
      progress: phase,
      hour,
      reservoirs,
      barsMax,
      barsTotal,
      chart,
      dispatch: { full: dispatchFull, now: dispatchNow },
      pumped,
      vehicles,
    }
  }, [mode, pvPeakKW, loadPeakKW, capacityKWh, headM, volumeWanM3, fuelEffPct, evEffPct, time])
}

/** 供给场景的文字读数：把"当前时刻"的功率搬出来，避免场景里再算一遍物理 */
export function currentPowerKW(hour: number, pvPeakKW: number, loadPeakKW: number) {
  return { pv: pvPowerKW(hour, pvPeakKW), load: loadPowerKW(hour, loadPeakKW) }
}
