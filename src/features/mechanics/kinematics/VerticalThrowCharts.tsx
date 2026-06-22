import type { MouseEvent } from 'react'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  VT_CHART_COLORS,
  XT_CHART_COLORS,
  STROKE,
  DASH,
  FONT,
} from '@/theme/physics'
import { ChartSecant, ChartTangent } from '@/components/Chart'
import type { UseVerticalThrowChartLayoutResult } from './useVerticalThrowChartLayout'
import type { UseVerticalThrowPhysicsResult } from './useVerticalThrowPhysics'

/** 脉冲动画周期 (ms) */
const PULSE_PERIOD = 800

type ChartKind = 'vt' | 'yt'

interface VerticalThrowChartsProps {
  layout: UseVerticalThrowChartLayoutResult
  physics: UseVerticalThrowPhysicsResult
  advancedMode: number
  sliceDensity: number
  airResistance: number
  showDoubleTrack: boolean
  targetHeight: number
  g: number
  clampedY: number
  clampedVacuumY: number
  font: (v: number) => number
  onChartClick: (e: MouseEvent<SVGElement>, chartType: ChartKind) => void
  onChartMouseDown: (e: MouseEvent<SVGElement>, chartType: ChartKind) => void
}

/**
 * 竖直上抛右侧双图表区。
 *
 * 先从 VerticalThrowAnimation 主文件拆出独立组件，承接 ChartSecant / ChartTangent
 * 插件化结果；下一步可在本组件内继续迁入 VelocityTimeChart / DisplacementTimeChart
 * 预设，避免主动画文件同时承担舞台和图表双重职责。
 */
export function VerticalThrowCharts({
  layout,
  physics,
  advancedMode,
  sliceDensity,
  airResistance,
  showDoubleTrack,
  targetHeight,
  g,
  clampedY,
  clampedVacuumY,
  font,
  onChartClick,
  onChartMouseDown,
}: VerticalThrowChartsProps) {
  const {
    dataX,
    dataWidth,
    vtChartTop,
    vtChartHeight,
    vtInnerPad,
    vtInnerW,
    vtInnerH,
    xMax,
    vtToX,
    vtToY,
    ytChartTop,
    ytChartHeight,
    ytInnerPad,
    ytInnerW,
    ytInnerH,
    ytToX,
    ytToY,
    vtYTicks,
    xticks,
    ytYTicks,
    vtData,
    ytData,
    vtPositiveAreaD,
    vtNegativeAreaD,
    ytAreaD,
    sliceRects,
  } = layout

  const {
    maxHeight,
    maxHeightTime,
    effectiveTime,
    effectiveV,
    vacuumV,
    isLanded,
    isAtPeak,
    areaValues,
    targetHeightIntersections,
    vT1,
    vT2,
  } = physics

  return (
    <>
        {/* ========== 右侧：v-t 图 ========== */}
        <g transform={`translate(${dataX}, ${vtChartTop})`}>
          <rect width={dataWidth} height={vtChartHeight} fill="white" rx={4} stroke={CHART_COLORS.axisLine} />
          <text x={dataWidth / 2} y={18} fontSize={FONT.axis} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
            速度-时间图像 (v-t 图)
          </text>

          <line x1={vtInnerPad.left} y1={vtInnerPad.top} x2={vtInnerPad.left} y2={vtInnerPad.top + vtInnerH}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
          <line x1={vtInnerPad.left} y1={vtToY(0)} x2={vtInnerPad.left + vtInnerW} y2={vtToY(0)}
            stroke={CHART_COLORS.zeroline} strokeWidth={STROKE.axisBold} />

          {xticks.map(t => (
            <g key={`vt-xt-${t}`}>
              <line x1={vtToX(t)} y1={vtToY(0) - 4} x2={vtToX(t)} y2={vtToY(0) + 4}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={vtToX(t)} y={vtToY(0) + 16} fontSize={font(9)} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{t}</text>
            </g>
          ))}

          {vtYTicks.map(v => (
            <g key={`vt-yt-${v}`}>
              <line x1={vtInnerPad.left - 4} y1={vtToY(v)} x2={vtInnerPad.left} y2={vtToY(v)}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={vtInnerPad.left - 8} y={vtToY(v) + 3} fontSize={font(9)} textAnchor="end" fill={CHART_COLORS.tickLabel}>{v}</text>
            </g>
          ))}

          <text x={vtInnerPad.left + vtInnerW / 2} y={vtInnerPad.top + vtInnerH + 28}
            fontSize={font(10)} textAnchor="middle" fill={CHART_COLORS.labelText}>t/s</text>
          <text x={vtInnerPad.left - 30} y={vtInnerPad.top + vtInnerH / 2}
            fontSize={font(10)} textAnchor="middle" fill={CHART_COLORS.labelText}
            transform={`rotate(-90, ${vtInnerPad.left - 30}, ${vtInnerPad.top + vtInnerH / 2})`}>v/(m·s⁻¹)</text>

          {advancedMode === 1 && sliceDensity > 0 ? (
            sliceRects.map((rect, idx) => (
              <rect key={`slice-${idx}`}
                x={rect.x} y={rect.y} width={rect.w} height={rect.h}
                fill={rect.positive ? 'url(#gridPattern)' : 'url(#stripePattern)'}
                opacity={0.55}
              />
            ))
          ) : (
            <>
              {vtPositiveAreaD && (
                <path d={vtPositiveAreaD} fill="url(#aurora-blue-grad)" />
              )}
              {vtNegativeAreaD && (
                <path d={vtNegativeAreaD} fill="url(#aurora-red-grad)" />
              )}
            </>
          )}

          {airResistance > 0 && vtData.vacFull && (
            <path d={vtData.vacFull} fill="none" stroke={CHART_COLORS.asymptote} strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />
          )}

          {vtData.airFull && (
            <path d={vtData.airFull} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={1} opacity={0.15} />
          )}

          {showDoubleTrack && vtData.vacActive && (
            <path d={vtData.vacActive} fill="none" stroke={PHYSICS_COLORS.position} strokeWidth={1.5} opacity={0.7} />
          )}

          {vtData.airActive && (
            <path d={vtData.airActive} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={2} filter="url(#glow-filter-blue)" />
          )}

          {isAtPeak && (
            <g>
              <ChartTangent
                point={{ x: maxHeightTime, y: 0 }}
                slope={-g}
                extent={Math.min(0.5, xMax * 0.08)}
                label="k = -g"
                color={CHART_COLORS.criticalPt}
                strokeWidth={1}
                lineOpacity={0.85}
                showPoint={false}
                strokeDasharray="2,2"
                toSvgX={vtToX}
                toSvgY={vtToY}
                font={font}
              />

              <circle cx={vtToX(maxHeightTime)} cy={vtToY(0)} r={6}
                fill={VT_CHART_COLORS.zeroCrossing} opacity={0.6}>
                <animate attributeName="r" values="6;10;6" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
              </circle>
              <circle cx={vtToX(maxHeightTime)} cy={vtToY(0)} r={3}
                fill={VT_CHART_COLORS.zeroCrossing} />
            </g>
          )}

          {advancedMode === 1 && targetHeightIntersections && (
            <g opacity={Math.abs(effectiveTime - targetHeightIntersections.t1) < 0.2 || Math.abs(effectiveTime - targetHeightIntersections.t2) < 0.2 ? 0.95 : 0.25}>
              <line
                x1={vtInnerPad.left} y1={vtToY(vT1)}
                x2={vtToX(targetHeightIntersections.t1)} y2={vtToY(vT1)}
                stroke={CHART_COLORS.highlight} strokeWidth={0.8} strokeDasharray="2,2"
              />
              <circle cx={vtToX(targetHeightIntersections.t1)} cy={vtToY(vT1)} r={3.5} fill={CHART_COLORS.highlight} />

              <line
                x1={vtInnerPad.left} y1={vtToY(vT2)}
                x2={vtToX(targetHeightIntersections.t2)} y2={vtToY(vT2)}
                stroke={CHART_COLORS.highlight} strokeWidth={0.8} strokeDasharray="2,2"
              />
              <circle cx={vtToX(targetHeightIntersections.t2)} cy={vtToY(vT2)} r={3.5} fill={CHART_COLORS.highlight} />
            </g>
          )}

          {!isAtPeak && effectiveTime > 0 && (
            <g>
              <circle cx={vtToX(effectiveTime)} cy={vtToY(effectiveV)} r={4.5} fill={VT_CHART_COLORS.velocityCurve} />
              <circle cx={vtToX(effectiveTime)} cy={vtToY(effectiveV)} r={7} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={0.5} opacity={0.5} />
            </g>
          )}

          {showDoubleTrack && !isLanded && (
            <circle cx={vtToX(effectiveTime)} cy={vtToY(vacuumV)} r={3.5} fill={PHYSICS_COLORS.position} opacity={0.8} />
          )}

          <rect x={vtInnerPad.left} y={vtInnerPad.top} width={vtInnerW} height={vtInnerH}
            fill="transparent" cursor="crosshair"
            onClick={(e) => onChartClick(e, 'vt')}
            onMouseDown={(e) => onChartMouseDown(e, 'vt')} />

          {effectiveTime > 0 && (
            <g>
              <line x1={vtToX(effectiveTime)} y1={vtInnerPad.top}
                x2={vtToX(effectiveTime)} y2={vtInnerPad.top + vtInnerH}
                stroke={VT_CHART_COLORS.slopeTangent} strokeWidth={1}
                strokeDasharray={DASH.tangent.join(' ')} opacity={0.8} />
              <circle cx={vtToX(effectiveTime)} cy={vtInnerPad.top} r={2} fill={VT_CHART_COLORS.slopeTangent} />
            </g>
          )}

          {advancedMode === 1 && areaValues && (
            <g>
              <rect x={vtInnerPad.left + vtInnerW - 105} y={vtInnerPad.top + 6} width={100} height={42} fill={PHYSICS_COLORS.objectFillNeutral} opacity={0.85} rx={3} stroke={CHART_COLORS.gridLine} strokeWidth={0.8} />
              <text x={vtInnerPad.left + vtInnerW - 10} y={vtInnerPad.top + 16}
                fontSize={font(8)} fill={VT_CHART_COLORS.areaShade} textAnchor="end" fontWeight="bold">
                上升位移 S⁺ = {areaValues.positive.toFixed(2)} m
              </text>
              <text x={vtInnerPad.left + vtInnerW - 10} y={vtInnerPad.top + 26}
                fontSize={font(8)} fill={VT_CHART_COLORS.zeroCrossing} textAnchor="end" fontWeight="bold">
                下落位移 S⁻ = {areaValues.negative.toFixed(2)} m
              </text>
              <text x={vtInnerPad.left + vtInnerW - 10} y={vtInnerPad.top + 36}
                fontSize={font(8)} fill={CHART_COLORS.labelText} textAnchor="end" fontWeight="bold">
                当前高度 y = {areaValues.net.toFixed(2)} m
              </text>
            </g>
          )}
        </g>

        {/* ========== 右侧：y-t 图 ========== */}
        <g transform={`translate(${dataX}, ${ytChartTop})`}>
          <rect width={dataWidth} height={ytChartHeight} fill="white" rx={4} stroke={CHART_COLORS.axisLine} />
          <text x={dataWidth / 2} y={16} fontSize={FONT.axis} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
            位移-时间图像 (y-t 图)
          </text>

          <line x1={ytInnerPad.left} y1={ytInnerPad.top} x2={ytInnerPad.left} y2={ytInnerPad.top + ytInnerH}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
          <line x1={ytInnerPad.left} y1={ytInnerPad.top + ytInnerH} x2={ytInnerPad.left + ytInnerW} y2={ytInnerPad.top + ytInnerH}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

          {xticks.map(t => (
            <g key={`yt-xt-${t}`}>
              <line x1={ytToX(t)} y1={ytInnerPad.top + ytInnerH - 4} x2={ytToX(t)} y2={ytInnerPad.top + ytInnerH + 4}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={ytToX(t)} y={ytInnerPad.top + ytInnerH + 16} fontSize={font(9)} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{t}</text>
            </g>
          ))}

          {ytYTicks.map(y => (
            <g key={`yt-ytick-${y}`}>
              <line x1={ytInnerPad.left - 4} y1={ytToY(y)} x2={ytInnerPad.left} y2={ytToY(y)}
                stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
              <text x={ytInnerPad.left - 8} y={ytToY(y) + 3} fontSize={font(9)} textAnchor="end" fill={CHART_COLORS.tickLabel}>{y}</text>
            </g>
          ))}

          <text x={ytInnerPad.left + ytInnerW / 2} y={ytInnerPad.top + ytInnerH + 28}
            fontSize={font(10)} textAnchor="middle" fill={CHART_COLORS.labelText}>t/s</text>
          <text x={ytInnerPad.left - 30} y={ytInnerPad.top + ytInnerH / 2}
            fontSize={font(10)} textAnchor="middle" fill={CHART_COLORS.labelText}
            transform={`rotate(-90, ${ytInnerPad.left - 30}, ${ytInnerPad.top + ytInnerH / 2})`}>y/m</text>

          <line x1={ytInnerPad.left} y1={ytToY(maxHeight)} x2={ytInnerPad.left + ytInnerW} y2={ytToY(maxHeight)}
            stroke={CHART_COLORS.zeroline} strokeWidth={0.8}
            strokeDasharray={DASH.reference.join(' ')} opacity={0.6} />

          {advancedMode === 1 && targetHeight > 0 && targetHeight < maxHeight && (
            <>
              <line x1={ytInnerPad.left} y1={ytToY(targetHeight)}
                x2={ytInnerPad.left + ytInnerW} y2={ytToY(targetHeight)}
                stroke={CHART_COLORS.highlight} strokeWidth={STROKE.reference}
                strokeDasharray={DASH.reference.join(' ')} opacity={0.7} />
              <text x={ytInnerPad.left + ytInnerW - 3} y={ytToY(targetHeight) - 4}
                fontSize={FONT.small} fill={CHART_COLORS.highlight} textAnchor="end" opacity={0.8}>
                高度 y = {targetHeight}m
              </text>
              {targetHeightIntersections && (
                <>
                  <line x1={ytToX(targetHeightIntersections.t1)} y1={ytInnerPad.top}
                    x2={ytToX(targetHeightIntersections.t1)} y2={ytInnerPad.top + ytInnerH}
                    stroke={CHART_COLORS.highlight} strokeWidth={0.8}
                    strokeDasharray={DASH.tangent.join(' ')} opacity={0.5} />
                  <text x={ytToX(targetHeightIntersections.t1)} y={ytInnerPad.top + ytInnerH + 26}
                    fontSize={font(8)} fill={CHART_COLORS.highlight} textAnchor="middle">
                    t₁={targetHeightIntersections.t1.toFixed(2)}s
                  </text>
                  <line x1={ytToX(targetHeightIntersections.t2)} y1={ytInnerPad.top}
                    x2={ytToX(targetHeightIntersections.t2)} y2={ytInnerPad.top + ytInnerH}
                    stroke={CHART_COLORS.highlight} strokeWidth={0.8}
                    strokeDasharray={DASH.tangent.join(' ')} opacity={0.5} />
                  <text x={ytToX(targetHeightIntersections.t2)} y={ytInnerPad.top + ytInnerH + 26}
                    fontSize={font(8)} fill={CHART_COLORS.highlight} textAnchor="middle">
                    t₂={targetHeightIntersections.t2.toFixed(2)}s
                  </text>
                </>
              )}
            </>
          )}

          {ytAreaD && (
            <path d={ytAreaD} fill={XT_CHART_COLORS.positionCurve} opacity={0.08} />
          )}

          {airResistance > 0 && ytData.vacFull && (
            <path d={ytData.vacFull} fill="none" stroke={CHART_COLORS.asymptote} strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />
          )}

          {ytData.airFull && (
            <path d={ytData.airFull} fill="none" stroke={XT_CHART_COLORS.positionCurve} strokeWidth={1} opacity={0.15} />
          )}

          {showDoubleTrack && ytData.vacActive && (
            <path d={ytData.vacActive} fill="none" stroke={PHYSICS_COLORS.position} strokeWidth={1.5} opacity={0.7} />
          )}

          {ytData.airActive && (
            <path d={ytData.airActive} fill="none" stroke={XT_CHART_COLORS.positionCurve} strokeWidth={2} filter="url(#glow-filter-blue)" />
          )}

          {advancedMode === 1 && effectiveTime > 0.05 && !isLanded && (
            <ChartSecant
              point={{ x: 0, y: 0 }}
              secantPoint={{ x: effectiveTime, y: clampedY }}
              label="v̄"
              dxLabel="t"
              dyLabel="y"
              color={PHYSICS_COLORS.secantLine}
              showTriangle={sliceDensity > 0}
              strokeWidth={1}
              strokeDasharray="3,2"
              lineOpacity={0.65}
              triangleOpacity={0.07}
              toSvgX={ytToX}
              toSvgY={ytToY}
              font={font}
            />
          )}

          {advancedMode === 1 && effectiveTime > 0.05 && !isLanded && (
            <ChartTangent
              point={{ x: effectiveTime, y: clampedY }}
              slope={effectiveV}
              extent={Math.min(0.6, xMax * 0.08)}
              label="k = v"
              color={VT_CHART_COLORS.slopeTangent}
              strokeWidth={1}
              lineOpacity={0.75}
              showPoint={false}
              toSvgX={ytToX}
              toSvgY={ytToY}
              font={font}
            />
          )}

          {isAtPeak && (
            <g>
              <circle cx={ytToX(maxHeightTime)} cy={ytToY(maxHeight)} r={5}
                fill={CHART_COLORS.highlight} opacity={0.7}>
                <animate attributeName="r" values="5;8;5" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;1;0.7" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {!isAtPeak && effectiveTime > 0 && (
            <circle cx={ytToX(effectiveTime)} cy={ytToY(clampedY)} r={4.5} fill={XT_CHART_COLORS.positionCurve} />
          )}

          {showDoubleTrack && !isLanded && (
            <circle cx={ytToX(effectiveTime)} cy={ytToY(clampedVacuumY)} r={3.5} fill={PHYSICS_COLORS.position} opacity={0.8} />
          )}

          <rect x={ytInnerPad.left} y={ytInnerPad.top} width={ytInnerW} height={ytInnerH}
            fill="transparent" cursor="crosshair"
            onClick={(e) => onChartClick(e, 'yt')}
            onMouseDown={(e) => onChartMouseDown(e, 'yt')} />

          {effectiveTime > 0 && (
            <g>
              <line x1={ytToX(effectiveTime)} y1={ytInnerPad.top}
                x2={ytToX(effectiveTime)} y2={ytInnerPad.top + ytInnerH}
                stroke={VT_CHART_COLORS.slopeTangent} strokeWidth={1}
                strokeDasharray={DASH.tangent.join(' ')} opacity={0.8} />
              <circle cx={ytToX(effectiveTime)} cy={ytInnerPad.top} r={2} fill={VT_CHART_COLORS.slopeTangent} />
            </g>
          )}
        </g>
    </>
  )
}

export default VerticalThrowCharts
