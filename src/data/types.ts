import type { LazyExoticComponent, ComponentType } from 'react'
import type { DiscoveryStepData } from '@/components/UI/DiscoveryGuide'
import type { SceneLayoutProfile } from '@/scene'

export interface KnowledgeNode {
  id: string
  title: string
  chapter: string
  module: string
  importance: 'basic' | 'core' | 'gaokao' | 'hard' | 'extend'
  animationIds: string[]
  problemIds: string[]
  prerequisites: string[]
  parentId?: string
}

export type ParamImportance = 'core' | 'advanced' | 'display'

export type ParamMarkVariant = 'zero' | 'critical' | 'recommended'

export interface ParamMark {
  /** 标记对应的参数值 */
  value: number
  /** 标记文本；不传则仅显示刻度线 */
  label?: string
  /** 标记语义：零点 / 临界值 / 推荐值 */
  variant?: ParamMarkVariant
}

export interface ControlCondition {
  /** 参数分组，例如"模型选择 / 显示辅助 / 教学提示" */
  group?: string
  /** 仅当 params[showIf] 为真值时显示此控件 */
  showIf?: string
  /** 仅当 params[showIf] 等于此值时显示此控件 */
  showIfValue?: number
  /** 当 params[hideIf] 等于此值时隐藏此控件 */
  hideIf?: string
  /** 与 hideIf 配合：当 params[hideIf] 等于此值时隐藏 */
  hideIfValue?: number
  /** 控件值变化后联动：重置指定参数为默认值，或设置指定参数为固定值 */
  onChangeSideEffect?: {
    /** 重置为 defaultParams 中的值 */
    resetParams?: string[]
    /** 设置为指定值 */
    setParams?: Record<string, number>
  }
}

export interface ControlOption {
  value: number
  label: string
  description?: string
}

export type ControlMeta =
  | (ControlCondition & {
      type: 'number'
      key: string
      label: string
      min: number
      max: number
      step?: number
      unit?: string
      description?: string
      resetOnChange?: boolean
    })
  | (ControlCondition & {
      type: 'segmented'
      key: string
      label: string
      options: ControlOption[]
      resetOnChange?: boolean
    })
  | (ControlCondition & {
      type: 'toggle'
      key: string
      label: string
      trueValue?: number
      falseValue?: number
      resetOnChange?: boolean
    })
  | (ControlCondition & {
      type: 'preset'
      label: string
      params: Record<string, number> | ((current: Record<string, number>) => Record<string, number>)
      description?: string
      resetOnApply?: boolean
      restartOnApply?: boolean
    })
  | (ControlCondition & {
      type: 'tip'
      title?: string
      content: string | ((params: Record<string, number>) => string)
      variant?: 'info' | 'primary' | 'warning'
    })
  | (ControlCondition & {
      type: 'action'
      label: string
      variant?: 'primary' | 'secondary' | 'danger'
      action: 'launch' | 'restart' | 'reset' | 'setDirection' | 'setDirectionAndRestart' | 'resetAndRestart'
      directionValue?: 1 | -1
      /** 动作执行前先设置指定参数 */
      setParams?: Record<string, number>
    })
  | (ControlCondition & {
      type: 'storeToggle'
      label: string
      storeKey: 'toggleVectors' | 'toggleTimeSlices' | 'toggleDualObjects'
      stateKey: 'showVectors' | 'showTimeSlices' | 'showDualObjects'
    })

/** 参数控件元数据 */
export interface ParamMeta {
  key: string
  label: string
  min: number
  max: number
  step?: number
  unit?: string
  /** 参数分组，例如“核心参数 / 显示辅助 / 进阶参数” */
  group?: string
  /** 参数教学说明，显示在控件标签下方 */
  description?: string
  /** 关键标记：零点、临界点、推荐值等 */
  marks?: ParamMark[]
  /** 参数重要性，用于左屏视觉层级 */
  importance?: ParamImportance
  /** 此参数变化后是否重置动画时间 */
  resetOnChange?: boolean
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
  /** 设置播放方向：1=正向，-1=逆向 */
  setDirection: (d: 1 | -1) => void
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
  /** 切换受力/速度/加速度矢量显示 */
  toggleVectors?: () => void
  disabled?: boolean
}

export interface AnimationConfig<P extends Record<string, number> = Record<string, number>> {
  id: string
  title: string
  knowledgeId: string
  Component: LazyExoticComponent<ComponentType> & { preload?: () => Promise<void> }
  defaultParams: P
  /** 参数控件元数据（替代页面层硬编码的 paramConfigs） */
  paramMeta?: ParamMeta[]
  /** 左屏声明式控件元数据：模式、开关、预设、提示等；用于逐步收敛 SidebarExtra */
  controlMeta?: ControlMeta[]
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
  /** 上下分区布局下，指定上方 CenterExtra 容器的高度类 (如 'h-[175px]')，未指定则默认 'h-1/2' */
  centerExtraHeight?: string
  /** 当 params[centerExtraMode] === 1 时，CenterExtra 接管全屏布局（替代页面层 id===硬编码） */
  centerExtraMode?: string
  /** 可选：有物理状态需要每帧计算的动画才声明（如粒子轨迹） */
  updatePhysics?: (
    params: P,
    t: number,
    dt: number,
  ) => Partial<import('@/stores').PhysicsState> | null
  /**
   * 动画最大可播放时间（秒）。不传则走全局默认 30s。
   *
   * 适用场景：长时观察类（收尾速度、长时演化、循环周期长等）。
   * 例如「力与运动专题」的恒力加速 / 收尾速度模式，30s 不够覆盖
   * 完整观察过程，会让位移在 30s 处变成水平线，造成「卡住」错觉。
   *
   * 默认值在 useAnimationLifecycle 内：`config?.maxTime ?? 30`。
   */
  maxTime?: number
  /** 场景布局 profile：声明组件如何消费 ViewportInfo，用于 createSceneScaleFromViewport */
  sceneLayout?: SceneLayoutProfile
  /**
   * 播放控制器渲染模式（静态或动态）：
   * - `'timed'`（默认）：完整控制栏（播放/暂停 + 速度 + 进度条）
   * - `'loop'`：精简控制栏（仅速度选择器 + 循环运行中徽章，无暂停/进度）；加载即自动播放
   * - `'param'`：替换为参数提示信息条（💡 通过左侧参数面板实时调节）
   * - `'pause-only'`：仅暂停/继续按钮（无播放启动、无重置、无速度、无进度条）
   *   适用场景：动画由左屏开关/交互触发（如绳与弹簧瞬时切断），不需要"播放"启动按钮，
   *   但需要在播放过程中暂停分析、暂停后继续播放。到达 maxTime 后自动停止。
   *
   * 也可传入函数 `(params) => mode`，根据当前参数动态决定模式。
   * 例：进阶竖直圆需要暂停分析 → `(p) => p.advancedMode === 1 ? 'timed' : 'loop'`
   * 例：绳与弹簧切断模式 → `(p) => p.mode === 1 ? 'pause-only' : 'param'`
   */
  controlsMode?: 'timed' | 'loop' | 'param' | 'pause-only' | ((params: Record<string, number>) => 'timed' | 'loop' | 'param' | 'pause-only')
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
