import { useId, SVGProps } from 'react';
import { SCENE_COLORS, CANVAS_COLORS, PHYSICS_COLORS } from '@/theme/physics';
import { colors } from '@/theme/colors';
import type { ChargeSign } from './types';

/**
 * 物理物块/滑块预设类型。
 * - `wood`: 经典的物理课本木箱质感（金黄木纹渐变，带木板拼合缝花纹）。
 * - `metal`: 精密物理滑轨上的不锈钢滑块（带有金属拉丝反光及顶面抛光高光线）。
 * - `woodCart`: 带有滑轮的木质小车（木箱主体，底边叠加一对拟物化不锈钢车轮）。
 * - `metalCart`: 带有滑轮的不锈钢金属小车（金属主体，底边叠加一对拟物化不锈钢车轮）。
 */
export type BlockPresetType = 'wood' | 'metal' | 'woodCart' | 'metalCart';

/**
 * 物理滑块组件 Props 接口。
 * 继承自 SVGProps<SVGGElement>，支持所有标准的 SVG 元素事件及属性绑定。
 */
export interface BlockProps extends Omit<SVGProps<SVGGElement>, 'type'> {
  /**
   * 滑块左上角在 Canvas/SVG 坐标系中的 X 轴像素坐标。
   * 单位：像素 (px)。
   */
  x: number;
  /**
   * 滑块左上角在 Canvas/SVG 坐标系中的 Y 轴像素坐标。
   * 单位：像素 (px)。
   */
  y: number;
  /**
   * 滑块的像素宽度。
   * 单位：像素 (px)。
   */
  width: number;
  /**
   * 滑块的像素高度。
   * 单位：像素 (px)。
   */
  height: number;
  /**
   * 滑块的材质与渲染类型。
   * @default 'wood'
   */
  type?: BlockPresetType;
  /**
   * 标注在滑块中心位置的文本标签（如质量 "m = 5.0kg" 或 "m"）。
   * 若未提供，则不进行文本渲染，方便外部定制。
   */
  label?: string;
  /**
   * 滑块的描边颜色。
   * 若未指定，则会自动根据材质类型采用对应 `SCENE_COLORS` 中的配置：
   * - `wood` / `woodCart` 采用 `SCENE_COLORS.materials.woodSphereGrad[1]`
   * - `metal` 采用 `SCENE_COLORS.pendulum.rodStroke` 或 `#334155`
   */
  stroke?: string;
  /**
   * 滑块描边的像素宽度。
   * @default 1.5
   */
  strokeWidth?: number;
  /**
   * 整体透明度。
   */
  opacity?: number;
  /**
   * 字体缩放函数（由父组件 useCanvasSize 提供）。
   * 不传则使用默认值 `(n: number) => n`。
   */
  font?: (base: number) => number;
  /**
   * 物块带电性标记
   * @default 'none'
   */
  chargeSign?: ChargeSign;
  /**
   * 是否采用半透明材质，在受力分析等从几何中心发出矢量的场景下，
   * 开启半透明可以防止滑块遮挡从其中心发出的受力、速度等矢量箭头。
   * @default false
   */
  translucent?: boolean;
  /**
   * 是否在滑块中心渲染几何中心（质心）标记点，指示受力作用点。
   * @default false
   */
  showCenterOfMass?: boolean;
  /**
   * 小车的瞬时速度，用于车轮滚转角度计算（仅对 woodCart/metalCart 预设有效）
   * @default 0
   */
  velocity?: number;
  /**
   * 动画运行时间，配合速度计算车轮滚转角度（仅对 woodCart/metalCart 预设有效）
   * @default 0
   */
  time?: number;
}

/**
 * Block 物理滑块/滑车通用渲染组件
 *
 * 【设计意图】
 * 1. 统一物理演示场景中各种滑块、木箱与小车的视觉风格，废除各页面零散手写的渐变，达成材质规范化。
 * 2. 3D 拟物感美化：
 *    - 木纹质感：在木箱块面增加三条深色半透明垂直纹路虚线，还原木质质地。
 *    - 不锈钢边缘光泽：在金属块顶层绘制微亮白线，表现边缘切角的抛光反光效果。
 *    - 精密车轮：为滑车组件底边添加精细的双层不锈钢滑轮（含轮轴和外圈深浅色阶）。
 * 3. 物理准确：不添加可能产生“物体飘浮或贴壁”物理误导的贴身阴影。
 * 4. 冲突防范：使用 React 19 的 `useId()` 确保每次实例化的 `linearGradient` ID 唯一。
 *
 * @example
 * ```tsx
 * // 渲染一个摩擦力实验中的木箱，内置质量标注
 * <Block x={120} y={180} width={44} height={44} type="wood" label="5.0 kg" />
 *
 * // 渲染一个加速度实验中的不锈钢滑块
 * <Block x={200} y={150} width={80} height={40} type="metal" label="2.0 kg" />
 * ```
 */
export function Block({
  x,
  y,
  width,
  height,
  type = 'wood',
  label,
  stroke,
  strokeWidth = 1.5,
  opacity,
  font = (n: number) => n,
  chargeSign = 'none',
  translucent = false,
  showCenterOfMass = false,
  velocity = 0,
  time = 0,
  ...restProps
}: BlockProps) {
  const uniqueId = useId().replace(/:/g, '-');
  const gradientId = `block-linear-grad-${type}-${uniqueId}`;
  const wheelGradId = `block-wheel-grad-${uniqueId}`;

  // 1. 材质与颜色参数匹配
  const isWood = type === 'wood' || type === 'woodCart';
  const fillColor = `url(#${gradientId})`;

  let defaultStroke: string;
  let labelColor: string;

  if (isWood) {
    // 采用木质的深色边框作为 stroke
    defaultStroke = SCENE_COLORS.materials.woodSphereGrad[1];
    labelColor = 'rgba(67, 20, 7, 0.9)'; // 深木褐色
  } else {
    // 采用不锈钢深灰色作为 stroke
    defaultStroke = SCENE_COLORS.materials.structFill;
    labelColor = SCENE_COLORS.materials.structStroke; // 经典 neutral-800
  }

  // 2. 车轮位置及大小参数（仅用于 woodCart / metalCart 小车）
  const hasWheels = type === 'woodCart' || type === 'metalCart';
  const wheelR = Math.max(3.5, height * 0.14); // 轮子半径自适应
  const wheelY = y + height - 1.5; // 车轮中心置于底盘边缘微偏上，嵌入车身一部分
  const wheelX1 = x + width * 0.22;
  const wheelX2 = x + width * 0.78;

  // 轮子旋转角度计算：根据速度和时间决定
  const rotation = (velocity * time * 35) % 360;

  // 滑块内部木纹的 X 轴偏移
  const woodLinesX = [width * 0.28, width * 0.5, width * 0.72];

  return (
    <g opacity={opacity} {...restProps}>
      <defs>
        {/* 滑块主渐变 */}
        {isWood ? (
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.woodSphereGrad[0]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.woodSphereGrad[1]} />
          </linearGradient>
        ) : (
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
            <stop offset="85%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
          </linearGradient>
        )}

        {/* 车轮金属渐变 */}
        {hasWheels && (
          <radialGradient id={wheelGradId} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[0]} />
            <stop offset="50%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
          </radialGradient>
        )}
      </defs>

      {/* 1. 车轮渲染 (在车身底层绘制，遮挡住车身内测部分) */}
      {hasWheels && (
        <g pointerEvents="none">
          {/* 左侧车轮 */}
          <circle
            cx={wheelX1}
            cy={wheelY}
            r={wheelR}
            fill={`url(#${wheelGradId})`}
            stroke={colors.neutral[800]}
            strokeWidth={0.8}
          />
          {/* 左轮辐，带动态旋转 */}
          <g transform={`translate(${wheelX1}, ${wheelY}) rotate(${rotation})`}>
            <line x1={-wheelR} y1={0} x2={wheelR} y2={0} stroke={colors.neutral[800]} strokeWidth={0.6} />
            <line x1={0} y1={-wheelR} x2={0} y2={wheelR} stroke={colors.neutral[800]} strokeWidth={0.6} />
          </g>
          <circle cx={wheelX1} cy={wheelY} r={wheelR * 0.3} fill={CANVAS_COLORS.labelTextLight} stroke={colors.neutral[800]} strokeWidth={0.5} />

          {/* 右侧车轮 */}
          <circle
            cx={wheelX2}
            cy={wheelY}
            r={wheelR}
            fill={`url(#${wheelGradId})`}
            stroke={colors.neutral[800]}
            strokeWidth={0.8}
          />
          {/* 右轮辐，带动态旋转 */}
          <g transform={`translate(${wheelX2}, ${wheelY}) rotate(${rotation})`}>
            <line x1={-wheelR} y1={0} x2={wheelR} y2={0} stroke={colors.neutral[800]} strokeWidth={0.6} />
            <line x1={0} y1={-wheelR} x2={0} y2={wheelR} stroke={colors.neutral[800]} strokeWidth={0.6} />
          </g>
          <circle cx={wheelX2} cy={wheelY} r={wheelR * 0.3} fill={CANVAS_COLORS.labelTextLight} stroke={colors.neutral[800]} strokeWidth={0.5} />
        </g>
      )}

      {/* 2. 滑块主体外壳 */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height - (hasWheels ? 1 : 0)} // 略微收缩底边以契合轮子
        fill={fillColor}
        fillOpacity={translucent ? 0.4 : undefined}
        stroke={stroke ?? defaultStroke}
        strokeWidth={strokeWidth}
        rx={isWood ? 4.5 : 3.5}
      />

      {/* 3. 木质花纹纹路 (仅适用于木质材质，弱化不透明度和线宽以呈现逼真自然的木板拼合感) */}
      {isWood && (
        <g pointerEvents="none" opacity={0.07}>
          {woodLinesX.map((lx, idx) => (
            <line
              key={`wood-line-${idx}`}
              x1={x + lx}
              y1={y + 1.5}
              x2={x + lx}
              y2={y + height - (hasWheels ? 2.5 : 1.5)}
              stroke={colors.neutral[900]}
              strokeWidth={0.6}
              strokeDasharray="4 3"
            />
          ))}
        </g>
      )}

      {/* 4. 金属受光抛光高光线 (仅适用于金属材质，产生边缘切角白光感) */}
      {!isWood && (
        <line
          x1={x + 1.5}
          y1={y + 1}
          x2={x + width - 1.5}
          y2={y + 1}
          stroke={colors.neutral.white}
          strokeWidth={0.8}
          opacity={translucent ? 0.25 : 0.5}
          pointerEvents="none"
        />
      )}

      {/* 5. 标注文本 */}
      {label && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 3.5 - (hasWheels ? 1 : 0)}
          fontSize={font(10)}
          fill={labelColor}
          textAnchor="middle"
          fontWeight="bold"
          pointerEvents="none"
          className="select-none"
        >
          {label}
        </text>
      )}

      {/* 6. 质心标点（辅助力学受力分析，明确力的起点作用点） */}
      {showCenterOfMass && (
        <g transform={`translate(${x + width / 2}, ${y + (height - (hasWheels ? 1 : 0)) / 2})`} pointerEvents="none">
          <line x1={-5} y1={0} x2={5} y2={0} stroke={CANVAS_COLORS.referencePoint} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} stroke={CANVAS_COLORS.referencePoint} strokeWidth={1.2} />
          <circle cx={0} cy={0} r={1.5} fill={CANVAS_COLORS.referencePoint} />
        </g>
      )}

      {/* 7. 带电性标识 (右上角悬浮徽章，符合电场/磁场带电物体偏转教学) */}
      {chargeSign && chargeSign !== 'none' && (
        <g transform={`translate(${x + width - 10}, ${y + 10})`} pointerEvents="none">
          <circle
            cx={0}
            cy={0}
            r={6.5}
            fill={chargeSign === '+' ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
            stroke={colors.neutral.white}
            strokeWidth={1}
          />
          <text
            x={0}
            y={2.5}
            fill={colors.neutral.white}
            fontSize={font(8)}
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {chargeSign === '+' ? '+' : '−'}
          </text>
        </g>
      )}
    </g>
  );
}
