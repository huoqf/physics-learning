import { useMemo } from 'react'
import { PHYSICS_COLORS, STROKE, CANVAS_STYLE } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { Spring } from '@/components/UI'
import { Block, PhysicsGround } from '@/components/Physics'
import { computeVerticalSpringForces } from '@/physics/oscillation'
import type { ViewportInfo } from '@/utils/useViewport'
import type { CanvasSize } from '@/utils/useCanvasSize'
import { renderSceneVector } from './renderSceneVector'

// 物理与设计常量
const A_MAX = 0.12

interface VerticalSpringSceneProps {
  vp: ViewportInfo
  font: CanvasSize['font']
  x: number
  A: number
  omega: number
  phase: number
  time: number
  mass: number
  k: number
  showVectors: boolean
  showGraph: number
  sceneW: number
}

export function VerticalSpringScene({
  vp, font, x, A, omega, phase, time, mass, k,
  showVectors, showGraph, sceneW,
}: VerticalSpringSceneProps) {
  // 轴线 X 坐标（竖直模式下根据是否显示波形图调整）
  const axisX = showGraph === 1
    ? vp.visibleX + vp.visibleW * 0.22
    : vp.visibleX + vp.visibleW * 0.46

  const massSize = Math.min(50, sceneW * 0.11)

  // 竖直模式参数
  const sceneY0 = vp.visibleY + vp.visibleH * 0.05
  const sceneY1 = vp.visibleY + vp.visibleH * 0.85
  const sceneH = sceneY1 - sceneY0
  const equilibriumY = sceneY0 + sceneH * 0.44
  const offsetScaleV = (sceneH * 0.28) / A_MAX

  // 竖直回复力与合外力受力分析
  const gForce = 9.8
  const vForces = computeVerticalSpringForces(mass, k, x, gForce)
  const deltaX0 = vForces.equilibriumOffset
  const rawLengthY = equilibriumY - deltaX0 * offsetScaleV

  // 振子竖直中心坐标 (x 代表竖直位移，向下为正)
  const massCenterY = equilibriumY + x * offsetScaleV
  const massLeftV = axisX - massSize / 2
  const massTopV = massCenterY - massSize / 2
  const wallXV = axisX - 30
  const wallYV = sceneY0 + 20
  const wallHV = 8

  // 竖直沙摆传送带
  const vGraphX = axisX + massSize / 2 + 40
  const vGraphW = vp.visibleW * 0.6
  const vGraphH = sceneH
  const vGraphY = sceneY0
  const vx = 120

  const verticalWavePath = useMemo(() => {
    if (!showGraph) return ''
    const points: string[] = []
    const step = 4
    for (let px = vGraphX; px <= vGraphX + vGraphW; px += step) {
      const dx = px - vGraphX
      const tBack = time - dx / vx
      const phaseBack = omega * tBack + (phase - omega * time)
      const yBack = equilibriumY + A * offsetScaleV * Math.cos(phaseBack)
      if (px === vGraphX) {
        points.push(`M ${px.toFixed(1)} ${yBack.toFixed(1)}`)
      } else {
        points.push(`L ${px.toFixed(1)} ${yBack.toFixed(1)}`)
      }
    }
    return points.join(' ')
  }, [showGraph, time, A, omega, phase, equilibriumY, offsetScaleV, vGraphX, vGraphW])

  // 力矢量像素缩放
  const forceScale = 12

  const smallFs = font(11)
  const normFs = font(13)

  return (
    <g>
      {/* 右侧横向沙摆传送带 */}
      {showGraph === 1 && (
        <g>
          <rect x={vGraphX} y={vGraphY} width={vGraphW} height={vGraphH} rx={12} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={2} />
          <line
            x1={vGraphX + 6} y1={vGraphY + 8}
            x2={vGraphX + vGraphW - 6} y2={vGraphY + 8}
            stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 6" strokeDashoffset={vx * time}
          />
          <line
            x1={vGraphX + 6} y1={vGraphY + vGraphH - 8}
            x2={vGraphX + vGraphW - 6} y2={vGraphY + vGraphH - 8}
            stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 6" strokeDashoffset={vx * time}
          />
          {Array.from({ length: 10 }).map((_, i) => {
            const lx = vGraphX + ((vx * time + i * (vGraphW / 10)) % vGraphW)
            return (
              <line key={i} x1={lx} y1={vGraphY + 12} x2={lx} y2={vGraphY + vGraphH - 12} stroke="#cbd5e1" strokeWidth={1} opacity={0.5} />
            )
          })}
          <circle cx={vGraphX + vGraphW / 2} cy={vGraphY + 22} r={12} fill="#94a3b8" />
          <line
            x1={vGraphX + vGraphW / 2} y1={vGraphY + 22 - 12}
            x2={vGraphX + vGraphW / 2} y2={vGraphY + 22 + 12}
            stroke="#f1f5f9" strokeWidth={2}
            transform={`rotate(${(vx * time * 2) % 360}, ${vGraphX + vGraphW / 2}, ${vGraphY + 22})`}
          />
          <circle cx={vGraphX + vGraphW / 2} cy={vGraphY + vGraphH - 22} r={12} fill="#94a3b8" />
          <line
            x1={vGraphX + vGraphW / 2} y1={vGraphY + vGraphH - 22 - 12}
            x2={vGraphX + vGraphW / 2} y2={vGraphY + vGraphH - 22 + 12}
            stroke="#f1f5f9" strokeWidth={2}
            transform={`rotate(${(vx * time * 2) % 360}, ${vGraphX + vGraphW / 2}, ${vGraphY + vGraphH - 22})`}
          />
          <path d={verticalWavePath} fill="none" stroke="#8b5cf6" strokeWidth={3.5} strokeLinecap="round" opacity={0.8} />
          <line x1={axisX} y1={massCenterY} x2={vGraphX} y2={massCenterY} stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 4" />
          <circle cx={vGraphX} cy={massCenterY} r={4.5} fill="#7c3aed" />
        </g>
      )}

      {/* 运动轴线 (垂直) */}
      <line x1={axisX} y1={sceneY0} x2={axisX} y2={sceneY1} stroke={colors.neutral[300]} strokeWidth={STROKE.objectThin} />

      {/* 弹簧原长线 */}
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

      {/* 竖直受力分析 */}
      {showVectors && (
        <g>
          {renderSceneVector(axisX - massSize * 0.65, massCenterY, 0, 1, vForces.gravity * forceScale, PHYSICS_COLORS.gravity, 'force', font, `G = ${vForces.gravity.toFixed(1)}N`)}
          {renderSceneVector(axisX - massSize * 0.65, massCenterY, 0, -1, Math.abs(vForces.springForce) * forceScale, '#3b82f6', 'force', font, `F_弹 = ${Math.abs(vForces.springForce).toFixed(1)}N`)}
          {renderSceneVector(axisX + massSize * 0.65, massCenterY, 0, Math.sign(vForces.netForce), Math.abs(vForces.netForce) * forceScale, '#ef4444', 'force', font, `F_回 = ${Math.abs(vForces.netForce).toFixed(1)}N`)}
        </g>
      )}
    </g>
  )
}
