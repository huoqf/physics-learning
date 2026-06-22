/**
 * ACValues.tsx — 有效值与峰值关系（[M4-1]）
 *
 * 【重构】上下双舱纵向联动结构：
 *  - 上层【I-t 电流舱】：交流波形 i(t) + 动态直流参考线 Idc + 峰值参考线 Im
 *  - 下层【Q-t 热量舱】：交流热量 Q_ac + 直流热量 Q_dc，周期撞线裁判
 *  - 下区【动画舱】：双加热盒 + 垂直动态能量槽（AC脉动/DC匀速）
 *
 * @agent-rule 纯内容组件，不实现左右面板（由 AnimationPage 提供）
 * @agent-rule 使用 SVG（教学图解优先），禁止 Canvas
 * @agent-rule 所有颜色从 @/theme 引用，禁止硬编码
 * @agent-rule 物理计算调用 rmsCalculator 纯函数，不在组件内实现
 */
import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useCanvasSize } from '@/utils'
import { colors } from '@/theme/colors'
import {
  PHYSICS_COLORS,
  CANVAS_STYLE,
  SCENE_COLORS,
  STROKE,
  DASH,
  FONT,
} from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { LightBulb } from '@/components/Physics/LightBulb'
import { ChartCursor, VelocityTimeChart, useChartContext } from '@/components/Chart'
import {
  getTheoreticalThermalState,
  checkEquivalence,
  getEffectiveCurrent,
  isNearPeriodEnd,
} from '@/physics/rmsCalculator'
import type { WaveformType } from '@/physics/rmsCalculator'

/** 波形类型映射 */
const WAVEFORM_MAP: Record<number, WaveformType> = {
  0: 'sine',
  1: 'square',
  2: 'pulse',
  3: 'half_sine',
}

/** 视觉周期 (s) — 降频可视化 */
const VISUAL_PERIOD = 2

/** 初始温度 (°C) */
const INITIAL_TEMP = 20

/** 最高显示温度 (°C) */
const MAX_TEMP = 80

interface Electron {
  id: number
  phase: number
}

/** 温度 → 颜色插值（冷色调 → 暖色调），使用系统 Token */
function tempToColor(temp: number): string {
  const t = Math.min(1, Math.max(0, (temp - INITIAL_TEMP) / (MAX_TEMP - INITIAL_TEMP)))
  const r = Math.round(180 + t * 60)
  const g = Math.round(210 - t * 120)
  const b = Math.round(240 - t * 170)
  return `rgb(${r}, ${g}, ${b})`
}

function ChartHorizontalLine({
  y,
  label,
  color,
  dash = DASH.reference.join(' '),
  opacity = 0.75,
}: {
  y: number
  label?: string
  color: string
  dash?: string
  opacity?: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const py = ctx.toSvgY(y)
  return (
    <g opacity={opacity}>
      <line
        x1={ctx.plotOrigin.x}
        y1={py}
        x2={ctx.plotOrigin.x + ctx.plotSize.width}
        y2={py}
        stroke={color}
        strokeWidth={STROKE.reference}
        strokeDasharray={dash}
      />
      {label && (
        <text
          x={ctx.plotOrigin.x + ctx.plotSize.width - 4}
          y={py - 4}
          fontSize={ctx.font(FONT.small)}
          fill={color}
          textAnchor="end"
          fontWeight="bold"
        >
          {label}
        </text>
      )}
    </g>
  )
}

function ChartVerticalLines({
  times,
  color,
  activeTime,
  activeColor,
}: {
  times: number[]
  color: string
  activeTime?: number
  activeColor?: string
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  return (
    <g>
      {times.map((timeValue) => {
        const x = ctx.toSvgX(timeValue)
        const active = activeTime != null && Math.abs(activeTime - timeValue) < VISUAL_PERIOD * 0.05
        return (
          <g key={`period-${timeValue}`}>
            <line
              x1={x}
              y1={ctx.plotOrigin.y}
              x2={x}
              y2={ctx.plotOrigin.y + ctx.plotSize.height}
              stroke={active && activeColor ? activeColor : color}
              strokeWidth={active ? STROKE.reference : STROKE.guide}
              strokeDasharray={DASH.projection.join(' ')}
              opacity={active ? 0.75 : 0.35}
            />
            <text
              x={x + 2}
              y={ctx.plotOrigin.y + ctx.plotSize.height - 3}
              fontSize={ctx.font(7.5)}
              fill={color}
              opacity={0.65}
            >
              {`${Math.round(timeValue / VISUAL_PERIOD)}T`}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function ChartPointPulse({
  x,
  y,
  color,
}: {
  x: number
  y: number
  color: string
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const cx = ctx.toSvgX(x)
  const cy = ctx.toSvgY(y)
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={color} stroke={colors.neutral.white} strokeWidth={2} opacity={0.9} />
      <circle cx={cx} cy={cy} r={12} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
    </g>
  )
}

interface ACValuesChartPanelProps {
  wavePoints: { t: number; v: number }[]
  qPoints: { t: number; qAc: number; qDc: number }[]
  maxT: number
  t: number
  iNow: number
  Im: number
  Idc: number
  iAxisRange: number
  maxQ: number
  isSuccess: boolean
  atPeriodEnd: boolean
  qAc: number
  qDc: number
  colors: {
    iAC: string
    iDC: string
    im: string
    qAc: string
    qDc: string
    period: string
    success: string
  }
}

function ACValuesChartPanel({
  wavePoints,
  qPoints,
  maxT,
  t,
  iNow,
  Im,
  Idc,
  iAxisRange,
  maxQ,
  isSuccess,
  atPeriodEnd,
  qAc,
  qDc,
  colors: chartColors,
}: ACValuesChartPanelProps) {
  const periodLines = useMemo(() => {
    const count = Math.ceil(maxT / VISUAL_PERIOD)
    return Array.from({ length: count }, (_, i) => (i + 1) * VISUAL_PERIOD).filter((v) => v <= maxT + 1e-9)
  }, [maxT])

  const qAcSeries = useMemo(
    () => qPoints.map((p) => ({ t: p.t, v: p.qAc })),
    [qPoints]
  )
  const qDcSeries = useMemo(
    () => qPoints.map((p) => ({ t: p.t, v: p.qDc })),
    [qPoints]
  )

  return (
    <div className="w-full h-full flex flex-col gap-1">
      <div className="flex-1 min-h-0">
        <VelocityTimeChart
          points={wavePoints}
          domainPoints={wavePoints}
          currentTime={maxT}
          tMax={maxT}
          tDomain={[0, maxT]}
          vRange={[-iAxisRange, iAxisRange]}
          title="① 电流对比"
          xLabel="t/s"
          yLabel="i/A"
          showCursor={false}
          showArea={false}
          series="primary"
          className="w-full h-full"
        >
          <ChartVerticalLines times={periodLines} color={chartColors.period} />
          <ChartHorizontalLine y={Im} label={`Im=${Im.toFixed(1)}A`} color={chartColors.im} opacity={0.55} />
          {Idc > 0 && (
            <ChartHorizontalLine
              y={Idc}
              label={`Idc=${Idc.toFixed(2)}A`}
              color={chartColors.iDC}
              dash="8,4"
              opacity={0.85}
            />
          )}
          <ChartCursor
            x={t}
            dataPoints={[{ y: iNow, label: 'i', series: 'primary' }]}
            formatValue={(v) => `${v.toFixed(2)} A`}
            showLabels
          />
        </VelocityTimeChart>
      </div>

      <div className="flex-1 min-h-0">
        <VelocityTimeChart
          points={qAcSeries}
          domainPoints={qAcSeries}
          currentTime={t}
          tMax={maxT}
          tDomain={[0, maxT]}
          vRange={[0, maxQ]}
          title="② 热量赛跑"
          xLabel="t/s"
          yLabel="Q/J"
          showCursor={false}
          showArea={false}
          series="success"
          additionalSeries={[{ points: qDcSeries, domainPoints: qDcSeries, label: 'Qdc', series: 'warm' }]}
          className="w-full h-full"
        >
          <ChartVerticalLines
            times={periodLines}
            color={chartColors.period}
            activeTime={isSuccess && atPeriodEnd ? t : undefined}
            activeColor={chartColors.success}
          />
          <ChartCursor
            x={t}
            dataPoints={[
              { y: qAc, label: 'Qac', series: 'success' },
              { y: qDc, label: 'Qdc', series: 'warm' },
            ]}
            formatValue={(v) => `${v.toFixed(1)} J`}
            showLabels
          />
          {isSuccess && atPeriodEnd && <ChartPointPulse x={t} y={qAc} color={chartColors.success} />}
        </VelocityTimeChart>
      </div>
    </div>
  )
}

export default function ACValues() {
  const { params, time, isPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
    }))
  )

  const [containerRef, { width, height, font }] = useCanvasSize(CANVAS_PRESETS.wide)

  // 解析参数
  const waveformIdx = params.waveform ?? 0
  const waveformType = WAVEFORM_MAP[waveformIdx] ?? 'sine'
  const Im = params.Im ?? 5
  const R = params.R ?? 10
  const Idc = params.Idc ?? 3
  const duty = params.duty ?? 0.5
  const t = time ?? 0

  // 物理状态计算（纯函数）
  const state = getTheoreticalThermalState(t, {
    type: waveformType,
    Im,
    R,
    period: VISUAL_PERIOD,
    dcCurrent: Idc,
    duty,
  })

  // 等效成功判定
  const isSuccess = checkEquivalence(Idc, state.I_eff, t, VISUAL_PERIOD)

  // 周期终点检测（用于裁判动画）
  const atPeriodEnd = isNearPeriodEnd(t, VISUAL_PERIOD) && t > 0.1

  // Q-t 历史数据点（用于绘制曲线）
  const pointsRef = useRef<Record<string, number>[]>([])
  const [chartPoints, setChartPoints] = useState<Record<string, number>[]>([])

  // 每帧追加数据点
  useEffect(() => {
    if (!isPlaying) return
    pointsRef.current = [
      ...pointsRef.current,
      { t, Q_ac: state.Q_ac, Q_dc: state.Q_dc },
    ]
    if (pointsRef.current.length > 600) {
      pointsRef.current = pointsRef.current.slice(-500)
    }
    setChartPoints([...pointsRef.current])
  }, [t, isPlaying, state.Q_ac, state.Q_dc])

  // 参数变化时清空历史（Idc 不在依赖项内，不触发重置）
  useEffect(() => {
    pointsRef.current = []
    setChartPoints([])
  }, [waveformIdx, Im, R, duty])

  // 电子粒子
  const acElectronsRef = useRef<Electron[]>(
    Array.from({ length: 6 }, (_, i) => ({ id: i, phase: (i / 6) * Math.PI * 2 }))
  )
  const dcElectronsRef = useRef<Electron[]>(
    Array.from({ length: 6 }, (_, i) => ({ id: i, phase: (i / 6) * 1.0 }))
  )

  // 瞬时电流计算
  const getInstantaneousCurrent = useCallback(
    (time: number): number => {
      const omega = (2 * Math.PI) / VISUAL_PERIOD
      switch (waveformType) {
        case 'sine':
          return Im * Math.sin(omega * time)
        case 'square':
          return Im * (time % VISUAL_PERIOD < VISUAL_PERIOD / 2 ? 1 : -1)
        case 'pulse': {
          const D = Math.min(0.95, Math.max(0.05, duty))
          return Im * (time % VISUAL_PERIOD < D * VISUAL_PERIOD ? 1 : 0)
        }
        case 'half_sine': {
          const tRem = time % VISUAL_PERIOD
          return tRem < VISUAL_PERIOD / 2
            ? Im * Math.sin(omega * time)
            : 0
        }
        default:
          return 0
      }
    },
    [waveformType, Im, duty]
  )

  // 当前瞬时电流
  const iNow = getInstantaneousCurrent(t)
  const power_ac = iNow * iNow * R
  const power_dc = Idc * Idc * R

  // ─── 布局计算 ────────────────────────────────────────────────────────
  const LAYOUT = useMemo(() => {
    const pad = Math.min(width, height) * 0.02
    const bottomBarH = font(28)
    const chartH = height * 0.40           // 双舱图表总高
    const dividerH = font(14)              // 极细分隔区（仅一条线 + 小标注）
    const topChamberH = (chartH - dividerH) * 0.46  // I-t 上层舱
    const botChamberH = (chartH - dividerH) * 0.54  // Q-t 下层舱
    const dividerY = topChamberH           // 分隔线 Y 位置
    const botChamberY = dividerY + dividerH
    const chamberY = chartH + pad * 2     // 动画舱起始 Y
    const chamberH = height - chamberY - pad - bottomBarH
    const halfW = (width - pad * 3) / 2
    return {
      pad, chartH, dividerH,
      topChamberH, botChamberH,
      dividerY, botChamberY,
      chamberY, chamberH, halfW,
      bottomBarH,
    }
  }, [width, height, font])

  const { pad } = LAYOUT

  // ─── 能量槽固定上限 = 2T 时 Q_ac 理论值（固定，不随时间跳变）────
  const gaugeMax = useMemo(() => {
    const I_eff = getEffectiveCurrent({
      type: waveformType, Im, R, period: VISUAL_PERIOD, dcCurrent: Idc, duty,
    })
    return Math.max(I_eff * I_eff * R * 2 * VISUAL_PERIOD, 1)
  }, [waveformType, Im, R, duty, Idc])

  // ─── 图表数据（迁移到 VelocityTimeChart 预设）──────────────────────
  const chartMargin = { left: 48, right: 20 }
  const chartPlotW = LAYOUT.halfW * 2 + pad - chartMargin.left - chartMargin.right
  const maxT = Math.max(t, VISUAL_PERIOD * 2)

  // 上层：I-t 纵轴（以 0 为中线，完整正负轴）
  const iAxisRange = Math.max(Im * 1.25, Math.abs(Idc) * 1.25, 1)

  // 下层：Q-t 纵轴（动态上限）
  const maxQ = useMemo(() => {
    const currentMax = Math.max(state.Q_ac, state.Q_dc, 1)
    return Math.max(currentMax * 1.2, gaugeMax * 0.05)  // 早期保持一定可见比例
  }, [state.Q_ac, state.Q_dc, gaugeMax])

  const wavePoints = useMemo(() => {
    const samples = 240
    return Array.from({ length: samples + 1 }, (_, i) => {
      const ti = (maxT * i) / samples
      return { t: ti, v: getInstantaneousCurrent(ti) }
    })
  }, [maxT, getInstantaneousCurrent])

  const qChartPoints = useMemo(() => {
    const pts = chartPoints.map((p) => ({ t: p.t, qAc: p.Q_ac, qDc: p.Q_dc }))
    if (pts.length === 0 || Math.abs(pts[pts.length - 1].t - t) > 1e-9) {
      pts.push({ t, qAc: state.Q_ac, qDc: state.Q_dc })
    }
    return pts
  }, [chartPoints, t, state.Q_ac, state.Q_dc])

  // ─── 颜色 Token ───────────────────────────────────────────────────
  // AC 电流波形：速度蓝（电荷运动）
  const C_iAC   = PHYSICS_COLORS.velocity
  // 直流参考线 Idc：电流红（直流电流语义）
  const C_iDC   = PHYSICS_COLORS.electricCurrent
  // 峰值参考线 Im：坐标轴辅助灰
  const C_Im    = PHYSICS_COLORS.axis
  // Q_ac 热量曲线：势能紫（热量累积）
  const C_Qac   = PHYSICS_COLORS.potentialEnergy
  // Q_dc 热量曲线：功率黄
  const C_Qdc   = PHYSICS_COLORS.power
  // 周期竖线：周期语义灰
  const C_period = PHYSICS_COLORS.period
  // 成功：系统成功绿
  const C_success = colors.success[500]

  // ─── 成功时闪烁动画（CSS keyframe 注入）──────────────────────────
  const flashStyle = isSuccess && atPeriodEnd
    ? { animation: 'gauge-flash 0.5s ease-in-out' }
    : {}

  return (
    <div ref={containerRef} className="w-full h-full">
      {/* 闪烁动画定义 */}
      <style>{`
        @keyframes gauge-flash {
          0%   { filter: brightness(1); }
          40%  { filter: brightness(1.6) drop-shadow(0 0 6px ${C_success}); }
          100% { filter: brightness(1); }
        }
      `}</style>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full select-none"
      >

        {/* ═══════════════════════════════════════════
            上区：I-t / Q-t 标准图表舱
        ═══════════════════════════════════════════ */}
        <foreignObject
          x={chartMargin.left - 4}
          y={0}
          width={chartPlotW + 8}
          height={LAYOUT.chartH}
        >
          <ACValuesChartPanel
            wavePoints={wavePoints}
            qPoints={qChartPoints}
            maxT={maxT}
            t={t}
            iNow={iNow}
            Im={Im}
            Idc={Idc}
            iAxisRange={iAxisRange}
            maxQ={maxQ}
            isSuccess={isSuccess}
            atPeriodEnd={atPeriodEnd}
            qAc={state.Q_ac}
            qDc={state.Q_dc}
            colors={{
              iAC: C_iAC,
              iDC: C_iDC,
              im: C_Im,
              qAc: C_Qac,
              qDc: C_Qdc,
              period: C_period,
              success: C_success,
            }}
          />
        </foreignObject>

        {/* ═══════════════════════════════════════════
            下区：双 Card 对比舱（加热盒 + 能量槽）
        ═══════════════════════════════════════════ */}
        <g transform={`translate(0, ${LAYOUT.chamberY})`}>

          {/* ── AC 加热盒 ── */}
          <g transform={`translate(${LAYOUT.pad}, 0)`}>
            {/* 卡片背景 */}
            <rect
              x={0} y={0}
              width={LAYOUT.halfW}
              height={LAYOUT.chamberH}
              fill={colors.neutral.white}
              stroke={isSuccess ? C_success : colors.neutral[200]}
              strokeWidth={isSuccess ? 2 : CANVAS_STYLE.stroke.grid}
              rx={8}
            />
            {/* 外壳温色覆盖层 */}
            <rect
              x={0} y={0}
              width={LAYOUT.halfW}
              height={LAYOUT.chamberH}
              fill={tempToColor(state.T_ac)}
              opacity={0.07}
              rx={8}
              pointerEvents="none"
            />

            {/* 标题 */}
            <text
              x={LAYOUT.halfW * 0.45}
              y={font(18)}
              fontSize={font(12)}
              fontWeight="bold"
              textAnchor="middle"
              fill={PHYSICS_COLORS.labelText}
            >
              AC 加热盒
            </text>

            {/* 电路区域 */}
            <g transform={`translate(${LAYOUT.halfW * 0.12}, ${LAYOUT.chamberH * 0.2})`}>
              <rect
                x={0} y={0}
                width={LAYOUT.halfW * 0.68}
                height={LAYOUT.chamberH * 0.45}
                fill="none"
                stroke={PHYSICS_COLORS.objectStroke}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
                rx={4}
              />
              {/* AC 源符号 */}
              <g transform={`translate(${LAYOUT.halfW * 0.05}, ${LAYOUT.chamberH * 0.225})`}>
                <circle r={font(14)} fill={colors.neutral.white} stroke={C_iAC} strokeWidth={1.5} />
                <path
                  d={`M ${-font(8)} 0 Q ${-font(4)} ${-font(5)} 0 0 Q ${font(4)} ${font(5)} ${font(8)} 0`}
                  fill="none"
                  stroke={C_iAC}
                  strokeWidth={1.5}
                />
              </g>
              {/* 灯泡 */}
              <LightBulb
                x={LAYOUT.halfW * 0.53}
                y={LAYOUT.chamberH * 0.225}
                power={power_ac}
                time={t}
                scale={0.7}
                showLabel={false}
              />
              {/* 电阻标注 */}
              <text
                x={LAYOUT.halfW * 0.32}
                y={LAYOUT.chamberH * 0.42}
                fontSize={font(9)}
                textAnchor="middle"
                fill={PHYSICS_COLORS.labelText}
              >
                R={R}Ω
              </text>
              {/* AC 电子动画 */}
              {acElectronsRef.current.map((p) => {
                const phase = ((2 * Math.PI) / VISUAL_PERIOD) * t + p.phase
                const nPos = Math.sin(phase)
                const ex = LAYOUT.halfW * 0.1 + LAYOUT.halfW * 0.56 * ((nPos + 1) / 2)
                const brightness = 0.3 + 0.7 * Math.abs(Math.cos(phase))
                const eR = font(3)
                return (
                  <g key={p.id}>
                    <circle cx={ex} cy={LAYOUT.chamberH * 0.12} r={eR + brightness * eR * 0.5}
                      fill={PHYSICS_COLORS.negativeCharge} opacity={brightness * 0.15} />
                    <circle cx={ex} cy={LAYOUT.chamberH * 0.12} r={eR}
                      fill={PHYSICS_COLORS.negativeCharge} opacity={brightness} />
                  </g>
                )
              })}
            </g>

            {/* ─── AC 垂直能量槽 ─── */}
            {(() => {
              const slotW = font(12)
              const slotH = LAYOUT.chamberH * 0.52
              const slotX = LAYOUT.halfW - font(20)
              const slotY = LAYOUT.chamberH * 0.19
              const fillRatio = Math.min(1, state.Q_ac / gaugeMax)
              const fillH = slotH * fillRatio
              const fillY = slotY + slotH - fillH
              // 液面微震（仅在 AC 运行且非截止期）
              const isActive = power_ac > 0.01
              const ripple = isActive ? Math.sin(t * 8) * font(1.5) : 0

              return (
                <g style={isSuccess && atPeriodEnd ? flashStyle : undefined}>
                  {/* 槽轮廓 */}
                  <rect x={slotX} y={slotY} width={slotW} height={slotH}
                    fill={colors.neutral[100]} stroke={colors.neutral[300]}
                    strokeWidth={1} rx={font(4)} />
                  {/* 填充 */}
                  <clipPath id="ac-gauge-clip">
                    <rect x={slotX} y={slotY} width={slotW} height={slotH} rx={font(4)} />
                  </clipPath>
                  <rect
                    x={slotX} y={fillY} width={slotW} height={fillH}
                    fill={C_Qac} opacity={0.75}
                    clipPath="url(#ac-gauge-clip)"
                  />
                  {/* 液面线 */}
                  {fillH > 2 && (
                    <line
                      x1={slotX} y1={fillY + ripple}
                      x2={slotX + slotW} y2={fillY + ripple}
                      stroke={colors.neutral.white} strokeWidth={2} opacity={0.7}
                    />
                  )}
                  {/* 标签 */}
                  <text x={slotX + slotW / 2} y={slotY - font(3)}
                    fontSize={font(7.5)} textAnchor="middle" fill={C_Qac} fontWeight="600">
                    Q_ac
                  </text>
                  {/* 百分比 */}
                  <text x={slotX + slotW / 2} y={slotY + slotH + font(10)}
                    fontSize={font(7)} textAnchor="middle" fill={PHYSICS_COLORS.labelTextLight}>
                    {(fillRatio * 100).toFixed(0)}%
                  </text>
                </g>
              )
            })()}

            {/* 温度计 */}
            <g transform={`translate(${LAYOUT.halfW - font(36)}, ${LAYOUT.chamberH * 0.72})`}>
              <rect x={-font(4)} y={0} width={font(8)} height={LAYOUT.chamberH * 0.22}
                fill={colors.neutral[200]} rx={font(3)} />
              <rect
                x={-font(4)}
                y={LAYOUT.chamberH * 0.22 * (1 - Math.min(1, (state.T_ac - INITIAL_TEMP) / (MAX_TEMP - INITIAL_TEMP)))}
                width={font(8)}
                height={LAYOUT.chamberH * 0.22 * Math.min(1, (state.T_ac - INITIAL_TEMP) / (MAX_TEMP - INITIAL_TEMP))}
                fill={tempToColor(state.T_ac)} rx={font(3)}
              />
              <text x={font(10)} y={LAYOUT.chamberH * 0.12} fontSize={font(8.5)} fill={PHYSICS_COLORS.labelText}>
                {state.T_ac.toFixed(1)}°C
              </text>
            </g>

            {/* 热量数值 */}
            <text
              x={LAYOUT.halfW * 0.45}
              y={LAYOUT.chamberH - font(8)}
              fontSize={font(10)}
              textAnchor="middle"
              fill={C_Qac}
              fontWeight="bold"
            >
              Q_ac = {state.Q_ac.toFixed(2)} J
            </text>
          </g>

          {/* ── 分隔线 ── */}
          <line
            x1={LAYOUT.pad + LAYOUT.halfW} y1={font(8)}
            x2={LAYOUT.pad + LAYOUT.halfW} y2={LAYOUT.chamberH - font(8)}
            stroke={colors.neutral[200]} strokeWidth={1}
          />

          {/* ── DC 加热盒 ── */}
          <g transform={`translate(${LAYOUT.pad * 2 + LAYOUT.halfW}, 0)`}>
            {/* 卡片背景 */}
            <rect
              x={0} y={0}
              width={LAYOUT.halfW}
              height={LAYOUT.chamberH}
              fill={colors.neutral.white}
              stroke={isSuccess ? C_success : colors.neutral[200]}
              strokeWidth={isSuccess ? 2 : CANVAS_STYLE.stroke.grid}
              rx={8}
            />
            {/* 外壳温色 */}
            <rect
              x={0} y={0}
              width={LAYOUT.halfW}
              height={LAYOUT.chamberH}
              fill={tempToColor(state.T_dc)}
              opacity={0.07}
              rx={8}
              pointerEvents="none"
            />

            {/* 标题 */}
            <text
              x={LAYOUT.halfW * 0.45}
              y={font(18)}
              fontSize={font(12)}
              fontWeight="bold"
              textAnchor="middle"
              fill={PHYSICS_COLORS.labelText}
            >
              DC 加热盒
            </text>

            {/* 电路区域 */}
            <g transform={`translate(${LAYOUT.halfW * 0.12}, ${LAYOUT.chamberH * 0.2})`}>
              <rect
                x={0} y={0}
                width={LAYOUT.halfW * 0.68}
                height={LAYOUT.chamberH * 0.45}
                fill="none"
                stroke={PHYSICS_COLORS.objectStroke}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
                rx={4}
              />
              {/* DC 源符号 */}
              <g transform={`translate(${LAYOUT.halfW * 0.05}, ${LAYOUT.chamberH * 0.225})`}>
                <line x1={-font(12)} y1={0} x2={-font(3)} y2={0} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2} />
                <line x1={font(3)} y1={0} x2={font(12)} y2={0} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2} />
                <line x1={-font(3)} y1={-font(8)} x2={-font(3)} y2={font(8)} stroke={SCENE_COLORS.circuit.batteryPos} strokeWidth={1.5} />
                <line x1={font(3)} y1={-font(4)} x2={font(3)} y2={font(4)} stroke={SCENE_COLORS.circuit.batteryNeg} strokeWidth={3} />
              </g>
              {/* 灯泡 */}
              <LightBulb
                x={LAYOUT.halfW * 0.53}
                y={LAYOUT.chamberH * 0.225}
                power={power_dc}
                time={t}
                scale={0.7}
                showLabel={false}
              />
              {/* 电阻标注 */}
              <text
                x={LAYOUT.halfW * 0.32}
                y={LAYOUT.chamberH * 0.42}
                fontSize={font(9)}
                textAnchor="middle"
                fill={PHYSICS_COLORS.labelText}
              >
                R={R}Ω
              </text>
              {/* DC 电子动画（定向漂移） */}
              {dcElectronsRef.current.map((p) => {
                const speed = 30
                const circuitW = LAYOUT.halfW * 0.56
                const pos = ((t * speed + p.phase * 50) % circuitW + circuitW) % circuitW
                const ex = LAYOUT.halfW * 0.1 + pos
                const eR = font(3)
                return (
                  <g key={p.id}>
                    <circle cx={ex} cy={LAYOUT.chamberH * 0.12} r={eR}
                      fill={PHYSICS_COLORS.negativeCharge} opacity={0.9} />
                  </g>
                )
              })}
            </g>

            {/* ─── DC 垂直能量槽 ─── */}
            {(() => {
              const slotW = font(12)
              const slotH = LAYOUT.chamberH * 0.52
              const slotX = LAYOUT.halfW - font(20)
              const slotY = LAYOUT.chamberH * 0.19
              const fillRatio = Math.min(1, state.Q_dc / gaugeMax)
              const fillH = slotH * fillRatio
              const fillY = slotY + slotH - fillH

              return (
                <g style={isSuccess && atPeriodEnd ? flashStyle : undefined}>
                  {/* 槽轮廓 */}
                  <rect x={slotX} y={slotY} width={slotW} height={slotH}
                    fill={colors.neutral[100]} stroke={colors.neutral[300]}
                    strokeWidth={1} rx={font(4)} />
                  {/* 填充 */}
                  <clipPath id="dc-gauge-clip">
                    <rect x={slotX} y={slotY} width={slotW} height={slotH} rx={font(4)} />
                  </clipPath>
                  <rect
                    x={slotX} y={fillY} width={slotW} height={fillH}
                    fill={C_Qdc} opacity={0.75}
                    clipPath="url(#dc-gauge-clip)"
                  />
                  {/* 液面线（DC 匀速，无抖动） */}
                  {fillH > 2 && (
                    <line
                      x1={slotX} y1={fillY}
                      x2={slotX + slotW} y2={fillY}
                      stroke={colors.neutral.white} strokeWidth={2} opacity={0.7}
                    />
                  )}
                  {/* 等效成功时：平齐箭头提示 */}
                  {isSuccess && atPeriodEnd && (
                    <>
                      <text x={slotX + slotW / 2} y={fillY - font(3)}
                        fontSize={font(9)} textAnchor="middle" fill={C_success} fontWeight="bold">
                        ✓
                      </text>
                    </>
                  )}
                  {/* 标签 */}
                  <text x={slotX + slotW / 2} y={slotY - font(3)}
                    fontSize={font(7.5)} textAnchor="middle" fill={C_Qdc} fontWeight="600">
                    Q_dc
                  </text>
                  {/* 百分比 */}
                  <text x={slotX + slotW / 2} y={slotY + slotH + font(10)}
                    fontSize={font(7)} textAnchor="middle" fill={PHYSICS_COLORS.labelTextLight}>
                    {(fillRatio * 100).toFixed(0)}%
                  </text>
                </g>
              )
            })()}

            {/* 温度计 */}
            <g transform={`translate(${LAYOUT.halfW - font(36)}, ${LAYOUT.chamberH * 0.72})`}>
              <rect x={-font(4)} y={0} width={font(8)} height={LAYOUT.chamberH * 0.22}
                fill={colors.neutral[200]} rx={font(3)} />
              <rect
                x={-font(4)}
                y={LAYOUT.chamberH * 0.22 * (1 - Math.min(1, (state.T_dc - INITIAL_TEMP) / (MAX_TEMP - INITIAL_TEMP)))}
                width={font(8)}
                height={LAYOUT.chamberH * 0.22 * Math.min(1, (state.T_dc - INITIAL_TEMP) / (MAX_TEMP - INITIAL_TEMP))}
                fill={tempToColor(state.T_dc)} rx={font(3)}
              />
              <text x={font(10)} y={LAYOUT.chamberH * 0.12} fontSize={font(8.5)} fill={PHYSICS_COLORS.labelText}>
                {state.T_dc.toFixed(1)}°C
              </text>
            </g>

            {/* 热量数值 */}
            <text
              x={LAYOUT.halfW * 0.45}
              y={LAYOUT.chamberH - font(8)}
              fontSize={font(10)}
              textAnchor="middle"
              fill={C_Qdc}
              fontWeight="bold"
            >
              Q_dc = {state.Q_dc.toFixed(2)} J
            </text>
          </g>
        </g>

        {/* ═══════════════════════════════════════════
            成功弹窗
        ═══════════════════════════════════════════ */}
        {isSuccess && (
          <g>
            <rect
              x={width * 0.28}
              y={height * 0.41}
              width={width * 0.44}
              height={font(52)}
              fill={colors.success[50]}
              stroke={C_success}
              strokeWidth={2}
              rx={10}
              opacity={0.96}
            />
            <text
              x={width / 2}
              y={height * 0.41 + font(22)}
              fontSize={font(13)}
              fontWeight="bold"
              textAnchor="middle"
              fill={colors.success[700]}
            >
              ✓ 热效应等效成功！
            </text>
            <text
              x={width / 2}
              y={height * 0.41 + font(38)}
              fontSize={font(10)}
              textAnchor="middle"
              fill={colors.success[600]}
            >
              当前直流电流即为有效值  I_eff = {state.I_eff.toFixed(3)} A
            </text>
          </g>
        )}

        {/* ═══════════════════════════════════════════
            底部信息栏
        ═══════════════════════════════════════════ */}
        <text
          x={width / 2}
          y={LAYOUT.chamberY + LAYOUT.chamberH + pad + font(12)}
          fontSize={font(9)}
          textAnchor="middle"
          fill={colors.neutral[400]}
        >
          ΔQ = {(state.Q_dc - state.Q_ac).toFixed(2)} J | I_eff = {state.I_eff.toFixed(3)} A | 误差 {Math.abs((Idc - state.I_eff) / Math.max(state.I_eff, 0.01) * 100).toFixed(1)}%
        </text>
        <text
          x={width / 2}
          y={LAYOUT.chamberY + LAYOUT.chamberH + pad + font(22)}
          fontSize={font(8)}
          textAnchor="middle"
          fill={colors.neutral[400]}
          opacity={0.55}
        >
          注：动画为降频可视化模型，微观运动空间与时间尺度已做放大处理。
        </text>
      </svg>
    </div>
  )
}
