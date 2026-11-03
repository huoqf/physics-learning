import { describe, expect, it } from 'vitest'

import { GRAVITY } from '@/physics/constants'
import {
  DISPATCH_STEP_H,
  PV_DAY_END_H,
  PV_DAY_START_H,
  WATER_DENSITY,
  dispatchStorageDay,
  electricVehicleSplit,
  fuelVehicleSplit,
  hydraulicEnergyJ,
  loadPowerKW,
  pumpInputEnergyJ,
  pumpedStorageCycle,
  pvPowerKW,
  splitVehicleEnergy,
  turbineOutputEnergyJ,
} from '@/physics/energyFlow'

// ─── ① 光伏 + 储能调峰 ──────────────────────────────────────────────────────

describe('pvPowerKW / loadPowerKW', () => {
  it('日出前与日落后出力为 0，正午取到峰值', () => {
    expect(pvPowerKW(PV_DAY_START_H, 100)).toBe(0)
    expect(pvPowerKW(PV_DAY_END_H, 100)).toBe(0)
    expect(pvPowerKW(0, 100)).toBe(0)
    expect(pvPowerKW(12, 100)).toBeCloseTo(100, 10)
  })

  it('日落前后对称：09:00 与 15:00 出力相等', () => {
    expect(pvPowerKW(9, 80)).toBeCloseTo(pvPowerKW(15, 80), 10)
    expect(pvPowerKW(9, 80)).toBeGreaterThan(0)
  })

  it('负荷双峰：09:30 与 20:00 是两个高点，且 20:00 不低于 09:30', () => {
    const morning = loadPowerKW(9.5, 100)
    const evening = loadPowerKW(20, 100)
    const noon = loadPowerKW(12, 100)
    expect(evening).toBeGreaterThan(morning)
    expect(morning).toBeGreaterThan(noon)
    // 峰值归一到 1：晚高峰应贴近装机峰值
    expect(evening).toBeCloseTo(100, 6)
  })
})

describe('dispatchStorageDay 能量账本', () => {
  const base = {
    pvPeakKW: 200,
    loadPeakKW: 90,
    capacityKWh: 400,
    chargeEfficiency: 0.95,
    dischargeEfficiency: 0.95,
    initialSOC: 0.2,
  }

  it('账本闭合：光伏 + 电网补电 = 负荷 + 弃光 + 损耗 + 电池净增', () => {
    const r = dispatchStorageDay(base)
    const left = r.pvEnergyKWh + r.gridImportKWh
    const right = r.loadEnergyKWh + r.curtailKWh + r.lossKWh + r.batteryDeltaKWh
    expect(left).toBeCloseTo(right, 6)
  })

  it('往返效率 = η_ch × η_dis', () => {
    const r = dispatchStorageDay(base)
    expect(r.roundTripEfficiency).toBeCloseTo(0.95 * 0.95, 12)
  })

  it('储能确实被用起来：白天充电、傍晚放电，荷电比例全天在 0~1 之间', () => {
    const r = dispatchStorageDay(base)
    // 充电 = 电池功率为负（吸收富余光伏），放电 = 为正
    expect(r.samples.some((s) => s.battery < -1)).toBe(true)
    expect(r.samples.some((s) => s.battery > 1)).toBe(true)
    for (const s of r.samples) {
      expect(s.soc).toBeGreaterThanOrEqual(-1e-9)
      expect(s.soc).toBeLessThanOrEqual(1 + 1e-9)
    }
    expect(r.selfSufficiency).toBeGreaterThan(0)
    expect(r.selfSufficiency).toBeLessThanOrEqual(1)
  })

  it('电池容量趋近于 0 时，富余光伏只能弃掉，自给率随之下降', () => {
    const tiny = dispatchStorageDay({ ...base, capacityKWh: 0.5 })
    const big = dispatchStorageDay(base)
    expect(tiny.curtailKWh).toBeGreaterThan(big.curtailKWh)
    expect(tiny.selfSufficiency).toBeLessThan(big.selfSufficiency)
  })

  it('容量足够大时不再弃光，且电池净增电量为正', () => {
    const r = dispatchStorageDay({ ...base, capacityKWh: 2000, initialSOC: 0 })
    expect(r.curtailKWh).toBeCloseTo(0, 6)
  })

  it('效率越低损耗越大，账本仍闭合', () => {
    const lossy = dispatchStorageDay({ ...base, chargeEfficiency: 0.8, dischargeEfficiency: 0.8 })
    const good = dispatchStorageDay(base)
    expect(lossy.lossKWh).toBeGreaterThan(good.lossKWh)
    expect(lossy.pvEnergyKWh + lossy.gridImportKWh).toBeCloseTo(
      lossy.loadEnergyKWh + lossy.curtailKWh + lossy.lossKWh + lossy.batteryDeltaKWh,
      6,
    )
  })

  it('曲线采样点覆盖全日，时刻单调递增', () => {
    const r = dispatchStorageDay(base)
    expect(r.samples.length).toBeGreaterThan(90)
    expect(r.samples[0].t).toBe(0)
    for (let i = 1; i < r.samples.length; i++) {
      expect(r.samples[i].t).toBeGreaterThan(r.samples[i - 1].t)
    }
    expect(r.samples[r.samples.length - 1].t).toBeCloseTo(24, 6)
  })

  it('步长与采样密度自洽：一日步数 = 24 / STEP，曲线每 0.25 h 一点', () => {
    const r = dispatchStorageDay(base)
    expect(Math.round(24 / DISPATCH_STEP_H)).toBeGreaterThan(500)
    // 采样间隔 0.25 h、步长 0.025 h → 每 10 步一点，24 h 得 96 个点 + 末点
    expect(Math.round(24 / DISPATCH_STEP_H) % Math.round(4 * DISPATCH_STEP_H * 10)).toBe(0)
    expect(r.samples.length).toBe(97)
  })
})

// ─── ② 抽水蓄能 ────────────────────────────────────────────────────────────

describe('抽水蓄能能量换算', () => {
  it('E = ρVgh：1 万立方米提升 100 m 约为 9.8 GJ（= 9800 MJ）', () => {
    const E = hydraulicEnergyJ(10_000, 100)
    expect(E).toBeCloseTo(WATER_DENSITY * 10_000 * GRAVITY * 100, 3)
    // 1e7 kg × 9.8 m/s² × 100 m = 9.8e9 J
    expect(E / 1e9).toBeCloseTo(9.8, 6)
  })

  it('抽水耗电 = 势能 / η，发电输出 = 势能 × η（方向不能弄反）', () => {
    const V = 5_000
    const h = 120
    const E = hydraulicEnergyJ(V, h)
    expect(pumpInputEnergyJ(V, h, 0.8)).toBeCloseTo(E / 0.8, 3)
    expect(turbineOutputEnergyJ(V, h, 0.8)).toBeCloseTo(E * 0.8, 3)
    // 效率 < 1 时，耗电必大于输出（"用 4 度电发回不到 4 度"）
    expect(pumpInputEnergyJ(V, h, 0.8)).toBeGreaterThan(turbineOutputEnergyJ(V, h, 0.8))
  })

  it('往返效率 = η_pump × η_turbine，净损耗 = 耗电 − 发电', () => {
    const cycle = pumpedStorageCycle({
      volumeM3: 8_000,
      headM: 150,
      pumpEfficiency: 0.85,
      turbineEfficiency: 0.9,
    })
    expect(cycle.roundTripEfficiency).toBeCloseTo(0.85 * 0.9, 12)
    expect(cycle.lossJ).toBeCloseTo(cycle.pumpInputJ - cycle.turbineOutputJ, 3)
    expect(cycle.turbineOutputJ / cycle.pumpInputJ).toBeCloseTo(cycle.roundTripEfficiency, 12)
    expect(cycle.lossJ).toBeGreaterThan(0)
  })
})

// ─── ③ 车辆能量流 ──────────────────────────────────────────────────────────

describe('车辆能量流分配', () => {
  it('燃油车：有用 + 各支损失 = 输入能量（一份不丢）', () => {
    const input = 1_000_000
    const split = fuelVehicleSplit(input, 0.3)
    expect(split.usefulJ).toBeCloseTo(300_000, 6)
    const lossSum = split.lossBranches.reduce((s, b) => s + b.share, 0)
    expect(lossSum + split.usefulShare).toBeCloseTo(1, 12)
    // 三支损失的示意比例为 45% / 30% / 25%
    expect(split.lossBranches.map((b) => b.key)).toEqual(['exhaust', 'cooling', 'friction'])
    expect(split.lossBranches[0].share).toBeCloseTo(0.7 * 0.45, 12)
  })

  it('电动车：同一输入下有用功占比更高', () => {
    const input = 1_000_000
    const fuel = fuelVehicleSplit(input, 0.3)
    const ev = electricVehicleSplit(input, 0.85)
    expect(ev.usefulJ).toBeGreaterThan(fuel.usefulJ)
    expect(ev.lossBranches.reduce((s, b) => s + b.share, 0) + ev.usefulShare).toBeCloseTo(1, 12)
  })

  it('效率越界时被钳制在 0~1，不会出现负损失', () => {
    const low = splitVehicleEnergy(100, -0.3, [{ key: 'x', label: 'x', share: 1 }])
    const high = splitVehicleEnergy(100, 1.6, [{ key: 'x', label: 'x', share: 1 }])
    expect(low.usefulJ).toBe(0)
    expect(low.lossBranches[0].share).toBeCloseTo(1, 12)
    expect(high.usefulJ).toBeCloseTo(100, 12)
    expect(high.lossBranches[0].share).toBeCloseTo(0, 12)
  })
})
