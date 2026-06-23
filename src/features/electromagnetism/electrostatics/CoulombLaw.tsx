import { useState, useEffect, useMemo } from 'react'
import { useCanvasSize, type CanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateCoulombForce, calculateThreeChargeForces } from '@/physics'
import {
  PHYSICS_COLORS,
  CANVAS_STYLE,
} from '@/theme/physics'
import { colors } from '@/theme/colors'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { RelationChart } from '@/components/Chart'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

const COULOMB_K = 9e9

const LAYOUT = {
  chargeRadiusRatio: 0.03,
  distanceLabelOffsetRatio: 0.12,
  chargeLabelOffsetRatio: 1.8,
  chartAreaRatio: { width: 0.35, height: 0.5 },
  chartPaddingRatio: 0.08,
  frDataRange: { rMin: 0.5, rMax: 10, rStep: 0.1 },
  equilibriumThreshold: 1e-6,
} as const

export default function CoulombLaw() {
    const {params, showVectors, showFormulas} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    showVectors: s.showVectors,
    showFormulas: s.showFormulas,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.tall)

  const mode = params.mode ?? 0

  return (
    <div ref={containerRef} className="w-full h-full">
      {mode === 0
        ? <BasicMode params={params} showVectors={showVectors} showFormulas={showFormulas} canvasSize={canvasSize} />
        : <ThreeChargeMode params={params} showVectors={showVectors} showFormulas={showFormulas} canvasSize={canvasSize} />
      }
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 基础模式：两点电荷 + F-r 图表 + 拖拽改变距离
// ═══════════════════════════════════════════════════════════════════════
function BasicMode({
  params,
  showVectors,
  showFormulas,
  canvasSize,
}: {
  params: Record<string, number>
  showVectors: boolean
  showFormulas: boolean
  canvasSize: CanvasSize
}) {
  const { q1 = 2, q2 = -3, r: rParam = 4 } = params
  const updateParam = useAnimationStore((s) => s.updateParam)
  const [dragging, setDragging] = useState(false)
  const [dragR, setDragR] = useState(rParam)

  useEffect(() => {
    setDragR(rParam)
  }, [rParam])

  const r = dragR
  const q1SI = Math.abs(q1 * 1e-6)
  const q2SI = Math.abs(q2 * 1e-6)
  const rSI = (r || 0.01) * 0.01
  const { F } = calculateCoulombForce(COULOMB_K, q1SI, q2SI, rSI)

  const attractive = q1 * q2 < 0
  const w = canvasSize.width
  const h = canvasSize.height

  const stageWidth = w * 0.6
  const stageHeight = h
  const centerX = stageWidth / 2
  const centerY = stageHeight / 2

  const chargeR = Math.min(w, h) * LAYOUT.chargeRadiusRatio
  const gap = r * (stageWidth * 0.08)

  const x1 = centerX - gap / 2
  const x2 = centerX + gap / 2

  const leftArrowDir = attractive ? 1 : -1
  const rightArrowDir = attractive ? -1 : 1

  const basicScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: stageWidth, height: stageHeight },
    originX: 0,
    originY: 0,
    refMagnitudes: { electricForce: 50 },
  }
  const sceneScale = createSceneScale(basicScene)

  // ── F-r 图：交给 RelationChart ──────────────────────────────────────
  // 图表容器位于右侧区域，用 <foreignObject> 嵌入 React 组件
  const chartLeft = stageWidth + w * 0.03
  const chartTop = h * LAYOUT.chartPaddingRatio
  const chartWidth = w - chartLeft - w * LAYOUT.chartPaddingRatio
  const chartHeight = h * 0.4

  // F-r 整段曲线数据（仅当 q1/q2 变化时重算）
  const frPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const { rMin, rMax, rStep } = LAYOUT.frDataRange
    for (let ri = rMin; ri <= rMax + 1e-9; ri += rStep) {
      const riSI = ri * 0.01
      const { F: Fi } = calculateCoulombForce(COULOMB_K, q1SI, q2SI, riSI)
      pts.push({ x: ri, y: Fi })
    }
    return pts
  }, [q1SI, q2SI])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return
    const svg = e.currentTarget
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    const newR = ((svgP.x - x1) / (stageWidth * 0.08))
    const clampedR = Math.max(1, Math.min(8, newR))
    setDragR(clampedR)
    updateParam('r', clampedR)
  }

  const handleMouseUp = () => setDragging(false)

  return (
    <svg width={w} height={h} className="bg-white rounded-lg shadow-inner"
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

      <line x1={40} y1={centerY} x2={stageWidth - 40} y2={centerY}
        stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} strokeDasharray="4,4" opacity={0.3} />

      <line x1={x1} y1={centerY + h * LAYOUT.distanceLabelOffsetRatio} x2={x2} y2={centerY + h * LAYOUT.distanceLabelOffsetRatio}
        stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
      <line x1={x1} y1={centerY + h * LAYOUT.distanceLabelOffsetRatio - 6} x2={x1} y2={centerY + h * LAYOUT.distanceLabelOffsetRatio + 6}
        stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
      <line x1={x2} y1={centerY + h * LAYOUT.distanceLabelOffsetRatio - 6} x2={x2} y2={centerY + h * LAYOUT.distanceLabelOffsetRatio + 6}
        stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
      <text x={centerX} y={centerY + h * LAYOUT.distanceLabelOffsetRatio + 18}
        fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.axis} textAnchor="middle">
        r = {r.toFixed(1)} cm
      </text>

      {showVectors && (
        <g>
          <VectorArrow
            origin={{ x: x1, y: -centerY }}
            vector={{ x: leftArrowDir * F, y: 0 }}
            type="electricForce"
            sceneScale={sceneScale}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
          />
          <VectorArrow
            origin={{ x: x2, y: -centerY }}
            vector={{ x: rightArrowDir * F, y: 0 }}
            type="electricForce"
            sceneScale={sceneScale}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
          />
          <text x={x1 + leftArrowDir * 30} y={centerY - 12}
            fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.electricForce} textAnchor="middle" fontWeight="bold">F</text>
          <text x={x2 + rightArrowDir * 30} y={centerY - 12}
            fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.electricForce} textAnchor="middle" fontWeight="bold">F</text>
        </g>
      )}

      <circle cx={x1} cy={centerY} r={chargeR}
        fill={q1 >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
        stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
      <text x={x1} y={centerY + 6} fontSize={chargeR * 0.9} fill={colors.neutral.white} textAnchor="middle" fontWeight="bold">
        {q1 >= 0 ? '+' : '−'}
      </text>
      <text x={x1} y={centerY - chargeR - 8} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
        q₁ = {q1} μC
      </text>

      <circle cx={x2} cy={centerY} r={chargeR}
        fill={q2 >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
        stroke={dragging ? PHYSICS_COLORS.electricForce : PHYSICS_COLORS.objectStroke}
        strokeWidth={dragging ? CANVAS_STYLE.stroke.vectorMain : CANVAS_STYLE.stroke.objectLine}
        style={{ cursor: 'grab' }}
        onMouseDown={handleMouseDown} />
      <text x={x2} y={centerY + 6} fontSize={chargeR * 0.9} fill={colors.neutral.white} textAnchor="middle" fontWeight="bold">
        {q2 >= 0 ? '+' : '−'}
      </text>
      <text x={x2} y={centerY - chargeR - 8} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
        q₂ = {q2} μC
      </text>
      <text x={x2} y={centerY + chargeR + 16} fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
        (拖拽改变距离)
      </text>

      {showFormulas && (
        <g transform={`translate(${w * 0.02}, ${h * 0.04})`}>
          <text fontSize={CANVAS_STYLE.font.title} fill={PHYSICS_COLORS.labelText} fontWeight="bold">库仑定律</text>
          <text x={0} y={24} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.axis}>F = k·q₁q₂/r²</text>
          <text x={0} y={44} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.axis}>k = 9×10⁹ N·m²/C²</text>
          <text x={0} y={68} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.electricForce} fontWeight="bold">
            F = {F.toExponential(2)} N
          </text>
          <text x={0} y={88} fontSize={CANVAS_STYLE.font.axisSize} fill={attractive ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.positiveCharge}>
            {attractive ? '异号电荷 → 相互吸引' : '同号电荷 → 相互排斥'}
          </text>
        </g>
      )}

      {/* F-r 图：通过 foreignObject 嵌入 RelationChart */}
      <foreignObject x={chartLeft} y={chartTop} width={chartWidth} height={chartHeight}>
        <div style={{ width: '100%', height: '100%' }}>
          <RelationChart
            points={frPoints}
            xLabel="r / cm"
            yLabel="F / N"
            title="F-r 图像"
            xDomain={[LAYOUT.frDataRange.rMin, LAYOUT.frDataRange.rMax]}
            cursorX={r}
            cursorLabel={(_x, y) => `F=${y.toExponential(2)} N`}
            color={PHYSICS_COLORS.electricForce}
            strokeWidth={2}
          />
        </div>
      </foreignObject>

    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 进阶模式：固定Q1、Q2，拖拽Q3 + 自动平衡
// ═══════════════════════════════════════════════════════════════════════

/** 计算Q3的平衡位置（固定Q1、Q2在x轴上） */
function findEquilibriumX3(
  q1: number, x1: number,
  q2: number, x2: number,
  q3: number,
  minX: number, maxX: number
): { x: number; possible: boolean } {
  const Q1 = q1 * 1e-6
  const Q2 = q2 * 1e-6
  const Q3 = q3 * 1e-6

  if (Q3 === 0) return { x: (x1 + x2) / 2, possible: false }

  const f = (x3: number) => {
    const r13 = x3 - x1
    const r23 = x3 - x2
    if (Math.abs(r13) < 1e-9 || Math.abs(r23) < 1e-9) return Infinity
    const F13 = (Q1 * Q3) / (r13 * Math.abs(r13))
    const F23 = (Q2 * Q3) / (r23 * Math.abs(r23))
    return F13 + F23
  }

  const lo = minX
  const hi = maxX

  const fLo = f(lo)
  const fHi = f(hi)

  if (Math.abs(fLo) < 1e-12) return { x: lo, possible: true }
  if (Math.abs(fHi) < 1e-12) return { x: hi, possible: true }
  if (fLo * fHi > 0) return { x: (x1 + x2) / 2, possible: false }

  let a = lo
  let b = hi
  for (let i = 0; i < 100; i++) {
    const mid = (a + b) / 2
    const fm = f(mid)
    if (Math.abs(fm) < 1e-12) return { x: mid, possible: true }
    if (f(a) * fm < 0) {
      b = mid
    } else {
      a = mid
    }
  }
  const result = (a + b) / 2
  if (result < minX || result > maxX) return { x: (x1 + x2) / 2, possible: false }
  return { x: result, possible: true }
}

function ThreeChargeMode({
  params,
  showVectors,
  showFormulas,
  canvasSize,
}: {
  params: Record<string, number>
  showVectors: boolean
  showFormulas: boolean
  canvasSize: CanvasSize
}) {
  const { q1 = 2, q2 = -3, q3 = 1 } = params
  const w = canvasSize.width
  const h = canvasSize.height
  const { font } = canvasSize
  const centerY = h * 0.5

  const pos1X = w * 0.2
  const pos2X = w * 0.8

  const [q3X, setQ3X] = useState(w * 0.5)
  const [dragging, setDragging] = useState(false)
  const [noEquilibrium, setNoEquilibrium] = useState(false)

  useEffect(() => {
    setQ3X(w * 0.5)
    setNoEquilibrium(false)
  }, [w, h, q1, q2, q3])

  const charges = [
    { x: pos1X * 0.01, y: centerY * 0.01, q: q1 * 1e-6 },
    { x: pos2X * 0.01, y: centerY * 0.01, q: q2 * 1e-6 },
    { x: q3X * 0.01, y: centerY * 0.01, q: q3 * 1e-6 },
  ]

  const forces = calculateThreeChargeForces(COULOMB_K, charges)
  const isBalanced = forces[2].magnitude < LAYOUT.equilibriumThreshold

  const chargeR = Math.min(w, h) * LAYOUT.chargeRadiusRatio
  const maxForce = Math.max(...forces.map((f) => f.magnitude), 1e-10)

  const threeScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: w, height: h - 60 },
    originX: 0,
    originY: 0,
    refMagnitudes: { electricForce: maxForce * 1.2 },
  }
  const sceneScale = createSceneScale(threeScene)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return
    const svg = e.currentTarget
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    setQ3X(Math.max(chargeR, Math.min(w - chargeR, svgP.x)))
  }

  const handleMouseUp = () => setDragging(false)

  const handleAutoBalance = () => {
    const x1 = pos1X * 0.01
    const x2 = pos2X * 0.01
    const minX = chargeR * 0.01
    const maxX = (w - chargeR) * 0.01
    const { x: eqX, possible } = findEquilibriumX3(q1, x1, q2, x2, q3, minX, maxX)
    if (possible) {
      setQ3X(eqX * 100)
      setNoEquilibrium(false)
    } else {
      setNoEquilibrium(true)
    }
  }

  const chargeLabels = ['Q₁', 'Q₂', 'Q₃']
  const chargeValues = [q1, q2, q3]
  const chargePositions = [
    { x: pos1X, y: centerY },
    { x: pos2X, y: centerY },
    { x: q3X, y: centerY },
  ]

  return (
    <div className="flex flex-col h-full">
      <svg width={w} height={h - 60} className="bg-white rounded-lg shadow-inner cursor-crosshair flex-1"
        onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

        <line x1={40} y1={centerY} x2={w - 40} y2={centerY}
          stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} strokeDasharray="4,4" opacity={0.3} />

        {chargePositions.map((pos, idx) => {
          const force = forces[idx]
          const qVal = chargeValues[idx]
          const isQ3 = idx === 2

          return (
            <g key={`charge-${idx}`}>
              {showVectors && force.magnitude > 1e-12 && (
                <g>
                  <VectorArrow
                    origin={{ x: pos.x, y: -pos.y }}
                    vector={{ x: force.fx, y: -force.fy }}
                    type="electricForce"
                    sceneScale={sceneScale}
                    strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  />
                  <text
                    x={pos.x + Math.cos(Math.atan2(force.fy, force.fx)) * 50}
                    y={pos.y + Math.sin(Math.atan2(force.fy, force.fx)) * 50}
                    fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.electricForce} textAnchor="middle" fontWeight="bold">
                    F
                  </text>
                </g>
              )}

              <circle cx={pos.x} cy={pos.y} r={chargeR}
                fill={qVal >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
                stroke={isQ3 && !isBalanced ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.objectStroke}
                strokeWidth={isQ3 && !isBalanced ? CANVAS_STYLE.stroke.vectorMain : CANVAS_STYLE.stroke.objectLine}
                style={{ cursor: isQ3 ? 'grab' : 'default' }}
                onMouseDown={isQ3 ? handleMouseDown : undefined} />

              {isQ3 && !isBalanced && (
                <circle cx={pos.x} cy={pos.y} r={chargeR + 4}
                  fill="none" stroke={PHYSICS_COLORS.forceArrowRed} strokeWidth={1.5} opacity={0.6}>
                  <animate attributeName="r" values={`${chargeR + 2};${chargeR + 6};${chargeR + 2}`} dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1s" repeatCount="indefinite" />
                </circle>
              )}

              <text x={pos.x} y={pos.y + 6} fontSize={chargeR * 0.9} fill={colors.neutral.white} textAnchor="middle" fontWeight="bold">
                {qVal >= 0 ? '+' : '−'}
              </text>
              <text x={pos.x} y={pos.y - chargeR - 10} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
                {chargeLabels[idx]} = {qVal} μC
              </text>
              {isQ3 && (
                <text x={pos.x} y={pos.y + chargeR + 18} fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
                  (拖拽移动)
                </text>
              )}
            </g>
          )
        })}

        {isBalanced && (
          <g>
            <circle cx={w / 2} cy={h * 0.75} r={16} fill={PHYSICS_COLORS.normalForce} opacity={0.9} />
            <text x={w / 2} y={h * 0.75 + 5} fontSize={font(14)} fill={colors.neutral.white} textAnchor="middle" fontWeight="bold">✓</text>
            <text x={w / 2} y={h * 0.75 + 28} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.normalForce} textAnchor="middle" fontWeight="bold">
              三电荷平衡
            </text>
          </g>
        )}

        {noEquilibrium && !isBalanced && (
          <g>
            <rect x={w / 2 - 80} y={h * 0.75 - 12} width={160} height={36} rx={8}
              fill={PHYSICS_COLORS.forceArrowRed} opacity={0.9} />
            <text x={w / 2} y={h * 0.75 + 10} fontSize={CANVAS_STYLE.font.labelSize} fill={colors.neutral.white} textAnchor="middle" fontWeight="bold">
              该电荷配置无法平衡
            </text>
          </g>
        )}

        {showFormulas && (
          <g transform={`translate(${w * 0.02}, ${h * 0.04})`}>
            <text fontSize={CANVAS_STYLE.font.title} fill={PHYSICS_COLORS.labelText} fontWeight="bold">三电荷平衡</text>
            <text x={0} y={24} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.axis}>F = k·q₁q₂/r²</text>
            <text x={0} y={44} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.axis}>平衡条件：ΣF = 0</text>
            <text x={0} y={68} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.electricForce} fontWeight="bold">
              {isBalanced ? '✓ 已平衡' : noEquilibrium ? '× 无法平衡' : '未平衡'}
            </text>
          </g>
        )}

      </svg>

      <div className="shrink-0 p-3 bg-neutral-50 border-t border-neutral-200 flex items-center gap-4">
        <button
          onClick={handleAutoBalance}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 active:scale-[0.97] transition-all"
        >
          自动平衡
        </button>
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span>Q₁、Q₂固定</span>
          <span className="text-neutral-400">|</span>
          <span>拖拽Q₃寻找平衡位置</span>
          <span className="text-neutral-400">|</span>
          <span className={isBalanced ? 'text-green-600 font-semibold' : noEquilibrium ? 'text-red-600 font-semibold' : 'text-amber-600'}>
            {isBalanced ? '✓ 已平衡' : noEquilibrium ? '× 无法平衡' : '未平衡'}
          </span>
        </div>
      </div>
    </div>
  )
}
