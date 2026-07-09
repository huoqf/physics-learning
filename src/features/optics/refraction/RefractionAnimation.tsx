import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { OPTICS_COLORS, STROKE, FONT, DASH, CANVAS_COLORS } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { deg2rad } from '@/math/angle'
import { calculateRefraction } from '@/physics/optics'

/** 场景设计坐标尺寸（与 CANVAS_PRESETS.full 840×650 对齐） */
const VIEW_WIDTH = 840
const VIEW_HEIGHT = 650
const NORMAL_LENGTH = 180

const SEMI_R = 140
const RECT_W = 280
const RAY_LEN = 180
/** 玻璃砖厚度缩放系数：将 mm 参数映射到 SVG viewBox 单位 */
const THICKNESS_SCALE = 5
/** 玻璃砖圆角半径（viewBox 单位） */
const GLASS_RX = 2

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

export default function RefractionAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
    presetCompensation: 1.2,
  })

  const theta1 = params.theta1 ?? 45
  const n = params.n ?? 1.5
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1
  const glassThickness = params.glassThickness ?? 20
  const RECT_D = glassThickness * THICKNESS_SCALE

  const { theta2_deg } = calculateRefraction(theta1, 1, n)
  const theta1Rad = deg2rad(theta1)
  const theta2Rad = isNaN(theta2_deg) ? 0 : deg2rad(theta2_deg)

  const { font } = canvasSize
  const cx = VIEW_WIDTH / 2
  const cy = VIEW_HEIGHT / 2

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      {isAdvanced ? (
        <AdvancedMode
          theta1={theta1} theta1Rad={theta1Rad}
          theta2_deg={theta2_deg} theta2Rad={theta2Rad}
          n={n} cx={cx} cy={cy} font={font}
          rectD={RECT_D}
        />
      ) : (
        <BasicMode
          theta1={theta1} theta1Rad={theta1Rad}
          theta2_deg={theta2_deg} theta2Rad={theta2Rad}
          n={n} cx={cx} cy={cy} font={font}
        />
      )}
    </AnimationSvgCanvas>
  )
}

/* ─── 基础模式：半圆形玻璃砖 ────────────────────────────────────────── */

function BasicMode({
  theta1, theta1Rad, theta2_deg, theta2Rad, n, cx, cy, font,
}: {
  theta1: number; theta1Rad: number
  theta2_deg: number; theta2Rad: number
  n: number; cx: number; cy: number
  font: (v: number) => number
}) {
  const R = SEMI_R
  const normalLen = NORMAL_LENGTH
  const rayLen = RAY_LEN
  const arcR = 40

  const isTotalReflection = isNaN(theta2_deg)

  // 入射方向（从左上射向圆心）
  const incDirX = Math.sin(theta1Rad)
  const incDirY = Math.cos(theta1Rad)

  // 入射光线起点
  const srcX = cx - rayLen * incDirX
  const srcY = cy - rayLen * incDirY

  // 折射方向（向右下，在玻璃内）
  const refDirX = Math.sin(theta2Rad)
  const refDirY = Math.cos(theta2Rad)

  // 折射光线终点（到达半圆弧）
  const refEndX = cx + R * refDirX
  const refEndY = cy + R * refDirY

  return (
    <g>
      {/* 半圆形玻璃砖 */}
      <path
        d={`M ${cx} ${cy - R} A ${R} ${R} 0 0 1 ${cx} ${cy + R} Z`}
        fill={OPTICS_COLORS.glassFill}
        stroke={OPTICS_COLORS.glassStroke}
        strokeWidth={STROKE.objectLine}
      />

      {/* 界面（直径） */}
      <line
        x1={cx} y1={cy - R} x2={cx} y2={cy + R}
        stroke={OPTICS_COLORS.glassStroke}
        strokeWidth={STROKE.objectLine}
        strokeLinecap="round"
      />

      {/* 法线（虚线） */}
      <line
        x1={cx - normalLen * 0.4} y1={cy}
        x2={cx + normalLen * 0.6} y2={cy}
        stroke={OPTICS_COLORS.lightRayNormal}
        strokeWidth={STROKE.reference}
        strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`}
      />

      {/* 入射光线 */}
      <line
        x1={srcX} y1={srcY} x2={cx} y2={cy}
        stroke={OPTICS_COLORS.lightRay}
        strokeWidth={STROKE.vectorMain}
      />
      <polygon
        points={arrowHeadPoints(cx, cy, incDirX, incDirY, 10, 4)}
        fill={OPTICS_COLORS.lightRay}
      />

      {/* 折射光线 */}
      {!isTotalReflection && (
        <>
          <line
            x1={cx} y1={cy} x2={refEndX} y2={refEndY}
            stroke={OPTICS_COLORS.lightRayRefracted}
            strokeWidth={STROKE.vectorMain}
          />
          <polygon
            points={arrowHeadPoints(refEndX, refEndY, refDirX, refDirY, 10, 4)}
            fill={OPTICS_COLORS.lightRayRefracted}
          />
        </>
      )}

      {/* 全反射提示 */}
      {isTotalReflection && (
        <text
          x={cx + 80} y={cy}
          textAnchor="start"
          dominantBaseline="middle"
          fill={OPTICS_COLORS.criticalAngle}
          fontSize={font(13)}
          fontFamily={FONT.family}
        >
          全反射
        </text>
      )}

      {/* 角度标注 */}
      {!isTotalReflection && theta1 > 0 && (() => {
        // θ₁ 弧线（法线与入射光线之间，在法线左侧）
        const incStart = 0
        const incEnd = -theta1

        // θ₂ 弧线（法线与折射光线之间，在法线右侧）
        const refStart = 0
        const refEnd = theta2_deg

        const midInc = deg2rad((incStart + incEnd) / 2)
        const midRef = deg2rad((refStart + refEnd) / 2)
        const labelR = arcR + 14

        return (
          <g>
            {/* θ₁ 弧 */}
            <path
              d={arcPath(cx, cy, arcR, incEnd, incStart)}
              fill="none"
              stroke={CANVAS_COLORS.annotation}
              strokeWidth={STROKE.annotation}
              opacity={0.7}
            />
            {/* θ₂ 弧 */}
            <path
              d={arcPath(cx, cy, arcR, refStart, refEnd)}
              fill="none"
              stroke={CANVAS_COLORS.annotation}
              strokeWidth={STROKE.annotation}
              opacity={0.7}
            />
            {/* θ₁ 标签 */}
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
            {/* θ₂ 标签 */}
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

      {/* 标注文字 */}
      <text
        x={cx + R * 0.5}
        y={cy + R * 0.3}
        textAnchor="middle"
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(10)}
        fontFamily={FONT.family}
      >
        玻璃 (n={n.toFixed(2)})
      </text>
    </g>
  )
}

/* ─── 进阶模式：平行玻璃砖 ────────────────────────────────────────── */

function AdvancedMode({
  theta1, theta1Rad, theta2_deg, theta2Rad, n, cx, cy, font, rectD,
}: {
  theta1: number; theta1Rad: number
  theta2_deg: number; theta2Rad: number
  n: number; cx: number; cy: number
  font: (v: number) => number
  rectD: number
}) {
  const W = RECT_W
  const D = rectD
  const normalLen = NORMAL_LENGTH * 0.6
  const rayLen = RAY_LEN
  const arcR = 35

  const isTotalReflection = isNaN(theta2_deg)

  // 玻璃砖位置（居中偏左）
  const glassX = cx - W * 0.3
  const glassY = cy - D / 2

  // 入射点：上表面中点
  const entryX = glassX + W / 2
  const entryY = glassY

  // 入射方向（从左上射入）
  const incDirX = Math.sin(theta1Rad)
  const incDirY = Math.cos(theta1Rad)

  // 入射光线起点
  const srcX = entryX - rayLen * incDirX
  const srcY = entryY - rayLen * incDirY

  // 内部光线终点（到达下表面）
  // 从入口到下表面的垂直距离 = D
  // 水平偏移 = D * tan(θ₂)
  const internalDx = D * Math.tan(theta2Rad)
  const exitX = entryX + internalDx
  const exitY = glassY + D

  // 出射方向（向右下，角度恢复为 θ₁）
  const outDirX = Math.sin(theta1Rad)
  const outDirY = Math.cos(theta1Rad)

  // 出射光线终点
  const outEndX = exitX + rayLen * outDirX
  const outEndY = exitY + rayLen * outDirY

  // 入射方向延伸线（用于标注侧移 Δx）
  const extendLen = rayLen * 0.8
  const extendEndX = entryX + extendLen * incDirX
  const extendEndY = entryY + extendLen * incDirY

  // 侧移 Δx = d * sin(θ₁ - θ₂) / cos(θ₂)
  const delta_x = D * Math.sin(theta1Rad - theta2Rad) / Math.cos(theta2Rad)

  // 出射点偏移标注的垂足点（从出射点沿入射方向的垂线）
  const perpDirX = -incDirY
  const perpDirY = incDirX
  const footX = exitX + delta_x * perpDirX
  const footY = exitY + delta_x * perpDirY

  return (
    <g>
      {/* 平行玻璃砖 */}
      <rect
        x={glassX} y={glassY} width={W} height={D}
        fill={OPTICS_COLORS.glassFill}
        stroke={OPTICS_COLORS.glassStroke}
        strokeWidth={STROKE.objectLine}
        rx={GLASS_RX}
      />

      {/* 法线（上表面入射点） */}
      <line
        x1={entryX} y1={entryY - normalLen}
        x2={entryX} y2={entryY + normalLen}
        stroke={OPTICS_COLORS.lightRayNormal}
        strokeWidth={STROKE.reference}
        strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`}
      />

      {/* 入射光线（从源到入射点） */}
      <line
        x1={srcX} y1={srcY} x2={entryX} y2={entryY}
        stroke={OPTICS_COLORS.lightRay}
        strokeWidth={STROKE.vectorMain}
      />
      <polygon
        points={arrowHeadPoints(entryX, entryY, incDirX, incDirY, 10, 4)}
        fill={OPTICS_COLORS.lightRay}
      />

      {/* 入射方向延伸线（虚线，用于标注侧移） */}
      {!isTotalReflection && (
        <line
          x1={entryX} y1={entryY}
          x2={extendEndX} y2={extendEndY}
          stroke={OPTICS_COLORS.lightRay}
          strokeWidth={STROKE.reference}
          strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`}
          opacity={0.4}
        />
      )}

      {/* 玻璃内部折射光线 */}
      {!isTotalReflection && (
        <line
          x1={entryX} y1={entryY} x2={exitX} y2={exitY}
          stroke={OPTICS_COLORS.lightRayRefracted}
          strokeWidth={STROKE.vectorMain}
        />
      )}

      {/* 全反射提示 */}
      {isTotalReflection && (
        <text
          x={entryX + 30} y={entryY + 40}
          textAnchor="start"
          dominantBaseline="middle"
          fill={OPTICS_COLORS.criticalAngle}
          fontSize={font(13)}
          fontFamily={FONT.family}
        >
          全反射
        </text>
      )}

      {/* 出射光线 */}
      {!isTotalReflection && (
        <>
          <line
            x1={exitX} y1={exitY} x2={outEndX} y2={outEndY}
            stroke={OPTICS_COLORS.lightRay}
            strokeWidth={STROKE.vectorMain}
          />
          <polygon
            points={arrowHeadPoints(outEndX, outEndY, outDirX, outDirY, 10, 4)}
            fill={OPTICS_COLORS.lightRay}
          />
        </>
      )}

      {/* 侧移 Δx 标注 */}
      {!isTotalReflection && theta1 > 0 && delta_x > 1 && (
        <g>
          {/* 侧移标注线（垂直于入射方向） */}
          <line
            x1={exitX} y1={exitY}
            x2={footX} y2={footY}
            stroke={OPTICS_COLORS.lateralOffset}
            strokeWidth={STROKE.annotation}
            strokeDasharray={`${DASH.reference[0]} ${DASH.reference[1]}`}
          />
          {/* Δx 标签 */}
          <text
            x={(exitX + footX) / 2 + perpDirX * 12}
            y={(exitY + footY) / 2 + perpDirY * 12}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={OPTICS_COLORS.lateralOffset}
            fontSize={font(11)}
            fontFamily={FONT.family}
            fontWeight="bold"
          >
            Δx
          </text>
        </g>
      )}

      {/* 角度标注：入射角 θ₁ */}
      {!isTotalReflection && theta1 > 0 && (() => {
        const incStart = -90
        const incEnd = -90 + theta1

        const midInc = deg2rad((incStart + incEnd) / 2)
        const labelR = arcR + 14

        return (
          <g>
            <path
              d={arcPath(entryX, entryY, arcR, incStart, incEnd)}
              fill="none"
              stroke={CANVAS_COLORS.annotation}
              strokeWidth={STROKE.annotation}
              opacity={0.7}
            />
            <text
              x={entryX + labelR * Math.cos(midInc)}
              y={entryY + labelR * Math.sin(midInc)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={CANVAS_COLORS.annotation}
              fontSize={font(11)}
              fontFamily={FONT.family}
            >
              θ₁
            </text>
          </g>
        )
      })()}

      {/* 角度标注：折射角 θ₂ */}
      {!isTotalReflection && theta2_deg > 0 && (() => {
        const refStart = -90
        const refEnd = -90 + theta2_deg

        const midRef = deg2rad((refStart + refEnd) / 2)
        const labelR = arcR + 14

        return (
          <g>
            <path
              d={arcPath(entryX, entryY, arcR * 0.8, refStart, refEnd)}
              fill="none"
              stroke={CANVAS_COLORS.annotation}
              strokeWidth={STROKE.annotation}
              opacity={0.7}
            />
            <text
              x={entryX + labelR * 0.8 * Math.cos(midRef)}
              y={entryY + labelR * 0.8 * Math.sin(midRef)}
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

      {/* 标注文字 */}
      <text
        x={glassX + W / 2}
        y={glassY + D / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(10)}
        fontFamily={FONT.family}
      >
        玻璃 (n={n.toFixed(2)})
      </text>
    </g>
  )
}
