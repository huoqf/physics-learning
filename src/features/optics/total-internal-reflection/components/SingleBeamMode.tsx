import { OPTICS_COLORS, STROKE, FONT, DASH, CANVAS_COLORS } from '@/theme/physics'
import { deg2rad } from '@/math/angle'
import { calculateRefraction } from '@/physics/optics'
import { arrowHeadPoints, arcPath } from '../utils/svgOptics'

/** 场景设计坐标尺寸（与 CANVAS_PRESETS.full 840×650 对齐） */
const VIEW_WIDTH = 840
const VIEW_HEIGHT = 650
const NORMAL_LENGTH = 160
const RAY_LEN = 180

interface SingleBeamModeProps {
  theta1: number; n: number; theta_c_deg: number; isTotalReflection: boolean
  cx: number; cy: number
  font: (v: number) => number
}

export default function SingleBeamMode({
  theta1, n, theta_c_deg, isTotalReflection,
  cx, cy, font,
}: SingleBeamModeProps) {
  const normalLen = NORMAL_LENGTH
  const rayLen = RAY_LEN
  const arcR = 40
  const theta1Rad = deg2rad(theta1)

  const incidentDirX = Math.sin(theta1Rad)
  const incidentDirY = -Math.cos(theta1Rad)

  const srcX = cx - rayLen * incidentDirX
  const srcY = cy - rayLen * incidentDirY

  const refractOpacity = isTotalReflection ? 0 : Math.max(0, 1 - (theta1 / theta_c_deg))

  const reflectedDirX = -Math.sin(theta1Rad)
  const reflectedDirY = incidentDirY
  const reflectOpacity = isTotalReflection ? 1 : Math.min(1, 0.3 + 0.7 * (theta1 / theta_c_deg))
  const reflectLen = rayLen * (isTotalReflection ? 0.8 : 0.6)
  const refEndX = cx + reflectLen * reflectedDirX
  const refEndY = cy + reflectLen * reflectedDirY

  let refrEndX = 0
  let refrEndY = 0
  let refrDirX = 0
  let refrDirY = 0
  if (!isTotalReflection) {
    const { theta2_deg } = calculateRefraction(theta1, n, 1)
    const theta2Rad = deg2rad(theta2_deg)
    refrDirX = Math.sin(theta2Rad)
    refrDirY = Math.cos(theta2Rad)
    refrEndX = cx + rayLen * refrDirX
    refrEndY = cy + rayLen * refrDirY
  }

  return (
    <g>
      {/* 空气区域 */}
      <rect x={0} y={0} width={VIEW_WIDTH} height={cy}
        fill={OPTICS_COLORS.airFill} />

      {/* 水区域 */}
      <rect x={0} y={cy} width={VIEW_WIDTH} height={VIEW_HEIGHT - cy}
        fill={OPTICS_COLORS.waterFill} />

      {/* 水面 */}
      <line
        x1={0} y1={cy} x2={VIEW_WIDTH} y2={cy}
        stroke={OPTICS_COLORS.lightRayNormal}
        strokeWidth={STROKE.objectLine}
      />

      {/* 法线 */}
      <line
        x1={cx} y1={cy - normalLen * 0.5}
        x2={cx} y2={cy + normalLen}
        stroke={OPTICS_COLORS.lightRayNormal}
        strokeWidth={STROKE.reference}
        strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`}
      />

      {/* 入射光线（水下→水面） */}
      <line
        x1={srcX} y1={cy + Math.abs(srcY - cy)}
        x2={cx} y2={cy}
        stroke={OPTICS_COLORS.lightRay}
        strokeWidth={STROKE.vectorMain}
      />
      <polygon
        points={arrowHeadPoints(cx, cy, incidentDirX, incidentDirY, 10, 4)}
        fill={OPTICS_COLORS.lightRay}
      />

      {/* 折射光线 */}
      {!isTotalReflection && (
        <g opacity={refractOpacity}>
          <line
            x1={cx} y1={cy}
            x2={refrEndX} y2={refrEndY}
            stroke={OPTICS_COLORS.lightRayRefracted}
            strokeWidth={STROKE.vectorMain}
          />
          <polygon
            points={arrowHeadPoints(refrEndX, refrEndY, refrDirX, refrDirY, 10, 4)}
            fill={OPTICS_COLORS.lightRayRefracted}
          />
        </g>
      )}

      {/* 反射光线 */}
      <g opacity={reflectOpacity}>
        <line
          x1={cx} y1={cy}
          x2={refEndX} y2={refEndY}
          stroke={OPTICS_COLORS.lightRayReflected}
          strokeWidth={STROKE.vectorMain}
        />
        <polygon
          points={arrowHeadPoints(refEndX, refEndY, reflectedDirX, reflectedDirY, 10, 4)}
          fill={OPTICS_COLORS.lightRayReflected}
        />
      </g>

      {/* 全反射提示 */}
      {isTotalReflection && (
        <text
          x={cx + 60} y={cy + 30}
          textAnchor="start"
          dominantBaseline="middle"
          fill={OPTICS_COLORS.criticalAngle}
          fontSize={font(14)}
          fontFamily={FONT.family}
          fontWeight="bold"
        >
          全反射
        </text>
      )}

      {/* 入射角弧标注 */}
      {theta1 > 0 && (
        <g>
          <path
            d={arcPath(cx, cy, arcR, -90, -90 + theta1)}
            fill="none"
            stroke={CANVAS_COLORS.annotation}
            strokeWidth={STROKE.annotation}
            opacity={0.7}
          />
          <text
            x={cx + (arcR + 14) * Math.cos(deg2rad(-90 + theta1 / 2))}
            y={cy + (arcR + 14) * Math.sin(deg2rad(-90 + theta1 / 2))}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={CANVAS_COLORS.annotation}
            fontSize={font(11)}
            fontFamily={FONT.family}
          >
            i
          </text>
        </g>
      )}

      {/* 临界角标注 */}
      {!isTotalReflection && (
        <g opacity={0.5}>
          <path
            d={arcPath(cx, cy, arcR * 0.7, -90, -90 + theta_c_deg)}
            fill="none"
            stroke={OPTICS_COLORS.criticalAngle}
            strokeWidth={STROKE.annotation}
            strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`}
          />
          <text
            x={cx + (arcR * 0.7 + 14) * Math.cos(deg2rad(-90 + theta_c_deg / 2))}
            y={cy + (arcR * 0.7 + 14) * Math.sin(deg2rad(-90 + theta_c_deg / 2))}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={OPTICS_COLORS.criticalAngle}
            fontSize={font(10)}
            fontFamily={FONT.family}
          >
            C
          </text>
        </g>
      )}

      {/* 标注文字 */}
      <text
        x={cx + 80} y={cy - 15}
        textAnchor="start"
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(10)}
        fontFamily={FONT.family}
      >
        空气 (n=1.00)
      </text>
      <text
        x={cx + 80} y={cy + 25}
        textAnchor="start"
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(10)}
        fontFamily={FONT.family}
      >
        水 (n={n.toFixed(2)})
      </text>
    </g>
  )
}
