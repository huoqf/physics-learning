import { Ball, PhysicsVectorArrow } from '@/components/Physics'
import { worldToDesign, type SceneScale } from '@/scene'
import {
  CANVAS_COLORS,
  CHART_COLORS,
  EM_COLORS,
  PHYSICS_COLORS,
  STROKE,
  withAlpha,
} from '@/theme/physics'
import type { CanvasSize } from '@/utils'
import type { ViewportInfo } from '@/utils/useViewport'
import type { EqualChargeFieldPhysicsResult } from '../hooks/useEqualChargeFieldPhysics'
import { EQUAL_CHARGE_SCAN_HALF_CM } from '@/physics'

interface EqualChargeFieldSceneProps {
  physics: EqualChargeFieldPhysicsResult
  canvasSize: CanvasSize
  sceneScale: SceneScale
  vp: ViewportInfo
  showFieldLines: boolean
  showEquipotentials: boolean
  showVectors: boolean
  chargeType: number
  axis: number
}

/**
 * 等量电荷场线与对称轴分布渲染场景（纯 SVG 设计坐标，所有物理坐标经 worldToDesign 映射）。
 */
export function EqualChargeFieldScene({
  physics,
  canvasSize,
  sceneScale,
  vp,
  showFieldLines,
  showEquipotentials,
  showVectors,
  chargeType,
  axis,
}: EqualChargeFieldSceneProps) {
  const { font } = canvasSize
  const { aM, q1C, q2C, snapshot, fieldLines, equipotentials } = physics

  const c1 = worldToDesign(-aM, 0, sceneScale)
  const c2 = worldToDesign(aM, 0, sceneScale)
  const origin = worldToDesign(0, 0, sceneScale)
  const probe = worldToDesign(snapshot.xM, snapshot.yM, sceneScale)

  const scanHalfM = EQUAL_CHARGE_SCAN_HALF_CM * 0.01
  const axisStart = axis === 0
    ? worldToDesign(-scanHalfM, 0, sceneScale)
    : worldToDesign(0, -scanHalfM, sceneScale)
  const axisEnd = axis === 0
    ? worldToDesign(scanHalfM, 0, sceneScale)
    : worldToDesign(0, scanHalfM, sceneScale)

  const yMaxM = snapshot.yMaxCm * 0.01
  const extTop = worldToDesign(0, yMaxM, sceneScale)
  const extBot = worldToDesign(0, -yMaxM, sceneScale)

  const showBisectorExtrema = axis === 1 && chargeType !== 0

  return (
    <g>
      {/* 辅助坐标网格线 */}
      <line
        x1={vp.designLeft}
        y1={origin.py}
        x2={vp.designLeft + vp.designVisibleW}
        y2={origin.py}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={STROKE.grid}
        strokeDasharray="4,4"
        opacity={0.55}
      />
      <line
        x1={origin.px}
        y1={12}
        x2={origin.px}
        y2={313}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={STROKE.grid}
        strokeDasharray="4,4"
        opacity={0.55}
      />

      {/* 1. 等势面图层 */}
      {showEquipotentials && (
        <g data-layer="equipotentials">
          {equipotentials.map((contour, idx) => {
            const d = contour.segments
              .map((seg) => {
                const p1 = worldToDesign(seg.x1, seg.y1, sceneScale)
                const p2 = worldToDesign(seg.x2, seg.y2, sceneScale)
                return `M ${p1.px.toFixed(1)},${p1.py.toFixed(1)} L ${p2.px.toFixed(1)},${p2.py.toFixed(1)}`
              })
              .join(' ')
            return (
              <path
                key={`eq-${idx}`}
                d={d}
                fill="none"
                stroke={PHYSICS_COLORS.potentialEnergy}
                strokeWidth={1.2}
                strokeDasharray="4,3"
                opacity={contour.opacity}
              />
            )
          })}
        </g>
      )}

      {/* 2. 电场线图层 */}
      {showFieldLines && (
        <g data-layer="field-lines">
          {fieldLines.map((line, idx) => {
            const d = line.points
              .map((pt, pIdx) => {
                const dp = worldToDesign(pt.x, pt.y, sceneScale)
                return `${pIdx === 0 ? 'M' : 'L'} ${dp.px.toFixed(1)},${dp.py.toFixed(1)}`
              })
              .join(' ')
            const arrowDesign = line.arrowPos
              ? worldToDesign(line.arrowPos.x, line.arrowPos.y, sceneScale)
              : null
            return (
              <g key={`fl-${idx}`}>
                <path
                  d={d}
                  fill="none"
                  stroke={PHYSICS_COLORS.electricFieldLine}
                  strokeWidth={1.4}
                  opacity={0.78}
                />
                {arrowDesign && line.arrowPos && (
                  <polygon
                    points="-5,-3.5 6,0 -5,3.5"
                    fill={PHYSICS_COLORS.electricFieldLine}
                    opacity={0.85}
                    transform={`translate(${arrowDesign.px.toFixed(1)}, ${arrowDesign.py.toFixed(1)}) rotate(${line.arrowPos.angleDeg.toFixed(1)})`}
                  />
                )}
              </g>
            )
          })}
        </g>
      )}

      {/* 3. 当前扫描对称轴高亮轨线 */}
      <g data-axis={axis === 0 ? 'connecting-line' : 'perpendicular-bisector'}>
        <line
          x1={axisStart.px}
          y1={axisStart.py}
          x2={axisEnd.px}
          y2={axisEnd.py}
          stroke={CHART_COLORS.equilibrium}
          strokeWidth={2}
          strokeDasharray="6,4"
          opacity={0.85}
        />
        <text
          x={axis === 0 ? axisEnd.px + 8 : origin.px - 10}
          y={axis === 0 ? origin.py - 8 : axisEnd.py - 6}
          fontSize={font(10)}
          fontWeight="bold"
          fill={CHART_COLORS.equilibrium}
          textAnchor={axis === 0 ? 'start' : 'end'}
        >
          {axis === 0 ? '连线 (x 轴)' : '中垂线 (y 轴)'}
        </text>
      </g>

      {/* 4. 对称轴特征点（中点 O 与同种电荷中垂线极大点） */}
      <circle cx={origin.px} cy={origin.py} r={3.5} fill={CHART_COLORS.equilibrium} />
      <text
        x={origin.px + 8}
        y={origin.py + 14}
        fontSize={font(10)}
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
      >
        O
      </text>

      {showBisectorExtrema && (
        <g data-layer="bisector-extrema">
          <circle cx={extTop.px} cy={extTop.py} r={4} fill={EM_COLORS.electricField} stroke={CANVAS_COLORS.white} strokeWidth={1} />
          <text
            x={extTop.px - 10}
            y={extTop.py + 3}
            fontSize={font(9.5)}
            fontWeight="bold"
            fill={EM_COLORS.electricField}
            textAnchor="end"
          >
            +0.71a (E极大)
          </text>
          <circle cx={extBot.px} cy={extBot.py} r={4} fill={EM_COLORS.electricField} stroke={CANVAS_COLORS.white} strokeWidth={1} />
          <text
            x={extBot.px - 10}
            y={extBot.py + 3}
            fontSize={font(9.5)}
            fontWeight="bold"
            fill={EM_COLORS.electricField}
            textAnchor="end"
          >
            −0.71a (E极大)
          </text>
        </g>
      )}

      {/* 5. 两个等量场源电荷 */}
      <Ball cx={c1.px} cy={c1.py} r={16} type="steel" chargeSign={q1C >= 0 ? '+' : '-'} />
      <text
        x={c1.px}
        y={c1.py + 30}
        fontSize={font(11)}
        fontWeight="bold"
        fill={q1C >= 0 ? EM_COLORS.positiveCharge : EM_COLORS.negativeCharge}
        textAnchor="middle"
      >
        {q1C >= 0 ? '+Q' : '−Q'}
      </text>

      <Ball cx={c2.px} cy={c2.py} r={16} type="steel" chargeSign={q2C >= 0 ? '+' : '-'} />
      <text
        x={c2.px}
        y={c2.py + 30}
        fontSize={font(11)}
        fontWeight="bold"
        fill={q2C >= 0 ? EM_COLORS.positiveCharge : EM_COLORS.negativeCharge}
        textAnchor="middle"
      >
        {q2C >= 0 ? '+Q' : '−Q'}
      </text>

      {/* 6. 沿轴移动的观测探针 P 与分/合场强矢量 */}
      {showVectors && (
        <g data-layer="probe-vectors">
          <g opacity={0.45}>
            <PhysicsVectorArrow
              originDesign={{ x: probe.px, y: probe.py }}
              vector={{ x: snapshot.point.E1x, y: snapshot.point.E1y }}
              type="electricField"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorThin}
            />
            <PhysicsVectorArrow
              originDesign={{ x: probe.px, y: probe.py }}
              vector={{ x: snapshot.point.E2x, y: snapshot.point.E2y }}
              type="electricField"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorThin}
            />
          </g>
          {snapshot.point.E > 1e-6 && (
            <PhysicsVectorArrow
              originDesign={{ x: probe.px, y: probe.py }}
              vector={{ x: snapshot.point.Ex, y: snapshot.point.Ey }}
              type="electricForce"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorMain}
              label="E合"
              labelPlacement="side"
              font={font}
            />
          )}
        </g>
      )}

      <Ball cx={probe.px} cy={probe.py} r={8} type="brassWeight" />
      <text
        x={axis === 0 ? probe.px : probe.px + 14}
        y={axis === 0 ? probe.py - 16 : probe.py + 4}
        fontSize={font(10)}
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
        textAnchor={axis === 0 ? 'middle' : 'start'}
      >
        P
      </text>

      {/* 左上角紧凑物理读数条 */}
      <g>
        <rect
          x={14}
          y={12}
          width={210}
          height={46}
          rx={6}
          fill={withAlpha(CANVAS_COLORS.objectFillNeutral, 0.9)}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={1}
        />
        <text x={24} y={31} fontSize={font(10.5)} fontWeight="bold" fill={CANVAS_COLORS.labelText}>
          {axis === 0 ? `x = ${snapshot.sCm.toFixed(2)} cm` : `y = ${snapshot.sCm.toFixed(2)} cm`}
          {' · '}
          E合 = {snapshot.eSignedMV.toFixed(2)} MV/m
        </text>
        <text x={24} y={49} fontSize={font(10)} fill={PHYSICS_COLORS.potentialEnergy}>
          电势 φ = {snapshot.phiMV.toFixed(2)} MV
        </text>
      </g>
    </g>
  )
}
