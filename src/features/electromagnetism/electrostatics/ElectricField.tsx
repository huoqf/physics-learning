/**
 * ElectricField.tsx — 电场强度交互动画（薄壳）
 *
 * 职责：Store 订阅 + 参数提取 + 布局计算 + 组合子组件
 */
import { useState, useEffect, useRef } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { useElectricFieldPhysics } from './hooks/useElectricFieldPhysics'
import { ElectricFieldBasicScene } from './ElectricFieldBasicScene'
import { ElectricFieldAdvancedScene } from './ElectricFieldAdvancedScene'

export default function ElectricField() {
  const { params, showFormulas } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      showFormulas: s.showFormulas,
    }))
  )
  const updateParam = useAnimationStore((s) => s.updateParam)

  // 教学模式：0 = 基础单电荷，1 = 进阶双电荷
  const mode = params.mode ?? 0
  const qTest = params.qTest ?? 1.0
  const rTest = params.rTest ?? 3.0
  const showFieldLines = (params.showFieldLines ?? 1) === 1

  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 480 })
  const svgRef = useRef<SVGSVGElement>(null)

  const w = canvasSize.width
  const h = canvasSize.height
  const centerY = h / 2
  const pxPerCm = w / 20

  // 基础模式下的物理区域源电荷中心
  const cx = w * 0.3
  const cy = centerY

  // 进阶模式下的两个固定源电荷位置
  const cx1 = w * 0.22
  const cy1 = centerY
  const cx2 = w * 0.52
  const cy2 = centerY

  // 试探电荷的实际像素坐标
  const [testX, setTestX] = useState(cx + rTest * pxPerCm)
  const [testY, setTestY] = useState(cy)
  const [isDragging, setIsDragging] = useState(false)
  const wasDraggingRef = useRef(false)

  // 源电荷电量
  const qSource = params.q ?? 5.0
  const chargeConfig = params.chargeConfig ?? 0
  const q1 = chargeConfig === 2 ? -5.0 : 5.0
  const q2 = chargeConfig === 0 ? -5.0 : (chargeConfig === 2 ? -5.0 : 5.0)

  // 监听滑块参数更新
  useEffect(() => {
    if (isDragging) {
      wasDraggingRef.current = true
      return
    }
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false
      return
    }
    if (mode === 0) {
      setTestX(cx + rTest * pxPerCm)
      setTestY(cy)
    } else {
      const midX = (cx1 + cx2) / 2
      const midY = (cy1 + cy2) / 2
      setTestX(midX + rTest * pxPerCm)
      setTestY(midY)
    }
  }, [rTest, mode, cx, cy, cx1, cx2, cy1, cy2, isDragging])

  // 物理计算
  const physics = useElectricFieldPhysics({
    mode, qSource, qTest, q1, q2, chargeConfig, showFieldLines,
    testX, testY, cx, cy, cx1, cy1, cx2, cy2,
    w, h, pxPerCm,
  })

  // 鼠标拖拽事件处理
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const dist = Math.sqrt((x - testX) ** 2 + (y - testY) ** 2)
    if (dist < 24) {
      setIsDragging(true)
      svg.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    let x = e.clientX - rect.left
    let y = e.clientY - rect.top

    x = Math.max(15, Math.min(w - 15, x))
    y = Math.max(15, Math.min(h - 15, y))

    if (mode === 0) {
      x = Math.min(w * 0.58, x)
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (d < 18) return

      setTestX(x)
      setTestY(y)

      const distCm = d / pxPerCm
      const clampedCm = Math.max(1.0, Math.min(6.0, distCm))
      updateParam('rTest', clampedCm)
    } else {
      const d1 = Math.sqrt((x - cx1) ** 2 + (y - cy1) ** 2)
      const d2 = Math.sqrt((x - cx2) ** 2 + (y - cy2) ** 2)
      if (d1 < 18 || d2 < 18) return

      setTestX(x)
      setTestY(y)

      const midX = (cx1 + cx2) / 2
      const midY = (cy1 + cy2) / 2
      const distCm = Math.sqrt((x - midX) ** 2 + (y - midY) ** 2) / pxPerCm
      const clampedCm = Math.max(0.1, Math.min(8.0, distCm))
      updateParam('rTest', clampedCm)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging) {
      setIsDragging(false)
      svgRef.current?.releasePointerCapture(e.pointerId)
    }
  }

  // 辅助网格（已移除）
  const gridLines = null

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        ref={svgRef}
        width={w}
        height={h}
        className="bg-white rounded-lg shadow-inner select-none cursor-crosshair block"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* 1. 坐标背景与辅助网格 */}
        {gridLines}

        {/* 2. 背景电场线 */}
        {physics.fieldLinesPaths.map((d, idx) => (
          <path
            key={`field-line-${idx}`}
            d={d}
            stroke={PHYSICS_COLORS.electricFieldLine}
            strokeWidth={1.2}
            strokeDasharray="4,4"
            fill="none"
            markerEnd="url(#arrow-efield)"
            opacity={0.3}
          />
        ))}

        {/* 3. 基础模式 */}
        {mode === 0 && (
          <ElectricFieldBasicScene
            w={w}
            h={h}
            cx={cx}
            cy={cy}
            qSource={qSource}
            qTest={qTest}
            testX={testX}
            testY={testY}
            isDragging={isDragging}
            basicPhysics={physics.basicPhysics}
            basicArrows={physics.basicArrows}
            chartProps={physics.chartProps}
          />
        )}

        {/* 4. 进阶模式 */}
        {mode === 1 && (
          <ElectricFieldAdvancedScene
            w={w}
            h={h}
            cx1={cx1}
            cy1={cy1}
            cx2={cx2}
            cy2={cy2}
            q1={q1}
            q2={q2}
            qTest={qTest}
            testX={testX}
            testY={testY}
            isDragging={isDragging}
            advancedArrows={physics.advancedArrows}
          />
        )}

        {/* 公式悬浮看板 */}
        {showFormulas && (
          <g transform="translate(20, 20)">
            <rect
              x={0}
              y={0}
              width={210}
              height={mode === 0 ? 130 : 110}
              fill={colors.neutral.white}
              opacity={0.92}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={1.5}
              rx={6}
            />
            <g transform="translate(12, 18)">
              <text
                fontSize={CANVAS_STYLE.font.bodySize}
                fill={PHYSICS_COLORS.labelText}
                fontWeight="bold"
              >
                {mode === 0 ? '电场强度比值定义' : '合电场强度矢量叠加'}
              </text>

              {mode === 0 ? (
                <>
                  <text x={0} y={24} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText}>
                    场强大小：E = {physics.basicPhysics.E.toExponential(2)} N/C
                  </text>
                  <text x={0} y={44} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText}>
                    静电力：F = {physics.basicPhysics.F.toExponential(2)} N
                  </text>
                  <text x={0} y={64} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.electricField} fontWeight="bold">
                    定义式：E = F / |q|
                  </text>
                  <text x={0} y={84} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.electricForce} fontWeight="bold">
                    决定式：E = k·Q/r²
                  </text>
                  <text x={0} y={100} fontSize="10" fill={colors.neutral[500]}>
                    * 改变试探电荷 q，E保持恒定！
                  </text>
                </>
              ) : (
                <>
                  <text x={0} y={24} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText}>
                    E₁ = {Math.sqrt(physics.advancedPhysics.E1x ** 2 + physics.advancedPhysics.E1y ** 2).toExponential(1)} N/C
                  </text>
                  <text x={0} y={44} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText}>
                    E₂ = {Math.sqrt(physics.advancedPhysics.E2x ** 2 + physics.advancedPhysics.E2y ** 2).toExponential(1)} N/C
                  </text>
                  <text x={0} y={64} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.electricField} fontWeight="bold">
                    合场强：E合 = E₁ + E₂
                  </text>
                  <text x={0} y={82} fontSize="10" fill={colors.neutral[500]}>
                    * 拖拽 P 点感受平行四边形合成
                  </text>
                </>
              )}
            </g>
          </g>
        )}

        {/* Defs */}
        <defs>
          <marker
            id="arrow-efield"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.electricFieldLine} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
