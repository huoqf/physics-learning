import { useMemo } from 'react'
import { computeProjectileStrobe } from '@/physics'
import { worldToDesign, type SceneScale } from '@/scene'
import { PHYSICS_COLORS, CANVAS_COLORS, STROKE } from '@/theme/physics'

interface ProjectileStrobeLayerProps {
  /** 水平初速度 (m/s) */
  v0x: number
  /** 重力加速度 (m/s²) */
  g: number
  /** 频闪周期 T (s) */
  period: number
  /** 已播放到的时刻 (s) */
  activeT: number
  sceneScale: SceneScale
  /** 字号缩放函数（来自 canvasSize） */
  font: (size: number) => number
  /** 注释文字的锚点（设计坐标，一般放在画布左下角空白处） */
  noteX: number
  noteY: number
}

/**
 * 平抛运动的频闪打点图层。
 *
 * 只画"照片上会有的东西"：每个打点位置的圆点 + 前几段竖直间距的测量括号 + 一行结论注释。
 * 数据全部来自 `computeProjectileStrobe`，与右屏看板同一份采样，不存在第二套算法。
 */
export function ProjectileStrobeLayer({
  v0x,
  g,
  period,
  activeT,
  sceneScale,
  font,
  noteX,
  noteY,
}: ProjectileStrobeLayerProps) {
  const strobe = useMemo(
    () => computeProjectileStrobe(v0x, g, period, activeT),
    [v0x, g, period, activeT],
  )

  // 设计坐标下的打点位置
  const dots = useMemo(
    () =>
      strobe.marks.map((m) => {
        const pt = worldToDesign(m.x, -m.y, sceneScale)
        return { ...m, px: pt.px, py: pt.py }
      }),
    [strobe.marks, sceneScale],
  )

  // 只标注最开始 3 段竖直间距，再多就压住轨迹了
  const brackets = dots.slice(1, 4)
  const showRatio = strobe.ratios.length >= 3

  return (
    <g>
      {/* 竖直间距测量括号（每段一个竖直虚线 + 上下短横） */}
      {brackets.map((d, i) => {
        const prev = dots[i]
        if (!prev) return null
        const bx = d.px + 16
        return (
          <g key={`strobe-bracket-${d.k}`}>
            <line
              x1={bx}
              y1={prev.py}
              x2={bx}
              y2={d.py}
              stroke={PHYSICS_COLORS.velocityY}
              strokeWidth={1.2}
              strokeDasharray="3,2"
            />
            <line x1={bx - 3} y1={prev.py} x2={bx + 3} y2={prev.py} stroke={PHYSICS_COLORS.velocityY} strokeWidth={1.2} />
            <line x1={bx - 3} y1={d.py} x2={bx + 3} y2={d.py} stroke={PHYSICS_COLORS.velocityY} strokeWidth={1.2} />
            <text
              x={bx + 6}
              y={(prev.py + d.py) / 2 + 3}
              fontSize={font(9)}
              fill={PHYSICS_COLORS.velocityY}
              fontWeight="600"
            >
              {`Δy${'₁₂₃'[i]} = ${(d.dyPrev ?? 0).toFixed(2)}`}
            </text>
          </g>
        )
      })}

      {/* 打点圆点（空心圈，避免盖住轨迹线） */}
      {dots.map((d) => (
        <g key={`strobe-dot-${d.k}`}>
          <circle cx={d.px} cy={d.py} r={4} fill={CANVAS_COLORS.white} stroke={PHYSICS_COLORS.velocityY} strokeWidth={STROKE.grid + 0.6} />
          <circle cx={d.px} cy={d.py} r={1.4} fill={PHYSICS_COLORS.velocityY} />
        </g>
      ))}

      {/* 结论注释：放在画布左下角空白处 */}
      <g>
        <text x={noteX} y={noteY - 14} fontSize={font(10)} fill={PHYSICS_COLORS.labelText} fontWeight="700">
          {`频闪照片：T = ${strobe.period.toFixed(2)} s，共 ${dots.length} 个点`}
        </text>
        <text x={noteX} y={noteY} fontSize={font(9.5)} fill={PHYSICS_COLORS.velocityX}>
          {`水平等距 Δx = ${strobe.dx.toFixed(2)} m（匀速）`}
        </text>
        <text x={noteX} y={noteY + 13} fontSize={font(9.5)} fill={PHYSICS_COLORS.velocityY}>
          {showRatio
            ? `竖直间距 1 : 3 : 5（匀加速），逐差 ΔΔy = gT² = ${strobe.diffOfDy.toFixed(3)} m`
            : `已打点不足 3 个，拖动进度条到落地后再读间距比`}
        </text>
      </g>
    </g>
  )
}
