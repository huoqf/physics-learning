import { SVGProps } from 'react';
import { SCENE_COLORS } from '@/theme/physics';

export interface InclineProps extends Omit<SVGProps<SVGPolygonElement>, 'width' | 'height'> {
  /** 左下角直角顶点的 X 轴像素坐标 */
  x0: number;
  /** 左下角直角顶点的 Y 轴像素坐标 */
  y0: number;
  /** 斜面底边宽度 (像素) */
  width: number;
  /** 斜面垂直高度 (像素) */
  height: number;
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
 * - 统一背景色和边框描边，避免各页面零散重复硬编码。
 */
export function Incline({
  x0,
  y0,
  width,
  height,
  fill = SCENE_COLORS.materials.structFillPale,
  stroke = SCENE_COLORS.materials.structStrokeMid,
  strokeWidth = 1.5,
  ...restProps
}: InclineProps) {
  // 直角在左下角 (x0, y0)，右下顶点为 (x0 + width, y0)，左上顶点为 (x0, y0 - height)
  const points = `${x0},${y0} ${x0 + width},${y0} ${x0},${y0 - height} ${x0},${y0}`;
  return (
    <polygon
      points={points}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      {...restProps}
    />
  );
}
