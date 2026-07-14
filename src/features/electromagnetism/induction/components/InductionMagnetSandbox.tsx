import React from 'react'
import { BarMagnet, ParametricMagneticField, VectorArrow, DragHandle } from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
import { INDUCTION_LAYOUT } from '../utils'

interface InductionMagnetSandboxProps {
  magnetX: number         // 磁铁中心在设计坐标系下的 x 坐标 (80 - 580)
  magnetSpeed: number     // 磁铁当前的移动速度 (有符号)
  magnetPole: number      // 磁极指向：1=左S右N, -1=左N右S
  showLines: number       // 是否显示磁感线 (0=不显示, 1=显示)
  coilX: number           // 副线圈中心 (420)
  coilY: number           // 副线圈中心 y (160)
  font: (base: number) => number
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void
}

/**
 * 实验二：条形磁铁插入/穿过线圈沙盒组件
 * 
 * 职责：
 * 1. 渲染带速度指示矢量的条形磁铁 (复用 BarMagnet, 支持手动拖拽)
 * 2. 渲染磁铁周围的偶极磁感线 (复用 ParametricMagneticField)
 */
export const InductionMagnetSandbox: React.FC<InductionMagnetSandboxProps> = ({
  magnetX,
  magnetSpeed,
  magnetPole,
  showLines,
  coilX,
  coilY,
  font,
  onPointerDown,
}) => {
  // 磁场强度渐变系数：当磁铁靠近线圈时，显示磁场的亮度提高，体现耦合增强
  const overlapRatio = React.useMemo(() => {
    const dist = Math.abs(coilX - magnetX)
    const activeRange = 180 // 磁铁中心到线圈中心在 180 像素内有明显的磁场交互
    return Math.max(0, 1 - dist / activeRange)
  }, [magnetX, coilX])

  const fieldOpacity = 0.35 + Math.min(1, overlapRatio * 2) * 0.55

  return (
    <g>
      {/* 1. 磁铁的偶极子磁场分布 */}
      {showLines === 1 && (
        <g transform={`translate(${magnetX}, ${coilY})`} opacity={fieldOpacity}>
          <ParametricMagneticField
            w={120}
            h={36}
            pole={magnetPole as 1 | -1}
            canvasHeight={INDUCTION_LAYOUT.DESIGN_H}
            lineColor={withAlpha(PHYSICS_COLORS.magneticField, 0.8)}
          />
        </g>
      )}

      {/* 2. 磁铁速度指示矢量箭头 */}
      {Math.abs(magnetSpeed) > 0.1 && (
        <g>
          <VectorArrow
            originDesign={{ x: magnetX, y: coilY - 30 }}
            vector={{ x: magnetSpeed * 15, y: 0 }}
            type="velocity"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            color={PHYSICS_COLORS.velocity}
            pixelLength={Math.max(15, Math.min(50, Math.abs(magnetSpeed * 15)))}
            strokeWidth={2}
          />
          <text
            x={magnetX + (magnetSpeed > 0 ? 1 : -1) * 35}
            y={coilY - 42}
            fontSize={font(9)}
            fill={PHYSICS_COLORS.velocity}
            fontWeight="bold"
            textAnchor="middle"
          >
            v = {magnetSpeed.toFixed(1)} px/s
          </text>
        </g>
      )}

      {/* 3. 条形磁铁主体 (复用 BarMagnet, 支持鼠标拖动) */}
      <BarMagnet
        x={magnetX}
        y={coilY}
        width={120}
        height={36}
        pole={magnetPole as 1 | -1}
      />
      <DragHandle cx={magnetX} cy={coilY} color={PHYSICS_COLORS.magnetNorth}
        cursor="grab" onPointerDown={onPointerDown} />
    </g>
  )
}

export default InductionMagnetSandbox
