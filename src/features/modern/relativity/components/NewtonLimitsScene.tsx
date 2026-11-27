import React from 'react'
import {
  CANVAS_COLORS,
  DASH,
  PHYSICS_COLORS,
  SCENE_COLORS,
  STROKE,
  withAlpha,
} from '@/theme/physics'
import { VectorArrow } from '@/components/Physics'
import type { SceneScale } from '@/scene'
import { formatRelativityBeta } from '@/physics/relativity'
import type { RelativityPhysicsState } from '../hooks/useRelativityPhysics'
import { SPLITV_LAYOUT } from '../relativityLayout'

interface NewtonLimitsSceneProps {
  physics: RelativityPhysicsState
  sceneScale: SceneScale
  font: (size: number) => number
}

const REGIME_TEXT_MAP = {
  classical: '宏观低速 · 牛顿力学精确适用',
  transitional: '过渡区间 · 相对论修正显现',
  relativistic: '近光速区 · 牛顿公式失效',
} as const

export const NewtonLimitsScene: React.FC<NewtonLimitsSceneProps> = ({
  physics,
  sceneScale,
  font,
}) => {
  const { accelState } = physics
  const {
    targetBeta,
    targetGamma,
    duration,
    groundTime,
    currentBeta,
    classicalBeta,
    currentGamma,
    accelRatio,
    currentNewtonMetrics,
  } = accelState

  const {
    raceBox,
    trackLeft,
    trackW,
    classicalTrackY,
    relTrackY,
    statusBarY,
    boundaryBox,
    safeIslandY,
    safeIslandH,
    cardStartY,
    cardH,
    cardGap,
  } = SPLITV_LAYOUT.newton

  const maxTrackBeta = Math.max(1.35, targetBeta * targetGamma * 1.08)
  const toTrackX = (b: number) => trackLeft + Math.min(1, Math.max(0, b / maxTrackBeta)) * trackW

  const cLineX = toTrackX(1.0)
  const lowSpeedEndX = toTrackX(0.1)
  const clShipX = toTrackX(classicalBeta)
  const relShipX = toTrackX(currentBeta)
  const devPct = (currentNewtonMetrics.relativeDeviation * 100).toFixed(currentBeta < 0.1 ? 3 : 1)

  const shipW = 34
  const shipH = 26
  const isClassicalExceed = classicalBeta >= 1.0

  const regimeColor =
    currentNewtonMetrics.regime === 'classical'
      ? PHYSICS_COLORS.wavelengthGreen
      : currentNewtonMetrics.regime === 'transitional'
        ? PHYSICS_COLORS.velocity
        : PHYSICS_COLORS.acceleration

  const boundaryCards = [
    {
      title: '高速 (v→c) → 狭义相对论',
      detail: 'v ≪ c 时 γ → 1 退化为牛顿力学',
      color: PHYSICS_COLORS.velocity,
      active: currentBeta > 0.1,
    },
    {
      title: '微观 (原子尺度) → 量子力学',
      detail: '宏观大尺度下量子效应平均化',
      color: PHYSICS_COLORS.displacement,
      active: false,
    },
    {
      title: '强引力 (天体) → 广义相对论',
      detail: '弱引力条件下近似回归万有引力',
      color: PHYSICS_COLORS.acceleration,
      active: false,
    },
  ]

  return (
    <g className="mode-newton-limits">
      {/* ── 左侧：双轨道恒力加速赛跑（等力 F 作用下加速度差异） ── */}
      <rect
        x={raceBox.x}
        y={raceBox.y}
        width={raceBox.w}
        height={raceBox.h}
        rx={8}
        fill={CANVAS_COLORS.white}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={STROKE.axis}
      />

      {/* 顶部标题 */}
      <text
        x={trackLeft}
        y={36}
        fill={CANVAS_COLORS.labelText}
        fontSize={font(12)}
        fontWeight="bold"
      >
        恒力 F 加速速度标尺对照（t = {groundTime.toFixed(2)} / {duration.toFixed(1)} s）
      </text>

      {/* 低速区 v ≤ 0.1c 绿色背景带 */}
      <rect
        x={trackLeft}
        y={48}
        width={Math.max(4, lowSpeedEndX - trackLeft)}
        height={176}
        fill={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.1)}
      />

      {/* 光速极限红线 c */}
      <line
        x1={cLineX}
        y1={52}
        x2={cLineX}
        y2={226}
        stroke={PHYSICS_COLORS.acceleration}
        strokeWidth={STROKE.vectorThin}
        strokeDasharray={DASH.reference.join(' ')}
      />
      <text
        x={cLineX}
        y={42}
        textAnchor="middle"
        fill={PHYSICS_COLORS.acceleration}
        fontSize={font(10)}
        fontWeight="bold"
      >
        光速壁垒 c
      </text>

      {/* 上轨：牛顿经典飞船 */}
      <text
        x={trackLeft}
        y={60}
        fill={isClassicalExceed ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.velocity}
        fontSize={font(11)}
        fontWeight="bold"
      >
        牛顿预测：a₀ 恒定，v_cl = {classicalBeta.toFixed(2)} c{isClassicalExceed ? '（超 c 失效）' : ''}
      </text>
      <line
        x1={trackLeft}
        y1={classicalTrackY}
        x2={trackLeft + trackW}
        y2={classicalTrackY}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={STROKE.axis}
      />
      <rect
        x={clShipX - shipW / 2}
        y={classicalTrackY - shipH / 2}
        width={shipW}
        height={shipH}
        rx={5}
        fill={withAlpha(
          isClassicalExceed ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.velocity,
          0.2,
        )}
        stroke={isClassicalExceed ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.velocity}
        strokeWidth={STROKE.objectLine}
      />
      <VectorArrow
        originDesign={{ x: clShipX + shipW / 2 + 2, y: classicalTrackY - 8 }}
        vector={{ x: 1, y: 0 }}
        type="acceleration"
        arrowType="physical-schematic"
        color={PHYSICS_COLORS.acceleration}
        pixelLength={28}
        label="a₀"
        labelPlacement="side-opposite"
        sceneScale={sceneScale}
        font={font}
      />
      <VectorArrow
        originDesign={{ x: clShipX + shipW / 2 + 2, y: classicalTrackY + 8 }}
        vector={{ x: 1, y: 0 }}
        type="force"
        arrowType="physical-schematic"
        color={PHYSICS_COLORS.forceNet}
        pixelLength={32}
        label="F"
        labelPlacement="side"
        sceneScale={sceneScale}
        font={font}
      />

      {/* 下轨：相对论飞船 */}
      <text
        x={trackLeft}
        y={148}
        fill={PHYSICS_COLORS.wavelengthGreen}
        fontSize={font(11)}
        fontWeight="bold"
      >
        相对论实际：加速度持续减小，v = {formatRelativityBeta(currentBeta)} c
      </text>
      <line
        x1={trackLeft}
        y1={relTrackY}
        x2={trackLeft + trackW}
        y2={relTrackY}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={STROKE.axis}
      />
      <rect
        x={relShipX - shipW / 2}
        y={relTrackY - shipH / 2}
        width={shipW}
        height={shipH}
        rx={5}
        fill={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.22)}
        stroke={PHYSICS_COLORS.wavelengthGreen}
        strokeWidth={STROKE.objectLine}
      />
      <VectorArrow
        originDesign={{ x: relShipX + shipW / 2 + 2, y: relTrackY - 8 }}
        vector={{ x: 1, y: 0 }}
        type="acceleration"
        arrowType="physical-schematic"
        color={PHYSICS_COLORS.acceleration}
        pixelLength={Math.max(8, 28 * accelRatio)}
        label="a"
        labelPlacement="side-opposite"
        sceneScale={sceneScale}
        font={font}
      />
      <VectorArrow
        originDesign={{ x: relShipX + shipW / 2 + 2, y: relTrackY + 8 }}
        vector={{ x: 1, y: 0 }}
        type="force"
        arrowType="physical-schematic"
        color={PHYSICS_COLORS.forceNet}
        pixelLength={32}
        label="F"
        labelPlacement="side"
        sceneScale={sceneScale}
        font={font}
      />

      {/* 速度轴刻度线 */}
      <line
        x1={trackLeft}
        y1={226}
        x2={trackLeft + trackW}
        y2={226}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={STROKE.axis}
      />
      <text x={trackLeft} y={242} textAnchor="middle" fill={CANVAS_COLORS.axis} fontSize={font(10)}>
        0
      </text>
      <text
        x={Math.max(lowSpeedEndX, trackLeft + 28)}
        y={242}
        textAnchor="middle"
        fill={PHYSICS_COLORS.wavelengthGreen}
        fontSize={font(10)}
        fontWeight="bold"
      >
        0.1c
      </text>
      <text
        x={cLineX}
        y={242}
        textAnchor="middle"
        fill={PHYSICS_COLORS.acceleration}
        fontSize={font(10)}
        fontWeight="bold"
      >
        1.0c
      </text>
      <text
        x={trackLeft + trackW}
        y={242}
        textAnchor="end"
        fill={CANVAS_COLORS.labelText}
        fontSize={font(10)}
        fontWeight="bold"
      >
        速度 v/c
      </text>

      {/* 底部状态条与适用区间徽章 */}
      <text x={trackLeft} y={statusBarY + 20} fill={CANVAS_COLORS.labelText} fontSize={font(11)}>
        γ = {currentGamma.toFixed(3)} · 偏差 = {devPct}%
      </text>
      <rect
        x={260}
        y={statusBarY}
        width={282}
        height={30}
        rx={6}
        fill={withAlpha(regimeColor, 0.14)}
        stroke={withAlpha(regimeColor, 0.5)}
        strokeWidth={STROKE.tick}
      />
      <text
        x={401}
        y={statusBarY + 19}
        textAnchor="middle"
        fill={regimeColor}
        fontSize={font(11)}
        fontWeight="bold"
      >
        {REGIME_TEXT_MAP[currentNewtonMetrics.regime]}
      </text>

      {/* ── 右侧：牛顿力学适用域安全岛与三大边界 ── */}
      <rect
        x={boundaryBox.x}
        y={boundaryBox.y}
        width={boundaryBox.w}
        height={boundaryBox.h}
        rx={8}
        fill={CANVAS_COLORS.white}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={STROKE.axis}
      />

      {/* 安全岛 */}
      <rect
        x={boundaryBox.x + 12}
        y={safeIslandY}
        width={boundaryBox.w - 24}
        height={safeIslandH}
        rx={8}
        fill={withAlpha(
          PHYSICS_COLORS.wavelengthGreen,
          currentNewtonMetrics.regime === 'classical' ? 0.16 : 0.08,
        )}
        stroke={PHYSICS_COLORS.wavelengthGreen}
        strokeWidth={
          currentNewtonMetrics.regime === 'classical' ? STROKE.objectLine : STROKE.objectThin
        }
      />
      <text
        x={boundaryBox.x + boundaryBox.w / 2}
        y={safeIslandY + 26}
        textAnchor="middle"
        fill={CANVAS_COLORS.labelText}
        fontSize={font(12)}
        fontWeight="bold"
      >
        牛顿力学适用域
      </text>
      <text
        x={boundaryBox.x + boundaryBox.w / 2}
        y={safeIslandY + 48}
        textAnchor="middle"
        fill={PHYSICS_COLORS.wavelengthGreen}
        fontSize={font(12)}
        fontWeight="bold"
      >
        宏观 · 低速 · 弱引力
      </text>
      <circle
        cx={boundaryBox.x + 26}
        cy={currentNewtonMetrics.regime === 'classical' ? safeIslandY + 22 : cardStartY + 18}
        r={4.5}
        fill={
          currentNewtonMetrics.regime === 'classical'
            ? PHYSICS_COLORS.wavelengthGreen
            : PHYSICS_COLORS.velocity
        }
      />

      {/* 三大边界卡 */}
      {boundaryCards.map((card, idx) => {
        const cy = cardStartY + idx * (cardH + cardGap)
        return (
          <g key={card.title}>
            <rect
              x={boundaryBox.x + 12}
              y={cy}
              width={boundaryBox.w - 24}
              height={cardH}
              rx={6}
              fill={
                card.active
                  ? withAlpha(card.color, 0.1)
                  : withAlpha(SCENE_COLORS.materials.structFillPale, 0.35)
              }
              stroke={card.active ? card.color : withAlpha(card.color, 0.5)}
              strokeWidth={card.active ? STROKE.objectLine : STROKE.tick}
            />
            <text
              x={boundaryBox.x + 24}
              y={cy + 20}
              fill={card.color}
              fontSize={font(11)}
              fontWeight="bold"
            >
              {card.title}
            </text>
            <text
              x={boundaryBox.x + 24}
              y={cy + 38}
              fill={CANVAS_COLORS.textMuted}
              fontSize={font(10)}
            >
              {card.detail}
            </text>
          </g>
        )
      })}

      <text
        x={boundaryBox.x + boundaryBox.w / 2}
        y={300}
        textAnchor="middle"
        fill={CANVAS_COLORS.textMuted}
        fontSize={font(10)}
      >
        新理论包容而非推翻牛顿力学
      </text>
    </g>
  )
}
