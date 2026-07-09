import { useCallback, useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_COLORS, STROKE, CANVAS_STYLE, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { VectorArrow } from '@/components/Physics'
import { Ball } from '@/components/Physics'
import { RelationChart } from '@/components/Chart'
import {
  PARTICLES,
  SCALE,
  SPECTROMETER,
  CYCLOTRON,
  DEFLECT,
  buildSpectrometerSimulation,
  buildCyclotronSimulation,
  buildDeflectSimulation,
  getPositionAt,
} from './model/combinedFieldsModel'
import type { SceneScale } from '@/scene'
import type { VectorType } from '@/theme/physics/vectorStyle'

const DESIGN_W = 840
const DESIGN_H = 325

const REF_MAGNITUDES = {
  electricForce: 2e-15,
  magneticForce: 2e-15,
  acceleration: 4e7,
}

export default function CombinedFieldsAnimation() {
  const { params, isPlaying, time, speed, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
      speed: s.speed,
      showVectors: s.showVectors,
    })),
  )

  const [, canvasSize] = useCanvasSize(CANVAS_PRESETS.splitV)
  const { font } = canvasSize

  // ── 获取交互参数 ──
  const activeStage = params.mode ?? 0
  const E = params.electricE ?? 300
  const B1 = params.magneticB1 ?? 0.2
  const B2 = params.magneticB2 ?? 1.5
  const acFreqkHz = params.acFrequency ?? 24
  const U = (params.acVoltage ?? 5) * 1000 // kV → V
  const resonanceLock = !!(params.resonanceLock ?? 0)
  const particleType = params.particleType ?? 0
  const vParticle = params.vParticle ?? 1500

  const p = PARTICLES[particleType] ?? PARTICLES[0]

  // ── 预计算仿真（按参数更新）──
  const spectrometer = useMemo(() => {
    return buildSpectrometerSimulation(E, B1, B2, vParticle, particleType)
  }, [E, B1, B2, vParticle, particleType])

  const cyclotron = useMemo(() => {
    return buildCyclotronSimulation(B2, U, acFreqkHz * 1000, resonanceLock)
  }, [B2, U, acFreqkHz, resonanceLock])

  const deflect = useMemo(() => {
    return buildDeflectSimulation(E, B2, vParticle, particleType)
  }, [E, B2, vParticle, particleType])

  // 根据当前选择的阶段确定使用的仿真
  const sim = useMemo(() => {
    if (activeStage === 0) return spectrometer
    if (activeStage === 1) return cyclotron
    return deflect
  }, [activeStage, spectrometer, cyclotron, deflect])

  // 当前粒子在动画中的状态
  const pos = useMemo(() => {
    return getPositionAt(sim.trajectory, time)
  }, [sim.trajectory, time])

  // ── 物理时钟调度 ──
  const handleFrame = useCallback((deltaMs: number) => {
    const dt = deltaMs / 1000
    if (dt <= 0 || dt > 0.1) return
    const store = useAnimationStore.getState()
    const nextTime = store.time + dt * store.speed
    // maxTime 为 0.0006s (600微秒)
    if (nextTime >= 0.0006) {
      store.setTime(0.0006)
      store.setIsPlaying(false)
    } else {
      store.setTime(nextTime)
    }
  }, [])
  useAnimationFrame(handleFrame, { playing: isPlaying, speed })

  // ── 动态轨迹 ──
  const visibleTrajectory = useMemo(() => {
    return sim.trajectory.filter((pt) => pt.t <= time)
  }, [sim.trajectory, time])

  // ── 矢量箭头助手（使用 calculateVectorPixelLength 归一化）──
  const maxVectorLen = 45
  const renderArrow = (
    sx: number,
    sy: number,
    dx: number,
    dy: number,
    mag: number,
    refMag: number,
    color: string,
    type: VectorType,
    label: string,
  ) => {
    const len = Math.max(10, Math.min(maxVectorLen, (mag / refMag) * maxVectorLen))
    const sceneScale: SceneScale = {
      scaleX: 1,
      scaleY: 1,
      scale: 1,
      originX: sx,
      originY: sy,
      maxVectorLength: len,
      refMagnitudes: {},
    }
    return (
      <VectorArrow
        origin={{ x: 0, y: 0 }}
        vector={{ x: dx, y: dy }}
        type={type}
        sceneScale={sceneScale}
        color={color}
        pixelLength={len}
        font={font}
        label={label}
      />
    )
  }

  const smallFs = font(11)
  const labelFs = font(13)

  // ───────────── 图表并列渲染区 (在上) ─────────────
  const chartsSection = (
    <div className="grid grid-cols-3 gap-2 w-full h-full p-2 bg-neutral-50 border-b border-neutral-200">
      {activeStage === 0 && (
        <>
          <div className="col-span-2">
            <RelationChart
              points={spectrometer.ekPoints}
              xDomain={[0, 0.0006]}
              yDomain={[0, 0.2]} // MeV
              xLabel="时间 t (s)"
              yLabel="动能 Ek (MeV)"
              cursorX={time}
              title="粒子动能随时间变化 (Ek - t)"
              series="primary"
              variant="mini"
            />
          </div>
          <div>
            <RelationChart
              points={spectrometer.filmPoints}
              xDomain={[4.0, 26.0]}
              yDomain={[50, 350]}
              xLabel="质量 m (×10⁻²³ kg)"
              yLabel="落点 x 坐标 (px)"
              cursorX={p.m * 1e23}
              title="底片落点坐标与质量关系"
              series="secondary"
              variant="mini"
            />
          </div>
        </>
      )}

      {activeStage === 1 && (
        <>
          <div>
            <RelationChart
              points={cyclotron.ekPoints}
              xDomain={[0, 0.0006]}
              yDomain={[0, 3.5]}
              xLabel="时间 t (s)"
              yLabel="动能 Ek (MeV)"
              cursorX={time}
              title="动能变化 (Ek - t)"
              series="primary"
              variant="mini"
            />
          </div>
          <div>
            <RelationChart
              points={cyclotron.rnPoints}
              xDomain={[0, 45]}
              yDomain={[0, 150]}
              xLabel="加速次数 n"
              yLabel="回旋半径 R (px)"
              cursorX={cyclotron.segments.filter((s) => s.tStart <= time).length}
              title="轨道半径与圈数 (R - n)"
              series="secondary"
              variant="mini"
            />
          </div>
          <div>
            <RelationChart
              points={cyclotron.ekMaxVsUPoints}
              xDomain={[1.0, 10.0]}
              yDomain={[0, 4.0]}
              xLabel="加速电压 U (kV)"
              yLabel="最大动能 (MeV)"
              cursorX={params.acVoltage ?? 5}
              title="最末动能与电压关系 (Ek - U)"
              series="accent"
              variant="mini"
            />
          </div>
        </>
      )}

      {activeStage === 2 && (
        <>
          <div className="col-span-2">
            <RelationChart
              points={deflect.vPoints}
              xDomain={[0, 0.0006]}
              yDomain={[0, 2.5]}
              xLabel="时间 t (s)"
              yLabel="速度 v (km/s)"
              cursorX={time}
              title="速度大小随时间变化 (v - t)"
              series="primary"
              variant="mini"
            />
          </div>
          <div>
            <RelationChart
              points={deflect.tanThetaVsEPoints}
              xDomain={[100, 1000]}
              yDomain={[0, 1.5]}
              xLabel="电场 E (N/C)"
              yLabel="偏角正切 tan θ"
              cursorX={E}
              title="出射偏角与电场关系"
              series="secondary"
              variant="mini"
            />
          </div>
        </>
      )}
    </div>
  )

  // ───────────── 动画区各场景渲染 (在下) ─────────────

  // 1. 模式 0 质谱仪
  const spectrometerScene = (
    <g>
      {/* 速度选择器极板（垂直） */}
      <rect x={SPECTROMETER.xMid - SPECTROMETER.plateHalf - 6} y={SPECTROMETER.y0} width={6} height={SPECTROMETER.y1 - SPECTROMETER.y0} fill={PHYSICS_COLORS.positiveCharge} rx={1} />
      <rect x={SPECTROMETER.xMid + SPECTROMETER.plateHalf} y={SPECTROMETER.y0} width={6} height={SPECTROMETER.y1 - SPECTROMETER.y0} fill={PHYSICS_COLORS.negativeCharge} rx={1} />
      {/* 极板正负号 */}
      <text x={SPECTROMETER.xMid - SPECTROMETER.plateHalf - 12} y={SPECTROMETER.y0 + 20} fill={PHYSICS_COLORS.positiveCharge} fontSize={smallFs} fontWeight="bold" textAnchor="middle">+</text>
      <text x={SPECTROMETER.xMid + SPECTROMETER.plateHalf + 12} y={SPECTROMETER.y0 + 20} fill={PHYSICS_COLORS.negativeCharge} fontSize={smallFs} fontWeight="bold" textAnchor="middle">−</text>

      {/* 电场线 (黄，向右) */}
      {Array.from({ length: 4 }).map((_, i) => {
        const y = SPECTROMETER.y0 + 15 + i * 30
        return (
          <g key={`e-line-${i}`}>
            <line
              x1={SPECTROMETER.xMid - SPECTROMETER.plateHalf}
              y1={y}
              x2={SPECTROMETER.xMid + SPECTROMETER.plateHalf}
              y2={y}
              stroke={PHYSICS_COLORS.electricFieldLine}
              strokeWidth={STROKE.fieldLine}
              strokeDasharray="4 2"
            />
            <path d={`M ${SPECTROMETER.xMid + 10} ${y - 3} L ${SPECTROMETER.xMid + 15} ${y} L ${SPECTROMETER.xMid + 10} ${y + 3}`} fill={PHYSICS_COLORS.electricFieldLine} />
          </g>
        )
      })}

      {/* 选择器磁场 B1 × (绿色) */}
      {Array.from({ length: 2 }).map((_, i) =>
        Array.from({ length: 3 }).map((_, j) => {
          const x = SPECTROMETER.xMid - SPECTROMETER.plateHalf + 18 + i * 40
          const y = SPECTROMETER.y0 + 20 + j * 40
          return (
            <text key={`b1-${i}-${j}`} x={x} y={y} textAnchor="middle" fontSize={smallFs} fill={PHYSICS_COLORS.magneticFieldCross} fontWeight="bold">
              ×
            </text>
          )
        }),
      )}

      {/* 速度选择器底端孔与挡板 */}
      <line x1={50} y1={SPECTROMETER.y1} x2={SPECTROMETER.xMid - SPECTROMETER.slitR} y2={SPECTROMETER.y1} stroke={CANVAS_COLORS.annotation} strokeWidth={3} />
      <line x1={SPECTROMETER.xMid + SPECTROMETER.slitR} y1={SPECTROMETER.y1} x2={650} y2={SPECTROMETER.y1} stroke={CANVAS_COLORS.annotation} strokeWidth={3} />

      {/* 偏转磁场 B2 背景 × */}
      {Array.from({ length: 10 }).map((_, i) =>
        Array.from({ length: 3 }).map((_, j) => {
          const x = 120 + i * 50
          const y = SPECTROMETER.y1 + 30 + j * 50
          if (x >= 350) return null // 仅左侧偏转区绘制
          return (
            <text key={`b2-${i}-${j}`} x={x} y={y} textAnchor="middle" fontSize={labelFs} fill={PHYSICS_COLORS.magneticFieldCross} fontWeight="bold" opacity={0.3}>
              ×
            </text>
          )
        }),
      )}

      {/* 照相底片 & 刻度尺 */}
      <rect x={150} y={SPECTROMETER.y1 - 3} width={200 - SPECTROMETER.slitR} height={5} fill="#111" />
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 150 + i * 24
        return (
          <line key={`scale-${i}`} x1={x} y1={SPECTROMETER.y1 - 3} x2={x} y2={SPECTROMETER.y1 - 8} stroke={colors.neutral[50]} strokeWidth={1} />
        )
      })}

      {/* 历史撞击亮斑 (同位素条纹) */}
      <circle cx={350 - 2 * 0.01 * SCALE} cy={SPECTROMETER.y1} r={3} fill={PHYSICS_COLORS.velocity} opacity={0.5} />
      <text x={350 - 2 * 0.01 * SCALE} y={SPECTROMETER.y1 - 10} fontSize={smallFs} fill={colors.neutral[500]} textAnchor="middle">¹H⁺</text>
      <circle cx={350 - 2 * 0.02 * SCALE} cy={SPECTROMETER.y1} r={3} fill={PHYSICS_COLORS.velocity} opacity={0.5} />
      <text x={350 - 2 * 0.02 * SCALE} y={SPECTROMETER.y1 - 10} fontSize={smallFs} fill={colors.neutral[500]} textAnchor="middle">²H⁺/⁴He²⁺</text>

      {/* 粒子轨迹 */}
      {visibleTrajectory.length > 1 && (
        <polyline
          points={visibleTrajectory.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')}
          fill="none"
          stroke={spectrometer.balanced ? colors.success[500] : PHYSICS_COLORS.acceleration}
          strokeWidth={STROKE.trackLine}
        />
      )}

      {/* 当前撞击荧光点 */}
      {time >= 0.0001 && spectrometer.hitReason === 'film' && (
        <g>
          <circle cx={spectrometer.hitPoint?.x} cy={spectrometer.hitPoint?.y} r={8} fill={PHYSICS_COLORS.velocity} opacity={0.7} />
          <circle cx={spectrometer.hitPoint?.x} cy={spectrometer.hitPoint?.y} r={3} fill="#fff" />
        </g>
      )}

      {/* 文字标注 */}
      <text x={260} y={45} fontSize={smallFs} fill={colors.neutral[600]} fontFamily={CANVAS_STYLE.FONT.family}>
        速度选择器 (B₁ ⊥ 纸面向里)
      </text>
      <text x={180} y={280} fontSize={smallFs} fill={colors.neutral[600]} fontFamily={CANVAS_STYLE.FONT.family}>
        偏转磁场 B₂ (入纸面)
      </text>
      <text x={160} y={125} fontSize={smallFs} fill={colors.neutral[500]} fontWeight="bold">
        照相底片 (Film)
      </text>

      {/* 粒子球体 */}
      {visibleTrajectory.length > 0 && (
        <Ball cx={pos.x} cy={pos.y} r={6} type="steel" chargeSign={p.chargeSign} />
      )}

      {/* 受力矢量分析 */}
      {showVectors && time > 0 && time < 0.0001 && spectrometer.hitReason !== 'plate' && (
        <g>
          {renderArrow(pos.x, pos.y, 1, 0, p.q * E, REF_MAGNITUDES.electricForce, PHYSICS_COLORS.electricField, 'electricField', 'Fe')}
          {renderArrow(pos.x, pos.y, -1, 0, p.q * pos.v * B1, REF_MAGNITUDES.magneticForce, PHYSICS_COLORS.magneticField, 'magneticField', 'f_L')}
        </g>
      )}
    </g>
  )

  // 2. 模式 1 回旋加速器
  const { cx: ccx, cy: ccy } = CYCLOTRON
  const rMaxPx = 135
  const isCycGap = Math.abs(pos.x - ccx) <= 4

  // 回旋加速器 D形盒颜色闪烁与极性发光
  const leftDColor = useMemo(() => {
    if (!isCycGap) return withAlpha(CANVAS_COLORS.grid, 0.15)
    // 缝隙处判断电场极性
    const omega = (p.q * B2) / p.m
    const tHalf = Math.PI / omega
    const curHalfTurn = Math.floor(time / tHalf)
    const isLeftPositive = curHalfTurn % 2 === 0
    return isLeftPositive ? withAlpha(PHYSICS_COLORS.positiveCharge, 0.1) : withAlpha(PHYSICS_COLORS.negativeCharge, 0.1)
  }, [time, isCycGap, B2, p])

  const rightDColor = useMemo(() => {
    if (!isCycGap) return withAlpha(CANVAS_COLORS.grid, 0.15)
    const omega = (p.q * B2) / p.m
    const tHalf = Math.PI / omega
    const curHalfTurn = Math.floor(time / tHalf)
    const isLeftPositive = curHalfTurn % 2 === 0
    return isLeftPositive ? withAlpha(PHYSICS_COLORS.negativeCharge, 0.1) : withAlpha(PHYSICS_COLORS.positiveCharge, 0.1)
  }, [time, isCycGap, B2, p])

  const cyclotronScene = (
    <g>
      {/* 磁场背景 */}
      {Array.from({ length: 8 }).map((_, i) =>
        Array.from({ length: 3 }).map((_, j) => {
          const x = 180 + i * 50
          const y = 50 + j * 100
          return (
            <text key={`bcc-${i}-${j}`} x={x} y={y} textAnchor="middle" fontSize={labelFs} fill={PHYSICS_COLORS.magneticFieldCross} fontWeight="bold" opacity={0.3}>
              ×
            </text>
          )
        }),
      )}

      {/* D 形盒 (左、右) */}
      <path
        d={`M ${ccx - 3} ${ccy - rMaxPx} A ${rMaxPx} ${rMaxPx} 0 0 0 ${ccx - 3} ${ccy + rMaxPx} Z`}
        fill={leftDColor}
        stroke={colors.neutral[400]}
        strokeWidth={STROKE.objectLine}
      />
      <path
        d={`M ${ccx + 3} ${ccy - rMaxPx} A ${rMaxPx} ${rMaxPx} 0 0 1 ${ccx + 3} ${ccy + rMaxPx} Z`}
        fill={rightDColor}
        stroke={colors.neutral[400]}
        strokeWidth={STROKE.objectLine}
      />

      {/* 狭缝辅助电场线 (仅当粒子处于狭缝内且处于共振或播放时展示) */}
      {isCycGap && (
        <g>
          <line x1={ccx - 3} y1={pos.y} x2={ccx + 3} y2={pos.y} stroke={PHYSICS_COLORS.electricField} strokeWidth={3} />
          {renderArrow(
            pos.x,
            pos.y,
            pos.x >= ccx ? -1 : 1,
            0,
            p.q * U / 0.5,
            REF_MAGNITUDES.electricForce,
            PHYSICS_COLORS.electricField,
            'electricField',
            'E_gap',
          )}
        </g>
      )}

      {/* 轨道线 */}
      {visibleTrajectory.length > 1 && (
        <polyline
          points={visibleTrajectory.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')}
          fill="none"
          stroke={PHYSICS_COLORS.magneticField}
          strokeWidth={STROKE.trackHistory}
          opacity={0.6}
        />
      )}

      {/* 逃逸口 */}
      {cyclotron.escaped && (
        <text x={ccx} y={ccy} fontSize={labelFs} fill={colors.success[600]} fontWeight="bold" textAnchor="middle">
          ✓ 粒子高能出射 (Escaped)
        </text>
      )}

      {/* 粒子球体 */}
      {visibleTrajectory.length > 0 && (
        <Ball cx={pos.x} cy={pos.y} r={6} type="steel" chargeSign={p.chargeSign} />
      )}

      {/* 回旋加速器文字标注 */}
      <text x={ccx} y={ccy - rMaxPx - 10} fontSize={smallFs} fill={colors.neutral[600]} textAnchor="middle">
        回旋加速器 D-Box (B₂ ⊥ 纸面向里)
      </text>
    </g>
  )

  // 3. 模式 2 电偏转 + 磁偏转级联
  const deflectScene = (
    <g>
      {/* 偏转电场平行极板 */}
      <rect x={DEFLECT.xStart} y={DEFLECT.yMid - DEFLECT.plateHalf - 6} width={DEFLECT.xEnd - DEFLECT.xStart} height={6} fill={PHYSICS_COLORS.positiveCharge} />
      <rect x={DEFLECT.xStart} y={DEFLECT.yMid + DEFLECT.plateHalf} width={DEFLECT.xEnd - DEFLECT.xStart} height={6} fill={PHYSICS_COLORS.negativeCharge} />
      <text x={DEFLECT.xStart + 20} y={DEFLECT.yMid - DEFLECT.plateHalf - 12} fill={PHYSICS_COLORS.positiveCharge} fontSize={smallFs} fontWeight="bold">+</text>
      <text x={DEFLECT.xStart + 20} y={DEFLECT.yMid + DEFLECT.plateHalf + 20} fill={PHYSICS_COLORS.negativeCharge} fontSize={smallFs} fontWeight="bold">−</text>

      {/* 电场线 (竖直向下，黄) */}
      {Array.from({ length: 5 }).map((_, i) => {
        const x = DEFLECT.xStart + 30 + i * 50
        return (
          <g key={`d-e-line-${i}`}>
            <line
              x1={x}
              y1={DEFLECT.yMid - DEFLECT.plateHalf}
              x2={x}
              y2={DEFLECT.yMid + DEFLECT.plateHalf}
              stroke={PHYSICS_COLORS.electricFieldLine}
              strokeWidth={STROKE.fieldLine}
            />
            <path d={`M ${x - 3} ${DEFLECT.yMid} L ${x} ${DEFLECT.yMid + 5} L ${x + 3} ${DEFLECT.yMid} Z`} fill={PHYSICS_COLORS.electricFieldLine} />
          </g>
        )
      })}

      {/* 磁偏转区域背景 × */}
      {Array.from({ length: 6 }).map((_, i) =>
        Array.from({ length: 3 }).map((_, j) => {
          const x = DEFLECT.magneticB2StartX + 30 + i * 55
          const y = 50 + j * 100
          return (
            <text key={`db2-${i}-${j}`} x={x} y={y} textAnchor="middle" fontSize={labelFs} fill={PHYSICS_COLORS.magneticFieldCross} fontWeight="bold" opacity={0.3}>
              ×
            </text>
          )
        }),
      )}

      {/* 分界线与右侧荧光屏 */}
      <line x1={DEFLECT.magneticB2StartX} y1={20} x2={DEFLECT.magneticB2StartX} y2={310} stroke={colors.neutral[300]} strokeDasharray="4 4" />
      <rect x={DEFLECT.screenX} y={20} width={8} height={290} fill="#222" rx={2} />

      {/* 粒子轨迹 */}
      {visibleTrajectory.length > 1 && (
        <polyline
          points={visibleTrajectory.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')}
          fill="none"
          stroke={PHYSICS_COLORS.acceleration}
          strokeWidth={STROKE.trackLine}
        />
      )}

      {/* 粒子球体 */}
      {visibleTrajectory.length > 0 && (
        <Ball cx={pos.x} cy={pos.y} r={6} type="steel" chargeSign={p.chargeSign} />
      )}

      {/* 几何辅助线解析：粒子进入磁场区域 x > 300 且未撞板 */}
      {pos.x > DEFLECT.magneticB2StartX && deflect.hitReason !== 'plate' && (
        <g>
          {/* 圆心标记 O */}
          <circle cx={deflect.cx} cy={deflect.cy} r={3} fill={PHYSICS_COLORS.acceleration} />
          <text x={deflect.cx + 8} y={deflect.cy + 4} fill={PHYSICS_COLORS.acceleration} fontSize={smallFs} fontWeight="bold">O</text>
          
          {/* 圆心连向入射点与当前位置的虚线半径 */}
          <line
            x1={deflect.cx}
            y1={deflect.cy}
            x2={DEFLECT.magneticB2StartX}
            y2={DEFLECT.yMid - deflect.yOffsetPx}
            stroke={colors.neutral[400]}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <line
            x1={deflect.cx}
            y1={deflect.cy}
            x2={pos.x}
            y2={pos.y}
            stroke={colors.neutral[400]}
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {/* 入射点速度分解 */}
          <g transform={`translate(${DEFLECT.magneticB2StartX}, ${DEFLECT.yMid - deflect.yOffsetPx})`}>
            {/* 速度偏角标注 */}
            <path
              d={`M 30 0 A 30 30 0 0 1 ${30 * Math.cos(-deflect.theta)} ${30 * Math.sin(-deflect.theta)}`}
              fill="none"
              stroke={colors.neutral[500]}
              strokeWidth={1}
            />
            <text x={40} y={10} fill={colors.neutral[600]} fontSize={10}>θ</text>
            {/* 分速度 vx, vy */}
            <line x1={0} y1={0} x2={50} y2={0} stroke={PHYSICS_COLORS.velocity} strokeWidth={1} strokeDasharray="2 2" />
            <path d="M 47 -2 L 50 0 L 47 2 Z" fill={PHYSICS_COLORS.velocity} />
            <text x={53} y={3} fill={PHYSICS_COLORS.velocity} fontSize={9}>vx</text>

            <line x1={0} y1={0} x2={0} y2={-50 * Math.sin(-deflect.theta)} stroke={PHYSICS_COLORS.velocity} strokeWidth={1} strokeDasharray="2 2" />
            <path d={`M -2 ${-50 * Math.sin(-deflect.theta) + 3} L 0 ${-50 * Math.sin(-deflect.theta)} L 2 ${-50 * Math.sin(-deflect.theta) + 3} Z`} fill={PHYSICS_COLORS.velocity} />
            <text x={3} y={-50 * Math.sin(-deflect.theta) - 2} fill={PHYSICS_COLORS.velocity} fontSize={9}>vy</text>
          </g>
        </g>
      )}

      {/* 荧光屏撞击点亮斑 */}
      {time >= 0.0001 && deflect.hitReason === 'film' && (
        <g>
          <circle cx={deflect.hitPoint?.x} cy={deflect.hitPoint?.y} r={8} fill={colors.success[500]} opacity={0.6} />
          <circle cx={deflect.hitPoint?.x} cy={deflect.hitPoint?.y} r={3} fill="#fff" />
        </g>
      )}

      {/* 文字标注 */}
      <text x={100} y={50} fontSize={smallFs} fill={colors.neutral[600]} fontFamily={CANVAS_STYLE.FONT.family}>
        偏转电场 E
      </text>
      <text x={320} y={45} fontSize={smallFs} fill={colors.neutral[400]} fontFamily={CANVAS_STYLE.FONT.family}>
        分界线
      </text>
      <text x={450} y={50} fontSize={smallFs} fill={colors.neutral[600]} fontFamily={CANVAS_STYLE.FONT.family}>
        偏转磁场 B₂ (入纸面)
      </text>
      <text x={610} y={290} fontSize={smallFs} fill={colors.neutral[500]} fontWeight="bold">
        荧光屏
      </text>
    </g>
  )

  // 根据当前选择的 mode 激活场景
  const activeScene = activeStage === 0
    ? spectrometerScene
    : activeStage === 1
      ? cyclotronScene
      : deflectScene

  return (
    <div className="flex flex-col h-full w-full gap-2">
      {/* 1. 图表区（在上，高度 200px 保证分屏比例） */}
      <div className="h-[210px] w-full min-h-0 bg-white rounded-lg shadow-sm border border-neutral-200">
        {chartsSection}
      </div>

      {/* 2. 动画区（在下，自适应） */}
      <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        <svg
          viewBox={`0 0 ${DESIGN_W} ${DESIGN_H}`}
          preserveAspectRatio="xMidYMid meet"
          width="100%"
          height="100%"
          className="bg-white"
        >
          {activeScene}
        </svg>
      </div>
    </div>
  )
}
