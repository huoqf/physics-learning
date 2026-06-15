import { FC, useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { PHYSICS_COLORS } from '@/theme/physics'
import { useAnimationStore } from '@/stores'
import { VectorDefs } from '@/components/Physics/VectorDefs'

export const SpringForceCenterExtra: FC = () => {
    const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const [containerRef, canvasSize] = useCanvasSize({ width: 420, height: 315 })
  const { font } = canvasSize

  const k = params.k ?? 100
  const m = params.m ?? 1
  const omega = Math.sqrt(k / m)
  const amplitude = 0.5
  const displacement = amplitude * Math.sin(omega * time)
  const springForce = -k * displacement
  const ep = 0.5 * k * displacement * displacement

  // ── 布局与坐标定义 ──
  const margin = { left: 16, right: 12, top: 15, bottom: 15 }
  const plotW = 100 - margin.left - margin.right // 72
  const plotH = 100 - margin.top - margin.bottom // 70

  const cx = margin.left + plotW / 2 // 52
  const cy = margin.top + plotH / 2  // 50

  // 位移映射范围 x: [-0.6, 0.6]
  const toSvgX = (x: number) => cx + (x / 0.6) * (plotW / 2)
  // 弹力映射范围 F: [-110, 110] (当 k=200, x=0.5 时最大力为 100N)
  const toSvgY = (F: number) => cy - (F / 110) * (plotH / 2)

  // ── 弹性势能三角形面积路径 ──
  const areaPathD = useMemo(() => {
    const startX = toSvgX(0)
    const endX = toSvgX(displacement)
    const endY = toSvgY(springForce)
    return `M ${startX},${cy} L ${endX},${cy} L ${endX},${endY} Z`
  }, [displacement, springForce, cx, cy])

  // ── 计算胡克定律线段端点 ──
  // 在 x = -0.55 和 x = 0.55 处的值
  const xLeft = -0.55
  const fLeft = -k * xLeft
  const xRight = 0.55
  const fRight = -k * xRight

  const lineLeftX = toSvgX(xLeft)
  const lineLeftY = toSvgY(fLeft)
  const lineRightX = toSvgX(xRight)
  const lineRightY = toSvgY(fRight)

  // ── SVG 文本排版大小 ──
  const fs = 3.6
  const sfs = 2.8

  return (
    <div ref={containerRef} className="w-full flex justify-center bg-neutral-50 py-1 border-b border-neutral-100 shrink-0">
      <div className="w-full max-w-[420px] aspect-[4/3] bg-white rounded-xl shadow-sm p-3 border border-neutral-100">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* 弹性势能面积填充渐变 */}
            <linearGradient id="ep-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PHYSICS_COLORS.potentialElastic} stopOpacity="0.25" />
              <stop offset="100%" stopColor={PHYSICS_COLORS.potentialElastic} stopOpacity="0.05" />
            </linearGradient>
            {/* 坐标轴箭头定义 */}
            <VectorDefs colors={[PHYSICS_COLORS.labelText]} />
          </defs>

          {/* 图表标题 */}
          <text x={margin.left} y={margin.top - 7} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            F - x 物理图像 (胡克定律)
          </text>
          <text x={margin.left + 38} y={margin.top - 7} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight}>
            斜率 k = {k} N/m
          </text>

          {/* 1. 网格底图 */}
          {[-0.5, -0.25, 0.25, 0.5].map((val) => {
            const x = toSvgX(val)
            return (
              <line
                key={`grid-x-${val}`}
                x1={x} y1={margin.top} x2={x} y2={margin.top + plotH}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.25}
                strokeDasharray="1,1"
              />
            )
          })}
          {[-100, -50, 50, 100].map((val) => {
            const y = toSvgY(val)
            return (
              <line
                key={`grid-y-${val}`}
                x1={margin.left} y1={y} x2={margin.left + plotW} y2={y}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.25}
                strokeDasharray="1,1"
              />
            )
          })}

          {/* 2. 坐标轴线 */}
          {/* 横轴 x */}
          <line
            x1={margin.left - 2} y1={cy} x2={margin.left + plotW + 3} y2={cy}
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={0.4}
            markerEnd="url(#arrow-medium-1E293B)"
          />
          {/* 纵轴 F */}
          <line
            x1={cx} y1={margin.top + plotH + 2} x2={cx} y2={margin.top - 3}
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={0.4}
            markerEnd="url(#arrow-medium-1E293B)"
          />

          {/* 坐标轴标签 */}
          <text x={margin.left + plotW + 4} y={cy + 1.2} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            x (m)
          </text>
          <text x={cx - 5} y={margin.top - 4} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            F (N)
          </text>

          {/* 3. 刻度值 */}
          {/* x轴刻度 */}
          {[-0.5, 0.5].map((val) => {
            const x = toSvgX(val)
            return (
              <g key={`tick-x-${val}`}>
                <line x1={x} y1={cy} x2={x} y2={cy + 1} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.3} />
                <text x={x} y={cy + 4.2} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontFamily="monospace">
                  {val > 0 ? `+${val}` : val}
                </text>
              </g>
            )
          })}
          {/* y轴刻度 */}
          {[-100, 100].map((val) => {
            const y = toSvgY(val)
            return (
              <g key={`tick-y-${val}`}>
                <line x1={cx - 1} y1={y} x2={cx} y2={y} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.3} />
                <text x={cx - 2} y={y + 1} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">
                  {val > 0 ? `+${val}` : val}
                </text>
              </g>
            )
          })}
          {/* 原点 0 */}
          <text x={cx - 2} y={cy + 3.5} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">0</text>

          {/* 4. 弹性势能三角形面积填充 (F-x 与 x 轴围成的面积) */}
          {Math.abs(displacement) > 0.01 && (
            <path
              d={areaPathD}
              fill="url(#ep-grad)"
              stroke={PHYSICS_COLORS.potentialElastic}
              strokeWidth={0.3}
              strokeDasharray="0.5,0.5"
            />
          )}

          {/* 5. 胡克定律斜直线 F = -kx */}
          <line
            x1={lineLeftX} y1={lineLeftY} x2={lineRightX} y2={lineRightY}
            stroke={PHYSICS_COLORS.elasticForce}
            strokeWidth={0.7}
          />

          {/* 6. 当前状态辅助虚线 */}
          {Math.abs(displacement) > 0.01 && (
            <g>
              <line
                x1={toSvgX(displacement)} y1={cy}
                x2={toSvgX(displacement)} y2={toSvgY(springForce)}
                stroke={PHYSICS_COLORS.displacement}
                strokeWidth={0.3}
                strokeDasharray="1,1"
              />
              <line
                x1={cx} y1={toSvgY(springForce)}
                x2={toSvgX(displacement)} y2={toSvgY(springForce)}
                stroke={PHYSICS_COLORS.elasticForce}
                strokeWidth={0.3}
                strokeDasharray="1,1"
              />
            </g>
          )}

          {/* 7. 动态滑移状态点 (当前形变量与弹力值) */}
          <g>
            <circle
              cx={toSvgX(displacement)}
              cy={toSvgY(springForce)}
              r={2.2}
              fill={PHYSICS_COLORS.elasticForce}
              opacity={0.25}
            />
            <circle
              cx={toSvgX(displacement)}
              cy={toSvgY(springForce)}
              r={1.2}
              fill={PHYSICS_COLORS.elasticForce}
              stroke="#FFFFFF"
              strokeWidth={0.35}
            />
          </g>

          {/* 弹性势能大小实时标注说明 */}
          {Math.abs(displacement) > 0.05 && (
            <text
              x={toSvgX(displacement / 2) + (displacement > 0 ? -12 : 2)}
              y={cy - (springForce / 2) - 1}
              fontSize={font(2.5)}
              fill={PHYSICS_COLORS.potentialElastic}
              fontWeight="bold"
            >
              Ep = {ep.toFixed(2)} J
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}

export default SpringForceCenterExtra
