import type { VectorType } from '../theme/physics/vectorStyle';
import type { SceneConfig } from './SceneConfig';

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
