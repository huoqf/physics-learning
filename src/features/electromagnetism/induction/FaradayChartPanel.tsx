/**
 * FaradayChartPanel.tsx — 法拉第电磁感应实时数据看板（Φ-t / E-t 双图表）
 *
 * 右侧图表区域迁移到通用 VelocityTimeChart 预设：
 * - Φ-t：磁通量随时间变化，保留当前时刻游标
 * - E-t：感应电动势随时间变化，保留 E=0 特殊提示
 */
import { useMemo } from 'react'
import { PHYSICS_COLORS, CHART_COLORS, FONT } from '@/theme/physics'
import { ChartCursor, VelocityTimeChart, useChartContext } from '@/components/Chart'
import type { FaradayChartPoint } from '@/physics/electromagnetism'

const FARADAY_CHART_DURATION = 10

interface Props {
  mode: number
  chartPoints: FaradayChartPoint[]
  currentState: { x: number; phi: number; emf: number; B: number }
  dashLeft: number
  dashRight: number
  dashW: number
  H: number
  chartPadTop: number
  chartH: number
  yPhiMid: number
  yEmfMid: number
  chartHalfH: number
  phiMinVal: number
  phiMaxVal: number
  maxEmfVal: number
  emfIsZero: boolean
  toPhiY: (phi: number) => number
  yPhiZero: number
  toChartX: (t: number) => number
  toEmfY: (emf: number) => number
  phiPathD: string
  emfPathD: string
  indicatorX: number
  tNow: number
  font: (base: number) => number
}

function paddedDomain(min: number, max: number, fallbackSpan = 1): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [-fallbackSpan, fallbackSpan]
  if (Math.abs(max - min) < 1e-9) {
    const span = Math.max(Math.abs(max), fallbackSpan)
    return [min - span, max + span]
  }
  const pad = (max - min) * 0.12
  return [min - pad, max + pad]
}

function symmetricDomain(absMax: number, fallback = 1): [number, number] {
  const m = Math.max(Math.abs(absMax), fallback)
  return [-m * 1.12, m * 1.12]
}

function FaradayCursor({
  t,
  y,
  label,
  unit,
  series = 'primary',
  digits,
}: {
  t: number
  y: number
  label: string
  unit: string
  series?: 'primary' | 'secondary' | 'accent' | 'warm' | 'success'
  digits: number
}) {
  return (
    <ChartCursor
      x={t}
      dataPoints={[{ y, label, series }]}
      formatValue={(v) => `${v.toFixed(digits)} ${unit}`}
    />
  )
}

function ZeroEmfNote() {
  const ctx = useChartContext()
  if (!ctx) return null
  return (
    <text
      x={ctx.plotOrigin.x + ctx.plotSize.width / 2}
      y={ctx.plotOrigin.y + ctx.font(FONT.small) + 4}
      fontSize={ctx.font(FONT.small)}
      fill={CHART_COLORS.compareC}
      textAnchor="middle"
      fontWeight="bold"
      opacity={0.9}
    >
      E = 0（k = 0，磁场恒定，无感应电动势）
    </text>
  )
}

function TimeBadge({ t, font }: { t: number; font: (base: number) => number }) {
  return (
    <div
      style={{
        fontSize: font(FONT.subtickSize),
        lineHeight: '16px',
        color: PHYSICS_COLORS.labelTextLight,
        textAlign: 'center',
        fontWeight: 600,
      }}
    >
      实时数据看板 · t = {t.toFixed(2)} s · 0 ~ {FARADAY_CHART_DURATION}s
    </div>
  )
}

export function FaradayChartPanel({
  mode,
  chartPoints,
  currentState,
  dashLeft,
  dashW,
  H,
  chartPadTop,
  phiMinVal,
  phiMaxVal,
  maxEmfVal,
  emfIsZero,
  tNow,
  font,
}: Props) {
  const phiSeries = useMemo(
    () => chartPoints.map((p) => ({ t: p.t, v: p.phi })),
    [chartPoints],
  )

  const emfSeries = useMemo(
    () => chartPoints.map((p) => ({ t: p.t, v: p.emf })),
    [chartPoints],
  )

  const phiRange = useMemo((): [number, number] => {
    if (mode === 0) {
      const absMax = Math.max(
        Math.abs(phiMinVal),
        Math.abs(phiMaxVal),
        Math.abs(currentState.phi),
        0.05,
      )
      return symmetricDomain(absMax, 0.05)
    }
    return paddedDomain(
      Math.min(0, phiMinVal, currentState.phi),
      Math.max(0, phiMaxVal, currentState.phi),
      0.05,
    )
  }, [mode, phiMinVal, phiMaxVal, currentState.phi])

  const emfRange = useMemo((): [number, number] => {
    const absMax = Math.max(maxEmfVal, Math.abs(currentState.emf), emfIsZero ? 1 : 0.1)
    return symmetricDomain(absMax, emfIsZero ? 1 : 0.1)
  }, [maxEmfVal, currentState.emf, emfIsZero])

  const panelY = Math.max(0, chartPadTop - 18)
  const panelH = Math.max(120, H - panelY - 4)

  return (
    <div
      className="absolute"
      style={{
        left: dashLeft,
        top: panelY,
        width: dashW,
        height: panelH,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        boxSizing: 'border-box',
        padding: '0 2px 2px 2px',
        background: 'transparent',
      }}
    >
      <TimeBadge t={tNow} font={font} />

      <div style={{ flex: 1, minHeight: 0 }}>
        <VelocityTimeChart
          points={phiSeries}
          domainPoints={phiSeries}
          currentTime={tNow}
          tMax={FARADAY_CHART_DURATION}
          tDomain={[0, FARADAY_CHART_DURATION]}
          vRange={phiRange}
          title="Φ − t 图（磁通量）"
          xLabel="t/s"
          yLabel="Φ/Wb"
          showCursor={false}
          showArea={false}
          series="primary"
          className="w-full h-full"
        >
          <FaradayCursor
            t={tNow}
            y={currentState.phi}
            label="Φ"
            unit="Wb"
            digits={3}
            series="primary"
          />
        </VelocityTimeChart>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <VelocityTimeChart
          points={emfSeries}
          domainPoints={emfSeries}
          currentTime={tNow}
          tMax={FARADAY_CHART_DURATION}
          tDomain={[0, FARADAY_CHART_DURATION]}
          vRange={emfRange}
          title="E − t 图（感应电动势）"
          xLabel="t/s"
          yLabel="E/V"
          showCursor={false}
          showArea={false}
          series="warm"
          className="w-full h-full"
        >
          {emfIsZero && <ZeroEmfNote />}
          <FaradayCursor
            t={tNow}
            y={currentState.emf}
            label="E"
            unit="V"
            digits={2}
            series="warm"
          />
        </VelocityTimeChart>
      </div>
    </div>
  )
}
