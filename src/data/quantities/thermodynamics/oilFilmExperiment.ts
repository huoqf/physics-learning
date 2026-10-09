/**
 * 油膜法估测分子大小学生实验物理量看板数据构建。
 */
import { calculateOilFilm } from '@/physics/oilFilmExperiment'
import { THERMO_COLORS, PHYSICS_COLORS, CHART_COLORS } from '@/theme/physics'
import type { PhysicsPanelData } from '../types'

export function buildOilFilmExperimentData(
  animId: string,
  params: Record<string, number>,
  _time: number,
  _lastChangedParam?: string | null,
): PhysicsPanelData | null {
  if (animId !== 'anim-oil-film-experiment') return null

  const ratio = params.ratio ?? 500
  const dropsPerMl = params.dropsPerMl ?? 80
  const powderDensity = params.powderDensity ?? 0

  const powderThickness =
    powderDensity === 1 ? 'thick' : powderDensity === 2 ? 'thin' : 'normal'

  const res = calculateOilFilm({
    ratio,
    dropsPerMl,
    gridSideCm: 1.0,
    powderThickness,
  })

  return {
    quantities: [
      { label: '溶液稀释比', value: `1 : ${ratio}`, unit: '' },
      { label: '1 mL 溶液滴数', value: `${dropsPerMl}`, unit: '滴' },
      { label: '1 滴溶液体积 V₁', value: (res.vDropMl * 1e3).toFixed(2), unit: 'mm³' },
      { label: '单滴纯油酸体积 V', value: (res.vPureAcidM3 * 1e11).toFixed(2), unit: '×10⁻¹¹ m³', highlight: 'extreme', color: THERMO_COLORS.heatAbsorb },
      { label: '有效方格数 N_grid', value: `${res.gridCount}`, unit: '格', color: CHART_COLORS.labelText },
      { label: '油膜展开面积 S', value: res.areaCm2.toFixed(1), unit: 'cm²', color: PHYSICS_COLORS.velocity },
      {
        label: '估算分子直径(膜厚) d',
        value: (res.moleculeDiameterM * 1e10).toFixed(2),
        unit: 'Å (10⁻¹⁰m)',
        highlight: 'extreme',
        color: PHYSICS_COLORS.forceNet,
      },
      {
        label: '痱子粉撒布状态',
        value: powderThickness === 'normal' ? '正常均匀' : powderThickness === 'thick' ? '偏厚 (阻碍扩散, d偏大)' : '偏薄 (利于铺展)',
        unit: '',
        color: powderThickness === 'normal' ? CHART_COLORS.equilibrium : CHART_COLORS.criticalPt,
      },
    ],
    formulas: [
      {
        name: '单滴纯油酸体积',
        latex: 'V = \\dfrac{1}{N_{drop}} \\cdot \\rho_{浓度} \\; (\\text{mL}) = \\dfrac{1}{N_{drop} \\cdot \\text{ratio}} \\times 10^{-6} \\; (\\text{m}^3)',
        level: 'core',
        condition: '滴管已校准，每滴体积均匀',
      },
      {
        name: '油膜单分子层模型直径公式',
        latex: 'd = \\dfrac{V}{S} = \\dfrac{V}{N_{grid} \\cdot L_{grid}^2}',
        level: 'core',
        condition: '单分子油膜假设 + 球形分子紧密排列',
        note: '若痱子粉过厚阻碍铺展，S 偏小导致 d 偏大',
      },
      {
        name: '阿伏伽德罗常数反推公式',
        latex: 'N_A = \\dfrac{V_{mol}}{V_0} = \\dfrac{M}{\\rho \\cdot \\frac{1}{6}\\pi d^3}',
        level: 'important',
        condition: '由测得分子直径结合摩尔质量反推 NA',
      },
    ],
    gaokaoPoints: [
      {
        text: '三大基本假设（高考简答必背）：①油酸分子在水面上形成单分子油膜；②将油酸分子简化为球形模型；③油酸分子一个紧挨一个无间隙紧密排列。',
        importance: 'gaokao',
      },
      {
        text: '数方格计数法则：以坐标纸上边界为准，凡是面积超过半格的算一格，不足半格的舍去。',
        importance: 'gaokao',
      },
      {
        text: '误差分析打靶（高考实验高频）：①痱子粉撒得太厚未完全散开 → S 偏小 → d 偏大；②油酸酒精溶液挥发浓度升高但仍按原浓度计算 → 实际纯油酸体积增大 → 计算的 V 偏小 → d 偏小；③计算一滴体积时滴数数多了 → 计算的单滴体积偏小 → d 偏小。',
        importance: 'hard',
      },
    ],
    warnings: [
      {
        text: '不能用纯油酸直接滴在水面上！纯油酸表面张力大且黏滞，无法在浅盘水面充分展开成单分子薄膜，必须用酒精高度稀释。',
        level: 'danger',
      },
      {
        text: '酒精的作用是稀释油酸并作为载体；滴入水面后，酒精迅速溶于水，留在水面上形成薄膜的只有纯油酸。',
        level: 'warning',
      },
      {
        text: '分子直径计算结果数量级必须在 10⁻¹⁰ m（约 1~3 Å）。如果算出的数量级为 10⁻⁷ 或 10⁻¹³，说明单位换算有严重错误。',
        level: 'warning',
      },
    ],
  }
}
