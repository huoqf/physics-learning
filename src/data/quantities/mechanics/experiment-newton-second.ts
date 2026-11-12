import type { PhysicsPanelData, PhysicsQuantity, WarningItem } from '../types'
import {
  computeNewtonSecondMotion,
  computeNewtonSecondState,
} from '@/physics/experimentNewtonSecond'
import { DIFF_METHOD_MIN_DOTS as MIN_DOTS } from '@/physics/experimentMechanics'

const PIXELS_PER_METER_FOR_QUANTITIES = 1

/**
 * 探究加速度与力、质量的关系实验 —— 右屏物理量构建器
 */
export function buildExperimentNewtonSecondQuantities(
  _animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData {
  const state = computeNewtonSecondState(params)
  const motion = computeNewtonSecondMotion(
    state.a_real,
    time,
    PIXELS_PER_METER_FOR_QUANTITIES,
    state.freq,
  )

  const quantities: PhysicsQuantity[] = [
    { label: '小车质量', symbol: 'M', value: parseFloat(state.M_cart.toFixed(2)), unit: 'kg' },
    { label: '槽码质量', symbol: 'm', value: parseFloat(state.m_hook.toFixed(2)), unit: 'kg' },
    {
      label: '质量比值',
      symbol: 'm/M',
      value: parseFloat((state.massRatio * 100).toFixed(1)),
      unit: '%',
      highlight: state.massRatio > 0.1 ? 'extreme' : 'positive',
    },
    {
      label: '槽码重力 (近似合力)',
      symbol: 'mg',
      value: parseFloat(state.F_approx.toFixed(3)),
      unit: 'N',
    },
    {
      label: '细绳真实拉力',
      symbol: 'T',
      value: parseFloat(state.tension.toFixed(3)),
      unit: 'N',
    },
    {
      label: '小车实测加速度',
      symbol: 'a',
      value: parseFloat(state.a_real.toFixed(2)),
      unit: 'm/s²',
      highlight: 'positive',
    },
    { label: '实时速度', symbol: 'v', value: parseFloat(motion.v.toFixed(2)), unit: 'm/s' },
    { label: '实时位移', symbol: 'x', value: parseFloat(motion.x.toFixed(2)), unit: 'm' },
  ]

  if (motion.aCalculated !== null) {
    quantities.push({
      label: '纸带逐差测得加速度',
      symbol: 'a测',
      value: parseFloat(motion.aCalculated.toFixed(3)),
      unit: 'm/s²',
      highlight: 'positive',
    })
  }

  const warnings: WarningItem[] = []
  if (state.massRatio > 0.1) {
    warnings.push({
      text: `当前 m/M = ${(state.massRatio * 100).toFixed(1)}%（未满足 m ≪ M），细绳拉力仅约为 mg 的 ${state.tensionRatioPercent.toFixed(1)}%，a-F 图像明显向下弯曲`,
      level: 'warning',
    })
  }
  if (state.balanceMode === 1) {
    warnings.push({
      text: '未平衡摩擦力：存在阻力阈值，小推力下小车无法启动，a-F 图像将出现正横轴截距（不通过原点）',
      level: 'warning',
    })
  } else if (state.balanceMode === 2) {
    warnings.push({
      text: '平衡摩擦力过度（倾角偏大）：未挂槽码时重力分力已使小车加速下滑，a-F 图像出现正纵轴截距',
      level: 'warning',
    })
  }
  if (motion.aCalculated === null && state.a_real > 0) {
    warnings.push({
      text: `逐差法求加速度至少需要 ${MIN_DOTS} 个计数点（需经过至少 ${((MIN_DOTS - 1) * motion.countingPeriodS).toFixed(2)} s），当前已打 ${motion.tapeDots.length} 个`,
      level: 'info',
    })
  }

  return {
    quantities,
    formulas: [
      {
        name: '牛顿第二定律控制变量关系',
        latex: 'a = \\frac{F}{M}',
        level: 'core',
        condition: '平衡摩擦力后且满足槽码质量 m ≪ M（使 F ≈ mg）',
        note: '先保持 M 不变探究 a-F 正比关系，再保持 F 不变探究 a 与 1/M 的正比关系',
      },
      {
        name: '系统精确连接体动力学公式',
        latex: 'T = \\frac{M}{M + m} mg, \\quad a = \\frac{mg}{M + m}',
        level: 'important',
        condition: '已恰好平衡摩擦力且绳子不可伸长',
        note: '可见 T 始终小于 mg；只有 m ≪ M 时 M/(M+m) → 1，图像才保持直线而不向下弯曲',
      },
    ],
    gaokaoPoints: [
      {
        text: '控制变量法：探究 a 与 F 关系时保持小车总质量 M 不变；探究 a 与 m 关系时画 a-1/M 图像以将反比关系转化为过原点直线',
        importance: 'core',
      },
      {
        text: '平衡摩擦力操作要点：垫高长木板不带滑轮一端，不挂槽码、连好纸带，轻推小车使打出的纸带点迹均匀（匀速下滑）；改变小车或槽码质量时无需重新平衡摩擦力',
        importance: 'gaokao',
      },
      {
        text: '系统误差辨析：随着槽码质量 m 增大而不满足 m ≪ M 时，a-F 图像末端会明显向下偏折（斜率 k = 1/(M+m) 减小）',
        importance: 'gaokao',
      },
      {
        text: '图像截距故障分析：a-F 图在 F 轴有正截距 → 摩擦力未平衡或平衡不足；在 a 轴有正截距 → 平衡摩擦力过度（倾角偏大）',
        importance: 'hard',
      },
    ],
    warnings,
  }
}
