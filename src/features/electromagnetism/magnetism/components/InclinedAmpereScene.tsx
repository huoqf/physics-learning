import React, { useMemo } from 'react'
import { colors } from '@/theme/colors'
import { PHYSICS_COLORS } from '@/theme/physics'
import { Rails } from '@/components/Physics/Rails'
import { ConductingRod } from '@/components/Physics/ConductingRod'
import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'

interface InclinedAmpereSceneProps {
  x: number
  y: number
  w: number
  h: number
  physicsResult: AdvancedAmperePhysicsResult
  I: number
  B: number
  theta: number
}

export const InclinedAmpereScene: React.FC<InclinedAmpereSceneProps> = ({
  x,
  y,
  w,
  h,
  physicsResult,
  I,
  B,
  theta,
}) => {
  // 导体棒物理位移 [-1.1, 1.1] 映射为 3D 比例 (0-1)
  const rodRatio = useMemo(() => {
    const xMin = -1.1
    const xMax = 1.1
    // 限制范围在 [0, 1]
    return Math.max(0, Math.min(1, (physicsResult.x - xMin) / (xMax - xMin)))
  }, [physicsResult.x])

  // 匀强磁场 3D 虚线和方腔渲染
  const hasField = Math.abs(B) > 1e-4

  // 我们将在导轨中间渲染磁场
  // 3D 导轨的坐标系中，导轨1低端 (120, 230)，高端 (420, 130)
  // 导轨2前移 dx=60, dy=40 (对于 L=4.0 左右)
  // 我们将磁场渲染在 x 比例为 0.25 到 0.75 之间的一个三维方腔内
  const magneticField3D = useMemo(() => {
    if (!hasField) return null

    // 磁场包围盒在 3D 导轨的局部坐标
    // 底部四点: (200, 260) -> (340, 215) -> (400, 255) -> (260, 300)
    // 顶部向上平移 yOffset (比如 120 像素)
    const pointsBottom = [
      { x: 195, y: 260 }, // 后左
      { x: 335, y: 215 }, // 后右
      { x: 395, y: 255 }, // 前右
      { x: 255, y: 300 }, // 前左
    ]

    const yHeight = 120
    const pointsTop = pointsBottom.map((p) => ({ x: p.x, y: p.y - yHeight }))

    const polyBottom = pointsBottom.map((p) => `${p.x},${p.y}`).join(' ')
    const polyTop = pointsTop.map((p) => `${p.x},${p.y}`).join(' ')
    const polyLeft = [pointsBottom[0], pointsTop[0], pointsTop[3], pointsBottom[3]].map((p) => `${p.x},${p.y}`).join(' ')
    const polyRight = [pointsBottom[1], pointsTop[1], pointsTop[2], pointsBottom[2]].map((p) => `${p.x},${p.y}`).join(' ')
    const polyBack = [pointsBottom[0], pointsTop[0], pointsTop[1], pointsBottom[1]].map((p) => `${p.x},${p.y}`).join(' ')
    const polyFront = [pointsBottom[3], pointsTop[3], pointsTop[2], pointsBottom[2]].map((p) => `${p.x},${p.y}`).join(' ')

    // 磁感线箭头线
    const fieldLines = [
      { x: 230, yBottom: 280, yTop: 280 - yHeight },
      { x: 300, yBottom: 258, yTop: 258 - yHeight },
      { x: 370, yBottom: 235, yTop: 235 - yHeight },
      { x: 280, yBottom: 238, yTop: 238 - yHeight },
      { x: 340, yBottom: 216, yTop: 216 - yHeight },
    ]

    return {
      polyBottom,
      polyTop,
      polyLeft,
      polyRight,
      polyBack,
      polyFront,
      fieldLines,
      yHeight,
    }
  }, [hasField])

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* 3D 场景背景卡片底板 */}
      <rect
        x="0"
        y="0"
        width={w}
        height={h}
        fill={colors.neutral[50]}
        stroke={colors.neutral[200]}
        strokeWidth="1.2"
        rx="6"
      />
      <text
        x="20"
        y="22"
        fontSize="9"
        fill={colors.neutral[700]}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        3D 场景展示 (斜坡)
      </text>

      {/* 磁场包围盒后表面 (渲染在导轨下层，以保证正确的遮挡关系) */}
      {magneticField3D && (
        <g>
          {/* 后侧和底侧面，用浅绿不透明充当三维空间 */}
          <polygon points={magneticField3D.polyBack} fill={PHYSICS_COLORS.magneticField} fillOpacity="0.05" />
          <polygon points={magneticField3D.polyLeft} fill={PHYSICS_COLORS.magneticField} fillOpacity="0.04" />
        </g>
      )}

      {/* 3D 导轨架 */}
      <Rails
        type="inclined"
        theta={theta}
        width={w}
        height={h}
        L={4.0}
      />

      {/* 磁场包围盒前表面与磁感线 (渲染在导轨上层) */}
      {magneticField3D && (
        <g>
          {/* 三维磁场包围盒顶盖与前侧面 */}
          <polygon points={magneticField3D.polyTop} fill={PHYSICS_COLORS.magneticField} fillOpacity="0.08" stroke={PHYSICS_COLORS.magneticField} strokeWidth="0.5" strokeOpacity="0.3" />
          <polygon points={magneticField3D.polyFront} fill={PHYSICS_COLORS.magneticField} fillOpacity="0.06" stroke={PHYSICS_COLORS.magneticField} strokeWidth="0.5" strokeOpacity="0.2" />

          {/* 磁场竖直虚线箭头 */}
          {magneticField3D.fieldLines.map((line, idx) => {
            const isBUp = B > 0
            const yStart = isBUp ? line.yBottom : line.yTop
            const yEnd = isBUp ? line.yTop : line.yBottom
            const arrowDir = isBUp ? -1 : 1

            return (
              <g key={idx}>
                {/* 磁感线 */}
                <line
                  x1={line.x}
                  y1={yStart}
                  x2={line.x}
                  y2={yEnd}
                  stroke={PHYSICS_COLORS.magneticField}
                  strokeWidth="1.2"
                  strokeDasharray="3,3"
                  opacity="0.6"
                />
                {/* 3D 磁场箭头 */}
                <polygon
                  points={`${line.x},${yEnd} ${line.x - 2.5},${yEnd - arrowDir * 4} ${line.x + 2.5},${yEnd - arrowDir * 4}`}
                  fill={PHYSICS_COLORS.magneticField}
                  opacity="0.8"
                />
                {/* 3D 磁场标识 B 矢量符号 (在特定代表性磁场线顶部右侧渲染) */}
                {idx === 2 && (
                  <g transform={`translate(${line.x + 12}, ${yEnd + (isBUp ? -2 : 12)})`}>
                    {/* 上方的矢量箭头 */}
                    <path
                      d="M -3.5,-6 L 2.5,-6 M 0,-7.8 L 2.5,-6 L 0,-4.2"
                      fill="none"
                      stroke={PHYSICS_COLORS.magneticField}
                      strokeWidth="1.0"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                    {/* 字母 B */}
                    <text
                      x="0"
                      y="2"
                      fontSize="9"
                      fill={PHYSICS_COLORS.magneticField}
                      fontWeight="bold"
                      fontStyle="italic"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ userSelect: 'none' }}
                    >
                      B
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          <text
            x="320"
            y={240 - magneticField3D.yHeight - 6}
            fontSize="7"
            fill={PHYSICS_COLORS.magneticField}
            fontWeight="extrabold"
            textAnchor="middle"
            style={{ userSelect: 'none' }}
          >
            匀强磁场 B = {Math.abs(B).toFixed(1)} T ({B > 0 ? '竖直向上' : '竖直向下'})
          </text>
        </g>
      )}

      {/* 3D 导体棒 */}
      <ConductingRod
        type="inclined"
        x={rodRatio}
        currentDir={I > 0 ? 'in' : I < 0 ? 'out' : 'none'}
        L={4.0}
        width={w}
        height={h}
      />

      {/* 平衡/滑动提示标语 */}
      <g transform="translate(20, 265)">
        {physicsResult.state === 'equilibrium' ? (
          <g>
            <rect x="0" y="0" width="85" height="15" fill={colors.success[50]} stroke={colors.success[300]} strokeWidth="0.8" rx="4" />
            <text x="42.5" y="10" fontSize="7" fill={colors.success[700]} fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
              ✓ 导体棒静止平衡
            </text>
          </g>
        ) : (
          <g>
            <rect x="0" y="0" width="85" height="15" fill={colors.danger[50]} stroke={colors.danger[300]} strokeWidth="0.8" rx="4" />
            <text x="42.5" y="10" fontSize="7" fill={colors.danger[700]} fontWeight="extrabold" textAnchor="middle" style={{ userSelect: 'none' }}>
              ⚠ {physicsResult.state === 'sliding-up' ? '往斜面上滑中' : '往斜面下滑中'}
            </text>
          </g>
        )}
      </g>
    </g>
  )
}

export default InclinedAmpereScene
