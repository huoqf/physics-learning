/**
 * ElectricFieldBasicScene.tsx — 基础模式场景（单电荷 + 试探电荷 + 图表）
 */
import { VectorArrow } from '@/components/Physics'
import { useMemo } from 'react'
import { PHYSICS_COLORS, CANVAS_STYLE, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

import { RelationChart } from '@/components/Chart'
import type { SceneScale } from '@/scene'

interface Props {
  w: number
  h: number
  cx: number
  cy: number
  qSource: number
  qTest: number
  testX: number
  testY: number
  isDragging: boolean
  basicPhysics: {
    distCm: number
    distM: number
    E: number
    Ex: number
    Ey: number
    F: number
    Fx: number
    Fy: number
  }
  basicArrows: {
    vectorE: { x: number; y: number }
    pixelLenE: number
    vectorF: { x: number; y: number }
    pixelLenF: number
  } | null
  chartProps: {
    chartW: number
    chartH: number
    chartLeft: number
    topY_E: number
    topY_F: number
    rMin: number
    rMax: number
    eMax: number
    fMax: number
    points: { r: number; E: number; F: number }[]
  } | null
  sceneScale: SceneScale
  font: (size: number) => number
}

function vectorLabelPos(
  originX: number,
  originY: number,
  v: { x: number; y: number },
  pixelLen: number,
  extra = 14,
  perpOffset = 0,
) {
  const mag = Math.hypot(v.x, v.y) || 1
  const ux = v.x / mag
  const uyScreen = -v.y / mag
  const px = -uyScreen * perpOffset
  const py = ux * perpOffset
  return {
    x: originX + ux * (pixelLen + extra) + px,
    y: originY + uyScreen * (pixelLen + extra) + py + 4,
  }
}

export function ElectricFieldBasicScene({
  w, h, cx, cy, qSource, qTest, testX, testY, isDragging,
  basicPhysics, basicArrows, chartProps, sceneScale, font,
}: Props) {
  const ePoints = useMemo(
    () => chartProps?.points.map((p) => ({ x: p.r, y: p.E })) ?? [],
    [chartProps],
  )
  const fPoints = useMemo(
    () => chartProps?.points.map((p) => ({ x: p.r, y: p.F })) ?? [],
    [chartProps],
  )

  const eLabelPos = basicArrows
    ? vectorLabelPos(testX, testY, basicArrows.vectorE, basicArrows.pixelLenE)
    : null
  const fLabelPos = (() => {
    if (!basicArrows || qTest === 0) return null
    const sameDir = qTest > 0
    const nearTip = Math.abs(basicArrows.pixelLenE - basicArrows.pixelLenF) < 22
    return vectorLabelPos(
      testX,
      testY,
      basicArrows.vectorF,
      basicArrows.pixelLenF,
      14,
      sameDir && nearTip ? 14 : 0,
    )
  })()

  return (
    <g>
      {/* 物理场景分隔线 */}
      <line x1={w * 0.6} y1={20} x2={w * 0.6} y2={h - 20}
        stroke={PHYSICS_COLORS.grid} strokeWidth={1} strokeDasharray="5,5" />

      {/* 大源电荷 Q */}
      <circle cx={cx} cy={cy} r={24}
        fill={qSource > 0 ? PHYSICS_COLORS.positiveCharge : qSource < 0 ? PHYSICS_COLORS.negativeCharge : colors.neutral[400]}
        stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
      <text x={cx} y={cy + 7} fontSize={font(16)} fill={CANVAS_COLORS.white}
        textAnchor="middle" fontWeight="bold">
        {qSource > 0 ? '+' : qSource < 0 ? '−' : '0'}
      </text>
      <text x={cx} y={cy - 30} fontSize={font(12)}
        fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
        源电荷 Q = {qSource > 0 ? '+' : ''}{qSource.toFixed(1)} μC
      </text>

      {/* 试探电荷 P */}
      <circle cx={testX} cy={testY} r={12}
        fill={qTest > 0 ? PHYSICS_COLORS.positiveCharge : (qTest < 0 ? PHYSICS_COLORS.negativeCharge : colors.neutral[300])}
        stroke={isDragging ? PHYSICS_COLORS.electricForce : PHYSICS_COLORS.objectStroke}
        strokeWidth={isDragging ? 2.5 : CANVAS_STYLE.stroke.objectLine}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }} />
      <text x={testX} y={testY + 4} fontSize={font(12)}
        fill={qTest === 0 ? colors.neutral[800] : CANVAS_COLORS.white}
        textAnchor="middle" fontWeight="bold">
        {qTest > 0 ? '+' : (qTest < 0 ? '−' : '0')}
      </text>
      <text x={testX} y={testY - 18} fontSize={font(11)}
        fill={PHYSICS_COLORS.labelText} textAnchor="middle">
        q = {qTest > 0 ? '+' : ''}{qTest.toFixed(1)} μC
      </text>

      {/* E / F 矢量箭头 */}
      {basicArrows && eLabelPos && (
        <g>
          <VectorArrow
            originDesign={{ x: testX, y: testY }}
            vector={basicArrows.vectorE}
            type="electricField"
            arrowType="physical-schematic"
            sceneScale={sceneScale}
            pixelLength={basicArrows.pixelLenE}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
          />
          <text
            x={eLabelPos.x}
            y={eLabelPos.y}
            fontSize={font(12)}
            fill={PHYSICS_COLORS.electricField}
            fontWeight="bold"
            textAnchor="middle"
          >
            E
          </text>

          {qTest !== 0 && fLabelPos && (
            <>
              <VectorArrow
                originDesign={{ x: testX, y: testY }}
                vector={basicArrows.vectorF}
                type="electricForce"
                arrowType="physical-schematic"
                sceneScale={sceneScale}
                pixelLength={basicArrows.pixelLenF}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain + 0.5}
              />
              <text
                x={fLabelPos.x}
                y={fLabelPos.y}
                fontSize={font(12)}
                fill={PHYSICS_COLORS.electricForce}
                fontWeight="bold"
                textAnchor="middle"
              >
                F
              </text>
            </>
          )}
        </g>
      )}

      {/* 对比图表：E-r / F-r 双图直接作为 SVG 元素绘制 */}
      {chartProps && (
        <g>
          <g transform={`translate(${chartProps.chartLeft}, ${chartProps.topY_E})`}>
            <RelationChart
              points={ePoints}
              xLabel="r / cm"
              yLabel="E / (N/C)"
              title="E-r 场强曲线"
              xDomain={[chartProps.rMin, chartProps.rMax]}
              yDomain={[0, chartProps.eMax]}
              cursorX={basicPhysics.distCm}
              cursorLabel={(_x, y) => `E=${y.toExponential(2)}`}
              color={PHYSICS_COLORS.electricField}
              strokeWidth={1.8}
              fixedSize={{ width: chartProps.chartW, height: chartProps.chartH }}
            />
          </g>

          <g transform={`translate(${chartProps.chartLeft}, ${chartProps.topY_F})`}>
            <RelationChart
              points={fPoints}
              xLabel="r / cm"
              yLabel="F / N"
              title="F-r 静电力曲线"
              xDomain={[chartProps.rMin, chartProps.rMax]}
              yDomain={[0, chartProps.fMax]}
              cursorX={basicPhysics.distCm}
              cursorLabel={(_x, y) => `F=${y.toExponential(2)}`}
              color={PHYSICS_COLORS.electricForce}
              strokeWidth={1.8}
              fixedSize={{ width: chartProps.chartW, height: chartProps.chartH }}
            />
          </g>
        </g>
      )}
    </g>
  )
}
