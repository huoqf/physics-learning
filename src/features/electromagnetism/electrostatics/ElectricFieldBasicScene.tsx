/**
 * ElectricFieldBasicScene.tsx — 基础模式场景（单电荷 + 试探电荷 + 图表）
 *
 * 从 ElectricField.tsx 拆分：mode=0 的中间屏渲染。
 */
import { PHYSICS_COLORS, CANVAS_STYLE, CHART_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

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
    bottomY_E: number
    bottomY_F: number
    topY_E: number
    topY_F: number
    toX: (r: number) => number
    toYE: (e: number) => number
    toYF: (f: number) => number
    pathE: string
    pathF: string
    eMax: number
    fMax: number
  } | null
}

export function ElectricFieldBasicScene({
  w, h, cx, cy, qSource, qTest, testX, testY, isDragging,
  basicPhysics, basicArrows, chartProps,
}: Props) {
  const basicScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: w, height: h },
    originX: 0,
    originY: 0,
  }
  const sceneScale = createSceneScale(basicScene)

  return (
    <g>
      {/* 物理场景分隔线 */}
      <line x1={w * 0.6} y1={20} x2={w * 0.6} y2={h - 20}
        stroke={PHYSICS_COLORS.grid} strokeWidth={1} strokeDasharray="5,5" />

      {/* 大源电荷 Q */}
      <circle cx={cx} cy={cy} r={24}
        fill={qSource >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
        stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
      <text x={cx} y={cy + 7} fontSize="22" fill={colors.neutral.white}
        textAnchor="middle" fontWeight="bold">
        {qSource >= 0 ? '+' : '−'}
      </text>
      <text x={cx} y={cy - 30} fontSize={CANVAS_STYLE.font.labelSize}
        fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
        源电荷 Q = {qSource > 0 ? '+' : ''}{qSource.toFixed(1)} μC
      </text>

      {/* 试探电荷 P */}
      <circle cx={testX} cy={testY} r={12}
        fill={qTest > 0 ? PHYSICS_COLORS.positiveCharge : (qTest < 0 ? PHYSICS_COLORS.negativeCharge : colors.neutral[300])}
        stroke={isDragging ? PHYSICS_COLORS.electricForce : PHYSICS_COLORS.objectStroke}
        strokeWidth={isDragging ? 2.5 : CANVAS_STYLE.stroke.objectLine}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }} />
      <text x={testX} y={testY + 4} fontSize="12"
        fill={qTest === 0 ? colors.neutral[800] : colors.neutral.white}
        textAnchor="middle" fontWeight="bold">
        {qTest > 0 ? '+' : (qTest < 0 ? '−' : '0')}
      </text>
      <text x={testX} y={testY - 18} fontSize={CANVAS_STYLE.font.axisSize}
        fill={PHYSICS_COLORS.labelText} textAnchor="middle">
        q = {qTest > 0 ? '+' : ''}{qTest.toFixed(1)} μC
      </text>

      {/* E / F 矢量箭头 */}
      {basicArrows && (
        <g>
          <VectorArrow
            origin={{ x: testX, y: -testY }}
            vector={basicArrows.vectorE}
            type="electricField"
            sceneScale={sceneScale}
            pixelLength={basicArrows.pixelLenE}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
          />
          <text
            x={testX + (basicArrows.vectorE.x >= 0 ? 1 : -1) * (basicArrows.pixelLenE + 14)}
            y={testY - (basicArrows.vectorE.y >= 0 ? 1 : -1) * 6 + 4}
            fontSize={CANVAS_STYLE.font.labelSize}
            fill={PHYSICS_COLORS.electricField}
            fontWeight="bold"
            textAnchor="middle"
          >
            E
          </text>

          {qTest !== 0 && (
            <>
              <VectorArrow
                origin={{ x: testX, y: -testY }}
                vector={basicArrows.vectorF}
                type="electricForce"
                sceneScale={sceneScale}
                pixelLength={basicArrows.pixelLenF}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain + 0.5}
              />
              <text
                x={testX + (basicArrows.vectorF.x >= 0 ? 1 : -1) * (basicArrows.pixelLenF + 14)}
                y={testY - (basicArrows.vectorF.y >= 0 ? 1 : -1) * 6 + 18}
                fontSize={CANVAS_STYLE.font.labelSize}
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

      {/* 对比图表 */}
      {chartProps && (
        <g>
          {/* E-r 图表 */}
          <g>
            <rect x={chartProps.chartLeft} y={chartProps.topY_E - 15}
              width={chartProps.chartW + 15} height={chartProps.chartH + 30}
              fill="white" stroke={CHART_COLORS.axisLine} rx={4} />
            <text x={chartProps.chartLeft + chartProps.chartW / 2 + 5} y={chartProps.topY_E - 4}
              fontSize="10" fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
              E-r 场强曲线
            </text>
            <line x1={chartProps.chartLeft} y1={chartProps.topY_E}
              x2={chartProps.chartLeft} y2={chartProps.bottomY_E}
              stroke={CHART_COLORS.axisLine} strokeWidth={1.5} />
            <line x1={chartProps.chartLeft} y1={chartProps.bottomY_E}
              x2={chartProps.chartLeft + chartProps.chartW} y2={chartProps.bottomY_E}
              stroke={CHART_COLORS.axisLine} strokeWidth={1.5} />
            <text x={chartProps.chartLeft + chartProps.chartW} y={chartProps.bottomY_E + 12}
              fontSize="8" fill={CHART_COLORS.labelText} textAnchor="end">
              r/cm
            </text>
            <text x={chartProps.chartLeft - 5} y={chartProps.topY_E + 8}
              fontSize="8" fill={CHART_COLORS.labelText} textAnchor="end">
              E
            </text>
            <path d={chartProps.pathE} fill="none"
              stroke={PHYSICS_COLORS.electricField} strokeWidth={1.8} />
            <circle cx={chartProps.toX(basicPhysics.distCm)} cy={chartProps.toYE(basicPhysics.E)}
              r={4} fill={PHYSICS_COLORS.electricField} stroke="white" strokeWidth={1.2} />
          </g>

          {/* F-r 图表 */}
          <g>
            <rect x={chartProps.chartLeft} y={chartProps.topY_F - 15}
              width={chartProps.chartW + 15} height={chartProps.chartH + 30}
              fill="white" stroke={CHART_COLORS.axisLine} rx={4} />
            <text x={chartProps.chartLeft + chartProps.chartW / 2 + 5} y={chartProps.topY_F - 4}
              fontSize="10" fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
              F-r 静电力曲线
            </text>
            <line x1={chartProps.chartLeft} y1={chartProps.topY_F}
              x2={chartProps.chartLeft} y2={chartProps.bottomY_F}
              stroke={CHART_COLORS.axisLine} strokeWidth={1.5} />
            <line x1={chartProps.chartLeft} y1={chartProps.bottomY_F}
              x2={chartProps.chartLeft + chartProps.chartW} y2={chartProps.bottomY_F}
              stroke={CHART_COLORS.axisLine} strokeWidth={1.5} />
            <text x={chartProps.chartLeft + chartProps.chartW} y={chartProps.bottomY_F + 12}
              fontSize="8" fill={CHART_COLORS.labelText} textAnchor="end">
              r/cm
            </text>
            <text x={chartProps.chartLeft - 5} y={chartProps.topY_F + 8}
              fontSize="8" fill={CHART_COLORS.labelText} textAnchor="end">
              F
            </text>
            <path d={chartProps.pathF} fill="none"
              stroke={PHYSICS_COLORS.electricForce} strokeWidth={1.8} />
            <circle cx={chartProps.toX(basicPhysics.distCm)} cy={chartProps.toYF(basicPhysics.F)}
              r={4} fill={PHYSICS_COLORS.electricForce} stroke="white" strokeWidth={1.2} />
          </g>
        </g>
      )}
    </g>
  )
}
