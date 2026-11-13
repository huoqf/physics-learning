import { useMemo } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, CANVAS_COLORS } from '@/theme/physics'
import { PhysicsVectorArrow, PhysicsGround, Ball } from '@/components/Physics'
import { computeAngularFrequency, computePendulumState } from '@/physics/oscillation'
import { computePendulumExperiment } from '@/physics/experimentPendulum'
import { AnimationSvgCanvas } from '@/components/Layout'

/**
 * 用单摆测重力加速度实验主场景组件
 */
export default function ExperimentPendulumAnimation() {
  const { params, time, showVectors, showFormulas } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      showFormulas: s.showFormulas,
    })),
  )

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })
  const { font } = canvasSize

  const l_line = params.l_line ?? 0.985
  const d_mm = params.d_mm ?? 20.0
  const n_cycles = Math.round(params.n_cycles ?? 40)
  const g = params.g ?? 9.8
  const timing_err = params.timing_err ?? 0
  const theta0Deg = Math.min(5, params.theta0_exp ?? 4)
  const mass = 1.0

  const expResult = useMemo(
    () =>
      computePendulumExperiment({
        l_line,
        d_mm,
        n_cycles,
        g_true: g,
        timing_err,
        theta0: theta0Deg,
      }),
    [l_line, d_mm, n_cycles, g, timing_err, theta0Deg],
  )

  const L = expResult.effectiveLength
  const T0 = expResult.theoreticalPeriod
  const omega0 = computeAngularFrequency(T0)
  const phase0 = omega0 * time
  const activeState = useMemo(
    () => computePendulumState(mass, L, g, theta0Deg, phase0),
    [mass, L, g, theta0Deg, phase0],
  )

  const pivotX = 175
  const pivotY = 80
  const linePixelLength = 90
  const rPx = L * linePixelLength

  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitH,
    anchor: 'center',
    centerSource: 'custom',
    centerX: pivotX,
    centerY: pivotY,
    physicsScaleDesign: linePixelLength,
    refMagnitudes: {
      force: 10.0,
      gravity: 10.0,
      tension: 12.0,
      appliedForce: 10.0,
      velocity: 3.0,
    },
    maxVectorLength: 100,
  })

  const ballPhysPos = useMemo(
    () => ({
      x: L * Math.sin(activeState.angle),
      y: -L * Math.cos(activeState.angle),
    }),
    [L, activeState.angle],
  )

  const ballX = pivotX + ballPhysPos.x * linePixelLength
  const ballY = pivotY - ballPhysPos.y * linePixelLength

  const { idealTotalTime, measuredTotalTime } = expResult
  const isCompleted = time >= idealTotalTime
  const currentCycles = useMemo(() => {
    if (T0 <= 0) return 0
    if (time >= idealTotalTime) return n_cycles
    return Math.min(n_cycles, Math.floor(time / T0))
  }, [time, T0, idealTotalTime, n_cycles])

  const displayTimer = useMemo(() => {
    if (time >= idealTotalTime) return measuredTotalTime
    return time + timing_err * (time / Math.max(0.1, idealTotalTime))
  }, [time, idealTotalTime, measuredTotalTime, timing_err])

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      className="bg-slate-50 rounded-lg shadow-inner"
    >
      {/* 悬挂天花板平台与销轴 */}
      <PhysicsGround
        x={pivotX - 50}
        y={pivotY - 6}
        width={100}
        type="platform"
        appearance={{ thickness: 6 }}
      />
      <circle
        cx={pivotX}
        cy={pivotY}
        r={5}
        fill={SCENE_COLORS.pendulum.rodStroke}
        stroke={SCENE_COLORS.pendulum.pivotStroke}
        strokeWidth={1}
      />

      {/* 平衡位置垂直辅助虚线与计时基准线 */}
      <line
        x1={pivotX}
        y1={pivotY}
        x2={pivotX}
        y2={pivotY + rPx + 40}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={1.2}
        strokeDasharray="4 4"
      />
      <line
        x1={pivotX - 25}
        y1={pivotY + rPx}
        x2={pivotX + 25}
        y2={pivotY + rPx}
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={1.5}
        strokeDasharray="2 2"
      />
      <text
        x={pivotX}
        y={pivotY + rPx + 30}
        fontSize={font(11)}
        fill={PHYSICS_COLORS.velocity}
        fontFamily={CANVAS_STYLE.FONT.family}
        textAnchor="middle"
      >
        平衡位置（计时基准线）
      </text>

      {/* 摆线与金属摆球 */}
      <line
        x1={pivotX}
        y1={pivotY}
        x2={ballX}
        y2={ballY}
        stroke={SCENE_COLORS.pendulum.rodStroke}
        strokeWidth={2.4}
      />
      <Ball cx={ballX} cy={ballY} r={18} type="pendulumBob" strokeWidth={1.5} />

      <text
        x={ballX}
        y={ballY - 24}
        fontSize={font(13)}
        fontWeight="bold"
        fill={SCENE_COLORS.pendulum.rodStroke}
        fontFamily={CANVAS_STYLE.FONT.family}
        textAnchor="middle"
      >
        θ = {((activeState.angle * 180) / Math.PI).toFixed(1)}°
      </text>

      {/* 摆长测定尺寸标注：摆线长 l 与球心有效摆长 L = l + d/2 */}
      <g fontFamily={CANVAS_STYLE.FONT.family} fontSize={font(11)}>
        <line
          x1={pivotX - 35}
          y1={pivotY}
          x2={pivotX - 35}
          y2={pivotY + (rPx - 18)}
          stroke={CANVAS_COLORS.annotation}
          strokeWidth={1.2}
        />
        <line
          x1={pivotX - 40}
          y1={pivotY}
          x2={pivotX - 30}
          y2={pivotY}
          stroke={CANVAS_COLORS.annotation}
          strokeWidth={1.2}
        />
        <line
          x1={pivotX - 40}
          y1={pivotY + (rPx - 18)}
          x2={pivotX - 30}
          y2={pivotY + (rPx - 18)}
          stroke={CANVAS_COLORS.annotation}
          strokeWidth={1.2}
        />
        <text
          x={pivotX - 42}
          y={pivotY + rPx / 2 - 10}
          fill={CANVAS_COLORS.labelTextLight}
          textAnchor="end"
        >
          线长 l = {l_line.toFixed(3)} m
        </text>

        <text x={ballX + 26} y={ballY - 4} fill={PHYSICS_COLORS.displacement} fontWeight="bold">
          L = l + d/2 = {L.toFixed(3)} m
        </text>
        <text x={ballX + 26} y={ballY + 12} fill={CANVAS_COLORS.textMuted} fontSize={font(10)}>
          (球径 d = {d_mm.toFixed(1)} mm)
        </text>

        {/* 累积计时状态卡片 */}
        <g transform="translate(18, 480)">
          <rect
            x={0}
            y={0}
            width={190}
            height={70}
            rx={8}
            fill={CANVAS_COLORS.objectFillNeutral}
            stroke={CANVAS_COLORS.grid}
            strokeWidth={1}
          />
          <text x={12} y={22} fill={CANVAS_COLORS.labelTextLight} fontSize={font(11)}>
            累计计时 t:
          </text>
          <text x={90} y={22} fill={PHYSICS_COLORS.velocity} fontSize={font(13)} fontWeight="bold">
            {displayTimer.toFixed(2)} s
          </text>
          <text x={12} y={42} fill={CANVAS_COLORS.labelTextLight} fontSize={font(11)}>
            全振动计数:
          </text>
          <text x={90} y={42} fill={PHYSICS_COLORS.forceNet} fontSize={font(13)} fontWeight="bold">
            {currentCycles} / {n_cycles} 次
          </text>
          <text
            x={12}
            y={60}
            fill={isCompleted ? PHYSICS_COLORS.gravity : CANVAS_COLORS.textMuted}
            fontSize={font(10)}
            fontWeight={isCompleted ? 'bold' : 'normal'}
          >
            {isCompleted ? '✓ 已达预定全振动次数' : '● 单摆计时中…'}
          </text>
        </g>
      </g>

      {/* 动态力学矢量 */}
      {showVectors && (
        <g>
          <PhysicsVectorArrow
            origin={ballPhysPos}
            vector={{ x: 0, y: -activeState.gravity }}
            type="gravity"
            sceneScale={sceneScale}
            label={`G = ${activeState.gravity.toFixed(1)}N`}
            glow
          />
          <PhysicsVectorArrow
            origin={ballPhysPos}
            vector={{
              x: -activeState.tension * Math.sin(activeState.angle),
              y: activeState.tension * Math.cos(activeState.angle),
            }}
            type="tension"
            sceneScale={sceneScale}
            label={`F_拉 = ${activeState.tension.toFixed(1)}N`}
            glow
          />
          <PhysicsVectorArrow
            origin={ballPhysPos}
            vector={{
              x: activeState.restoringForce * Math.cos(activeState.angle),
              y: activeState.restoringForce * Math.sin(activeState.angle),
            }}
            type="appliedForce"
            color={PHYSICS_COLORS.accelerationX}
            sceneScale={sceneScale}
            label={`F_回 = ${Math.abs(activeState.restoringForce).toFixed(1)}N`}
            glow
          />
        </g>
      )}

      {/* 左上角图例 */}
      <g fontFamily={CANVAS_STYLE.FONT.family} fontSize={font(11)}>
        <rect
          x={10}
          y={10}
          width={200}
          height={26}
          rx={4}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={1}
        />
        <circle cx={22} cy={23} r={4.5} fill={PHYSICS_COLORS.displacement} />
        <text x={32} y={27} fill={CANVAS_COLORS.labelTextLight}>
          有效摆长 L
        </text>
        <circle cx={110} cy={23} r={4.5} fill={PHYSICS_COLORS.velocity} />
        <text x={120} y={27} fill={CANVAS_COLORS.labelTextLight}>
          基准计时
        </text>
      </g>

      {showFormulas && (
        <text
          x={10}
          y={635}
          fontSize={font(11)}
          fill={CANVAS_COLORS.textMuted}
          fontFamily={CANVAS_STYLE.FONT.family}
        >
          {`单摆测 g: L = l + d/2 = ${L.toFixed(3)}m | 理论周期 T = ${T0.toFixed(3)}s | 关系式 g = 4π²L/T²`}
        </text>
      )}
    </AnimationSvgCanvas>
  )
}
