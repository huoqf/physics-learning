import { OPTICS_COLORS, SCENE_COLORS, FONT } from '@/theme/physics'

export function ThinLensRail({ mode, VIEW_WIDTH, cy, cx, SCALE_CM, font }: {
  mode: number; VIEW_WIDTH: number; cy: number; cx: number; SCALE_CM: number; font: (v: number) => number
}) {
  return (
    <g>
      {/* 金属光学导轨与毫米刻度 */}
      <rect
        x={15} y={cy + 8} width={VIEW_WIDTH - 30} height={14}
        fill="url(#rail-grad)" rx={2} stroke={SCENE_COLORS.materials.structStrokeDark} strokeWidth={1}
      />
      {/* 导轨中心凹槽 */}
      <line
        x1={20} y1={cy + 15} x2={VIEW_WIDTH - 20} y2={cy + 15}
        stroke={SCENE_COLORS.materials.structStrokeDark} strokeWidth={1.5}
      />
      {/* 导轨厘米刻度尺 */}
      {(() => {
        const ticks = []
        const stepCm = 1
        if (mode === 0) {
          // 0cm 在透镜中心 (cx = 400)，两侧标数
          for (let cm = -60; cm <= 60; cm += stepCm) {
            const tx = cx + cm * SCALE_CM
            if (tx < 20 || tx > VIEW_WIDTH - 20) continue
            const isBig = cm % 10 === 0
            const isMedium = cm % 5 === 0 && !isBig
            const tickH = isBig ? 8 : isMedium ? 5 : 3

            ticks.push(
              <line
                key={`tick-${cm}`}
                x1={tx} y1={cy + 8}
                x2={tx} y2={cy + 8 + tickH}
                stroke={isBig ? SCENE_COLORS.materials.structStrokeDark : SCENE_COLORS.materials.structStrokeMid}
                strokeWidth={isBig ? 1.5 : 0.8}
              />
            )

            if (isBig) {
              ticks.push(
                <text
                  key={`label-${cm}`}
                  x={tx} y={cy + 30}
                  fontSize={font(8)}
                  fill={SCENE_COLORS.materials.structFill}
                  textAnchor="middle"
                  fontFamily={FONT.family}
                  fontWeight="bold"
                >
                  {Math.abs(cm)}
                </text>
              )
            }
          }
        } else {
          // 共轭法：0cm 从物体处 (100) 起算，直到右侧 100cm
          for (let cm = 0; cm <= 100; cm += stepCm) {
            const tx = 100 + cm * SCALE_CM
            if (tx < 20 || tx > VIEW_WIDTH - 20) continue
            const isBig = cm % 10 === 0
            const isMedium = cm % 5 === 0 && !isBig
            const tickH = isBig ? 8 : isMedium ? 5 : 3

            ticks.push(
              <line
                key={`tick-${cm}`}
                x1={tx} y1={cy + 8}
                x2={tx} y2={cy + 8 + tickH}
                stroke={isBig ? SCENE_COLORS.materials.structStrokeDark : SCENE_COLORS.materials.structStrokeMid}
                strokeWidth={isBig ? 1.5 : 0.8}
              />
            )

            if (isBig) {
              ticks.push(
                <text
                  key={`label-${cm}`}
                  x={tx} y={cy + 30}
                  fontSize={font(8)}
                  fill={SCENE_COLORS.materials.structFill}
                  textAnchor="middle"
                  fontFamily={FONT.family}
                  fontWeight="bold"
                >
                  {cm}
                </text>
              )
            }
          }
        }
        return ticks
      })()}
      {/* 主光轴虚线 */}
      <line
        x1={15} y1={cy} x2={VIEW_WIDTH - 15} y2={cy}
        stroke={OPTICS_COLORS.opticalAxis}
        strokeWidth={1.5}
        strokeDasharray="6 4"
        opacity={0.7}
      />
    </g>
  )
}
