/**
 * 热力学第二定律物理量看板数据构建。
 */
import { SECOND_LAW_COLORS } from '@/theme/physics'
import type { PhysicsPanelData } from './types'

export function buildSecondLawQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-second-law') return null

  const scene = params.scene ?? 0

  // 基于时间的逻辑斯蒂增长模型估算熵值
  const k = scene === 0 ? 0.8 : 1.2
  const t0 = scene === 0 ? 8 : 5
  const S = Math.max(0, Math.min(1, 1 / (1 + Math.exp(-k * (time - t0)))))
  const omega = Math.exp(S * 8)

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
        value: scene === 0 ? '热传导' : '气体扩散',
        unit: '',
      },
    ],
    formulas: [
      {
        name: '玻尔兹曼熵公式',
        latex: 'S = k_B \\ln \\Omega',
        level: 'core',
        condition: '微观态等概率假设',
      },
      {
        name: '克劳修斯表述',
        latex: '热量不能自发地从低温物体传到高温物体',
        level: 'important',
      },
      {
        name: '开尔文表述',
        latex: '不可能从单一热源吸收热量并全部用来做功，\\ 而不引起其他变化',
        level: 'important',
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
