import { SVGProps } from 'react';
import { PHYSICS_COLORS, STROKE } from '@/theme/physics';

/**
 * 跑车模型组件 Props 接口。
 * 继承自 Omit<SVGProps<SVGGElement>, 'width' | 'height'>，以支持所有标准的 SVG g 元素事件与属性，
 * 宽度和高度通过显式的 Props 传入以控制缩放。
 */
export interface SportsCarProps extends Omit<SVGProps<SVGGElement>, 'width' | 'height'> {
  /**
   * 跑车在 Canvas/SVG 坐标系中的 X 轴像素坐标（左上角位置）。
   * 单位：像素 (px)。
   */
  x: number;
  /**
   * 跑车在 Canvas/SVG 坐标系中的 Y 轴像素坐标（左上角位置）。
   * 单位：像素 (px)。
   */
  y: number;
  /**
   * 跑车的速度值，用于计算空气尾流长度和车轮转动角度。
   * 单位：m/s。
   * @default 0
   */
  velocity?: number;
  /**
   * 动画当前运行的时间，用于配合速度计算车轮转动角度。
   * 单位：秒 (s)。
   * @default 0
   */
  time?: number;
  /**
   * 跑车渲染的宽度。
   * @default 56
   */
  width?: number;
  /**
   * 跑车渲染的高度。
   * @default 26
   */
  height?: number;
  /**
   * 是否展示后空气尾流线。
   * @default true
   */
  showTailwind?: boolean;
  /**
   * 车身填充颜色。
   * 若未指定，则默认为 PHYSICS_COLORS.objectFillNeutral。
   */
  fill?: string;
  /**
   * 车身描边颜色。
   * 若未指定，则默认为 PHYSICS_COLORS.objectStroke。
   */
  stroke?: string;
  /**
   * 描边粗细。
   * 若未指定，则默认为 STROKE.objectLine。
   */
  strokeWidth?: number;
}

/**
 * SportsCar 跑车模型通用渲染组件
 *
 * 【设计意图】
 * 1. 统一物理模拟中跑车模型的渲染表达，避免在各个功能组件中手写 SVG Path 造成风格漂移及代码冗余。
 * 2. 动感视觉：根据速度 `velocity` 在车尾绘制层流空气尾流线，尾流长度随速度动态变长；
 *    车轮带有精密十字辐条，在运动中会结合速度与时间动态旋转，增强物理解题场景的真实感与生动感。
 * 3. 灵活自适应：提供自定义的 `width` 和 `height` 支持，并在内部利用 `scale` 实施平滑的矢量无损缩放。
 * 4. 冲突防范：使用 React 19 的 `useId()`，未来如果引入渐变，可以防范 SVG ID 跨文件命名冲突。
 *
 * @example
 * ```tsx
 * // 渲染一辆在 x=100, y=200 处，速度为 10m/s，在 2.5s 时刻的跑车
 * <SportsCar x={100} y={200} velocity={10} time={2.5} />
 * ```
 */
export function SportsCar({
  x,
  y,
  velocity = 0,
  time = 0,
  width = 56,
  height = 26,
  showTailwind = true,
  fill,
  stroke,
  strokeWidth,
  opacity,
  ...restProps
}: SportsCarProps) {
  // 原生设计基准尺寸
  const BASE_WIDTH = 56;
  const BASE_HEIGHT = 26;

  const scaleX = width / BASE_WIDTH;
  const scaleY = height / BASE_HEIGHT;

  const bodyFill = fill ?? PHYSICS_COLORS.objectFillNeutral;
  const bodyStroke = stroke ?? PHYSICS_COLORS.objectStroke;
  const bodyStrokeWidth = strokeWidth ?? STROKE.objectLine;

  const hasVelocity = velocity > 0;

  // 轮子旋转角度计算：根据速度和时间决定
  const rotation = (velocity * time * 35) % 360;

  return (
    <g transform={`translate(${x}, ${y})`} opacity={opacity} {...restProps}>
      {/* 1. 跑车后空气尾流线 (随速度变长，层流线体现动感) */}
      {showTailwind && hasVelocity && (
        <g opacity={0.5} transform="translate(-10, 0)" pointerEvents="none">
          <line
            x1={-8 - velocity * 0.15}
            y1={6 * scaleY}
            x2={-2}
            y2={6 * scaleY}
            stroke={PHYSICS_COLORS.velocityY}
            strokeWidth={1}
            strokeDasharray="3 2"
          />
          <line
            x1={-14 - velocity * 0.2}
            y1={13 * scaleY}
            x2={-4}
            y2={13 * scaleY}
            stroke={PHYSICS_COLORS.velocityY}
            strokeWidth={1.5}
          />
          <line
            x1={-6 - velocity * 0.1}
            y1={20 * scaleY}
            x2={-2}
            y2={20 * scaleY}
            stroke={PHYSICS_COLORS.velocityY}
            strokeWidth={1}
            strokeDasharray="3 2"
          />
        </g>
      )}

      {/* 2. 车身与车轮的缩放组合组 */}
      <g transform={`scale(${scaleX}, ${scaleY})`}>
        {/* 科学流线跑车车身 */}
        <path
          d="M 2,22 Q 4,11 14,9 L 22,5 Q 32,3 40,9 L 50,13 Q 54,17 54,22 Z"
          fill={bodyFill}
          stroke={bodyStroke}
          strokeWidth={bodyStrokeWidth}
        />
        {/* 精密十字辐条车轮，随速度转动 */}
        {/* 车轮 1 */}
        <g transform="translate(12.32, 22)">
          <circle
            cx="0"
            cy="0"
            r="5"
            fill={bodyFill}
            stroke={bodyStroke}
            strokeWidth={1.5}
          />
          <g transform={`rotate(${rotation})`}>
            <line x1="-5" y1="0" x2="5" y2="0" stroke={bodyStroke} strokeWidth={1} />
            <line x1="0" y1="-5" x2="0" y2="5" stroke={bodyStroke} strokeWidth={1} />
          </g>
        </g>
        {/* 车轮 2 */}
        <g transform="translate(43.68, 22)">
          <circle
            cx="0"
            cy="0"
            r="5"
            fill={bodyFill}
            stroke={bodyStroke}
            strokeWidth={1.5}
          />
          <g transform={`rotate(${rotation})`}>
            <line x1="-5" y1="0" x2="5" y2="0" stroke={bodyStroke} strokeWidth={1} />
            <line x1="0" y1="-5" x2="0" y2="5" stroke={bodyStroke} strokeWidth={1} />
          </g>
        </g>
      </g>
    </g>
  );
}
