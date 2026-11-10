import { useMemo } from 'react'
import {
  calculateLCConstants,
  lcChargeAt,
  lcCurrentAt,
  lcVoltageAt,
  lcCurrentRateAt,
  lcInductorEmfMagnitudeAt,
  lcOscillationStage,
  lcElectricEnergy,
  lcMagneticEnergy,
  lcDampingAmplitude,
  sampleLCWaveformRange,
  calculateCapacitanceWithGap,
  LC_DEFAULT_PARAMS,
  LC_CURVE_TIME_WINDOW,
} from '@/physics'

/** 可见时间窗内的曲线采样点数，保证任何 L、C 下都保持平滑 */
const CURVE_SAMPLES = 240

interface UseLCPhysicsOptions {
  /** 电感 L (H) */
  L: number
  /** 电容 C (F) */
  C: number
  /** 极板间距比例因子 dRatio（基准为 1.0，C_eff = C / dRatio） */
  dRatio?: number
  /** 初始电荷量 Q₀ (C) */
  Q0: number
  /** 当前时刻 (s) */
  time: number
  /** 是否叠加阻尼包络（等效串联阻尼电阻 R） */
  showDamping: boolean
  /** 单刀双掷开关位置：1 接直流电源充电，2 接电感构成 LC 振荡（默认 2） */
  switchPos?: number
  /** 是否按当前可见时间窗生成波形采样（场景侧仅用瞬时值时可传 false） */
  includeCurves?: boolean
}

/** 曲线上的一个点（x = 时间 s，y 的量纲见各字段说明） */
export interface LCCurvePoint {
  x: number
  y: number
}

export interface LCPhysicsResult {
  /** 固有量 */
  omega: number
  T: number
  f: number
  /** 能量变化周期 T_E = T / 2 (s) */
  energyPeriod: number
  eTotal: number
  iMax: number
  /** 弱阻尼等效串联电阻 (Ω)，理想模式为 0 */
  resistance: number
  /** 单刀双掷开关位置：1 直流充电，2 LC 振荡 */
  switchPos: 1 | 2
  /** 实际有效电容 (F) */
  effectiveC: number
  /** 间距比例因子 */
  dRatio: number

  /** 瞬时状态 */
  q: number
  i: number
  /** 电容器极板间电压 u_C = q / C_eff (V) */
  uC: number
  /** 回路电流变化率 di/dt (A/s) */
  diDt: number
  /** 线圈自感电动势大小 |e_L| = L|di/dt| (V) */
  eInductor: number
  /** 当前所处工作阶段（正向放电/反向充电等） */
  stageLabel: string
  /** 当前能量转化方向 */
  energyFlowLabel: string
  eElectric: number
  eMagnetic: number
  /** 已转化为回路内能的能量 (J)，理想模式恒为 0 */
  eHeat: number

  /** 当前物理时刻 (s) */
  time: number
  /** 归一化瞬时值（用于场景中判定电荷符号与数量） */
  chargeRatio: number

  /**
   * 电荷波形，**真实单位 (C)**，覆盖 0 ~ 2T 的完整定义域。
   *
   * ⚠️ 绝不除以 Q₀：除自身幅值会让 Q₀ 滑块的调整在图上完全消失
   * （振幅恒为满幅），"Q₀ 只改振幅不改周期"这条结论就无从观察。
   * 纵轴量程由消费方锁定为 `LC_CURVE_CHARGE_SPAN`。
   */
  chargeCurve: LCCurvePoint[]
  /**
   * 电流波形，单位为**理想峰值参考** `i / I_ref`（无量纲）。
   * 相对坐标用于观察相位；理想模式中可直接读出 quarter-period 关系，
   * 弱阻尼模式只展示实际衰减形态，不再宣称严格 90° 相位差。
   */
  currentCurve: LCCurvePoint[]
  /** 阻尼振幅包络（y = Q₀·e^(−t/τ)，**单位 C**，与 `chargeCurve` 同量纲；仅 showDamping 时非空） */
  dampingCurve: LCCurvePoint[]
  /** 曲线的时间跨度（s）= 2T */
  curveSpan: number
  /** 当前展示末尾时刻（夹紧到 [0, curveSpan]） */
  tShow: number
  /** 可见时间窗起点 (s) */
  viewStart: number
  /** 可见时间窗终点 (s) */
  viewEnd: number
}

/**
 * LC 回路状态（解析解，无内部仿真状态）。
 *
 * 因为 q(t)、i(t) 均为闭式解，本 Hook 是纯派生计算（useMemo），
 * 不需要 useAnimationFrame 逐帧步进 —— 时间轴完全由 store 的 `time` 驱动。
 *
 * 波形按当前可见时间窗 [viewStart, tShow] 均匀采样：
 * 确保在大 L / C 工况下（2T 远大于 6 s）窗口内依然保持高密度采样点，
 * 且末端精确落在 tShow，不预画未来，游标与曲线严格重合。
 */
export function useLCPhysics({
  L,
  C,
  dRatio = 1.0,
  Q0,
  time,
  showDamping,
  switchPos = 2,
  includeCurves = true,
}: UseLCPhysicsOptions): LCPhysicsResult {
  return useMemo(() => {
    const safeL = L > 0 ? L : LC_DEFAULT_PARAMS.L
    const baseC = C > 0 ? C : LC_DEFAULT_PARAMS.C
    const safeDRatio = Math.max(0.1, dRatio > 0 ? dRatio : 1.0)
    const effectiveC = calculateCapacitanceWithGap(baseC, safeDRatio)
    const safeQ0 = Q0 > 0 ? Q0 : LC_DEFAULT_PARAMS.Q0
    const activeSwitchPos: 1 | 2 = switchPos === 1 ? 1 : 2

    const lc = { L: safeL, C: effectiveC, Q0: safeQ0, damped: showDamping }
    const { omega, T, f, energyPeriod, eTotal, iMax, resistance } = calculateLCConstants(lc)

    const isCharging = activeSwitchPos === 1
    const q = isCharging ? safeQ0 : lcChargeAt(lc, time)
    const i = isCharging ? 0 : lcCurrentAt(lc, time)
    const uC = isCharging ? safeQ0 / effectiveC : lcVoltageAt(lc, time)
    const diDt = isCharging ? 0 : lcCurrentRateAt(lc, time)
    const eInductor = isCharging ? 0 : lcInductorEmfMagnitudeAt(lc, time)
    const { stage: stageLabel, energyFlow: energyFlowLabel } = isCharging
      ? {
          stage: '直流充电完成（开关接 1）',
          energyFlow: '直流电源将极板充至最大电荷 Q₀，电场能最大、磁场能为零',
        }
      : lcOscillationStage(lc, time)
    const eElectric = isCharging ? eTotal : lcElectricEnergy(q, effectiveC)
    const eMagnetic = isCharging ? 0 : lcMagneticEnergy(i, safeL)
    const eHeat = !isCharging && showDamping ? Math.max(0, eTotal - eElectric - eMagnetic) : 0

    const curveSpan = 2 * T
    const tShow = isCharging ? 0 : Math.min(Math.max(0, time), curveSpan)
    const viewStart = Math.max(0, tShow - LC_CURVE_TIME_WINDOW)
    const viewEnd = viewStart + LC_CURVE_TIME_WINDOW

    const chargeCurve: LCCurvePoint[] = []
    const currentCurve: LCCurvePoint[] = []
    const dampingCurve: LCCurvePoint[] = []

    if (includeCurves && !isCharging) {
      for (const sample of sampleLCWaveformRange(lc, viewStart, tShow, CURVE_SAMPLES)) {
        // 电荷用真实单位 (C)：纵轴量程由消费方固定，Q₀ 的效果才看得见
        chargeCurve.push({ x: sample.t, y: sample.q })
        currentCurve.push({ x: sample.t, y: iMax > 0 ? sample.i / iMax : 0 })
        // 包络仅作衰减参考；真实 q、i 由欠阻尼解析解给出，不强行保持理想相位。
        if (showDamping) {
          dampingCurve.push({ x: sample.t, y: safeQ0 * lcDampingAmplitude(sample.t, T) })
        }
      }
    }

    return {
      omega,
      T,
      f,
      energyPeriod,
      eTotal,
      iMax,
      resistance,
      switchPos: activeSwitchPos,
      effectiveC,
      dRatio: safeDRatio,
      q,
      i,
      uC,
      diDt,
      eInductor,
      stageLabel,
      energyFlowLabel,
      time,
      eElectric,
      eMagnetic,
      eHeat,
      chargeRatio: q / safeQ0,
      chargeCurve,
      currentCurve,
      dampingCurve,
      curveSpan,
      tShow,
      viewStart,
      viewEnd,
    }
  }, [L, C, dRatio, Q0, time, showDamping, switchPos, includeCurves])
}
