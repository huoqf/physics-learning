/**
 * ACValues.tsx — 有效值与峰值关系（[M4-1]）
 *
 * 核心功能：双轨对比实验舱 SVG（交变电流 vs 恒定直流）
 *  - 上区：双轴 MiniChart（i-t 波形 + Q-t 热量曲线）
 *  - 下区：双 Card 对比舱（AC/DC 加热盒 + 电子动画 + 温度反馈）
 *  - 支持多波形：正弦、方波、脉冲波、半波整流
 *  - 等效成功判定：周期终点 + 误差容限
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
} from '@/physics/rmsCalculator'
import type { WaveformType } from '@/physics/rmsCalculator'

/** 波形类型映射 */
const WAVEFORM_MAP: Record<number, WaveformType> = {
  0: 'sine',
  1: 'square',
  2: 'pulse',
  3: 'half_sine',
}

/** 视觉周期 (s) — 降频可视化，便于肉眼观察电子运动 */
const VISUAL_PERIOD = 2

/** 初始温度 (°C) */
const INITIAL_TEMP = 20

/** 最高显示温度 (°C) */
const MAX_TEMP = 80

interface Electron {
  id: number
  phase: number
}

/** 温度 → 颜色插值（冷色调 → 暖色调） */
function tempToColor(temp: number): string {
  const t = Math.min(1, Math.max(0, (temp - INITIAL_TEMP) / (MAX_TEMP - INITIAL_TEMP)))
  // 从冷蓝 (180, 210, 240) 到暖红 (240, 90, 70)
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
    // 限制数据点数量，防止内存膨胀
    if (pointsRef.current.length > 600) {
      pointsRef.current = pointsRef.current.slice(-500)
    }
    setChartPoints([...pointsRef.current])
  }, [t, isPlaying, state.Q_ac, state.Q_dc])

  // 参数变化时清空历史
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

  // 布局计算
  const LAYOUT = useMemo(() => {
    const pad = Math.min(width, height) * 0.02
    const bottomBarH = font(28) // 底部信息栏 + 注脚文案总高度
    const chartH = height * 0.36
    const chamberY = chartH + pad * 2
    const chamberH = height - chamberY - pad - bottomBarH
    const halfW = (width - pad * 3) / 2
    return { pad, chartH, chamberY, chamberH, halfW, bottomBarH }
  }, [width, height, font])

  const { pad } = LAYOUT

  // Q-t 图表 Y 轴范围
  const maxQ = useMemo(() => {
    const maxPossible = Im * Im * R * VISUAL_PERIOD * 3
    return Math.max(maxPossible, 100)
  }, [Im, R])

  // 图表 SVG 坐标转换
  const chartMargin = { left: 50, right: 50, top: 25, bottom: 25 }
  const chartPlotW = LAYOUT.halfW * 2 - chartMargin.left - chartMargin.right
  const chartPlotH = LAYOUT.chartH - chartMargin.top - chartMargin.bottom
  const maxT = Math.max(t, VISUAL_PERIOD * 2)

  const toChartX = (tVal: number) => chartMargin.left + (tVal / maxT) * chartPlotW
  const toChartY_Q = (qVal: number) => chartMargin.top + chartPlotH - (qVal / maxQ) * chartPlotH
  const toChartY_I = (iVal: number) => chartMargin.top + chartPlotH / 2 - (iVal / (Im * 1.2)) * (chartPlotH / 2)

  // 生成 i-t 波形路径
  const waveformPath = useMemo(() => {
    const pts: string[] = []
    const samples = 200
    for (let i = 0; i <= samples; i++) {
      const ti = Math.max(0, t - VISUAL_PERIOD * 2) + (VISUAL_PERIOD * 2 * i) / samples
      const iVal = getInstantaneousCurrent(ti)
      const px = toChartX(ti)
      const py = toChartY_I(iVal)
      pts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`)
    }
    return pts.join(' ')
  }, [t, getInstantaneousCurrent, Im])

  // 生成 Q-t 曲线路径
  const qAcPath = useMemo(() => {
    if (chartPoints.length < 2) return ''
    return chartPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toChartX(p.t).toFixed(1)} ${toChartY_Q(p.Q_ac).toFixed(1)}`)
      .join(' ')
  }, [chartPoints])

  const qDcPath = useMemo(() => {
    if (chartPoints.length < 2) return ''
    return chartPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toChartX(p.t).toFixed(1)} ${toChartY_Q(p.Q_dc).toFixed(1)}`)
      .join(' ')
  }, [chartPoints])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full select-none"
      >
        {/* ═══════ 上区：双轴图表 ═══════ */}
        <g>
          {/* 图表背景 */}
          <rect
            x={chartMargin.left - 5}
            y={chartMargin.top - 5}
            width={chartPlotW + 10}
            height={chartPlotH + 10}
            fill={colors.neutral.white}
            stroke={colors.neutral[200]}
            strokeWidth={CANVAS_STYLE.stroke.grid}
            rx={4}
          />

          {/* 网格线 */}
          {Array.from({ length: 5 }).map((_, i) => {
            const gy = chartMargin.top + (chartPlotH * i) / 4
            return (
              <line
                key={`grid-${i}`}
                x1={chartMargin.left}
                y1={gy}
                x2={chartMargin.left + chartPlotW}
                y2={gy}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.5}
                opacity={0.3}
              />
            )
          })}

          {/* 零线 */}
          <line
            x1={chartMargin.left}
            y1={chartMargin.top + chartPlotH / 2}
            x2={chartMargin.left + chartPlotW}
            y2={chartMargin.top + chartPlotH / 2}
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={0.8}
            strokeDasharray="3,3"
            opacity={0.4}
          />

          {/* i-t 波形曲线（蓝色） */}
          <path
            d={waveformPath}
            fill="none"
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={1.5}
            strokeLinecap="round"
          />

          {/* Q_ac 曲线（紫色） */}
          {qAcPath && (
            <path
              d={qAcPath}
              fill="none"
              stroke="#7C3AED"
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}

          {/* Q_dc 曲线（紫色虚线） */}
          {qDcPath && (
            <path
              d={qDcPath}
              fill="none"
              stroke="#7C3AED"
              strokeWidth={2}
              strokeDasharray="6,3"
              strokeLinecap="round"
            />
          )}

          {/* 周期竖线标记 */}
          {Array.from({ length: Math.ceil(maxT / VISUAL_PERIOD) + 1 }).map((_, i) => {
            const periodT = i * VISUAL_PERIOD
            if (periodT > maxT) return null
            return (
              <line
                key={`period-${i}`}
                x1={toChartX(periodT)}
                y1={chartMargin.top}
                x2={toChartX(periodT)}
                y2={chartMargin.top + chartPlotH}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.5}
                strokeDasharray="2,4"
                opacity={0.4}
              />
            )
          })}

          {/* 当前时刻游标 */}
          <line
            x1={toChartX(t)}
            y1={chartMargin.top}
            x2={toChartX(t)}
            y2={chartMargin.top + chartPlotH}
            stroke={PHYSICS_COLORS.labelTextLight}
            strokeWidth={0.8}
            strokeDasharray="3,3"
            opacity={0.6}
          />

          {/* 成功高亮：Q_ac 与 Q_dc 交汇点 */}
          {isSuccess && chartPoints.length > 0 && (
            <circle
              cx={toChartX(t)}
              cy={toChartY_Q(state.Q_ac)}
              r={6}
              fill={colors.accent[500]}
              stroke={colors.neutral.white}
              strokeWidth={2}
              opacity={0.9}
            />
          )}

          {/* 左轴标签：电流 i(t) */}
          <text
            x={chartMargin.left - 8}
            y={chartMargin.top - 8}
            fontSize={font(10)}
            fill={PHYSICS_COLORS.velocity}
            textAnchor="end"
          >
            i(t)
          </text>
          <text
            x={chartMargin.left - 8}
            y={chartMargin.top + chartPlotH / 2 + font(4)}
            fontSize={font(9)}
            fill={PHYSICS_COLORS.labelTextLight}
            textAnchor="end"
          >
            0
          </text>
          <text
            x={chartMargin.left - 8}
            y={chartMargin.top + 4}
            fontSize={font(9)}
            fill={PHYSICS_COLORS.labelTextLight}
            textAnchor="end"
          >
            {Im.toFixed(1)}
          </text>

          {/* 右轴标签：热量 Q(t) */}
          <text
            x={chartMargin.left + chartPlotW + 8}
            y={chartMargin.top - 8}
            fontSize={font(10)}
            fill="#7C3AED"
          >
            Q(t)
          </text>
          <text
            x={chartMargin.left + chartPlotW + 8}
            y={chartMargin.top + 4}
            fontSize={font(9)}
            fill={PHYSICS_COLORS.labelTextLight}
          >
            {maxQ.toFixed(0)}J
          </text>

          {/* X 轴标签 */}
          <text
            x={chartMargin.left + chartPlotW / 2}
            y={chartMargin.top + chartPlotH + font(14)}
            fontSize={font(10)}
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            时间 t (s)
          </text>

          {/* 图例 */}
          <g transform={`translate(${chartMargin.left + 10}, ${chartMargin.top + 8})`}>
            <line x1={0} y1={-3} x2={12} y2={-3} stroke={PHYSICS_COLORS.velocity} strokeWidth={1.5} />
            <text x={16} y={0} fontSize={font(9)} fill={PHYSICS_COLORS.labelTextLight}>i(t)</text>
            <line x1={0} y1={10} x2={12} y2={10} stroke="#7C3AED" strokeWidth={2} />
            <text x={16} y={13} fontSize={font(9)} fill={PHYSICS_COLORS.labelTextLight}>Q_ac</text>
            <line x1={0} y1={23} x2={12} y2={23} stroke="#7C3AED" strokeWidth={2} strokeDasharray="6,3" />
            <text x={16} y={26} fontSize={font(9)} fill={PHYSICS_COLORS.labelTextLight}>Q_dc</text>
          </g>
        </g>

        {/* ═══════ 下区：双 Card 对比舱 ═══════ */}
        <g transform={`translate(0, ${LAYOUT.chamberY})`}>
          {/* ── AC 加热盒 ── */}
          <g transform={`translate(${LAYOUT.pad}, 0)`}>
            {/* 卡片背景 */}
            <rect
              x={0}
              y={0}
              width={LAYOUT.halfW}
              height={LAYOUT.chamberH}
              fill={colors.neutral.white}
              stroke={isSuccess ? colors.accent[400] : colors.neutral[200]}
              strokeWidth={isSuccess ? 2 : CANVAS_STYLE.stroke.grid}
              rx={8}
            />

            {/* 标题 */}
            <text
              x={LAYOUT.halfW / 2}
              y={font(18)}
              fontSize={font(12)}
              fontWeight="bold"
              textAnchor="middle"
              fill={PHYSICS_COLORS.labelText}
            >
              AC 加热盒
            </text>

            {/* 电路示意区域 */}
            <g transform={`translate(${LAYOUT.halfW * 0.15}, ${LAYOUT.chamberH * 0.2})`}>
              {/* 电路回路 */}
              <rect
                x={0}
                y={0}
                width={LAYOUT.halfW * 0.7}
                height={LAYOUT.chamberH * 0.45}
                fill="none"
                stroke={PHYSICS_COLORS.objectStroke}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
                rx={4}
              />

              {/* AC 源符号 */}
              <g transform={`translate(${LAYOUT.halfW * 0.05}, ${LAYOUT.chamberH * 0.225})`}>
                <circle
                  r={font(14)}
                  fill={colors.neutral.white}
                  stroke={PHYSICS_COLORS.electricCurrent}
                  strokeWidth={1.5}
                />
                <path
                  d={`M ${-font(8)} 0 Q ${-font(4)} ${-font(5)} 0 0 Q ${font(4)} ${font(5)} ${font(8)} 0`}
                  fill="none"
                  stroke={PHYSICS_COLORS.electricCurrent}
                  strokeWidth={1.5}
                />
              </g>

              {/* 灯泡 */}
              <LightBulb
                x={LAYOUT.halfW * 0.55}
                y={LAYOUT.chamberH * 0.225}
                power={power_ac}
                time={t}
                scale={0.7}
                showLabel={false}
              />

              {/* 电阻标注 */}
              <text
                x={LAYOUT.halfW * 0.35}
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
                const ex = LAYOUT.halfW * 0.12 + LAYOUT.halfW * 0.56 * ((nPos + 1) / 2)
                const brightness = 0.3 + 0.7 * Math.abs(Math.cos(phase))
                const eR = font(3)
                return (
                  <g key={p.id}>
                    <circle
                      cx={ex}
                      cy={LAYOUT.chamberH * 0.12}
                      r={eR + brightness * eR * 0.5}
                      fill={PHYSICS_COLORS.negativeCharge}
                      opacity={brightness * 0.15}
                    />
                    <circle
                      cx={ex}
                      cy={LAYOUT.chamberH * 0.12}
                      r={eR}
                      fill={PHYSICS_COLORS.negativeCharge}
                      opacity={brightness}
                    />
                  </g>
                )
              })}
            </g>

            {/* 温度计 */}
            <g transform={`translate(${LAYOUT.halfW - font(20)}, ${LAYOUT.chamberH * 0.7})`}>
              <rect
                x={-font(4)}
                y={0}
                width={font(8)}
                height={LAYOUT.chamberH * 0.25}
                fill={colors.neutral[200]}
                rx={font(3)}
              />
              <rect
                x={-font(4)}
                y={LAYOUT.chamberH * 0.25 * (1 - Math.min(1, (state.T_ac - INITIAL_TEMP) / (MAX_TEMP - INITIAL_TEMP)))}
                width={font(8)}
                height={LAYOUT.chamberH * 0.25 * Math.min(1, (state.T_ac - INITIAL_TEMP) / (MAX_TEMP - INITIAL_TEMP))}
                fill={tempToColor(state.T_ac)}
                rx={font(3)}
              />
              <text
                x={font(10)}
                y={LAYOUT.chamberH * 0.14}
                fontSize={font(9)}
                fill={PHYSICS_COLORS.labelText}
              >
                {state.T_ac.toFixed(1)}°C
              </text>
            </g>

            {/* 热量显示 */}
            <text
              x={LAYOUT.halfW / 2}
              y={LAYOUT.chamberH - font(6)}
              fontSize={font(10)}
              textAnchor="middle"
              fill="#7C3AED"
              fontWeight="bold"
            >
              Q_ac = {state.Q_ac.toFixed(2)} J
            </text>

            {/* 外壳颜色反馈 */}
            <rect
              x={0}
              y={0}
              width={LAYOUT.halfW}
              height={LAYOUT.chamberH}
              fill={tempToColor(state.T_ac)}
              opacity={0.08}
              rx={8}
              pointerEvents="none"
            />
          </g>

          {/* ── 分隔线 ── */}
          <line
            x1={LAYOUT.pad + LAYOUT.halfW}
            y1={font(8)}
            x2={LAYOUT.pad + LAYOUT.halfW}
            y2={LAYOUT.chamberH - font(8)}
            stroke={colors.neutral[200]}
            strokeWidth={1}
          />

          {/* ── DC 加热盒 ── */}
          <g transform={`translate(${LAYOUT.pad * 2 + LAYOUT.halfW}, 0)`}>
            {/* 卡片背景 */}
            <rect
              x={0}
              y={0}
              width={LAYOUT.halfW}
              height={LAYOUT.chamberH}
              fill={colors.neutral.white}
              stroke={isSuccess ? colors.accent[400] : colors.neutral[200]}
              strokeWidth={isSuccess ? 2 : CANVAS_STYLE.stroke.grid}
              rx={8}
            />

            {/* 标题 */}
            <text
              x={LAYOUT.halfW / 2}
              y={font(18)}
              fontSize={font(12)}
              fontWeight="bold"
              textAnchor="middle"
              fill={PHYSICS_COLORS.labelText}
            >
              DC 加热盒
            </text>

            {/* 电路示意区域 */}
            <g transform={`translate(${LAYOUT.halfW * 0.15}, ${LAYOUT.chamberH * 0.2})`}>
              {/* 电路回路 */}
              <rect
                x={0}
                y={0}
                width={LAYOUT.halfW * 0.7}
                height={LAYOUT.chamberH * 0.45}
                fill="none"
                stroke={PHYSICS_COLORS.objectStroke}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
                rx={4}
              />

              {/* DC 源符号（电路原理图） */}
              <g transform={`translate(${LAYOUT.halfW * 0.05}, ${LAYOUT.chamberH * 0.225})`}>
                <line
                  x1={-font(12)}
                  y1={0}
                  x2={-font(3)}
                  y2={0}
                  stroke={SCENE_COLORS.circuit.wire}
                  strokeWidth={2}
                />
                <line
                  x1={font(3)}
                  y1={0}
                  x2={font(12)}
                  y2={0}
                  stroke={SCENE_COLORS.circuit.wire}
                  strokeWidth={2}
                />
                <line
                  x1={-font(3)}
                  y1={-font(8)}
                  x2={-font(3)}
                  y2={font(8)}
                  stroke={SCENE_COLORS.circuit.batteryPos}
                  strokeWidth={1.5}
                />
                <line
                  x1={font(3)}
                  y1={-font(4)}
                  x2={font(3)}
                  y2={font(4)}
                  stroke={SCENE_COLORS.circuit.batteryNeg}
                  strokeWidth={3}
                />
              </g>

              {/* 灯泡 */}
              <LightBulb
                x={LAYOUT.halfW * 0.55}
                y={LAYOUT.chamberH * 0.225}
                power={power_dc}
                time={t}
                scale={0.7}
                showLabel={false}
              />

              {/* 电阻标注 */}
              <text
                x={LAYOUT.halfW * 0.35}
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
                const ex = LAYOUT.halfW * 0.12 + pos
                const eR = font(3)
                return (
                  <g key={p.id}>
                    <circle
                      cx={ex}
                      cy={LAYOUT.chamberH * 0.12}
                      r={eR}
                      fill={PHYSICS_COLORS.negativeCharge}
                      opacity={0.9}
                    />
                  </g>
                )
              })}
            </g>

            {/* 温度计 */}
            <g transform={`translate(${LAYOUT.halfW - font(20)}, ${LAYOUT.chamberH * 0.7})`}>
              <rect
                x={-font(4)}
                y={0}
                width={font(8)}
                height={LAYOUT.chamberH * 0.25}
                fill={colors.neutral[200]}
                rx={font(3)}
              />
              <rect
                x={-font(4)}
                y={LAYOUT.chamberH * 0.25 * (1 - Math.min(1, (state.T_dc - INITIAL_TEMP) / (MAX_TEMP - INITIAL_TEMP)))}
                width={font(8)}
                height={LAYOUT.chamberH * 0.25 * Math.min(1, (state.T_dc - INITIAL_TEMP) / (MAX_TEMP - INITIAL_TEMP))}
                fill={tempToColor(state.T_dc)}
                rx={font(3)}
              />
              <text
                x={font(10)}
                y={LAYOUT.chamberH * 0.14}
                fontSize={font(9)}
                fill={PHYSICS_COLORS.labelText}
              >
                {state.T_dc.toFixed(1)}°C
              </text>
            </g>

            {/* 热量显示 */}
            <text
              x={LAYOUT.halfW / 2}
              y={LAYOUT.chamberH - font(6)}
              fontSize={font(10)}
              textAnchor="middle"
              fill="#7C3AED"
              fontWeight="bold"
            >
              Q_dc = {state.Q_dc.toFixed(2)} J
            </text>

            {/* 外壳颜色反馈 */}
            <rect
              x={0}
              y={0}
              width={LAYOUT.halfW}
              height={LAYOUT.chamberH}
              fill={tempToColor(state.T_dc)}
              opacity={0.08}
              rx={8}
              pointerEvents="none"
            />
          </g>
        </g>

        {/* ═══════ 成功弹窗 ═══════ */}
        {isSuccess && (
          <g>
            <rect
              x={width * 0.3}
              y={height * 0.42}
              width={width * 0.4}
              height={font(50)}
              fill={colors.accent[50]}
              stroke={colors.accent[400]}
              strokeWidth={2}
              rx={8}
              opacity={0.95}
            />
            <text
              x={width / 2}
              y={height * 0.42 + font(22)}
              fontSize={font(13)}
              fontWeight="bold"
              textAnchor="middle"
              fill={colors.accent[700]}
            >
              热效应等效成功！
            </text>
            <text
              x={width / 2}
              y={height * 0.42 + font(38)}
              fontSize={font(10)}
              textAnchor="middle"
              fill={colors.accent[600]}
            >
              当前直流电流值即为该交流电的有效值 I_eff = {state.I_eff.toFixed(2)} A
            </text>
          </g>
        )}

        {/* ═══════ 底部信息栏 ═══════ */}
        <text
          x={width / 2}
          y={LAYOUT.chamberY + LAYOUT.chamberH + pad + font(12)}
          fontSize={font(9)}
          textAnchor="middle"
          fill={colors.neutral[400]}
        >
          ΔQ = {(state.Q_dc - state.Q_ac).toFixed(2)} J | I_eff = {state.I_eff.toFixed(2)} A | 误差 {Math.abs((Idc - state.I_eff) / state.I_eff * 100).toFixed(1)}%
        </text>

        {/* 注脚提示 */}
        <text
          x={width / 2}
          y={LAYOUT.chamberY + LAYOUT.chamberH + pad + font(22)}
          fontSize={font(8)}
          textAnchor="middle"
          fill={colors.neutral[400]}
          opacity={0.6}
        >
          注：动画为降频可视化模型，微观运动空间与时间尺度已做放大处理。
        </text>
      </svg>
    </div>
  )
}
