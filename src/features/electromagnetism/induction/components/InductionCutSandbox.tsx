import React from 'react'
import { ConductingRod, MagneticFieldGrid, Rails, DragHandle } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { INDUCTION_LAYOUT } from '../utils'

interface InductionCutSandboxProps {
  rodX: number            // 导体棒在设计坐标系下的 x 坐标 (100 - 300)
  currentI: number        // 瞬时感应电流 (有符号)
  time: number            // 动画流动时间
  font: (base: number) => number
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void
}

/**
 * 实验一：导体切割磁感线沙盒组件
 *
 * 职责：
 * 1. 渲染匀强磁场矩形区域与磁感线 (⊗)
 * 2. 渲染水平金属导轨 (复用 Rails 组件)
 * 3. 渲染拖拽金属导体棒 (复用 ConductingRod)
 * 4. 渲染导轨到电流计的曲线连线与流光点
 */
export const InductionCutSandbox: React.FC<InductionCutSandboxProps> = ({
  rodX,
  currentI,
  time,
  font,
  onPointerDown,
}) => {
  // 轨道与磁场的几何布局设计坐标 (充盈 650 视口，间距拉大至 180)
  const railY1 = 160
  const railY2 = 340
  const railSpacing = railY2 - railY1 // 180

  // 磁场边界: 120 <= x <= 280, 140 <= y <= 360
  const fieldLeft = 120
  const fieldRight = 280
  const fieldTop = 140
  const fieldBottom = 360

  // 导轨中心位置与尺寸
  const railCx = 200
  const railCy = (railY1 + railY2) / 2 // 250
  const railLength = 240

  // 导轨右端 x 坐标
  const railRightX = 320

  // 电流计接线柱设计坐标 (绑定 INDUCTION_LAYOUT 动态解算)
  const galRightTermX = INDUCTION_LAYOUT.galvanometerX + 30  // 右接线柱 (+) -> 450
  const galRightTermY = INDUCTION_LAYOUT.galvanometerY + 100 // 520
  const galLeftTermX = INDUCTION_LAYOUT.galvanometerX - 30   // 左接线柱 (-) -> 390
  const galLeftTermY = INDUCTION_LAYOUT.galvanometerY + 100  // 520

  // 判定导体棒的电流指示方向
  let rodCurrentDir: 'in' | 'out' | 'none' = 'none'
  if (currentI > 0.01) {
    rodCurrentDir = 'out'
  } else if (currentI < -0.01) {
    rodCurrentDir = 'in'
  }

  // 上导轨右端 → 电流计右接线柱(+): 三次贝塞尔，控制点靠右避免交叉
  const wireUpper = `M ${railRightX} ${railY1} C ${railRightX + 200} ${railY1} ${railRightX + 200} ${galRightTermY} ${galRightTermX} ${galRightTermY}`
  // 下导轨右端 → 电流计左接线柱(-): 控制点靠左，与上轨路径不交叉
  const wireLower = `M ${railRightX} ${railY2} C ${railRightX + 80} ${railY2} ${galLeftTermX - 20} ${galLeftTermY} ${galLeftTermX} ${galLeftTermY}`
  // 两轨右端竖直连线（模式 0 不需要）

  // 流光动画路径（与导线路径一致）
  const flowUpper = wireUpper
  const flowLower = wireLower

  return (
    <g>
      {/* 1. 匀强磁场边界虚线框与阴影 */}
      <rect
        x={fieldLeft - 10}
        y={fieldTop - 10}
        width={fieldRight - fieldLeft + 20}
        height={fieldBottom - fieldTop + 20}
        fill={PHYSICS_COLORS.objectFill}
        stroke={PHYSICS_COLORS.grid}
        strokeWidth="1"
        strokeDasharray="4,4"
        opacity="0.5"
      />
      <text
        x={(fieldLeft + fieldRight) / 2}
        y={fieldTop - 18}
        fill={PHYSICS_COLORS.magneticFieldCross}
        fontSize={font(10)}
        fontWeight="bold"
        textAnchor="middle"
      >
        匀强磁场 B (垂直向里 ⊗)
      </text>

      {/* 2. 磁感线 (⊗ 阵列) */}
      <MagneticFieldGrid
        x={fieldLeft}
        y={fieldTop}
        w={fieldRight - fieldLeft}
        h={fieldBottom - fieldTop}
        direction="in"
        rows={4}
        cols={5}
        radius={5}
      />

      {/* 3. 水平导轨 (复用 Rails 组件) */}
      <Rails
        type="horizontal"
        length={railLength}
        spacing={railSpacing}
        width={railLength}
        height={railSpacing + 20}
        cx={railCx}
        cy={railCy}
      />

      {/* 4. 导轨右端到电流计的曲线连线 */}
      <path d={wireUpper} fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth="3.5" />
      <path d={wireLower} fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth="3.5" />

      {/* 5. 导体棒物理组件 (ConductingRod, 高度=500, 搭在 180 间距导轨上) */}
      <ConductingRod
        type="horizontal"
        x={rodX}
        spacing={railSpacing}
        height={500}
        currentDir={rodCurrentDir}
      />
      <DragHandle cx={rodX} cy={railCy} color={PHYSICS_COLORS.magneticField}
        cursor="grab" onPointerDown={onPointerDown} />

      {/* 6. 回路导线上的流光动画 */}
      {Math.abs(currentI) > 0.05 && (
        <g style={{ filter: `drop-shadow(0 0 2px ${PHYSICS_COLORS.electricCurrent})` }}>
          <path
            d={flowUpper}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth="3.5"
            strokeDasharray="6, 12"
            strokeDashoffset={currentI > 0 ? -time * 50 : time * 50}
            opacity="0.85"
          />
          <path
            d={flowLower}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth="3.5"
            strokeDasharray="6, 12"
            strokeDashoffset={currentI > 0 ? time * 50 : -time * 50}
            opacity="0.85"
          />
        </g>
      )}

      {/* 标注 */}
      <text
        x="200"
        y={railY2 + 32}
        fill={SCENE_COLORS.labels.panelTextMuted}
        fontSize={font(9)}
        textAnchor="middle"
        fontWeight="bold"
      >
        水平平行导轨 (金属棒可左右拖动)
      </text>
    </g>
  )
}

export default InductionCutSandbox
