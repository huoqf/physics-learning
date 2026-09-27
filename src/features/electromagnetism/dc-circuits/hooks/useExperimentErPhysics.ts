import { useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { calculateExperimentEr, type ExperimentErResult } from '@/physics'

export interface ExperimentErPhysicsOptions {
  E_real?: number
  r_real?: number
  RV?: number
  RA?: number
}

export interface CircuitTopology {
  bounds: { left: number; right: number; top: number; bottom: number }
  source: { center: { x: number; y: number }; in: { x: number; y: number }; out: { x: number; y: number } }
  switchS: { center: { x: number; y: number }; in: { x: number; y: number }; out: { x: number; y: number } }
  rheostat: { center: { x: number; y: number }; width: number; in: { x: number; y: number }; out: { x: number; y: number } }
  ammeter: { center: { x: number; y: number }; radius: number; in: { x: number; y: number }; out: { x: number; y: number } }
  voltmeter0: { center: { x: number; y: number }; radius: number; in: { x: number; y: number }; out: { x: number; y: number } }
  voltmeter1: { center: { x: number; y: number }; radius: number; in: { x: number; y: number }; out: { x: number; y: number } }
}

export interface UseExperimentErPhysicsResult {
  switchClosed: boolean
  toggleSwitch: () => void
  wiring: number
  R_slider: number
  showEquivalent: boolean
  E_real: number
  r_real: number
  RV: number
  RA: number
  res: ExperimentErResult
  E_meas: number
  r_meas: number
  topology: CircuitTopology
  time: number
}

/**
 * 测定电源电动势与内阻实验物理逻辑 Hook
 * - 纯净物理定律计算与等效电源模型衍生
 * - 参数化计算标准端子拓扑布局 (CircuitTopology)，实现端子吸附与闭合
 * - 严格支持电键 S 物理断开/闭合状态及断路电表归零响应
 */
export function useExperimentErPhysics(options?: ExperimentErPhysicsOptions): UseExperimentErPhysicsResult {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const setPhysicsState = useAnimationStore((s) => s.setPhysicsState)
  const setParams = useAnimationStore((s) => s.setParams)

  const switchClosed = Boolean(params.switchClosed ?? 1)
  const wiring = params.wiring ?? 0 // 0=电路甲:外接法, 1=电路乙:内接法
  const R_slider = params.R_slider ?? 10
  const showEquivalent = Boolean(params.showEquivalent ?? 0)

  const E_real = options?.E_real ?? 6.0
  const r_real = options?.r_real ?? 2.0
  const RV = options?.RV ?? 10.0 // 教学型低阻电压表 (便于观察误差)
  const RA = options?.RA ?? 1.5  // 教学型大阻值电流表

  const toggleSwitch = () => {
    setParams({ switchClosed: switchClosed ? 0 : 1 })
  }

  // 1. 核心电路状态物理计算（电键断开时，全回路断路，电表均归零）
  const res = useMemo(() => {
    if (!switchClosed) {
      return {
        I_meas: 0,
        U_meas: 0,
        I_real: 0,
        U_real: 0,
        valid: true,
      }
    }
    return calculateExperimentEr(E_real, r_real, R_slider, wiring, RV, RA)
  }, [switchClosed, E_real, r_real, R_slider, wiring, RV, RA])

  // 2. 戴维南等效测量电动势与内阻
  const { E_meas, r_meas } = useMemo(() => {
    if (wiring === 0) {
      // 电路甲（外接法）：电源与电压表并联
      return {
        E_meas: E_real / (1 + r_real / RV),
        r_meas: r_real / (1 + r_real / RV),
      }
    } else {
      // 电路乙（内接法）：电源与电流表串联
      return {
        E_meas: E_real,
        r_meas: r_real + RA,
      }
    }
  }, [wiring, E_real, r_real, RV, RA])

  // 3. 参数化标准端子拓扑布局系统 (严格对齐 840x325 SplitV 视口)
  const topology = useMemo<CircuitTopology>(() => {
    const left = 140
    const right = 700
    const top = 75
    const bottom = 255

    // 变阻器标准宽 140，其 symbolic 模式端子左右各偏移 73
    const rheostatWidth = 140
    const rheostatCenterX = 320
    const rheostatCenterY = top

    // 电流表圆圈 A 半径 24
    const ammeterRadius = 24
    const ammeterCenterX = 560
    const ammeterCenterY = top

    // 电压表圆圈 V 半径 24
    const vMeterRadius = 24

    return {
      bounds: { left, right, top, bottom },
      source: {
        center: { x: 330, y: bottom },
        in: { x: 245, y: bottom },
        out: { x: 415, y: bottom },
      },
      switchS: {
        center: { x: 550, y: bottom },
        in: { x: 532, y: bottom },
        out: { x: 568, y: bottom },
      },
      rheostat: {
        center: { x: rheostatCenterX, y: rheostatCenterY },
        width: rheostatWidth,
        in: { x: rheostatCenterX - 73, y: rheostatCenterY },   // (247, 75)
        out: { x: rheostatCenterX + 73, y: rheostatCenterY },  // (393, 75)
      },
      ammeter: {
        center: { x: ammeterCenterX, y: ammeterCenterY },
        radius: ammeterRadius,
        in: { x: ammeterCenterX - ammeterRadius, y: ammeterCenterY },  // (536, 75)
        out: { x: ammeterCenterX + ammeterRadius, y: ammeterCenterY }, // (584, 75)
      },
      // 电路甲电压表：中层横跨路端 (y=165)
      voltmeter0: {
        center: { x: 420, y: 165 },
        radius: vMeterRadius,
        in: { x: 420 - vMeterRadius, y: 165 }, // (396, 165)
        out: { x: 420 + vMeterRadius, y: 165 }, // (444, 165)
      },
      // 电路乙电压表：变阻器正下方 (y=155)
      voltmeter1: {
        center: { x: 320, y: 155 },
        radius: vMeterRadius,
        in: { x: 320 - vMeterRadius, y: 155 }, // (296, 155)
        out: { x: 320 + vMeterRadius, y: 155 }, // (344, 155)
      },
    }
  }, [])

  // 切换接线方式时自动重置打点记录
  useEffect(() => {
    setPhysicsState((prev) => ({ ...prev, trajectory: [] }))
  }, [wiring, setPhysicsState])

  return {
    switchClosed,
    toggleSwitch,
    wiring,
    R_slider,
    showEquivalent,
    E_real,
    r_real,
    RV,
    RA,
    res,
    E_meas,
    r_meas,
    topology,
    time,
  }
}
