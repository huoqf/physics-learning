import type { LazyExoticComponent, ComponentType } from 'react'
import type { DiscoveryStepData } from '@/components/UI/DiscoveryGuide'

export interface KnowledgeNode {
  id: string
  title: string
  chapter: string
  module: string
  importance: 'basic' | 'core' | 'gaokao' | 'hard' | 'extend'
  animationIds: string[]
  problemIds: string[]
  prerequisites: string[]
}

/** 参数控件元数据 */
export interface ParamMeta {
  key: string
  label: string
  min: number
  max: number
  step?: number
  unit?: string
  /** 仅当 params[showIf] 为真值时显示此参数 */
  showIf?: string
  /** 仅当 params[showIf] 等于此值时显示此参数 */
  showIfValue?: number
  /** 当 params[hideIf] 等于此值时隐藏此参数（反向条件） */
  hideIf?: string
  /** 与 hideIf 配合：当 params[hideIf] 等于此值时隐藏 */
  hideIfValue?: number
}

/** 动画控制动作（语义化封装，SidebarExtra 不直接访问 store） */
export interface AnimationActions {
  /** 重置时间 + 暂停播放 */
  resetAnimation: () => void
  /** 暂停播放 */
  pauseAnimation: () => void
  /** 重置时间 + 开始播放 */
  restartAnimation: () => void
}

/** 侧边栏扩展组件 props */
export interface SidebarExtraProps {
  params: Record<string, number>
  updateParam: (key: string, value: number) => void
  /** 批量更新参数 */
  setParams: (params: Record<string, number>) => void
  /** 动画控制动作（语义化封装） */
  animationActions: AnimationActions
  /** 是否显示时间切片（仅特定动画使用） */
  showTimeSlices?: boolean
  /** 切换时间切片显示（仅特定动画使用） */
  toggleTimeSlices?: () => void
  /** 是否显示双物体对比（仅特定动画使用） */
  showDualObjects?: boolean
  /** 切换双物体对比（仅特定动画使用） */
  toggleDualObjects?: () => void
  disabled?: boolean
}

export interface AnimationConfig {
  id: string
  title: string
  knowledgeId: string
  Component: LazyExoticComponent<ComponentType>
  defaultParams: Record<string, number>
  /** 参数控件元数据（替代页面层硬编码的 paramConfigs） */
  paramMeta?: ParamMeta[]
  /** 是否支持发现模式 */
  supportsDiscovery?: boolean
  /** 发现模式组件（lazy 加载） */
  DiscoveryComponent?: LazyExoticComponent<ComponentType>
  /** 发现模式步骤（lazy 加载） */
  discoverySteps?: () => Promise<{ default: DiscoveryStepData[] }>
  /** 左侧侧边栏扩展组件（环境预设、时间切片等特异 UI） */
  SidebarExtra?: LazyExoticComponent<ComponentType<SidebarExtraProps>>
  /** 中心区域扩展组件（VT图+公式面板等，动画模式下动画上方的特异布局） */
  CenterExtra?: LazyExoticComponent<ComponentType>
  /** 当 params[centerExtraMode] === 1 时，CenterExtra 接管全屏布局（替代页面层 id===硬编码） */
  centerExtraMode?: string
  /** 可选：有物理状态需要每帧计算的动画才声明（如粒子轨迹） */
  updatePhysics?: (
    params: Record<string, number>,
    t: number,
    dt: number,
  ) => Partial<import('@/stores').PhysicsState> | null
}

export interface Problem {
  id: string
  year: number
  province: string
  title: string
  content: string
  difficulty: 1 | 2 | 3 | 4 | 5
  knowledgeIds: string[]
  steps: ProblemStep[]
}

export interface ProblemStep {
  id: string
  description: string
  formula?: string
  svgContent?: string
  explanation: string
  knowledgeId?: string
}
