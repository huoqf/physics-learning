import { FC, useState, useEffect, useMemo } from 'react'
import { RelationChart } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'
import { useAnimationStore } from '@/stores'
import { Card } from '@/components/UI'
import { calculateMeterExpansion } from '@/physics'

const OHM_CHART_DOMAIN = {
  uMax: 10,
  iMax: 2,
} as const

export const OhmLawCenterExtra: FC = () => {
  const params = useAnimationStore((s) => s.params)

  const mode = params.mode ?? 0 // 0=伏安特性, 1=改装电压表, 2=改装电流表
  const meterMode = params.meterMode ?? 0 // 0=定值电阻, 1=小灯泡
  const U = params.U ?? 2
  const R = params.R ?? 10
  const Rs = params.Rs ?? 1400
  const Rp = params.Rp ?? 0.5
  const Rg = params.Rg ?? 100
  const Ig = params.Ig ?? 0.001

  // === 模式0：伏安特性历史打点逻辑 ===
  const [history, setHistory] = useState<{ u: number; i: number }[]>([])

  useEffect(() => {
    setHistory([])
  }, [mode, R, meterMode])

  const currentI = useMemo(() => {
    if (meterMode === 0) {
      return R > 0 ? U / R : 0
    }
    const R_eff = 5 + 2 * U
    return R_eff > 0 ? U / R_eff : 0
  }, [U, R, meterMode])

  useEffect(() => {
    if (mode !== 0) return
    setHistory((prev) => {
      const hasOrigin = prev.some((p) => p.u === 0)
      const base = hasOrigin ? prev : [{ u: 0, i: 0 }, ...prev]
      const threshold = 0.15
      const isClose = base.some((p) => Math.abs(p.u - U) < threshold)

      if (isClose) {
        const filtered = base.filter((p) => Math.abs(p.u - U) >= threshold)
        return [...filtered, { u: U, i: currentI }].sort((a, b) => a.u - b.u)
      }
      return [...base, { u: U, i: currentI }].sort((a, b) => a.u - b.u)
    })
  }, [U, currentI, mode])

  const referencePoints = useMemo(() => {
    const points: { x: number; y: number }[] = []
    const steps = 80
    for (let step = 0; step <= steps; step++) {
      const uVal = (step / steps) * OHM_CHART_DOMAIN.uMax
      const iVal = meterMode === 0
        ? (R > 0 ? uVal / R : 0)
        : uVal / (5 + 2 * uVal)
      points.push({ x: uVal, y: iVal })
    }
    return points
  }, [meterMode, R])

  const historyPoints = useMemo(
    () => history.map((p) => ({ x: p.u, y: p.i })),
    [history]
  )

  // === 模式1与模式2的比例尺数据 ===
  const { barData, totalVal, label } = useMemo(() => {
    if (mode === 1) {
      const res = calculateMeterExpansion(1, U, Rg, Ig, Rs, Rp)
      const Ug = res.I_g_meas * Rg
      const Us = res.I_g_meas * Rs
      return {
        label: '电压分担比例 (U = Ug + Us)',
        totalVal: U,
        barData: [
          { name: `表头分压 Ug = ${Ug.toFixed(3)} V`, val: Ug, color: PHYSICS_COLORS.electricPotential },
          { name: `分压电阻分压 Us = ${Us.toFixed(3)} V`, val: Us, color: PHYSICS_COLORS.appliedForce }
        ]
      }
    } else if (mode === 2) {
      const res = calculateMeterExpansion(2, U, Rg, Ig, Rs, Rp)
      const Ig_meas = res.I_g_meas
      const Ip = U - Ig_meas
      return {
        label: '电流分流比例 (I = Ig + Ip)',
        totalVal: U,
        barData: [
          { name: `表头分流 Ig' = ${(Ig_meas * 1000).toFixed(1)} mA`, val: Ig_meas, color: PHYSICS_COLORS.electricCurrent },
          { name: `分流电阻分流 Ip = ${Ip.toFixed(3)} A`, val: Ip, color: PHYSICS_COLORS.appliedForce }
        ]
      }
    }
    return { barData: [], totalVal: 0, label: '' }
  }, [mode, U, Rg, Ig, Rs, Rp])

  return (
    <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50">
      <Card className="flex-1 p-3 flex items-center justify-center min-w-0 relative">
        <div className="w-full h-full min-h-0">
          {mode === 0 ? (
            <RelationChart
              title={meterMode === 0 ? `U-I 特性曲线（定值电阻 R = ${R} Ω）` : 'U-I 特性曲线（非线性小灯泡）'}
              xLabel="U (V)"
              yLabel="I (A)"
              points={referencePoints}
              additionalSeries={historyPoints.length >= 2 ? [{
                points: historyPoints,
                label: '扫掠轨迹',
                color: PHYSICS_COLORS.electricCurrent,
                strokeWidth: 2,
              }] : undefined}
              xDomain={[0, OHM_CHART_DOMAIN.uMax]}
              yDomain={[0, OHM_CHART_DOMAIN.iMax]}
              color={PHYSICS_COLORS.axis}
              strokeWidth={1.4}
              cursorX={U}
              cursorLabel={(u, i) => `(${u.toFixed(1)}V, ${i.toFixed(2)}A)`}
              markers={historyPoints.map((p) => ({
                axis: 'point' as const,
                x: p.x,
                y: p.y,
                color: PHYSICS_COLORS.electricCurrent,
              }))}
            />
          ) : (
            <div className="w-full h-full flex flex-col justify-center px-6">
              <span className="text-xs font-semibold text-neutral-600 mb-3">{label}</span>
              {totalVal > 0 ? (
                <div className="w-full flex h-8 rounded-lg overflow-hidden border border-neutral-200 shadow-inner">
                  {barData.map((bar, idx) => {
                    const pct = (bar.val / totalVal) * 100
                    if (pct <= 0) return null
                    return (
                      <div
                        key={idx}
                        style={{ width: `${pct}%`, backgroundColor: bar.color }}
                        className="h-full flex items-center justify-center text-[10px] text-white font-semibold transition-all duration-300"
                        title={bar.name}
                      >
                        {pct > 12 ? bar.name : ''}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="w-full h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">
                  当前输入值为 0
                </div>
              )}
              {mode === 1 ? (
                <div className="flex justify-between mt-3 text-[10px] text-neutral-500">
                  <span>表头分压比例: {totalVal > 0 ? ((barData[0].val / totalVal) * 100).toFixed(1) : 0}%</span>
                  <span>分压电阻分压比例: {totalVal > 0 ? ((barData[1].val / totalVal) * 100).toFixed(1) : 0}%</span>
                </div>
              ) : (
                <div className="flex justify-between mt-3 text-[10px] text-neutral-500">
                  <span>表头分流比例: {totalVal > 0 ? ((barData[0].val / totalVal) * 100).toFixed(2) : 0}%</span>
                  <span>分流电阻分流比例: {totalVal > 0 ? ((barData[1].val / totalVal) * 100).toFixed(2) : 0}%</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default OhmLawCenterExtra
