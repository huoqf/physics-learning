import React, { useRef } from 'react'
import { calculateLenzsLaw } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { VectorArrow, Solenoid, Galvanometer, BarMagnet, ParametricMagneticField } from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { layoutLabels } from '@/utils'

interface LenzsLawCanvasProps {
  magnetY: number
  velocity: number
  isDragging: boolean
  lenzResult: ReturnType<typeof calculateLenzsLaw>
  fluxIntensity: number
  time: number
  isPlaying: boolean
  currentStep: number
  magnetPole: number
  coilN: number
  showLines: number
  showEquivalentPoles: number
  handleDragStart: (yDesign: number) => void
  handleDragMove: (yDesign: number) => void
  handleDragEnd: () => void
  canvasSize: { width: number; height: number; font: (size: number) => number }
  vpScale: number
}

// 设计尺寸与固定布局中心
const DESIGN_WIDTH = 700
const DESIGN_HEIGHT = 400
const cx = 350
const coilY = 240

// 灵敏电流计中心坐标
const galX = 130
const galY = 250

export const LenzsLawCanvas: React.FC<LenzsLawCanvasProps> = ({
  magnetY,
  velocity,
  isDragging,
  lenzResult,
  time,
  isPlaying,
  currentStep,
  magnetPole,
  coilN,
  showLines,
  showEquivalentPoles,
  handleDragStart,
  handleDragMove,
  handleDragEnd,
  canvasSize,
  vpScale,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const font = canvasSize.font

  const isDown = lenzResult.originalFieldDirection === 'down'

  // 受力方向：repulsion (排斥) 则向上推 (-1)，attraction (吸引) 则向下拉 (+1)
  const forceDirection = lenzResult.forceType === 'repulsion' ? -1 : (lenzResult.forceType === 'attraction' ? 1 : 0)
  const forceArrowLength = 15 + Math.min(45, Math.abs(velocity) * 12)

  // 步骤透明度控制
  const getOpacity = (allowedSteps: number[]) => {
    if (currentStep === 0) return 1.0
    return allowedSteps.includes(currentStep) ? 1.0 : 0.08
  }

  const labelFontSize = font(11)

  // 1. 右上角状态监控面板文字避让计算
  const monitorLabels = [
    {
      x: 85,
      y: 22,
      text: isDragging
        ? velocity < 0
          ? magnetPole > 0 ? 'N极靠近 (拖拽)' : 'S极靠近 (拖拽)'
          : magnetPole > 0 ? 'N极远离 (拖拽)' : 'S极远离 (拖拽)'
        : lenzResult.currentAction,
      fontSize: font(12),
      anchor: 'middle' as const,
      priority: 2,
    },
    {
      x: 85,
      y: 42,
      text: `磁通量：${lenzResult.fluxChange === 'increasing' ? '正在增加' : (lenzResult.fluxChange === 'decreasing' ? '正在减少' : '保持不变')}`,
      fontSize: labelFontSize,
      anchor: 'middle' as const,
      priority: 1,
    },
    {
      x: 85,
      y: 60,
      text: `原/感磁场：${lenzResult.fluxChange === 'stable' ? '无' : (lenzResult.fluxChange === 'increasing' ? '反向阻碍' : '同向阻碍')}`,
      fontSize: labelFontSize,
      anchor: 'middle' as const,
      priority: 0,
    },
  ]
  const resolvedMonitorPos = layoutLabels(monitorLabels, { padding: 3 })

  // 2. 磁体与等效磁极动态说明文字的避让计算
  const labelsToLayout: import('@/data/quantities/types').PhysicsQuantity extends any ? any : any[] = []

  const hasForceText = forceDirection !== 0 && getOpacity([4]) === 1.0
  const forceTextY = magnetY + 35 + forceDirection * (forceArrowLength / 2) + 4
  if (hasForceText) {
    labelsToLayout.push({
      id: 'force',
      x: cx + 12,
      y: forceTextY,
      text: lenzResult.forceType === 'repulsion' ? '排斥力' : '吸引力',
      fontSize: labelFontSize,
      anchor: 'start' as const,
      priority: 1,
    })
  }

  const hasEquivalentPolesText = showEquivalentPoles === 1 && lenzResult.fluxChange !== 'stable' && lenzResult.equivalentPole && getOpacity([4]) === 1.0
  if (hasEquivalentPolesText && lenzResult.equivalentPole) {
    labelsToLayout.push({
      id: 'upperPole',
      x: cx - 20,
      y: coilY - 61,
      text: `等效${lenzResult.equivalentPole}极`,
      fontSize: labelFontSize,
      anchor: 'end' as const,
      priority: 2,
    })
    labelsToLayout.push({
      id: 'lowerPole',
      x: cx - 20,
      y: coilY + 69,
      text: `等效${lenzResult.equivalentPole === 'N' ? 'S' : 'N'}极`,
      fontSize: labelFontSize,
      anchor: 'end' as const,
      priority: 2,
    })
  }

  const resolvedPositions = layoutLabels(labelsToLayout, {
    bounds: { left: 0, right: DESIGN_WIDTH, top: 0, bottom: DESIGN_HEIGHT },
    padding: 6,
  })

  let forcePos = { x: cx + 12, y: forceTextY }
  let upperPoleTextPos = { x: cx - 20, y: coilY - 61 }
  let lowerPoleTextPos = { x: cx - 20, y: coilY + 69 }

  let layoutIdx = 0
  if (hasForceText) {
    forcePos = resolvedPositions[layoutIdx]
    layoutIdx++
  }
  if (hasEquivalentPolesText) {
    upperPoleTextPos = resolvedPositions[layoutIdx]
    layoutIdx++
    lowerPoleTextPos = resolvedPositions[layoutIdx]
    layoutIdx++
  }

  const clientToDesignY = (e: React.PointerEvent) => {
    const svg = svgRef.current
    if (!svg) return 0
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return 0
    return pt.matrixTransform(ctm.inverse()).y
  }

  const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    if (isPlaying) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const yDesign = clientToDesignY(e)
    handleDragStart(yDesign)
  }

  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!isDragging) return
    const yDesign = clientToDesignY(e)
    handleDragMove(yDesign)
  }

  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // 防止异常
    }
    handleDragEnd()
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className="bg-white rounded-lg shadow-inner w-full h-full"
      data-scale={vpScale}
    >
      <defs>
        <marker
          id="arrow-current"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={PHYSICS_COLORS.currentDirection} />
        </marker>
      </defs>

      {/* --- 1. 灵敏电流计 --- */}
      <g opacity={getOpacity([4])} className="transition-opacity duration-300">
        <path
          d={`M 230 190 C 180 190, 105 250, 105 332`}
          fill="none"
          stroke={PHYSICS_COLORS.labelTextLight}
          strokeWidth="2.5"
        />
        <path
          d={`M 230 290 C 180 290, 155 290, 155 332`}
          fill="none"
          stroke={PHYSICS_COLORS.labelTextLight}
          strokeWidth="2.5"
        />

        {lenzResult.fluxChange !== 'stable' && (
          <>
            <path
              d={`M 230 190 C 180 190, 105 250, 105 332`}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth="2.5"
              strokeDasharray="6 6"
              strokeDashoffset={time * -30}
            />
            <path
              d={`M 230 290 C 180 290, 155 290, 155 332`}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth="2.5"
              strokeDasharray="6 6"
              strokeDashoffset={time * -30}
            />
          </>
        )}

        <Galvanometer
          x={galX}
          y={galY}
          value={velocity === 0 ? 0 : (lenzResult.inducedCurrentDirection === 'counterclockwise' ? 1 : -1) * Math.min(1, Math.abs(velocity) * 0.45)}
          width={100}
          height={90}
        />
      </g>

      {/* --- 2. 螺线管线圈 (纵向放置) --- */}
      <g transform={`translate(${cx}, ${coilY}) rotate(90)`} opacity={getOpacity([4])} className="transition-opacity duration-300">
        <Solenoid
          x={0}
          y={0}
          width={100}
          height={140}
          turns={coilN}
          current={velocity === 0 ? 0 : (lenzResult.inducedCurrentDirection === 'counterclockwise' ? -1 : 1) * Math.min(1.5, Math.abs(velocity) * 0.5)}
          time={time}
          showIronCore={false}
          animated={currentStep === 0 || currentStep === 4}
        />
        <text
          x={20}
          y={-60}
          transform="rotate(-90)"
          fill={PHYSICS_COLORS.labelText}
          fontWeight={CANVAS_STYLE.font.labelWeight}
          fontSize={font(11)}
        >
          N={coilN}
        </text>
      </g>

      {/* --- 3. 磁铁主体与参数化原磁场线 (处于同一坐标系下以杜绝漂移错位) --- */}
      <g
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ cursor: isPlaying ? 'default' : (isDragging ? 'grabbing' : 'grab') }}
        className="select-none"
      >
        <g transform={`translate(${cx}, ${magnetY}) rotate(90)`}>
          <BarMagnet
            width={70}
            height={50}
            pole={magnetPole as 1 | -1}
          />
          {showLines === 1 && (
            <g opacity={getOpacity([1, 2])} className="transition-opacity duration-300">
              <ParametricMagneticField
                w={70}
                h={50}
                pole={magnetPole as 1 | -1}
                canvasHeight={400}
              />
            </g>
          )}
        </g>

        {/* 排斥力/吸引力分析 (力作用点跟随磁铁) */}
        {forceDirection !== 0 && (
          <g opacity={getOpacity([4])} className="transition-opacity duration-300">
            <VectorArrow
              origin={{ x: cx, y: magnetY + 35 }}
              vector={{ x: 0, y: forceDirection > 0 ? 1 : -1 }}
              type="lorentzForce"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={forceArrowLength}
            />
            <text
              x={forcePos.x}
              y={forcePos.y}
              fill={PHYSICS_COLORS.lorentzForce}
              fontWeight={CANVAS_STYLE.font.labelWeight}
              fontSize={labelFontSize}
            >
              {lenzResult.forceType === 'repulsion' ? '排斥力' : '吸引力'}
            </text>
          </g>
        )}
      </g>

      {/* --- 4. 步骤一高亮指示的 B原 矢量 --- */}
      {currentStep === 1 && (
        <g opacity={getOpacity([1])} className="transition-opacity duration-300">
          <VectorArrow
            origin={{ x: cx, y: isDown ? magnetY + 35 : coilY }}
            vector={{ x: 0, y: isDown ? -1 : 1 }}
            type="magneticField"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={Math.abs(coilY - (magnetY + 35))}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            color={PHYSICS_COLORS.magneticField}
            glow={true}
            label="B原"
            font={font}
          />
        </g>
      )}

      {/* --- 5. 磁通量变化辅助框 --- */}
      {currentStep === 2 && (
        <g transform={`translate(${cx + 90}, ${coilY - 80})`} className="animate-fade-in">
          <rect
            width="120"
            height="50"
            rx="6"
            fill={colors.accent[100]}
            stroke={colors.accent[500]}
            strokeWidth="1.5"
            style={{ filter: `drop-shadow(0px 2px 4px ${withAlpha(colors.neutral[900], 0.1)})` }}
          />
          <text x="60" y="22" textAnchor="middle" fill={colors.accent[700]} fontSize={font(12)} fontWeight="bold">
            磁通量 Φ
          </text>
          <text
            x="60"
            y="40"
            textAnchor="middle"
            fill={lenzResult.fluxChange === 'increasing' ? colors.danger[600] : (lenzResult.fluxChange === 'decreasing' ? colors.primary[600] : colors.neutral[500])}
            fontSize={font(13)}
            fontWeight="bold"
          >
            {lenzResult.fluxChange === 'increasing' ? '正在增加 (↑)' : (lenzResult.fluxChange === 'decreasing' ? '正在减少 (↓)' : '保持不变')}
          </text>
        </g>
      )}

      {/* --- 6. 感应磁场线 B感 --- */}
      {lenzResult.fluxChange !== 'stable' && [-45, 0, 45].map((dx, i) => {
        const isUp = lenzResult.inducedFieldDirection === 'up'
        const indY1 = isUp ? coilY + 50 : coilY - 50
        const indY2 = isUp ? coilY - 50 : coilY + 50

        const baseOpacity = getOpacity([3])
        const finalOpacity = baseOpacity < 0.2 ? baseOpacity : 0.9

        return (
          <g key={`ind-${i}`} opacity={finalOpacity} className="transition-opacity duration-300">
            <VectorArrow
              origin={{ x: cx + dx, y: indY1 }}
              vector={{ x: 0, y: isUp ? 1 : -1 }}
              type="magneticField"
              color={PHYSICS_COLORS.lorentzForce} // 洛伦兹紫表示感应磁场，增强与原磁场绿色的对比，并符合语义 token 隔离
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={Math.abs(indY2 - indY1)}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              glow={currentStep === 3 && i === 1}
              label={currentStep === 3 && i === 1 ? 'B感' : undefined}
              font={font}
            />
          </g>
        )
      })}

      {/* --- 7. 电流方向大箭头与指示牌 --- */}
      {lenzResult.fluxChange !== 'stable' && (
        <g opacity={getOpacity([4])} className="transition-opacity duration-300">
          <path
            d={lenzResult.inducedCurrentDirection === 'counterclockwise'
              ? `M ${cx + 35} ${coilY + 80} L ${cx - 35} ${coilY + 80}`
              : `M ${cx - 35} ${coilY + 80} L ${cx + 35} ${coilY + 80}`
            }
            fill="none"
            stroke={PHYSICS_COLORS.currentDirection}
            strokeWidth="3.5"
            markerEnd="url(#arrow-current)"
          />
          <g transform={`translate(${cx + 90}, ${coilY + 30})`}>
            <rect width="115" height="30" rx="4" fill={colors.danger[100]} stroke={colors.danger[500]} strokeWidth="1.2" />
            <text x="57" y="19" textAnchor="middle" fill={colors.danger[700]} fontSize={font(11)} fontWeight="bold">
              {lenzResult.inducedCurrentDirection === 'counterclockwise' ? 'I感: 逆时针 (←)' : 'I感: 顺时针 (→)'}
            </text>
          </g>
        </g>
      )}

      {/* --- 8. 等效磁极可视化 (来拒去留) --- */}
      {showEquivalentPoles === 1 && lenzResult.fluxChange !== 'stable' && lenzResult.equivalentPole && (
        <g opacity={getOpacity([4])} className="transition-opacity duration-300">
          {/* 上等效极 */}
          <circle
            cx={cx}
            cy={coilY - 65}
            r="13"
            fill={lenzResult.equivalentPole === 'N' ? PHYSICS_COLORS.magnetNorth : PHYSICS_COLORS.magnetSouth}
            stroke={colors.neutral.white}
            strokeWidth="1.5"
            style={{ filter: `drop-shadow(0px 0px 4px ${withAlpha(colors.neutral[900], 0.2)})` }}
          />
          <text
            x={cx}
            y={coilY - 61}
            textAnchor="middle"
            fill={colors.neutral.white}
            fontWeight="bold"
            fontSize={font(12)}
          >
            {lenzResult.equivalentPole}
          </text>
          <text
            x={upperPoleTextPos.x}
            y={upperPoleTextPos.y}
            textAnchor="end"
            fill={lenzResult.equivalentPole === 'N' ? PHYSICS_COLORS.magnetNorth : PHYSICS_COLORS.magnetSouth}
            fontWeight="bold"
            fontSize={labelFontSize}
          >
            等效{lenzResult.equivalentPole}极
          </text>

          {/* 下等效极 */}
          <circle
            cx={cx}
            cy={coilY + 65}
            r="13"
            fill={lenzResult.equivalentPole === 'N' ? PHYSICS_COLORS.magnetSouth : PHYSICS_COLORS.magnetNorth}
            stroke={colors.neutral.white}
            strokeWidth="1.5"
            style={{ filter: `drop-shadow(0px 0px 4px ${withAlpha(colors.neutral[900], 0.2)})` }}
          />
          <text
            x={cx}
            y={coilY + 69}
            textAnchor="middle"
            fill={colors.neutral.white}
            fontWeight="bold"
            fontSize={font(12)}
          >
            {lenzResult.equivalentPole === 'N' ? 'S' : 'N'}
          </text>
          <text
            x={lowerPoleTextPos.x}
            y={lowerPoleTextPos.y}
            textAnchor="end"
            fill={lenzResult.equivalentPole === 'N' ? PHYSICS_COLORS.magnetSouth : PHYSICS_COLORS.magnetNorth}
            fontWeight="bold"
            fontSize={labelFontSize}
          >
            等效{lenzResult.equivalentPole === 'N' ? 'S' : 'N'}极
          </text>
        </g>
      )}

      {/* 磁铁与力分析已移至上方，以解决属性覆盖导致的错位问题 */}

      {/* --- 10. 实时状态监控面板 (右上角避让摆放，防止与磁铁磁感应线重叠) --- */}
      <g transform="translate(500, 30)">
        {/* 第一步：当前动作 */}
        <text
          x={resolvedMonitorPos[0].x}
          y={resolvedMonitorPos[0].y}
          textAnchor="middle"
          fill={PHYSICS_COLORS.labelText}
          fontSize={font(12)}
          fontWeight="bold"
          opacity={getOpacity([1])}
          className="transition-opacity duration-300"
        >
          {isDragging
            ? velocity < 0
              ? magnetPole > 0 ? 'N极靠近 (拖拽)' : 'S极靠近 (拖拽)'
              : magnetPole > 0 ? 'N极远离 (拖拽)' : 'S极远离 (拖拽)'
            : lenzResult.currentAction}
        </text>

        {/* 第二步：磁通量状态 */}
        <text
          x={resolvedMonitorPos[1].x}
          y={resolvedMonitorPos[1].y}
          textAnchor="middle"
          fill={PHYSICS_COLORS.labelText}
          fontSize={font(11)}
          opacity={getOpacity([2])}
          className="transition-opacity duration-300"
        >
          磁通量：{lenzResult.fluxChange === 'increasing' ? '正在增加' : (lenzResult.fluxChange === 'decreasing' ? '正在减少' : '保持不变')}
        </text>

        {/* 第三步：原/感磁场阻碍关系 */}
        <text
          x={resolvedMonitorPos[2].x}
          y={resolvedMonitorPos[2].y}
          textAnchor="middle"
          fill={lenzResult.fluxChange !== 'stable' ? PHYSICS_COLORS.magneticField : PHYSICS_COLORS.trackHistory}
          fontSize={font(11)}
          fontWeight="bold"
          opacity={getOpacity([3])}
          className="transition-opacity duration-300"
        >
          原/感磁场：{lenzResult.fluxChange === 'stable' ? '无' : (lenzResult.fluxChange === 'increasing' ? '反向阻碍' : '同向阻碍')}
        </text>
      </g>
    </svg>
  )
}
