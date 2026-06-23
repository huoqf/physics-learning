import { useCanvasSize, useViewport } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { OPTICS_COLORS, STROKE, FONT, DASH, CANVAS_COLORS } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { deg2rad, rad2deg } from '@/math/angle'
import { vectorSub, vectorDot, vectorScale, vectorNormalize } from '@/math/vector'
import type { Vector2 } from '@/math/vector'

const VIEW_WIDTH = 800
const VIEW_HEIGHT = 500
const RAY_LENGTH = 200
const MIRROR_HALF = 160
const NORMAL_LENGTH = 180
const PROTRACTOR_R = 100

function arrowHeadPoints(
  tipX: number, tipY: number,
  dir: Vector2,
  len: number, halfW: number,
): string {
  const px = -dir.y, py = dir.x
  const bx = tipX - len * dir.x, by = tipY - len * dir.y
  return `${tipX},${tipY} ${bx + halfW * px},${by + halfW * py} ${bx - halfW * px},${by - halfW * py}`
}

export default function ReflectionAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.extraWide)

  const vp = useViewport(canvasSize, {
    designWidth: VIEW_WIDTH,
    designHeight: VIEW_HEIGHT,
  })

  const theta1 = params.theta1 ?? 45
  const mirrorRotation = params.mirrorRotation ?? 0
  const showNormal = (params.showNormal ?? 1) === 1

  const { width, height, font } = canvasSize
  const cx = VIEW_WIDTH / 2
  const cy = VIEW_HEIGHT * 0.58

  const theta1Rad = deg2rad(theta1)
  const mirrorRad = deg2rad(-mirrorRotation)

  const normalAngle = mirrorRad - Math.PI / 2
  const nDx = Math.cos(normalAngle)
  const nDy = Math.sin(normalAngle)

  const srcX = cx - RAY_LENGTH * Math.sin(theta1Rad)
  const srcY = cy - RAY_LENGTH * Math.cos(theta1Rad)

  const incDir = vectorNormalize({ x: cx - srcX, y: cy - srcY })
  const dot = vectorDot(incDir, { x: nDx, y: nDy })
  const refDir = vectorSub(incDir, vectorScale({ x: nDx, y: nDy }, 2 * dot))

  const refEndX = cx + refDir.x * RAY_LENGTH
  const refEndY = cy + refDir.y * RAY_LENGTH

  const mDx = Math.cos(mirrorRad)
  const mDy = Math.sin(mirrorRad)

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        <g transform={vp.transform}>
          {/* Protractor */}
          {showNormal && (
            <g opacity={0.25}>
              <circle cx={cx} cy={cy} r={PROTRACTOR_R} fill="none" stroke={CANVAS_COLORS.axis} strokeWidth={STROKE.reference} />
              {Array.from({ length: 19 }, (_, i) => {
                const a = deg2rad(-90 + i * 10)
                const r0 = PROTRACTOR_R - 6
                const r1 = PROTRACTOR_R
                return (
                  <line
                    key={i}
                    x1={cx + r0 * Math.cos(a)}
                    y1={cy + r0 * Math.sin(a)}
                    x2={cx + r1 * Math.cos(a)}
                    y2={cy + r1 * Math.sin(a)}
                    stroke={CANVAS_COLORS.axis}
                    strokeWidth={i % 3 === 0 ? STROKE.tickBold : STROKE.tick}
                  />
                )
              })}
            </g>
          )}

          {/* Mirror */}
          <line
            x1={cx - MIRROR_HALF * mDx}
            y1={cy - MIRROR_HALF * mDy}
            x2={cx + MIRROR_HALF * mDx}
            y2={cy + MIRROR_HALF * mDy}
            stroke={OPTICS_COLORS.mirrorStroke}
            strokeWidth={STROKE.objectLine}
            strokeLinecap="round"
          />
          <line
            x1={cx - MIRROR_HALF * mDx}
            y1={cy - MIRROR_HALF * mDy}
            x2={cx + MIRROR_HALF * mDx}
            y2={cy + MIRROR_HALF * mDy}
            stroke={OPTICS_COLORS.mirror}
            strokeWidth={6}
            strokeLinecap="round"
            opacity={0.5}
          />

          {/* Normal */}
          {showNormal && (
            <line
              x1={cx}
              y1={cy}
              x2={cx + NORMAL_LENGTH * nDx}
              y2={cy + NORMAL_LENGTH * nDy}
              stroke={OPTICS_COLORS.lightRayNormal}
              strokeWidth={STROKE.reference}
              strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`}
            />
          )}

          {/* Incident ray */}
          <line
            x1={srcX}
            y1={srcY}
            x2={cx}
            y2={cy}
            stroke={OPTICS_COLORS.lightRay}
            strokeWidth={STROKE.vectorMain}
          />
          <polygon
            points={arrowHeadPoints(cx, cy, incDir, 10, 4)}
            fill={OPTICS_COLORS.lightRay}
          />

          {/* Reflected ray */}
          <line
            x1={cx}
            y1={cy}
            x2={refEndX}
            y2={refEndY}
            stroke={OPTICS_COLORS.lightRayReflected}
            strokeWidth={STROKE.vectorMain}
          />
          <polygon
            points={arrowHeadPoints(refEndX, refEndY, refDir, 10, 4)}
            fill={OPTICS_COLORS.lightRayReflected}
          />

          {/* Angle arcs */}
          {showNormal && theta1 > 0 && (() => {
            const arcR = 40
            const nAngle = rad2deg(normalAngle)
            const incAngle = rad2deg(Math.atan2(incDir.y, incDir.x))
            const refAngle = rad2deg(Math.atan2(refDir.y, refDir.x))

            const incStart = Math.min(nAngle, incAngle)
            const incEnd = Math.max(nAngle, incAngle)
            const refStart = Math.min(nAngle, refAngle)
            const refEnd_ = Math.max(nAngle, refAngle)

            function arcPath(r: number, startDeg: number, endDeg: number) {
              const s = deg2rad(startDeg)
              const e = deg2rad(endDeg)
              const large = endDeg - startDeg > 180 ? 1 : 0
              return `M ${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(e)} ${cy + r * Math.sin(e)}`
            }

            const midInc = deg2rad((incStart + incEnd) / 2)
            const midRef = deg2rad((refStart + refEnd_) / 2)
            const labelR = arcR + 14

            return (
              <g>
                <path d={arcPath(arcR, incStart, incEnd)} fill="none" stroke={CANVAS_COLORS.annotation} strokeWidth={STROKE.annotation} opacity={0.7} />
                <path d={arcPath(arcR, refStart, refEnd_)} fill="none" stroke={CANVAS_COLORS.annotation} strokeWidth={STROKE.annotation} opacity={0.7} />
                <text
                  x={cx + labelR * Math.cos(midInc)}
                  y={cy + labelR * Math.sin(midInc)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={CANVAS_COLORS.annotation}
                  fontSize={font(11)}
                  fontFamily={FONT.family}
                >
                  θ₁
                </text>
                <text
                  x={cx + labelR * Math.cos(midRef)}
                  y={cy + labelR * Math.sin(midRef)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={CANVAS_COLORS.annotation}
                  fontSize={font(11)}
                  fontFamily={FONT.family}
                >
                  θ₂
                </text>
              </g>
            )
          })()}

          {/* Mirror rotation indicator */}
          {Math.abs(mirrorRotation) > 0.5 && (
            <text
              x={cx}
              y={cy + MIRROR_HALF * 0.6}
              textAnchor="middle"
              fill={CANVAS_COLORS.labelText}
              fontSize={font(10)}
              fontFamily={FONT.family}
            >
              Δα = {Math.abs(mirrorRotation).toFixed(0)}°
            </text>
          )}
        </g>
      </svg>
    </div>
  )
}
