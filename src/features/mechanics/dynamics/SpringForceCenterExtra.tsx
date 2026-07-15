/**
 * 弹力演示 — 中屏扩展区域组件
 *
 * 职责：
 *   - mode=0（胡克定律）：上方 F-x 图表与弹性势能面积图
 *   - mode=1（绳与弹簧）：右侧四球加速度对比柱状图
 * 约束：调用纯物理函数，零内联公式。
 */

import { useRef, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'

import { RelationChart, ChartArea } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'
import {
  calculateHookeLawState,
  calculateCutRopeState,
  calculateBallBFallTime,
  calculateElasticNormalForceState,
  calculateElasticTensionState,
} from '@/physics/dynamics/spring-force'
import { CUT_ROPE_DESIGN, HOOKE_DESIGN } from './hooks/useSpringForceCutRope'

export default function SpringForceCenterExtra() {
  const { params, time, animationType } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      animationType: s.animationType,
    })),
  )

  const k = params.k ?? 100
  const m = params.m ?? 1
  const isCut = params.isCut ?? 0

  // 弹力演示：胡克定律模式；轻质物体突变模型：切断模式
  const isHookeLaw = animationType === 'anim-spring-force'
  const mode = params.mode ?? 0

  if (isHookeLaw) {
    if (mode === 0) {
      return <HookeLawChart k={k} m={m} time={time} />
    } else if (mode === 1) {
      return <NormalForceChart kAtoms={params.kAtoms ?? 120} m={m} />
    } else {
      return <TensionForceChart kRope={params.kRope ?? 150} m={m} />
    }
  }

  return <CutRopeAccelerationChart k={k} m={m} time={time} isCut={isCut} />
}

// ─── 胡克定律 F-x 图表 ──────────────────────────────────────────────────

function HookeLawChart({ k, m, time }: { k: number; m: number; time: number }) {
  const state = calculateHookeLawState(k, m, time, 0.5, HOOKE_DESIGN.eqX)
  const displacement = state.displacement
  const potentialEnergy = state.potentialEnergy

  const amplitude = 0.5
  const maxForce = k * amplitude

  const hookePoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i <= 50; i++) {
      const x = (i / 50) * (2 * amplitude) - amplitude
      pts.push({ x, y: -k * x })
    }
    return pts
  }, [k])

  const energyAreaPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const end = displacement
    if (Math.abs(end) < 1e-9) return pts
    const step = end / 30
    for (let i = 0; i <= 30; i++) {
      const x = i * step
      pts.push({ x, y: -k * x })
    }
    return pts
  }, [k, displacement])

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-inner p-3 relative">
      <div className="text-sm font-bold mb-2 flex-shrink-0">F-x 关系图与弹性势能</div>
      <RelationChart
        points={hookePoints}
        xDomain={[-amplitude, amplitude]}
        yDomain={[-maxForce, maxForce]}
        xLabel="位移 x (m)"
        yLabel="弹力 F (N)"
        cursorX={displacement}
        cursorLabel={(x, y) => `x=${x.toFixed(2)}m, F=${y.toFixed(1)}N`}
        showZeroLine
        underlay={
          <ChartArea
            points={energyAreaPoints}
            xRange={displacement >= 0 ? [0, displacement] : [displacement, 0]}
            variant="default"
            intensity="normal"
          />
        }
      />
      <div className="text-xs text-gray-500 mt-2 flex-shrink-0">
        蓝色面积 = 弹性势能 Ep = {potentialEnergy.toFixed(2)} J
      </div>
    </div>
  )
}

// ─── 支持力-形变量图表 ─────────────────────────────────────────────────

function NormalForceChart({ kAtoms, m }: { kAtoms: number; m: number }) {
  const { displacement } = useMemo(() => {
    return calculateElasticNormalForceState(m, kAtoms)
  }, [m, kAtoms])

  const xMax = 0.6
  const yMax = 40

  const normalPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const step = xMax / 30
    for (let i = 0; i <= 30; i++) {
      const x = i * step
      pts.push({ x, y: kAtoms * x })
    }
    return pts
  }, [kAtoms])

  const areaPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const end = displacement
    if (end < 1e-9) return pts
    const step = end / 20
    for (let i = 0; i <= 20; i++) {
      const x = i * step
      pts.push({ x, y: kAtoms * x })
    }
    return pts
  }, [kAtoms, displacement])

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-inner p-3 relative">
      <div className="text-sm font-bold mb-2 flex-shrink-0">支持力 - 桌面压缩量关系图</div>
      <RelationChart
        points={normalPoints}
        xDomain={[0, xMax]}
        yDomain={[0, yMax]}
        xLabel="形变量 x (m)"
        yLabel="支持力 FN (N)"
        cursorX={displacement}
        cursorLabel={(x, y) => `x=${x.toFixed(3)}m, FN=${y.toFixed(1)}N`}
        underlay={
          <ChartArea
            points={areaPoints}
            xRange={[0, displacement]}
            variant="default"
            intensity="normal"
          />
        }
      />
    </div>
  )
}

// ─── 绳拉力-形变量图表 ─────────────────────────────────────────────────

function TensionForceChart({ kRope, m }: { kRope: number; m: number }) {
  const { displacement } = useMemo(() => {
    return calculateElasticTensionState(m, kRope)
  }, [m, kRope])

  const xMax = 0.6
  const yMax = 40

  const tensionPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const step = xMax / 30
    for (let i = 0; i <= 30; i++) {
      const x = i * step
      pts.push({ x, y: kRope * x })
    }
    return pts
  }, [kRope])

  const areaPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const end = displacement
    if (end < 1e-9) return pts
    const step = end / 20
    for (let i = 0; i <= 20; i++) {
      const x = i * step
      pts.push({ x, y: kRope * x })
    }
    return pts
  }, [kRope, displacement])

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-inner p-3 relative">
      <div className="text-sm font-bold mb-2 flex-shrink-0">拉力 - 绳子拉伸量关系图</div>
      <RelationChart
        points={tensionPoints}
        xDomain={[0, xMax]}
        yDomain={[0, yMax]}
        xLabel="伸长量 Δx (m)"
        yLabel="拉力 T (N)"
        cursorX={displacement}
        cursorLabel={(x, y) => `Δx=${x.toFixed(3)}m, T=${y.toFixed(1)}N`}
        underlay={
          <ChartArea
            points={areaPoints}
            xRange={[0, displacement]}
            variant="default"
            intensity="normal"
          />
        }
      />
    </div>
  )
}

// ─── 绳与弹簧切断加速度对比 ─────────────────────────────────────────────

function CutRopeAccelerationChart({
  k,
  m,
  time,
  isCut,
}: {
  k: number
  m: number
  time: number
  isCut: number
}) {
  const { canvasSize } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })
  const { font } = canvasSize

  // 独立的剪断时间戳管理（与场景组件同步但独立）
  const tCutStartRef = useRef<number | null>(null)
  if (isCut === 1) {
    if (tCutStartRef.current === null || time < tCutStartRef.current) {
      tCutStartRef.current = time
    }
  } else {
    tCutStartRef.current = null
  }

  const state = calculateCutRopeState(
    k,
    m,
    time,
    isCut,
    tCutStartRef.current,
    CUT_ROPE_DESIGN.ceilY,
    CUT_ROPE_DESIGN.groundY,
  )

  const fallTime = calculateBallBFallTime(m, k, CUT_ROPE_DESIGN.ceilY, CUT_ROPE_DESIGN.groundY)
  const tCut = state.tCut

  const gravity = 9.8
  const maxAccel = gravity * 2.5
  const unitHeight = 130 / maxAccel
  const baseY = 170  // 0 加速度基准线 Y 坐标

  // 带方向的加速度数据：向上为正，向下为负
  // 物理约定：a>0 表示加速度方向向上，a<0 表示向下（与场景 SVG y 轴向下相反）
  const data = [
    { label: 'A球', value: state.forces.a_A, color: '#F59E0B' },
    { label: 'B球', value: state.forces.a_B, color: '#3B82F6' },
    { label: 'C球', value: state.forces.a_C, color: '#EF4444' },
    { label: 'D球', value: state.forces.a_D, color: '#10B981' },
  ]

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-inner p-4 relative overflow-hidden">
      <div className="text-base font-bold mb-3">加速度对比 (m/s²)</div>

      {isCut === 1 && tCut < fallTime ? (
        <div className="text-center text-xs text-gray-500 mb-2">
          切断后 t = {tCut.toFixed(2)}s
        </div>
      ) : (
        <div className="text-center text-xs text-gray-500 mb-2">
          {state.isLanded ? 'B球已落地，加速度归零' : '点击“剪断细绳”观察加速度变化'}
        </div>
      )}

      <svg width="100%" height="100%" viewBox="0 0 360 340">
        <text x={180} y={20} fontSize={font(14)} fontWeight="bold" fill={PHYSICS_COLORS.labelText} textAnchor="middle">
          四球加速度对比
        </text>

        {/* 基准线（0 加速度） */}
        <line x1={35} y1={baseY} x2={340} y2={baseY} stroke={PHYSICS_COLORS.axis} strokeWidth={1.5} />
        <text x={30} y={baseY + 4} fontSize={font(10)} fill={PHYSICS_COLORS.axis} textAnchor="end">0</text>
        {/* 正向刻度（向上加速度） */}
        <line x1={33} y1={baseY - 130} x2={37} y2={baseY - 130} stroke={PHYSICS_COLORS.axis} strokeWidth={1} />
        <text x={30} y={baseY - 127} fontSize={font(10)} fill={PHYSICS_COLORS.axis} textAnchor="end">
          +{maxAccel.toFixed(1)}
        </text>
        {/* 负向刻度（向下加速度） */}
        <line x1={33} y1={baseY + 130} x2={37} y2={baseY + 130} stroke={PHYSICS_COLORS.axis} strokeWidth={1} />
        <text x={30} y={baseY + 134} fontSize={font(10)} fill={PHYSICS_COLORS.axis} textAnchor="end">
          -{maxAccel.toFixed(1)}
        </text>
        {/* 方向提示 */}
        <text x={30} y={baseY - 60} fontSize={font(9)} fill={PHYSICS_COLORS.axis} textAnchor="end">↑</text>
        <text x={30} y={baseY + 70} fontSize={font(9)} fill={PHYSICS_COLORS.axis} textAnchor="end">↓</text>

        {/* 柱状图（带方向：正向上画，负向下画） */}
        {data.map((item, i) => {
          const barX = 65 + i * 72
          const barWidth = 48
          const isPositive = item.value >= 0
          const barHeight = Math.abs(item.value) * unitHeight
          // 正值：从基准线向上画；负值：从基准线向下画
          const barY = isPositive ? baseY - barHeight : baseY
          // 数值标签位置：在柱子顶端外侧
          const labelY = isPositive ? barY - 6 : barY + barHeight + 14

          return (
            <g key={item.label}>
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={item.color}
                opacity={0.8}
                rx={4}
              />
              <text
                x={barX + barWidth / 2}
                y={labelY}
                fontSize={font(12)}
                fontWeight="bold"
                fill={item.color}
                textAnchor="middle"
              >
                {item.value.toFixed(1)}
              </text>
              <text
                x={barX + barWidth / 2}
                y={baseY + 145}
                fontSize={font(12)}
                fill={PHYSICS_COLORS.labelText}
                textAnchor="middle"
                fontWeight="bold"
              >
                {item.label}
              </text>
            </g>
          )
        })}

        {/* 理论分析标注 */}
        {isCut === 1 && tCut < 0.5 && (
          <g>
            <text x={180} y={300} fontSize={font(12)} fill={PHYSICS_COLORS.textMuted} textAnchor="middle">
              理论值 (刚剪断):
            </text>
            <text x={180} y={320} fontSize={font(11)} fill={PHYSICS_COLORS.textMuted} textAnchor="middle">
              aA=+g, aB=-g, aC=-2g, aD=0
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
