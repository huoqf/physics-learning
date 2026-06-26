import { FC, SVGProps } from 'react'
import { SCENE_COLORS } from '@/theme/physics'

/**
 * 物理定滑轮组件 Props 接口。
 */
export interface PulleyProps extends SVGProps<SVGGElement> {
  /** 滑轮圆心在 Canvas/SVG 坐标系中的 X 轴像素坐标 */
  cx: number
  /** 滑轮圆心在 Canvas/SVG 坐标系中的 Y 轴像素坐标 */
  cy: number
  /** 滑轮外圈像素半径，默认 12px */
  r?: number
  /** 吊架及天花板悬挂底座的顶部 Y 轴高度。若未传入则只渲染滑轮主体，不渲染悬挂底座。 */
  hangerTopY?: number
}

/**
 * Pulley 定滑轮物理通用渲染组件
 *
 * 【设计意图】
 * 1. 统一物理模拟中定滑轮、动滑轮等拟物光影表现。
 * 2. 支持自适应极角和半径的悬挂吊架以及顶端底座的一体化绘制。
 */
export const Pulley: FC<PulleyProps> = ({
  cx,
  cy,
  r = 12,
  hangerTopY,
  ...restProps
}) => {
  return (
    <g pointerEvents="none" {...restProps}>
      {/* 1. 若指定了 hangerTopY，则渲染吊架及天花板 */}
      {hangerTopY != null && (
        <g>
          {/* 天花板挂架底座 */}
          <rect
            x={cx - 15}
            y={hangerTopY}
            width={30}
            height={6}
            fill={SCENE_COLORS.surface.wallFill}
            rx={1}
          />
          <line
            x1={cx - 25}
            y1={hangerTopY + 6}
            x2={cx + 25}
            y2={hangerTopY + 6}
            stroke={SCENE_COLORS.pendulum.arcPath}
            strokeWidth={1.5}
          />
          {/* 吊架连杆 */}
          <path
            d={`M ${cx} ${hangerTopY + 5} L ${cx} ${cy}`}
            stroke={SCENE_COLORS.pendulum.rodFill}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* 2. 定滑轮主体 */}
      {/* 轮圈外侧 */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="#f5f5f5"
        stroke={SCENE_COLORS.pendulum.rodFill}
        strokeWidth={2}
      />
      {/* 内圈轮槽视觉线 */}
      <circle
        cx={cx}
        cy={cy}
        r={Math.max(3, r - 4)}
        fill="none"
        stroke="#b5b5b5"
        strokeWidth={1}
        strokeDasharray="2,2"
      />
      {/* 轴心螺栓螺母 */}
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill="#404040"
      />
    </g>
  )
}
