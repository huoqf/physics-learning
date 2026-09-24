import {
  CANVAS_COLORS,
  EM_OSCILLATION_COLORS,
  SCENE_COLORS,
  STROKE,
  FONT,
} from '@/theme/physics'
import type { EMSpectrumLayoutResult } from '../hooks/useEMSpectrumLayout'

interface EMSpectrumSceneProps {
  layout: EMSpectrumLayoutResult
  font: (size: number) => number
}

// ─── 绘图区几何（设计坐标，画布 840×325）───────────────────────────────────
const BAR = { x: 60, width: 720, y: 126, height: 46 } as const
/**
 * 对数刻度尺位置。
 *
 * 刻度线向上画、刻度文字压在刻度线上方（位于色带与刻度尺之间的空档），
 * 使色带下方不留大片空白。
 */
const RULER_Y = 258
/** 谱段名两行交错高度（自上而下：远离色带的奇数下标行更靠外） */
const NAME_ROWS = [88, 112] as const

/**
 * 电磁波谱场次：以 log₁₀λ 为横轴铺开完整谱系。
 *
 * 画面承载核心物理结构：
 *   1. 对数刻度尺：严格按照 log₁₀λ 比例铺陈 17 个数量级（10⁻¹² m → 10⁵ m）；
 *   2. 色带：7 大谱段真实按对数宽度落位；
 *   3. 聚焦光斑：高亮当前选中谱段及其在对数尺上的对应跨度。
 */
export function EMSpectrumScene({ layout, font }: EMSpectrumSceneProps) {
  const { segments, ticks, selectedIndex } = layout
  const fracToX = (f: number) => BAR.x + f * BAR.width

  const selectedSeg = segments[selectedIndex]
  const selX = selectedSeg ? fracToX(selectedSeg.start) : 0
  const selW = selectedSeg ? fracToX(selectedSeg.start + selectedSeg.width) - selX : 0

  return (
    <>
      {/* ── 1. 对数刻度尺（每隔 3 个数量级标注一次）── */}
      <g>
        <line
          x1={BAR.x}
          y1={RULER_Y}
          x2={BAR.x + BAR.width}
          y2={RULER_Y}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.axis}
        />
        {ticks.map((tick) => {
          const x = fracToX(tick.frac)
          return (
            <g key={`tick-${tick.exp}`}>
              <line
                x1={x}
                y1={RULER_Y}
                x2={x}
                y2={RULER_Y - (tick.label ? 8 : 5)}
                stroke={CANVAS_COLORS.axis}
                strokeWidth={STROKE.tick}
              />
              {tick.label && (
                <text
                  x={x}
                  y={RULER_Y - 14}
                  fontSize={font(FONT.small)}
                  fill={SCENE_COLORS.charts.tickLabel}
                  textAnchor="middle"
                  fontFamily={FONT.family}
                >
                  {tick.label}
                </text>
              )}
            </g>
          )
        })}
        <text
          x={BAR.x + BAR.width + 8}
          y={RULER_Y + 4}
          fontSize={font(FONT.small)}
          fill={SCENE_COLORS.charts.tickLabel}
          textAnchor="start"
          fontFamily={FONT.family}
        >
          λ / m
        </text>
      </g>

      {/* ── 2. 谱段色带与选中聚光光斑 ── */}
      <g>
        {/* 背景底槽 */}
        <rect
          x={BAR.x}
          y={BAR.y}
          width={BAR.width}
          height={BAR.height}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.grid}
          rx={4}
        />

        {/* 选中的垂直聚焦光束（贯穿色带至标尺） */}
        {selectedSeg && (
          <rect
            x={selX}
            y={BAR.y - 4}
            width={selW}
            height={RULER_Y - BAR.y + 4}
            fill={EM_OSCILLATION_COLORS[selectedSeg.colorToken]}
            fillOpacity={0.08}
            pointerEvents="none"
          />
        )}

        {/* 7 个谱段色块 */}
        {segments.map((seg, i) => {
          const x = fracToX(seg.start)
          const w = fracToX(seg.start + seg.width) - x
          const isSelected = i === selectedIndex

          return (
            <rect
              key={seg.key}
              x={x}
              y={BAR.y}
              width={w}
              height={BAR.height}
              fill={EM_OSCILLATION_COLORS[seg.colorToken]}
              fillOpacity={isSelected ? 1 : 0.5}
              stroke={isSelected ? CANVAS_COLORS.labelText : CANVAS_COLORS.white}
              strokeWidth={isSelected ? 2.5 : 1}
              rx={1}
            />
          )
        })}
      </g>

      {/* ── 3. 谱段名：两行交错 + 精细引线 ── */}
      <g>
        {segments.map((seg, i) => {
          const x = fracToX(seg.labelAnchor)
          const rowY = NAME_ROWS[i % NAME_ROWS.length]
          const isSelected = i === selectedIndex
          const color = EM_OSCILLATION_COLORS[seg.colorToken]
          return (
            <g key={`name-${seg.key}`}>
              <line
                x1={x}
                y1={rowY + 6}
                x2={x}
                y2={BAR.y}
                stroke={color}
                strokeWidth={isSelected ? 2 : STROKE.guide}
                opacity={isSelected ? 1 : 0.45}
              />
              <circle cx={x} cy={BAR.y} r={isSelected ? 3 : 2} fill={color} opacity={isSelected ? 1 : 0.6} />
              <text
                x={x}
                y={rowY}
                fontSize={font(isSelected ? FONT.label : FONT.small)}
                fill={isSelected ? CANVAS_COLORS.labelText : CANVAS_COLORS.labelTextLight}
                textAnchor="middle"
                fontFamily={FONT.family}
                fontWeight={isSelected ? 'bold' : 'normal'}
              >
                {seg.label}
              </text>
            </g>
          )
        })}
      </g>
    </>
  )
}
