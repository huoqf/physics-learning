import { FC, useMemo } from 'react'
import { RelationChart, type RelationMarker } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { useExperimentResistivityPhysics } from './hooks/useExperimentResistivityPhysics'

export const ExperimentResistivityCenterExtra: FC = () => {
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

  // 1. 实测拟合曲线数据（X: 0 ~ 0.85m）
  const measPoints = useMemo(() => {
    const pts = []
    for (let l = 0; l <= 0.85; l += 0.05) {
      const rx_ideal = (physics.rho_real * l) / ((Math.PI * physics.d_m * physics.d_m) / 4)
      const r_val =
        physics.wiring === 0
          ? (rx_ideal * physics.RV) / (rx_ideal + physics.RV)
          : rx_ideal + physics.RA
      pts.push({ x: l, y: r_val })
    }
    return pts
  }, [physics.rho_real, physics.d_m, physics.wiring, physics.RV, physics.RA])

  // 2. 真实理论曲线数据
  const realPoints = useMemo(() => {
    const pts = []
    for (let l = 0; l <= 0.85; l += 0.05) {
      const rx_ideal = (physics.rho_real * l) / ((Math.PI * physics.d_m * physics.d_m) / 4)
      pts.push({ x: l, y: rx_ideal })
    }
    return pts
  }, [physics.rho_real, physics.d_m])

  // 3. 辅助参考曲线（真实理论线）
  const additionalSeries = useMemo(() => {
    const list = []
    if (showTheoretical) {
      list.push({
        points: realPoints,
        label: '真实理论线 (无表阻误差)',
        color: CANVAS_COLORS.textMuted,
        strokeWidth: 1.5,
        strokeDasharray: [4, 4],
      })
    }
    return list
  }, [showTheoretical, realPoints])

  // 4. 当前测量点标记
  const markers = useMemo((): RelationMarker[] => {
    return [
      {
        x: physics.L,
        y: physics.Rx_meas,
        label: `测点 (L=${physics.L.toFixed(2)}m, R=${physics.Rx_meas.toFixed(2)}Ω)`,
        color: PHYSICS_COLORS.acceleration,
      },
    ]
  }, [physics.L, physics.Rx_meas])

  return (
    <div className="w-full h-full p-2 bg-slate-50 select-none">
      <div className="w-full h-full flex flex-col md:flex-row gap-2">
        {/* 左侧：R-L 关系图表（标题剥离至HTML，彻底防止与Y刻度重叠） */}
        <div className="flex-1 min-h-0 bg-white rounded-xl p-2.5 shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-1 px-1 border-b border-slate-100">
            <span className="font-bold text-slate-800 text-sm">
              数据分析：R - L 线性关系与斜率拟合
            </span>
            <span className="text-xs text-slate-500 font-mono">
              k = ΔR/ΔL = {physics.k_meas.toFixed(3)} Ω/m
            </span>
          </div>

          <div className="flex-1 min-h-0 w-full pt-1">
            <RelationChart
              xLabel="金属丝有效长度 L (m)"
              yLabel="电阻测量值 R (Ω)"
              xDomain={[0, 0.85]}
              yDomain={[0, Math.max(2.5, Math.ceil(physics.Rx_meas * 1.35 * 2) / 2)]}
              points={measPoints}
              mainLabel={physics.wiring === 0 ? '外接法拟合线' : '内接法拟合线 (截距=RA)'}
              color={PHYSICS_COLORS.emf}
              additionalSeries={additionalSeries}
              markers={markers}
              cursorX={physics.L}
            />
          </div>
        </div>

        {/* 右侧：实验数据看板与高考归因卡片 */}
        <div className="w-full md:w-80 shrink-0 bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex flex-col justify-between text-xs">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between border-b pb-1.5 border-slate-100">
              <span className="font-bold text-slate-800 text-sm">实验数据与反推看板</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  physics.wiring === 0
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {physics.wiring === 0 ? '外接法 (推荐测小阻)' : '内接法 (电流表分压)'}
              </span>
            </div>

            {/* 拟合斜率 */}
            <div className="p-2.5 rounded-lg bg-sky-50/70 border border-sky-200/80">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>拟合斜率 k = ΔR / ΔL</span>
                <span className="text-[10px] text-sky-600 font-mono">4ρ / (πd²)</span>
              </div>
              <div className="text-base font-bold text-sky-900 font-mono mt-0.5">
                {physics.k_meas.toFixed(3)} <span className="text-xs font-normal text-slate-600">Ω/m</span>
              </div>
            </div>

            {/* 反推电阻率 */}
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>反推金属丝电阻率 ρ</span>
                <span className="text-[10px] text-emerald-600 font-mono">k·π·d² / 4</span>
              </div>
              <div className="text-base font-bold text-emerald-900 font-mono mt-0.5">
                {(physics.rho_from_slope * 1e6).toFixed(3)} × 10⁻⁶ <span className="text-xs font-normal text-slate-600">Ω·m</span>
              </div>
            </div>

            {/* 阻值对比网格 */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500">实测阻值 R_测</div>
                <div className="text-xs font-bold text-slate-800 font-mono">
                  {physics.Rx_meas.toFixed(3)} Ω
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500">理论真实 R_真</div>
                <div className="text-xs font-bold text-slate-600 font-mono">
                  {physics.Rx_real.toFixed(3)} Ω
                </div>
              </div>
            </div>
          </div>

          {/* 高考实验核心决策提示 */}
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 leading-normal">
            {physics.wiring === 0 ? (
              <div>
                <span className="font-semibold text-blue-700">【外接法分析】：</span>
                金属丝电阻极小（≈{physics.Rx_real.toFixed(2)}Ω ≪ 3000Ω），外接法电压表分流引起的系统误差极小，为高考推荐标准接法。
              </div>
            ) : (
              <div>
                <span className="font-semibold text-amber-700">【内接法分析】：</span>
                电流表分压导致纵轴截距恰为表阻 R_A（{physics.RA}Ω）；通过 R-L 图线斜率求 ρ 可有效消除截距系统误差。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExperimentResistivityCenterExtra
