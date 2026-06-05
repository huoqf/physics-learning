import { useCanvasSize } from '@/utils'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, STROKE } from '@/theme/physics'
import {
  calculateVariableAcceleration,
  calculateInstantaneousVelocity,
} from '@/physics'
import type { VariableMotionModel, VariableMotionParams } from '@/physics'

interface VelocityAnimationStripProps {
  model: VariableMotionModel
  modelParams: VariableMotionParams
  tMax?: number
}

/**
 * 运动动画带（进阶版）
 *
 * 三种模型：
 * - force-increasing: 小车加速
 * - shm: 弹簧+小球往复
 * - multi-stage: 小车往返（5段式，含路程/位移指示）
 */
export default function VelocityAnimationStrip({
  model, modelParams, tMax = 6,
}: VelocityAnimationStripProps) {
  const { params, time } = useAnimationStore()
  const deltaT = params.deltaT ?? 0.5
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 200 })

  // ── 当前物理状态 ──
  const state = calculateVariableAcceleration(model, modelParams, time)
  const { vInst } = calculateInstantaneousVelocity(model, modelParams, time, deltaT)

  // ── 布局 ──
  const padding = canvasSize.width * 0.07
  const groundY = canvasSize.height * 0.62
  const startX = padding
  const endX = canvasSize.width - padding

  // ── 坐标映射 ──
  const xRange = useMemo(() => {
    if (model === 'multi-stage') {
      // 多阶段：需要知道最远点（阶段3末）
      const a1 = modelParams.a1 ?? 2
      const vMax = modelParams.vMax ?? 6
      const t1 = modelParams.t1 ?? 3
      const t2Dur = modelParams.t2Duration ?? 2
      const a3 = modelParams.a3 ?? 3
      const x1End = 0.5 * a1 * t1 * t1
      const x2End = x1End + vMax * t2Dur
      const t3Dur = vMax / a3
      const x3End = x2End + vMax * t3Dur - 0.5 * a3 * t3Dur * t3Dur
      return { min: -x3End * 0.1, max: x3End * 1.15 }
    }
    if (model === 'shm') {
      // 简谐振动：振幅 A 为最大位移，范围关于原点对称
      const A = modelParams.A ?? 5
      const pad = A * 0.2
      return { min: -A - pad, max: A + pad }
    }
    if (model === 'force-increasing') {
      // 变加速：从 x=0 单向增长
      const endState = calculateVariableAcceleration(model, modelParams, tMax)
      const maxVal = Math.abs(endState.x) * 1.2 || 5
      return { min: -maxVal * 0.1, max: maxVal }
    }
    // 兜底
    const endState = calculateVariableAcceleration(model, modelParams, tMax)
    const maxVal = Math.abs(endState.x) * 1.2 || 5
    return { min: -maxVal, max: maxVal }
  }, [model, modelParams, tMax])

  const { scale, toPixelX } = useMemo(() => {
    const s = (endX - startX) / (xRange.max - xRange.min)
    const fn = (val: number) => startX + (val - xRange.min) * s
    return { scale: s, toPixelX: fn }
  }, [xRange, startX, endX])
  const currentX = toPixelX(state.x)

  // ── 多阶段：路程计算 ──
  const totalDistance = useMemo(() => {
    if (model !== 'multi-stage') return 0
    const steps = 200
    let dist = 0
    let prevX = 0
    for (let i = 1; i <= steps; i++) {
      const t = (time * i) / steps
      const s = calculateVariableAcceleration(model, modelParams, t)
      dist += Math.abs(s.x - prevX)
      prevX = s.x
    }
    return dist
  }, [model, modelParams, time])

  // ── 多阶段：当前阶段名称 ──
  const stageName = useMemo(() => {
    if (model !== 'multi-stage') return ''
    const vMax = modelParams.vMax ?? 6
    const t1 = modelParams.t1 ?? 3
    const t2Dur = modelParams.t2Duration ?? 2
    const a3 = modelParams.a3 ?? 3
    const tStop = modelParams.tStop ?? 2
    const t1End = t1
    const t2End = t1End + t2Dur
    const t3Dur = vMax / a3
    const t3End = t2End + t3Dur
    const t4End = t3End + tStop
    if (time <= t1End) return '正向加速'
    if (time <= t2End) return '正向匀速'
    if (time <= t3End) return '正向减速'
    if (time <= t4End) return '卸货停留'
    return '快速返回'
  }, [model, modelParams, time])

  // ── 打点轨迹 ──
  const dotTrail = useMemo(() => {
    const dots: number[] = []
    const steps = 120
    for (let i = 0; i <= steps; i++) {
      const t = (time * i) / steps
      const s = calculateVariableAcceleration(model, modelParams, t)
      const px = toPixelX(s.x)
      if (px >= startX && px <= endX) dots.push(px)
    }
    return dots
  }, [model, modelParams, time, toPixelX, startX, endX])

  // ── 地面刻度 ──
  const groundTicks = useMemo(() => {
    const count = 8
    const ticks: { x: number; label: string }[] = []
    for (let i = 0; i <= count; i++) {
      const val = xRange.min + ((xRange.max - xRange.min) * i) / count
      ticks.push({ x: toPixelX(val), label: val.toFixed(1) })
    }
    return ticks
  }, [xRange, toPixelX])

  // ── 字体 ──
  const fontSize = Math.max(10, canvasSize.width * 0.017)
  const smallFont = Math.max(9, fontSize * 0.85)

  // ── 物体尺寸 ──
  const objW = canvasSize.width * 0.06
  const objH = objW * 0.7

  // ── 模型名称 ──
  const modelNames: Record<string, string> = {
    'force-increasing': '变加速（F递增）',
    'shm': '简谐振动',
    'multi-stage': '往返多阶段',
  }

  // ── 弹簧路径（简谐振动专用）──
  const springPathD = useMemo(() => {
    if (model !== 'shm') return ''
    const springAnchorX = padding
    const ballCenterX = currentX
    const springEndX = ballCenterX - objW / 2
    const n = 14
    const segLen = (springEndX - springAnchorX) / n
    let d = `M ${springAnchorX},${groundY - objH / 2}`
    for (let i = 1; i <= n; i++) {
      const x = springAnchorX + segLen * i
      const y = (i % 2 === 0)
        ? groundY - objH / 2
        : (i % 4 === 1)
          ? groundY - objH / 2 - 6
          : groundY - objH / 2 + 6
      d += ` L ${x},${y}`
    }
    return d
  }, [model, padding, currentX, objW, objH, groundY])

  // ── 多阶段：A/B 标志位置 ──
  const { pointA, pointB } = useMemo(() => {
    const a = toPixelX(0)
    if (model !== 'multi-stage') return { pointA: a, pointB: 0 }
    const a1 = modelParams.a1 ?? 2
    const vMax = modelParams.vMax ?? 6
    const t1 = modelParams.t1 ?? 3
    const t2Dur = modelParams.t2Duration ?? 2
    const a3 = modelParams.a3 ?? 3
    const x1End = 0.5 * a1 * t1 * t1
    const x2End = x1End + vMax * t2Dur
    const t3Dur = vMax / a3
    const x3End = x2End + vMax * t3Dur - 0.5 * a3 * t3Dur * t3Dur
    return { pointA: a, pointB: toPixelX(x3End) }
  }, [model, modelParams, toPixelX])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {/* ── 场景标签 ── */}
        <text x={padding} y={fontSize + 4} fontSize={fontSize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
          {modelNames[model] ?? model} — v = {vInst.toFixed(2)} m/s
        </text>

        {/* ── 多阶段阶段状态标签 ── */}
        {model === 'multi-stage' && stageName && (
          <text x={canvasSize.width - padding} y={fontSize + 4} fontSize={fontSize} fill={PHYSICS_COLORS.averageVelocity} fontWeight="bold" textAnchor="end">
            {stageName}
          </text>
        )}

        {/* ── 地面线 ── */}
        <line
          x1={padding * 0.5} y1={groundY}
          x2={canvasSize.width - padding * 0.5} y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />

        {/* ── 地面刻度 ── */}
        {groundTicks.map((gt, i) => (
          <g key={`gt-${i}`}>
            <line x1={gt.x} y1={groundY} x2={gt.x} y2={groundY + 6} stroke={PHYSICS_COLORS.labelText} strokeWidth={1} />
            <text x={gt.x} y={groundY + fontSize + 6} fontSize={smallFont} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
              {gt.label}m
            </text>
          </g>
        ))}

        {/* ── 打点轨迹 ── */}
        {dotTrail.filter((_, i) => i % 5 === 0).map((dx, i) => (
          <circle key={`dot-${i}`} cx={dx} cy={groundY + 2} r={3} fill={PHYSICS_COLORS.trackHistory} />
        ))}

        {/* ── 当前时刻竖线 ── */}
        <line
          x1={currentX} y1={groundY - objH * 2}
          x2={currentX} y2={groundY + 4}
          stroke={PHYSICS_COLORS.velocity} strokeWidth={1}
          strokeDasharray="4,4" opacity={0.4}
        />

        {/* ══════════ 多阶段专属元素 ══════════ */}
        {model === 'multi-stage' && (
          <>
            {/* 起点A标志 */}
            <circle cx={pointA} cy={groundY} r={5} fill="none" stroke={PHYSICS_COLORS.displacement} strokeWidth={2} />
            <text x={pointA} y={groundY + fontSize + 18} fontSize={fontSize} fill={PHYSICS_COLORS.displacement} fontWeight="bold" textAnchor="middle">A</text>

            {/* 终点B标志 */}
            <circle cx={pointB} cy={groundY} r={5} fill="none" stroke={PHYSICS_COLORS.averageVelocity} strokeWidth={2} />
            <text x={pointB} y={groundY + fontSize + 18} fontSize={fontSize} fill={PHYSICS_COLORS.averageVelocity} fontWeight="bold" textAnchor="middle">B</text>

            {/* 路程填充带（从A到当前位置，折返时不缩短） */}
            <rect
              x={Math.min(pointA, currentX)}
              y={groundY + 14}
              width={Math.abs(currentX - pointA)}
              height={6}
              fill={PHYSICS_COLORS.averageVelocity}
              opacity={0.25}
              rx={2}
            />
            <text
              x={(pointA + currentX) / 2}
              y={groundY + 28}
              fontSize={smallFont} fill={PHYSICS_COLORS.averageVelocity} textAnchor="middle"
            >
              s={totalDistance.toFixed(1)}m
            </text>

            {/* 位移指示线（从A直接连到当前位置，折返时缩短） */}
            <line
              x1={pointA} y1={groundY - objH - 8}
              x2={currentX} y2={groundY - objH - 8}
              stroke={PHYSICS_COLORS.displacement}
              strokeWidth={2}
              markerEnd="url(#arrowhead-disp-strip)"
            />
            <text
              x={(pointA + currentX) / 2}
              y={groundY - objH - 14}
              fontSize={smallFont} fill={PHYSICS_COLORS.displacement} textAnchor="middle"
            >
              Δx={state.x.toFixed(1)}m
            </text>
          </>
        )}

        {/* ══════════ 简谐振动 ══════════ */}
        {model === 'shm' && (
          <>
            {/* 平衡位置虚线 */}
            <line
              x1={toPixelX(0)} y1={groundY - objH * 2}
              x2={toPixelX(0)} y2={groundY + 4}
              stroke={PHYSICS_COLORS.labelText} strokeWidth={1}
              strokeDasharray="6,4" opacity={0.4}
            />
            <text x={toPixelX(0)} y={groundY + fontSize + 6} fontSize={smallFont} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">0</text>

            {/* 固定端 */}
            <rect
              x={padding - 4} y={groundY - objH * 1.2}
              width={6} height={objH * 1.2}
              fill={PHYSICS_COLORS.labelText} rx={2}
            />

            {/* 弹簧 */}
            {springPathD && (
              <path d={springPathD} fill="none" stroke={PHYSICS_COLORS.displacement} strokeWidth={2} />
            )}

            {/* 小球 */}
            <circle
              cx={currentX} cy={groundY - objH / 2}
              r={objW * 0.4}
              fill={PHYSICS_COLORS.objectFill} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={STROKE.objectLine}
            />
            <circle
              cx={currentX} cy={groundY - objH / 2}
              r={objW * 0.12}
              fill={PHYSICS_COLORS.objectStroke} opacity={0.3}
            />

            {/* 位移标注 */}
            {Math.abs(state.x) > 0.5 && (
              <g>
                <line
                  x1={toPixelX(0)} y1={groundY + 16}
                  x2={currentX} y2={groundY + 16}
                  stroke={PHYSICS_COLORS.displacement} strokeWidth={1.5}
                />
                <text
                  x={(toPixelX(0) + currentX) / 2}
                  y={groundY + 30}
                  fontSize={smallFont} fill={PHYSICS_COLORS.displacement} textAnchor="middle"
                >
                  x={state.x.toFixed(1)}m
                </text>
              </g>
            )}
          </>
        )}

        {/* ══════════ 变加速 / 多阶段：小车 ══════════ */}
        {(model === 'force-increasing' || model === 'multi-stage') && (
          <g transform={`translate(${currentX - objW / 2}, ${groundY - objH})`}>
            {/* 车身 */}
            <rect width={objW} height={objH} rx={4} fill={PHYSICS_COLORS.objectFill} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={STROKE.objectLine} />
            {/* 车顶 */}
            <rect x={objW * 0.6} y={objH * 0.1} width={objW * 0.35} height={objH * 0.4} rx={2} fill={PHYSICS_COLORS.grid} />
            {/* 车轮 */}
            <circle cx={objW * 0.2} cy={objH - 2} r={objH * 0.12} fill={PHYSICS_COLORS.labelText} />
            <circle cx={objW * 0.8} cy={objH - 2} r={objH * 0.12} fill={PHYSICS_COLORS.labelText} />
          </g>
        )}

        {/* ── 速度矢量箭头 ── */}
        {Math.abs(vInst) > 0.1 && (
          <g>
            <line
              x1={currentX + (vInst > 0 ? objW / 2 + 4 : -objW / 2 - 4)}
              y1={groundY - objH / 2}
              x2={currentX + (vInst > 0 ? objW / 2 + 4 + vInst * scale * 0.15 : -objW / 2 - 4 + vInst * scale * 0.15)}
              y2={groundY - objH / 2}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={STROKE.vectorSub}
              markerEnd="url(#arrowhead-strip-v)"
            />
            <text
              x={currentX + (vInst > 0 ? objW / 2 + 8 + vInst * scale * 0.15 : -objW / 2 - 8 + vInst * scale * 0.15)}
              y={groundY - objH / 2 + fontSize * 0.35}
              fontSize={fontSize} fill={PHYSICS_COLORS.velocity} fontWeight="bold"
            >
              v
            </text>
          </g>
        )}

        {/* ── 变加速：加速度箭头（随时间增长） ── */}
        {model === 'force-increasing' && Math.abs(state.a) > 0.05 && (
          <g>
            <line
              x1={currentX}
              y1={groundY - objH - 6}
              x2={currentX + state.a * scale * 0.12}
              y2={groundY - objH - 6}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={STROKE.vectorSub}
              markerEnd="url(#arrowhead-strip-a)"
            />
            <text
              x={currentX + state.a * scale * 0.12 + 6}
              y={groundY - objH - 6 + fontSize * 0.35}
              fontSize={fontSize} fill={PHYSICS_COLORS.acceleration} fontWeight="bold"
            >
              a={state.a.toFixed(1)}
            </text>
          </g>
        )}

        {/* ── 箭头标记定义 ── */}
        <defs>
          <marker id="arrowhead-strip-v" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-strip-a" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.acceleration} />
          </marker>
          <marker id="arrowhead-disp-strip" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.displacement} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
