/**
 * ACValues.tsx — 有效值与峰值关系（[M4-1]）
 *
 * 核心功能：双轨对比实验舱 SVG（正弦交流电 vs 恒定直流电）
 *  - 使用 AnimationPage 提供的 time 同步动画
 *  - 波形随时间滚动，电子运动，能量柱实时更新
 *  - 播放/暂停/速度由底部 AnimationControls 提供
 *  - 所有布局基于容器尺寸动态计算，禁止硬编码像素
 *
 * @agent-rule 纯内容组件，不实现左右面板（由 AnimationPage 提供）
 * @agent-rule 使用 SVG（教学图解优先），禁止 Canvas
 * @agent-rule 所有颜色从 @/theme 引用，禁止硬编码
 * @agent-rule 所有布局基于容器尺寸动态计算，禁止硬编码像素值
 */
import { useRef, useState, useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { colors } from '@/theme/colors'
import {
  PHYSICS_COLORS,
  CANVAS_STYLE,
  ENERGY_BAR_COLORS,
} from '@/theme/physics'

interface Particle {
  id: number
  phase: number
}

const R_VALUE = 100

const LAYOUT_RATIOS = {
  margin: 0.01,
  gap: 0.008,
  waveform: 0.32,
  circuit: 0.28,
  energyBar: 0.32,
  waveformPad: 0.06,
  barWidth: 0.10,
  barPad: 0.04,
} as const

export default function ACValues() {
    const {params, speed, time, isPlaying} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    speed: s.speed,
    time: s.time,
    isPlaying: s.isPlaying,
    }))
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 600, height: 500 })

  const V_peak = params.V_peak ?? 311
  const f = params.f ?? 2
  const U_dc = params.U_dc ?? 220

  const omega = 2 * Math.PI * f
  const T = 1 / f
  const V_rms = V_peak / Math.sqrt(2)

  const Q_acRef = useRef(0)
  const Q_dcRef = useRef(0)

  const acParticlesRef = useRef<Particle[]>(
    Array.from({ length: 6 }, (_, i) => ({ id: i, phase: (i / 6) * Math.PI * 2 }))
  )
  const dcParticlesRef = useRef<Particle[]>(
    Array.from({ length: 6 }, (_, i) => ({ id: i, phase: (i / 6) * 1.0 }))
  )

  const t = time ?? 0

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateSize = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(el)
    window.addEventListener('resize', updateSize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [])

  useEffect(() => {
    if (!isPlaying) return
    const dt = (1 / 60) * (speed ?? 1)
    const u_ac = V_peak * Math.sin(omega * t)
    Q_acRef.current += ((u_ac * u_ac) / R_VALUE) * dt
    Q_dcRef.current += ((U_dc * U_dc) / R_VALUE) * dt
  }, [isPlaying, t, speed, V_peak, omega, U_dc])

  useEffect(() => {
    Q_acRef.current = 0
    Q_dcRef.current = 0
  }, [V_peak, f, U_dc])

  const layout = useMemo(() => {
    const W = containerSize.width
    const H = containerSize.height
    const m = Math.min(W, H) * LAYOUT_RATIOS.margin
    const halfW = W / 2
    const gap = W * LAYOUT_RATIOS.gap

    const waveformH = H * LAYOUT_RATIOS.waveform
    const circuitH = H * LAYOUT_RATIOS.circuit
    const energyBarH = H * LAYOUT_RATIOS.energyBar

    const waveformY = m
    const circuitY = waveformY + waveformH + gap
    const energyBarY = circuitY + circuitH + gap

    const wfPadX = halfW * LAYOUT_RATIOS.waveformPad
    const wfPadY = waveformH * LAYOUT_RATIOS.waveformPad

    const barW = halfW * LAYOUT_RATIOS.barWidth
    const barH = energyBarH * 0.72
    const barPad = halfW * LAYOUT_RATIOS.barPad

    return {
      W, H, m, halfW, gap,
      waveformY, waveformH, circuitY, circuitH, energyBarY, energyBarH,
      wfPadX, wfPadY,
      barW, barH, barPad,
    }
  }, [containerSize])

  const renderWaveform = (x: number, w: number, type: 'ac' | 'dc') => {
    const chartX = x + layout.wfPadX
    const chartY = layout.waveformY + layout.wfPadY
    const chartW = w - layout.wfPadX * 2
    const chartH = layout.waveformH - layout.wfPadY * 2
    const toY = (u: number) => chartY + chartH / 2 - (u / (V_peak * 1.2)) * (chartH / 2)

    return (
      <g>
        <rect x={chartX - 4} y={chartY - 4} width={chartW + 8} height={chartH + 8} fill={colors.neutral.white} stroke={colors.neutral[200]} strokeWidth={CANVAS_STYLE.stroke.grid} rx={Math.min(chartW, chartH) * 0.03} />
        <line x1={chartX} y1={toY(0)} x2={chartX + chartW} y2={toY(0)} stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid} strokeDasharray={CANVAS_STYLE.dash.guide.join(' ')} />
        <line x1={chartX} y1={chartY + chartH} x2={chartX + chartW} y2={chartY + chartH} stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.axis} />
        <line x1={chartX} y1={chartY} x2={chartX} y2={chartY + chartH} stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.axis} />

        {type === 'ac' ? (
          <>
            <path
              d={(() => {
                const pts: string[] = []
                for (let i = 0; i <= 100; i++) {
                  const ti = t - 2 * T + (2 * T * i) / 100
                  const u = V_peak * Math.sin(omega * ti)
                  const px = chartX + (i / 100) * chartW
                  const py = toY(u)
                  pts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`)
                }
                return pts.join(' ')
              })()}
              fill="none" stroke={PHYSICS_COLORS.electricField} strokeWidth={Math.max(1.5, chartH * 0.02)} strokeLinecap="round"
            />
            <circle cx={chartX + chartW} cy={toY(V_peak * Math.sin(omega * t))} r={Math.max(4, chartH * 0.05)} fill={colors.neutral.white} stroke={PHYSICS_COLORS.electricField} strokeWidth={Math.max(2, chartH * 0.025)} />
            <line x1={chartX} y1={toY(V_rms)} x2={chartX + chartW} y2={toY(V_rms)} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray={CANVAS_STYLE.dash.reference.join(' ')} />
            <text x={chartX + chartW + chartW * 0.02} y={toY(V_rms) + chartH * 0.04} fontSize={Math.max(10, chartH * 0.1)} fill={PHYSICS_COLORS.trackHistory}>U_rms</text>
          </>
        ) : (
          <>
            <line x1={chartX} y1={toY(U_dc)} x2={chartX + chartW} y2={toY(U_dc)} stroke={PHYSICS_COLORS.velocity} strokeWidth={Math.max(1.5, chartH * 0.02)} strokeDasharray={CANVAS_STYLE.dash.reference.join(' ')} />
            <circle cx={chartX + chartW / 2} cy={toY(U_dc)} r={Math.max(4, chartH * 0.05)} fill={colors.neutral.white} stroke={PHYSICS_COLORS.velocity} strokeWidth={Math.max(2, chartH * 0.025)} />
            <text x={chartX + chartW + chartW * 0.02} y={toY(U_dc) + chartH * 0.04} fontSize={Math.max(10, chartH * 0.1)} fill={PHYSICS_COLORS.velocity}>U_dc</text>
            {Math.abs(U_dc - V_rms) > 5 && (
              <line x1={chartX} y1={toY(V_rms)} x2={chartX + chartW} y2={toY(V_rms)} stroke={colors.success[500]} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray={CANVAS_STYLE.dash.guide.join(' ')} opacity={0.5} />
            )}
          </>
        )}
        <text x={chartX - chartW * 0.015} y={chartY + chartH * 0.12} fontSize={Math.max(10, chartH * 0.1)} textAnchor="end" fill={PHYSICS_COLORS.labelText}>{V_peak}V</text>
        <text x={chartX - chartW * 0.015} y={chartY + chartH - chartH * 0.05} fontSize={Math.max(10, chartH * 0.1)} textAnchor="end" fill={PHYSICS_COLORS.labelText}>-{V_peak}V</text>
      </g>
    )
  }

  const renderCircuit = (x: number, w: number, type: 'ac' | 'dc') => {
    const centerX = x + w / 2
    const centerY = layout.circuitY + layout.circuitH / 2
    const circuitW = w * 0.75
    const circuitH = layout.circuitH * 0.72
    const circLeft = centerX - circuitW / 2
    const circTop = centerY - circuitH / 2
    const particles = type === 'ac' ? acParticlesRef.current : dcParticlesRef.current
    const particleR = Math.max(3, circuitH * 0.08)

    return (
      <g>
        <rect x={circLeft} y={circTop} width={circuitW} height={circuitH} fill="none" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} rx={Math.min(circuitW, circuitH) * 0.05} />
        {type === 'ac' ? (
          <g transform={`translate(${circLeft}, ${centerY})`}>
            <circle r={circuitH * 0.18} fill={colors.neutral.white} stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={Math.max(1.5, circuitH * 0.03)} />
            <path d={`M ${-circuitH * 0.1} 0 Q ${-circuitH * 0.05} ${-circuitH * 0.06} 0 0 Q ${circuitH * 0.05} ${circuitH * 0.06} ${circuitH * 0.1} 0`} fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={Math.max(1.5, circuitH * 0.03)} />
          </g>
        ) : (
          <g transform={`translate(${circLeft}, ${centerY})`}>
            <line x1={-circuitH * 0.1} y1={-circuitH * 0.06} x2={-circuitH * 0.1} y2={circuitH * 0.06} stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={Math.max(2, circuitH * 0.04)} />
            <line x1={circuitH * 0.1} y1={-circuitH * 0.03} x2={circuitH * 0.1} y2={circuitH * 0.03} stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={Math.max(2, circuitH * 0.04)} />
            <line x1={-circuitH * 0.1} y1={0} x2={circuitH * 0.1} y2={0} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={Math.max(1, circuitH * 0.015)} />
          </g>
        )}
        <g transform={`translate(${centerX - circuitW * 0.07}, ${centerY})`}>
          <rect x={-circuitW * 0.04} y={-circuitH * 0.2} width={circuitW * 0.15} height={circuitH * 0.4} fill={PHYSICS_COLORS.objectFill} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} rx={Math.min(circuitW, circuitH) * 0.03} />
          <path d={`M 0 0 L ${circuitW * 0.02} ${-circuitH * 0.08} L ${circuitW * 0.05} ${circuitH * 0.08} L ${circuitW * 0.08} ${-circuitH * 0.08} L ${circuitW * 0.11} ${circuitH * 0.08} L ${circuitW * 0.14} ${-circuitH * 0.08} L ${circuitW * 0.17} ${circuitH * 0.08} L ${circuitW * 0.2} 0`} fill="none" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        </g>
        {particles.map((p) => {
          let px: number
          let brightness: number
          if (type === 'ac') {
            const phase = omega * t + p.phase
            const nPos = Math.sin(phase)
            px = circLeft + circuitW * 0.15 + circuitW * 0.7 * ((nPos + 1) / 2)
            brightness = 0.3 + 0.7 * Math.abs(Math.cos(phase))
          } else {
            const sr = 30
            const pos = ((t * sr + p.phase * 50) % (circuitW * 0.7) + circuitW * 0.7) % (circuitW * 0.7)
            px = circLeft + circuitW * 0.15 + pos
            brightness = 1.0
          }
          return (
            <g key={p.id}>
              <circle cx={px} cy={circTop + circuitH * 0.12} r={particleR + brightness * particleR * 0.5} fill={PHYSICS_COLORS.negativeCharge} opacity={brightness * 0.15} />
              <circle cx={px} cy={circTop + circuitH * 0.12} r={particleR} fill={PHYSICS_COLORS.negativeCharge} opacity={brightness} />
            </g>
          )
        })}
        <text x={centerX} y={centerY - circuitH * 0.48} fontSize={Math.max(11, circuitH * 0.14)} textAnchor="middle" fill={PHYSICS_COLORS.labelText}>R = {R_VALUE}Ω</text>
        <text x={centerX} y={circTop - circuitH * 0.15} fontSize={Math.max(12, circuitH * 0.16)} fontWeight="bold" textAnchor="middle" fill={PHYSICS_COLORS.labelText}>{type === 'ac' ? '正弦交流电' : '恒定直流电'}</text>
      </g>
    )
  }

  const renderEnergyBar = (x: number, w: number, type: 'ac' | 'dc') => {
    const barX = x + w / 2 - layout.barW / 2
    const barY = layout.energyBarY + layout.energyBarH * 0.08
    const barH = layout.barH
    const Q = type === 'ac' ? Q_acRef.current : Q_dcRef.current
    const maxQ = (V_peak * V_peak / (2 * R_VALUE)) * T * 1.3
    const heightRatio = Math.min(1, Q / (maxQ || 1))
    const height = heightRatio * barH
    const fillColor = type === 'ac' ? ENERGY_BAR_COLORS.heat : PHYSICS_COLORS.electricCurrent

    return (
      <g>
        <text x={x + w / 2} y={barY - layout.energyBarH * 0.04} fontSize={Math.max(11, layout.energyBarH * 0.08)} textAnchor="middle" fill={PHYSICS_COLORS.labelText}>{type === 'ac' ? 'Q_ac' : 'Q_dc'}</text>
        <rect x={barX} y={barY} width={layout.barW} height={barH} fill={colors.neutral[100]} stroke={colors.neutral[300]} strokeWidth={CANVAS_STYLE.stroke.grid} rx={Math.min(layout.barW, barH) * 0.04} />
        <rect x={barX} y={barY + barH - height} width={layout.barW} height={height} fill={fillColor} rx={Math.min(layout.barW, barH) * 0.04} opacity={0.85} />
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line x1={barX + layout.barW + layout.barPad} y1={barY + barH - ratio * barH} x2={barX + layout.barW + layout.barPad * 2} y2={barY + barH - ratio * barH} stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
            <text x={barX + layout.barW + layout.barPad * 2.5} y={barY + barH - ratio * barH + layout.energyBarH * 0.025} fontSize={Math.max(9, layout.energyBarH * 0.06)} fill={PHYSICS_COLORS.labelText}>{ratio * 100}%</text>
          </g>
        ))}
        <text x={x + w / 2} y={barY + barH + layout.energyBarH * 0.1} fontSize={Math.max(10, layout.energyBarH * 0.07)} textAnchor="middle" fill={PHYSICS_COLORS.labelText}>{Q.toFixed(1)} J</text>
      </g>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width="100%" height="100%" viewBox={`0 0 ${layout.W} ${layout.H}`} preserveAspectRatio="xMidYMid meet">
        <rect x={layout.m} y={layout.m} width={layout.halfW - layout.m * 2} height={layout.H - layout.m * 2} fill={colors.primary[50]} stroke={colors.neutral[200]} strokeWidth={CANVAS_STYLE.stroke.grid} rx={Math.min(layout.halfW, layout.H) * 0.015} />
        {renderWaveform(layout.m, layout.halfW - layout.m * 2, 'ac')}
        {renderCircuit(layout.m, layout.halfW - layout.m * 2, 'ac')}
        {renderEnergyBar(layout.m, layout.halfW - layout.m * 2, 'ac')}

        <line x1={layout.halfW} y1={0} x2={layout.halfW} y2={layout.H} stroke={colors.neutral[200]} strokeWidth={Math.max(1, layout.W * 0.003)} />

        <rect x={layout.halfW + layout.m} y={layout.m} width={layout.halfW - layout.m * 2} height={layout.H - layout.m * 2} fill={colors.secondary[50]} stroke={colors.neutral[200]} strokeWidth={CANVAS_STYLE.stroke.grid} rx={Math.min(layout.halfW, layout.H) * 0.015} />
        {renderWaveform(layout.halfW + layout.m, layout.halfW - layout.m * 2, 'dc')}
        {renderCircuit(layout.halfW + layout.m, layout.halfW - layout.m * 2, 'dc')}
        {renderEnergyBar(layout.halfW + layout.m, layout.halfW - layout.m * 2, 'dc')}

        <text x={layout.W / 2} y={layout.H - layout.m * 0.3} fontSize={Math.max(9, layout.H * 0.016)} textAnchor="middle" fill={colors.neutral[400]}>U_rms = {V_rms.toFixed(1)}V | 误差 {Math.abs((U_dc - V_rms) / V_rms * 100).toFixed(1)}%</text>
      </svg>
    </div>
  )
}
