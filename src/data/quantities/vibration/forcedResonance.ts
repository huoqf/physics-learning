import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint, WarningItem } from '../types'
import {
  calculateSteadyStateResonance,
  calculateForcedVibrationState,
  calculateCrankEccentricity,
  calculateDamperGeometry,
  calculateStageAmplitudeCapacity,
} from '@/physics/vibration/forcedResonance'

export function buildForcedResonanceQuantities(
  _animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  const m = params.m ?? 1.0
  const k = params.k ?? 39.5
  const gamma = params.gamma ?? 0.85
  const F0 = params.F0 ?? 2.0
  const f = params.f ?? 1.0
  const mode = params.mode ?? 1

  const config = { m, k, gamma, F0, f }
  const steady = calculateSteadyStateResonance(config)
  const state = calculateForcedVibrationState(config, time, mode)

  const t0 = steady.f0 > 0 ? 1 / steady.f0 : 0
  const tDriver = f > 0 ? 1 / f : 0

  const quantities: PhysicsQuantity[] = [
    { label: '系统固有频率', symbol: 'f0', value: +steady.f0.toFixed(2), unit: 'Hz' },
    { label: '系统固有周期', symbol: 'T0', value: +t0.toFixed(2), unit: 's' },
    { label: '驱动力频率', symbol: 'f', value: +f.toFixed(2), unit: 'Hz' },
    { label: '驱动力周期', symbol: 'T', value: +tDriver.toFixed(2), unit: 's' },
    { label: '受迫振动振幅', symbol: 'A', value: +(steady.amplitude * 100).toFixed(1), unit: 'cm' },
    { label: '共振最大振幅', symbol: 'Amax', value: +(steady.maxAmplitude * 100).toFixed(1), unit: 'cm' },
    { label: '振子实时位移', symbol: 'x', value: +(state.x * 100).toFixed(1), unit: 'cm' },
    { label: '振子实时速度', symbol: 'v', value: +state.v.toFixed(2), unit: 'm/s' },
    { label: '实时驱动力', symbol: 'F驱', value: +state.fDriver.toFixed(2), unit: 'N' },
    { label: '弹簧弹力', symbol: 'F弹', value: +state.elasticForce.toFixed(2), unit: 'N' },
    { label: '介质阻力', symbol: 'F阻', value: +state.dampingForce.toFixed(2), unit: 'N' },
    { label: '位移滞后驱动力相位差', symbol: 'φ', value: +steady.phaseLagDeg.toFixed(1), unit: '°' },
  ]

  const formulas: Formula[] = [
    {
      name: '系统固有频率与周期',
      latex: 'f_0 = \\frac{1}{2\\pi}\\sqrt{\\frac{k}{m}},\\quad T_0 = 2\\pi\\sqrt{\\frac{m}{k}}',
      level: 'core',
    },
    {
      name: '受迫振动频率决定铁律',
      latex: 'f_{\\text{受迫}} = f_{\\text{驱}},\\quad T_{\\text{受迫}} = T_{\\text{驱}}',
      level: 'core',
    },
    {
      name: '共振发生条件与判据',
      latex: 'f_{\\text{驱}} = f_0 \\implies A = A_{\\text{max}}',
      level: 'core',
    },
    {
      name: '受迫振幅理论公式 (选学拓展)',
      latex: 'A = \\frac{F_0}{\\sqrt{m^2(\\omega_0^2 - \\omega^2)^2 + \\gamma^2\\omega^2}}',
      level: 'important',
    },
    {
      name: '位移与驱动力相位差 (选学拓展)',
      latex: '\\tan\\varphi = \\frac{\\gamma\\omega}{m(\\omega_0^2 - \\omega^2)}\\quad (\\text{共振时 } \\varphi = 90^\\circ)',
      level: 'important',
    },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    {
      text: '受迫振动的频率特征（高考第一铁律）：物体做受迫振动达到稳定后，其振动频率与周期恒等于驱动力的频率与周期，与物体自身的固有频率完全无关！',
      importance: 'gaokao',
    },
    {
      text: '共振条件与极值规律：当驱动力频率 f 接近系统的固有频率 f0 时，驱动力持续对振子做正功，输入能量效率最高，振幅达到极大值，发生共振。',
      importance: 'gaokao',
    },
    {
      text: '质量改变对共振转速的调节（共振筛模型）：装料使总质量 m 增大 -> 固有频率 f0 减小 -> 必须降低电动机驱动转速使 f=f0 才能维持最大共振振幅。',
      importance: 'gaokao',
    },
    {
      text: '阻力对共振曲线的影响：介质阻力越小，共振曲线的峰值越尖锐陡峭；介质阻力越大，共振峰越平缓钝化。',
      importance: 'core',
    },
    {
      text: '生活与工程中的利用与防止：共振筛、微波炉利用共振；军队过桥便步走、机器减震机座（使工作频率远离固有频率）防止共振破坏。',
      importance: 'gaokao',
    },
  ]

  // ── 几何限幅与舞台容量告警（让不可见的失真变成用户可见的明确告知）────────
  const warnings: WarningItem[] = []
  const crank = calculateCrankEccentricity(F0, k)
  if (crank.clampType !== 'none') {
    // ⚠️ 上下限的物理含义相反：下限侧画面偏心距**大于**真值，上限侧**小于**真值。
    // 此前统一写"已达几何显示上限"，而实测 78.9% 的限幅发生在下限侧，
    // 文案方向颠倒、归因（轮盘尺寸）也错（下限是"最小可辨度"约束）。
    const isMinSide = crank.clampType === 'min'
    const headline = isMinSide ? '偏心距低于最小可辨值，已放大显示' : '偏心距已达几何显示上限，已缩小显示'
    const reason = isMinSide
      ? '偏心距过小时曲柄销几乎看不出转动，故按最小可辨偏心距放大绘制'
      : '受曲柄臂长与轮盘几何约束，按最大可用偏心距缩小绘制'
    warnings.push({
      level: 'warning',
      text: `${headline}：物理真值 e = F₀/k = ${(crank.ideal * 100).toFixed(1)} cm，画面按 ${(crank.e * 100).toFixed(1)} cm 显示（${reason}）。此时画面曲柄行程与小球振幅不再严格成比例，请以右屏物理量读数为准。`,
    })
  }

  // 舞台容量告警：与场景几何共用同一真源（calculateDamperGeometry().fitsStage），
  // 杜绝阈值漂移与静默窗口。
  // ⚠️ 判据只用**小球自身**的稳态振幅峰值：mode 2 图表上的对比阻尼曲线
  // （γ=0.2 / 1.2）小球从不按其运动，并入会产生与画面不符的告警
  // （实测默认工况下槽体会被撑高 3.3 倍，18% 的参数组合被误报）。
  const damper = calculateDamperGeometry(steady.maxAmplitude)

  if (!damper.fitsStage) {
    const capacity = calculateStageAmplitudeCapacity()
    warnings.push({
      level: 'warning',
      text: `当前参数下位移振幅达 ${(steady.maxAmplitude * 100).toFixed(0)} cm，超过演示舞台可容纳的 ${(capacity * 100).toFixed(0)} cm，阻尼叶片将无法全程浸没于介质。这是低阻尼、高驱动力的真实物理结果——建议减小 F₀ 或增大 γ、k 后再观察。`,
    })
  }

  return {
    quantities,
    formulas,
    gaokaoPoints,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}
