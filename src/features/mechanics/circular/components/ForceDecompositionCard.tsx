import React from 'react'
import type { VerticalCircularMotionPoint } from '@/physics/dynamics/dynamics-advanced'
import { GRAVITY } from '@/physics'
import type { CanvasSize } from '@/utils'
import { colors, PHYSICS_COLORS, SCENE_COLORS, CHART_COLORS, CANVAS_COLORS } from '@/theme'

interface ForceDecompositionCardProps {
  currentPoint: VerticalCircularMotionPoint
  cardWidth: number
  cardHeight: number
  cardX: number
  cardY: number
  m: number
  r: number
  v0: number
  trackType: number
  canvasSize: CanvasSize
}

const renderCloseUpArrow = (
  x1: number, y1: number, x2: number, y2: number,
  color: string, zoom: number, dashed = false
) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1.5) return null

  const ux = dx / len
  const uy = dy / len
  const headLen = 10 * zoom
  const headWidth = 8 * zoom
  const lineEndX = x2 - ux * headLen
  const lineEndY = y2 - uy * headLen
  const perpX = -uy
  const perpY = ux
  const p1X = lineEndX + perpX * (headWidth / 2)
  const p1Y = lineEndY + perpY * (headWidth / 2)
  const p2X = lineEndX - perpX * (headWidth / 2)
  const p2Y = lineEndY - perpY * (headWidth / 2)

  return (
    <g key={`${x2}-${y2}-${color}`}>
      <line
        x1={x1} y1={y1} x2={lineEndX} y2={lineEndY}
        stroke={color}
        strokeWidth={Math.max(1.2, 2.2 * zoom)}
        strokeLinecap="round"
        {...(dashed ? { strokeDasharray: '3 2' } : {})}
      />
      <polygon
        points={`${p1X},${p1Y} ${x2},${y2} ${p2X},${p2Y}`}
        fill={color}
      />
    </g>
  )
}

export const ForceDecompositionCard = React.memo(function ForceDecompositionCard({
  currentPoint, cardWidth, cardHeight, cardX, cardY,
  m, r, v0, trackType, canvasSize,
}: ForceDecompositionCardProps) {
  const zoom = Math.min(cardWidth / 290, (cardHeight * 0.45) / 153)

  const ballCX = cardWidth * 0.50
  const ballCY = cardHeight * 0.28

  const theta = currentPoint.theta
  const thetaDeg = (theta * 180) / Math.PI

  const dx_out = Math.sin(theta)
  const dy_out = Math.cos(theta)
  const dx_tangent = Math.cos(theta)
  const dy_tangent = -Math.sin(theta)

  const gLen = 75 * zoom
  const advRefF = Math.max(m * GRAVITY + (m * v0 * v0) / r, 15.0)
  const F_constraint_val = currentPoint.state === 'flying' ? 0 : currentPoint.N

  const nForceLen = currentPoint.state === 'flying' ? 0 : Math.max(25 * zoom, Math.min(80 * zoom, (Math.abs(F_constraint_val) / advRefF) * 80 * zoom)) * (F_constraint_val >= 0 ? 1 : -1)
  const px_N = nForceLen * (-dx_out)
  const py_N = nForceLen * (-dy_out)

  const Gn_val_abs = Math.abs(m * GRAVITY * Math.cos(theta))
  const Gt_val_abs = Math.abs(m * GRAVITY * Math.sin(theta))

  const px_G_n = gLen * Math.cos(theta) * Math.sin(theta)
  const py_G_n = gLen * Math.cos(theta) * Math.cos(theta)
  const px_G_t = -gLen * Math.sin(theta) * Math.cos(theta)
  const py_G_t = gLen * Math.sin(theta) * Math.sin(theta)

  const F_xiang_val = currentPoint.state === 'on-track'
    ? m * r * currentPoint.omega * currentPoint.omega
    : 0
  const G_val = m * GRAVITY

  const svgH = cardHeight * 0.52

  return (
    <div
      className="absolute"
      style={{
        left: cardX,
        top: cardY,
        width: cardWidth,
        height: cardHeight,
        background: colors.neutral.white,
        borderRadius: 8,
        border: `0.8px solid ${CHART_COLORS.axisLine}`,
        overflow: 'hidden',
      }}
    >
      <svg width={cardWidth} height={svgH}>
        <line
          x1={ballCX - dx_out * 90 * zoom} y1={ballCY - dy_out * 90 * zoom}
          x2={ballCX + dx_out * 90 * zoom} y2={ballCY + dy_out * 90 * zoom}
          stroke={PHYSICS_COLORS.axis} strokeWidth={0.8}
          strokeDasharray="2 2" opacity={0.6}
        />
        <text
          x={ballCX - dx_out * 96 * zoom} y={ballCY - dy_out * 96 * zoom + 3}
          fontSize={canvasSize.font(Math.max(8, 10 * zoom))}
          fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle"
        >n</text>

        <line
          x1={ballCX - dx_tangent * 90 * zoom} y1={ballCY - dy_tangent * 90 * zoom}
          x2={ballCX + dx_tangent * 90 * zoom} y2={ballCY + dy_tangent * 90 * zoom}
          stroke={PHYSICS_COLORS.axis} strokeWidth={0.8}
          strokeDasharray="2 2" opacity={0.6}
        />
        <text
          x={ballCX + dx_tangent * 96 * zoom} y={ballCY + dy_tangent * 96 * zoom + 3}
          fontSize={canvasSize.font(Math.max(8, 10 * zoom))}
          fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle"
        >τ</text>

        <line
          x1={ballCX + px_G_n} y1={ballCY + py_G_n}
          x2={ballCX + px_G_n + px_G_t} y2={ballCY + py_G_n + py_G_t}
          stroke={PHYSICS_COLORS.gravity} strokeWidth={0.8}
          strokeDasharray="2 2" opacity={0.4}
        />
        <line
          x1={ballCX + px_G_t} y1={ballCY + py_G_t}
          x2={ballCX + px_G_t + px_G_n} y2={ballCY + py_G_t + py_G_n}
          stroke={PHYSICS_COLORS.gravity} strokeWidth={0.8}
          strokeDasharray="2 2" opacity={0.4}
        />

        {renderCloseUpArrow(ballCX, ballCY, ballCX + px_G_n, ballCY + py_G_n, PHYSICS_COLORS.gravity, zoom, true)}
        {renderCloseUpArrow(ballCX, ballCY, ballCX + px_G_t, ballCY + py_G_t, PHYSICS_COLORS.gravity, zoom, true)}
        {renderCloseUpArrow(ballCX, ballCY, ballCX + px_N, ballCY + py_N, trackType === 0 ? PHYSICS_COLORS.tension : PHYSICS_COLORS.normalForce, zoom)}
        {renderCloseUpArrow(ballCX, ballCY, ballCX, ballCY + gLen, PHYSICS_COLORS.gravity, zoom)}

        <circle
          cx={ballCX} cy={ballCY} r={12 * zoom}
          fill="url(#steel-sphere-grad)"
          stroke={SCENE_COLORS.sphere.steel.stroke} strokeWidth={1}
        />
      </svg>

      <div style={{
        width: cardWidth - 30,
        marginLeft: 15,
        height: cardHeight - svgH - 8,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'sans-serif',
        fontSize: canvasSize.font(10.5),
        color: CANVAS_COLORS.labelTextLight,
        lineHeight: '1.4',
      }}>
        <div style={{
          fontWeight: 'bold',
          fontSize: canvasSize.font(11),
          color: CANVAS_COLORS.labelText,
          borderBottom: '1px solid ' + CANVAS_COLORS.grid,
          paddingBottom: '4px',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>受力正交分解</span>
          <span>θ = {thetaDeg.toFixed(0)}°</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', margin: '5px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>法向 G<sub>n</sub>=mg|cosθ|:</span>
            <span style={{ fontWeight: 'bold', color: PHYSICS_COLORS.gravity }}>{Gn_val_abs.toFixed(1)} N</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{trackType === 0 ? '绳拉力 F_T' : '约束力 F_N'}:</span>
            <span style={{ fontWeight: 'bold', color: trackType === 0 ? PHYSICS_COLORS.tension : PHYSICS_COLORS.normalForce }}>
              {(trackType === 0 ? Math.max(0, F_constraint_val) : F_constraint_val).toFixed(1)} N
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>切向 G<sub>t</sub>=mg|sinθ|:</span>
            <span style={{ fontWeight: 'bold', color: PHYSICS_COLORS.gravity }}>{Gt_val_abs.toFixed(1)} N</span>
          </div>
          <div></div>
        </div>

        {currentPoint.state === 'flying' ? (
          <div style={{ borderTop: '1px solid ' + CANVAS_COLORS.grid, paddingTop: '4px' }}>
            <div style={{ fontSize: canvasSize.font(9), color: colors.danger[600], fontWeight: 'bold' }}>绳松弛：抛体运动，绳再次绷紧会消除径向速度:</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: PHYSICS_COLORS.appliedForce, fontSize: canvasSize.font(11.5), marginTop: '2px' }}>
              <span>F<sub>合</sub> = G:</span>
              <span>{G_val.toFixed(1)} N</span>
            </div>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid ' + CANVAS_COLORS.grid, paddingTop: '4px' }}>
            <div style={{ fontSize: canvasSize.font(9), color: CANVAS_COLORS.textMuted }}>
              向心方向合力 (
              {Math.cos(theta) > 0.001 ? (
                <>F<sub>向</sub> = {trackType === 0 ? 'F_T' : 'F_N'} - G<sub>n</sub></>
              ) : Math.cos(theta) < -0.001 ? (
                <>F<sub>向</sub> = {trackType === 0 ? 'F_T' : 'F_N'} + G<sub>n</sub></>
              ) : (
                <>F<sub>向</sub> = {trackType === 0 ? 'F_T' : 'F_N'}</>
              )}):
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: PHYSICS_COLORS.appliedForce, fontSize: canvasSize.font(11.5), marginTop: '2px' }}>
              <span>F<sub>向</sub>:</span>
              <span>{F_xiang_val.toFixed(1)} N</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})