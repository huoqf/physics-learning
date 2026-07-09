import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { OPTICS_COLORS, STROKE, FONT, DASH, CANVAS_COLORS } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { deg2rad } from '@/math/angle'
import { calculateCriticalAngle, calculateRefraction, calculateIlluminatedRadius } from '@/physics/optics'

/** 场景设计坐标尺寸（与 CANVAS_PRESETS.full 840×650 对齐） */
const VIEW_WIDTH = 840
const VIEW_HEIGHT = 650
const NORMAL_LENGTH = 160
const RAY_LEN = 180
const WATER_SURFACE_Y_RATIO = 0.4
/** 深度/半径 → SVG viewBox 单位缩放系数 */
const DEPTH_SCALE = 30

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
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
    presetCompensation: 1.2,
  })

  const mode = params.mode ?? 0
  const theta1 = params.theta1 ?? 30
  const n = params.n ?? 1.33
  const depth = params.depth ?? 2

  const { font } = canvasSize

  const { theta_c_deg } = calculateCriticalAngle(n, 1)
  const isTotalReflection = theta1 >= theta_c_deg

  const cx = VIEW_WIDTH / 2
  const cy = VIEW_HEIGHT * WATER_SURFACE_Y_RATIO

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      {mode === 1 ? (
        <PointSourceMode
          depth={depth} n={n} theta_c_deg={theta_c_deg}
          cx={VIEW_WIDTH * 0.35} cy={cy}
          font={font}
        />
      ) : (
        <SingleBeamMode
          theta1={theta1} n={n} theta_c_deg={theta_c_deg}
          isTotalReflection={isTotalReflection}
          cx={cx} cy={cy}
          font={font}
        />
      )}
    </AnimationSvgCanvas>
  )
}

/* ─── 模式 0：单光束变角 ────────────────────────────────────────── */

function SingleBeamMode({
  theta1, n, theta_c_deg, isTotalReflection,
  cx, cy, font,
}: {
  theta1: number; n: number; theta_c_deg: number; isTotalReflection: boolean
  cx: number; cy: number
  font: (v: number) => number
}) {
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

/* ─── 模式 1：水下点光源视场 ────────────────────────────────────── */

function PointSourceMode({
  depth, n, theta_c_deg, cx, cy, font,
}: {
  depth: number; n: number; theta_c_deg: number
  cx: number; cy: number
  font: (v: number) => number
}) {
  const { radius: R } = calculateIlluminatedRadius(depth, n)
  const validR = isNaN(R) ? 0 : R

  const normalLen = NORMAL_LENGTH * 0.7
  const thetaCRad = deg2rad(theta_c_deg)

  const lightSourceY = cy + depth * DEPTH_SCALE

  const boundaryLeftX = cx - validR * DEPTH_SCALE
  const boundaryRightX = cx + validR * DEPTH_SCALE

  const topViewCx = VIEW_WIDTH * 0.75
  const topViewCy = VIEW_HEIGHT * 0.25
  const topViewMaxR = Math.min(VIEW_WIDTH * 0.18, VIEW_HEIGHT * 0.22)
  const displayR = Math.min(topViewMaxR, validR * 15)

  const chartX = VIEW_WIDTH * 0.58
  const chartY = VIEW_HEIGHT * 0.55
  const chartW = VIEW_WIDTH * 0.38
  const chartH = VIEW_HEIGHT * 0.4

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
        x1={0} y1={cy} x2={VIEW_WIDTH * 0.55} y2={cy}
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
      <circle cx={cx} cy={lightSourceY} r={5}
        fill={OPTICS_COLORS.lightRay} opacity={0.9} />
      <circle cx={cx} cy={lightSourceY} r={10}
        fill="none" stroke={OPTICS_COLORS.lightRay} strokeWidth={STROKE.reference}
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
          8, 3)}
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
          8, 3)}
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
        d={arcPath(cx, cy, 30, -90, -90 - theta_c_deg)}
        fill="none"
        stroke={CANVAS_COLORS.annotation}
        strokeWidth={STROKE.annotation}
        opacity={0.7}
      />
      <text
        x={cx + (30 + 12) * Math.cos(deg2rad(-90 - theta_c_deg / 2))}
        y={cy + (30 + 12) * Math.sin(deg2rad(-90 - theta_c_deg / 2))}
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
        x1={cx + 20} y1={cy}
        x2={cx + 20} y2={lightSourceY}
        stroke={CANVAS_COLORS.labelTextLight}
        strokeWidth={STROKE.annotation}
        strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`}
      />
      <text
        x={cx + 28} y={(cy + lightSourceY) / 2}
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
        x={cx + 60} y={cy - 10}
        textAnchor="start"
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(10)}
        fontFamily={FONT.family}
      >
        空气
      </text>
      <text
        x={cx + 60} y={lightSourceY + 5}
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
          x={topViewCx} y={topViewCy - topViewMaxR - 10}
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
        <circle cx={topViewCx} cy={topViewCy} r={3}
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
              y={topViewCy + 14}
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
          x={chartX + chartW / 2} y={chartY - 8}
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
              <circle cx={px} cy={py} r={4}
                fill={OPTICS_COLORS.criticalAngle}
                stroke="white" strokeWidth={STROKE.chartSub} />
              <text
                x={px + 8} y={py - 6}
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
              x={px} y={chartY + chartH + 14}
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
          x={chartX + chartW / 2} y={chartY + chartH + 26}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(10)}
          fontFamily={FONT.family}
        >
          h (m)
        </text>

        {/* Y 轴标签 */}
        <text
          x={chartX - 8} y={chartY + chartH / 2}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(10)}
          fontFamily={FONT.family}
          transform={`rotate(-90, ${chartX - 8}, ${chartY + chartH / 2})`}
        >
          S (m²)
        </text>
      </g>
    </g>
  )
}
