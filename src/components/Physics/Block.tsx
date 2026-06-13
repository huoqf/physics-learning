import { useId, SVGProps } from 'react';
import { SCENE_COLORS } from '@/theme/physics/sceneColors';

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
export interface BlockProps extends SVGProps<SVGGElement> {
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
    defaultStroke = '#334155';
    labelColor = '#1E293B'; // 经典 neutral-800
  }

  // 2. 车轮位置及大小参数（仅用于 woodCart / metalCart 小车）
  const hasWheels = type === 'woodCart' || type === 'metalCart';
  const wheelR = Math.max(3.5, height * 0.13); // 轮子半径自适应
  const wheelY = y + height - 1.5; // 车轮中心置于底盘边缘微偏上，嵌入车身一部分
  const wheelX1 = x + width * 0.22;
  const wheelX2 = x + width * 0.78;

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
            stroke="#1E293B"
            strokeWidth={0.8}
          />
          {/* 左轮辐/金属轴心点 */}
          <circle cx={wheelX1} cy={wheelY} r={wheelR * 0.3} fill="#475569" />

          {/* 右侧车轮 */}
          <circle
            cx={wheelX2}
            cy={wheelY}
            r={wheelR}
            fill={`url(#${wheelGradId})`}
            stroke="#1E293B"
            strokeWidth={0.8}
          />
          {/* 右轮辐/金属轴心点 */}
          <circle cx={wheelX2} cy={wheelY} r={wheelR * 0.3} fill="#475569" />
        </g>
      )}

      {/* 2. 滑块主体外壳 */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height - (hasWheels ? 1 : 0)} // 略微收缩底边以契合轮子
        fill={fillColor}
        stroke={stroke ?? defaultStroke}
        strokeWidth={strokeWidth}
        rx={isWood ? 3 : 2}
      />

      {/* 3. 木质花纹纹路 (仅适用于木质材质) */}
      {isWood && (
        <g pointerEvents="none" opacity={0.18}>
          {woodLinesX.map((lx, idx) => (
            <line
              key={`wood-line-${idx}`}
              x1={x + lx}
              y1={y + 1.5}
              x2={x + lx}
              y2={y + height - (hasWheels ? 2.5 : 1.5)}
              stroke="#000000"
              strokeWidth={0.8}
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
          stroke="#FFFFFF"
          strokeWidth={0.8}
          opacity={0.5}
          pointerEvents="none"
        />
      )}

      {/* 5. 标注文本 */}
      {label && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 3.5 - (hasWheels ? 1 : 0)}
          fontSize={10}
          fill={labelColor}
          textAnchor="middle"
          fontWeight="bold"
          pointerEvents="none"
          className="select-none"
        >
          {label}
        </text>
      )}
    </g>
  );
}
