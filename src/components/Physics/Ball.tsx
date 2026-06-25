import { useId, SVGProps } from 'react';
import { SCENE_COLORS, PHYSICS_COLORS } from '@/theme/physics';
import { colors } from '@/theme/colors';
import type { ChargeSign } from './types';

/**
 * 物理小球预设类型。
 * 每个预设在 `src/theme/physics/sceneColors.ts` 中定义了专属的渐变色阶、描边色、高光透明度及高光颜色。
 */
export type BallPresetType =
  | 'steel'
  | 'steelGhost'
  | 'oscillatorMetal'
  | 'brassWeight'
  | 'pendulumBob'
  | 'planetCool'
  | 'planetWarm';

/**
 * 物理小球组件 Props 接口。
 * 继承自 SVGProps<SVGCircleElement>，支持所有标准的 SVG circle 属性（例如 onClick、onMouseDown、cursor 等）。
 */
export interface BallProps extends Omit<SVGProps<SVGCircleElement>, 'cx' | 'cy' | 'r' | 'fill' | 'type'> {
  /**
   * 小球中心点在 Canvas/SVG 坐标系中的 X 轴像素坐标。
   * 单位：像素 (px)。
   */
  cx: number;
  /**
   * 小球中心点在 Canvas/SVG 坐标系中的 Y 轴像素坐标。
   * 单位：像素 (px)。
   */
  cy: number;
  /**
   * 小球渲染的像素半径。
   * 单位：像素 (px)。建议根据模拟物理实体的真实大小来设置。
   */
  r: number;
  /**
   * 小球的球体材质预设类型。
   * 对应 `SCENE_COLORS.sphere` 中的球体配色配置。
   * @default 'steel'
   */
  type?: BallPresetType;
  /**
   * 小球的描边颜色。
   * 若未指定，则会自动采用对应预设 `SCENE_COLORS.sphere[type].stroke` 中的颜色值。
   */
  stroke?: string;
  /**
   * 小球的描边粗细。
   * 单位：像素 (px)。若未指定，默认为 1px。
   */
  strokeWidth?: number;
  /**
   * 整体透明度。
   * 该参数会与预设自身的透明度进行叠加应用。
   */
  opacity?: number;
  /**
   * 小球的电性标识，正电荷/负电荷/中性
   * @default 'none'
   */
  chargeSign?: ChargeSign;
}

/**
 * 渐变配置映射，用来统一描述球体渐变色阶的 offset 比例。
 */
const PRES_GRADIENT_OFFSETS: Record<BallPresetType, readonly number[]> = {
  steel: [0, 40, 80, 100],
  steelGhost: [0, 50, 90, 100],
  oscillatorMetal: [0, 40, 80, 100],
  brassWeight: [0, 40, 80, 100],
  pendulumBob: [0, 40, 80, 100],
  planetCool: [0, 40, 80, 100],
  planetWarm: [0, 40, 80, 100],
} as const;

/**
 * Ball 物理小球通用渲染组件
 *
 * 【设计意图】
 * 1. 统一物理模拟中小球/钢珠的拟物光影表现，避免在各个功能组件中手写 Gradient 造成风格漂移与跨文件 ID 冲突。
 * 2. 物理准确性：取消了可能造成“小球放在桌面上”误导的空气贴身阴影。
 * 3. 3D 光影质感：通过局部 `<radialGradient>` 产生体积感，并利用受光面偏置点（cx - r*0.35, cy - r*0.35）叠加的高光层（Specular Highlight）表现真实光泽感。
 * 4. 冲突隔离：利用 React 19 的 `useId()` 动态生成唯一的渐变 ID 字符串，隔离 SVG ID 跨文件及多实例冲突。
 *
 * @example
 * ```tsx
 * // 渲染一个常规的物理实验钢球
 * <Ball cx={100} cy={200} r={14} type="steel" strokeWidth={1.5} />
 *
 * // 渲染一个真空对照组半透明对照球
 * <Ball cx={150} cy={200} r={13} type="steelGhost" />
 * ```
 */
export function Ball({
  cx,
  cy,
  r,
  type = 'steel',
  stroke,
  strokeWidth = 1,
  opacity,
  chargeSign = 'none',
  ...restProps
}: BallProps) {
  // 生成独一无二的渐变 ID，防止在多球渲染或多页面跳转时 SVG 渐变 ID 冲突导致的纹理丢失
  const uniqueId = useId().replace(/:/g, '-');
  const gradientId = `ball-radial-grad-${type}-${uniqueId}`;

  // 提取预设球体参数
  const spherePreset = SCENE_COLORS.sphere[type];
  const colorsList = spherePreset.gradient;
  const offsets = PRES_GRADIENT_OFFSETS[type];
  const opacities = 'opacity' in spherePreset ? spherePreset.opacity : undefined;

  const defaultStroke = spherePreset.stroke;
  const specularColor = spherePreset.specular;

  // 3D 高光圆点参数（光源默认来自左上方 45 度）
  const specularCx = cx - r * 0.33;
  const specularCy = cy - r * 0.33;
  const specularR = r * 0.18;

  return (
    <g opacity={opacity} pointerEvents="none">
      <defs>
        {/* 3D 球体径向反射渐变，光源质心偏置 30% */}
        <radialGradient id={gradientId} cx="30%" cy="30%" r="70%">
          {colorsList.map((color, idx) => {
            const offsetVal = `${offsets[idx]}%`;
            // 若为 steelGhost 等包含不均匀透明度的球体，需读取其对应的 stopOpacity
            const stopOpacity = opacities ? opacities[idx] : undefined;
            return (
              <stop
                key={idx}
                offset={offsetVal}
                stopColor={color}
                stopOpacity={stopOpacity}
              />
            );
          })}
        </radialGradient>
      </defs>

      {/* 1. 小球主体圆球层（绑定所有外部事件与样式属性，如 cursor 等） */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={`url(#${gradientId})`}
        stroke={stroke ?? defaultStroke}
        strokeWidth={strokeWidth}
        pointerEvents="auto"
        {...restProps}
      />

      {/* 2. 3D 拟物偏置高光层（不响应鼠标事件，保持纯渲染） */}
      <circle
        cx={specularCx}
        cy={specularCy}
        r={specularR}
        fill={specularColor}
        opacity={0.65}
        pointerEvents="none"
      />

      {/* 3. 带电性标识 (居中悬浮徽章，用于电场、磁场等粒子偏转实验) */}
      {chargeSign && chargeSign !== 'none' && (
        <g transform={`translate(${cx}, ${cy})`} pointerEvents="none">
          <circle
            cx={0}
            cy={0}
            r={Math.max(5, r * 0.45)}
            fill={chargeSign === '+' ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
            stroke={colors.neutral.white}
            strokeWidth={Math.max(0.6, r * 0.05)}
          />
          <text
            x={0}
            y={Math.max(1.8, r * 0.16)}
            fill={colors.neutral.white}
            fontSize={Math.max(7, r * 0.6)}
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
