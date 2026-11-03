import { CANVAS_COLORS, ENERGY_COLORS, withAlpha } from '@/theme/physics'
import { EnergyFlowBars } from '@/components/Physics'
import type { EnergyFlowView } from '../hooks/useEnergyFlowPhysics'
import {
  ARROW_VALUE_DY,
  BARS_H,
  BARS_W,
  BARS_X,
  BARS_Y,
  BLOCK_ACCENT_W,
  BLOCK_H,
  BLOCK_SUBTITLE_DY,
  BLOCK_TITLE_DY,
  BLOCK_VALUE_DY,
  BLOCK_W,
  BLOCK_X,
  BLOCK_Y,
  CHAIN_ARROW_Y,
  FOOTNOTE_Y,
  LOWER_BLOCK_H,
  LOWER_BLOCK_W,
  LOWER_BLOCK_X,
  LOWER_BLOCK_Y,
} from '../energyLayout'

export interface EnergyFlowSceneParams {
  pvPeakKW: number
  loadPeakKW: number
  capacityKWh: number
  headM: number
  volumeWanM3: number
}

interface EnergyFlowSceneProps {
  view: EnergyFlowView
  params: EnergyFlowSceneParams
  canvasSize: { font: (size: number) => number }
}

/** 能量形式 → 色条颜色：电能 / 势能 / 化学能 / 机械能 / 损失，全页统一 */
const FORM_COLORS = {
  electric: ENERGY_COLORS.work,
  potential: ENERGY_COLORS.potentialEnergy,
  chemical: ENERGY_COLORS.potentialElastic,
  mechanical: ENERGY_COLORS.mechanicalEnergy,
  loss: ENERGY_COLORS.heatLoss,
} as const

interface FlowBlockProps {
  x: number
  y: number
  w: number
  h: number
  title: string
  value: string
  subtitle?: string
  accent: string
  font: (size: number) => number
}

/**
 * 设备/环节方块：左缘一道能量形式色条 + 标题 + 副标题 + 读数。
 *
 * 刻意不画器材外形（光伏板、水泵、汽车）。本页要讲的是"能量从哪来、到哪去、
 * 中间丢了多少"——外形只会占掉本就不多的 150×84，还把读数挤到看不清。
 */
function FlowBlock({ x, y, w, h, title, value, subtitle, accent, font }: FlowBlockProps) {
  return (
    <g className="energy-flow-block">
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={withAlpha(CANVAS_COLORS.white, 0.9)}
        stroke={withAlpha(CANVAS_COLORS.axis, 0.55)}
        strokeWidth={1}
      />
      <rect x={x} y={y + 6} width={BLOCK_ACCENT_W} height={h - 12} rx={2} fill={accent} />
      <text
        x={x + 14}
        y={y + BLOCK_TITLE_DY}
        fill={CANVAS_COLORS.labelText}
        fontSize={font(10.5)}
        fontWeight={600}
      >
        {title}
      </text>
      {subtitle && (
        <text
          x={x + 14}
          y={y + BLOCK_SUBTITLE_DY}
          fill={CANVAS_COLORS.labelTextLight}
          fontSize={font(9)}
        >
          {subtitle}
        </text>
      )}
      <text
        x={x + 14}
        y={y + BLOCK_VALUE_DY}
        fill={accent}
        fontSize={font(11)}
        fontFamily="monospace"
        fontWeight={600}
      >
        {value}
      </text>
    </g>
  )
}

interface FlowArrowProps {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  value?: string
  color: string
  font: (size: number) => number
  /** 双向箭头：充/放、提水/放水这类可逆流 */
  bidirectional?: boolean
}

/**
 * 能量流箭头：线段 + 手绘三角箭头（项目禁止自造 SVG marker，三角头直接画 polygon）。
 * 竖直箭头的标签放在线的右侧，否则会正好压在线上。
 */
function FlowArrow({
  x1,
  y1,
  x2,
  y2,
  label,
  value,
  color,
  font,
  bidirectional,
}: FlowArrowProps) {
  const horizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1)
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const off = bidirectional ? 3 : 0
  // 箭头朝向由两端点的实际几何差决定，不假定"从左到右 / 从上到下"。
  // 写死方向时，一旦出现逆向连线（x1 > x2 或 y1 > y2），三角头就会指向箭尾，
  // 这类错误在静态截图里极难看出，反而会被当成"箭头画得胖"。sign 为 0（两点重合）时取 1 兜底。
  const dirForward: 1 | -1 = horizontal
    ? x2 >= x1
      ? 1
      : -1
    : y2 >= y1
      ? 1
      : -1
  const dirBackward: 1 | -1 = dirForward === 1 ? -1 : 1

  const shaft = (ax: number, ay: number, bx: number, by: number, dashed: boolean) => (
    <line
      x1={ax}
      y1={ay}
      x2={bx}
      y2={by}
      stroke={color}
      strokeWidth={2}
      strokeDasharray={dashed ? '4 3' : undefined}
      strokeLinecap="round"
    />
  )

  const headAt = (hx: number, hy: number, dir: 1 | -1) =>
    horizontal ? (
      <polygon points={`${hx},${hy} ${hx - dir * 8},${hy - 4} ${hx - dir * 8},${hy + 4}`} fill={color} />
    ) : (
      <polygon points={`${hx},${hy} ${hx - 4},${hy - dir * 8} ${hx + 4},${hy - dir * 8}`} fill={color} />
    )

  const labelX = horizontal ? mx : mx + 8
  const labelAnchor = horizontal ? 'middle' : 'start'

  return (
    <g className="energy-flow-arrow">
      {shaft(x1, horizontal ? y1 - off : y1, x2, horizontal ? y2 - off : y2, !!bidirectional)}
      {headAt(x2, horizontal ? y2 - off : y2, dirForward)}
      {bidirectional && (
        <>
          {shaft(x2, horizontal ? y2 + off : y2, x1, horizontal ? y1 + off : y1, true)}
          {headAt(x1, horizontal ? y1 + off : y1, dirBackward)}
        </>
      )}
      <text
        x={labelX}
        y={my - 7}
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(9)}
        textAnchor={labelAnchor}
      >
        {label}
      </text>
      {value && (
        <text
          x={labelX}
          y={my + ARROW_VALUE_DY - 2}
          fill={color}
          fontSize={font(9)}
          fontFamily="monospace"
          textAnchor={labelAnchor}
        >
          {value}
        </text>
      )}
    </g>
  )
}

/**
 * 能量守恒与能源 - 中屏 SVG 场景（三个情境共用一套「能量流框图」骨架）。
 *
 * 骨架：左侧环节方块 + 能量流箭头（定性：能量到哪去），右侧能量条（定量：丢了多少）。
 * 图与数同源于 `useEnergyFlowPhysics` → `@/physics/energyFlow`，此处不另算物理。
 */
export function EnergyFlowScene({ view, params, canvasSize }: EnergyFlowSceneProps) {
  const { font } = canvasSize
  const { mode } = view

  return (
    <g className="energy-flow-scene">
      {/* ── 右侧：能量条（三个模式共用同一套骨架与同一把尺） ── */}
      <line
        x1={BARS_X - 16}
        y1={12}
        x2={BARS_X - 16}
        y2={BARS_Y + BARS_H - 6}
        stroke={withAlpha(CANVAS_COLORS.axis, 0.35)}
        strokeWidth={1}
      />
      <EnergyFlowBars
        x={BARS_X}
        y={BARS_Y}
        width={BARS_W}
        height={BARS_H}
        reservoirs={view.reservoirs}
        max={view.barsMax}
        total={view.barsTotal}
        title={
          mode === 2 ? '同样输入 100 MJ 的去向' : mode === 1 ? '一次抽发循环账本' : '全天能量账本'
        }
        font={font}
      />

      {/* ── 模式 0：光伏 → 并网 → 负荷；电池挂在汇流点下方 ── */}
      {mode === 0 && (
        <g className="mode-pv-storage">
          <FlowBlock
            x={BLOCK_X[0]}
            y={BLOCK_Y}
            w={BLOCK_W}
            h={BLOCK_H}
            title="光伏阵列"
            subtitle="正午出力最大"
            value={`峰 ${params.pvPeakKW.toFixed(0)} kW`}
            accent={FORM_COLORS.electric}
            font={font}
          />
          <FlowBlock
            x={BLOCK_X[1]}
            y={BLOCK_Y}
            w={BLOCK_W}
            h={BLOCK_H}
            title="汇流并网点"
            subtitle="光伏优先供负荷"
            value={`${view.dispatch.now.pvEnergyKWh.toFixed(0)} kWh`}
            accent={FORM_COLORS.electric}
            font={font}
          />
          <FlowBlock
            x={BLOCK_X[2]}
            y={BLOCK_Y}
            w={BLOCK_W}
            h={BLOCK_H}
            title="电网与负荷"
            subtitle="晚高峰缺口最大"
            value={`峰 ${params.loadPeakKW.toFixed(0)} kW`}
            accent={FORM_COLORS.mechanical}
            font={font}
          />
          <FlowBlock
            x={LOWER_BLOCK_X}
            y={LOWER_BLOCK_Y}
            w={LOWER_BLOCK_W}
            h={LOWER_BLOCK_H}
            title="电化学储能"
            subtitle={`容量 ${params.capacityKWh.toFixed(0)} kWh · 荷电 ${(view.dispatch.now.finalSOC * 100).toFixed(0)}%`}
            value={`${view.dispatch.now.batteryDeltaKWh >= 0 ? '+' : ''}${view.dispatch.now.batteryDeltaKWh.toFixed(0)} kWh`}
            accent={FORM_COLORS.chemical}
            font={font}
          />

          <FlowArrow
            x1={BLOCK_X[0] + BLOCK_W}
            y1={CHAIN_ARROW_Y}
            x2={BLOCK_X[1]}
            y2={CHAIN_ARROW_Y}
            label="汇流"
            color={FORM_COLORS.electric}
            font={font}
          />
          <FlowArrow
            x1={BLOCK_X[1] + BLOCK_W}
            y1={CHAIN_ARROW_Y}
            x2={BLOCK_X[2]}
            y2={CHAIN_ARROW_Y}
            label="输配"
            value={`补 ${view.dispatch.now.gridImportKWh.toFixed(0)}`}
            color={FORM_COLORS.mechanical}
            font={font}
          />
          <FlowArrow
            x1={BLOCK_X[1] + BLOCK_W / 2}
            y1={BLOCK_Y + BLOCK_H}
            x2={LOWER_BLOCK_X + LOWER_BLOCK_W / 2}
            y2={LOWER_BLOCK_Y}
            label="充 / 放"
            color={FORM_COLORS.chemical}
            font={font}
            bidirectional
          />

          <text x={24} y={FOOTNOTE_Y} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9.5)}>
            {`${clockText(view.hour)} — 富余光伏先充电、缺口放电；充不下的部分只能弃掉`}
          </text>
        </g>
      )}

      {/* ── 模式 1：电能 → 势能 → 电能 ── */}
      {mode === 1 && (
        <g className="mode-pumped-storage">
          <FlowBlock
            x={BLOCK_X[0]}
            y={BLOCK_Y}
            w={BLOCK_W}
            h={BLOCK_H}
            title="抽水电能"
            subtitle="谷电时段 · 效率 88%"
            value={`${(view.pumped.pumpInputJ / 1e9).toFixed(2)} GJ`}
            accent={FORM_COLORS.electric}
            font={font}
          />
          <FlowBlock
            x={BLOCK_X[1]}
            y={BLOCK_Y}
            w={BLOCK_W}
            h={BLOCK_H}
            title="上库重力势能"
            subtitle="Eₚ = ρVgh"
            value={`${(view.pumped.potentialJ / 1e9).toFixed(2)} GJ`}
            accent={FORM_COLORS.potential}
            font={font}
          />
          <FlowBlock
            x={BLOCK_X[2]}
            y={BLOCK_Y}
            w={BLOCK_W}
            h={BLOCK_H}
            title="发电回网"
            subtitle="峰电时段 · 效率 90%"
            value={`${(view.pumped.turbineOutputJ / 1e9).toFixed(2)} GJ`}
            accent={FORM_COLORS.electric}
            font={font}
          />

          <FlowArrow
            x1={BLOCK_X[0] + BLOCK_W}
            y1={CHAIN_ARROW_Y}
            x2={BLOCK_X[1]}
            y2={CHAIN_ARROW_Y}
            label="水泵"
            color={FORM_COLORS.potential}
            font={font}
          />
          <FlowArrow
            x1={BLOCK_X[1] + BLOCK_W}
            y1={CHAIN_ARROW_Y}
            x2={BLOCK_X[2]}
            y2={CHAIN_ARROW_Y}
            label="水轮机"
            color={FORM_COLORS.electric}
            font={font}
          />

          <FlowBlock
            x={LOWER_BLOCK_X}
            y={LOWER_BLOCK_Y}
            w={LOWER_BLOCK_W}
            h={LOWER_BLOCK_H}
            title="往返损耗"
            subtitle="水泵 + 水轮机"
            value={`${(view.pumped.lossJ / 1e9).toFixed(2)} GJ`}
            accent={FORM_COLORS.loss}
            font={font}
          />
          <FlowArrow
            x1={BLOCK_X[1] + BLOCK_W / 2}
            y1={BLOCK_Y + BLOCK_H}
            x2={LOWER_BLOCK_X + LOWER_BLOCK_W / 2}
            y2={LOWER_BLOCK_Y}
            label="损耗"
            color={FORM_COLORS.loss}
            font={font}
          />

          <text x={24} y={FOOTNOTE_Y} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9.5)}>
            {`落差 ${params.headM.toFixed(0)} m · 单次提升 ${params.volumeWanM3.toFixed(1)} 万m³ · 往返效率 ${(view.pumped.roundTripEfficiency * 100).toFixed(1)}%`}
          </text>
        </g>
      )}

      {/* ── 模式 2：燃油车 / 电动车 ── */}
      {mode === 2 && (
        <g className="mode-vehicles">
          {[
            { rowY: 40, arrowY: 78, title: '燃油化学能', sub: '汽油 / 柴油', accent: FORM_COLORS.chemical, mid: '发动机与传动', midSub: '排气 · 冷却丢热', eta: view.vehicles.fuel.usefulShare, out: view.vehicles.fuel.usefulJ, inLabel: '燃烧', from: FORM_COLORS.chemical },
            { rowY: 180, arrowY: 218, title: '电网电能', sub: '充电桩输入', accent: FORM_COLORS.electric, mid: '电池与电机', midSub: '内阻 · 逆变损耗', eta: view.vehicles.ev.usefulShare, out: view.vehicles.ev.usefulJ, inLabel: '充电', from: FORM_COLORS.electric },
          ].map((row) => (
            <g key={row.title} className="vehicle-chain">
              <FlowBlock
                x={BLOCK_X[0]}
                y={row.rowY}
                w={BLOCK_W}
                h={76}
                title={row.title}
                subtitle={row.sub}
                value="100 MJ"
                accent={row.accent}
                font={font}
              />
              <FlowBlock
                x={BLOCK_X[1]}
                y={row.rowY}
                w={BLOCK_W}
                h={76}
                title={row.mid}
                subtitle={row.midSub}
                value={`η = ${(row.eta * 100).toFixed(0)}%`}
                accent={FORM_COLORS.loss}
                font={font}
              />
              <FlowBlock
                x={BLOCK_X[2]}
                y={row.rowY}
                w={BLOCK_W}
                h={76}
                title="有用机械能"
                subtitle="真正推车前进"
                value={`${(row.out / 1e6).toFixed(0)} MJ`}
                accent={FORM_COLORS.mechanical}
                font={font}
              />
              <FlowArrow
                x1={BLOCK_X[0] + BLOCK_W}
                y1={row.arrowY}
                x2={BLOCK_X[1]}
                y2={row.arrowY}
                label={row.inLabel}
                color={row.from}
                font={font}
              />
              <FlowArrow
                x1={BLOCK_X[1] + BLOCK_W}
                y1={row.arrowY}
                x2={BLOCK_X[2]}
                y2={row.arrowY}
                label="输出"
                color={FORM_COLORS.mechanical}
                font={font}
              />
            </g>
          ))}

          <text x={24} y={FOOTNOTE_Y} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9.5)}>
            {'两者都严格遵守能量守恒，差别只在「变成有用功的比例」——燃油车七成能量变成了热'}
          </text>
        </g>
      )}
    </g>
  )
}

/** 把 0~24 h 的浮点时刻格式化成 HH:MM */
function clockText(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
