/**
 * 高考 18 大 Master 压轴模型数据类型定义
 * 深度复用与整合 knowledgeTree 节点、animId 与 problems 真题
 */

export interface MasterModelQuickFormula {
  title: string
  latex: string
  explanation: string
}

export interface MasterModel {
  /** 模型唯一 ID (如 model-block-board) */
  id: string
  /** 模型名称 (如 板块模型与临界相对滑动) */
  title: string
  /** 所属学科模块 */
  category: 'mechanics' | 'electromagnetism' | 'thermodynamics' | 'optics' | 'modern'
  /** 高考频次与权重勋章 (如 "5年12考", "高考压轴必考") */
  frequencyBadge: string
  /** 破题切入点与物理机制概述 */
  summary: string
  /** 关联的知识树节点 ID (与 knowledgeTree 零冗余整合) */
  knowledgeId: string
  /** 扩展关联的多个知识树节点 ID 列表 */
  knowledgeIds?: string[]
  /** 对应的仿真动画 ID (直接调起 animationRegistry) */
  animId: string
  /** 辅助关联的第二个仿真动画 ID (如斜抛运动) */
  secondaryAnimId?: string
  /** 一键装载参数 */
  presetParams?: Record<string, number>
  /** 辅助动画一键装载参数 */
  secondaryPresetParams?: Record<string, number>
  /** 秒杀速算公式与点拨 */
  quickFormula: MasterModelQuickFormula
  /** 高考易错踩坑点 */
  examTips: string[]
  /** 关联的高考真题 ID 列表 (同源变式链，与 problems 整合) */
  relatedProblemIds: string[]
}
