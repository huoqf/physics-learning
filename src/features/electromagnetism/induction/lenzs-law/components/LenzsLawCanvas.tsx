import React from 'react'
import type { calculateLenzsLaw } from '@/physics'
import { PHYSICS_COLORS, CANVAS_COLORS, CANVAS_STYLE, withAlpha } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { VectorArrow, Solenoid, BarMagnet, ParametricMagneticField } from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { layoutLabels, type LabelSlot } from '@/utils'
import { coilY } from '../hooks/useLenzsLaw'
import { GalvanometerWiring } from './GalvanometerWiring'
import { StatusMonitorPanel } from './StatusMonitorPanel'
import { HandRulePanel } from './HandRulePanel'
import { EquivalentPolesOverlay } from './EquivalentPolesOverlay'

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
  showHandRule: number
  handleDragStart: (yDesign: number) => void
  handleDragMove: (yDesign: number) => void
  handleDragEnd: () => void
  font: (size: number) => number
  getSvgPoint: (clientX: number, clientY: number) => { x: number; y: number } | null
}

// 设计尺寸与固定布局中心（与 CANVAS_PRESETS.full 一致）
const { width: DESIGN_WIDTH, height: DESIGN_HEIGHT } = CANVAS_PRESETS.full
const cx = DESIGN_WIDTH / 2

// 灵敏电流计中心坐标 (优化至与线圈水平对齐，舒展构图)
const galX = 150
const galY = 410

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
  showHandRule,
  handleDragStart,
  handleDragMove,
  handleDragEnd,
  font,
  getSvgPoint,
}) => {
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
  const labelsToLayout: (LabelSlot & { id: string })[] = []

  const hasForceText = forceDirection !== 0 && getOpacity([4]) === 1.0
  const forceTextY = magnetY + 50 + forceDirection * (forceArrowLength / 2) + 4
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
      y: coilY - 81,
      text: `等效${lenzResult.equivalentPole}极`,
      fontSize: labelFontSize,
      anchor: 'end' as const,
      priority: 2,
    })
    labelsToLayout.push({
      id: 'lowerPole',
      x: cx - 20,
      y: coilY + 89,
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
  let upperPoleTextPos = { x: cx - 20, y: coilY - 81 }
  let lowerPoleTextPos = { x: cx - 20, y: coilY + 89 }

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

  const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    if (isPlaying) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = getSvgPoint(e.clientX, e.clientY)
    if (pt) handleDragStart(pt.y)
  }

  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!isDragging) return
    const pt = getSvgPoint(e.clientX, e.clientY)
    if (pt) handleDragMove(pt.y)
  }

  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // 防止异常
    }
    handleDragEnd()
  }

  // 螺线管引脚与电流计接线柱的参数化解算 (充盈 650 视口)
  const solTopPin = { x: cx - 120, y: coilY - 70 }
  const solBotPin = { x: cx - 120, y: coilY + 70 }
  const galLeftTerm = { x: galX - 30, y: galY + 100 }
  const galRightTerm = { x: galX + 30, y: galY + 100 }

  const wireTopD = `M ${solTopPin.x} ${solTopPin.y} C ${solTopPin.x - 50} ${solTopPin.y}, ${galLeftTerm.x} ${galLeftTerm.y - 70}, ${galLeftTerm.x} ${galLeftTerm.y}`
  const wireBotD = `M ${solBotPin.x} ${solBotPin.y} C ${solBotPin.x - 40} ${solBotPin.y}, ${galRightTerm.x} ${galRightTerm.y - 30}, ${galRightTerm.x} ${galRightTerm.y}`

  return (
    <>
      {/* --- 1. 灵敏电流计 --- */}
      <GalvanometerWiring
        wireTopD={wireTopD}
        wireBotD={wireBotD}
        fluxChange={lenzResult.fluxChange}
        time={time}
        galX={galX}
        galY={galY}
        velocity={velocity}
        inducedCurrentDirection={lenzResult.inducedCurrentDirection}
        getOpacity={getOpacity}
      />

      {/* --- 2. 螺线管线圈 (纵向放置，大尺寸清晰展示) --- */}
      <g transform={`translate(${cx}, ${coilY}) rotate(90)`} opacity={getOpacity([4])} className="transition-opacity duration-300">
        <Solenoid
          x={0}
          y={0}
          width={140}
          height={160}
          turns={coilN}
          current={velocity === 0 ? 0 : (lenzResult.inducedCurrentDirection === 'counterclockwise' ? -1 : 1) * Math.min(1.5, Math.abs(velocity) * 0.5)}
          time={time}
          showIronCore={false}
          animated={currentStep === 0 || currentStep === 4}
        />
        <text
          x={20}
          y={-70}
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
            width={100}
            height={50}
            pole={magnetPole as 1 | -1}
          />
          {showLines === 1 && (
            <g opacity={getOpacity([1, 2])} className="transition-opacity duration-300">
              <ParametricMagneticField
                w={100}
                h={50}
                pole={magnetPole as 1 | -1}
                canvasHeight={DESIGN_HEIGHT}
              />
            </g>
          )}
        </g>

        {/* 排斥力/吸引力分析 (力作用点跟随磁铁) */}
        {forceDirection !== 0 && (
          <g opacity={getOpacity([4])} className="transition-opacity duration-300">
            <VectorArrow
              originPixel={{ x: cx, y: magnetY + 50 }}
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
            originPixel={{ x: cx, y: isDown ? magnetY + 50 : coilY }}
            vector={{ x: 0, y: isDown ? -1 : 1 }}
            type="magneticField"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={Math.abs(coilY - (magnetY + 50))}
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
        <g transform={`translate(${cx + 100}, ${coilY - 80})`} className="animate-fade-in">
          <rect
            width="120"
            height="50"
            rx="6"
            fill={CANVAS_COLORS.objectFillNeutral}
            stroke={CANVAS_COLORS.grid}
            strokeWidth="1.5"
            style={{ filter: `drop-shadow(0px 2px 4px ${withAlpha(CANVAS_COLORS.gridSubtle, 0.3)})` }}
          />
          <text x="60" y="22" textAnchor="middle" fill={CANVAS_COLORS.labelText} fontSize={font(12)} fontWeight="bold">
            磁通量 Φ
          </text>
          <text
            x="60"
            y="40"
            textAnchor="middle"
            fill={lenzResult.fluxChange === 'increasing' ? CANVAS_COLORS.dangerDark : (lenzResult.fluxChange === 'decreasing' ? PHYSICS_COLORS.magneticField : CANVAS_COLORS.textMuted)}
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
        const indY1 = isUp ? coilY + 70 : coilY - 70
        const indY2 = isUp ? coilY - 70 : coilY + 70

        const baseOpacity = getOpacity([3])
        const finalOpacity = baseOpacity < 0.2 ? baseOpacity : 0.9

        return (
          <g key={`ind-${i}`} opacity={finalOpacity} className="transition-opacity duration-300">
            <VectorArrow
              originPixel={{ x: cx + dx, y: indY1 }}
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
          <VectorArrow
            originPixel={lenzResult.inducedCurrentDirection === 'counterclockwise'
              ? { x: cx + 45, y: coilY + 95 }
              : { x: cx - 45, y: coilY + 95 }}
            vector={lenzResult.inducedCurrentDirection === 'counterclockwise'
              ? { x: -1, y: 0 }
              : { x: 1, y: 0 }}
            type="currentDirection"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={70}
            strokeWidth={3.5}
          />
          <g transform={`translate(${cx + 100}, ${coilY + 35})`}>
            <rect width="115" height="30" rx="4" fill={CANVAS_COLORS.dangerBg} stroke={CANVAS_COLORS.alertRed} strokeWidth="1.2" />
            <text x="57" y="19" textAnchor="middle" fill={CANVAS_COLORS.dangerText} fontSize={font(11)} fontWeight="bold">
              {lenzResult.inducedCurrentDirection === 'counterclockwise' ? 'I感: 逆时针 (←)' : 'I感: 顺时针 (→)'}
            </text>
          </g>
        </g>
      )}

      {/* --- 8. 等效磁极可视化 (来拒去留) --- */}
      <EquivalentPolesOverlay
        showEquivalentPoles={showEquivalentPoles}
        fluxChange={lenzResult.fluxChange}
        equivalentPole={lenzResult.equivalentPole}
        coilY={coilY}
        cx={cx}
        upperPoleTextPos={upperPoleTextPos}
        lowerPoleTextPos={lowerPoleTextPos}
        getOpacity={getOpacity}
        font={font}
        labelFontSize={labelFontSize}
      />

      {/* --- 10. 实时状态监控面板 (右上角避让摆放，防止与磁铁磁感应线重叠) --- */}
      <StatusMonitorPanel
        resolvedMonitorPos={resolvedMonitorPos}
        isDragging={isDragging}
        velocity={velocity}
        magnetPole={magnetPole}
        currentAction={lenzResult.currentAction}
        fluxChange={lenzResult.fluxChange}
        font={font}
        getOpacity={getOpacity}
      />

      {/* --- 9. 右手螺旋定则 (安培定则) 可视化面板 (调整至右下区域，平衡左侧电流计) --- */}
      <HandRulePanel
        showHandRule={showHandRule}
        fluxChange={lenzResult.fluxChange}
        inducedFieldDirection={lenzResult.inducedFieldDirection}
        getOpacity={getOpacity}
        font={font}
      />
    </>
  )
}
