import React, { useMemo } from 'react'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
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
  bFieldDir?: number
  font?: (size: number) => number
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
  bFieldDir = 0,
  font = (s) => s,
}) => {
  const scaleX = w / 500
  const scaleY = h / 300
  const scale = Math.min(scaleX, scaleY)

  // 导体棒物理位移 [-1.1, 1.1] 映射为 3D 比例 (0-1)
  const rodRatio = useMemo(() => {
    const xMin = -1.1
    const xMax = 1.1
    // 限制范围在 [0, 1]
    return Math.max(0, Math.min(1, (physicsResult.x - xMin) / (xMax - xMin)))
  }, [physicsResult.x])

  const thetaRad = (theta * Math.PI) / 180
  const sinT = Math.sin(thetaRad)
  const cosT = Math.cos(thetaRad)
  const hasField = Math.abs(B) > 1e-4

  // 我们将在导轨中间渲染磁场，并自适应多方向磁场平移
  const magneticField3D = useMemo(() => {
    if (!hasField) return null

    const pointsBottom = [
      { x: 195, y: 260 }, // 后左
      { x: 335, y: 215 }, // 后右
      { x: 395, y: 255 }, // 前右
      { x: 255, y: 300 }, // 前左
    ]

    const baseLines = [
      { x: 230, y: 280 },
      { x: 300, y: 258 },
      { x: 370, y: 235 },
      { x: 280, y: 238 },
      { x: 340, y: 216 },
    ]

    let dx_field = 0
    let dy_field = -120

    if (bFieldDir === 0) {
      dx_field = 0
      dy_field = -120
    } else if (bFieldDir === 1) {
      dx_field = -120 * sinT
      dy_field = -120 * cosT
    } else {
      dx_field = 120 * cosT
      dy_field = 0
    }

    const pointsTop = pointsBottom.map((p) => ({ x: p.x + dx_field, y: p.y + dy_field }))

    const polyBottom = pointsBottom.map((p) => `${p.x},${p.y}`).join(' ')
    const polyTop = pointsTop.map((p) => `${p.x},${p.y}`).join(' ')
    const polyLeft = [pointsBottom[0], pointsTop[0], pointsTop[3], pointsBottom[3]].map((p) => `${p.x},${p.y}`).join(' ')
    const polyRight = [pointsBottom[1], pointsTop[1], pointsTop[2], pointsBottom[2]].map((p) => `${p.x},${p.y}`).join(' ')
    const polyBack = [pointsBottom[0], pointsTop[0], pointsTop[1], pointsBottom[1]].map((p) => `${p.x},${p.y}`).join(' ')
    const polyFront = [pointsBottom[3], pointsTop[3], pointsTop[2], pointsBottom[2]].map((p) => `${p.x},${p.y}`).join(' ')

    return {
      polyBottom,
      polyTop,
      polyLeft,
      polyRight,
      polyBack,
      polyFront,
      baseLines,
      dx_field,
      dy_field,
    }
  }, [hasField, bFieldDir, sinT, cosT])

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* 3D 场景背景卡片底板 */}
      <rect
        x="0"
        y="0"
        width={w}
        height={h}
        fill="none"
        stroke="none"
      />
      <text
        x="20"
        y="22"
        fontSize={font(9)}
        fill={PHYSICS_COLORS.labelText}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        3D 场景展示 (斜坡)
      </text>

      {/* 3D 物理核心场景（使用 scale 统一缩放，以 500x300 基准进行渲染，避免在不同视口下发生几何错位） */}
      <g transform={`scale(${scale})`}>
        {/* 磁场包围盒后表面 */}
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
          width={500}
          height={300}
          L={4.0}
        />

        {/* 磁场包围盒前表面与磁感线 (渲染在导轨上层) */}
        {magneticField3D && (
          <g>
            {/* 三维磁场包围盒顶盖与前侧面 */}
            <polygon points={magneticField3D.polyTop} fill={PHYSICS_COLORS.magneticField} fillOpacity="0.08" stroke={PHYSICS_COLORS.magneticField} strokeWidth="0.5" strokeOpacity="0.3" />
            <polygon points={magneticField3D.polyFront} fill={PHYSICS_COLORS.magneticField} fillOpacity="0.06" stroke={PHYSICS_COLORS.magneticField} strokeWidth="0.5" strokeOpacity="0.2" />

            {/* 3D 磁场偏转虚线与箭头 */}
            {magneticField3D.baseLines.map((line, idx) => {
              const isBUp = B > 0
              const xStart = isBUp ? line.x : line.x + magneticField3D.dx_field
              const yStart = isBUp ? line.y : line.y + magneticField3D.dy_field
              const xEnd = isBUp ? line.x + magneticField3D.dx_field : line.x
              const yEnd = isBUp ? line.y + magneticField3D.dy_field : line.y

              const angleRad = Math.atan2(yEnd - yStart, xEnd - xStart)
              const angleDeg = (angleRad * 180) / Math.PI

              return (
                <g key={idx}>
                  {/* 磁感线 */}
                  <line
                    x1={xStart}
                    y1={yStart}
                    x2={xEnd}
                    y2={yEnd}
                    stroke={PHYSICS_COLORS.magneticField}
                    strokeWidth="1.2"
                    strokeDasharray="3,3"
                    opacity="0.6"
                  />
                  {/* 3D 磁场旋转箭头 */}
                  <g transform={`translate(${xEnd}, ${yEnd}) rotate(${angleDeg})`}>
                    <polygon
                      points="0,0 -4.5,-2.2 -4.5,2.2"
                      fill={PHYSICS_COLORS.magneticField}
                      opacity="0.8"
                    />
                  </g>
                  {/* 3D 磁场标识 B 矢量符号 */}
                  {idx === 2 && (
                    <g transform={`translate(${xEnd + (bFieldDir === 2 ? -15 : 12)}, ${yEnd + (bFieldDir === 2 ? 10 : -2)})`}>
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
                      <text
                        x="0"
                        y="2"
                        fontSize={font(9) / scale}
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
              y={240 - 126}
              fontSize={font(7) / scale}
              fill={PHYSICS_COLORS.magneticField}
              fontWeight="extrabold"
              textAnchor="middle"
              style={{ userSelect: 'none' }}
            >
              匀强磁场 B = {Math.abs(B).toFixed(1)} T ({(() => {
                if (bFieldDir === 0) return B > 0 ? '竖直向上' : '竖直向下';
                if (bFieldDir === 1) return B > 0 ? '垂直斜面向上' : '垂直斜面向下';
                return B > 0 ? '水平向右' : '水平向左';
              })()})
            </text>
          </g>
        )}

        {/* 3D 导体棒 */}
        <ConductingRod
          type="inclined"
          x={rodRatio}
          currentDir={I > 0 ? 'in' : I < 0 ? 'out' : 'none'}
          L={4.0}
          width={500}
          height={300}
        />
      </g>

      {/* 平衡/滑动提示标语 */}
      <g transform="translate(20, 265)">
        {physicsResult.state === 'equilibrium' ? (
          <g>
            <rect x="0" y="0" width="85" height="15" fill={withAlpha(PHYSICS_COLORS.forceNet, 0.12)} stroke={withAlpha(PHYSICS_COLORS.forceNet, 0.35)} strokeWidth="0.8" rx="4" />
            <text x="42.5" y="10" fontSize={font(7)} fill={PHYSICS_COLORS.forceNet} fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
              ✓ 导体棒静止平衡
            </text>
          </g>
        ) : (
          <g>
            <rect x="0" y="0" width="85" height="15" fill={withAlpha(PHYSICS_COLORS.forceArrowRed, 0.08)} stroke={withAlpha(PHYSICS_COLORS.forceArrowRed, 0.3)} strokeWidth="0.8" rx="4" />
            <text x="42.5" y="10" fontSize={font(7)} fill={PHYSICS_COLORS.forceArrowRed} fontWeight="extrabold" textAnchor="middle" style={{ userSelect: 'none' }}>
              ⚠ {physicsResult.state === 'sliding-up' ? '往斜面上滑中' : '往斜面下滑中'}
            </text>
          </g>
        )}
      </g>
    </g>
  )
}

export default InclinedAmpereScene
