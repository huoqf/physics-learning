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
import { useRef, useState, useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useCanvasSize } from '@/utils'
import { colors } from '@/theme/colors'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'

// 设计坐标系常量（与 CANVAS_PRESETS.wide 一致）
const { width: DESIGN_WIDTH, height: DESIGN_HEIGHT } = CANVAS_PRESETS.wide
import { useACValuesPhysics } from './hooks/useACValuesPhysics'
import { ACValuesChartPanel } from './components/ACValuesChartPanel'
import { HeatingBox } from './components/HeatingBox'

export default function ACValues() {
  const { params, time, isPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
    }))
  )

  const [containerRef] = useCanvasSize(CANVAS_PRESETS.wide)

  // 设计坐标系下的 font 函数（固定尺寸模式）
  const font = (size: number) => Math.min(16, Math.max(7, size))

  const waveformIdx = params.waveform ?? 0
  const Im = params.Im ?? 5
  const R = params.R ?? 10
  const Idc = params.Idc ?? 3
  const duty = params.duty ?? 0.5
  const t = time ?? 0

  const pointsRef = useRef<Record<string, number>[]>([])
  const [chartPoints, setChartPoints] = useState<Record<string, number>[]>([])

  const physics = useACValuesPhysics(
    { waveformIdx, Im, R, Idc, duty, time: t, isPlaying },
  )

  useEffect(() => {
    if (!isPlaying) return
    pointsRef.current = [
      ...pointsRef.current,
      { t, Q_ac: physics.state.Q_ac, Q_dc: physics.state.Q_dc },
    ]
    if (pointsRef.current.length > 600) {
      pointsRef.current = pointsRef.current.slice(-500)
    }
    setChartPoints([...pointsRef.current])
  }, [t, isPlaying, physics.state.Q_ac, physics.state.Q_dc])

  useEffect(() => {
    pointsRef.current = []
    setChartPoints([])
  }, [waveformIdx, Im, R, duty])

  const qChartPoints = useMemo(() => {
    const pts = chartPoints.map((p) => ({ t: p.t, qAc: p.Q_ac, qDc: p.Q_dc }))
    if (pts.length === 0 || Math.abs(pts[pts.length - 1].t - t) > 1e-9) {
      pts.push({ t, qAc: physics.state.Q_ac, qDc: physics.state.Q_dc })
    }
    return pts
  }, [chartPoints, t, physics.state.Q_ac, physics.state.Q_dc])

  const LAYOUT = useMemo(() => {
    const pad = Math.min(DESIGN_WIDTH, DESIGN_HEIGHT) * 0.02
    const bottomBarH = 28
    const chartH = DESIGN_HEIGHT * 0.40
    const dividerH = 14
    const topChamberH = (chartH - dividerH) * 0.46
    const botChamberH = (chartH - dividerH) * 0.54
    const dividerY = topChamberH
    const botChamberY = dividerY + dividerH
    const chamberY = chartH + pad * 2
    const chamberH = DESIGN_HEIGHT - chamberY - pad - bottomBarH
    const halfW = (DESIGN_WIDTH - pad * 3) / 2
    return { pad, chartH, dividerH, topChamberH, botChamberH, dividerY, botChamberY, chamberY, chamberH, halfW, bottomBarH }
  }, [])

  const { pad } = LAYOUT
  const chartMargin = { left: 48, right: 20 }
  const chartPlotW = LAYOUT.halfW * 2 + pad - chartMargin.left - chartMargin.right

  const C_iAC = PHYSICS_COLORS.velocity
  const C_iDC = PHYSICS_COLORS.electricCurrent
  const C_Im = PHYSICS_COLORS.axis
  const C_Qac = PHYSICS_COLORS.potentialEnergy
  const C_Qdc = PHYSICS_COLORS.power
  const C_period = PHYSICS_COLORS.period
  const C_success = colors.success[500]

  const flashStyle = physics.isSuccess && physics.atPeriodEnd
    ? { animation: 'gauge-flash 0.5s ease-in-out' }
    : {}

  return (
    <div ref={containerRef} className="w-full h-full">
      <style>{`
        @keyframes gauge-flash {
          0%   { filter: brightness(1); }
          40%  { filter: brightness(1.6) drop-shadow(0 0 6px ${C_success}); }
          100% { filter: brightness(1); }
        }
      `}</style>

      <svg
        viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full select-none"
      >
        <g transform={`translate(${chartMargin.left - 4}, 0)`}>
          <ACValuesChartPanel
            wavePoints={physics.wavePoints}
            qPoints={qChartPoints}
            maxT={physics.maxT}
            t={t}
            iNow={physics.iNow}
            Im={Im}
            Idc={Idc}
            iAxisRange={physics.iAxisRange}
            maxQ={physics.maxQ}
            isSuccess={physics.isSuccess}
            atPeriodEnd={physics.atPeriodEnd}
            qAc={physics.state.Q_ac}
            qDc={physics.state.Q_dc}
            colors={{
              iAC: C_iAC,
              iDC: C_iDC,
              im: C_Im,
              qAc: C_Qac,
              qDc: C_Qdc,
              period: C_period,
              success: C_success,
            }}
            fixedSize={{ width: chartPlotW + 8, height: LAYOUT.chartH }}
          />
        </g>

        <g transform={`translate(0, ${LAYOUT.chamberY})`}>
          <g transform={`translate(${LAYOUT.pad}, 0)`}>
            <HeatingBox
              type="ac"
              halfW={LAYOUT.halfW}
              chamberH={LAYOUT.chamberH}
              font={font}
              power={physics.power_ac}
              time={t}
              R={R}
              Q={physics.state.Q_ac}
              temperature={physics.state.T_ac}
              gaugeMax={physics.gaugeMax}
              isSuccess={physics.isSuccess}
              atPeriodEnd={physics.atPeriodEnd}
              flashStyle={flashStyle}
              colorQ={C_Qac}
              colorSuccess={C_success}
            />
          </g>

          <line
            x1={LAYOUT.pad + LAYOUT.halfW} y1={font(8)}
            x2={LAYOUT.pad + LAYOUT.halfW} y2={LAYOUT.chamberH - font(8)}
            stroke={CANVAS_COLORS.grid} strokeWidth={1}
          />

          <g transform={`translate(${LAYOUT.pad * 2 + LAYOUT.halfW}, 0)`}>
            <HeatingBox
              type="dc"
              halfW={LAYOUT.halfW}
              chamberH={LAYOUT.chamberH}
              font={font}
              power={physics.power_dc}
              time={t}
              R={R}
              Q={physics.state.Q_dc}
              temperature={physics.state.T_dc}
              gaugeMax={physics.gaugeMax}
              isSuccess={physics.isSuccess}
              atPeriodEnd={physics.atPeriodEnd}
              flashStyle={flashStyle}
              colorQ={C_Qdc}
              colorSuccess={C_success}
            />
          </g>
        </g>

        {physics.isSuccess && (
          <g>
            <rect
              x={DESIGN_WIDTH * 0.28}
              y={DESIGN_HEIGHT * 0.41}
              width={DESIGN_WIDTH * 0.44}
              height={font(52)}
              fill={colors.success[50]}
              stroke={C_success}
              strokeWidth={2}
              rx={10}
              opacity={0.96}
            />
            <text
              x={DESIGN_WIDTH / 2}
              y={DESIGN_HEIGHT * 0.41 + font(22)}
              fontSize={font(13)}
              fontWeight="bold"
              textAnchor="middle"
              fill={colors.success[700]}
            >
              ✓ 热效应等效成功！
            </text>
            <text
              x={DESIGN_WIDTH / 2}
              y={DESIGN_HEIGHT * 0.41 + font(38)}
              fontSize={font(10)}
              textAnchor="middle"
              fill={colors.success[600]}
            >
              当前直流电流即为有效值  I_eff = {physics.state.I_eff.toFixed(3)} A
            </text>
          </g>
        )}

        <text
          x={DESIGN_WIDTH / 2}
          y={LAYOUT.chamberY + LAYOUT.chamberH + pad + font(12)}
          fontSize={font(9)}
          textAnchor="middle"
          fill={CANVAS_COLORS.trackHistory}
        >
          ΔQ = {(physics.state.Q_dc - physics.state.Q_ac).toFixed(2)} J | I_eff = {physics.state.I_eff.toFixed(3)} A | 误差 {Math.abs((Idc - physics.state.I_eff) / Math.max(physics.state.I_eff, 0.01) * 100).toFixed(1)}%
        </text>
        <text
          x={DESIGN_WIDTH / 2}
          y={LAYOUT.chamberY + LAYOUT.chamberH + pad + font(22)}
          fontSize={font(8)}
          textAnchor="middle"
          fill={CANVAS_COLORS.trackHistory}
          opacity={0.55}
        >
          注：动画为降频可视化模型，微观运动空间与时间尺度已做放大处理。
        </text>
      </svg>
    </div>
  )
}
