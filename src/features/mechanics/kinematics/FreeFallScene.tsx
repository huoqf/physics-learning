import { PhysicsVectorArrow, PhysicsGround, VectorDefs, Ball } from '@/components/Physics'
import { colors } from '@/theme/colors'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  STROKE,
  OPACITY,
  DASH,
  FONT,
  withAlpha,
} from '@/theme/physics'

import { VelocityTimeChart, SvgDataTable } from '@/components/Chart'
import type { ChartDataSeries } from '@/components/Chart'
import { RIPPLE_DURATION, RIPPLE_MAX_RADIUS, DATA_LAYOUT } from './freeFallConfig'
import type { MaterialA, MaterialB } from './freeFallConfig'
import type { SceneScale } from '@/scene'

// ─── 撞击波纹组件 ─────────────────────────────────────────────────────────────
interface RippleProps {
  x: number; y: number; color: string; startTime: number; currentTime: number
}

function ImpactRipple({ x, y, color, startTime, currentTime }: RippleProps) {
  const elapsed = currentTime - startTime
  if (elapsed < 0 || elapsed > RIPPLE_DURATION) return null
  const progress = elapsed / RIPPLE_DURATION
  const radius = RIPPLE_MAX_RADIUS * progress
  const opacity = 1 - progress
  return <circle cx={x} cy={y} r={radius} fill="none" stroke={color} strokeWidth={STROKE.reference} opacity={opacity * 0.6} />
}

// ─── 设计常量 ─────────────────────────────────────────────────────────────────
const DESIGN_WIDTH = 840
const DESIGN_HEIGHT = 650

// ─── 场景 Props ──────────────────────────────────────────────────────────────
export interface FreeFallSceneProps {
  layout: {
    stageWidth: number; dataX: number; dataWidth: number
    tubeLeft: number; tubeRight: number; tubeWidth: number
    tubeTop: number; tubeBottom: number; tubeHeight: number
    originY: number; groundY: number; stageHeight: number
    ballX: number; featherX: number
  }
  // 物体参数
  objectA: MaterialA; objectB: MaterialB
  matA: { mass: number; baseDragK: number; label: string }
  matB: { mass: number; baseDragK: number; label: string }
  pressure: number; g: number
  // 物理状态
  stateA: { v: number; y: number; fDrag: number; isLanded: boolean }
  stateB: { v: number; y: number; fDrag: number; isLanded: boolean; swayAngle: number; swayDx: number }
  effectiveVA: number; effectiveVB: number
  renderYA: number; renderYB: number
  // 显示控制
  showVectors: boolean; showGrid: boolean; showTimeSlices: boolean
  // 渲染数据
  timeSliceBlocks: Array<{ y: number; height: number; ratio: number | null; color: string; displacement: number }>
  flashPointsRenderA: React.ReactNode; flashPointsRenderB: React.ReactNode
  trailA: Array<{ x: number; y: number }>; trailB: Array<{ x: number; y: number }>
  flashPointsTableA: Array<{ t: number; v: number; y: number }>
  flashPointsTableB: Array<{ t: number; v: number; y: number }>
  // 波纹
  rippleA: { x: number; y: number; time: number } | null
  rippleB: { x: number; y: number; time: number } | null
  time: number
  // v-t 图
  vtXMax: number
  vtPointsA: Array<{ t: number; v: number }>; vtPointsB: Array<{ t: number; v: number }>
  vtDomainPointsA: Array<{ t: number; v: number }>; vtDomainPointsB: Array<{ t: number; v: number }>
  vtAdditionalSeries: ChartDataSeries[]
  // 场景缩放
  ffSceneScale: SceneScale
  // 标签
  tubeLabel: string
}

export function FreeFallScene({
  layout, objectA, objectB, matA, matB, pressure, g,
  stateA, stateB, effectiveVA, effectiveVB, renderYA, renderYB,
  showVectors,
  timeSliceBlocks, flashPointsRenderA, flashPointsRenderB,
  trailA, trailB, flashPointsTableA, flashPointsTableB,
  rippleA, rippleB, time,
  vtXMax,
  vtPointsA, vtDomainPointsA,
  vtAdditionalSeries, ffSceneScale, tubeLabel,
}: FreeFallSceneProps) {
  const {
    tubeLeft, tubeRight, tubeWidth, tubeTop, tubeBottom, tubeHeight,
    originY, groundY, dataX, dataWidth, ballX, featherX,
  } = layout
  const { swayDx } = stateB

  return (
    <div className="w-full h-full">
      <svg viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full bg-white rounded-lg shadow-inner">
        <defs>
          <linearGradient id="glass-tube-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.glassGrad[0]} stopOpacity="0.25" />
            <stop offset="5%" stopColor={SCENE_COLORS.materials.glassGrad[1]} stopOpacity="0.1" />
            <stop offset="15%" stopColor={SCENE_COLORS.materials.glassGrad[2]} stopOpacity="0.05" />
            <stop offset="50%" stopColor={SCENE_COLORS.materials.glassGrad[2]} stopOpacity="0.0" />
            <stop offset="85%" stopColor={SCENE_COLORS.materials.glassGrad[2]} stopOpacity="0.05" />
            <stop offset="95%" stopColor={SCENE_COLORS.materials.glassGrad[1]} stopOpacity="0.1" />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.glassGrad[0]} stopOpacity="0.25" />
          </linearGradient>
          <radialGradient id="coin-grad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor={SCENE_COLORS.magnet.northLight} />
            <stop offset="25%" stopColor={SCENE_COLORS.magnet.northBase} />
            <stop offset="70%" stopColor={SCENE_COLORS.magnet.northMid} />
            <stop offset="100%" stopColor={SCENE_COLORS.magnet.northShadow} />
          </radialGradient>
          <VectorDefs colors={[PHYSICS_COLORS.acceleration, PHYSICS_COLORS.forceNet, CHART_COLORS.compareB]} />
        </defs>

        {/* 牛顿管 */}
        <rect x={tubeLeft} y={tubeTop} width={tubeWidth} height={tubeHeight}
          fill="url(#glass-tube-grad)" stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.objectLine} rx={8} opacity={0.7} />
        <rect x={tubeLeft + 1.5} y={tubeTop + 1.5} width={tubeWidth - 3} height={tubeHeight - 3}
          fill="none" stroke={colors.neutral.white} strokeWidth={1} rx={7} opacity={0.3} />
        <line x1={tubeLeft + 4} y1={tubeTop + 8} x2={tubeLeft + 4} y2={tubeBottom - 8}
          stroke={colors.neutral.white} strokeWidth={2} strokeLinecap="round" opacity={0.25} />

        <text x={tubeLeft + tubeWidth / 2} y={tubeTop - 25} fontSize={FONT.axis}
          fill={pressure <= 0.01 ? CANVAS_COLORS.annotation : PHYSICS_COLORS.labelText}
          textAnchor="middle" fontWeight="600" opacity={0.7}>{tubeLabel}</text>
        <text x={ballX} y={originY - 18} fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} textAnchor="middle" fontWeight="bold">{matA.label}</text>
        <text x={featherX} y={originY - 18} fontSize={FONT.small} fill={CHART_COLORS.compareB} textAnchor="middle" fontWeight="bold">{matB.label}</text>

        <PhysicsGround x={tubeLeft + 10} y={groundY} width={tubeRight - tubeLeft - 20}
          appearance={{ color: withAlpha(SCENE_COLORS.materials.structFill, 0.5) }} />

        <line x1={ballX} y1={originY - 20} x2={ballX} y2={groundY + 20}
          stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} strokeDasharray={DASH.axis.join(' ')} opacity={0.3} />
        <line x1={featherX} y1={originY - 20} x2={featherX} y2={groundY + 20}
          stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} strokeDasharray={DASH.axis.join(' ')} opacity={0.2} />
        <text x={tubeLeft - 5} y={originY} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis} textAnchor="end">y=0</text>
        <text x={tubeLeft - 5} y={groundY} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis} textAnchor="end">y=h</text>

        {/* 时间切片 */}
        {timeSliceBlocks.map((block, i) => (
          <g key={`slice-${i}`}>
            <rect x={ballX - 24} y={block.y} width={48} height={block.height}
              fill={block.color} opacity={0.12} stroke={block.color}
              strokeWidth={STROKE.reference} strokeOpacity={0.5} rx={2} />
            {block.ratio !== null && (
              <text x={ballX + 32} y={block.y + block.height / 2 + 4}
                fontSize={FONT.small} fill={block.color} fontWeight="bold" textAnchor="middle">{block.ratio}</text>
            )}
            <text x={ballX + 32} y={block.y + block.height / 2 + (block.ratio !== null ? 16 : 4)}
              fontSize={FONT.small} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">{block.displacement.toFixed(2)}m</text>
          </g>
        ))}

        {flashPointsRenderA}
        {flashPointsRenderB}

        {/* 轨迹线 */}
        {trailA.length >= 2 && (
          <polyline points={trailA.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke={PHYSICS_COLORS.velocity} strokeWidth={STROKE.trackHistory}
            opacity={OPACITY.trackHistory} strokeDasharray={DASH.trackHistory.join(' ')} />
        )}
        {trailB.length >= 2 && (
          <polyline points={trailB.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke={CHART_COLORS.compareB} strokeWidth={STROKE.trackHistory}
            opacity={OPACITY.trackHistory} strokeDasharray={DASH.trackHistory.join(' ')} />
        )}

        {/* 物体A */}
        {objectA === 'ironBall' ? (
          <Ball cx={ballX} cy={renderYA} r={14} type="steel" strokeWidth={STROKE.objectLine} />
        ) : (
          <g transform={`translate(${ballX}, ${renderYA})`}>
            <circle cx={0} cy={1.5} r={13.5} fill={SCENE_COLORS.magnet.northShadow} />
            <circle cx={0} cy={0} r={13.5} fill="url(#coin-grad)" stroke={SCENE_COLORS.magnet.northMid} strokeWidth={STROKE.objectThin} />
            <circle cx={0} cy={0} r={10} fill="none" stroke={SCENE_COLORS.magnet.northLight} strokeWidth={0.5} strokeDasharray="3 2" opacity={0.6} />
          </g>
        )}

        {/* 物体B */}
        <g transform={`translate(${featherX + swayDx}, ${renderYB}) rotate(${(stateB.swayAngle * 180) / Math.PI})`}>
          {objectB === 'feather' ? (
            <g>
              <path d="M 0,-16 C -6,-8 -8,4 -3,14 L 0,11 C -3,2 -3,-8 0,-16" fill={CHART_COLORS.highlight} opacity={0.4} />
              <path d="M 0,-16 C 6,-8 8,4 3,14 L 0,11 C 3,2 3,-8 0,-16" fill={CHART_COLORS.highlight} opacity={0.4} />
              <line x1={0} y1={-16} x2={0} y2={16} stroke={CHART_COLORS.compareB} strokeWidth={1.5} strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <rect x={-10} y={-4} width={20} height={8} fill={withAlpha(colors.warning[500], 0.15)}
                stroke={CHART_COLORS.compareB} strokeWidth={STROKE.objectLine} rx={1} />
              <line x1={-10} y1={0} x2={10} y2={0} stroke={CHART_COLORS.compareB} strokeWidth={0.5} opacity={0.6} />
            </g>
          )}
        </g>

        {/* 重力矢量 */}
        {showVectors && !stateA.isLanded && (
          <g>
            <PhysicsVectorArrow originDesign={{ x: ballX - 28, y: renderYA }} vector={{ x: 0, y: -g }}
              type="gravity" sceneScale={ffSceneScale} strokeWidth={STROKE.vectorMain} />
            <text x={ballX - 40} y={Math.min(renderYA + ffSceneScale.maxVectorLength * 0.5, groundY - 10)}
              fontSize={FONT.small} fill={PHYSICS_COLORS.gravity} fontWeight="bold">g</text>
            {g > 9.8 && (
              <text x={ballX - 40} y={Math.min(renderYA + ffSceneScale.maxVectorLength * 0.5, groundY - 10) + 10}
                fontSize={FONT.small} fill={PHYSICS_COLORS.gravity} fontWeight="bold" opacity={0.7}>▲max</text>
            )}
          </g>
        )}
        {showVectors && !stateB.isLanded && (
          <g transform={`translate(${swayDx}, 0)`}>
            <PhysicsVectorArrow originDesign={{ x: featherX - 28, y: renderYB }} vector={{ x: 0, y: -g }}
              type="gravity" sceneScale={ffSceneScale} strokeWidth={STROKE.vectorMain} />
            <text x={featherX - 40} y={Math.min(renderYB + ffSceneScale.maxVectorLength * 0.5, groundY - 10)}
              fontSize={FONT.small} fill={PHYSICS_COLORS.gravity} fontWeight="bold">g</text>
            {g > 9.8 && (
              <text x={featherX - 40} y={Math.min(renderYB + ffSceneScale.maxVectorLength * 0.5, groundY - 10) + 10}
                fontSize={FONT.small} fill={PHYSICS_COLORS.gravity} fontWeight="bold" opacity={0.7}>▲max</text>
            )}
          </g>
        )}

        {/* 空气阻力矢量 */}
        {showVectors && !stateA.isLanded && stateA.fDrag > 0.001 && (
          <g>
            <PhysicsVectorArrow originDesign={{ x: ballX + 18, y: renderYA }} vector={{ x: 0, y: stateA.fDrag }}
              type="forceComponent" sceneScale={ffSceneScale} strokeWidth={STROKE.vectorSub} />
            <text x={ballX + 28} y={Math.max(renderYA - ffSceneScale.maxVectorLength * 0.2, originY + 5)}
              fontSize={FONT.small} fill={PHYSICS_COLORS.airResistance} fontWeight="bold">f</text>
          </g>
        )}
        {showVectors && !stateB.isLanded && stateB.fDrag > 0.001 && (
          <g transform={`translate(${swayDx}, 0)`}>
            <PhysicsVectorArrow originDesign={{ x: featherX + 16, y: renderYB }} vector={{ x: 0, y: stateB.fDrag }}
              type="force" sceneScale={ffSceneScale} color={CHART_COLORS.compareB} strokeWidth={STROKE.vectorSub} />
            <text x={featherX + 26} y={Math.max(renderYB - ffSceneScale.maxVectorLength * 0.2, originY + 5)}
              fontSize={FONT.small} fill={CHART_COLORS.compareB} fontWeight="bold">f'</text>
          </g>
        )}

        {/* 速度矢量 */}
        {showVectors && !stateA.isLanded && Math.abs(effectiveVA) > 0.1 && (
          <g>
            <PhysicsVectorArrow originDesign={{ x: ballX + 28, y: renderYA }} vector={{ x: 0, y: -effectiveVA }}
              type="velocity" sceneScale={ffSceneScale} strokeWidth={STROKE.vectorMain} />
            <text x={ballX + 38} y={renderYA + 16} fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
          </g>
        )}
        {showVectors && !stateB.isLanded && Math.abs(effectiveVB) > 0.1 && (
          <g transform={`translate(${swayDx}, 0)`}>
            <PhysicsVectorArrow originDesign={{ x: featherX + 28, y: renderYB }} vector={{ x: 0, y: -effectiveVB }}
              type="velocity" sceneScale={ffSceneScale} strokeWidth={STROKE.vectorMain} />
            <text x={featherX + 38} y={renderYB + 16} fontSize={FONT.small} fill={CHART_COLORS.compareB} fontWeight="bold">v'</text>
          </g>
        )}

        {/* 落地标注 */}
        {stateA.isLanded && <text x={ballX} y={groundY - 40} fontSize={FONT.small} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">{matA.label}落地</text>}
        {stateB.isLanded && <text x={featherX + swayDx} y={groundY - 40} fontSize={FONT.small} fill={CHART_COLORS.compareB} textAnchor="middle" fontWeight="bold">{matB.label}落地</text>}

        {/* 撞击波纹 */}
        {rippleA && <ImpactRipple x={rippleA.x} y={rippleA.y} color={PHYSICS_COLORS.velocity} startTime={rippleA.time} currentTime={time} />}
        {rippleB && <ImpactRipple x={rippleB.x} y={rippleB.y} color={CHART_COLORS.compareB} startTime={rippleB.time} currentTime={time} />}

        {/* 右侧数据区 */}
        <SvgDataTable
          x={dataX} y={DATA_LAYOUT.tableY}
          width={dataWidth}
          title="频闪数据记录表"
          data={flashPointsTableA}
          maxRows={5}
          columns={[
            { key: 't', label: 't(s)', width: 0.12, format: (r) => r.t.toFixed(1) },
            { key: 'vA', label: 'v_A(m/s)', width: 0.26,
              format: (_r, i) => flashPointsTableA[i]?.v.toFixed(2) ?? '-' },
            { key: 'vB', label: 'v_B(m/s)', width: 0.24,
              format: (_r, i) => flashPointsTableB[i]?.v.toFixed(2) ?? '-' },
            { key: 'yA', label: 'y_A(m)', width: 0.23, format: (r) => r.y.toFixed(3) },
          ]}
        />

        {/* v-t 图（固定尺寸模式，直接嵌入 SVG <g>） */}
        <g transform={`translate(${dataX}, ${DATA_LAYOUT.chartY})`}>
          <VelocityTimeChart
            fixedSize={{ width: dataWidth, height: DATA_LAYOUT.chartH }}
            points={vtPointsA} domainPoints={vtDomainPointsA}
            currentTime={Math.min(time, vtXMax)} tMax={vtXMax}
            title="速度－时间图像 (v-t 图)" showArea series="primary"
            additionalSeries={vtAdditionalSeries} showGrid />
        </g>

        {/* 底部实时标注（环境状态已移至右侧屏，不重复显示） */}
        <text x={dataX + 8} y={DATA_LAYOUT.labelY} fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} fontFamily="monospace" fontWeight="bold">
          v{matA.label === '铁球' ? '球' : '币'} = {effectiveVA.toFixed(2)} m/s
        </text>
        <text x={dataX + dataWidth * 0.35} y={DATA_LAYOUT.labelY} fontSize={FONT.small} fill={CHART_COLORS.compareB} fontFamily="monospace" fontWeight="bold">
          v{matB.label === '羽毛' ? '羽' : '纸'} = {effectiveVB.toFixed(2)} m/s
        </text>
        <text x={dataX + dataWidth * 0.65} y={DATA_LAYOUT.labelY} fontSize={FONT.small} fill={PHYSICS_COLORS.labelTextLight} fontFamily="monospace">
          f'_air = {stateB.fDrag.toFixed(4)} N
        </text>
        <text x={dataX + dataWidth * 0.85} y={DATA_LAYOUT.labelY} fontSize={FONT.small} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">
          t = {time.toFixed(2)} s
        </text>
      </svg>
    </div>
  )
}
