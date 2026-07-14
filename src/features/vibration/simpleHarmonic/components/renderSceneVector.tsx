import { VectorArrow } from '@/components/Physics'
import type { CanvasSize } from '@/utils/useCanvasSize'

/** 场景矢量渲染助手（位移 / 速度 / 加速度 / 力） */
export function renderSceneVector(
  startX: number,
  startY: number,
  vx: number,
  vy: number,
  length: number,
  color: string,
  type: 'displacement' | 'velocity' | 'acceleration' | 'force',
  font: CanvasSize['font'],
  label?: string,
) {
  if ((vx === 0 && vy === 0) || length <= 1) return null
  const mag = Math.sqrt(vx * vx + vy * vy)
  const dx = vx / mag
  const dy = vy / mag

  return (
    <VectorArrow
      originDesign={{ x: startX, y: startY }}
      vector={{ x: dx, y: dy }}
      type={type === 'force' ? 'force' : type}
      arrowType="physical-schematic"
      sceneScale={{
        scaleX: 1,
        scaleY: 1,
        scale: 1,
        originX: startX,
        originY: startY,
        maxVectorLength: length,
        refMagnitudes: {},
      }}
      color={color}
      pixelLength={length}
      font={font}
      label={label}
      glow
    />
  )
}
