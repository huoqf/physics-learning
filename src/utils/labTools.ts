import type { AnimationConfig, LabToolCapability } from '@/data/types'

/**
 * 全库实际消费 `showTimeSlices`（频闪/时间切片残影）的运动学与动力学动画 ID 白名单。
 * 只有对应场景组件从 store 订阅 `showTimeSlices` 并渲染残影时才可加入此集合。
 */
export const STROBE_CAPABLE_IDS: ReadonlySet<string> = new Set([
  'anim-free-fall',
  'anim-projectile',
  'anim-block-board',
])

/**
 * 适合同屏虚影对照（`ghostOverlay`，快照记录历史运动轨迹/形态虚影）的动画 ID 白名单。
 * 严格限定为空间轨迹清晰可分的运动学、动力学、圆周/天体、能量/动量模型、简谐振动及磁场/电场偏转粒子动画；
 * 显式排除静力学受力图、仪器读数实验、波动干涉/声学与纯概念/图像推导页，避免虚影文字叠影。
 */
export const GHOST_OVERLAY_CAPABLE_IDS: ReadonlySet<string> = new Set([
  // 运动学轨迹（6）
  'anim-chase-meeting',
  'anim-uniform-acceleration',
  'anim-free-fall',
  'anim-vertical-throw',
  'anim-projectile',
  'anim-oblique-throw',
  // 动力学运动过程（5）
  'anim-inclined-plane',
  'anim-conveyor',
  'anim-newton-second',
  'anim-connected-bodies',
  'anim-block-board',
  // 圆周与万有引力轨道（8）
  'anim-circular-motion',
  'anim-centripetal',
  'anim-vertical-circular',
  'anim-circular-models',
  'anim-kepler',
  'anim-satellite',
  'anim-binary-stars',
  'anim-orbit-transfer',
  // 机械能与动量碰撞过程（8）
  'anim-energy-conservation',
  'anim-vertical-spring',
  'anim-light-rod-rope',
  'anim-momentum-conservation',
  'anim-collision',
  'anim-curved-slot',
  'anim-spring-blocks',
  'anim-bullet-block',
  'anim-man-boat',
  // 简谐振动与单摆（2）
  'anim-simple-harmonic',
  'anim-simple-pendulum',
  // 电磁场与核衰变磁场中带电粒子偏转轨迹（6）
  'anim-charge-in-efield',
  'anim-charge-in-bfield',
  'anim-lorentz-force',
  'anim-combined-fields',
  'anim-magnetic-circular-geom',
  'anim-decay-magnetic-orbit',
])

/**
 * 解析动画页应当暴露的实验室辅助工具能力（strobe / ghostOverlay / chartCompare）。
 * 若注册表条目显式声明了 `config.labTools`，以显式声明为准；
 * 否则严格按 `STROBE_CAPABLE_IDS` 与 `GHOST_OVERLAY_CAPABLE_IDS` 白名单判定，不再按整科默认开启虚影。
 */
export function resolveLabTools(
  config: Pick<AnimationConfig, 'id' | 'labTools'>,
  _moduleName?: string,
): readonly LabToolCapability[] {
  if (config.labTools !== undefined) {
    return config.labTools
  }

  const tools: LabToolCapability[] = []
  if (STROBE_CAPABLE_IDS.has(config.id)) {
    tools.push('strobe')
  }
  if (GHOST_OVERLAY_CAPABLE_IDS.has(config.id)) {
    tools.push('ghostOverlay')
  }
  return tools
}

export function hasLabTool(
  tools: readonly LabToolCapability[],
  tool: LabToolCapability,
): boolean {
  return tools.includes(tool)
}
