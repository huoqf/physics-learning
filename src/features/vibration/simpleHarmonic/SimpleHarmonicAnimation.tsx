import { useCallback, useMemo } from 'react'
import { useCanvasSize, useViewport } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, ENERGY_COLORS, STROKE, CANVAS_STYLE } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { Spring } from '@/components/UI'
import { Block, PhysicsGround, VectorArrow, EnergyBars } from '@/components/Physics'
import { computeAngularFrequency, computeSHMState, computeSHMEnergy, computeVerticalSpringForces } from '@/physics/oscillation'
import type { SceneScale } from '@/scene'

// ─── 物理与设计常量 ──────────────────────────────────────────────────────
const A_MAX = 0.12 // 振幅上限 (m)，用于固定像素映射比例
const DESIGN = { width: 700, height: 650 } as const
const REF_LEN_RATIO = 0.16 // 矢量最大长度占场景宽度的比例

export default function SimpleHarmonicAnimation() {
  const { params, isPlaying, time, speed, showVectors, showFormulas } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
      speed: s.speed,
      showVectors: s.showVectors,
      showFormulas: s.showFormulas,
    })),
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const { width, height, font } = canvasSize
  const vp = useViewport(canvasSize, {
    designWidth: DESIGN.width,
    designHeight: DESIGN.height,
  })

  // 模式与参数提取
  const mode = params.mode ?? 0 // 0=水平弹簧振子, 1=竖直弹簧振子, 2=能量守恒分析
  const A = params.A ?? 0.06
  const mass = params.mass ?? 0.5
  const k = params.k ?? 20
  const phiDeg = params.phiDeg ?? 0
  const phi = (phiDeg * Math.PI) / 180
  const showGraph = params.showGraph ?? 1
  const showHelper = params.showHelper ?? 1

  const isVertical = mode === 1
  const showEnergy = mode === 2

  // 科学探究：周期 T 由质量 m 与劲度系数 k 物理计算得出
  const T = useMemo(() => 2 * Math.PI * Math.sqrt(mass / k), [mass, k])
  const omega = computeAngularFrequency(T)
  const phase = omega * time + phi

  // 计算当前的简谐运动物理状态与能量
  const { displacement: x, velocity: v, acceleration: a } = computeSHMState(A, omega, phase)
  const energy = computeSHMEnergy(mass, A, omega, x)

  // ── 动画时钟：以 store.time 为规范时钟 ──
  const handleFrame = useCallback((deltaMs: number) => {
    const dt = deltaMs / 1000
    if (dt <= 0 || dt > 0.1) return
    const store = useAnimationStore.getState()
    store.setTime(store.time + dt * store.direction)
  }, [])
  useAnimationFrame(handleFrame, { playing: isPlaying, speed })

  // ── 矢量渲染助手 ──
  const renderVector = (
    startX: number,
    startY: number,
    vx: number,
    vy: number,
    length: number,
    color: string,
    type: 'displacement' | 'velocity' | 'acceleration' | 'force',
    label?: string,
  ) => {
    if ((vx === 0 && vy === 0) || length <= 1) return null
    const sceneScale: SceneScale = {
      scaleX: 1,
      scaleY: 1,
      scale: 1,
      originX: startX,
      originY: startY,
      maxVectorLength: length,
      refMagnitudes: {},
    }
    const mag = Math.sqrt(vx * vx + vy * vy)
    const dx = vx / mag
    const dy = vy / mag

    return (
      <VectorArrow
        origin={{ x: 0, y: 0 }}
        vector={{ x: dx, y: dy }}
        type={type === 'force' ? 'force' : type}
        sceneScale={sceneScale}
        color={color}
        pixelLength={length}
        font={font}
        label={label}
        glow
      />
    )
  }

  // ── 像素布局与坐标计算（按模式分支） ──
  const sceneX0 = vp.visibleX + vp.visibleW * 0.05
  const sceneX1 = vp.visibleX + vp.visibleW * 0.56
  const sceneW = sceneX1 - sceneX0

  let axisY = vp.visibleY + vp.visibleH * 0.46
  let axisX = vp.visibleX + vp.visibleW * 0.46

  // 1. 水平布局参数 (mode 0, 2)
  if (!isVertical) {
    if (showGraph === 1) {
      axisY = vp.visibleY + vp.visibleH * 0.25 // 往上挪，腾出下方画波形传送带
    } else {
      axisY = vp.visibleY + vp.visibleH * 0.46
    }
  } else {
    // 2. 竖直布局参数 (mode 1)
    if (showGraph === 1) {
      axisX = vp.visibleX + vp.visibleW * 0.22 // 往左挪，腾出右侧画波形传送带
    } else {
      axisX = vp.visibleX + vp.visibleW * 0.46
    }
  }

  const massSize = Math.min(50, sceneW * 0.11)
  const wallW = Math.max(8, sceneW * 0.02)
  const wallH = vp.visibleH * 0.2

  // ── 水平模式参数 ──
  const equilibriumX = sceneX0 + sceneW * 0.46
  const offsetScaleH = (sceneW * 0.3) / A_MAX
  const massCenterX = equilibriumX + x * offsetScaleH
  const massLeftH = massCenterX - massSize / 2
  const massTopH = axisY - massSize / 2
  const wallXH = sceneX0

  // 水平沙摆传送带 (向下匀速移动)
  const hGraphY = axisY + massSize / 2 + 35
  const hGraphH = vp.visibleH * 0.46
  const hGraphW = sceneW
  const hGraphX = sceneX0
  const vy = 100 // 传送带向下滚动速度 (px/s)

  const horizontalWavePath = useMemo(() => {
    if (!showGraph) return ''
    const points: string[] = []
    const step = 4
    for (let py = hGraphY; py <= hGraphY + hGraphH; py += step) {
      const dy = py - hGraphY
      const tBack = time - dy / vy
      const phaseBack = omega * tBack + phi
      const xBack = equilibriumX + A * offsetScaleH * Math.cos(phaseBack)
      if (py === hGraphY) {
        points.push(`M ${xBack.toFixed(1)} ${py.toFixed(1)}`)
      } else {
        points.push(`L ${xBack.toFixed(1)} ${py.toFixed(1)}`)
      }
    }
    return points.join(' ')
  }, [showGraph, time, A, omega, phi, equilibriumX, offsetScaleH, hGraphY, hGraphH])

  // 水平参考圆（匀速圆周运动投影）
  const rcCx = vp.visibleX + vp.visibleW * 0.8
  const rcCy = !isVertical && showGraph ? axisY : vp.visibleY + vp.visibleH * 0.3
  const rcR = offsetScaleH * A
  const pointX = rcCx + rcR * Math.cos(phase)
  const pointY = rcCy - rcR * Math.sin(phase)

  // ── 竖直模式参数 ──
  const sceneY0 = vp.visibleY + vp.visibleH * 0.05
  const sceneY1 = vp.visibleY + vp.visibleH * 0.85
  const sceneH = sceneY1 - sceneY0
  const equilibriumY = sceneY0 + sceneH * 0.44
  const offsetScaleV = (sceneH * 0.28) / A_MAX

  // 竖直回复力与合外力受力分析
  const gForce = 9.8 // 默认重力加速度
  const vForces = computeVerticalSpringForces(mass, k, x, gForce)
  const deltaX0 = vForces.equilibriumOffset // 平衡位置偏离原长
  const rawLengthY = equilibriumY - deltaX0 * offsetScaleV // 弹簧原长位置
  
  // 振子竖直中心坐标 (x 代表竖直位移，向下为正)
  const massCenterY = equilibriumY + x * offsetScaleV
  const massLeftV = axisX - massSize / 2
  const massTopV = massCenterY - massSize / 2
  const wallXV = axisX - 30
  const wallYV = sceneY0 + 20
  const wallHV = 8

  // 竖直沙摆传送带 (向右匀速移动)
  const vGraphX = axisX + massSize / 2 + 40
  const vGraphW = vp.visibleW * 0.6
  const vGraphH = sceneH
  const vGraphY = sceneY0
  const vx = 120 // 传送带向右滚动速度 (px/s)

  const verticalWavePath = useMemo(() => {
    if (!showGraph) return ''
    const points: string[] = []
    const step = 4
    for (let px = vGraphX; px <= vGraphX + vGraphW; px += step) {
      const dx = px - vGraphX
      const tBack = time - dx / vx
      const phaseBack = omega * tBack + phi
      const yBack = equilibriumY + A * offsetScaleV * Math.cos(phaseBack)
      if (px === vGraphX) {
        points.push(`M ${px.toFixed(1)} ${yBack.toFixed(1)}`)
      } else {
        points.push(`L ${px.toFixed(1)} ${yBack.toFixed(1)}`)
      }
    }
    return points.join(' ')
  }, [showGraph, time, A, omega, phi, equilibriumY, offsetScaleV, vGraphX, vGraphW])

  // ── 矢量长度与画笔比例 ──
  const refLen = sceneW * REF_LEN_RATIO
  const vRatio = Math.min(1, Math.abs(v) / (A * omega || 1e-9))
  const aRatio = Math.min(1, Math.abs(a) / (A * omega * omega || 1e-9))

  // 力矢量的像素缩放：重力大小约 mass * 9.8，最大力限制在合适长度内
  const forceScale = 12 // 像素/牛顿

  // ── 能量分配（用于能量模式 2） ──
  const energyItems = [
    {
      key: 'kinetic',
      label: '动能 Eₖ',
      value: energy.kinetic,
      color: ENERGY_COLORS.kineticEnergy,
      displayValue: `${energy.kinetic.toFixed(2)} J`,
    },
    {
      key: 'potential',
      label: '弹性势能 Eₚ',
      value: energy.potential,
      color: ENERGY_COLORS.potentialElastic,
      displayValue: `${energy.potential.toFixed(2)} J`,
    },
    {
      key: 'total',
      label: '总机械能 E',
      value: energy.total,
      color: ENERGY_COLORS.mechanicalEnergy,
      displayValue: `${energy.total.toFixed(2)} J`,
    },
  ]
  const energyX = vp.visibleX + vp.visibleW * 0.6
  const energyY = vp.visibleY + vp.visibleH * 0.58
  const energyW = vp.visibleW * 0.36
  const energyH = vp.visibleH * 0.34

  const smallFs = font(11)
  const normFs = font(13)

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg width={width} height={height} className="bg-slate-50 rounded-lg shadow-inner">
        {/* ── 渲染分支 A：水平弹簧振子 ── */}
        {!isVertical && (
          <g>
            {/* 水平传送带 (沙摆模拟) */}
            {showGraph === 1 && (
              <g>
                {/* 履带阴影及框 */}
                <rect x={hGraphX} y={hGraphY} width={hGraphW} height={hGraphH} rx={12} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={2} />
                {/* 履带滚动虚线 */}
                <line
                  x1={hGraphX + 8}
                  y1={hGraphY + 6}
                  x2={hGraphX + 8}
                  y2={hGraphY + hGraphH - 6}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  strokeDashoffset={-vy * time}
                />
                <line
                  x1={hGraphX + hGraphW - 8}
                  y1={hGraphY + 6}
                  x2={hGraphX + hGraphW - 8}
                  y2={hGraphY + hGraphH - 6}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  strokeDashoffset={-vy * time}
                />
                {/* 履带随时间向下滚动的横向纹理线 */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const ly = hGraphY + ((vy * time + i * (hGraphH / 8)) % hGraphH)
                  return (
                    <line
                      key={i}
                      x1={hGraphX + 12}
                      y1={ly}
                      x2={hGraphX + hGraphW - 12}
                      y2={ly}
                      stroke="#cbd5e1"
                      strokeWidth={1}
                      opacity={0.5}
                    />
                  )
                })}
                {/* 滚动轮子 */}
                <circle cx={hGraphX + 22} cy={hGraphY + hGraphH / 2} r={12} fill="#94a3b8" />
                <line
                  x1={hGraphX + 22 - 12}
                  y1={hGraphY + hGraphH / 2}
                  x2={hGraphX + 22 + 12}
                  y2={hGraphY + hGraphH / 2}
                  stroke="#f1f5f9"
                  strokeWidth={2}
                  transform={`rotate(${(vy * time * 2) % 360}, ${hGraphX + 22}, ${hGraphY + hGraphH / 2})`}
                />
                <circle cx={hGraphX + hGraphW - 22} cy={hGraphY + hGraphH / 2} r={12} fill="#94a3b8" />
                <line
                  x1={hGraphX + hGraphW - 22 - 12}
                  y1={hGraphY + hGraphH / 2}
                  x2={hGraphX + hGraphW - 22 + 12}
                  y2={hGraphY + hGraphH / 2}
                  stroke="#f1f5f9"
                  strokeWidth={2}
                  transform={`rotate(${(vy * time * 2) % 360}, ${hGraphX + hGraphW - 22}, ${hGraphY + hGraphH / 2})`}
                />
                
                {/* 发光余弦波形 */}
                <path d={horizontalWavePath} fill="none" stroke="#8b5cf6" strokeWidth={3.5} strokeLinecap="round" opacity={0.8} />

                {/* 实时画笔与相切连线 */}
                <line
                  x1={massCenterX}
                  y1={axisY}
                  x2={massCenterX}
                  y2={hGraphY}
                  stroke="#a78bfa"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <circle cx={massCenterX} cy={hGraphY} r={4.5} fill="#7c3aed" />
              </g>
            )}

            {/* 运动轴线 */}
            <line x1={sceneX0} y1={axisY} x2={sceneX1} y2={axisY} stroke={colors.neutral[300]} strokeWidth={STROKE.objectThin} />
            
            {/* 平衡位置标记线 */}
            <line x1={equilibriumX} y1={axisY - 25} x2={equilibriumX} y2={axisY + 25} stroke={colors.neutral[400]} strokeWidth={1.5} strokeDasharray="4 4" />
            <text x={equilibriumX} y={axisY - 32} fontSize={smallFs} fill={colors.neutral[500]} fontFamily={CANVAS_STYLE.FONT.family} textAnchor="middle">
              平衡位置 O
            </text>

            {/* 左侧固定墙面 */}
            <PhysicsGround x={wallXH} y={axisY - wallH / 2} width={wallW} type="wall" wall={{ height: wallH, hatchSide: 'right' }} />

            {/* 水平地面平台 */}
            <PhysicsGround x={sceneX0} y={axisY + massSize / 2 + 1} width={sceneW} type="platform" appearance={{ thickness: 8 }} />

            {/* 弹簧组件 */}
            <Spring x1={wallXH + wallW} y1={axisY} x2={massLeftH} y2={axisY} coils={11} radius={Math.max(8, massSize * 0.18)} isLightWeight />

            {/* 金属滑块振子 */}
            <Block x={massLeftH} y={massTopH} width={massSize} height={massSize} type="metal" label={`m = ${mass.toFixed(1)}kg`} />

            {/* 位移实时读数 */}
            <text x={massCenterX} y={massTopH - 10} fontSize={normFs} fontWeight="bold" fill={PHYSICS_COLORS.displacement} fontFamily={CANVAS_STYLE.FONT.family} textAnchor="middle">
              x = {(x * 100).toFixed(1)} cm
            </text>

            {/* 矢量力学分析 */}
            {showVectors && (
              <g>
                {/* 位移矢量（平衡位置指向振子） */}
                {renderVector(
                  equilibriumX,
                  axisY,
                  Math.sign(x),
                  0,
                  Math.abs(x) * offsetScaleH,
                  PHYSICS_COLORS.displacement,
                  'displacement',
                  'x',
                )}
                {/* 速度矢量（位于滑块上方，指向运动方向） */}
                {renderVector(
                  massCenterX,
                  axisY - massSize * 0.65,
                  Math.sign(v),
                  0,
                  vRatio * refLen,
                  PHYSICS_COLORS.velocity,
                  'velocity',
                  'v',
                )}
                {/* 回复力/加速度矢量（位于滑块下方，始终指向平衡位置） */}
                {renderVector(
                  massCenterX,
                  axisY + massSize * 0.65,
                  Math.sign(a),
                  0,
                  aRatio * refLen,
                  PHYSICS_COLORS.acceleration,
                  'acceleration',
                  'F_回',
                )}
              </g>
            )}

            {/* 参考圆与同步虚线（匀速圆周运动投影） */}
            {showHelper === 1 && (
              <g>
                <text x={rcCx} y={rcCy - rcR - 14} fontSize={smallFs} fill={colors.neutral[600]} fontFamily={CANVAS_STYLE.FONT.family} textAnchor="middle">
                  参考圆（圆周运动直径投影）
                </text>
                <circle cx={rcCx} cy={rcCy} r={rcR} fill="none" stroke={colors.neutral[300]} strokeWidth={1.5} />
                <line x1={rcCx - rcR} y1={rcCy} x2={rcCx + rcR} y2={rcCy} stroke={colors.neutral[300]} strokeWidth={1} />
                
                {/* 旋转半径 */}
                <line x1={rcCx} y1={rcCy} x2={pointX} y2={pointY} stroke={colors.neutral[500]} strokeWidth={1.5} />
                <circle cx={pointX} cy={pointY} r={5} fill={PHYSICS_COLORS.velocity} />
                
                {/* 投影线与直径投影点 */}
                <line x1={pointX} y1={pointY} x2={pointX} y2={rcCy} stroke={colors.neutral[400]} strokeWidth={1} strokeDasharray="3 3" />
                <circle cx={pointX} cy={rcCy} r={5} fill={PHYSICS_COLORS.displacement} />
                <line x1={rcCx} y1={rcCy} x2={pointX} y2={rcCy} stroke={PHYSICS_COLORS.displacement} strokeWidth={2.5} />
                
                {/* 极其关键：同步投影对比虚线（将圆上的投影点与滑块相连，证明二者完全同步） */}
                <line
                  x1={pointX - rcCx + equilibriumX}
                  y1={rcCy}
                  x2={massCenterX}
                  y2={axisY}
                  stroke="#10b981"
                  strokeWidth={1.2}
                  strokeDasharray="5 5"
                />
              </g>
            )}
          </g>
        )}

        {/* ── 渲染分支 B：竖直弹簧振子 ── */}
        {isVertical && (
          <g>
            {/* 右侧横向沙摆传送带 */}
            {showGraph === 1 && (
              <g>
                {/* 履带框 */}
                <rect x={vGraphX} y={vGraphY} width={vGraphW} height={vGraphH} rx={12} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={2} />
                {/* 履带横向虚线 */}
                <line
                  x1={vGraphX + 6}
                  y1={vGraphY + 8}
                  x2={vGraphX + vGraphW - 6}
                  y2={vGraphY + 8}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  strokeDashoffset={vx * time}
                />
                <line
                  x1={vGraphX + 6}
                  y1={vGraphY + vGraphH - 8}
                  x2={vGraphX + vGraphW - 6}
                  y2={vGraphY + vGraphH - 8}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  strokeDashoffset={vx * time}
                />
                {/* 纵向纹理滚动线 */}
                {Array.from({ length: 10 }).map((_, i) => {
                  const lx = vGraphX + ((vx * time + i * (vGraphW / 10)) % vGraphW)
                  return (
                    <line
                      key={i}
                      x1={lx}
                      y1={vGraphY + 12}
                      x2={lx}
                      y2={vGraphY + vGraphH - 12}
                      stroke="#cbd5e1"
                      strokeWidth={1}
                      opacity={0.5}
                    />
                  )
                })}
                {/* 滚轮 */}
                <circle cx={vGraphX + vGraphW / 2} cy={vGraphY + 22} r={12} fill="#94a3b8" />
                <line
                  x1={vGraphX + vGraphW / 2}
                  y1={vGraphY + 22 - 12}
                  x2={vGraphX + vGraphW / 2}
                  y2={vGraphY + 22 + 12}
                  stroke="#f1f5f9"
                  strokeWidth={2}
                  transform={`rotate(${(vx * time * 2) % 360}, ${vGraphX + vGraphW / 2}, ${vGraphY + 22})`}
                />
                <circle cx={vGraphX + vGraphW / 2} cy={vGraphY + vGraphH - 22} r={12} fill="#94a3b8" />
                <line
                  x1={vGraphX + vGraphW / 2}
                  y1={vGraphY + vGraphH - 22 - 12}
                  x2={vGraphX + vGraphW / 2}
                  y2={vGraphY + vGraphH - 22 + 12}
                  stroke="#f1f5f9"
                  strokeWidth={2}
                  transform={`rotate(${(vx * time * 2) % 360}, ${vGraphX + vGraphW / 2}, ${vGraphY + vGraphH - 22})`}
                />
                
                {/* 竖直波形路径 */}
                <path d={verticalWavePath} fill="none" stroke="#8b5cf6" strokeWidth={3.5} strokeLinecap="round" opacity={0.8} />

                {/* 相切虚线与画点 */}
                <line
                  x1={axisX}
                  y1={massCenterY}
                  x2={vGraphX}
                  y2={massCenterY}
                  stroke="#a78bfa"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <circle cx={vGraphX} cy={massCenterY} r={4.5} fill="#7c3aed" />
              </g>
            )}

            {/* 运动轴线 (垂直) */}
            <line x1={axisX} y1={sceneY0} x2={axisX} y2={sceneY1} stroke={colors.neutral[300]} strokeWidth={STROKE.objectThin} />
            
            {/* 弹簧原长线（教学对比重点） */}
            <line x1={axisX - 45} y1={rawLengthY} x2={axisX + 45} y2={rawLengthY} stroke="#f97316" strokeWidth={1} strokeDasharray="3 3" />
            <text x={axisX - 52} y={rawLengthY + 4} fontSize={smallFs} fill="#ea580c" fontFamily={CANVAS_STYLE.FONT.family} textAnchor="end">
              原长位置 L₀
            </text>

            {/* 平衡位置线 */}
            <line x1={axisX - 45} y1={equilibriumY} x2={axisX + 45} y2={equilibriumY} stroke={colors.neutral[400]} strokeWidth={1.5} strokeDasharray="4 4" />
            <text x={axisX - 52} y={equilibriumY + 4} fontSize={smallFs} fill={colors.neutral[500]} fontFamily={CANVAS_STYLE.FONT.family} textAnchor="end">
              平衡位置 O
            </text>

            {/* 顶部悬挂支架 */}
            <PhysicsGround x={wallXV} y={wallYV} width={60} type="platform" appearance={{ thickness: wallHV }} />

            {/* 竖直弹簧 */}
            <Spring x1={axisX} y1={wallYV + wallHV} x2={axisX} y2={massTopV} coils={13} radius={Math.max(8, massSize * 0.18)} isLightWeight />

            {/* 竖直悬挂金属块 */}
            <Block x={massLeftV} y={massTopV} width={massSize} height={massSize} type="metal" label={`m = ${mass.toFixed(1)}kg`} />

            {/* 实时竖直偏离平衡位置读数 */}
            <text x={axisX} y={massTopV - 10} fontSize={normFs} fontWeight="bold" fill={PHYSICS_COLORS.displacement} fontFamily={CANVAS_STYLE.FONT.family} textAnchor="middle">
              y = {(x * 100).toFixed(1)} cm
            </text>

            {/* 竖直受力分析（高中物理核心教学：重力/弹力/合力） */}
            {showVectors && (
              <g>
                {/* 1. 重力 G（恒定向下，红棕色） */}
                {renderVector(
                  axisX - massSize * 0.65,
                  massCenterY,
                  0,
                  1,
                  vForces.gravity * forceScale,
                  PHYSICS_COLORS.gravity,
                  'force',
                  `G = ${vForces.gravity.toFixed(1)}N`,
                )}
                {/* 2. 弹力 F_弹（向上拉，蓝色） */}
                {renderVector(
                  axisX - massSize * 0.65,
                  massCenterY,
                  0,
                  -1,
                  Math.abs(vForces.springForce) * forceScale,
                  '#3b82f6',
                  'force',
                  `F_弹 = ${Math.abs(vForces.springForce).toFixed(1)}N`,
                )}
                {/* 3. 合外力（回复力 F_回，红色） */}
                {renderVector(
                  axisX + massSize * 0.65,
                  massCenterY,
                  0,
                  Math.sign(vForces.netForce),
                  Math.abs(vForces.netForce) * forceScale,
                  '#ef4444',
                  'force',
                  `F_回 = ${Math.abs(vForces.netForce).toFixed(1)}N`,
                )}
              </g>
            )}
          </g>
        )}

        {/* ── 统一部分 ────────────────────────────────────────────────────── */}
        {/* 三矢量矢量图例（仅水平模式或竖直模式未显示力分析时提供常规参考） */}
        <g fontFamily={CANVAS_STYLE.FONT.family} fontSize={smallFs} transform={`translate(0, 0)`}>
          <rect x={sceneX0} y={vp.visibleY + 10} width={260} height={26} rx={4} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1} />
          <circle cx={sceneX0 + 12} cy={vp.visibleY + 23} r={4.5} fill={PHYSICS_COLORS.displacement} />
          <text x={sceneX0 + 22} y={vp.visibleY + 27} fill={colors.neutral[600]}>
            位移 x/y
          </text>
          <circle cx={sceneX0 + 96} cy={vp.visibleY + 23} r={4.5} fill={PHYSICS_COLORS.velocity} />
          <text x={sceneX0 + 106} y={vp.visibleY + 27} fill={colors.neutral[600]}>
            速度 v
          </text>
          <circle cx={sceneX0 + 176} cy={vp.visibleY + 23} r={4.5} fill={PHYSICS_COLORS.acceleration} />
          <text x={sceneX0 + 186} y={vp.visibleY + 27} fill={colors.neutral[600]}>
            加速度 a/F_回
          </text>
        </g>

        {/* 动态公式看板 */}
        {showFormulas && (
          <text
            x={sceneX0}
            y={vp.visibleY + vp.visibleH - 12}
            fontSize={font(12)}
            fill={colors.neutral[500]}
            fontFamily={CANVAS_STYLE.FONT.family}
          >
            运动方程: x = A·cos(ωt + φ) | 周期: T = 2π√(m/k) = {T.toFixed(2)}s | ω = {omega.toFixed(2)} rad/s
          </text>
        )}

        {/* ── 能量柱（能量守恒分析模式 2） ── */}
      </svg>

      {/* 能量柱（HTML 层，无 foreignObject） */}
      {showEnergy && (
        <div
          className="absolute"
          style={{ left: energyX, top: energyY, width: energyW, height: energyH }}
        >
          <EnergyBars
            items={energyItems}
            initialEtot={energy.total}
            title="机械能分配与守恒 (J)"
            font={font}
            compact
          />
        </div>
      )}
    </div>
  )
}
