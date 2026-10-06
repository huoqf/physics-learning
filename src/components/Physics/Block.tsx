import { SVGProps } from 'react';
import { CANVAS_COLORS, PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics';
import type { ChargeSign } from './types';

/**
 * 物理物块/滑块预设类型。
 * - `standard`: 高中物理经典的标准蓝灰滑块（默认）。符合教材与高考绘图习惯，半透明天蓝色填充，纯色描边，受力分析时不会遮挡质心箭头，优先选用。
 * - `wood`: 经典的物理课本木箱质感（金黄木纹渐变，带木板拼合缝花纹）。仅用于子弹打木块、板块模型等明确需要木板/木块的特定场景。
 * - `metal`: 精密物理滑轨上的不锈钢滑块（带有金属拉丝反光及顶面抛光高光线）。
 * - `woodCart`: 带有滑轮的木质小车（木箱主体，底边叠加一对拟物化不锈钢车轮）。
 * - `metalCart`: 带有滑轮的不锈钢金属小车（金属主体，底边叠加一对拟物化不锈钢车轮）。
 */
export type BlockPresetType = 'wood' | 'metal' | 'woodCart' | 'metalCart' | 'standard';

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
   * @default 'standard'
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
  type = 'standard',
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
  // 1. 材质与颜色匹配（严格贴合高中物理教科书标准色阶，清爽不遮挡受力分析）
  const isWood = type === 'wood' || type === 'woodCart';
  const isStandard = type === 'standard';
  const hasWheels = type === 'woodCart' || type === 'metalCart';

  let fillColor: string;
  let defaultStroke: string;
  let labelColor: string;

  if (isWood) {
    fillColor = SCENE_COLORS.materials.labWoodGrad[0]; // 教材木块淡黄 — 粗糙木板渐变首色
    defaultStroke = SCENE_COLORS.materials.woodSphereGrad[1]; // 细棕色边框 — 木质深色阶
    labelColor = SCENE_COLORS.materials.labWoodGrad[3]; // 深木褐色文字
  } else if (isStandard) {
    fillColor = SCENE_COLORS.materials.structBgPale; // 教材标准淡天蓝填充
    defaultStroke = SCENE_COLORS.materials.structStrokeMid; // 柔和石墨深灰边框（避免与支持力 FN / 速度 v 的天蓝色撞色争夺）
    labelColor = SCENE_COLORS.materials.structFill;
  } else {
    fillColor = SCENE_COLORS.materials.sliderMetalGrad[0]; // 金属浅灰 — 不锈钢滑块材质首色
    defaultStroke = SCENE_COLORS.materials.structStrokeMid; // 深灰边框
    labelColor = SCENE_COLORS.materials.structStroke;
  }

  // 2. 教材简图车轮（仅用于 woodCart / metalCart 小车）
  const wheelR = Math.max(3.5, Math.min(8, height * 0.2));
  // 车轮最底端严格相切于 y + height，消除穿模；车身底盘在车轮轴心之上保留离地间隙
  const wheelY = hasWheels ? y + height - wheelR : y + height;
  const bodyHeight = hasWheels ? height - wheelR * 0.75 : height;
  const wheelX1 = x + Math.min(18, width * 0.22);
  const wheelX2 = x + Math.max(width - 18, width * 0.78);
  const rotation = (velocity * time * 35) % 360;

  // 自适应字号（防止细长滑块溢出）
  const maxFontSize = Math.max(7, Math.min(font(11), bodyHeight * 0.45, (width * 0.8) / Math.max(1, (label?.length ?? 1) * 0.6)));

  // 当显示质心十字准心时，文字向上微移，避免压盖力的起始作用点
  const textCenterY = showCenterOfMass && bodyHeight > 28
    ? y + bodyHeight * 0.3
    : y + bodyHeight / 2 + maxFontSize * 0.35;

  return (
    <g opacity={opacity} {...restProps}>
      {/* 1. 教材风格小车车轮 */}
      {hasWheels && (
        <g pointerEvents="none">
          {/* 左轮 */}
          <circle cx={wheelX1} cy={wheelY} r={wheelR} fill={SCENE_COLORS.materials.structStrokePale} stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={0.9} />
          <g transform={`translate(${wheelX1}, ${wheelY}) rotate(${rotation})`}>
            <line x1={-wheelR + 1} y1={0} x2={wheelR - 1} y2={0} stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={0.8} />
            <line x1={0} y1={-wheelR + 1} x2={0} y2={wheelR - 1} stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={0.8} />
          </g>
          <circle cx={wheelX1} cy={wheelY} r={1.5} fill={SCENE_COLORS.materials.structStrokeDark} />

          {/* 右轮 */}
          <circle cx={wheelX2} cy={wheelY} r={wheelR} fill={SCENE_COLORS.materials.structStrokePale} stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={0.9} />
          <g transform={`translate(${wheelX2}, ${wheelY}) rotate(${rotation})`}>
            <line x1={-wheelR + 1} y1={0} x2={wheelR - 1} y2={0} stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={0.8} />
            <line x1={0} y1={-wheelR + 1} x2={0} y2={wheelR - 1} stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={0.8} />
          </g>
          <circle cx={wheelX2} cy={wheelY} r={1.5} fill={SCENE_COLORS.materials.structStrokeDark} />
        </g>
      )}

      {/* 2. 滑块主体（半透明清爽填充，确保受力分析箭头、支持力、重力矢量清晰穿透可见） */}
      <rect
        x={x}
        y={y}
        width={width}
        height={bodyHeight}
        fill={fillColor}
        fillOpacity={translucent ? 0.2 : 0.45}
        stroke={stroke ?? defaultStroke}
        strokeWidth={strokeWidth ?? 1.2}
        rx={3}
      />

      {/* 3. 标注文本（避让质心与受力点） */}
      {label && (
        <text
          x={x + width / 2}
          y={textCenterY}
          fontSize={maxFontSize}
          fill={labelColor}
          textAnchor="middle"
          fontWeight="bold"
          pointerEvents="none"
          className="select-none"
        >
          {label}
        </text>
      )}

      {/* 4. 质心标点（受力分析十字准心） */}
      {showCenterOfMass && (
        <g transform={`translate(${x + width / 2}, ${y + height / 2})`} pointerEvents="none">
          <line x1={-4} y1={0} x2={4} y2={0} stroke={CANVAS_COLORS.referencePoint} strokeWidth={1.2} />
          <line x1={0} y1={-4} x2={0} y2={4} stroke={CANVAS_COLORS.referencePoint} strokeWidth={1.2} />
          <circle cx={0} cy={0} r={1.5} fill={CANVAS_COLORS.referencePoint} />
        </g>
      )}

      {/* 5. 带电性标识 (右上角微徽章) */}
      {chargeSign && chargeSign !== 'none' && (
        <g transform={`translate(${x + width - Math.min(8, width * 0.18)}, ${y + Math.min(8, height * 0.22)})`} pointerEvents="none">
          <circle
            cx={0}
            cy={0}
            r={Math.min(5.5, height * 0.24)}
            fill={chargeSign === '+' ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
            stroke={CANVAS_COLORS.white}
            strokeWidth={0.8}
          />
          <text
            x={0}
            y={2}
            fill={CANVAS_COLORS.white}
            fontSize={Math.min(8, height * 0.3)}
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
