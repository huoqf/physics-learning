import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { OPTICS_COLORS, STROKE, FONT, DASH } from '@/theme/physics'
import { CANVAS_COLORS } from '@/theme/physics/colors'
import { calculateCriticalAngle, calculateRefraction, calculateIlluminatedRadius } from '@/physics/optics'

const VIEW_WIDTH = 800
const VIEW_HEIGHT = 500
const NORMAL_LENGTH = 160
const RAY_LEN = 180
const WATER_SURFACE_Y_RATIO = 0.4

function deg2rad(d: number) { return (d * Math.PI) / 180 }

function arrowHeadPoints(
  tipX: number, tipY: number,
  dirX: number, dirY: number,
  len: number, halfW: number,
): string {
  const px = -dirY, py = dirX
  const bx = tipX - len * dirX, by = tipY - len * dirY
  return `${tipX},${tipY} ${bx + halfW * px},${by + halfW * py} ${bx - halfW * px},${by - halfW * py}`
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = deg2rad(startDeg)
  const e = deg2rad(endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(e)} ${cy + r * Math.sin(e)}`
}

export default function TIRAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: VIEW_WIDTH, height: VIEW_HEIGHT })

  const mode = params.mode ?? 0
  const theta1 = params.theta1 ?? 30
  const n = params.n ?? 1.33
  const depth = params.depth ?? 2

  const { width, height, font } = canvasSize
  const scale = Math.min(width / VIEW_WIDTH, height / VIEW_HEIGHT)

  const { theta_c_deg } = calculateCriticalAngle(n, 1)
  const isTotalReflection = theta1 >= theta_c_deg

  if (mode === 1) {
    return (
      <div ref={containerRef} className="w-full h-full">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          <PointSourceMode
            depth={depth} n={n} theta_c_deg={theta_c_deg}
            cx={width * 0.35} cy={height * WATER_SURFACE_Y_RATIO}
            width={width} height={height} scale={scale} font={font}
          />
        </svg>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        <SingleBeamMode
          theta1={theta1} n={n} theta_c_deg={theta_c_deg}
          isTotalReflection={isTotalReflection}
          cx={width / 2} cy={height * WATER_SURFACE_Y_RATIO}
          width={width} height={height} scale={scale} font={font}
        />
      </svg>
    </div>
  )
}

/* ─── 模式 0：单光束变角 ────────────────────────────────────────── */

function SingleBeamMode({
  theta1, n, theta_c_deg, isTotalReflection,
  cx, cy, width, height, scale, font,
}: {
  theta1: number; n: number; theta_c_deg: number; isTotalReflection: boolean
  cx: number; cy: number; width: number; height: number; scale: number
  font: (v: number) => number
}) {
  const normalLen = NORMAL_LENGTH * scale
  const rayLen = RAY_LEN * scale
  const arcR = 40 * scale
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
      <rect x={0} y={0} width={width} height={cy}
        fill={OPTICS_COLORS.airFill} />

      {/* 水区域 */}
      <rect x={0} y={cy} width={width} height={height - cy}
        fill={OPTICS_COLORS.waterFill} />

      {/* 水面 */}
      <line
        x1={0} y1={cy} x2={width} y2={cy}
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
        points={arrowHeadPoints(cx, cy, incidentDirX, incidentDirY, 10 * scale, 4 * scale)}
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
            points={arrowHeadPoints(refrEndX, refrEndY, refrDirX, refrDirY, 10 * scale, 4 * scale)}
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
          points={arrowHeadPoints(refEndX, refEndY, reflectedDirX, reflectedDirY, 10 * scale, 4 * scale)}
          fill={OPTICS_COLORS.lightRayReflected}
        />
      </g>

      {/* 全反射提示 */}
      {isTotalReflection && (
        <text
          x={cx + 60 * scale} y={cy + 30 * scale}
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
            x={cx + (arcR + 14 * scale) * Math.cos(deg2rad(-90 + theta1 / 2))}
            y={cy + (arcR + 14 * scale) * Math.sin(deg2rad(-90 + theta1 / 2))}
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
            x={cx + (arcR * 0.7 + 14 * scale) * Math.cos(deg2rad(-90 + theta_c_deg / 2))}
            y={cy + (arcR * 0.7 + 14 * scale) * Math.sin(deg2rad(-90 + theta_c_deg / 2))}
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
        x={cx + 80 * scale} y={cy - 15 * scale}
        textAnchor="start"
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(10)}
        fontFamily={FONT.family}
      >
        空气 (n=1.00)
      </text>
      <text
        x={cx + 80 * scale} y={cy + 25 * scale}
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

/* ─── 模式 1：水下点光源视场 ────────────────────────────────────── */

function PointSourceMode({
  depth, n, theta_c_deg,
  cx, cy, width, height, scale, font,
}: {
  depth: number; n: number; theta_c_deg: number
  cx: number; cy: number; width: number; height: number; scale: number
  font: (v: number) => number
}) {
  const { radius: R } = calculateIlluminatedRadius(depth, n)
  const validR = isNaN(R) ? 0 : R

  const normalLen = NORMAL_LENGTH * scale * 0.7
  const thetaCRad = deg2rad(theta_c_deg)

  const lightSourceY = cy + depth * 30 * scale

  const boundaryLeftX = cx - validR * 30 * scale
  const boundaryRightX = cx + validR * 30 * scale

  const topViewCx = width * 0.75
  const topViewCy = height * 0.25
  const topViewMaxR = Math.min(width * 0.18, height * 0.22)
  const displayR = Math.min(topViewMaxR, validR * 15 * scale)

  const chartX = width * 0.58
  const chartY = height * 0.55
  const chartW = width * 0.38
  const chartH = height * 0.4

  return (
    <g>
      {/* 空气区域 */}
      <rect x={0} y={0} width={width} height={cy}
        fill={OPTICS_COLORS.airFill} />

      {/* 水区域 */}
      <rect x={0} y={cy} width={width} height={height - cy}
        fill={OPTICS_COLORS.waterFill} />

      {/* 水面 */}
      <line
        x1={0} y1={cy} x2={width * 0.55} y2={cy}
        stroke={OPTICS_COLORS.lightRayNormal}
        strokeWidth={STROKE.objectLine}
      />

      {/* 法线 */}
      <line
        x1={cx} y1={cy - normalLen * 0.3}
        x2={cx} y2={cy + normalLen}
        stroke={OPTICS_COLORS.lightRayNormal}
        strokeWidth={STROKE.reference}
        strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`}
      />

      {/* 点光源 */}
      <circle cx={cx} cy={lightSourceY} r={5 * scale}
        fill={OPTICS_COLORS.lightRay} opacity={0.9} />
      <circle cx={cx} cy={lightSourceY} r={10 * scale}
        fill="none" stroke={OPTICS_COLORS.lightRay} strokeWidth={1}
        opacity={0.3} />

      {/* 左侧临界边界光线 */}
      <line
        x1={cx} y1={lightSourceY}
        x2={boundaryLeftX} y2={cy}
        stroke={OPTICS_COLORS.criticalAngle}
        strokeWidth={STROKE.vectorMain}
        opacity={0.8}
      />
      <polygon
        points={arrowHeadPoints(boundaryLeftX, cy,
          Math.sin(-thetaCRad), -Math.cos(thetaCRad),
          8 * scale, 3 * scale)}
        fill={OPTICS_COLORS.criticalAngle}
        opacity={0.8}
      />

      {/* 右侧临界边界光线 */}
      <line
        x1={cx} y1={lightSourceY}
        x2={boundaryRightX} y2={cy}
        stroke={OPTICS_COLORS.criticalAngle}
        strokeWidth={STROKE.vectorMain}
        opacity={0.8}
      />
      <polygon
        points={arrowHeadPoints(boundaryRightX, cy,
          Math.sin(thetaCRad), -Math.cos(thetaCRad),
          8 * scale, 3 * scale)}
        fill={OPTICS_COLORS.criticalAngle}
        opacity={0.8}
      />

      {/* 透光区域标注（水面上方） */}
      <line
        x1={boundaryLeftX} y1={cy}
        x2={boundaryRightX} y2={cy}
        stroke={OPTICS_COLORS.lightRay}
        strokeWidth={STROKE.vectorMain}
        opacity={0.5}
      />

      {/* 临界角弧标注 */}
      <path
        d={arcPath(cx, cy, 30 * scale, -90, -90 - theta_c_deg)}
        fill="none"
        stroke={CANVAS_COLORS.annotation}
        strokeWidth={STROKE.annotation}
        opacity={0.7}
      />
      <text
        x={cx + (30 * scale + 12 * scale) * Math.cos(deg2rad(-90 - theta_c_deg / 2))}
        y={cy + (30 * scale + 12 * scale) * Math.sin(deg2rad(-90 - theta_c_deg / 2))}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={CANVAS_COLORS.annotation}
        fontSize={font(10)}
        fontFamily={FONT.family}
      >
        C
      </text>

      {/* 深度标注 */}
      <line
        x1={cx + 20 * scale} y1={cy}
        x2={cx + 20 * scale} y2={lightSourceY}
        stroke={CANVAS_COLORS.labelTextLight}
        strokeWidth={STROKE.annotation}
        strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`}
      />
      <text
        x={cx + 28 * scale} y={(cy + lightSourceY) / 2}
        textAnchor="start"
        dominantBaseline="middle"
        fill={CANVAS_COLORS.labelText}
        fontSize={font(11)}
        fontFamily={FONT.family}
      >
        h={depth.toFixed(1)}m
      </text>

      {/* 标注文字 */}
      <text
        x={cx + 60 * scale} y={cy - 10 * scale}
        textAnchor="start"
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(10)}
        fontFamily={FONT.family}
      >
        空气
      </text>
      <text
        x={cx + 60 * scale} y={lightSourceY + 5 * scale}
        textAnchor="start"
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(10)}
        fontFamily={FONT.family}
      >
        水 (n={n.toFixed(2)})
      </text>

      {/* ── 右上：俯视图 ── */}
      <g>
        <text
          x={topViewCx} y={topViewCy - topViewMaxR - 10 * scale}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(11)}
          fontFamily={FONT.family}
          fontWeight="bold"
        >
          俯视图
        </text>

        {/* 水面背景圆 */}
        <circle cx={topViewCx} cy={topViewCy} r={topViewMaxR}
          fill={OPTICS_COLORS.waterFillLight}
          stroke={OPTICS_COLORS.lightRayNormal}
          strokeWidth={STROKE.reference}
        />

        {/* 透光圆 */}
        {!isNaN(displayR) && displayR > 0 && (
          <circle cx={topViewCx} cy={topViewCy} r={displayR}
            fill={OPTICS_COLORS.lightRay}
            opacity={0.25}
            stroke={OPTICS_COLORS.lightRay}
            strokeWidth={STROKE.vectorMain}
          />
        )}

        {/* 中心点（光源正上方） */}
        <circle cx={topViewCx} cy={topViewCy} r={3 * scale}
          fill={OPTICS_COLORS.lightRay} />

        {/* 半径标注 */}
        {!isNaN(displayR) && displayR > 5 && (
          <g>
            <line
              x1={topViewCx} y1={topViewCy}
              x2={topViewCx + displayR} y2={topViewCy}
              stroke={OPTICS_COLORS.criticalAngle}
              strokeWidth={STROKE.annotation}
            />
            <text
              x={topViewCx + displayR / 2}
              y={topViewCy + 14 * scale}
              textAnchor="middle"
              fill={OPTICS_COLORS.criticalAngle}
              fontSize={font(10)}
              fontFamily={FONT.family}
            >
              R={validR.toFixed(2)}m
            </text>
          </g>
        )}
      </g>

      {/* ── 右下：S-h 响应曲线 ── */}
      <g>
        <text
          x={chartX + chartW / 2} y={chartY - 8 * scale}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(11)}
          fontFamily={FONT.family}
          fontWeight="bold"
        >
          透光面积 S-h 曲线
        </text>

        {/* 坐标轴 */}
        <line
          x1={chartX} y1={chartY + chartH}
          x2={chartX + chartW} y2={chartY + chartH}
          stroke={CANVAS_COLORS.labelText}
          strokeWidth={STROKE.axis}
        />
        <line
          x1={chartX} y1={chartY}
          x2={chartX} y2={chartY + chartH}
          stroke={CANVAS_COLORS.labelText}
          strokeWidth={STROKE.axis}
        />

        {/* 曲线数据点 */}
        {(() => {
          const hMin = 0.5
          const hMax = 5
          const sMax = Math.PI * Math.pow(hMax / Math.sqrt(n * n - 1), 2)
          const points: string[] = []
          for (let i = 0; i <= 40; i++) {
            const hVal = hMin + (hMax - hMin) * i / 40
            const { radius } = calculateIlluminatedRadius(hVal, n)
            const sVal = isNaN(radius) ? 0 : Math.PI * radius * radius
            const px = chartX + (chartW * i) / 40
            const py = chartY + chartH - (chartH * sVal) / sMax
            points.push(`${px},${py}`)
          }
          return (
            <polyline
              points={points.join(' ')}
              fill="none"
              stroke={OPTICS_COLORS.lightRay}
              strokeWidth={STROKE.chartMain}
            />
          )
        })()}

        {/* 当前 h 值标记点 */}
        {(() => {
          const hMin = 0.5
          const hMax = 5
          const sMax = Math.PI * Math.pow(hMax / Math.sqrt(n * n - 1), 2)
          const { radius: curR } = calculateIlluminatedRadius(depth, n)
          const curS = isNaN(curR) ? 0 : Math.PI * curR * curR
          const px = chartX + (chartW * (depth - hMin)) / (hMax - hMin)
          const py = chartY + chartH - (chartH * curS) / sMax
          return (
            <g>
              <circle cx={px} cy={py} r={4 * scale}
                fill={OPTICS_COLORS.criticalAngle}
                stroke="white" strokeWidth={1.5} />
              <text
                x={px + 8 * scale} y={py - 6 * scale}
                fill={OPTICS_COLORS.criticalAngle}
                fontSize={font(9)}
                fontFamily={FONT.family}
              >
                S={curS.toFixed(2)}m²
              </text>
            </g>
          )
        })()}

        {/* X 轴刻度 */}
        {[1, 2, 3, 4, 5].map((v) => {
          const px = chartX + (chartW * (v - 0.5)) / 4.5
          return (
            <text key={v}
              x={px} y={chartY + chartH + 14 * scale}
              textAnchor="middle"
              fill={CANVAS_COLORS.labelTextLight}
              fontSize={font(9)}
              fontFamily={FONT.family}
            >
              {v}
            </text>
          )
        })}

        {/* X 轴标签 */}
        <text
          x={chartX + chartW / 2} y={chartY + chartH + 26 * scale}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(10)}
          fontFamily={FONT.family}
        >
          h (m)
        </text>

        {/* Y 轴标签 */}
        <text
          x={chartX - 8 * scale} y={chartY + chartH / 2}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(10)}
          fontFamily={FONT.family}
          transform={`rotate(-90, ${chartX - 8 * scale}, ${chartY + chartH / 2})`}
        >
          S (m²)
        </text>
      </g>
    </g>
  )
}
