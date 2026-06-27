import { MARKER_TIERS, type MarkerTier } from '../../theme/physics/vectorStyle';
import { markerId } from './vectorDefsUtils';

function markerPath(w: number, h: number): string {
  return `M0,0 L${w},${h / 2} L0,${h} Z`;
}

/**
 * SVG 箭头标记定义组件
 *
 * 在 SVG <defs> 中批量生成不同尺寸等级（small/medium/large）× 多种颜色的箭头标记。
 * 配合 VectorArrow 组件使用，通过 marker-end/marker-start 引用。
 * - markerUnits="userSpaceOnUse"：标记尺寸不随 stroke-width 缩放
 * - orient="auto"：箭头自动跟随路径方向
 */
export function VectorDefs({ colors }: { colors: string[] }) {
  return (
    <defs>
      {colors.map((color) =>
        (Object.keys(MARKER_TIERS) as MarkerTier[]).map((tier) => {
          const { width, height } = MARKER_TIERS[tier];
          return (
            <marker
              key={`${tier}-${color}`}
              id={markerId(tier, color)}
              markerWidth={width}
              markerHeight={height}
              refX={width}
              refY={height / 2}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d={markerPath(width, height)} fill={color} />
            </marker>
          );
        }),
      )}
    </defs>
  );
}
