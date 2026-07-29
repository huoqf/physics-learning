import React from 'react'
import { Prob2024Quanguo21Diagram } from './Prob2024Quanguo21Diagram'

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
}

export function getProblemDiagram(problemId: string): React.FC<ProblemDiagramProps> | undefined {
  return problemDiagramRegistry[problemId]
}
