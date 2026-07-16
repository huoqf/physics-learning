import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene/SceneScale'

interface SystemViewBoxProps {
  sceneScale: SceneScale
  /** 左上角物理坐标 */
  topLeft: { x: number; y: number }
  /** 右下角物理坐标 */
  bottomRight: { x: number; y: number }
  m1: number
  m2: number
  font: (size: number) => number
}

export function SystemViewBox({
  sceneScale,
  topLeft,
  bottomRight,
  m1,
  m2,
  font,
}: SystemViewBoxProps) {
  const lt = worldToDesign(topLeft.x, topLeft.y, sceneScale)
  const rb = worldToDesign(bottomRight.x, bottomRight.y, sceneScale)
  const cx = (lt.px + rb.px) / 2
  const cy = lt.py

  return (
    <g>
      <rect
        x={lt.px}
        y={lt.py}
        width={rb.px - lt.px}
        height={rb.py - lt.py}
        fill="rgba(34, 197, 94, 0.05)"
        stroke="#22c55e"
        strokeWidth={2}
        strokeDasharray="5,4"
        rx={6}
      />
      <rect
        x={cx - 60}
        y={cy - 12}
        width={120}
        height={20}
        fill="#22c55e"
        rx={4}
      />
      <text
        x={cx}
        y={cy + 2}
        fontSize={font(10)}
        fill="white"
        textAnchor="middle"
        fontWeight="bold"
      >
        整体 M = {(m1 + m2).toFixed(1)}kg
      </text>
    </g>
  )
}
