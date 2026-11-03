import { CANVAS_COLORS, withAlpha } from '@/theme/physics'

export interface EnergyFlowReservoir {
  key: string
  /** 柱底标签 */
  label: string
  /** 当前值（与 max 同单位） */
  value: number
  /** 填充色，须引用 theme Token（禁止在此写字面色值） */
  color: string
  /** 柱顶读数文本（含单位），缺省取 value.toFixed(2) */
  displayValue?: string
  /** 柱底第二行小字（如占比、说明），可选 */
  subLabel?: string
  /**
   * 是否为「损失」库：用低饱和 + 虚线的柱身区分。
   * 能量流图里"有用"与"损失"必须一眼可辨，否则学生只会看到几根等高的柱子。
   */
  isLoss?: boolean
}

export interface EnergyFlowBarsProps {
  /** 左上角设计坐标 */
  x: number
  y: number
  width: number
  height: number
  reservoirs: EnergyFlowReservoir[]
  /** 归一化上限：所有柱共用同一把尺，柱高才可比 */
  max: number
  /** 守恒总量读数（右上角） */
  total?: { label: string; value: string; color?: string }
  /** 标题 */
  title?: string
  /** 响应式字号函数 */
  font: (size: number) => number
}

/**
 * 能量流能量条（SVG 版，设计坐标）—— `EnergyBars` 的 SVG 兄弟。
 *
 * 与 HTML 版 `EnergyBars` 的分工：
 *   · `EnergyBars` 用于中屏 HTML 浮层 / 并排面板（Tailwind 布局、可伸缩）；
 *   · `EnergyFlowBars` 用于 **SVG 场景内部**（设计坐标固定、与设备图同框、随视口等比缩放）。
 * 不合并成一个的原因：两者的布局来源不同（HTML flex vs 设计坐标），强行统一会让
 * 其中一方去算另一方的尺寸，正是 §2.7「一张图只能走一条缩放路径」要避免的。
 *
 * 关键约束：**所有柱共用同一把 `max`**。若每根柱各归一化，"损失柱"会和"有用柱"一样高，
 * 能量流图就失去了唯一的信息量（谁多谁少）。
 */
export function EnergyFlowBars({
  x,
  y,
  width,
  height,
  reservoirs,
  max,
  total,
  title,
  font,
}: EnergyFlowBarsProps) {
  const padX = 10
  const titleH = title ? 22 : 4
  const labelBandH = 34
  const barTop = y + titleH + 12
  const barBottom = y + height - labelBandH
  const barAreaH = Math.max(1, barBottom - barTop)

  const n = Math.max(1, reservoirs.length)
  const slotW = (width - padX * 2) / n
  const barW = Math.max(10, Math.min(26, slotW * 0.42))
  const safeMax = max > 0 ? max : 1

  return (
    <g className="energy-flow-bars">
      {title && (
        <text
          x={x + padX}
          y={y + 13}
          fill={CANVAS_COLORS.labelText}
          fontSize={font(10)}
          fontWeight={600}
        >
          {title}
        </text>
      )}
      {total && (
        <text
          x={x + width - padX}
          y={y + 13}
          fill={total.color ?? CANVAS_COLORS.labelText}
          fontSize={font(9.5)}
          fontFamily="monospace"
          textAnchor="end"
        >
          {`${total.label} ${total.value}`}
        </text>
      )}

      {reservoirs.map((r, i) => {
        const cx = x + padX + slotW * (i + 0.5)
        const barX = cx - barW / 2
        const ratio = Math.max(0, Math.min(1, r.value / safeMax))
        const fillH = barAreaH * ratio
        const readout = r.displayValue ?? r.value.toFixed(2)
        // 柱顶读数按「字符预算」自适应字号：槽宽在设计坐标下恒定（本页 274 宽 / 4~5 根柱），
        // 随视口缩的是字号，故只能从字符数反算设计字号。
        // 上限定在 9（不放大，保持全图字号一致），下限 7.5（再小则不可读）；
        // 超过约 11 字符的长串不靠缩字号硬塞——那是数据层没格式化，必须在数据层修。
        const readoutFont = Math.min(9, Math.max(7.5, (slotW - 6) / (readout.length * 0.62)))
        return (
          <g key={r.key}>
            {/* 空槽：给出"满格"参照，比值才有视觉基准 */}
            <rect
              x={barX}
              y={barTop}
              width={barW}
              height={barAreaH}
              rx={3}
              fill={withAlpha(CANVAS_COLORS.axis, 0.06)}
              stroke={withAlpha(CANVAS_COLORS.axis, 0.35)}
              strokeWidth={0.8}
            />
            {/* 能量柱：损失库用低饱和 + 虚线描边，不参与"有用"的视觉权重 */}
            <rect
              x={barX}
              y={barBottom - fillH}
              width={barW}
              height={fillH}
              rx={3}
              fill={r.color}
              fillOpacity={r.isLoss ? 0.42 : 0.9}
              stroke={r.isLoss ? r.color : 'none'}
              strokeWidth={r.isLoss ? 1 : 0}
              strokeDasharray={r.isLoss ? '3 2' : undefined}
            />
            {/* 柱顶读数：固定在槽顶，柱子涨落时数字不跟着跳 */}
            <text
              x={cx}
              y={barTop - 5}
              fill={CANVAS_COLORS.labelText}
              fontSize={font(readoutFont)}
              fontFamily="monospace"
              textAnchor="middle"
            >
              {readout}
            </text>
            {/* 柱底标签 */}
            <text
              x={cx}
              y={barBottom + 13}
              fill={CANVAS_COLORS.labelTextLight}
              fontSize={font(9)}
              textAnchor="middle"
            >
              {r.label}
            </text>
            {r.subLabel && (
              <text
                x={cx}
                y={barBottom + 25}
                fill={CANVAS_COLORS.labelTextLight}
                fontSize={font(8.5)}
                fontFamily="monospace"
                textAnchor="middle"
              >
                {r.subLabel}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}
