import { SVGProps } from 'react';
import { SCENE_COLORS, PHYSICS_COLORS } from '@/theme/physics';

export interface InclineProps extends SVGProps<SVGGElement> {
  /** 斜面基准底点 (直角所在侧或底角起点) 的 X 轴像素坐标 */
  x0: number;
  /** 斜面底边水平线所在 Y 轴像素坐标 */
  y0: number;
  /** 斜面底边宽度 (像素) */
  width: number;
  /** 斜面垂直高度 (像素) */
  height: number;
  /** 倾斜方向：'right' (默认，直角在左，左高右低) | 'left' (直角在右，右高左低) */
  direction?: 'right' | 'left';
  /** 是否绘制倾角弧线标注 */
  showAngleArc?: boolean;
  /** 倾角文字标注，默认 'θ' */
  angleLabel?: string;
  /** 是否在斜面底部绘制固定斜面的阴影/斜线剖面 */
  showHatch?: boolean;
  /** 填充颜色，默认使用物理材质的 pale 填充 */
  fill?: string;
  /** 描边颜色，默认使用物理材质的 mid 描边 */
  stroke?: string;
  /** 描边像素宽度，默认 1.5 */
  strokeWidth?: number;
}

/**
 * Incline 斜面体组件
 * 
 * 统一力学场景中直角三角形斜面体的视觉风格：
 * - 默认采用直角在左下角、左高右低的倾斜方向，符合物理演示习惯。
 * - 支持 direction="left" 反向斜面（右高左低，直角在右）。
 * - 支持可选的倾角 θ 标注弧线与底部剖面阴影。
 */
export function Incline({
  x0,
  y0,
  width,
  height,
  direction = 'right',
  showAngleArc = false,
  angleLabel = 'θ',
  showHatch = false,
  fill = SCENE_COLORS.materials.structFillPale,
  stroke = SCENE_COLORS.materials.structStrokeMid,
  strokeWidth = 1.5,
  ...restProps
}: InclineProps) {
  const isRight = direction === 'right';
  // 直角在左: (x0, y0) -> (x0 + width, y0) -> (x0, y0 - height)
  // 直角在右: (x0, y0) 为锐角底点 -> (x0 + width, y0) 直角 -> (x0 + width, y0 - height)
  const points = isRight
    ? `${x0},${y0} ${x0 + width},${y0} ${x0},${y0 - height}`
    : `${x0},${y0} ${x0 + width},${y0} ${x0 + width},${y0 - height}`;

  // 倾角弧线几何
  const arcRadius = Math.min(32, width * 0.25);
  const thetaRad = Math.atan2(height, width);
  const arcStartX = isRight ? x0 + width - arcRadius : x0 + arcRadius;
  const arcStartY = y0;
  const arcEndX = isRight
    ? x0 + width - arcRadius * Math.cos(thetaRad)
    : x0 + arcRadius * Math.cos(thetaRad);
  const arcEndY = y0 - arcRadius * Math.sin(thetaRad);

  // 倾角标签置于角平分线上，避免与弧线或底边贴合挤压
  const bisectorRad = thetaRad / 2;
  const labelDist = arcRadius + 10;
  const labelX = isRight
    ? x0 + width - labelDist * Math.cos(bisectorRad)
    : x0 + labelDist * Math.cos(bisectorRad);
  const labelY = y0 - labelDist * Math.sin(bisectorRad) + 4;

  return (
    <g className="physics-incline" {...restProps}>
      {/* 底部固定剖面斜线 */}
      {showHatch && (
        <g stroke={stroke} strokeWidth={1} opacity={0.35}>
          {Array.from({ length: Math.floor(width / 12) }).map((_, i) => {
            const hx = x0 + i * 12 + 6;
            return <line key={i} x1={hx} y1={y0} x2={hx - 6} y2={y0 + 7} />;
          })}
        </g>
      )}

      {/* 斜面主体 */}
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />

      {/* 倾角 θ 标注弧线与文本 */}
      {showAngleArc && (
        <g pointerEvents="none">
          <path
            d={`M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 0 ${isRight ? 1 : 0} ${arcEndX} ${arcEndY}`}
            fill="none"
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={1.2}
          />
          <text
            x={labelX}
            y={labelY}
            fill={PHYSICS_COLORS.labelText}
            fontSize={11}
            fontWeight="bold"
            textAnchor="middle"
          >
            {angleLabel}
          </text>
        </g>
      )}
    </g>
  );
}
