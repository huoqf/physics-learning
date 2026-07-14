import { useMemo } from 'react'
import { PHYSICS_COLORS, STROKE, CANVAS_STYLE } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { Spring } from '@/components/UI'
import { Block, PhysicsGround } from '@/components/Physics'
import type { ViewportInfo } from '@/utils/useViewport'
import type { CanvasSize } from '@/utils/useCanvasSize'
import { renderSceneVector } from './renderSceneVector'

// 物理与设计常量
const A_MAX = 0.12
const REF_LEN_RATIO = 0.16

interface HorizontalSpringSceneProps {
  vp: ViewportInfo
  font: CanvasSize['font']
  x: number
  v: number
  a: number
  A: number
  omega: number
  phase: number
  time: number
  mass: number
  showVectors: boolean
  showGraph: number
  showHelper: number
  sceneX0: number
  sceneX1: number
  sceneW: number
}

export function HorizontalSpringScene({
  vp, font, x, v, a, A, omega, phase, time, mass,
  showVectors, showGraph, showHelper,
  sceneX0, sceneX1, sceneW,
}: HorizontalSpringSceneProps) {
  // 轴线 Y 坐标（水平模式下根据是否显示波形图调整）
  const axisY = showGraph === 1
    ? vp.visibleY + vp.visibleH * 0.25
    : vp.visibleY + vp.visibleH * 0.46

  const massSize = Math.min(50, sceneW * 0.11)
  const wallW = Math.max(8, sceneW * 0.02)
  const wallH = vp.visibleH * 0.2

  // 水平模式参数
  const equilibriumX = sceneX0 + sceneW * 0.46
  const offsetScaleH = (sceneW * 0.3) / A_MAX
  const massCenterX = equilibriumX + x * offsetScaleH
  const massLeftH = massCenterX - massSize / 2
  const massTopH = axisY - massSize / 2
  const wallXH = sceneX0

  // 水平沙摆传送带
  const hGraphY = axisY + massSize / 2 + 35
  const hGraphH = vp.visibleH * 0.46
  const hGraphW = sceneW
  const hGraphX = sceneX0
  const vy = 100

  const horizontalWavePath = useMemo(() => {
    if (!showGraph) return ''
    const points: string[] = []
    const step = 4
    for (let py = hGraphY; py <= hGraphY + hGraphH; py += step) {
      const dy = py - hGraphY
      const tBack = time - dy / vy
      const phaseBack = omega * tBack + (phase - omega * time) // omega * tBack + phi
      const xBack = equilibriumX + A * offsetScaleH * Math.cos(phaseBack)
      if (py === hGraphY) {
        points.push(`M ${xBack.toFixed(1)} ${py.toFixed(1)}`)
      } else {
        points.push(`L ${xBack.toFixed(1)} ${py.toFixed(1)}`)
      }
    }
    return points.join(' ')
  }, [showGraph, time, A, omega, phase, equilibriumX, offsetScaleH, hGraphY, hGraphH])

  // 参考圆（匀速圆周运动投影）
  const rcCx = vp.visibleX + vp.visibleW * 0.8
  const rcCy = showGraph ? axisY : vp.visibleY + vp.visibleH * 0.3
  const rcR = offsetScaleH * A
  const pointX = rcCx + rcR * Math.cos(phase)
  const pointY = rcCy - rcR * Math.sin(phase)

  // 矢量长度与画笔比例
  const refLen = sceneW * REF_LEN_RATIO
  const vRatio = Math.min(1, Math.abs(v) / (A * omega || 1e-9))
  const aRatio = Math.min(1, Math.abs(a) / (A * omega * omega || 1e-9))

  const smallFs = font(11)
  const normFs = font(13)

  return (
    <g>
      {/* 水平传送带 (沙摆模拟) */}
      {showGraph === 1 && (
        <g>
          <rect x={hGraphX} y={hGraphY} width={hGraphW} height={hGraphH} rx={12} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={2} />
          <line
            x1={hGraphX + 8} y1={hGraphY + 6}
            x2={hGraphX + 8} y2={hGraphY + hGraphH - 6}
            stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 6" strokeDashoffset={-vy * time}
          />
          <line
            x1={hGraphX + hGraphW - 8} y1={hGraphY + 6}
            x2={hGraphX + hGraphW - 8} y2={hGraphY + hGraphH - 6}
            stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 6" strokeDashoffset={-vy * time}
          />
          {Array.from({ length: 8 }).map((_, i) => {
            const ly = hGraphY + ((vy * time + i * (hGraphH / 8)) % hGraphH)
            return (
              <line key={i} x1={hGraphX + 12} y1={ly} x2={hGraphX + hGraphW - 12} y2={ly} stroke="#cbd5e1" strokeWidth={1} opacity={0.5} />
            )
          })}
          <circle cx={hGraphX + 22} cy={hGraphY + hGraphH / 2} r={12} fill="#94a3b8" />
          <line
            x1={hGraphX + 22 - 12} y1={hGraphY + hGraphH / 2}
            x2={hGraphX + 22 + 12} y2={hGraphY + hGraphH / 2}
            stroke="#f1f5f9" strokeWidth={2}
            transform={`rotate(${(vy * time * 2) % 360}, ${hGraphX + 22}, ${hGraphY + hGraphH / 2})`}
          />
          <circle cx={hGraphX + hGraphW - 22} cy={hGraphY + hGraphH / 2} r={12} fill="#94a3b8" />
          <line
            x1={hGraphX + hGraphW - 22 - 12} y1={hGraphY + hGraphH / 2}
            x2={hGraphX + hGraphW - 22 + 12} y2={hGraphY + hGraphH / 2}
            stroke="#f1f5f9" strokeWidth={2}
            transform={`rotate(${(vy * time * 2) % 360}, ${hGraphX + hGraphW - 22}, ${hGraphY + hGraphH / 2})`}
          />
          <path d={horizontalWavePath} fill="none" stroke="#8b5cf6" strokeWidth={3.5} strokeLinecap="round" opacity={0.8} />
          <line x1={massCenterX} y1={axisY} x2={massCenterX} y2={hGraphY} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 4" />
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
          {renderSceneVector(equilibriumX, axisY, Math.sign(x), 0, Math.abs(x) * offsetScaleH, PHYSICS_COLORS.displacement, 'displacement', font, 'x')}
          {renderSceneVector(massCenterX, axisY - massSize * 0.65, Math.sign(v), 0, vRatio * refLen, PHYSICS_COLORS.velocity, 'velocity', font, 'v')}
          {renderSceneVector(massCenterX, axisY + massSize * 0.65, Math.sign(a), 0, aRatio * refLen, PHYSICS_COLORS.acceleration, 'acceleration', font, 'F_回')}
        </g>
      )}

      {/* 参考圆与同步虚线 */}
      {showHelper === 1 && (
        <g>
          <text x={rcCx} y={rcCy - rcR - 14} fontSize={smallFs} fill={colors.neutral[600]} fontFamily={CANVAS_STYLE.FONT.family} textAnchor="middle">
            参考圆（圆周运动直径投影）
          </text>
          <circle cx={rcCx} cy={rcCy} r={rcR} fill="none" stroke={colors.neutral[300]} strokeWidth={1.5} />
          <line x1={rcCx - rcR} y1={rcCy} x2={rcCx + rcR} y2={rcCy} stroke={colors.neutral[300]} strokeWidth={1} />
          <line x1={rcCx} y1={rcCy} x2={pointX} y2={pointY} stroke={colors.neutral[500]} strokeWidth={1.5} />
          <circle cx={pointX} cy={pointY} r={5} fill={PHYSICS_COLORS.velocity} />
          <line x1={pointX} y1={pointY} x2={pointX} y2={rcCy} stroke={colors.neutral[400]} strokeWidth={1} strokeDasharray="3 3" />
          <circle cx={pointX} cy={rcCy} r={5} fill={PHYSICS_COLORS.displacement} />
          <line x1={rcCx} y1={rcCy} x2={pointX} y2={rcCy} stroke={PHYSICS_COLORS.displacement} strokeWidth={2.5} />
          <line
            x1={pointX - rcCx + equilibriumX} y1={rcCy}
            x2={massCenterX} y2={axisY}
            stroke="#10b981" strokeWidth={1.2} strokeDasharray="5 5"
          />
        </g>
      )}
    </g>
  )
}
