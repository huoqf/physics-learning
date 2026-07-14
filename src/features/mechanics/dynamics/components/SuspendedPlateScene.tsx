/**
 * SuspendedPlateScene — 悬挂法重心实验场景组件
 *
 * 从 GravityBasicAnimation.tsx 拆分：模式 1 的所有渲染逻辑。
 */
import { FC } from 'react'
import { PhysicsGround } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { withAlpha } from '@/theme/physics'

interface PlateData {
  pinX: number
  pinY: number
  canvasVertices: { cx: number; cy: number }[]
  canvasCenter: { cx: number; cy: number }
  canvasHoles: { cx: number; cy: number }[]
  canvasWeight: { cx: number; cy: number }
  canvasPlumbLines: { x1: number; y1: number; x2: number; y2: number }[]
  currentRotation: number
  isSettled: boolean
}

interface SuspendedPlateSceneProps {
  plateData: PlateData
  activeHoleIdx: number
  showWeight: number
  weightMass: number
  showLines: number
  cx: number
  font: (size: number) => number
}

export const SuspendedPlateScene: FC<SuspendedPlateSceneProps> = ({
  plateData,
  activeHoleIdx,
  showWeight,
  weightMass,
  showLines,
  cx,
  font,
}) => {
  return (
    <g>
      {/* 绘制背景物理支架/黑板刻度 */}
      <PhysicsGround
        x={cx - 150} y={plateData.pinY - 40} width={300}
        type="bracket"
        appearance={{ color: PHYSICS_COLORS.axis }}
      />
      {/* 悬挂钉子 (固定点) */}
      <circle
        cx={plateData.pinX} cy={plateData.pinY} r={5}
        fill={PHYSICS_COLORS.gravity}
        stroke={SCENE_COLORS.pendulum.rodStroke}
        strokeWidth={1.5}
      />

      {/* 绘制不规则薄板 (金属拉丝渐变) */}
      <polygon
        points={plateData.canvasVertices.map((v) => `${v.cx},${v.cy}`).join(' ')}
        fill="url(#plate-grad)"
        stroke={PHYSICS_COLORS.labelText}
        strokeWidth={1.8}
        filter={`drop-shadow(2px 4px 6px ${withAlpha(SCENE_COLORS.materials.structStrokeDark, 0.15)})`}
      />

      {/* 绘制已经画出的重力铅垂线 (对应 3 个悬挂孔) */}
      {showLines === 1 && (
        <g>
          {plateData.canvasPlumbLines.map((line, idx) => {
            const isCurrent = idx === activeHoleIdx
            return (
              <line
                key={`plumbline-${idx}`}
                x1={line.x1} y1={line.y1}
                x2={line.x2} y2={line.y2}
                stroke={isCurrent ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.trackHistory}
                strokeWidth={isCurrent ? 1.5 : 0.8}
                strokeDasharray={isCurrent ? "4,3" : "2,2"}
                opacity={isCurrent ? 0.95 : 0.6}
              />
            )
          })}
        </g>
      )}

      {/* 绘制 3 个悬挂孔 */}
      {plateData.canvasHoles.map((hole, idx) => {
        const isActive = idx === activeHoleIdx
        return (
          <circle
            key={`hole-${idx}`}
            cx={hole.cx} cy={hole.cy} r={isActive ? 2.5 : 4}
            fill={isActive ? PHYSICS_COLORS.gravity : SCENE_COLORS.sphere.steel.specular} // 正在悬挂的孔内缩为钉子轴
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={1.2}
          />
        )
      })}
      
      {/* 悬挂孔的文字编号标注 (可见标注 1/5) */}
      {plateData.canvasHoles.map((hole, idx) => (
        <text
          key={`hole-label-${idx}`}
          x={hole.cx + (idx === 0 ? -10 : idx === 1 ? 10 : 8)}
          y={hole.cy + (idx === 2 ? 12 : -8)}
          fontSize={font(9)}
          fill={PHYSICS_COLORS.labelTextLight}
          fontWeight="bold"
          textAnchor="middle"
        >
          A{idx + 1}
        </text>
      ))}

      {/* 绘制黄铜配重块 (如果启用) */}
      {showWeight === 1 && (
        <g>
          <circle
            cx={plateData.canvasWeight.cx}
            cy={plateData.canvasWeight.cy}
            r={8 + weightMass * 2.5}
            fill="url(#brass-grad)"
            stroke={SCENE_COLORS.sphere.brassWeight.stroke}
            strokeWidth={1.5}
          />
          <circle
            cx={plateData.canvasWeight.cx}
            cy={plateData.canvasWeight.cy}
            r={2.5}
            fill={SCENE_COLORS.sphere.brassWeight.stroke}
          />
          {/* 配重块的质量文字 (可见标注 2/5) */}
          <text
            x={plateData.canvasWeight.cx}
            y={plateData.canvasWeight.cy - 12 - weightMass * 2}
            fontSize={font(9)}
            fill={SCENE_COLORS.sphere.brassWeight.stroke}
            fontWeight="bold"
            textAnchor="middle"
          >
            配重 M
          </text>
        </g>
      )}

      {/* 绘制重心点 C */}
      <g>
        {/* 重心十字定位符 */}
        <line
          x1={plateData.canvasCenter.cx - 6} y1={plateData.canvasCenter.cy}
          x2={plateData.canvasCenter.cx + 6} y2={plateData.canvasCenter.cy}
          stroke={CANVAS_COLORS.annotation}
          strokeWidth={1.2}
        />
        <line
          x1={plateData.canvasCenter.cx} y1={plateData.canvasCenter.cy - 6}
          x2={plateData.canvasCenter.cx} y2={plateData.canvasCenter.cy + 6}
          stroke={CANVAS_COLORS.annotation}
          strokeWidth={1.2}
        />
        <circle
          cx={plateData.canvasCenter.cx} cy={plateData.canvasCenter.cy} r={2.5}
          fill={CANVAS_COLORS.annotation}
        />
        {/* 重心标注 (可见标注 3/5) */}
        <text
          x={plateData.canvasCenter.cx + 10}
          y={plateData.canvasCenter.cy - 4}
          fontSize={font(11)}
          fill={CANVAS_COLORS.annotation}
          fontWeight="bold"
        >
          重心 C
        </text>
      </g>

      {/* 平衡静止后向下悬挂的红色铅垂线指示文字 (可见标注 4/5) */}
      {plateData.isSettled && showLines === 1 && (
        <text
          x={plateData.pinX + 16}
          y={plateData.pinY + 140}
          fontSize={font(10)}
          fill={PHYSICS_COLORS.acceleration}
          fontWeight="bold"
        >
          铅垂重力线
        </text>
      )}
    </g>
  )
}
