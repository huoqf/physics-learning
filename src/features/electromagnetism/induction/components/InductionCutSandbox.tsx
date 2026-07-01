import React from 'react'
import { ConductingRod, MagneticFieldGrid } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE } from '@/theme/physics'

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
 * 2. 渲染水平金属导轨
 * 3. 渲染拖拽金属导体棒 (复用 ConductingRod)
 * 4. 渲染导轨连接到副回路插座的闭合导线与流光点
 */
export const InductionCutSandbox: React.FC<InductionCutSandboxProps> = ({
  rodX,
  currentI,
  time,
  font,
  onPointerDown,
}) => {
  // 轨道与磁场的几何布局设计坐标
  const railY1 = 110
  const railY2 = 210
  const railSpacing = railY2 - railY1 // 100

  // 磁场边界: 120 <= x <= 280, 100 <= y <= 220
  const fieldLeft = 120
  const fieldRight = 280
  const fieldTop = 100
  const fieldBottom = 220

  // 回路连线导线：从导轨右端(320)延伸到主副线圈固定端点插头 (340, 280) 和 (500, 280)
  // 上导轨连线：(320, 110) -> (320, 280) -> (340, 280)
  // 下导轨连线：(320, 210) -> (500, 210) -> (500, 280)
  const wireUpperPath = `M ${320} ${railY1} L ${320} ${280} L ${340} ${280}`
  const wireLowerPath = `M ${320} ${railY2} L ${500} ${railY2} L ${500} ${280}`

  // 判定导体棒的电流指示方向
  // 磁场向里，向右运动（速度 v > 0，感应电动势方向向上即 S -> N 绕行）。
  // ConductingRod 水平模式中，y1 在上方，y2 在下方，电流 upward (y2 -> y1) 对应 'out' (出)，向下为 'in' (入)。
  let rodCurrentDir: 'in' | 'out' | 'none' = 'none'
  if (currentI > 0.01) {
    rodCurrentDir = 'out' // 向上流出导体棒
  } else if (currentI < -0.01) {
    rodCurrentDir = 'in' // 向下流入导体棒
  }

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

      {/* 3. 水平导轨平行线 (金属材质色) */}
      <line
        x1="80"
        y1={railY1}
        x2="320"
        y2={railY1}
        stroke={SCENE_COLORS.circuit.wire}
        strokeWidth={CANVAS_STYLE.stroke.objectLine}
        strokeLinecap="round"
      />
      <line
        x1="80"
        y1={railY2}
        x2="320"
        y2={railY2}
        stroke={SCENE_COLORS.circuit.wire}
        strokeWidth={CANVAS_STYLE.stroke.objectLine}
        strokeLinecap="round"
      />
      
      {/* 4. 导轨到主回路固定端口的闭合导线 */}
      <path
        d={wireUpperPath}
        fill="none"
        stroke={SCENE_COLORS.circuit.wire}
        strokeWidth={CANVAS_STYLE.stroke.objectThin}
      />
      <path
        d={wireLowerPath}
        fill="none"
        stroke={SCENE_COLORS.circuit.wire}
        strokeWidth={CANVAS_STYLE.stroke.objectThin}
      />

      {/* 5. 导体棒物理组件复用 (ConductingRod, 高度=320, 使得 y1=90, y2=230, 刚好搭在 y=110 和 y=210 导轨上) */}
      <g onPointerDown={onPointerDown} className="cursor-grab active:cursor-grabbing">
        <ConductingRod
          type="horizontal"
          x={rodX}
          spacing={railSpacing}
          height={320}
          currentDir={rodCurrentDir}
        />
      </g>

      {/* 6. 回路导线上的流光动画 */}
      {Math.abs(currentI) > 0.05 && (
        <g style={{ filter: `drop-shadow(0 0 2px ${PHYSICS_COLORS.electricCurrent})` }}>
          {/* 上导轨流光：从导体顶端 (rodX, 110) -> (320, 110) -> (320, 280) -> (340, 280) */}
          <path
            d={`M ${rodX} ${railY1} L 320 ${railY1} L 320 280 L 340 280`}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth="3.5"
            strokeDasharray="6, 12"
            strokeDashoffset={currentI > 0 ? -time * 50 : time * 50}
            opacity="0.85"
          />
          {/* 下导轨流光：从 (340, 280插座，即电流计流出端经过下轨回路) -> (500, 280) -> (500, 210) -> (320, 210) -> (rodX, 210) */}
          <path
            d={`M 500 280 L 500 ${railY2} L 320 ${railY2} L ${rodX} ${railY2}`}
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
