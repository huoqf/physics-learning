import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import type { ChainReactionPhysicsResult } from '../hooks/useReactionPhysics'

interface ChainReactionSceneProps {
  rp: ChainReactionPhysicsResult
  time: number
  canvasSize: { font: (size: number) => number }
  sceneScale: SceneScale
}

export function ChainReactionScene({
  rp,
  time,
  canvasSize,
  sceneScale,
}: ChainReactionSceneProps) {
  const { font } = canvasSize

  return (
    <g>
      {/* 铀核阵列 */}
      {rp.reactorsState.map((r) => {
        if (r.isFissioned) {
          const { px, py } = worldToDesign(r.x, r.y, sceneScale)
          return (
            <circle key={r.id + '-cloud'} cx={px} cy={py} r={20} fill="none" stroke={CANVAS_COLORS.axis} strokeWidth={1} strokeDasharray="2, 2" opacity={0.4} />
          )
        }

        const { px, py } = worldToDesign(r.x, r.y, sceneScale)
        const dCenter = { x: px, y: py }
        // 使用 time 替代 Date.now() 确保确定性
        const shake = r.isShaking ? Math.sin(time * 50) * 4 : 0

        return (
          <g key={r.id} transform={`translate(${shake}, 0)`}>
            {rp.subNucleons.map((n, idx) => {
              const stretchX = r.isShaking ? 1.5 : 1.0
              const shrinkY = r.isShaking ? 0.7 : 1.0
              const cx = dCenter.x + n.dx * 60 * stretchX
              const cy = dCenter.y - n.dy * 60 * shrinkY
              return (
                <circle key={idx} cx={cx} cy={cy} r={5} fill={n.isProton ? PHYSICS_COLORS.positiveCharge : CANVAS_COLORS.strokeDark} stroke={CANVAS_COLORS.white} strokeWidth={0.5} />
              )
            })}
            <text x={dCenter.x} y={dCenter.y - 15} fontSize={font(8)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">
              U-235
            </text>
          </g>
        )
      })}

      {/* 链式中子 */}
      {rp.neutrons.map((n) => {
        const { px, py } = worldToDesign(n.x, n.y, sceneScale)
        return (
          <circle key={n.id} cx={px} cy={py} r={4} fill={CANVAS_COLORS.strokeDark} stroke={CANVAS_COLORS.white} strokeWidth={0.8} />
        )
      })}

      {/* 冲击波环 */}
      {rp.shockwaves.map((w, idx) => {
        const { px, py } = worldToDesign(w.x, w.y, sceneScale)
        const dRadius = w.radius * 120
        return (
          <circle key={idx} cx={px} cy={py} r={dRadius} fill="none" stroke={PHYSICS_COLORS.alertRed} strokeWidth={3} opacity={w.opacity} />
        )
      })}
    </g>
  )
}
