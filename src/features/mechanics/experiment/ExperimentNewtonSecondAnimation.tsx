import { useMemo } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { RelationChart } from '@/components/Chart'
import {
  Ball,
  Block,
  LabRuler,
  PaperTape,
  PhysicsGround,
  PhysicsVectorArrow,
  Pulley,
  TickerTimer,
} from '@/components/Physics'
import { worldToDesign } from '@/scene'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { CANVAS_COLORS, PHYSICS_COLORS, SCENE_COLORS, withAlpha } from '@/theme/physics'
import {
  NEWTON_TRACK_MAX_M,
  buildNewtonSecondCurves,
  computeNewtonSecondMotion,
  computeNewtonSecondState,
} from '@/physics/experimentNewtonSecond'
import { DIFF_METHOD_MIN_DOTS } from '@/physics/experimentMechanics'

const NEWTON_ORIGIN_X = 145
const NEWTON_GROUND_Y = 205
const NEWTON_PX_PER_M = 400
const CART_W = 54
const CART_H = 26
const TRACK_LEFT_X = 48
const PULLEY_CENTER_X = NEWTON_ORIGIN_X + NEWTON_TRACK_MAX_M * NEWTON_PX_PER_M + CART_W + 24

/**
 * 探究加速度与力、质量的关系实验动画组件
 */
export default function ExperimentNewtonSecondAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time })),
  )

  const timeNum = Number.isFinite(Number(time)) ? Number(time) : 0
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const state = useMemo(() => computeNewtonSecondState(params), [params])
  const curves = useMemo(() => buildNewtonSecondCurves(params), [params])
  const motion = useMemo(
    () => computeNewtonSecondMotion(state.a_real, timeNum, NEWTON_PX_PER_M, state.freq),
    [state.a_real, timeNum, state.freq],
  )

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'custom',
    customScaleX: NEWTON_PX_PER_M,
    customScaleY: NEWTON_PX_PER_M,
    customOriginX: NEWTON_ORIGIN_X,
    customOriginY: NEWTON_GROUND_Y,
    maxVectorLength: 75,
    refMagnitudes: { force: 3.0 },
  })

  const carDesignPos = worldToDesign(motion.x, 0, sceneScale)
  const carPx = carDesignPos?.px ?? NEWTON_ORIGIN_X

  // 木板围绕右端枢轴略微抬起左端，以直观示意「平衡摩擦力」倾角调节
  const pivotX = PULLEY_CENTER_X - 8
  const pivotY = NEWTON_GROUND_Y
  const slopeDeg = state.inclineDeg

  // 小车附加配重视觉宽度表达 M_cart
  const weightCount = Math.max(0, Math.round((state.M_cart - 0.2) / 0.15))

  // 定滑轮右侧垂下细绳及槽码盘位置 (在水平桌外垂直向下，随位移同步下降，限位防出画布)
  const ropeDropY = Math.min(290, NEWTON_GROUND_Y + 26 + motion.x * 58)
  const hookRadius = 8 + Math.min(7, state.m_hook * 24)

  const balanceLabel =
    state.balanceMode === 0
      ? '恰好平衡摩擦力'
      : state.balanceMode === 1
        ? '水平放置 · 未平衡摩擦力'
        : '倾角过大 · 平衡摩擦力过度'

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      {/* 1. 上半屏实验图像（a-F 或 a-1/M 实测曲线与理想直线对比） */}
      <div className="order-1 flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm overflow-hidden">
        <RelationChart
          points={curves.measuredPoints}
          additionalSeries={[
            {
              points: curves.idealPoints,
              label: state.mode === 0 ? '理想线 a=F/M' : '理想线 a=mg/M',
              series: 'secondary',
              strokeDasharray: [5, 4],
            },
          ]}
          mainLabel="实验实测曲线"
          cursorX={curves.cursorX}
          xDomain={curves.xDomain}
          yDomain={curves.yDomain}
          title={
            state.mode === 0
              ? '探究 a 与 F 的关系（控制小车质量 M 不变）'
              : '探究 a 与 1/M 的关系（控制槽码质量 m 不变）'
          }
          xLabel={state.mode === 0 ? '槽码重力 F = mg (N)' : '小车质量倒数 1/M (kg⁻¹)'}
          yLabel="加速度 a (m/s²)"
        />
      </div>

      {/* 2. 下半屏斜坡木板与打点纸带装置场景 */}
      <div
        className="order-2 flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm relative overflow-hidden"
        ref={containerRef}
      >
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          {/* 底部水平实验桌基准面 */}
          <line
            x1={24}
            y1={NEWTON_GROUND_Y + 8}
            x2={PULLEY_CENTER_X + 16}
            y2={NEWTON_GROUND_Y + 8}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={1.5}
          />

          {/* 垫木楔块：直观显示是否垫高长木板左端 */}
          {slopeDeg > 0 && (
            <g>
              <polygon
                points={`75,${NEWTON_GROUND_Y + 8} 130,${NEWTON_GROUND_Y + 8} 130,${
                  NEWTON_GROUND_Y + 8 - Math.tan((slopeDeg * Math.PI) / 180) * (pivotX - 102)
                }`}
                fill={withAlpha(SCENE_COLORS.materials.labWoodGrad[1], 0.85)}
                stroke={SCENE_COLORS.materials.labWoodGrad[3]}
                strokeWidth={1}
              />
              <text
                x={102}
                y={NEWTON_GROUND_Y + 22}
                fontSize={font(9.5)}
                fill={CANVAS_COLORS.labelTextLight}
                textAnchor="middle"
              >
                平衡摩擦垫木
              </text>
            </g>
          )}

          {/* 右端定滑轮下方重物垂线与槽码 */}
          <line
            x1={PULLEY_CENTER_X + 11}
            y1={NEWTON_GROUND_Y - 12}
            x2={PULLEY_CENTER_X + 11}
            y2={ropeDropY - hookRadius}
            stroke={CANVAS_COLORS.strokeDark}
            strokeWidth={1.4}
          />
          <Ball cx={PULLEY_CENTER_X + 11} cy={ropeDropY} r={hookRadius} type="steel" />
          <text
            x={PULLEY_CENTER_X + 26}
            y={ropeDropY + 4}
            fontSize={font(10)}
            fill={CANVAS_COLORS.labelText}
            fontFamily="monospace"
          >
            {`m = ${state.m_hook.toFixed(2)} kg`}
          </text>

          {/* 可随倾角微调的长木板装配体 */}
          <g transform={`rotate(${slopeDeg}, ${pivotX}, ${pivotY})`}>
            <PhysicsGround
              x={TRACK_LEFT_X}
              y={NEWTON_GROUND_Y}
              width={pivotX - TRACK_LEFT_X + 10}
              type="ground"
            />

            {/* 打点计时器 */}
            <TickerTimer
              x={95}
              y={NEWTON_GROUND_Y - 32}
              type="electromagnetic"
              isVibrating={motion.v > 0}
              frequency={Math.round(1 / motion.tickerPeriodS)}
            />

            {/* 纸带与打点计数点 */}
            <PaperTape
              x={NEWTON_ORIGIN_X}
              y={NEWTON_GROUND_Y - 20}
              width={Math.max(0, carPx - NEWTON_ORIGIN_X)}
              dots={motion.tapeDots}
              showLabels={motion.tapeDots.length <= 10}
              highlightInterval={[0, DIFF_METHOD_MIN_DOTS - 1]}
              highlightLabel={
                motion.aCalculated === null
                  ? '逐差法：计数点不足'
                  : `逐差法 a = ${motion.aCalculated.toFixed(2)} m/s²`
              }
              fontFamily="monospace"
            />

            {/* 牵引细绳：小车右端至定滑轮上缘 */}
            <line
              x1={carPx + CART_W}
              y1={NEWTON_GROUND_Y - 13}
              x2={PULLEY_CENTER_X}
              y2={NEWTON_GROUND_Y - 24}
              stroke={CANVAS_COLORS.strokeDark}
              strokeWidth={1.4}
            />

            {/* 木质实验小车 + 车身配重砝码示意图 */}
            <Block
              x={carPx}
              y={NEWTON_GROUND_Y - CART_H}
              width={CART_W}
              height={CART_H}
              type="woodCart"
              velocity={motion.v}
              time={timeNum}
            />
            {Array.from({ length: weightCount }).map((_, idx) => (
              <rect
                key={`cart-weight-${idx}`}
                x={carPx + 10 + idx * 10}
                y={NEWTON_GROUND_Y - CART_H - 7}
                width={8}
                height={7}
                rx={1}
                fill={SCENE_COLORS.materials.aluminumMetalGrad[2]}
                stroke={CANVAS_COLORS.strokeDark}
                strokeWidth={0.8}
              />
            ))}

            {/* 细绳拉力物理矢量 */}
            {state.tension > 0 && (
              <PhysicsVectorArrow
                originDesign={{ x: carPx + CART_W, y: NEWTON_GROUND_Y - CART_H / 2 }}
                vector={{ x: state.tension, y: 0 }}
                type="tension"
                sceneScale={sceneScale}
                label={`T = ${state.tension.toFixed(2)} N`}
                font={font}
              />
            )}

            {/* 木板右端定滑轮 */}
            <Pulley cx={PULLEY_CENTER_X} cy={NEWTON_GROUND_Y - 12} r={12} />
          </g>

          {/* 水平辅助测量标尺（置于木板下方不重叠区域） */}
          <LabRuler
            x={NEWTON_ORIGIN_X}
            y={NEWTON_GROUND_Y + 42}
            length={NEWTON_TRACK_MAX_M * NEWTON_PX_PER_M}
            domain={[0, NEWTON_TRACK_MAX_M * 100]}
            showMagnifier
            magnifierPos={Math.max(0, Math.min(NEWTON_TRACK_MAX_M * NEWTON_PX_PER_M - 16, carPx - NEWTON_ORIGIN_X))}
            fontFamily="monospace"
          />

          {/* 顶部左侧状态标牌 */}
          <text
            x={24}
            y={22}
            fontSize={font(11)}
            fill={state.balanceMode === 0 ? PHYSICS_COLORS.velocity : PHYSICS_COLORS.accelerationX}
            fontWeight="bold"
          >
            {`状态：${balanceLabel} | M = ${state.M_cart.toFixed(2)} kg`}
          </text>
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
