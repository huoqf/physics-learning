import React from 'react'
import { CANVAS_COLORS, PHYSICS_COLORS } from '@/theme/physics'
import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'

interface InclineSlopeBackgroundProps {
  w: number
  h: number
  x0: number
  y0: number
  rightX: number
  topY: number
  slopeW: number
  slopeH: number
  padX: number
  B: number
  bFieldDir: number
  theta: number
  thetaRad: number
  physicsResult: AdvancedAmperePhysicsResult
  signAxisStart: { x: number; y: number }
  signAxisEnd: { x: number; y: number }
  signAxisAngleDeg: number
  font: (size: number) => number
}

export const InclineSlopeBackground: React.FC<InclineSlopeBackgroundProps> = ({
  w,
  h,
  x0,
  y0,
  rightX,
  topY,
  slopeW,
  slopeH,
  padX,
  B,
  bFieldDir,
  theta,
  thetaRad,
  physicsResult,
  signAxisStart,
  signAxisEnd,
  signAxisAngleDeg,
  font,
}) => {
  const sinT = Math.sin(thetaRad)

  return (
    <>
      <text
        x="12"
        y="18"
        fontSize={font(7.5)}
        fill={CANVAS_COLORS.strokeDark}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        2D 侧视受力图 (原理)
      </text>

      {/* 平衡电流区间标注 */}
      <g transform="translate(12, 32)">
        <text
          fontSize={font(6.5)}
          fill={CANVAS_COLORS.textMuted}
          fontWeight="semibold"
          style={{ userSelect: 'none' }}
        >
          平衡电流范围:
        </text>
        <text
          x="0"
          y="11"
          fontSize={font(7)}
          fill={physicsResult.state === 'equilibrium' ? PHYSICS_COLORS.forceNet : PHYSICS_COLORS.forceArrowRed}
          fontWeight="bold"
          style={{ userSelect: 'none' }}
        >
          {(() => {
            const imin = physicsResult.I_min
            const imax = physicsResult.I_max
            const formatVal = (v: number) => {
              if (v === -Infinity) return '-∞'
              if (v === Infinity) return '+∞'
              return `${v.toFixed(2)} A`
            }
            return `[${formatVal(imin)}, ${formatVal(imax)}]`
          })()}
        </text>
      </g>

      {/* 磁场文字标注 */}
      <text
        x={w - 12}
        y="18"
        fontSize={font(7.5)}
        fill={PHYSICS_COLORS.magneticField}
        fontWeight="extrabold"
        textAnchor="end"
        style={{ userSelect: 'none' }}
      >
        磁场 B = {Math.abs(B).toFixed(1)} T {(() => {
          if (Math.abs(B) < 1e-4) return '(无磁场)';
          if (bFieldDir === 0) return B > 0 ? '(竖直向上 ↑)' : '(竖直向下 ↓)';
          if (bFieldDir === 1) return B > 0 ? '(垂直斜面向外 ↖)' : '(垂直斜面向内 ↘)';
          return B > 0 ? '(水平向右 →)' : '(水平向左 ←)';
        })()}
      </text>

      {/* 匀强磁场多方向箭头 (指示整个空间磁场) */}
      {Math.abs(B) > 1e-4 && (
        <g opacity="0.45">
          {Array.from({ length: 4 }).map((_, i) => {
            const isBUp = B > 0;
            let lx1 = 0, ly1 = 0, lx2 = 0, ly2 = 0;

            if (bFieldDir === 0) {
              const fx = padX + 15 + i * ((slopeW - 30) / 3);
              lx1 = fx; ly1 = y0 - 10;
              lx2 = fx; ly2 = y0 - slopeH - 15;
            } else if (bFieldDir === 1) {
              const ratio = 0.15 + i * 0.23;
              const xp = x0 + ratio * slopeW;
              const yp = y0 - ratio * slopeH;
              const ext = 35;
              lx1 = xp + ext * sinT; ly1 = yp + ext * Math.cos(thetaRad);
              lx2 = xp - ext * sinT; ly2 = yp - ext * Math.cos(thetaRad);
            } else {
              const fy = y0 - 15 - i * ((slopeH + 10) / 3);
              lx1 = padX + 10; ly1 = fy;
              lx2 = w - padX - 10; ly2 = fy;
            }

            const startX = isBUp ? lx1 : lx2;
            const startY = isBUp ? ly1 : ly2;
            const endX = isBUp ? lx2 : lx1;
            const endY = isBUp ? ly2 : ly1;

            const angleRad = Math.atan2(endY - startY, endX - startX);
            const angleDeg = (angleRad * 180) / Math.PI;

            return (
              <g key={i}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={PHYSICS_COLORS.magneticField}
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <g transform={`translate(${endX}, ${endY}) rotate(${angleDeg})`}>
                  <polygon
                    points="0,0 -4,-2.2 -4,2.2"
                    fill={PHYSICS_COLORS.magneticField}
                  />
                </g>
                {i === 0 && (
                  <g transform={`translate(${endX + (bFieldDir === 2 ? -15 : -8)}, ${endY + (bFieldDir === 2 ? 10 : -8)})`}>
                    <text
                      x="0"
                      y="0"
                      fontSize={font(8)}
                      fill={PHYSICS_COLORS.magneticField}
                      fontWeight="bold"
                      fontStyle="italic"
                      textAnchor="middle"
                    >
                      B
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* 侧视斜劈 */}
      <polygon
        points={`${x0},${y0} ${rightX},${y0} ${rightX},${topY}`}
        fill={CANVAS_COLORS.gridSubtle}
        stroke={CANVAS_COLORS.axis}
        strokeWidth="1"
      />
      {/* 斜面高光顶边 */}
      <line
        x1={x0}
        y1={y0}
        x2={rightX}
        y2={topY}
        stroke={CANVAS_COLORS.white}
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* 角度标注 */}
      <path
        d={`M ${x0 + 18} ${y0} A 18 18 0 0 0 ${x0 + 18 * Math.cos(thetaRad)} ${y0 - 18 * Math.sin(thetaRad)}`}
        fill="none"
        stroke={CANVAS_COLORS.trackHistory}
        strokeWidth="0.8"
      />
      <text
        x={x0 + 22}
        y={y0 - 5}
        fontSize={font(5.5)}
        fill={CANVAS_COLORS.textMuted}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        {theta}°
      </text>

      {/* 正方向约定：解释右侧面板中加速度正负号 */}
      <g opacity="0.82">
        <line
          x1={signAxisStart.x}
          y1={signAxisStart.y}
          x2={signAxisEnd.x}
          y2={signAxisEnd.y}
          stroke={CANVAS_COLORS.axis}
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <g transform={`translate(${signAxisEnd.x}, ${signAxisEnd.y}) rotate(${signAxisAngleDeg})`}>
          <polygon points="0,0 -5,-2.5 -5,2.5" fill={CANVAS_COLORS.axis} />
        </g>
        <text
          x={signAxisEnd.x + 4}
          y={signAxisEnd.y - 3}
          fontSize={font(5.5)}
          fill={CANVAS_COLORS.labelTextLight}
          fontWeight="bold"
          style={{ userSelect: 'none' }}
        >
          +x′
        </text>
        <text
          x={12}
          y={h - 7}
          fontSize={font(5.2)}
          fill={CANVAS_COLORS.textMuted}
          fontWeight="semibold"
          style={{ userSelect: 'none' }}
        >
          约定：+x′ 沿斜面向上，a&lt;0 表示下滑
        </text>
      </g>
    </>
  )
}
