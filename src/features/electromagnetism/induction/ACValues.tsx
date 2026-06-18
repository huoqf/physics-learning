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
} from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { LightBulb } from '@/components/Physics/LightBulb'
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

  // ─── 图表公共边距 ─────────────────────────────────────────────────
  const chartMargin = { left: 48, right: 20, top: 8, bottom: 6 }
  const chartPlotW = LAYOUT.halfW * 2 + pad - chartMargin.left - chartMargin.right
  const maxT = Math.max(t, VISUAL_PERIOD * 2)

  // X 轴映射（两舱共享）
  const toChartX = useCallback(
    (tVal: number) => chartMargin.left + (tVal / maxT) * chartPlotW,
    [chartPlotW, maxT]
  )

  // 上层：I-t 纵轴（以 0 为中线，完整正负轴）
  const iAxisRange = Im * 1.25   // 正负对称显示
  const topPlotH = LAYOUT.topChamberH - chartMargin.top - chartMargin.bottom
  const toTopY_I = useCallback(
    (iVal: number) =>
      chartMargin.top + topPlotH / 2 - (iVal / iAxisRange) * (topPlotH / 2),
    [topPlotH, iAxisRange]
  )
  const topZeroY = chartMargin.top + topPlotH / 2

  // 下层：Q-t 纵轴（动态上限）
  const maxQ = useMemo(() => {
    const currentMax = Math.max(state.Q_ac, state.Q_dc, 1)
    return Math.max(currentMax * 1.2, gaugeMax * 0.05)  // 早期保持一定可见比例
  }, [state.Q_ac, state.Q_dc, gaugeMax])

  const botPlotH = LAYOUT.botChamberH - chartMargin.top - chartMargin.bottom
  const toBottomY_Q = useCallback(
    (qVal: number) =>
      LAYOUT.botChamberY + chartMargin.top + botPlotH - (qVal / maxQ) * botPlotH,
    [LAYOUT.botChamberY, botPlotH, maxQ]
  )

  // ─── 波形路径（上层 I-t）──────────────────────────────────────────
  const waveformPath = useMemo(() => {
    const pts: string[] = []
    const totalT = Math.max(t, VISUAL_PERIOD * 2)
    const samples = 240
    for (let i = 0; i <= samples; i++) {
      const ti = (totalT * i) / samples
      const iVal = getInstantaneousCurrent(ti)
      const px = toChartX(ti)
      const py = toTopY_I(iVal)
      pts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`)
    }
    return pts.join(' ')
  }, [t, getInstantaneousCurrent, toChartX, toTopY_I])

  // ─── Q-t 曲线路径（下层热量舱）──────────────────────────────────
  const qAcPath = useMemo(() => {
    if (chartPoints.length < 2) return ''
    return chartPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toChartX(p.t).toFixed(1)} ${toBottomY_Q(p.Q_ac).toFixed(1)}`)
      .join(' ')
  }, [chartPoints, toChartX, toBottomY_Q])

  const qDcPath = useMemo(() => {
    if (chartPoints.length < 2) return ''
    return chartPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toChartX(p.t).toFixed(1)} ${toBottomY_Q(p.Q_dc).toFixed(1)}`)
      .join(' ')
  }, [chartPoints, toChartX, toBottomY_Q])

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
            上层【I-t 电流舱】
        ═══════════════════════════════════════════ */}
        <g>
          {/* 背景框 */}
          <rect
            x={chartMargin.left - 4}
            y={chartMargin.top - 4}
            width={chartPlotW + 8}
            height={topPlotH + 8}
            fill={colors.neutral.white}
            stroke={colors.neutral[200]}
            strokeWidth={CANVAS_STYLE.stroke.grid}
            rx={4}
          />

          {/* 标题标签 */}
          <text
            x={chartMargin.left}
            y={chartMargin.top - 6}
            fontSize={font(8.5)}
            fill={PHYSICS_COLORS.labelTextLight}
            fontWeight="600"
          >
            ① 电流对比
          </text>
          <text
            x={chartMargin.left + chartPlotW}
            y={chartMargin.top - 6}
            fontSize={font(8.5)}
            fill={PHYSICS_COLORS.labelTextLight}
            textAnchor="end"
          >
            i / A
          </text>

          {/* 网格线（5条横线） */}
          {Array.from({ length: 5 }).map((_, i) => {
            const gy = chartMargin.top + (topPlotH * i) / 4
            return (
              <line
                key={`top-grid-${i}`}
                x1={chartMargin.left}
                y1={gy}
                x2={chartMargin.left + chartPlotW}
                y2={gy}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.5}
                opacity={0.25}
              />
            )
          })}

          {/* 零线（加粗虚线） */}
          <line
            x1={chartMargin.left}
            y1={topZeroY}
            x2={chartMargin.left + chartPlotW}
            y2={topZeroY}
            stroke={PHYSICS_COLORS.labelTextLight}
            strokeWidth={0.8}
            strokeDasharray="4,4"
            opacity={0.4}
          />

          {/* 左轴刻度：Im / 0 / -Im */}
          <text x={chartMargin.left - 4} y={chartMargin.top + font(4)} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">{Im.toFixed(1)}</text>
          <text x={chartMargin.left - 4} y={topZeroY + font(3)} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">0</text>
          <text x={chartMargin.left - 4} y={chartMargin.top + topPlotH - font(2)} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">-{Im.toFixed(1)}</text>

          {/* 峰值参考线 Im（顶部浅灰虚线） */}
          <line
            x1={chartMargin.left}
            y1={toTopY_I(Im)}
            x2={chartMargin.left + chartPlotW}
            y2={toTopY_I(Im)}
            stroke={C_Im}
            strokeWidth={1}
            strokeDasharray="3,5"
            opacity={0.45}
          />
          <text
            x={chartMargin.left + chartPlotW - 2}
            y={toTopY_I(Im) - 3}
            fontSize={font(8)}
            fill={C_Im}
            textAnchor="end"
            opacity={0.7}
          >
            Im={Im.toFixed(1)}A
          </text>

          {/* AC 电流波形（蓝色） */}
          <path
            d={waveformPath}
            fill="none"
            stroke={C_iAC}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 直流参考线 Idc（红色水平线，实时随滑块平移） */}
          {Idc > 0 && (
            <>
              <line
                x1={chartMargin.left}
                y1={toTopY_I(Idc)}
                x2={chartMargin.left + chartPlotW}
                y2={toTopY_I(Idc)}
                stroke={C_iDC}
                strokeWidth={2}
                strokeDasharray="8,4"
                opacity={0.85}
              />
              {/* Idc 标注 */}
              <rect
                x={chartMargin.left + 4}
                y={toTopY_I(Idc) - font(9)}
                width={font(46)}
                height={font(10)}
                fill={colors.neutral.white}
                opacity={0.85}
                rx={2}
              />
              <text
                x={chartMargin.left + 6}
                y={toTopY_I(Idc) - font(1)}
                fontSize={font(8)}
                fill={C_iDC}
                fontWeight="600"
              >
                Idc={Idc.toFixed(2)}A
              </text>
            </>
          )}

          {/* 周期竖虚线（上层） */}
          {Array.from({ length: Math.ceil(maxT / VISUAL_PERIOD) + 1 }).map((_, i) => {
            const periodT = i * VISUAL_PERIOD
            if (periodT > maxT || periodT === 0) return null
            const px = toChartX(periodT)
            return (
              <line
                key={`top-period-${i}`}
                x1={px} y1={chartMargin.top}
                x2={px} y2={chartMargin.top + topPlotH}
                stroke={C_period}
                strokeWidth={0.6}
                strokeDasharray="2,5"
                opacity={0.35}
              />
            )
          })}

          {/* 当前时刻游标 */}
          <line
            x1={toChartX(t)} y1={chartMargin.top}
            x2={toChartX(t)} y2={chartMargin.top + topPlotH}
            stroke={PHYSICS_COLORS.labelTextLight}
            strokeWidth={0.8}
            strokeDasharray="2,3"
            opacity={0.45}
          />

          {/* 图例（右上角） */}
          <g transform={`translate(${chartMargin.left + chartPlotW - 80}, ${chartMargin.top + 6})`}>
            <line x1={0} y1={0} x2={14} y2={0} stroke={C_iAC} strokeWidth={1.8} />
            <text x={17} y={4} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight}>i(t) 交流</text>
            <line x1={0} y1={13} x2={14} y2={13} stroke={C_iDC} strokeWidth={2} strokeDasharray="6,3" />
            <text x={17} y={17} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight}>Idc 直流</text>
          </g>
        </g>

        {/* ═══════════════════════════════════════════
            分隔线（极细）
        ═══════════════════════════════════════════ */}
        <g transform={`translate(0, ${LAYOUT.dividerY})`}>
          <line
            x1={chartMargin.left - 4}
            y1={LAYOUT.dividerH / 2}
            x2={chartMargin.left + chartPlotW + 8}
            y2={LAYOUT.dividerH / 2}
            stroke={colors.neutral[200]}
            strokeWidth={1}
          />
          <text
            x={chartMargin.left + chartPlotW + 6}
            y={LAYOUT.dividerH / 2 + font(4)}
            fontSize={font(8)}
            fill={PHYSICS_COLORS.labelTextLight}
            opacity={0.6}
          >
            Q ↓
          </text>
        </g>

        {/* ═══════════════════════════════════════════
            下层【Q-t 热量舱】
        ═══════════════════════════════════════════ */}
        <g>
          {/* 背景框 */}
          <rect
            x={chartMargin.left - 4}
            y={LAYOUT.botChamberY + chartMargin.top - 4}
            width={chartPlotW + 8}
            height={botPlotH + 8}
            fill={colors.neutral.white}
            stroke={colors.neutral[200]}
            strokeWidth={CANVAS_STYLE.stroke.grid}
            rx={4}
          />

          {/* 标题标签 */}
          <text
            x={chartMargin.left}
            y={LAYOUT.botChamberY + chartMargin.top - 6}
            fontSize={font(8.5)}
            fill={PHYSICS_COLORS.labelTextLight}
            fontWeight="600"
          >
            ② 热量赛跑
          </text>
          <text
            x={chartMargin.left + chartPlotW}
            y={LAYOUT.botChamberY + chartMargin.top - 6}
            fontSize={font(8.5)}
            fill={PHYSICS_COLORS.labelTextLight}
            textAnchor="end"
          >
            Q / J
          </text>

          {/* 网格线 */}
          {Array.from({ length: 4 }).map((_, i) => {
            const gy = LAYOUT.botChamberY + chartMargin.top + (botPlotH * i) / 3
            return (
              <line
                key={`bot-grid-${i}`}
                x1={chartMargin.left} y1={gy}
                x2={chartMargin.left + chartPlotW} y2={gy}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.5}
                opacity={0.25}
              />
            )
          })}

          {/* 左轴刻度 */}
          <text
            x={chartMargin.left - 4}
            y={LAYOUT.botChamberY + chartMargin.top + font(4)}
            fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end"
          >
            {maxQ.toFixed(0)}J
          </text>
          <text
            x={chartMargin.left - 4}
            y={LAYOUT.botChamberY + chartMargin.top + botPlotH}
            fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end"
          >
            0
          </text>

          {/* 周期竖虚线（下层）+ T 标注 */}
          {Array.from({ length: Math.ceil(maxT / VISUAL_PERIOD) + 1 }).map((_, i) => {
            const periodT = i * VISUAL_PERIOD
            if (periodT > maxT || periodT === 0) return null
            const px = toChartX(periodT)
            const label = `${i}T`
            const isAtEnd = isNearPeriodEnd(t, VISUAL_PERIOD) && Math.abs(t - periodT) < VISUAL_PERIOD * 0.05
            return (
              <g key={`bot-period-${i}`}>
                <line
                  x1={px} y1={LAYOUT.botChamberY + chartMargin.top}
                  x2={px} y2={LAYOUT.botChamberY + chartMargin.top + botPlotH}
                  stroke={isAtEnd && isSuccess ? C_success : C_period}
                  strokeWidth={isAtEnd ? 1.2 : 0.6}
                  strokeDasharray="2,5"
                  opacity={isAtEnd ? 0.7 : 0.35}
                />
                <text
                  x={px + 2}
                  y={LAYOUT.botChamberY + chartMargin.top + botPlotH - 3}
                  fontSize={font(7.5)}
                  fill={C_period}
                  opacity={0.6}
                >
                  {label}
                </text>
              </g>
            )
          })}

          {/* 时间横轴标签 */}
          <text
            x={chartMargin.left + chartPlotW / 2}
            y={LAYOUT.botChamberY + chartMargin.top + botPlotH + font(13)}
            fontSize={font(9)}
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            时间 t (s)
          </text>

          {/* Q_ac 热量曲线（势能紫，实线） */}
          {qAcPath && (
            <path
              d={qAcPath}
              fill="none"
              stroke={C_Qac}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Q_dc 热量曲线（功率黄，实线） */}
          {qDcPath && (
            <path
              d={qDcPath}
              fill="none"
              stroke={C_Qdc}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 当前时刻游标 */}
          <line
            x1={toChartX(t)} y1={LAYOUT.botChamberY + chartMargin.top}
            x2={toChartX(t)} y2={LAYOUT.botChamberY + chartMargin.top + botPlotH}
            stroke={PHYSICS_COLORS.labelTextLight}
            strokeWidth={0.8}
            strokeDasharray="2,3"
            opacity={0.45}
          />

          {/* 撞线高亮圆点：周期终点且等效成功 */}
          {isSuccess && atPeriodEnd && chartPoints.length > 0 && (
            <>
              <circle
                cx={toChartX(t)}
                cy={toBottomY_Q(state.Q_ac)}
                r={7}
                fill={C_success}
                stroke={colors.neutral.white}
                strokeWidth={2}
                opacity={0.9}
              />
              <circle
                cx={toChartX(t)}
                cy={toBottomY_Q(state.Q_ac)}
                r={12}
                fill="none"
                stroke={C_success}
                strokeWidth={1.5}
                opacity={0.4}
              />
            </>
          )}

          {/* 图例 */}
          <g transform={`translate(${chartMargin.left + 6}, ${LAYOUT.botChamberY + chartMargin.top + 8})`}>
            <line x1={0} y1={0} x2={14} y2={0} stroke={C_Qac} strokeWidth={2.2} />
            <text x={17} y={4} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight}>Q_ac 交流热量</text>
            <line x1={0} y1={13} x2={14} y2={13} stroke={C_Qdc} strokeWidth={2.2} />
            <text x={17} y={17} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight}>Q_dc 直流热量</text>
          </g>
        </g>

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
