import {
  CANVAS_COLORS,
  CHART_COLORS,
  DASH,
  FONT,
  OPTICAL_COLORS,
  OPTICS_COLORS,
  STROKE,
} from '@/theme/physics'
import { useUniqueSvgId } from '@/hooks/useUniqueSvgId'
import { wavelengthToHex } from '@/physics/optics'
import {
  SPECTRUM_RED_NM,
  SPECTRUM_VIOLET_NM,
  type Vec2,
} from '@/physics/optics/dispersion'
import {
  COMPARE_PLOT,
  CURVE_PLOT,
  DISPERSION_TOP_BAND_HEIGHT,
  DISPERSION_VIEW_WIDTH,
  SCREEN_BOTTOM,
  SCREEN_TOP,
  SCREEN_WIDTH,
  SCREEN_X,
  type ComparisonBarItem,
  type DispersionPhysicsResult,
  type DispersionRay,
} from '../hooks/useDispersionPhysics'

/** 深色观察屏背景（暗场才能辨清连续光谱彩带，取自光学器材 token） */
const DARK_SCREEN_BG = OPTICAL_COLORS.screenDarkFill

/** 红端 / 紫端条形的语义色（与光线颜色同源，保证物理一致） */
const RED_BAR_COLOR = wavelengthToHex(SPECTRUM_RED_NM)
const VIOLET_BAR_COLOR = wavelengthToHex(SPECTRUM_VIOLET_NM)

interface DispersionSceneProps {
  physics: DispersionPhysicsResult
  /** 画布响应式字号缩放器 */
  font: (size: number) => number
  /** 当前模式 */
  mode: 'spectrum' | 'dual'
  /** 是否显示角度标注 */
  showAngleMarks: boolean
}

/** 箭头三角形顶点串（tail 在 from，指向 to） */
function arrowHeadPoints(from: Vec2, to: Vec2, len: number, halfWidth: number): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy) || 1
  const dirX = dx / dist
  const dirY = dy / dist
  const perpX = -dirY
  const perpY = dirX
  const baseX = to.x - len * dirX
  const baseY = to.y - len * dirY
  return `${to.x},${to.y} ${baseX + halfWidth * perpX},${baseY + halfWidth * perpY} ${baseX - halfWidth * perpX},${baseY - halfWidth * perpY}`
}

/** 由多边形顶点串生成 canvas 用 points 字符串 */
function polygonPoints(vertices: Vec2[]): string {
  return vertices.map((v) => `${v.x},${v.y}`).join(' ')
}

export default function DispersionScene({ physics, font, mode, showAngleMarks }: DispersionSceneProps) {
  const gradientId = useUniqueSvgId()
  const {
    prismVertices,
    source,
    incidentRay,
    internalRay,
    exitRays,
    bandTopY,
    bandBottomY,
    bandStops,
    redRay,
    violetRay,
    cauchyCurve,
    comparison,
  } = physics

  const isSpectrumMode = mode === 'spectrum'

  return (
    <g>
      {/* ───────── 上分区：三棱镜色散光路（840 × 325） ───────── */}
      <TopBandCaption font={font} mode={mode} showAngleMarks={showAngleMarks} />

      {/* 深色观察屏 */}
      <rect
        x={SCREEN_X}
        y={SCREEN_TOP}
        width={SCREEN_WIDTH}
        height={SCREEN_BOTTOM - SCREEN_TOP}
        rx={2}
        fill={DARK_SCREEN_BG}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={STROKE.objectThin}
      />
      {/* 屏上连续光谱彩带（逐段拼接真实波长色） */}
      <defs>
        <linearGradient
          id={gradientId}
          x1={0}
          y1={bandTopY}
          x2={0}
          y2={bandBottomY}
          gradientUnits="userSpaceOnUse"
        >
          {bandStops.map((stop) => (
            <stop
              key={stop.wavelengthNm}
              offset={Math.min(1, Math.max(0, stop.offset))}
              stopColor={stop.color}
            />
          ))}
        </linearGradient>
      </defs>
      <rect
        x={SCREEN_X + 1}
        y={bandTopY}
        width={SCREEN_WIDTH - 2}
        height={Math.max(1, bandBottomY - bandTopY)}
        fill={`url(#${gradientId})`}
      />
      <text
        x={SCREEN_X + SCREEN_WIDTH / 2}
        y={SCREEN_TOP - 8}
        textAnchor="middle"
        fill={CANVAS_COLORS.labelText}
        fontSize={font(11)}
        fontFamily={FONT.family}
        fontWeight="600"
      >
        观察屏
      </text>

      {/* 出射扇形光线 */}
      {exitRays.map((ray) => (
        <RaySegment
          key={ray.wavelengthNm}
          ray={ray}
          color={ray.color}
          width={isSpectrumMode ? STROKE.vectorThin : STROKE.vectorSub}
          opacity={isSpectrumMode ? 0.85 : 1}
        />
      ))}

      {/* 棱镜内光路（未分解前的复色光，画中性色） */}
      <line
        x1={internalRay.from.x}
        y1={internalRay.from.y}
        x2={internalRay.to.x}
        y2={internalRay.to.y}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={STROKE.objectThin}
        strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`}
      />

      {/* 入射复色光 */}
      <line
        x1={incidentRay.from.x}
        y1={incidentRay.from.y}
        x2={incidentRay.to.x}
        y2={incidentRay.to.y}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={STROKE.vectorSub}
        strokeLinecap="round"
      />
      <polygon
        points={arrowHeadPoints(incidentRay.from, incidentRay.to, 11, 4.5)}
        fill={CANVAS_COLORS.strokeDark}
      />

      {/* 光源 */}
      <rect
        x={source.x - 7}
        y={source.y - 13}
        width={14}
        height={26}
        rx={3}
        fill={OPTICS_COLORS.lens}
        stroke={OPTICS_COLORS.lensStroke}
        strokeWidth={STROKE.objectThin}
      />
      <text
        x={source.x - 14}
        y={source.y + 4}
        textAnchor="end"
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(11)}
        fontFamily={FONT.family}
      >
        {isSpectrumMode ? '白光' : '红紫复色光'}
      </text>

      {/* 三棱镜 */}
      <polygon
        points={polygonPoints(prismVertices)}
        fill={OPTICS_COLORS.lens}
        stroke={OPTICS_COLORS.lensStroke}
        strokeWidth={STROKE.objectLine}
        strokeLinejoin="round"
      />
      <text
        x={prismVertices[0].x}
        y={prismVertices[0].y + 34}
        textAnchor="middle"
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(11)}
        fontFamily={FONT.family}
      >
        三棱镜 A = 60°
      </text>

      {/* 红紫端标识与偏向角标注 */}
      {isSpectrumMode ? (
        <SpectrumEdgeLabels font={font} redRay={redRay} violetRay={violetRay} />
      ) : (
        <DualRayAnnotations
          physics={physics}
          font={font}
          showAngleMarks={showAngleMarks}
        />
      )}

      {/* ───────── 下分区：λ–n 柯西曲线 + 红紫极值对比（840 × 325） ───────── */}
      <CauchyCurvePanel points={cauchyCurve} font={font} />
      <ComparisonPanel items={comparison} font={font} />
    </g>
  )
}

/* ─── 上分区：标题与角注 ─────────────────────────────────────────────── */

function TopBandCaption({
  font,
  mode,
  showAngleMarks,
}: {
  font: (size: number) => number
  mode: 'spectrum' | 'dual'
  showAngleMarks: boolean
}) {
  return (
    <>
      <text
        x={24}
        y={30}
        fill={CANVAS_COLORS.labelText}
        fontSize={font(13)}
        fontFamily={FONT.family}
        fontWeight="600"
      >
        {mode === 'spectrum'
          ? '白光经三棱镜分解为连续光谱'
          : '红紫双色光经三棱镜的偏折对比'}
      </text>
      <text
        x={24}
        y={50}
        fill={CANVAS_COLORS.textMuted}
        fontSize={font(11)}
        fontFamily={FONT.family}
      >
        {showAngleMarks && mode === 'dual'
          ? '规律：λ 小 → n 大 → δ 大；紫光偏折最大，落在最下方'
          : '棱镜内各色光传播速度不同，出射偏折角亦不同'}
      </text>
    </>
  )
}

/** 单条射线（含箭头） */
function RaySegment({
  ray,
  color,
  width,
  opacity,
}: {
  ray: DispersionRay
  color: string
  width: number
  opacity: number
}) {
  return (
    <g opacity={opacity}>
      <line
        x1={ray.from.x}
        y1={ray.from.y}
        x2={ray.to.x}
        y2={ray.to.y}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <polygon points={arrowHeadPoints(ray.from, ray.to, 9, 3.6)} fill={color} />
    </g>
  )
}

/** 光谱模式：屏侧红紫端波长标注 */
function SpectrumEdgeLabels({
  font,
  redRay,
  violetRay,
}: {
  font: (size: number) => number
  redRay: DispersionRay
  violetRay: DispersionRay
}) {
  // 标注右对齐于画布右缘：波长行与偏向角结论行逐字宽窄不同，
  // 若按左对齐起点排布，「δ 最小」会越出 840 设计宽度（窄容器下被裁切）。
  const labelRight = DISPERSION_VIEW_WIDTH - 2
  const leaderEnd = SCREEN_X + SCREEN_WIDTH + 8

  return (
    <>
      <line
        x1={SCREEN_X + SCREEN_WIDTH}
        y1={redRay.to.y}
        x2={leaderEnd}
        y2={redRay.to.y}
        stroke={RED_BAR_COLOR}
        strokeWidth={STROKE.annotation}
      />
      <text
        x={labelRight}
        textAnchor="end"
        fill={RED_BAR_COLOR}
        fontSize={font(11)}
        fontFamily={FONT.family}
        fontWeight="600"
      >
        <tspan x={labelRight} y={redRay.to.y + 4}>
          红 700nm
        </tspan>
        <tspan x={labelRight} y={redRay.to.y + 18} fontSize={font(10)}>
          δ 最小
        </tspan>
      </text>
      <line
        x1={SCREEN_X + SCREEN_WIDTH}
        y1={violetRay.to.y}
        x2={leaderEnd}
        y2={violetRay.to.y}
        stroke={VIOLET_BAR_COLOR}
        strokeWidth={STROKE.annotation}
      />
      <text
        x={labelRight}
        textAnchor="end"
        fill={VIOLET_BAR_COLOR}
        fontSize={font(11)}
        fontFamily={FONT.family}
        fontWeight="600"
      >
        <tspan x={labelRight} y={violetRay.to.y + 4}>
          紫 400nm
        </tspan>
        <tspan x={labelRight} y={violetRay.to.y + 18} fontSize={font(10)}>
          δ 最大
        </tspan>
      </text>
    </>
  )
}

/** 双色光模式：法线、入射角与偏向角标注 */
function DualRayAnnotations({
  physics,
  font,
  showAngleMarks,
}: {
  physics: DispersionPhysicsResult
  font: (size: number) => number
  showAngleMarks: boolean
}) {
  const { internalRay, redRay, violetRay, red, violet, r1Deg, r2Deg, exitAngleDeg, incidenceDeg } =
    physics

  const entry = internalRay.from
  const exit = internalRay.to

  // 入射光线方向的延长线（自出射点反向绘制），用于量取偏向角 δ
  const inDirX = entry.x - physics.incidentRay.from.x
  const inDirY = entry.y - physics.incidentRay.from.y
  const inLen = Math.hypot(inDirX, inDirY) || 1
  const extendLen = 110
  const extendEnd = {
    x: exit.x + (inDirX / inLen) * extendLen,
    y: exit.y + (inDirY / inLen) * extendLen,
  }

  return (
    <>
      {/* 入射界面法线（虚线，法线方向 = 左界面内法线，与底边成 A/2 = 30°） */}
      <line
        x1={entry.x + 62 * Math.cos(Math.PI / 6)}
        y1={entry.y + 62 * Math.sin(Math.PI / 6)}
        x2={entry.x - 62 * Math.cos(Math.PI / 6)}
        y2={entry.y - 62 * Math.sin(Math.PI / 6)}
        stroke={OPTICS_COLORS.lightRayNormal}
        strokeWidth={STROKE.reference}
        strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`}
      />
      {/* 入射角标注：置于「入射光线—左界面法线」夹角内部（左上方空旷区），
          避免与出射侧的 δ紫 标注在 x=435 附近争位 */}
      <text
        x={entry.x - 40}
        y={entry.y + 4}
        textAnchor="end"
        fill={CANVAS_COLORS.annotation}
        fontSize={font(11)}
        fontFamily={FONT.family}
      >
        i = {incidenceDeg.toFixed(0)}°
      </text>

      {/* 入射方向延长线 + 偏向角 */}
      <line
        x1={exit.x}
        y1={exit.y}
        x2={extendEnd.x}
        y2={extendEnd.y}
        stroke={CANVAS_COLORS.textMuted}
        strokeWidth={STROKE.guide}
        strokeDasharray={`${DASH.projection[0]} ${DASH.projection[1]}`}
      />

      {showAngleMarks && (
        <>
          <text
            x={exit.x + 8}
            y={exit.y - 44}
            fill={RED_BAR_COLOR}
            fontSize={font(11)}
            fontFamily={FONT.family}
            fontWeight="600"
          >
            δ红 = {red.deviationDeg.toFixed(2)}°
          </text>
          <text
            x={exit.x + 8}
            y={exit.y + 26}
            fill={VIOLET_BAR_COLOR}
            fontSize={font(11)}
            fontFamily={FONT.family}
            fontWeight="600"
          >
            δ紫 = {violet.deviationDeg.toFixed(2)}°
          </text>
          <text
            x={entry.x - 96}
            y={entry.y + 66}
            fill={CANVAS_COLORS.textMuted}
            fontSize={font(10)}
            fontFamily={FONT.family}
          >
            <tspan>r₁ = {r1Deg.toFixed(2)}°</tspan>
            <tspan dx={12}>r₂ = {r2Deg.toFixed(2)}°</tspan>
            <tspan dx={12}>i₂ = {exitAngleDeg.toFixed(2)}°</tspan>
          </text>
        </>
      )}

      <text
        x={redRay.to.x + SCREEN_WIDTH / 2 + 22}
        y={redRay.to.y + 4}
        fill={RED_BAR_COLOR}
        fontSize={font(11)}
        fontFamily={FONT.family}
        fontWeight="600"
      >
        红 700nm
      </text>
      <text
        x={violetRay.to.x + SCREEN_WIDTH / 2 + 22}
        y={violetRay.to.y + 4}
        fill={VIOLET_BAR_COLOR}
        fontSize={font(11)}
        fontFamily={FONT.family}
        fontWeight="600"
      >
        紫 400nm
      </text>
    </>
  )
}

/* ─── 下分区 A：柯西色散曲线 ─────────────────────────────────────────── */

function CauchyCurvePanel({
  points,
  font,
}: {
  points: { x: number; y: number; n: number; color: string; wavelengthNm: number }[]
  font: (size: number) => number
}) {
  const xTicks = [400, 500, 600, 700]
  const yTicks = [1.5, 1.51, 1.52, 1.53]
  const nToY = (n: number) =>
    CURVE_PLOT.y1 - ((n - CURVE_PLOT.nMin) / (CURVE_PLOT.nMax - CURVE_PLOT.nMin)) * (CURVE_PLOT.y1 - CURVE_PLOT.y0)
  const lToX = (wl: number) =>
    CURVE_PLOT.x0 + ((wl - SPECTRUM_VIOLET_NM) / (SPECTRUM_RED_NM - SPECTRUM_VIOLET_NM)) * (CURVE_PLOT.x1 - CURVE_PLOT.x0)

  const first = points[0]
  const last = points[points.length - 1]

  return (
    <g>
      <text
        x={CURVE_PLOT.x0 - 60}
        y={DISPERSION_TOP_BAND_HEIGHT + 26}
        fill={CANVAS_COLORS.labelText}
        fontSize={font(13)}
        fontFamily={FONT.family}
        fontWeight="600"
      >
        柯西色散曲线 n(λ) = A + B/λ²
      </text>

      {/* 坐标轴 */}
      <line
        x1={CURVE_PLOT.x0}
        y1={CURVE_PLOT.y0}
        x2={CURVE_PLOT.x0}
        y2={CURVE_PLOT.y1}
        stroke={CHART_COLORS.axisLine}
        strokeWidth={STROKE.axis}
      />
      <line
        x1={CURVE_PLOT.x0}
        y1={CURVE_PLOT.y1}
        x2={CURVE_PLOT.x1 + 14}
        y2={CURVE_PLOT.y1}
        stroke={CHART_COLORS.axisLine}
        strokeWidth={STROKE.axis}
      />

      {/* 刻度 */}
      {xTicks.map((wl) => (
        <g key={wl}>
          <line
            x1={lToX(wl)}
            y1={CURVE_PLOT.y1}
            x2={lToX(wl)}
            y2={CURVE_PLOT.y1 + 5}
            stroke={CHART_COLORS.tickMark}
            strokeWidth={STROKE.tick}
          />
          <text
            x={lToX(wl)}
            y={CURVE_PLOT.y1 + 28}
            textAnchor="middle"
            fill={CHART_COLORS.tickLabel}
            fontSize={font(10)}
            fontFamily={FONT.family}
          >
            {wl}
          </text>
        </g>
      ))}
      {/* x 轴量与单位：置于绘图区右上角外侧，避免越入右侧对比列 */}
      <text
        x={CURVE_PLOT.x1 + 10}
        y={CURVE_PLOT.y0 - 6}
        textAnchor="end"
        fill={CHART_COLORS.tickLabel}
        fontSize={font(10)}
        fontFamily={FONT.family}
      >
        λ/nm
      </text>
      {yTicks.map((n) => (
        <g key={n}>
          <line
            x1={CURVE_PLOT.x0}
            y1={nToY(n)}
            x2={CURVE_PLOT.x0 - 5}
            y2={nToY(n)}
            stroke={CHART_COLORS.tickMark}
            strokeWidth={STROKE.tick}
          />
          <text
            x={CURVE_PLOT.x0 - 8}
            y={nToY(n) + 4}
            textAnchor="end"
            fill={CHART_COLORS.tickLabel}
            fontSize={font(10)}
            fontFamily={FONT.family}
          >
            {n.toFixed(2)}
          </text>
        </g>
      ))}
      {/* y 轴量与单位：置于绘图区左上角内侧，避免与面板标题争位 */}
      <text
        x={CURVE_PLOT.x0 + 8}
        y={CURVE_PLOT.y0 + 16}
        textAnchor="start"
        fill={CHART_COLORS.tickLabel}
        fontSize={font(10)}
        fontFamily={FONT.family}
      >
        n
      </text>

      {/* 曲线（逐段按真实波长着色） */}
      {points.slice(0, -1).map((pt, i) => {
        const next = points[i + 1]
        return (
          <line
            key={pt.wavelengthNm}
            x1={pt.x}
            y1={pt.y}
            x2={next.x}
            y2={next.y}
            stroke={pt.color}
            strokeWidth={STROKE.objectLine}
            strokeLinecap="round"
          />
        )
      })}

      {/* 红紫两端标记（标注一律朝绘图区内侧展开，避免越入右侧对比列） */}
      <circle cx={first.x} cy={first.y} r={4} fill={VIOLET_BAR_COLOR} />
      <circle cx={last.x} cy={last.y} r={4} fill={RED_BAR_COLOR} />
      <text
        x={first.x + 8}
        y={first.y - 12}
        textAnchor="start"
        fill={VIOLET_BAR_COLOR}
        fontSize={font(10)}
        fontFamily={FONT.family}
        fontWeight="600"
      >
        紫 400nm n = {first.n.toFixed(4)}
      </text>
      <text
        x={last.x + 8}
        y={last.y + 24}
        textAnchor="end"
        fill={RED_BAR_COLOR}
        fontSize={font(10)}
        fontFamily={FONT.family}
        fontWeight="600"
      >
        红 700nm n = {last.n.toFixed(4)}
      </text>
      <text
        x={(CURVE_PLOT.x0 + CURVE_PLOT.x1) / 2}
        y={(first.y + last.y) / 2 - 16}
        textAnchor="middle"
        fill={CANVAS_COLORS.textMuted}
        fontSize={font(10)}
        fontFamily={FONT.family}
      >
        波长越长 → 折射率越小（Δn = {(first.n - last.n).toFixed(4)}）
      </text>
    </g>
  )
}

/* ─── 下分区 B：红紫极值联动对比 ─────────────────────────────────────── */

function ComparisonPanel({
  items,
  font,
}: {
  items: ComparisonBarItem[]
  font: (size: number) => number
}) {
  const barHeight = 13
  return (
    <g>
      <text
        x={COMPARE_PLOT.labelX}
        y={DISPERSION_TOP_BAND_HEIGHT + 26}
        fill={CANVAS_COLORS.labelText}
        fontSize={font(13)}
        fontFamily={FONT.family}
        fontWeight="600"
      >
        红端 / 紫端 联动极值对比
      </text>

      {items.map((item, index) => {
        const rowY = COMPARE_PLOT.rowTop + index * COMPARE_PLOT.rowStep
        return (
          <g key={item.key}>
            <text
              x={COMPARE_PLOT.labelX}
              y={rowY + 4}
              fill={CANVAS_COLORS.labelTextLight}
              fontSize={font(11)}
              fontFamily={FONT.family}
            >
              {item.label}
            </text>
            {/* 红端条（左端标注语义色，避免只看色块无法对应红/紫） */}
            <text
              x={COMPARE_PLOT.barX - 12}
              y={rowY - 4}
              textAnchor="end"
              fill={RED_BAR_COLOR}
              fontSize={font(10)}
              fontFamily={FONT.family}
              fontWeight="600"
            >
              红
            </text>
            <rect
              x={COMPARE_PLOT.barX}
              y={rowY - barHeight - 3}
              width={item.redLength}
              height={barHeight}
              rx={2}
              fill={RED_BAR_COLOR}
              opacity={0.9}
            />
            <text
              x={COMPARE_PLOT.barX + item.redLength + 6}
              y={rowY - 8}
              fill={RED_BAR_COLOR}
              fontSize={font(10)}
              fontFamily={FONT.family}
              fontWeight="600"
            >
              {item.redText}
            </text>
            {/* 紫端条 */}
            <text
              x={COMPARE_PLOT.barX - 12}
              y={rowY + 15}
              textAnchor="end"
              fill={VIOLET_BAR_COLOR}
              fontSize={font(10)}
              fontFamily={FONT.family}
              fontWeight="600"
            >
              紫
            </text>
            <rect
              x={COMPARE_PLOT.barX}
              y={rowY + 3}
              width={item.violetLength}
              height={barHeight}
              rx={2}
              fill={VIOLET_BAR_COLOR}
              opacity={0.9}
            />
            <text
              x={COMPARE_PLOT.barX + item.violetLength + 6}
              y={rowY + 17}
              fill={VIOLET_BAR_COLOR}
              fontSize={font(10)}
              fontFamily={FONT.family}
              fontWeight="600"
            >
              {item.violetText}
            </text>
          </g>
        )
      })}

      <text
        x={COMPARE_PLOT.labelX}
        y={DISPERSION_TOP_BAND_HEIGHT + 302}
        fill={CANVAS_COLORS.textMuted}
        fontSize={font(10)}
        fontFamily={FONT.family}
      >
        参考装置：双缝间距 d=0.20mm，缝屏距离 L=1.0m
      </text>
    </g>
  )
}
