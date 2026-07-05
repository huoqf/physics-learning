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
 * 从 ViewportInfo 构造 SceneScale，确保矢量归一化与可视区域对齐。
 *
 * - mode='transform'   : vectorBounds 使用设计坐标 (0,0,designW,designH)
 * - mode='visibleArea' : vectorBounds 使用可视区域 (visibleX,visibleY,visibleW,visibleH)
 * - mode='centerScale' : vectorBounds 以 centerX/centerY 为原点
 *
 * @throws 当 profile 或 layout mode 为 null/undefined 时抛出明确错误（避免旧组件静默失败）
 */
export function createSceneScaleFromViewport(
  vp: { visibleX: number; visibleY: number; visibleW: number; visibleH: number; centerX: number; centerY: number },
  profileOrMode: SceneLayoutProfile | SceneLayoutMode | undefined,
  options?: { designWidth?: number; designHeight?: number; worldWidth?: number; worldHeight?: number; refMagnitudes?: Partial<Record<VectorType, number>> }
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
  return createSceneScale(sceneConfig)
}
