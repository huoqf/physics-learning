/**
 * 库仑定律基础模式组件
 *
 * 物理模型：两个点电荷 q1、q2 在一维直线上，间距为 r。
 * 库仑力公式：F = k·|q1·q2| / r²
 *
 * 功能特性：
 * 1. 拖拽右侧电荷改变间距 r，实时更新库仑力大小
 * 2. F-r 关系图表面板，展示力随距离的变化曲线
 * 3. 接触起电演示：两球接触后电荷重新分配（Q' = (Q1+Q2)/2）
 * 4. 高考考点提示：当 r 过小时提示点电荷适用条件
 *
 * 布局：左右并列（左侧动画舞台 60% + 右侧图表面板 40%）
 *
 * @category M4
 */
import { VectorArrow } from '@/components/Physics'
import { useState, useEffect, useMemo } from 'react'
import { type CanvasSize, useAnimationFrame } from '@/utils'
import type { ViewportInfo } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateCoulombForce, calculateContactCharges } from '@/physics'
import {
  PHYSICS_COLORS,
  CANVAS_STYLE,
  CANVAS_COLORS,
} from '@/theme/physics'
import { colors } from '@/theme/colors'

import { RelationChart } from '@/components/Chart'
import { Button } from '@/components/UI'
import { useSceneScale } from '@/hooks'

/** 静电力常量 k = 9×10⁹ N·m²/C² */
const COULOMB_K = 9e9

/**
 * 基础模式布局配置常量
 * 所有比例值基于画布尺寸计算，避免硬编码像素
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
 * 基础模式：两点电荷 + F-r 图表 + 拖拽改变距离
 *
 * @param params - 动画参数对象，包含 q1（电量1）、q2（电量2）、r（间距）
 * @param showVectors - 是否显示力矢量箭头
 * @param showFormulas - 是否显示公式推导（预留接口）
 * @param canvasSize - 画布尺寸信息 { width, height }
 * @returns 基础模式动画组件
 */
export default function BasicMode({
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
  const { q1 = 2, q2 = -3, r: rParam = 4 } = params
  const updateParam = useAnimationStore((s) => s.updateParam)
  const [dragging, setDragging] = useState(false)
  const [dragR, setDragR] = useState(rParam)

  useEffect(() => {
    setDragR(rParam)
  }, [rParam])

  // 接触起电动画状态控制
  const [contactStep, setContactStep] = useState<'idle' | 'closing' | 'sharing' | 'opening'>('idle')
  const [contactProgress, setContactProgress] = useState(0)
  const [, setElapsedTime] = useState(0)
  const duration = 600 // 每个阶段时间 (ms)

  useAnimationFrame((dt) => {
    setElapsedTime((prev) => {
      const next = prev + dt
      const progress = Math.min(1, next / duration)
      setContactProgress(progress)

      if (next >= duration) {
        if (contactStep === 'closing') {
          setContactStep('sharing')
          // 接触瞬间：计算新电量并写入全局参数
          const { q1New, q2New } = calculateContactCharges(q1, q2)
          updateParam('q1', q1New)
          updateParam('q2', q2New)
          return 0
        } else if (contactStep === 'sharing') {
          setContactStep('opening')
          return 0
        } else if (contactStep === 'opening') {
          setContactStep('idle')
          setContactProgress(0)
          return 0
        }
      }
      return next
    })
  }, { playing: contactStep !== 'idle' })

  const handleContactStart = () => {
    if (contactStep !== 'idle') return
    setContactStep('closing')
    setContactProgress(0)
    setElapsedTime(0)
  }

  const r = dragR
  const q1SI = Math.abs(q1 * 1e-6)
  const q2SI = Math.abs(q2 * 1e-6)
  const rSI = (r || 0.01) * 0.01
  const { F } = calculateCoulombForce(COULOMB_K, q1SI, q2SI, rSI)

  const attractive = q1 * q2 < 0
  const w = canvasSize.width
  const h = canvasSize.height
  const stageHeight = h - 60 // 腾出底端按钮的高度

  // 动画舞台占据左边 60% 的宽度
  const stageWidth = w * 0.6
  const centerX = stageWidth / 2
  const centerY = stageHeight / 2

  const chargeR = Math.min(stageWidth, stageHeight) * LAYOUT.chargeRadiusRatio

  // 计算动画过程中的实际距离
  const gap = r * (stageWidth * 0.08)
  let currentGap = gap
  if (contactStep === 'closing') {
    currentGap = gap - (gap - chargeR * 2) * contactProgress
  } else if (contactStep === 'sharing') {
    currentGap = chargeR * 2
  } else if (contactStep === 'opening') {
    currentGap = chargeR * 2 + (gap - chargeR * 2) * contactProgress
  }

  const x1 = centerX - currentGap / 2
  const x2 = centerX + currentGap / 2

  const leftArrowDir = attractive ? 1 : -1
  const rightArrowDir = attractive ? -1 : 1

  const sceneScale = useSceneScale({
    vp,
    preset: { width: stageWidth, height: stageHeight },
    anchor: 'custom',
    customOriginX: 0,
    customOriginY: 0,
    customScaleX: 1,
    customScaleY: 1,
    refMagnitudes: { electricForce: 50 },
    maxVectorLength: Math.min(stageWidth, stageHeight) * 0.3,
  })

  // F-r 整段曲线数据
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
    if (contactStep !== 'idle') return // 动画中禁止拖拽
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

  // 高考辨析：是否太近
  const isTooClose = r < 2.0

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-inner">
      {/* 左右并列 HTML 布局分区，平级非嵌套 (铁律 8) */}
      <div className="flex flex-1 min-h-0">
        
        {/* 左侧：动画舞台 */}
        <svg width={stageWidth} height={stageHeight} className="flex-shrink-0"
          onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

          <line x1={40} y1={centerY} x2={stageWidth - 40} y2={centerY}
            stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} strokeDasharray="4,4" opacity={0.3} />

          <line x1={x1} y1={centerY + stageHeight * LAYOUT.distanceLabelOffsetRatio} x2={x2} y2={centerY + stageHeight * LAYOUT.distanceLabelOffsetRatio}
            stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
          <line x1={x1} y1={centerY + stageHeight * LAYOUT.distanceLabelOffsetRatio - 6} x2={x1} y2={centerY + stageHeight * LAYOUT.distanceLabelOffsetRatio + 6}
            stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
          <line x1={x2} y1={centerY + stageHeight * LAYOUT.distanceLabelOffsetRatio - 6} x2={x2} y2={centerY + stageHeight * LAYOUT.distanceLabelOffsetRatio + 6}
            stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
          <text x={centerX} y={centerY + stageHeight * LAYOUT.distanceLabelOffsetRatio + 18}
            fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.axis} textAnchor="middle">
            r = {r.toFixed(1)} cm
          </text>

          {showVectors && contactStep !== 'sharing' && (
            <g>
              <VectorArrow
                originPixel={{ x: x1, y: centerY }}
                vector={{ x: leftArrowDir * F, y: 0 }}
                type="electricForce"
                sceneScale={sceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              />
              <VectorArrow
                originPixel={{ x: x2, y: centerY }}
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

          {/* 左球 */}
          <circle cx={x1} cy={centerY} r={chargeR}
            fill={q1 >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
            stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
          <text x={x1} y={centerY + 6} fontSize={chargeR * 0.9} fill={CANVAS_COLORS.white} textAnchor="middle" fontWeight="bold">
            {q1 > 0 ? '+' : q1 < 0 ? '−' : '0'}
          </text>
          <text x={x1} y={centerY - chargeR - 8} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
            q₁ = {q1.toFixed(2)} μC
          </text>

          {/* 右球 */}
          <circle cx={x2} cy={centerY} r={chargeR}
            fill={q2 >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
            stroke={dragging ? PHYSICS_COLORS.electricForce : PHYSICS_COLORS.objectStroke}
            strokeWidth={dragging ? CANVAS_STYLE.stroke.vectorMain : CANVAS_STYLE.stroke.objectLine}
            style={{ cursor: contactStep === 'idle' ? 'grab' : 'default' }}
            onMouseDown={handleMouseDown} />
          <text x={x2} y={centerY + 6} fontSize={chargeR * 0.9} fill={CANVAS_COLORS.white} textAnchor="middle" fontWeight="bold">
            {q2 > 0 ? '+' : q2 < 0 ? '−' : '0'}
          </text>
          <text x={x2} y={centerY - chargeR - 8} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
            q₂ = {q2.toFixed(2)} μC
          </text>
          {contactStep === 'idle' && (
            <text x={x2} y={centerY + chargeR + 16} fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
              (拖拽改变距离)
            </text>
          )}

          {/* 接触起电时的电荷分享动画与文字公式浮块 */}
          {contactStep === 'sharing' && (
            <g>
              <circle cx={centerX} cy={centerY} r={chargeR * 1.6} fill={colors.accent[400]} opacity={0.6}>
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.15s" repeatCount="indefinite" />
                <animate attributeName="r" values={`${chargeR * 1.3};${chargeR * 1.8};${chargeR * 1.3}`} dur="0.15s" repeatCount="indefinite" />
              </circle>
              {/* 闪电火花特效 */}
              <path d={`M ${centerX - 5} ${centerY - 10} L ${centerX + 5} ${centerY - 2} L ${centerX - 4} ${centerY + 2} L ${centerX + 2} ${centerY + 10}`} 
                stroke={CANVAS_COLORS.white} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              
              <g transform={`translate(${centerX}, ${centerY - chargeR - 45})`}>
                <rect x={-80} y={-30} width={160} height={42} rx={6} fill={CANVAS_COLORS.strokeDark} opacity={0.9} />
                <text x={0} y={-12} fontSize={CANVAS_STYLE.font.labelSize - 1} fill={colors.accent[400]} textAnchor="middle" fontWeight="bold">
                  高考核心：接触起电
                </text>
                <text x={0} y={6} fontSize={CANVAS_STYLE.font.axisSize} fill={CANVAS_COLORS.white} textAnchor="middle">
                  Q' = (Q₁ + Q₂) / 2
                </text>
              </g>
            </g>
          )}

          {/* 高考考点：适用条件辨析 */}
          {isTooClose && (
            <g transform={`translate(${w * 0.02}, ${stageHeight * 0.72})`}>
              <rect x={0} y={0} width={stageWidth - w * 0.04} height={56} rx={6} fill={colors.accent[50]} stroke={colors.accent[400]} strokeWidth={1} />
              {/* 叹号图标 */}
              <circle cx={20} cy={28} r={8} fill={colors.accent[500]} />
              <text x={20} y={31} fontSize={CANVAS_STYLE.font.small} fill={CANVAS_COLORS.white} textAnchor="middle" fontWeight="bold">!</text>
              <text x={36} y={22} fontSize={CANVAS_STYLE.font.labelSize} fill={colors.accent[700]} fontWeight="bold">
                高考考点辨析：点电荷适用条件
              </text>
              <text x={36} y={38} fontSize={CANVAS_STYLE.font.axisSize} fill={colors.neutral[600]}>
                当距离过近（r → 0）时，带电体不能视为点电荷，实际电荷分布会偏移，公式失效。
              </text>
            </g>
          )}

        </svg>

        {/* 右侧：F-r 关系图表面板 */}
        <div className="flex-1 h-full p-4 border-l border-neutral-100 flex flex-col justify-center bg-white rounded-r-lg">
          <div className="w-full h-[65%] min-h-[220px]">
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
        </div>

      </div>

      <div className="shrink-0 p-3 bg-neutral-50 border-t border-neutral-200 flex items-center gap-4">
        <Button
          onClick={handleContactStart}
          disabled={contactStep !== 'idle'}
        >
          接触带电再分开
        </Button>
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span>拖拽右侧小球改变距离</span>
          {contactStep !== 'idle' && (
            <>
              <span className="text-neutral-400">|</span>
              <span className="text-amber-600 font-semibold animate-pulse">
                {contactStep === 'closing' && '两球正在靠近...'}
                {contactStep === 'sharing' && '碰触！电荷转移中和并平分...'}
                {contactStep === 'opening' && '两球弹回原处...'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
