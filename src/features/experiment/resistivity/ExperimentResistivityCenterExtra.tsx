import React, { useMemo } from 'react'
import { Card } from '@/components/UI'
import { RelationChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { useExperimentResistivityPhysics } from './hooks/useExperimentResistivityPhysics'

export const ExperimentResistivityCenterExtra: React.FC = () => {
  const params = useAnimationStore((s) => s.params)

  const L = params.L ?? 0.5
  const d_mm = params.d_mm ?? 0.6
  const wiring = params.wiring ?? 0
  const R_slider = params.R_slider ?? 20
  const showTheoretical = (params.showTheoretical ?? 1) === 1

  const physics = useExperimentResistivityPhysics({
    L,
    d_mm,
    wiring,
    R_slider,
    showTheoretical,
  })

  // 1. 拟合曲线序列（X: 长度 L 从 0 到 0.8m，Y: 电阻 R）
  // 测量曲线（当前电路接法实测拟合）
  const measPoints = useMemo(() => {
    const pts = []
    for (let l = 0; l <= 0.8; l += 0.1) {
      const rx_ideal = (physics.rho_real * l) / ((Math.PI * physics.d_m * physics.d_m) / 4)
      const r_val =
        physics.wiring === 0
          ? (rx_ideal * physics.RV) / (rx_ideal + physics.RV)
          : rx_ideal + physics.RA
      pts.push({ x: l, y: r_val })
    }
    return pts
  }, [physics.rho_real, physics.d_m, physics.wiring, physics.RV, physics.RA])

  // 真实曲线（理想无电表误差）
  const realPoints = useMemo(() => {
    const pts = []
    for (let l = 0; l <= 0.8; l += 0.1) {
      const rx_ideal = (physics.rho_real * l) / ((Math.PI * physics.d_m * physics.d_m) / 4)
      pts.push({ x: l, y: rx_ideal })
    }
    return pts
  }, [physics.rho_real, physics.d_m])

  // 曲线配置
  const additionalSeries = useMemo(() => {
    const seriesList = []
    if (showTheoretical) {
      seriesList.push({
        points: realPoints,
        label: '真实 R-L 理论线 (无表阻误差)',
        color: CANVAS_COLORS.textMuted,
        strokeWidth: 1.5,
        strokeDasharray: [4, 4],
      })
    }
    return seriesList
  }, [showTheoretical, realPoints])

  // 2. 当前测量点标记
  const markers = useMemo(() => {
    return [
      {
        x: physics.L,
        y: physics.Rx_meas,
        label: `当前测量点 (L=${physics.L.toFixed(2)}m, R=${physics.Rx_meas.toFixed(2)}Ω)`,
        color: PHYSICS_COLORS.acceleration,
      },
    ]
  }, [physics.L, physics.Rx_meas])

  return (
    <Card className="p-3 my-2 border border-slate-200">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        {/* 左侧：R-L 图像 */}
        <div className="w-full md:w-3/5 h-64">
          <RelationChart
            title="数据分析屏：R - L 线性关系与斜率拟合"
            xLabel="金属丝有效长度 L (m)"
            yLabel="电阻测量值 R (Ω)"
            xDomain={[0, 0.85]}
            yDomain={[0, Math.ceil(physics.Rx_meas * 1.5) || 5]}
            points={measPoints}
            color={PHYSICS_COLORS.velocity}
            additionalSeries={additionalSeries}
            markers={markers}
            cursorX={physics.L}
          />
        </div>

        {/* 右侧：斜率与电阻率归因卡片 */}
        <div className="w-full md:w-2/5 flex flex-col gap-2 text-xs">
          <div className="p-2.5 rounded bg-blue-50 border border-blue-200">
            <div className="font-bold text-blue-900 mb-1">
              📈 图像斜率求电阻率（消除零点误差）
            </div>
            <div className="text-slate-700">
              拟合斜率: <span className="font-semibold text-blue-700">k = ΔR/ΔL = {physics.k_meas.toFixed(3)} Ω/m</span>
            </div>
            <div className="text-slate-700 mt-0.5">
              反推电阻率: <span className="font-bold text-blue-800">ρ = k·π·d²/4 = {(physics.rho_from_slope * 1e6).toFixed(3)} × 10⁻⁶ Ω·m</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-amber-50 border border-amber-200">
            <div className="font-bold text-amber-900 mb-1">
              ⚖️ 系统误差与电路选择决策
            </div>
            <div className="text-slate-700">
              {physics.wiring === 0 ? (
                <>
                  <span className="font-semibold text-emerald-700">【外接法】：</span>
                  电压表分流致测得电流偏大，电阻测量值偏小（R_测 &lt; R_真）。
                  因金属丝电阻一般仅数欧姆，远小于电压表内阻（{physics.RV}Ω），故外接法系统误差极小，为高考推荐接法！
                </>
              ) : (
                <>
                  <span className="font-semibold text-rose-700">【内接法】：</span>
                  电流表分压致电压读数偏大（R_测 = Rx + RA）。
                  纵轴截距即为电流表内阻（R_A = {physics.RA}Ω）。若用单点数据算 ρ 会严重偏大；但由斜率 k 反推可消除该系统截距误差！
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default ExperimentResistivityCenterExtra
