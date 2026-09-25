import type { Problem } from '../types'

/**
 * 电磁感应与涡流高考真题（100% 官方原卷逐字核验）
 */
export const inductionProblems: Problem[] = [
  {
    id: 'prob-2024-hubei-01',
    year: 2024,
    province: '湖北卷',
    source: '2024年普通高等学校招生全国统一考试物理试卷（湖北卷）第1题',
    questionType: 'choice',
    verified: true,
    title: '《梦溪笔谈》雷击与涡流热效应',
    content:
      '《梦溪笔谈》中记录了一次罕见的雷击事件：房屋被雷击后，屋内的银饰、宝刀等金属熔化了，但是漆器、刀鞘等非金属却完好（原文为：“有一木格，其中杂贮诸器，其漆器银扣者，银悉熔流在地，漆器曾不焦灼。有一宝刀，极坚钢，就刀室中熔为汁，而室亦俨然”）。导致金属熔化而非金属完好的原因可能为（ ）\n\nA. 摩擦\nB. 声波\nC. 涡流\nD. 光照',
    difficulty: 2,
    knowledgeIds: ['electricity-4-9'],
    tags: ['高考真题', '2024湖北卷', '梦溪笔谈', '涡流', '电磁感应'],
    targetAnimation: {
      animId: 'anim-self-induction-eddy',
      presetParams: { mode: 2 },
      presetDescription: '载入涡流与电磁阻尼演示：观察块状金属在交变电磁场中产生的强大感应涡流',
    },
    optionExplanations: {
      A: {
        label: 'A',
        isCorrect: false,
        explanation: '错误。屋内物品静止放置，不存在剧烈宏观摩擦导致熔化的物理机制。',
      },
      B: {
        label: 'B',
        isCorrect: false,
        explanation: '错误。雷声伴随声波能量极低，不可能将坚硬钢刀和金属银熔化。',
      },
      C: {
        label: 'C',
        isCorrect: true,
        explanation:
          '正确。雷电流在周围空间激发瞬间剧烈变化的脉冲磁场，金属器皿（银饰、钢刀等）处于该交变磁场中感应出强大的涡流（感应电流），由于焦耳热迅速累积致使金属熔化；而非金属电阻极大不能产生感应涡流，故完好。',
      },
      D: {
        label: 'D',
        isCorrect: false,
        explanation: '错误。雷电闪光照射时间极其短暂，且光照无法选择性地将刀鞘内部的宝刀熔成汁而保持刀鞘完好。',
      },
    },
    steps: [
      {
        id: 'step-1',
        description: '判断雷电瞬态电流激发的交变磁场与涡流成因',
        keyCondition: '变化的电流产生变化的磁场，金属导体处于变化磁场中产生涡旋感应电流',
        scorePoints: 2,
        explanation: '雷击发生时，瞬时放电电流极大（可达数万安培），产生急剧变化的脉冲磁场。闭合的块状金属导体在该磁场中感应出闭合的环形感应电流，即涡流。',
      },
      {
        id: 'step-2',
        description: '分析导体与绝缘体的电热效应差异',
        keyCondition: '焦耳定律 Q = I² R t，金属中涡流极强，非金属几乎无自由电子与感应电流',
        scorePoints: 2,
        formula: '$$Q = I^2 R t$$',
        explanation: '金属（银扣、钢刀）为良导体，电阻率极低且截面大，感应出的涡流极大，在极短时间内释放出巨大的焦耳热，使金属熔化；而漆器、木格、刀鞘为非金属绝缘体或高阻材料，无法形成感应涡流，故完好无损。',
      },
    ],
  },
]
