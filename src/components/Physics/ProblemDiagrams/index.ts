import React from 'react'
import { Prob2024Quanguo21Diagram } from './Prob2024Quanguo21Diagram'
import {
  Prob2023Quanguo19Diagram,
  Prob2022Quanguo21Diagram,
  Prob2023Hubei15Diagram,
  Prob2022Hunan14Diagram,
  Prob2024Guangdong13Diagram,
  Prob2023Jiangsu14Diagram,
  Prob2024Shandong12Diagram,
  Prob2023Zhejiang18Diagram,
  Prob2024Quanguo14Diagram,
  Prob2022Quanguo16Diagram,
  Prob2023Quanguo20Diagram,
  Prob2022Beijing14Diagram,
  Prob2024Guangdong8Diagram,
  Prob2023Hunan7Diagram,
  Prob2024Hubei10Diagram,
  Prob2023Shandong13Diagram,
  Prob2024Zhejiang6Diagram,
} from './MasterProblemDiagrams'

export interface ProblemDiagramProps {
  /** 是否为解答步骤配图（解答步骤中包含受力分析与辅助分解） */
  showAnalysis?: boolean
}

/**
 * 高考真题 SVG 示意图集中注册表
 * 根据 problemId 映射返回对应的高考真题矢量图组件
 */
export const problemDiagramRegistry: Record<string, React.FC<ProblemDiagramProps>> = {
  'prob-2024-quanguo-21': Prob2024Quanguo21Diagram,
  'prob-2023-quanguo-19': Prob2023Quanguo19Diagram,
  'prob-2022-quanguo-21': Prob2022Quanguo21Diagram,
  'prob-2023-hubei-15': Prob2023Hubei15Diagram,
  'prob-2022-hunan-14': Prob2022Hunan14Diagram,
  'prob-2024-guangdong-13': Prob2024Guangdong13Diagram,
  'prob-2023-jiangsu-14': Prob2023Jiangsu14Diagram,
  'prob-2024-shandong-12': Prob2024Shandong12Diagram,
  'prob-2023-zhejiang-18': Prob2023Zhejiang18Diagram,
  'prob-2024-quanguo-14': Prob2024Quanguo14Diagram,
  'prob-2022-quanguo-16': Prob2022Quanguo16Diagram,
  'prob-2023-quanguo-20': Prob2023Quanguo20Diagram,
  'prob-2022-beijing-14': Prob2022Beijing14Diagram,
  'prob-2024-guangdong-8': Prob2024Guangdong8Diagram,
  'prob-2023-hunan-7': Prob2023Hunan7Diagram,
  'prob-2024-hubei-10': Prob2024Hubei10Diagram,
  'prob-2023-shandong-13': Prob2023Shandong13Diagram,
  'prob-2024-zhejiang-6': Prob2024Zhejiang6Diagram,
}

export function getProblemDiagram(problemId: string): React.FC<ProblemDiagramProps> | undefined {
  return problemDiagramRegistry[problemId]
}


