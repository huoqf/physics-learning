import { useMemo } from 'react'
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_COLORS, STROKE, CANVAS_STYLE, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { VectorArrow, ParticleTrajectory, MagneticFieldSymbols } from '@/components/Physics'
import type { GridPoint } from '@/components/Physics/MagneticFieldGrid'
import { centripetalForceDir, electricForceDir } from '@/physics/magnetism/forces'
import { svgPointToPhysicsPoint } from '@/utils/coordinate'
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

const REF_MAGNITUDES = {
  electricForce: 2e-15,
  magneticForce: 2e-15,
  acceleration: 4e7,
}

/** 与注册表 maxTime 一致，全局 time 范围 0~10 秒 */
const MAX_TIME = 10

export default function CombinedFieldsAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    })),
  )

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
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
  const showAngles = !!(params.showAngles ?? 0)

  const p = PARTICLES[particleType] ?? PARTICLES[0]
  const omegaAC = 2 * Math.PI * (acFreqkHz * 1000)

  // ── 预计算仿真 ──
  const spectrometer = useMemo(() => {
    return buildSpectrometerSimulation(E, B1, B2, vParticle, particleType)
  }, [E, B1, B2, vParticle, particleType])

  const cyclotron = useMemo(() => {
    return buildCyclotronSimulation(B2, U, acFreqkHz * 1000, resonanceLock)
  }, [B2, U, acFreqkHz, resonanceLock])

  const deflect = useMemo(() => {
    return buildDeflectSimulation(E, B2, vParticle, particleType)
  }, [E, B2, vParticle, particleType])

  const sim = useMemo(() => {
    if (activeStage === 0) return spectrometer
    if (activeStage === 1) return cyclotron
    return deflect
  }, [activeStage, spectrometer, cyclotron, deflect])

  // 全局 time (0~MAX_TIME 秒) 归一化映射到物理时间 (0~sim.endTime 秒)
  const timeSec = useMemo(() => {
    return sim.endTime > 0 ? (time / MAX_TIME) * sim.endTime : 0
  }, [time, sim.endTime])

  const pos = useMemo(() => {
    return getPositionAt(sim.trajectory, timeSec)
  }, [sim.trajectory, timeSec])

  // ── 动态轨迹 ──
  const visibleTrajectory = useMemo(() => {
    return sim.trajectory.filter((pt) => pt.t <= timeSec)
  }, [sim.trajectory, timeSec])

  // 完整理论预测轨迹（全路径，用于底层虚线参考）
  const predictedPoints = useMemo(() => {
    return sim.trajectory.map((pt) => ({ x: pt.x, y: pt.y }))
  }, [sim.trajectory])

  // 短拖尾（取最近 8 个已走过的点，用于运动增强）
  const tailPoints = useMemo(() => {
    const tailLen = Math.min(8, visibleTrajectory.length)
    return visibleTrajectory.slice(-tailLen).map((pt) => ({ x: pt.x, y: pt.y }))
  }, [visibleTrajectory])

  // 历史轨迹点集（已走过的路径）
  const historyPoints = useMemo(() => {
    return visibleTrajectory.map((pt) => ({ x: pt.x, y: pt.y }))
  }, [visibleTrajectory])

  // ── 磁场符号预计算点 ──
  const b1Points = useMemo<GridPoint[]>(() => {
    const pts: GridPoint[] = []
    const startX = SPECTROMETER.xMid - SPECTROMETER.plateHalf + 18
    const startY = SPECTROMETER.y0 + 20
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        pts.push({ x: startX + i * 40, y: startY + j * 35 })
      }
    }
    return pts
  }, [])

  const b2DotPoints = useMemo<GridPoint[]>(() => {
    const pts: GridPoint[] = []
    const startY = SPECTROMETER.y1 + 30
    for (let i = 0; i < 10; i++) {
      const x = 80 + i * 50
      if (x >= 350) break
      for (let j = 0; j < 3; j++) {
        pts.push({ x, y: startY + j * 50 })
      }
    }
    return pts
  }, [])

  const b2CrossPoints = useMemo<GridPoint[]>(() => {
    const pts: GridPoint[] = []
    const startX = DEFLECT.magneticB2StartX + 30
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        pts.push({ x: startX + i * 55, y: 50 + j * 100 })
      }
    }
    return pts
  }, [])

  const cyclotronBFieldPoints = useMemo<GridPoint[]>(() => {
    const pts: GridPoint[] = []
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 3; j++) {
        pts.push({ x: 180 + i * 50, y: 50 + j * 100 })
      }
    }
    return pts
  }, [])

  // ── 矢量箭头助手 ──
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
        originPixel={{ x: 0, y: 0 }}
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

  // ───────────── 场景渲染 ─────────────

  // 1. 模式 0：质谱仪
  const spectrometerScene = (
    <g>
      {/* 速度选择器中轴轨道虚线 */}
      <line
        x1={SPECTROMETER.xMid}
        y1={SPECTROMETER.y0}
        x2={SPECTROMETER.xMid}
        y2={SPECTROMETER.y1}
        stroke={colors.neutral[300]}
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* 速度选择器极板（垂直，下边界拉升至 130，防重叠） */}
      <rect x={SPECTROMETER.xMid - SPECTROMETER.plateHalf - 6} y={SPECTROMETER.y0} width={6} height={SPECTROMETER.y1 - SPECTROMETER.y0} fill={PHYSICS_COLORS.positiveCharge} rx={1} />
      <rect x={SPECTROMETER.xMid + SPECTROMETER.plateHalf} y={SPECTROMETER.y0} width={6} height={SPECTROMETER.y1 - SPECTROMETER.y0} fill={PHYSICS_COLORS.negativeCharge} rx={1} />
      
      {/* 极板正负号 */}
      <text x={SPECTROMETER.xMid - SPECTROMETER.plateHalf - 12} y={SPECTROMETER.y0 + 20} fill={PHYSICS_COLORS.positiveCharge} fontSize={smallFs} fontWeight="bold" textAnchor="middle">+</text>
      <text x={SPECTROMETER.xMid + SPECTROMETER.plateHalf + 12} y={SPECTROMETER.y0 + 20} fill={PHYSICS_COLORS.negativeCharge} fontSize={smallFs} fontWeight="bold" textAnchor="middle">−</text>

      {/* 电场线 (黄，向右) */}
      {Array.from({ length: 4 }).map((_, i) => {
        const y = SPECTROMETER.y0 + 15 + i * 26
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

      {/* 选择器磁场 B1 ⊙ (出纸面，绿色) */}
      <MagneticFieldSymbols points={b1Points} direction="out" radius={6} strokeWidth={1.2} opacity={0.65} />

      {/* 速度选择器底端孔与挡板 (y = 130，完全在水平方向与底片错开) */}
      <line x1={40} y1={SPECTROMETER.y1} x2={SPECTROMETER.xMid - SPECTROMETER.slitR} y2={SPECTROMETER.y1} stroke={CANVAS_COLORS.annotation} strokeWidth={3} />
      <line x1={SPECTROMETER.xMid + SPECTROMETER.slitR} y1={SPECTROMETER.y1} x2={650} y2={SPECTROMETER.y1} stroke={CANVAS_COLORS.annotation} strokeWidth={3} />

      {/* 偏转磁场 B2 背景 ⊙ (出纸面) */}
      <MagneticFieldSymbols points={b2DotPoints} direction="out" radius={7} strokeWidth={1.2} opacity={0.5} />

      {/* 照相底片 & 刻度尺 (水平范围 40 ~ 300，彻底避免与极板重叠) */}
      <rect x={40} y={SPECTROMETER.y1 - 3} width={260} height={5} fill="#111" />
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 40 + i * 30
        return (
          <line key={`scale-${i}`} x1={x} y1={SPECTROMETER.y1 - 3} x2={x} y2={SPECTROMETER.y1 - 8} stroke={colors.neutral[50]} strokeWidth={1} />
        )
      })}

      {/* 历史同位素落点亮斑参考 */}
      <circle cx={200} cy={SPECTROMETER.y1} r={3} fill={PHYSICS_COLORS.velocity} opacity={0.4} />
      <text x={200} y={SPECTROMETER.y1 - 10} fontSize={font(9)} fill={colors.neutral[400]} textAnchor="middle">¹H⁺</text>
      <circle cx={50} cy={SPECTROMETER.y1} r={3} fill={PHYSICS_COLORS.displacement} opacity={0.4} />
      <text x={50} y={SPECTROMETER.y1 - 10} fontSize={font(9)} fill={colors.neutral[400]} textAnchor="middle">²H⁺</text>

      {/* 粒子轨迹（统一组件：预测虚线 + 历史虚线 + 拖尾 + 本体） */}
      {visibleTrajectory.length > 0 && (
        <ParticleTrajectory
          historyPoints={historyPoints}
          predictedPoints={predictedPoints}
          tailPoints={tailPoints}
          isFocus
          chargeSign={p.chargeSign}
          customBaseColor={spectrometer.balanced ? colors.success[500] : PHYSICS_COLORS.acceleration}
        />
      )}

      {/* 当前落点荧光标记和标尺 (y = 130) */}
      {pos.y >= SPECTROMETER.y1 && spectrometer.hitReason === 'film' && (
        <g>
          {/* 落点高亮 */}
          <circle cx={spectrometer.hitPoint?.x} cy={spectrometer.hitPoint?.y} r={7} fill={PHYSICS_COLORS.velocity} opacity={0.7} />
          <circle cx={spectrometer.hitPoint?.x} cy={spectrometer.hitPoint?.y} r={2} fill="#fff" />
          
          {/* 半径测量辅助标尺线 */}
          <line x1={spectrometer.hitPoint?.x} y1={SPECTROMETER.y1 + 10} x2={SPECTROMETER.xMid} y2={SPECTROMETER.y1 + 10} stroke={PHYSICS_COLORS.displacement} strokeWidth={1.2} />
          <line x1={spectrometer.hitPoint?.x} y1={SPECTROMETER.y1 + 6} x2={spectrometer.hitPoint?.x} y2={SPECTROMETER.y1 + 14} stroke={PHYSICS_COLORS.displacement} strokeWidth={1.2} />
          <line x1={SPECTROMETER.xMid} y1={SPECTROMETER.y1 + 6} x2={SPECTROMETER.xMid} y2={SPECTROMETER.y1 + 14} stroke={PHYSICS_COLORS.displacement} strokeWidth={1.2} />
          
          {/* 测量文字 */}
          <text
            x={((spectrometer.hitPoint?.x ?? 0) + SPECTROMETER.xMid) / 2}
            y={SPECTROMETER.y1 + 24}
            fontSize={font(10)}
            fill={PHYSICS_COLORS.displacement}
            textAnchor="middle"
            fontWeight="bold"
          >
            测量直径 2R = {((SPECTROMETER.xMid - (spectrometer.hitPoint?.x ?? 0)) / SCALE).toFixed(4)} m
          </text>

          {/* 高考知识连线提示 - 移至右侧屏 */}
          <rect x={520} y={SPECTROMETER.y1 + 10} width={120} height={28} rx={3} fill="rgba(255, 255, 255, 0.95)" stroke={colors.neutral[200]} strokeWidth={0.5} />
          <text
            x={580}
            y={SPECTROMETER.y1 + 27}
            fontSize={font(9)}
            fill={colors.neutral[600]}
            textAnchor="middle"
            fontWeight="medium"
          >
            R = mv/(qB₂) ∝ m/q
          </text>
        </g>
      )}

      {/* 文字标注 */}
      <text x={260} y={45} fontSize={smallFs} fill={colors.neutral[600]} fontFamily={CANVAS_STYLE.FONT.family}>
        速度选择器
      </text>
      <text x={120} y={118} fontSize={smallFs} fill={colors.neutral[500]} fontWeight="bold">
        照相底片 (Film)
      </text>

      {/* 受力矢量分析 (高考重点：在磁场偏转区只画指向圆心的洛伦兹力向心力，排除电场力) */}
      {showVectors && time > 0 && (
        <g>
          {pos.y < SPECTROMETER.y1 ? (
            // 速度选择器受力 (电场力 F_e + 洛伦兹力 f_L)
            spectrometer.hitReason !== 'plate' && (
              <g>
                {/* 电场力：正电荷向右，负电荷向左 */}
                {renderArrow(pos.x, pos.y, p.q > 0 ? 1 : -1, 0, Math.abs(p.q) * E, REF_MAGNITUDES.electricForce, PHYSICS_COLORS.electricField, 'electricField', 'Fe')}
                {/* 洛伦兹力：正电荷向左，负电荷向右（与电场力反向） */}
                {renderArrow(pos.x, pos.y, p.q > 0 ? -1 : 1, 0, Math.abs(p.q) * pos.v * B1, REF_MAGNITUDES.magneticForce, PHYSICS_COLORS.magneticField, 'magneticField', 'f_L')}

                {/* 合外力 */}
                {!spectrometer.balanced && (
                  renderArrow(
                    pos.x,
                    pos.y,
                    Math.sign(p.q * E - p.q * pos.v * B1),
                    0,
                    Math.abs(Math.abs(p.q) * E - Math.abs(p.q) * pos.v * B1),
                    REF_MAGNITUDES.electricForce,
                    colors.accent[500],
                    'acceleration',
                    'F_合'
                  )
                )}
              </g>
            )
          ) : (
            // 偏转磁场受力 (仅洛伦兹力 f_L2 作为向心力指向圆心，无电场力)
            spectrometer.hitReason === 'film' && (
              (() => {
                // B₂出纸面⊙：正电荷向下运动 → 圆心在左侧；负电荷在右侧
                const isNegativeCharge = p.q < 0
                const cx = isNegativeCharge ? SPECTROMETER.xMid + spectrometer.rPx : SPECTROMETER.xMid - spectrometer.rPx
                const cy = SPECTROMETER.y1
                // SVG→物理坐标转换后调用纯函数（VectorArrow 使用物理坐标系 y↑正）
                const dir = centripetalForceDir(
                  svgPointToPhysicsPoint({ x: pos.x, y: pos.y }),
                  svgPointToPhysicsPoint({ x: cx, y: cy }),
                )
                return renderArrow(
                  pos.x,
                  pos.y,
                  dir.x || 1,
                  dir.y,
                  Math.abs(p.q) * pos.v * B2,
                  REF_MAGNITUDES.magneticForce,
                  PHYSICS_COLORS.magneticField,
                  'magneticField',
                  'f_L'
                )
              })()
            )
          )}
        </g>
      )}
    </g>
  )

  // 2. 模式 1：回旋加速器
  const { cx: ccx, cy: ccy } = CYCLOTRON
  const rMaxPx = 135
  const isCycGap = Math.abs(pos.x - ccx) <= 4

  const isLeftPositive = Math.sin(omegaAC * timeSec) >= 0

  const leftDColor = useMemo(() => {
    return isLeftPositive ? withAlpha(PHYSICS_COLORS.positiveCharge, 0.1) : withAlpha(PHYSICS_COLORS.negativeCharge, 0.05)
  }, [isLeftPositive])

  const rightDColor = useMemo(() => {
    return !isLeftPositive ? withAlpha(PHYSICS_COLORS.positiveCharge, 0.1) : withAlpha(PHYSICS_COLORS.negativeCharge, 0.05)
  }, [isLeftPositive])

  const cyclotronScene = (
    <g>
      {/* 磁场背景 */}
      <MagneticFieldSymbols points={cyclotronBFieldPoints} direction="in" opacity={0.3} />

      {/* 理想回旋半圆轨道对比线 (高考：半径越来越密) */}
      {Array.from({ length: 6 }).map((_, idx) => {
        const n = idx + 1
        const r1 = 48
        const rn = r1 * Math.sqrt(n)
        if (rn > rMaxPx) return null
        return (
          <g key={`ideal-orbit-${n}`} opacity={0.15}>
            <path
              d={`M ${ccx + 3} ${ccy - rn} A ${rn} ${rn} 0 0 1 ${ccx + 3} ${ccy + rn}`}
              fill="none"
              stroke={colors.neutral[500]}
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <path
              d={`M ${ccx - 3} ${ccy + rn} A ${rn} ${rn} 0 0 1 ${ccx - 3} ${ccy - rn}`}
              fill="none"
              stroke={colors.neutral[500]}
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            {(n === 1 || n === 3) && (
              <text x={ccx + rn + 4} y={ccy - 2} fontSize={font(9)} fill={colors.neutral[500]} textAnchor="start">
                R_{n}
              </text>
            )}
          </g>
        )
      })}

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

      {/* 极板边缘极性动态文本 */}
      <text x={ccx - 18} y={ccy + 6} fontSize={font(20)} fill={isLeftPositive ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge} textAnchor="middle" fontWeight="black" opacity={0.7}>
        {isLeftPositive ? '+' : '−'}
      </text>
      <text x={ccx + 18} y={ccy + 6} fontSize={font(20)} fill={!isLeftPositive ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge} textAnchor="middle" fontWeight="black" opacity={0.7}>
        {!isLeftPositive ? '+' : '−'}
      </text>

      {/* D形金属盒外框文字标注 */}
      <text x={ccx - 70} y={ccy - rMaxPx - 8} fontSize={font(10)} fill={colors.neutral[500]} textAnchor="middle">D₁金属盒</text>
      <text x={ccx + 70} y={ccy - rMaxPx - 8} fontSize={font(10)} fill={colors.neutral[500]} textAnchor="middle">D₂金属盒</text>

      {/* 狭缝辅助交变电场线 */}
      {Array.from({ length: 5 }).map((_, idx) => {
        const y = ccy - 120 + idx * 60
        const arrowDx = isLeftPositive ? 1 : -1
        return (
          <g key={`gap-e-${idx}`} opacity={0.4}>
            <line x1={ccx - 3} y1={y} x2={ccx + 3} y2={y} stroke={PHYSICS_COLORS.electricFieldLine} strokeWidth={1.5} />
            <path
              d={arrowDx > 0 ? `M ${ccx - 1} ${y - 3} L ${ccx + 2} ${y} L ${ccx - 1} ${y + 3}` : `M ${ccx + 1} ${y - 3} L ${ccx - 2} ${y} L ${ccx + 1} ${y + 3}`}
              fill={PHYSICS_COLORS.electricFieldLine}
            />
          </g>
        )}
      )}

      {/* 加速受力矢量 (仅粒子在狭缝中时渲染) */}
      {isCycGap && (
        <g>
          <line x1={ccx - 3} y1={pos.y} x2={ccx + 3} y2={pos.y} stroke={PHYSICS_COLORS.electricField} strokeWidth={3} />
          {renderArrow(
            pos.x,
            pos.y,
            isLeftPositive ? 1 : -1,
            0,
            p.q * U / 0.006,
            REF_MAGNITUDES.electricForce,
            PHYSICS_COLORS.electricField,
            'electricField',
            'F_e'
          )}
        </g>
      )}

      {/* 粒子轨迹（统一组件：预测虚线 + 历史虚线 + 拖尾 + 本体） */}
      {visibleTrajectory.length > 0 && (
        <ParticleTrajectory
          historyPoints={historyPoints}
          predictedPoints={predictedPoints}
          tailPoints={tailPoints}
          isFocus
          chargeSign={p.chargeSign}
          customBaseColor={PHYSICS_COLORS.magneticField}
        />
      )}

      {/* 逃逸口与提示：仅在动画进度抵达轨迹末尾时显示 */}
      {cyclotron.escaped && timeSec >= cyclotron.endTime * 0.95 && (
        <g transform={`translate(${ccx}, ${ccy - 20})`}>
          <rect x={-90} y={-15} width={180} height={30} rx={4} fill="rgba(255, 255, 255, 0.9)" stroke={colors.success[200]} strokeWidth={1} />
          <text fontSize={font(10)} fill={colors.success[600]} fontWeight="bold" textAnchor="middle" y={4}>
            ✓ 达到最大半径，粒子出射
          </text>
        </g>
      )}

      {/* 底部高考重点结论面板 */}
      <g transform={`translate(${ccx - 140}, ${ccy + rMaxPx + 15})`}>
        <rect width={280} height={20} rx={3} fill={colors.neutral[100]} />
        <text x={140} y={13} fontSize={font(9)} fill={colors.neutral[600]} textAnchor="middle" fontWeight="bold">
          交变电场频率 f_AC = qB / (2πm) = {cyclotron.fMag > 0 ? (cyclotron.fMag / 1000).toFixed(1) : 0} kHz
        </text>
      </g>
    </g>
  )

  // 3. 模式 2：电偏转 + 磁偏转级联
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

      {/* 磁偏转区域背景 ×（入纸面） */}
      <MagneticFieldSymbols points={b2CrossPoints} direction="in" opacity={0.3} />

      {/* 分界线与右侧荧光屏 */}
      <line x1={DEFLECT.magneticB2StartX} y1={20} x2={DEFLECT.magneticB2StartX} y2={310} stroke={colors.neutral[300]} strokeDasharray="4 4" />
      <rect x={DEFLECT.screenX} y={20} width={8} height={290} fill="#222" rx={2} />

      {/* 粒子轨迹（统一组件：预测虚线 + 历史虚线 + 拖尾 + 本体） */}
      {visibleTrajectory.length > 0 && (
        <ParticleTrajectory
          historyPoints={historyPoints}
          predictedPoints={predictedPoints}
          tailPoints={tailPoints}
          isFocus
          chargeSign={p.chargeSign}
        />
      )}

      {/* 电偏转模式受力矢量 */}
      {showVectors && time > 0 && pos.x < DEFLECT.magneticB2StartX && deflect.hitReason !== 'plate' && (
        <g>
          {/* 电场力：上极板+下极板-，E 向下(物理坐标 {0,-1})，正电荷同向、负电荷反向 */}
          {(() => {
            const dir = electricForceDir({ x: 0, y: -1 }, p.q)
            return renderArrow(
              pos.x,
              pos.y,
              dir.x,
              dir.y,
              Math.abs(p.q) * E,
              REF_MAGNITUDES.electricForce,
              PHYSICS_COLORS.electricField,
              'electricField',
              'F_E'
            )
          })()}
        </g>
      )}

      {/* 磁偏转模式受力矢量 */}
      {showVectors && time > 0 && pos.x >= DEFLECT.magneticB2StartX && deflect.hitReason !== 'plate' && (
        <g>
          {/* 洛伦兹力 = 向心力，指向圆心 */}
          {(() => {
            // SVG→物理坐标转换后调用纯函数
            const dir = centripetalForceDir(
              svgPointToPhysicsPoint({ x: pos.x, y: pos.y }),
              svgPointToPhysicsPoint({ x: deflect.cx, y: deflect.cy }),
            )
            return renderArrow(
              pos.x,
              pos.y,
              dir.x,
              dir.y || 1,
              Math.abs(p.q) * pos.v * B2,
              REF_MAGNITUDES.magneticForce,
              PHYSICS_COLORS.magneticField,
              'magneticField',
              'f_L'
            )
          })()}
        </g>
      )}

      {/* 几何辅助线解析：粒子进入磁场区域 (高考二级结论) */}
      {pos.x >= DEFLECT.magneticB2StartX && deflect.hitReason !== 'plate' && (
        <g>
          {/* 类平抛运动末速度反向延长线必过电场中点 */}
          <line
            x1={DEFLECT.magneticB2StartX}
            y1={DEFLECT.yMid + deflect.yOffsetPx}
            x2={175}
            y2={DEFLECT.yMid}
            stroke={colors.accent[500]}
            strokeWidth={1.2}
            strokeDasharray="3 3"
          />
          {/* 电板中线焦点标记 */}
          <circle cx={175} cy={DEFLECT.yMid} r={4} fill={colors.accent[500]} stroke="#fff" strokeWidth={1} />
          <text x={175} y={DEFLECT.yMid + 16} fontSize={font(9)} fill={colors.accent[600]} textAnchor="middle" fontWeight="bold">
            极板中点 (L/2)
          </text>
          
          {/* 二级结论文字框 */}
          <g transform="translate(60, 240)">
            <rect width={175} height={22} rx={3} fill="rgba(255, 255, 255, 0.9)" stroke={colors.accent[200]} strokeWidth={0.5} />
            <text x={87} y={14} fontSize={font(9)} fill={colors.accent[600]} textAnchor="middle" fontWeight="bold">
              末速度反向延长线必过电场中点
            </text>
          </g>

          {/* 圆心标记 O */}
          <circle cx={deflect.cx} cy={deflect.cy} r={3} fill={PHYSICS_COLORS.acceleration} />
          <text x={deflect.cx + 8} y={deflect.cy + 4} fill={PHYSICS_COLORS.acceleration} fontSize={smallFs} fontWeight="bold">O</text>
          
          {/* 圆心连线半径 */}
          <line
            x1={deflect.cx}
            y1={deflect.cy}
            x2={DEFLECT.magneticB2StartX}
            y2={DEFLECT.yMid + deflect.yOffsetPx}
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

          {/* 磁场偏向角几何扇形填充（受 showAngles 控制） */}
          {showAngles && (() => {
            const cx = deflect.cx
            const cy = deflect.cy
            const r = deflect.rPx
            const isNegativeCharge = p.q < 0
            const omega = Math.abs(p.q) * B2 / p.m

            // 入射点角度（与模型计算一致）
            const entryX = DEFLECT.magneticB2StartX
            const entryY = DEFLECT.yMid + deflect.yOffsetPx
            const phiStart = Math.atan2(entryY - cy, entryX - cx)

            // 电场区结束时间：从轨迹获取最后一个 x <= magneticB2StartX 的点
            const electricPts = deflect.trajectory.filter(pt => pt.x <= DEFLECT.magneticB2StartX)
            const tElectricEnd = electricPts.length > 0 ? electricPts[electricPts.length - 1].t : 0
            const tElapsed = Math.max(0, timeSec - tElectricEnd)

            // B₂ 入纸面：正电荷顺时针（phi 减小），负电荷逆时针（phi 增加）
            const phiCurr = isNegativeCharge ? phiStart + omega * tElapsed : phiStart - omega * tElapsed

            const xs = cx + r * Math.cos(phiStart)
            const ys = cy + r * Math.sin(phiStart)
            const xc = cx + r * Math.cos(phiCurr)
            const yc = cy + r * Math.sin(phiCurr)

            return (
              <path
                d={`M ${cx} ${cy} L ${xs} ${ys} A ${r} ${r} 0 0 ${isNegativeCharge ? 1 : 0} ${xc} ${yc} Z`}
                fill={withAlpha(PHYSICS_COLORS.acceleration, 0.12)}
                stroke="none"
              />
            )
          })()}

          {/* 偏向角与圆心角文字看板（受 showAngles 控制） */}
          {showAngles && (
            <g transform={`translate(${deflect.cx - 90}, ${Math.min(deflect.cy + 35, 280)})`}>
              <rect width={180} height={22} rx={3} fill="rgba(255, 255, 255, 0.9)" stroke={PHYSICS_COLORS.acceleration} strokeWidth={0.5} />
              <text x={90} y={14} fontSize={font(9)} fill={PHYSICS_COLORS.acceleration} textAnchor="middle" fontWeight="bold">
                圆心角 α = 偏向角 θ = {(deflect.theta * 180 / Math.PI).toFixed(1)}°
              </text>
            </g>
          )}

          {/* 入射点速度分解 */}
          <g transform={`translate(${DEFLECT.magneticB2StartX}, ${DEFLECT.yMid + deflect.yOffsetPx})`}>
            <path
              d={`M 30 0 A 30 30 0 0 1 ${30 * Math.cos(deflect.theta)} ${30 * Math.sin(deflect.theta)}`}
              fill="none"
              stroke={colors.neutral[500]}
              strokeWidth={1}
            />
            <text x={38} y={10} fill={colors.neutral[600]} fontSize={9}>θ</text>

            <line x1={0} y1={0} x2={40} y2={0} stroke={PHYSICS_COLORS.velocity} strokeWidth={1} strokeDasharray="2 2" />
            <path d="M 38 -2 L 41 0 L 38 2 Z" fill={PHYSICS_COLORS.velocity} />
            <text x={44} y={3} fill={PHYSICS_COLORS.velocity} fontSize={9}>vx</text>

            <line x1={0} y1={0} x2={0} y2={40 * Math.sin(deflect.theta)} stroke={PHYSICS_COLORS.velocity} strokeWidth={1} strokeDasharray="2 2" />
            <path d={`M -2 ${40 * Math.sin(deflect.theta) - 3} L 0 ${40 * Math.sin(deflect.theta)} L 2 ${40 * Math.sin(deflect.theta) - 3} Z`} fill={PHYSICS_COLORS.velocity} />
            <text x={3} y={40 * Math.sin(deflect.theta) + 12} fill={PHYSICS_COLORS.velocity} fontSize={9}>vy</text>
          </g>
        </g>
      )}

      {/* 荧光屏撞击点亮斑 */}
      {timeSec >= sim.endTime * 0.95 && deflect.hitReason === 'film' && (
        <g>
          <circle cx={deflect.hitPoint?.x} cy={deflect.hitPoint?.y} r={7} fill={colors.success[500]} opacity={0.6} />
          <circle cx={deflect.hitPoint?.x} cy={deflect.hitPoint?.y} r={2} fill="#fff" />
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

  // 根据当前 mode 激活相应场景
  const activeScene = activeStage === 0
    ? spectrometerScene
    : activeStage === 1
      ? cyclotronScene
      : deflectScene

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      className="bg-white"
    >
      {activeScene}
    </AnimationSvgCanvas>
  )
}
