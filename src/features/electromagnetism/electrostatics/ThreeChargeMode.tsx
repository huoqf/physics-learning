/**
 * 库仑定律三电荷平衡模式组件
 *
 * 物理模型：三个共线点电荷在库仑力作用下的平衡问题。
 *
 * 高考核心考点：
 * 1. 两同夹一异：外侧两电荷极性相同，中间电荷极性相反
 * 2. 两大夹一小：外侧电荷量绝对值大于中间电荷量绝对值
 * 3. 近小远大：中间电荷靠近绝对值较小的电荷
 *
 * 功能特性：
 * - 拖拽 Q3 改变位置，实时显示各电荷受力矢量
 * - 单电荷平衡：自动计算 Q3 的平衡位置（二分法求解）
 * - 自由三电荷平衡：自动配置 Q3 的电量和位置使三者同时平衡
 * - 右上角浮窗实时显示三大平衡条件的满足状态
 *
 * @category M4
 */
import { VectorArrow } from '@/components/Physics'
import { useState, useEffect } from 'react'
import { type CanvasSize } from '@/utils'
import type { ViewportInfo } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateThreeChargeForces, calculateFreeThreeChargeEquilibrium, findEquilibriumX3 } from '@/physics'
import {
  PHYSICS_COLORS,
  CANVAS_STYLE,
  CANVAS_COLORS,
} from '@/theme/physics'
import { colors } from '@/theme/colors'

import { Button } from '@/components/UI'
import { useSceneScale } from '@/hooks'

/** 静电力常量 k = 9×10⁹ N·m²/C² */
const COULOMB_K = 9e9

/**
 * 三电荷模式布局配置常量
 * equilibriumThreshold: 合力小于此值视为平衡（单位 N）
 */
const LAYOUT = {
  chargeRadiusRatio: 0.03,
  distanceLabelOffsetRatio: 0.12,
  chargeLabelOffsetRatio: 1.8,
  chartAreaRatio: { width: 0.35, height: 0.5 },
  chartPaddingRatio: 0.08,
  frDataRange: { rMin: 0.5, rMax: 10, rStep: 0.1 },
  equilibriumThreshold: 1e-6,
} as const

/**
 * 进阶模式：固定 Q1、Q2，拖拽 Q3 + 自动平衡
 *
 * @param params - 动画参数对象，包含 q1、q2、q3 三个电荷的电量（μC）
 * @param showVectors - 是否显示力矢量箭头
 * @param showFormulas - 是否显示公式推导（预留接口）
 * @param canvasSize - 画布尺寸信息 { width, height }
 * @returns 三电荷平衡模式动画组件
 */
export default function ThreeChargeMode({
  params,
  showVectors,
  canvasSize,
  vp,
}: {
  params: Record<string, number>
  showVectors: boolean
  showFormulas: boolean
  canvasSize: CanvasSize
  vp: ViewportInfo
}) {
  const { q1 = 2, q2 = -3, q3 = 1 } = params
  const w = canvasSize.width
  const h = canvasSize.height
  const stageHeight = h - 60
  const centerY = stageHeight * 0.5

  // 动画舞台占据全部 100% 宽度
  const stageWidth = w
  const pos1X = stageWidth * 0.25
  const pos2X = stageWidth * 0.75

  const [q3X, setQ3X] = useState(stageWidth * 0.5)
  const [dragging, setDragging] = useState(false)
  const [noEquilibrium, setNoEquilibrium] = useState(false)

  const updateParam = useAnimationStore((s) => s.updateParam)

  useEffect(() => {
    setQ3X(stageWidth * 0.5)
    setNoEquilibrium(false)
  }, [w, h, q1, q2, q3, stageWidth])

  const charges = [
    { x: pos1X * 0.01, y: centerY * 0.01, q: q1 * 1e-6 },
    { x: pos2X * 0.01, y: centerY * 0.01, q: q2 * 1e-6 },
    { x: q3X * 0.01, y: centerY * 0.01, q: q3 * 1e-6 },
  ]

  const forces = calculateThreeChargeForces(COULOMB_K, charges)
  const isBalanced = forces[2].magnitude < LAYOUT.equilibriumThreshold
  const isAllThreeBalanced = forces.every((f) => f.magnitude < LAYOUT.equilibriumThreshold)

  const chargeR = Math.min(stageWidth, stageHeight) * LAYOUT.chargeRadiusRatio
  const maxForce = Math.max(...forces.map((f) => f.magnitude), 1e-10)

  const sceneScale = useSceneScale({
    vp,
    preset: { width: stageWidth, height: stageHeight },
    anchor: 'custom',
    customOriginX: 0,
    customOriginY: 0,
    customScaleX: 1,
    customScaleY: 1,
    refMagnitudes: { electricForce: maxForce * 1.2 },
    maxVectorLength: Math.min(stageWidth, stageHeight) * 0.3,
  })

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
    setQ3X(Math.max(chargeR, Math.min(stageWidth - chargeR, svgP.x)))
  }

  const handleMouseUp = () => setDragging(false)

  // 仅 Q3 受到平衡 (固定两端电荷)
  const handleAutoBalance = () => {
    const x1 = pos1X * 0.01
    const x2 = pos2X * 0.01
    const minX = chargeR * 0.01
    const maxX = (stageWidth - chargeR) * 0.01
    const { x: eqX, possible } = findEquilibriumX3(q1, x1, q2, x2, q3, minX, maxX)
    if (possible) {
      setQ3X(eqX * 100)
      setNoEquilibrium(false)
    } else {
      setNoEquilibrium(true)
    }
  }

  // 自由三电荷全部平衡 (一键自动配置)
  const handleFreeBalance = () => {
    const rPhysical = (pos2X - pos1X) * 0.01
    const { q3: q3Eq, r13, valid } = calculateFreeThreeChargeEquilibrium(q1 * 1e-6, q2 * 1e-6, rPhysical)
    if (valid) {
      const q3XNew = pos1X + (r13 / 0.01)
      setQ3X(q3XNew)
      updateParam('q3', Number((q3Eq / 1e-6).toFixed(2)))
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

  // 按 X 轴位置排序，便于高考口诀检测
  const sortedCharges = [
    { id: 1, x: pos1X, q: q1 },
    { id: 2, x: pos2X, q: q2 },
    { id: 3, x: q3X, q: q3 },
  ].sort((a, b) => a.x - b.x)

  const midSign = sortedCharges[1].q >= 0 ? 1 : -1
  const leftSign = sortedCharges[0].q >= 0 ? 1 : -1
  const rightSign = sortedCharges[2].q >= 0 ? 1 : -1

  // 1. 两同夹一异
  const isTwoSameOneDiff = sortedCharges[0].q !== 0 && sortedCharges[1].q !== 0 && sortedCharges[2].q !== 0 &&
                           leftSign === rightSign && midSign !== leftSign

  // 2. 两大夹一小
  const midAbs = Math.abs(sortedCharges[1].q)
  const leftAbs = Math.abs(sortedCharges[0].q)
  const rightAbs = Math.abs(sortedCharges[2].q)
  const isBigMiddleSmall = sortedCharges[0].q !== 0 && sortedCharges[1].q !== 0 && sortedCharges[2].q !== 0 &&
                           midAbs < leftAbs && midAbs < rightAbs

  // 3. 近小远大
  const dLeft = Math.abs(sortedCharges[1].x - sortedCharges[0].x)
  const dRight = Math.abs(sortedCharges[1].x - sortedCharges[2].x)
  let isNearSmallFarBig = false
  if (sortedCharges[0].q !== 0 && sortedCharges[1].q !== 0 && sortedCharges[2].q !== 0) {
    if (leftAbs < rightAbs) {
      isNearSmallFarBig = dLeft < dRight
    } else if (leftAbs > rightAbs) {
      isNearSmallFarBig = dLeft > dRight
    } else {
      isNearSmallFarBig = Math.abs(dLeft - dRight) < 5
    }
  }

  return (
    <div className="relative flex flex-col h-full bg-white rounded-lg shadow-inner">
      {/* 动画舞台，撑满 100% 宽度 */}
      <svg width={w} height={stageHeight} className="flex-1"
        onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

        <defs>
          <linearGradient id="balanceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.success[400]} />
            <stop offset="50%" stopColor={colors.accent[400]} />
            <stop offset="100%" stopColor={colors.success[400]} />
          </linearGradient>
        </defs>

        <line x1={40} y1={centerY} x2={stageWidth - 40} y2={centerY}
          stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} strokeDasharray="4,4" opacity={0.3} />

        {isAllThreeBalanced && (
          <g>
            <line x1={chargeR} y1={centerY} x2={stageWidth - chargeR} y2={centerY}
              stroke="url(#balanceGradient)" strokeWidth={4} opacity={0.6} />
            <circle cx={q3X} cy={centerY} r={chargeR + 6}
              fill="none" stroke={colors.success[400]} strokeWidth={2}>
              <animate attributeName="r" values={`${chargeR + 4};${chargeR + 9};${chargeR + 4}`} dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

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

              <text x={pos.x} y={pos.y + 6} fontSize={chargeR * 0.9} fill={CANVAS_COLORS.white} textAnchor="middle" fontWeight="bold">
                {qVal > 0 ? '+' : qVal < 0 ? '−' : '0'}
              </text>
              <text x={pos.x} y={pos.y - chargeR - 10} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
                {chargeLabels[idx]} = {qVal.toFixed(2)} μC
              </text>
              {isQ3 && (
                <text x={pos.x} y={pos.y + chargeR + 18} fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
                  (拖拽移动)
                </text>
              )}
            </g>
          )
        })}

        {isAllThreeBalanced && (
          <g>
            <circle cx={stageWidth / 2} cy={stageHeight * 0.82} r={14} fill={colors.success[500]} opacity={0.9} />
            <text x={stageWidth / 2} y={stageHeight * 0.82 + 5} fontSize={CANVAS_STYLE.font.annotation} fill={CANVAS_COLORS.white} textAnchor="middle" fontWeight="bold">✓</text>
            <text x={stageWidth / 2} y={stageHeight * 0.82 + 24} fontSize={CANVAS_STYLE.font.labelSize} fill={colors.success[600]} textAnchor="middle" fontWeight="bold">
              自由三电荷完美平衡！
            </text>
          </g>
        )}

        {noEquilibrium && !isBalanced && (
          <g>
            <rect x={stageWidth / 2 - 90} y={stageHeight * 0.8 - 12} width={180} height={32} rx={6}
              fill={PHYSICS_COLORS.forceArrowRed} opacity={0.9} />
            <text x={stageWidth / 2} y={stageHeight * 0.8 + 8} fontSize={CANVAS_STYLE.font.labelSize} fill={CANVAS_COLORS.white} textAnchor="middle" fontWeight="bold">
              此电量配置下无法达成自由平衡
            </text>
          </g>
        )}

      </svg>

      {/* 右上角绝对定位微型判定浮窗 (去底纹科技感，铁律 8 纯 HTML 悬浮) */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none select-none">
        <div className="flex flex-col bg-white/70 backdrop-blur-md border border-neutral-100 rounded-lg p-2.5 shadow-sm text-[10px] gap-1.5 w-36">
          <div className="font-bold text-neutral-800 border-b border-neutral-100 pb-1 flex items-center justify-between">
            <span>🎓 平衡判定指标</span>
            {isAllThreeBalanced && <span className="text-success-600 animate-pulse text-[9px]">已平衡</span>}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">两同夹一异</span>
              <span className={`font-semibold ${isTwoSameOneDiff ? 'text-success-600' : 'text-danger-500'}`}>
                {isTwoSameOneDiff ? '满足 🟢' : '未满足 🔴'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">两大夹一小</span>
              <span className={`font-semibold ${isBigMiddleSmall ? 'text-success-600' : 'text-danger-500'}`}>
                {isBigMiddleSmall ? '满足 🟢' : '未满足 🔴'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">近小远大</span>
              <span className={`font-semibold ${isNearSmallFarBig ? 'text-success-600' : 'text-danger-500'}`}>
                {isNearSmallFarBig ? '满足 🟢' : '未满足 🔴'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 p-3 bg-neutral-50 border-t border-neutral-200 flex items-center gap-4">
        <Button
          onClick={handleAutoBalance}
        >
          单电荷平衡
        </Button>
        <Button
          onClick={handleFreeBalance}
        >
          自由三电荷平衡
        </Button>
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span>拖拽Q₃寻找平衡</span>
          <span className="text-neutral-400">|</span>
          <span className={isAllThreeBalanced ? 'text-green-600 font-semibold' : isBalanced ? 'text-blue-600 font-semibold' : noEquilibrium ? 'text-red-600 font-semibold' : 'text-amber-600'}>
            {isAllThreeBalanced ? '✓ 自由平衡达成' : isBalanced ? '✓ 仅 Q₃ 平衡' : noEquilibrium ? '× 无法平衡' : '未平衡'}
          </span>
        </div>
      </div>
    </div>
  )
}
