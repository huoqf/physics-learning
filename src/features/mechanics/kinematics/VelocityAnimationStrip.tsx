import { useCanvasSize } from '@/utils'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, SCENE_COLORS, STROKE, DASH, OBJECT } from '@/theme/physics'
import { Spring } from '@/components/UI'
import { calculateInstantaneousVelocity } from '@/physics'
import type { VariableMotionModel, VariableMotionParams } from '@/physics'
import { useVelocityPhysics } from './useVelocityPhysics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { Ball } from '@/components/Physics/Ball'
import { Block } from '@/components/Physics/Block'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

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

  const { toPixelX } = useMemo(() => {
    const s = (endX - startX) / (xRange.max - xRange.min)
    const fn = (val: number) => startX + (val - xRange.min) * s
    return { toPixelX: fn }
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

  // ── 矢量场景配置 ──
  const maxVel = useMemo(() => {
    if (model === 'shm') return (modelParams.A ?? 5) * (modelParams.omega ?? 2)
    if (model === 'force-increasing') return Math.abs(points[points.length - 1]?.v ?? 5) * 1.2 || 10
    return modelParams.vMax ?? 6
  }, [model, modelParams, points])
  const maxAcc = useMemo(() => {
    if (model === 'shm') return (modelParams.A ?? 5) * (modelParams.omega ?? 2) ** 2
    return Math.abs(modelParams.a1 ?? 2) * 1.5
  }, [model, modelParams])

  const stripScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: 0,
    originY: 0,
    refMagnitudes: { velocity: maxVel, acceleration: maxAcc },
  }
  const sceneScale = createSceneScale(stripScene)


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
          {/* 箭头标记 */}
          <VectorDefs colors={[PHYSICS_COLORS.velocity, PHYSICS_COLORS.acceleration, PHYSICS_COLORS.displacement]} />
        </defs>

        {/* ── 场景大标题 ── */}
        <text x={padding} y={fontSize + 4} fontSize={fontSize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
          {model === 'multi-stage' && stageName ? `${stageName} · ` : ''}v = {vInst.toFixed(2)} m/s
        </text>

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

        {/* ══════════ 简谐振动：统一 3D 螺旋弹簧 ══════════ */}
        {model === 'shm' && (
          <Spring
            x1={padding}
            y1={groundY - objH / 2 - 2}
            x2={currentX - objW * 0.4}
            y2={groundY - objH / 2 - 2}
            coils={16}
            radius={9}
          />
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
          </>
        )}

        {/* ══════════ 运动物主体（滑块小车/振动小球） ══════════ */}
        {model === 'shm' ? (
          // 振动金属球 (立体高光径向渐变)
          <Ball
            cx={currentX}
            cy={groundY - objH / 2 - 2}
            r={objW * 0.4}
            type="oscillatorMetal"
            strokeWidth={STROKE.objectThin}
          />
        ) : (
          // 变加速 / 多阶段：不锈钢滑块小车
          <g transform={`translate(${currentX - objW / 2}, ${groundY - objH - 5})`}>
            {/* 滑动小车 */}
            <Block
              x={0}
              y={0}
              width={objW}
              height={objH}
              type="metalCart"
              stroke={SCENE_COLORS.circuit.wire}
              strokeWidth={STROKE.objectThin}
            />
            {/* 传感器激光红色指示灯 (播放时高频闪烁) */}
            <circle
              cx={objW - 4} cy={objH * 0.3} r={2}
              fill={SCENE_COLORS.spring.compressed}
              opacity={isPlaying && Math.floor(time * 10) % 2 === 0 ? 1 : 0.3}
              filter={`drop-shadow(0 0 1.5px ${SCENE_COLORS.spring.compressed})`}
            />
          </g>
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
            <VectorArrow
              origin={{ x: pointA, y: -(groundY - objH - 12) }}
              vector={{ x: state.x, y: 0 }}
              type="displacement"
              sceneScale={sceneScale}
              strokeWidth={STROKE.objectLine}
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
            <VectorArrow
              origin={{
                x: currentX + (vInst > 0 ? objW / 2 + 4 : -objW / 2 - 4),
                y: -(groundY - objH / 2 - (model === 'shm' ? 2 : 5)),
              }}
              vector={{ x: vInst, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorSub}
            />
            <text
              x={currentX + (vInst > 0 ? objW / 2 + 8 : -objW / 2 - 8) + sceneScale.maxVectorLength * 0.35}
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
            <VectorArrow
              origin={{ x: currentX, y: -(groundY - objH - 11) }}
              vector={{ x: state.a, y: 0 }}
              type="acceleration"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorSub}
            />
            <text
              x={currentX + sceneScale.maxVectorLength * 0.35 + 6}
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
