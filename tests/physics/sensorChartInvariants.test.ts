import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSensorPhysics } from '@/features/electromagnetism/sensors/hooks/useSensorPhysics'
import type { SensorPhysicsParams } from '@/features/electromagnetism/sensors/hooks/useSensorPhysics'

/**
 * 传感器特性曲线不变量守卫。
 *
 * 锁定三类历史缺陷（均在渲染层才会暴露，普通单测抓不到）：
 * 1. **量纲错配**：霍尔分支曾用 mV 数据配 V 量纲坐标域（数据 0~1000 vs yDomain [0, 1.2]），
 *    曲线整条飞出绘图区，右侧特性曲线图零信息量。
 * 2. **采样丢终点**：`for (b += 0.05)` 之类浮点累加步长使曲线停在 1.95 T，
 *    游标读数 1950 mV 与右屏 2000 mV 不一致。
 * 3. **坐标域未覆盖极值**：NTC 低温阻值 28.8 kΩ 曾超出 yDomain [0, 25] kΩ 被裁切。
 */

/** 每个传感器类型覆盖滑块量程端点与中段，避免"只测默认参数"漏掉边界 */
const PARAM_SETS: SensorPhysicsParams[] = [
  { sensorType: 0, illuminance: 10, rFixed: 1000 },
  { sensorType: 0, illuminance: 100, rFixed: 5000 },
  { sensorType: 0, illuminance: 600, rFixed: 20000 },
  { sensorType: 1, temperature: 0, rFixed: 1000 },
  { sensorType: 1, temperature: 25, rFixed: 5000 },
  { sensorType: 1, temperature: 90, rFixed: 20000 },
  { sensorType: 2, magneticB: 0.1, currentI: 0.2, carrierType: 0 },
  { sensorType: 2, magneticB: 1.0, currentI: 0.8, carrierType: 0 },
  { sensorType: 2, magneticB: 2.0, currentI: 2.0, carrierType: 1 },
  { sensorType: 3, capacitorGap: 1.0 },
  { sensorType: 3, capacitorGap: 3.0 },
  { sensorType: 3, capacitorGap: 10.0 },
]

const describeParams = (p: SensorPhysicsParams) =>
  `sensorType=${p.sensorType} ${JSON.stringify({ ...p, sensorType: undefined })}`

describe('sensor chart domain and threshold invariants guard', () => {
  it('阈值线、曲线与工作点必须全部落在 yDomain 内', () => {
    PARAM_SETS.forEach((params) => {
      const { result } = renderHook(() => useSensorPhysics(params))
      const p = result.current
      const [yMin, yMax] = p.yDomain

      if (p.thresholdLineY != null) {
        expect(p.thresholdLineY, `${describeParams(params)} 阈值线出域`).toBeGreaterThanOrEqual(yMin)
        expect(p.thresholdLineY, `${describeParams(params)} 阈值线出域`).toBeLessThanOrEqual(yMax)
      }

      expect(p.curvePoints.length, `${describeParams(params)} 采样点为空`).toBeGreaterThan(0)
      p.curvePoints.forEach((pt) => {
        expect(pt.y, `${describeParams(params)} 曲线点出域`).toBeGreaterThanOrEqual(yMin - 1e-3)
        expect(pt.y, `${describeParams(params)} 曲线点出域`).toBeLessThanOrEqual(yMax + 1e-3)
      })

      expect(p.currentY, `${describeParams(params)} 工作点出域`).toBeGreaterThanOrEqual(yMin - 1e-3)
      expect(p.currentY, `${describeParams(params)} 工作点出域`).toBeLessThanOrEqual(yMax + 1e-3)
    })
  })

  it('采样曲线必须覆盖到 xDomain 两端（防浮点累加丢终点）', () => {
    PARAM_SETS.forEach((params) => {
      const { result } = renderHook(() => useSensorPhysics(params))
      const p = result.current
      const xs = p.curvePoints.map((pt) => pt.x)

      expect(Math.max(...xs), `${describeParams(params)} 曲线未覆盖 xDomain 右端`).toBeCloseTo(
        p.xDomain[1],
        6,
      )
      expect(
        Math.min(...xs),
        `${describeParams(params)} 曲线超出 xDomain 左端`,
      ).toBeGreaterThanOrEqual(p.xDomain[0] - 1e-6)
      // 采样单调递增且无重复点
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i], `${describeParams(params)} 采样 x 非单调递增`).toBeGreaterThan(xs[i - 1])
      }
    })
  })

  it('霍尔分支应随磁感应强度跨越动作门限翻转吸合状态', () => {
    // I = 0.8 A 时临界磁场 B* = 400mV / (500·I) = 1.0 T
    const { result: weakRes } = renderHook(() =>
      useSensorPhysics({ sensorType: 2, magneticB: 0.2, currentI: 0.8, carrierType: 0 })
    )
    expect(weakRes.current.isArmatureAttracted).toBe(false)
    expect(weakRes.current.isTriggered).toBe(false)

    const { result: strongRes } = renderHook(() =>
      useSensorPhysics({ sensorType: 2, magneticB: 1.6, currentI: 0.8, carrierType: 0 })
    )
    expect(strongRes.current.isArmatureAttracted).toBe(true)
    expect(strongRes.current.isTriggered).toBe(true)

    // 控制电流越小，临界磁场越高：I = 0.2 A 时 B* = 4.0 T > 滑块上限 2.0 T，全程不触发
    const { result: lowCurrentRes } = renderHook(() =>
      useSensorPhysics({ sensorType: 2, magneticB: 2.0, currentI: 0.2, carrierType: 0 })
    )
    expect(lowCurrentRes.current.isArmatureAttracted).toBe(false)
  })

  it('电容式传感器应在 d ≤ 1.8 mm 时触发超程报警', () => {
    const { result: safeRes } = renderHook(() =>
      useSensorPhysics({ sensorType: 3, capacitorGap: 3.0 })
    )
    expect(safeRes.current.isTriggered).toBe(false)

    const { result: alarmRes } = renderHook(() =>
      useSensorPhysics({ sensorType: 3, capacitorGap: 1.4 })
    )
    expect(alarmRes.current.isTriggered).toBe(true)
  })
})
