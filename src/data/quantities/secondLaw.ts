/**
 * 热力学第二定律物理量看板数据构建。
 */
import { SECOND_LAW_COLORS } from '@/theme/physics'
import { secondLawSharedState } from '@/features/thermodynamics/secondLaw/sharedState'
import type { PhysicsPanelData } from './types'

export function buildSecondLawQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-second-law') return null

  const scene = params.scene ?? 0
  const workInput = params.workInput ?? 0

  const S = secondLawSharedState.currentS
  const lnOmega = secondLawSharedState.lnOmega
  const omega = Math.exp(lnOmega)

  const isReversePump = scene === 0 && workInput === 1

  return {
    quantities: [
      {
        label: '无序度评分',
        symbol: 'S',
        value: S.toFixed(3),
        unit: '',
        color: SECOND_LAW_COLORS.entropyLine,
        highlight: S > 0.8 ? 'positive' : S < 0.2 ? 'zero' : undefined,
      },
      {
        label: '微观态数',
        symbol: 'Ω',
        value: omega > 1000 ? omega.toExponential(1) : omega.toFixed(0),
        unit: '',
        color: SECOND_LAW_COLORS.warmParticle,
      },
      {
        label: '场景',
        symbol: '',
        value: isReversePump ? '电冰箱泵热 (做功介入)' : scene === 0 ? '自发热传导' : '气体自由扩散',
        unit: '',
      },
      {
        label: '演化状态',
        symbol: '',
        value: isReversePump ? '外界做功逆向泵热' : S >= 0.95 ? '已达热平衡' : '自发演化中',
        unit: '',
        color: isReversePump ? SECOND_LAW_COLORS.warmParticle : S >= 0.95 ? SECOND_LAW_COLORS.equilibriumLabel : SECOND_LAW_COLORS.entropyLine,
      },
    ],
    formulas: [
      {
        name: isReversePump ? '电冰箱/热泵能量守恒' : '玻尔兹曼熵公式',
        latex: isReversePump ? 'Q_1 = Q_2 + W' : 'S = k_B \\ln \\Omega',
        level: 'core',
        condition: isReversePump ? '外界做功 W 将热量 Q₂ 泵向高温端 Q₁' : '微观态等概率假设',
      },
      {
        name: '热力学第二定律（孤立系统熵增）',
        latex: '\\Delta S \\ge 0',
        level: 'core',
        condition: '自发过程',
      },
    ],
    gaokaoPoints: [
      {
        text: '克劳修斯表述：热量不能自发地从低温物体传到高温物体。注意"自发"二字——电冰箱消耗电能可以实现逆向传热。',
        importance: 'gaokao',
      },
      {
        text: '开尔文表述：不可能从单一热源吸收热量全部用来做功而不引起其他变化。这否定了第二类永动机。',
        importance: 'gaokao',
      },
      {
        text: '第二类永动机不违反能量守恒（热力学第一定律），但违反热力学第二定律的方向性。',
        importance: 'hard',
      },
      {
        text: '热力学第二定律是统计规律：宏观自发过程的方向性源于微观态数 Ω 的压倒性优势。',
        importance: 'core',
      },
    ],
    warnings: [
      {
        text: '【高考高频命题陷阱】“热量不能从低温传到高温”是错误的伪命题！题干缺少“自发地”时切勿盲选，电冰箱消耗电功完全可以逆向泵热！',
        level: 'danger',
      },
      {
        text: '热力学第二定律不禁止热量从低温传到高温，而是强调"自发"。有外界做功时逆向过程完全可以发生。',
        level: 'warning',
      },
      {
        text: '熵增是统计规律而非绝对——小系统可能出现局部熵减，但宏观系统几乎不可能。',
        level: 'info',
      },
    ],
  }
}
