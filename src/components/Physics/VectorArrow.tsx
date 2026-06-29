import type { Vector2 } from '../../physics/Vector2';
import { magnitude, normalize } from '../../physics/Vector2';
import type { SceneScale } from '../../scene/SceneScale';
import type { VectorType } from '../../theme/physics/vectorStyle';
import { VECTOR_COLORS } from '../../theme/physics/vectorStyle';
import { calculateVectorPixelLength } from '../../utils/vectorLength';

/**
 * 矢量箭头组件 Props
 */
interface VectorArrowProps {
  /** 矢量起点（物理坐标） */
  origin: Vector2
  /** 矢量值（物理坐标，y↑正方向） */
  vector: Vector2
  /** 矢量类型（决定默认颜色和参考量级） */
  type: VectorType
  /** 场景缩放参数（含 originX/Y、scaleX/Y、refMagnitudes） */
  sceneScale: SceneScale
  /** 自定义颜色（覆盖 VECTOR_COLORS[type]） */
  color?: string
  /** 自定义线宽 */
  strokeWidth?: number
  /** 自定义像素长度（覆盖自动计算） */
  pixelLength?: number
  /** 自定义参考量级（覆盖 sceneScale.refMagnitudes[type]） */
  refMagnitude?: number
  /** 矢量符号名称标签 */
  label?: string
  /** 是否使用虚线箭头 */
  dashed?: boolean
  /** 是否在箭头外侧增加发光阴影，提高对比度 */
  glow?: boolean
  /** 字体缩放函数（由父组件 useCanvasSize 提供） */
  font?: (base: number) => number
}

function perpendicular(v: Vector2): Vector2 {
  return { x: -v.y, y: v.x };
}

/**
 * 矢量箭头渲染组件
 *
 * 将物理矢量（物理坐标 y↑正方向）渲染为 SVG 箭头：
 * - 通过 SceneScale 将物理坐标转换为像素坐标
 * - 箭头长度通过 calculateVectorPixelLength 基于 refMagnitudes 归一化
 * - 箭头头部为三角形，线宽按箭头长度比例自适应
 * - 零矢量返回 null，不渲染
 */
export function VectorArrow({
  origin,
  vector,
  type,
  sceneScale,
  color,
  strokeWidth,
  pixelLength: overrideLength,
  refMagnitude: overrideRefMag,
  label,
  dashed,
  glow,
  font = (n: number) => n,
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

  const pxDirX = dir.x;
  const pxDirY = -dir.y;

  let textAnchor: 'start' | 'end' | 'middle' = 'middle';
  if (pxDirX > 0.3) {
    textAnchor = 'start';
  } else if (pxDirX < -0.3) {
    textAnchor = 'end';
  }

  let dy = '0.35em';
  if (pxDirY > 0.5) {
    dy = '1em';
  } else if (pxDirY < -0.5) {
    dy = '-0.3em';
  }

  const textX = tipX + pxDirX * 10;
  const textY = tipY + pxDirY * 10;

  const filterStyle = glow ? { filter: `drop-shadow(0px 0px 3.5px ${fillColor})` } : undefined;

  return (
    <g style={filterStyle}>
      {lineLen > 0 && (
        <line
          x1={x1}
          y1={y1}
          x2={lineEndX}
          y2={lineEndY}
          stroke={fillColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          {...(dashed ? { strokeDasharray: '4 4' } : {})}
        />
      )}
      {dashed ? (
        <polygon
          points={`${baseLeftX},${baseLeftY} ${tipX},${tipY} ${baseRightX},${baseRightY}`}
          fill="none"
          stroke={fillColor}
          strokeWidth={Math.max(1.2, stroke * 0.7)}
          strokeLinejoin="round"
        />
      ) : (
        <polygon
          points={`${baseLeftX},${baseLeftY} ${tipX},${tipY} ${baseRightX},${baseRightY}`}
          fill={fillColor}
        />
      )}
      {label && (
        <text
          x={textX}
          y={textY}
          fill={fillColor}
          fontSize={font(11)}
          fontWeight="bold"
          textAnchor={textAnchor}
          dy={dy}
        >
          {label}
        </text>
      )}
    </g>
  );
}
