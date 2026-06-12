import type { Vector2 } from '../../physics/Vector2';
import { magnitude, normalize } from '../../physics/Vector2';
import type { SceneScale } from '../../scene/SceneScale';
import type { VectorType } from '../../theme/physics/vectorStyle';
import { VECTOR_COLORS } from '../../theme/physics/vectorStyle';
import { calculateVectorPixelLength } from '../../utils/vectorLength';

interface VectorArrowProps {
  origin: Vector2;
  vector: Vector2;
  type: VectorType;
  sceneScale: SceneScale;
  color?: string;
  strokeWidth?: number;
  pixelLength?: number;
  refMagnitude?: number;
}

function perpendicular(v: Vector2): Vector2 {
  return { x: -v.y, y: v.x };
}

export function VectorArrow({
  origin,
  vector,
  type,
  sceneScale,
  color,
  strokeWidth,
  pixelLength: overrideLength,
  refMagnitude: overrideRefMag,
}: VectorArrowProps) {
  if (magnitude(vector) === 0) return null;

  const dir = normalize(vector);
  const refMag = overrideRefMag ?? sceneScale.refMagnitudes?.[type] ?? 0;
  const totalLength =
    overrideLength ??
    calculateVectorPixelLength(magnitude(vector), type, sceneScale.maxVectorLength, refMag);

  const headLen = Math.max(7, Math.min(16, totalLength * 0.28));
  const lineLen = Math.max(0, totalLength - headLen);
  const headWidth = headLen * 0.6;

  const x1 = sceneScale.originX + origin.x * sceneScale.scaleX;
  const y1 = sceneScale.originY - origin.y * sceneScale.scaleY;

  const lineEndX = x1 + dir.x * lineLen;
  const lineEndY = y1 - dir.y * lineLen;

  const tipX = x1 + dir.x * totalLength;
  const tipY = y1 - dir.y * totalLength;

  const perp = perpendicular(dir);
  const baseLeftX = lineEndX + perp.x * (headWidth / 2);
  const baseLeftY = lineEndY - perp.y * (headWidth / 2);
  const baseRightX = lineEndX - perp.x * (headWidth / 2);
  const baseRightY = lineEndY + perp.y * (headWidth / 2);

  const fillColor = color ?? VECTOR_COLORS[type];
  const stroke = strokeWidth ?? Math.max(3, totalLength * 0.04);

  return (
    <g>
      {lineLen > 0 && (
        <line
          x1={x1}
          y1={y1}
          x2={lineEndX}
          y2={lineEndY}
          stroke={fillColor}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      )}
      <polygon
        points={`${baseLeftX},${baseLeftY} ${tipX},${tipY} ${baseRightX},${baseRightY}`}
        fill={fillColor}
      />
    </g>
  );
}
