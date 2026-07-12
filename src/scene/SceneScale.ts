import type { VectorType } from '../theme/physics/vectorStyle';
import type { SceneConfig } from './SceneConfig';
import type { SceneLayoutProfile, SceneLayoutMode } from './SceneLayoutProfile';

export interface SceneScale {
  scaleX: number;
  scaleY: number;
  scale: number;
  originX: number;
  originY: number;
  maxVectorLength: number;
  refMagnitudes?: Partial<Record<VectorType, number>>;
  /** 标记非等比缩放是设计需求（如 X 映射链长、Y 映射振幅），VectorArrow 跳过 warning */
  intentionalNonUniformScale?: boolean;
}

export function createSceneScale(config: SceneConfig): SceneScale {
  const { vectorBounds, worldWidth, worldHeight, originX, originY, refMagnitudes } = config;
  const maxVectorLength = Math.min(vectorBounds.width, vectorBounds.height) * 0.3;

  if (worldWidth !== undefined && worldHeight !== undefined) {
    const scaleX = vectorBounds.width / worldWidth;
    const scaleY = vectorBounds.height / worldHeight;
    return {
      scaleX,
      scaleY,
      scale: Math.min(scaleX, scaleY),
      originX,
      originY,
      maxVectorLength,
      refMagnitudes,
    };
  }

  return {
    scaleX: 1,
    scaleY: 1,
    scale: 1,
    originX,
    originY,
    maxVectorLength,
    refMagnitudes,
  };
}

export function worldToPixel(
  wx: number,
  wy: number,
  scene: SceneScale,
): { px: number; py: number } {
  return {
    px: scene.originX + wx * scene.scaleX,
    py: scene.originY - wy * scene.scaleY,
  };
}

/**
 * worldToPixel 的语义别名 — 输出是设计坐标（design-unit），不是容器像素。
 * 在 `<g transform={vp.transform}>` 内使用时，viewport transform 会将设计坐标映射到容器像素。
 *
 * 新代码统一使用 worldToDesign，旧代码逐步替换。
 */
export const worldToDesign = worldToPixel

// ═══════════════════════════════════════════════════════════════════════════
// 设计坐标中心工厂
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// 设计坐标中心工厂（对象参数版）
// ═══════════════════════════════════════════════════════════════════════════

export interface DesignCenterSceneScaleOptions {
  designWidth: number
  designHeight: number
  centerX: number
  centerY: number
  scale: number
  refMagnitudes?: Partial<Record<VectorType, number>>
  /** 覆盖默认 maxVectorLength（默认 min(designW, designH) * 0.3） */
  maxVectorLength?: number
}

/**
 * 从设计坐标中心点与缩放生成 SceneScale。
 *
 * 用于场景需要以设计空间某点为物理原点（如圆周运动中心、摆的悬挂点）
 * 且物体坐标需要从物理单位缩放到设计坐标的场景。
 *
 * VectorArrow 的 origin 输出（y↑正方向，与 VectorArrow 内部 y-flip 一致）：
 *   x1 = centerX + physics.x * scale
 *   y1 = centerY - physics.y * scale
 *
 * 调用方的物体坐标（ballPos 等）必须使用相同公式，保证对齐：
 *   cx = centerX + physics.x * scale
 *   cy = centerY - physics.y * scale
 */
export function createSceneScaleFromDesignCenter(
  options: DesignCenterSceneScaleOptions,
): SceneScale {
  return {
    originX: options.centerX,
    originY: options.centerY,
    scaleX: options.scale,
    scaleY: options.scale,
    scale: options.scale,
    maxVectorLength: options.maxVectorLength ?? Math.min(options.designWidth, options.designHeight) * 0.3,
    refMagnitudes: options.refMagnitudes,
    intentionalNonUniformScale: false,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Viewport 集成
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 恒等场景缩放 — 用于「固定像素长度」场景，
 * 配合 VectorArrow 的 pixelLength prop 手动控制矢量长度。
 *
 * 不走 refMagnitudes 归一化，maxVectorLength 设为 1（非 999 魔法数字），
 * 表示「无参考量级，长度完全由 pixelLength 决定」。
 */
export const IDENTITY_SCENE_SCALE: SceneScale = {
  originX: 0,
  originY: 0,
  scaleX: 1,
  scaleY: 1,
  scale: 1,
  maxVectorLength: 1,
} as const;

/**
 * 计算默认的 maxVectorLength，感知 layoutMode 以避免 splitH 下矢量过短。
 *
 * @param vectorBounds 矢量边界
 * @param layoutMode 中心区域布局模式（'splitH' | 'splitV' | undefined）
 * @returns 默认的 maxVectorLength（像素）
 */
function getDefaultMaxVectorLength(
  vectorBounds: { width: number; height: number },
  layoutMode?: 'splitH' | 'splitV'
): number {
  if (layoutMode === 'splitH') {
    // splitH 下宽度被压缩，使用更宽松的系数避免矢量过短
    // 宽度系数 0.45，高度系数 0.3，取较小值
    return Math.min(vectorBounds.width * 0.45, vectorBounds.height * 0.3)
  }
  // 默认：使用规范的 min(w,h) × 0.3
  return Math.min(vectorBounds.width, vectorBounds.height) * 0.3
}

/**
 * 从 ViewportInfo 构造 SceneScale，确保矢量归一化与可视区域对齐。
 *
 * - mode='transform'   : vectorBounds 使用设计坐标 (0,0,designW,designH)
 * - mode='visibleArea' : ⚠️ @deprecated 输出容器像素单位，不适合在 `<g transform={vp.transform}>` 内使用。
 *   请改用 `useSceneScale({ anchor: 'viewport' })`，输出设计坐标。
 * - mode='centerScale' : ⚠️ @deprecated 输出容器像素单位，不适合在 `<g transform={vp.transform}>` 内使用。
 *   请改用 `useSceneScale({ anchor: 'center' })`，输出设计坐标。
 *
 * 注意：此函数不感知 presetCompensation。若组件同时依赖 vp.scale（含补偿）
 * 和 SceneScale（纯几何），需在调用侧对齐坐标系（如 Kepler/Satellite 的
 * worldWidth: vp.visibleW / 物理scale 做法）。
 *
 * @throws 当 profile 或 layout mode 为 null/undefined 时抛出明确错误（避免旧组件静默失败）
 */
export function createSceneScaleFromViewport(
  vp: { visibleX: number; visibleY: number; visibleW: number; visibleH: number; centerX: number; centerY: number },
  profileOrMode: SceneLayoutProfile | SceneLayoutMode | undefined,
  options?: {
    designWidth?: number;
    designHeight?: number;
    worldWidth?: number;
    worldHeight?: number;
    refMagnitudes?: Partial<Record<VectorType, number>>;
    /** 覆盖默认的 maxVectorLength 计算（像素）。传入后跳过 layout-aware 默认算法 */
    maxVectorLength?: number;
    /** 中心区域布局模式（'splitH' | 'splitV'），用于 layout-aware 默认算法 */
    centerLayout?: 'splitH' | 'splitV';
    /** 标记非等比缩放是设计需求，透传到返回的 SceneScale */
    intentionalNonUniformScale?: boolean;
  }
): SceneScale {
  if (!profileOrMode) {
    throw new Error(
      '[createSceneScaleFromViewport] sceneLayout profile 未定义。' +
      '请在 AnimationConfig.sceneLayout 中声明，或传入布局模式字面量（如 "visibleArea"）。'
    )
  }

  const profile: SceneLayoutProfile = typeof profileOrMode === 'string'
    ? {
        mode: profileOrMode,
        designWidth: options?.designWidth ?? vp.visibleW,
        designHeight: options?.designHeight ?? vp.visibleH,
        worldWidth: options?.worldWidth,
        worldHeight: options?.worldHeight,
        refMagnitudes: options?.refMagnitudes,
      }
    : profileOrMode

  const sceneConfig: SceneConfig = (() => {
    switch (profile.mode) {
      case 'transform':
        return {
          vectorBounds: { x: 0, y: 0, width: profile.designWidth, height: profile.designHeight },
          originX: 0, originY: 0,
          worldWidth: profile.designWidth, worldHeight: profile.designHeight,
          refMagnitudes: profile.refMagnitudes,
        }
      case 'visibleArea':
        return {
          vectorBounds: { x: vp.visibleX, y: vp.visibleY, width: vp.visibleW, height: vp.visibleH },
          originX: vp.visibleX, originY: vp.visibleY,
          worldWidth: vp.visibleW, worldHeight: vp.visibleH,
          refMagnitudes: profile.refMagnitudes,
        }
      case 'centerScale':
        return {
          vectorBounds: { x: vp.visibleX, y: vp.visibleY, width: vp.visibleW, height: vp.visibleH },
          originX: vp.centerX, originY: vp.centerY,
          worldWidth: profile.worldWidth ?? profile.designWidth,
          worldHeight: profile.worldHeight ?? profile.designHeight,
          refMagnitudes: profile.refMagnitudes,
        }
    }
  })()

  // 构造 SceneScale，应用 maxVectorLength 覆盖或 layout-aware 默认算法
  const base = createSceneScale(sceneConfig)
  if (options?.maxVectorLength != null) {
    base.maxVectorLength = options.maxVectorLength
  } else {
    base.maxVectorLength = getDefaultMaxVectorLength(sceneConfig.vectorBounds, options?.centerLayout)
  }
  if (options?.intentionalNonUniformScale) {
    base.intentionalNonUniformScale = true
  }
  return base
}
