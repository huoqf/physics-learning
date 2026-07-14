import { VectorArrow } from '@/components/Physics'
import type { SceneScale } from '@/scene'
import type { VectorType } from '@/theme/physics/vectorStyle'
import type { CanvasSize } from '@/utils/useCanvasSize'

export const REF_MAGNITUDES = {
  electricForce: 2e-15,
  magneticForce: 2e-15,
  acceleration: 4e7,
}

const MAX_VECTOR_LEN = 45

export function renderVectorArrow(
  sx: number,
  sy: number,
  dx: number,
  dy: number,
  mag: number,
  refMag: number,
  color: string,
  type: VectorType,
  label: string,
  font: CanvasSize['font'],
) {
  const len = Math.max(10, Math.min(MAX_VECTOR_LEN, (mag / refMag) * MAX_VECTOR_LEN))
  const sceneScale: SceneScale = {
    scaleX: 1,
    scaleY: 1,
    scale: 1,
    originX: sx,
    originY: sy,
    maxVectorLength: len,
    refMagnitudes: {},
  }
  return (
    <VectorArrow
      vector={{ x: dx, y: dy }}
      type={type}
      sceneScale={sceneScale}
      color={color}
      pixelLength={len}
      font={font}
      label={label}
    />
  )
}
