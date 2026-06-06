import { useCanvasSize } from '@/utils'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, SCENE_COLORS, STROKE, DASH, OBJECT } from '@/theme/physics'
import { calculateInstantaneousVelocity } from '@/physics'
import type { VariableMotionModel, VariableMotionParams } from '@/physics'
import { useVelocityPhysics } from './useVelocityPhysics'

interface VelocityAnimationStripProps {
  model: VariableMotionModel
  modelParams: VariableMotionParams
  tMax?: number
}

export default function VelocityAnimationStrip({
  model, modelParams, tMax = 6,
}: VelocityAnimationStripProps) {
  const { params, time, isPlaying } = useAnimationStore()
  const deltaT = params.deltaT ?? 0.5
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 200 })

  // ── 布局参数 ──
  const padding = canvasSize.width * 0.07
  const groundY = canvasSize.height * 0.62
  const startX = padding
  const endX = canvasSize.width - padding

  // ── 物理引擎应用 (离线预计算与插值) ──
  const { points, currentState } = useVelocityPhysics(model, modelParams, tMax, time)
  const state = currentState // x, v, a, s

  // 瞬时速度
  const { vInst } = calculateInstantaneousVelocity(model, modelParams, time, deltaT)

  // ── 坐标映射 ──
  const xRange = useMemo(() => {
    if (model === 'multi-stage') {
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
      const A = modelParams.A ?? 5
      const pad = A * 0.2
      return { min: -A - pad, max: A + pad }
    }
    if (model === 'force-increasing') {
      const maxVal = Math.abs(points[points.length - 1]?.x ?? 5) * 1.2 || 5
      return { min: -maxVal * 0.1, max: maxVal }
    }
    return { min: -5, max: 5 }
  }, [model, modelParams, points])

  const { scale, toPixelX } = useMemo(() => {
    const s = (endX - startX) / (xRange.max - xRange.min)
    const fn = (val: number) => startX + (val - xRange.min) * s
    return { scale: s, toPixelX: fn }
  }, [xRange, startX, endX])

  const currentX = toPixelX(state.x)

  // ── 多阶段：路程计算直接读取预计算插值 ──
  const totalDistance = state.s

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

  // ── 打点轨迹（基于插值点快速抽取，避免每帧循环计算） ──
  const dotTrail = useMemo(() => {
    // 步长为 0.01s，每隔 5 个点抽取一个 0.05s 的轨迹点
    const pts = points.filter(p => p.t <= time + 1e-9 && Math.round(p.t * 100) % 5 === 0)
    return pts.map(p => toPixelX(p.x))
  }, [points, time, toPixelX])

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

  // ── 字体与尺寸 ──
  const fontSize = Math.max(10, canvasSize.width * 0.017)
  const smallFont = Math.max(9, fontSize * 0.85)
  const objW = canvasSize.width * 0.06
  const objH = objW * 0.7

  const modelNames: Record<string, string> = {
    'force-increasing': '变加速（F递增）',
    'shm': '简谐振动',
    'multi-stage': '往返多阶段',
  }

  // ── 三维立体环绕弹簧路径（前半圈和后半圈咬合深度） ──
  const springPathD = useMemo(() => {
    if (model !== 'shm') return { front: '', back: '' }
    const springAnchorX = padding
    const ballCenterX = currentX
    const springEndX = ballCenterX - objW * 0.4
    const loops = 16
    const width = springEndX - springAnchorX
    
    let backD = ''
    let frontD = ''
    
    const springY = groundY - objH / 2 - 2
    const rY = 9 // 螺圈垂直半径

    for (let i = 0; i < loops; i++) {
      const cx = springAnchorX + i * (width / loops)
      const nx = springAnchorX + (i + 1) * (width / loops)
      const mx = (cx + nx) / 2
      
      // 后半圈 (由下朝上，位于球/小轴后面，细线暗色)
      backD += ` M ${cx},${springY + rY} C ${cx - 2},${springY - rY * 0.6} ${mx - 2},${springY - rY} ${mx},${springY - rY}`
      // 前半圈 (由上朝下，绕过前面，粗线高光)
      frontD += ` M ${mx},${springY - rY} C ${mx + 2},${springY + rY} ${nx + 2},${springY + rY} ${nx},${springY + rY}`
    }
    return { front: frontD, back: backD }
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
        {/* 定义高级金属和发光渐变 */}
        <defs>
          {/* 科学气垫导轨拉丝金属渐变 */}
          <linearGradient id="rail-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9CA3AF" />
            <stop offset="35%" stopColor="#E5E7EB" />
            <stop offset="70%" stopColor="#D1D5DB" />
            <stop offset="100%" stopColor="#4B5563" />
          </linearGradient>
          {/* 滑块不锈钢拉丝渐变 */}
          <linearGradient id="slider-metal-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F9FAFB" />
            <stop offset="35%" stopColor="#D1D5DB" />
            <stop offset="70%" stopColor="#6B7280" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>
          {/* 钢弹簧前半圈高光渐变 */}
          <linearGradient id="spring-front-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* 箭头标记 */}
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

        {/* ── 场景大标题 ── */}
        <text x={padding} y={fontSize + 4} fontSize={fontSize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
          {modelNames[model] ?? model}{model === 'multi-stage' && stageName ? ` · ${stageName}` : ''} — v = {vInst.toFixed(2)} m/s
        </text>

        {/* ── 1. 科学精密气垫导轨底座 ── */}
        <g>
          {/* 导轨本体 */}
          <rect
            x={padding * 0.4} y={groundY - 5}
            width={canvasSize.width - padding * 0.8} height={12}
            fill="url(#rail-grad)" stroke="#4B5563" strokeWidth={1} rx={1}
          />
          {/* 导轨顶层高光亮条 */}
          <line
            x1={padding * 0.4 + 2} y1={groundY - 3}
            x2={canvasSize.width - padding * 0.8 - 2} y2={groundY - 3}
            stroke="#FFFFFF" strokeWidth={1.5} opacity={0.4}
          />
          {/* 轨道小分度精密标尺刻度 */}
          {Array.from({ length: 161 }).map((_, idx) => {
            const rx = padding * 0.5 + ((canvasSize.width - padding) * idx) / 160
            const isLong = idx % 10 === 0
            const tickH = isLong ? 5 : 2
            return (
              <line
                key={`tick-${idx}`}
                x1={rx} y1={groundY - 5}
                x2={rx} y2={groundY - 5 + tickH}
                stroke={SCENE_COLORS.spring.coilDark} strokeWidth={0.5} opacity={0.6}
              />
            )
          })}
        </g>

        {/* 地面标尺文字标注 */}
        {groundTicks.map((gt, i) => (
          <g key={`gt-${i}`}>
            <text x={gt.x} y={groundY + fontSize + 12} fontSize={smallFont} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
              {gt.label}m
            </text>
          </g>
        ))}

        {/* ── 2. 打点轨迹（发光渐变） ── */}
        {dotTrail.map((dx, i) => {
          const opacity = dotTrail.length <= 1 ? 0.8 : 0.2 + 0.7 * (i / (dotTrail.length - 1))
          return (
            <g key={`dot-${i}`}>
              <circle cx={dx} cy={groundY + 12} r={OBJECT.minRadius + 2} fill={PHYSICS_COLORS.trackHistory} opacity={opacity * 0.2} />
              <circle cx={dx} cy={groundY + 12} r={OBJECT.minRadius} fill={PHYSICS_COLORS.trackHistory} opacity={opacity} />
            </g>
          )
        })}

        {/* ── 3. 当前时刻时间垂线 ── */}
        <line
          x1={currentX} y1={groundY - objH * 2}
          x2={currentX} y2={groundY - 5}
          stroke={PHYSICS_COLORS.velocity} strokeWidth={STROKE.reference}
          strokeDasharray={DASH.guide.join(',')} opacity={0.3}
        />

        {/* ══════════ 简谐振动：弹簧后半圈 (渲染在球体后方) ══════════ */}
        {model === 'shm' && springPathD.back && (
          <path d={springPathD.back} fill="none" stroke="#4B5563" strokeWidth={1.5} opacity={0.65} strokeLinecap="round" />
        )}

        {/* ══════════ 简谐振动：平衡位置及固定端 ══════════ */}
        {model === 'shm' && (
          <>
            {/* 平衡位置虚轴线 */}
            <line
              x1={toPixelX(0)} y1={groundY - objH * 2}
              x2={toPixelX(0)} y2={groundY - 5}
              stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.reference}
              strokeDasharray={DASH.boundary.join(',')} opacity={0.3}
            />
            {/* 平衡原点标注 */}
            <text x={toPixelX(0)} y={groundY + fontSize + 12} fontSize={smallFont} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">0</text>

            {/* 实验台固定架端 */}
            <rect
              x={padding - 4} y={groundY - objH * 1.3}
              width={6} height={objH * 1.3}
              fill="url(#slider-metal-grad)" stroke={SCENE_COLORS.circuit.wire} strokeWidth={0.5} rx={1}
            />
          </>
        )}

        {/* ══════════ 运动物主体（滑块小车/振动小球） ══════════ */}
        {model === 'shm' ? (
          // 振动金属球 (立体高光径向渐变)
          <circle
            cx={currentX} cy={groundY - objH / 2 - 2}
            r={objW * 0.4}
            fill="url(#slider-metal-grad)" stroke={SCENE_COLORS.spring.coilDark} strokeWidth={STROKE.objectThin}
          />
        ) : (
          // 变加速 / 多阶段：不锈钢滑块小车
          <g transform={`translate(${currentX - objW / 2}, ${groundY - objH - 5})`}>
            {/* 滑块车身 */}
            <rect width={objW} height={objH} rx={3} fill="url(#slider-metal-grad)" stroke={SCENE_COLORS.circuit.wire} strokeWidth={STROKE.objectThin} />
            {/* 传感器激光红色指示灯 (播放时高频闪烁) */}
            <circle
              cx={objW - 4} cy={objH * 0.3} r={2}
              fill={SCENE_COLORS.spring.compressed}
              opacity={isPlaying && Math.floor(time * 10) % 2 === 0 ? 1 : 0.3}
              filter={`drop-shadow(0 0 1.5px ${SCENE_COLORS.spring.compressed})`}
            />
            {/* 车轮（带辐条） */}
            <circle cx={objW * 0.22} cy={objH} r={objH * 0.16} fill="url(#wheel-grad)" />
            <circle cx={objW * 0.22} cy={objH} r={objH * 0.08} fill={SCENE_COLORS.circuit.bulbGlassStroke} />
            <circle cx={objW * 0.78} cy={objH} r={objH * 0.16} fill="url(#wheel-grad)" />
            <circle cx={objW * 0.78} cy={objH} r={objH * 0.08} fill={SCENE_COLORS.circuit.bulbGlassStroke} />
          </g>
        )}

        {/* ══════════ 简谐振动：弹簧前半圈 (环绕渲染在球体前方) ══════════ */}
        {model === 'shm' && springPathD.front && (
          <path d={springPathD.front} fill="none" stroke="url(#spring-front-grad)" strokeWidth={2.8} strokeLinecap="round" />
        )}

        {/* ══════════ 简谐振动：位移标注 ══════════ */}
        {model === 'shm' && Math.abs(state.x) > 0.4 && (
          <g>
            <line
              x1={toPixelX(0)} y1={groundY + 28}
              x2={currentX} y2={groundY + 28}
              stroke={PHYSICS_COLORS.displacement} strokeWidth={1.2}
            />
            <line x1={toPixelX(0)} y1={groundY + 24} x2={toPixelX(0)} y2={groundY + 32} stroke={PHYSICS_COLORS.displacement} strokeWidth={1} />
            <line x1={currentX} y1={groundY + 24} x2={currentX} y2={groundY + 32} stroke={PHYSICS_COLORS.displacement} strokeWidth={1} />
            <text
              x={(toPixelX(0) + currentX) / 2}
              y={groundY + 41}
              fontSize={smallFont} fill={PHYSICS_COLORS.displacement} textAnchor="middle" fontWeight="bold"
            >
              x = {state.x.toFixed(1)}m
            </text>
          </g>
        )}

        {/* ══════════ 多阶段专属：A/B 标志 ══════════ */}
        {model === 'multi-stage' && (
          <>
            {/* 起点A标志 */}
            <circle cx={pointA} cy={groundY} r={5} fill="none" stroke={PHYSICS_COLORS.displacement} strokeWidth={1.5} />
            <text x={pointA} y={groundY + fontSize + 23} fontSize={fontSize} fill={PHYSICS_COLORS.displacement} fontWeight="bold" textAnchor="middle">A</text>

            {/* 终点B标志 */}
            <circle cx={pointB} cy={groundY} r={5} fill="none" stroke={PHYSICS_COLORS.averageVelocity} strokeWidth={1.5} />
            <text x={pointB} y={groundY + fontSize + 23} fontSize={fontSize} fill={PHYSICS_COLORS.averageVelocity} fontWeight="bold" textAnchor="middle">B</text>

            {/* 路程填充指示带 */}
            <rect
              x={Math.min(pointA, currentX)}
              y={groundY + 16}
              width={Math.abs(currentX - pointA)}
              height={5}
              fill={PHYSICS_COLORS.averageVelocity}
              opacity={0.25}
              rx={1.5}
            />
            <text
              x={(pointA + currentX) / 2}
              y={groundY + 32}
              fontSize={smallFont} fill={PHYSICS_COLORS.averageVelocity} textAnchor="middle" fontWeight="bold"
            >
              s = {totalDistance.toFixed(1)}m
            </text>

            {/* 位移指示线与箭头 */}
            <line
              x1={pointA} y1={groundY - objH - 12}
              x2={currentX} y2={groundY - objH - 12}
              stroke={PHYSICS_COLORS.displacement}
              strokeWidth={STROKE.objectLine}
              markerEnd="url(#arrowhead-disp-strip)"
            />
            <text
              x={(pointA + currentX) / 2}
              y={groundY - objH - 18}
              fontSize={smallFont} fill={PHYSICS_COLORS.displacement} textAnchor="middle" fontWeight="bold"
            >
              Δx = {state.x.toFixed(1)}m
            </text>
          </>
        )}

        {/* ── 速度矢量箭头 ── */}
        {Math.abs(vInst) > 0.1 && (
          <g>
            <line
              x1={currentX + (vInst > 0 ? objW / 2 + 4 : -objW / 2 - 4)}
              y1={groundY - objH / 2 - (model === 'shm' ? 2 : 5)}
              x2={currentX + (vInst > 0 ? objW / 2 + 4 + vInst * scale * 0.15 : -objW / 2 - 4 + vInst * scale * 0.15)}
              y2={groundY - objH / 2 - (model === 'shm' ? 2 : 5)}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={STROKE.vectorSub}
              markerEnd="url(#arrowhead-strip-v)"
            />
            <text
              x={currentX + (vInst > 0 ? objW / 2 + 8 + vInst * scale * 0.15 : -objW / 2 - 8 + vInst * scale * 0.15)}
              y={groundY - objH / 2 + fontSize * 0.35 - (model === 'shm' ? 2 : 5)}
              fontSize={fontSize} fill={PHYSICS_COLORS.velocity} fontWeight="bold"
            >
              v
            </text>
          </g>
        )}

        {/* ── 变加速：加速度矢量箭头 ── */}
        {model === 'force-increasing' && Math.abs(state.a) > 0.05 && (
          <g>
            <line
              x1={currentX}
              y1={groundY - objH - 11}
              x2={currentX + state.a * scale * 0.12}
              y2={groundY - objH - 11}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={STROKE.vectorSub}
              markerEnd="url(#arrowhead-strip-a)"
            />
            <text
              x={currentX + state.a * scale * 0.12 + 6}
              y={groundY - objH - 11 + fontSize * 0.35}
              fontSize={fontSize} fill={PHYSICS_COLORS.acceleration} fontWeight="bold"
            >
              a = {state.a.toFixed(1)}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
