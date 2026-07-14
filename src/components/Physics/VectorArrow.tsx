import type { Vector2 } from '../../physics/Vector2';
import { magnitude, normalize } from '../../physics/Vector2';
import type { SceneScale } from '../../scene/SceneScale';
import type { VectorType } from '../../theme/physics/vectorStyle';
import { VECTOR_COLORS } from '../../theme/physics/vectorStyle';
import { calculateVectorPixelLength } from '../../utils/vectorLength';

/**
 * 箭头用途分类（Phase 2 标注）
 *
 * - `physical-real`：物理量矢量（力/速度/加速度），需物理正确（位置、方向、大小均来自物理模型）
 * - `physical-schematic`：物理量示意箭头，方向正确但长度不严格（如受力分析图中的辅助箭头）
 * - `visual-only`：纯视觉标注（UI 引导、方向提示、装饰箭头）
 */
export type ArrowType = 'physical-real' | 'physical-schematic' | 'visual-only'

/**
 * 矢量箭头组件 Props
 *
 * 【起点坐标】二选一：
 * - `origin`：物理坐标（米），由 sceneScale 转换为设计坐标。物理 y↑正方向。
 * - `originDesign`：设计坐标（design-unit），在 `<g transform={vp.transform}>` 内直接使用，跳过 sceneScale 转换。
 *   遵循 SVG 坐标系（y↓正方向），调用方需自行完成物理→设计的 y 翻转。
 *   可通过 `worldToDesign(物理x, 物理y, sceneScale)` 获取。
 *
 * ⚠️ 同时传入两者时，originDesign 优先，origin 被忽略。
 */
interface VectorArrowProps {
  /** 矢量起点（物理坐标，米，y↑正方向，sceneScale 会将其转换为设计坐标） */
  origin?: Vector2
  /** 矢量起点（设计坐标，y↓正方向，在 `<g transform={vp.transform}>` 内直接使用） */
  originDesign?: { x: number; y: number }
  /** @deprecated Use originDesign instead */
  originPixel?: { x: number; y: number }
  /** 矢量值（物理坐标，y↑正方向） */
  vector: Vector2
  /** 矢量类型（决定默认颜色和参考量级） */
  type: VectorType
  /** 箭头用途分类：physical-real（物理正确）/ physical-schematic（示意）/ visual-only（纯视觉） */
  arrowType?: ArrowType
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
  originDesign,
  originPixel,
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

  // originDesign 优先，originPixel 为 deprecated alias
  const resolvedOriginDesign = originDesign ?? originPixel

  if (origin && resolvedOriginDesign) {
    console.warn(
      '[VectorArrow] 同时传入 origin 和 originDesign，origin 将被忽略。请只使用其中一个。'
    );
  }

  if (originPixel && !originDesign) {
    console.warn(
      '[VectorArrow] originPixel is deprecated, use originDesign instead.'
    );
  }

  if (process.env.NODE_ENV !== 'production' && sceneScale.scaleX !== sceneScale.scaleY && !sceneScale.intentionalNonUniformScale) {
    console.warn(
      `[VectorArrow] sceneScale 非等比缩放 (scaleX=${sceneScale.scaleX}, scaleY=${sceneScale.scaleY})，` +
      '矢量方向可能失真。如需非等比缩放，请确认这是有意为之。'
    );
  }

  const dir = normalize(vector);
  const refMag = overrideRefMag ?? sceneScale.refMagnitudes?.[type] ?? 0;
  const totalLength =
    overrideLength ??
    calculateVectorPixelLength(magnitude(vector), type, sceneScale.maxVectorLength, refMag);

  const headLen = Math.max(7, Math.min(16, totalLength * 0.28));
  const lineLen = Math.max(0, totalLength - headLen);
  const headWidth = headLen * 0.6;

  // 支持两种起点：设计坐标（直接使用）或物理坐标（通过 sceneScale 转换）
  const x1 = resolvedOriginDesign ? resolvedOriginDesign.x : sceneScale.originX + (origin?.x ?? 0) * sceneScale.scaleX;
  const y1 = resolvedOriginDesign ? resolvedOriginDesign.y : sceneScale.originY - (origin?.y ?? 0) * sceneScale.scaleY;

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
