import { FC, useMemo } from 'react'
import { Card } from '@/components/UI'
import { RelationChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { calculateExperimentEr } from '@/physics'

export const ExperimentErCenterExtra: FC = () => {
  const params = useAnimationStore((s) => s.params)
  const trajectory = useAnimationStore((s) => s.physicsState.trajectory)
  const setPhysicsState = useAnimationStore((s) => s.setPhysicsState)

  const wiring = params.wiring ?? 0 // 0=电路甲(外接法), 1=电路乙(内接法)
  const showReal = params.showReal ?? 0 // 0=不显示真实线, 1=显示真实线
  const R_slider = params.R_slider ?? 10

  const E_real = 6.0
  const r_real = 2.0
  const RV = 10.0 // 教学用低阻值电压表，匹配主画布参数
  const RA = 1.5 // 教学用大阻值电流表

  // 实时物理计算
  const res = calculateExperimentEr(E_real, r_real, R_slider, wiring, RV, RA)

  // 1. 真实 U-I 直线数据点
  const realPoints = useMemo(() => {
    return [
      { x: 0, y: E_real },
      { x: 3.0, y: Math.max(0, E_real - 3.0 * r_real) }
    ]
  }, [])

  // 2. 等效测量 U-I 直线数据点
  const measPoints = useMemo(() => {
    const E_meas = wiring === 0 ? E_real / (1 + r_real / RV) : E_real
    const r_meas = wiring === 0 ? r_real / (1 + r_real / RV) : r_real + RA
    return [
      { x: 0, y: E_meas },
      { x: 3.0, y: Math.max(0, E_meas - 3.0 * r_meas) }
    ]
  }, [wiring])

  // 3. 额外渲染的曲线系列（根据 showReal 开关决定是否叠加真实图线）
  const additionalSeries = useMemo(() => {
    const list = []
    if (showReal === 1) {
      list.push({
        points: realPoints,
        label: '真实 U-I 直线 (虚线)',
        color: PHYSICS_COLORS.textMuted,
        strokeWidth: 1.5,
        strokeDasharray: [4, 4]
      })
    }
    return list
  }, [showReal, realPoints])

  // 4. 打点标记
  const markers = useMemo(() => {
    return trajectory.map((p) => ({
      axis: 'point' as const,
      x: p.x,
      y: p.y,
      color: CANVAS_COLORS.alertRed
    }))
  }, [trajectory])

  // 记录与清除操作
  const handleRecord = () => {
    // 限制记录最大点数，防止图线过密，同时防止重复记录
    if (trajectory.length >= 10) return
    const isDup = trajectory.some((p) => Math.abs(p.x - res.I_meas) < 0.001)
    if (isDup) return
    setPhysicsState((prev) => ({
      ...prev,
      trajectory: [...prev.trajectory, { x: res.I_meas, y: res.U_meas }].sort((a, b) => a.x - b.x)
    }))
  }

  const handleClear = () => {
    setPhysicsState((prev) => ({ ...prev, trajectory: [] }))
  }

  return (
    <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50 animate-fade-in">
      {/* 左侧：U-I 图像卡片 */}
      <Card className="flex-[3] p-3 min-w-0 relative">
        <div className="w-full h-full min-h-0">
          <RelationChart
            title="实验测量与真实物理关系图像 (U - I)"
            xLabel="电流 I (A)"
            yLabel="端电压 U (V)"
            points={measPoints}
            mainLabel="测量 U-I 直线"
            color={CANVAS_COLORS.alertRed}
            strokeWidth={2}
            additionalSeries={additionalSeries}
            xDomain={[0, 3.2]}
            yDomain={[0, 6.5]}
            markers={markers}
            cursorX={res.I_meas}
            cursorLabel={(x, y) => `当前: I=${x.toFixed(2)}A, U=${y.toFixed(2)}V`}
          />
          {/* 图例浮层 */}
          <div className="absolute top-3 right-4 flex gap-4 text-[10px] text-neutral-500 bg-white/80 px-2.5 py-1 rounded border border-neutral-100 shadow-sm select-none">
            {showReal === 1 && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-neutral-400 inline-block"></span>
                <span>真实 U-I</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-red-500 inline-block"></span>
              <span>测量 U-I</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              <span>已记录测量点</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 右侧：分析卡片与交互操作台 */}
      <Card className="flex-[2] p-3 flex flex-col justify-between min-w-0 bg-white border border-neutral-200/50">
        <div>
          <span className="text-xs font-bold text-neutral-700 block mb-2">
            系统误差分析：{wiring === 0 ? '电路甲 (外接法)' : '电路乙 (内接法)'}
          </span>
          <div className="text-[11px] text-neutral-600 space-y-1.5 leading-relaxed">
            {wiring === 0 ? (
              <>
                <p>
                  <strong className="text-red-500">① 误差本质</strong>
                  {"：电压表的分分流作用导致电流表测得的电流 I_测 小于干路真实总电流 I_真。"}
                </p>
                <p>{"② 数量关系：在任一电压下，都有 I_真 = I_测 + U / Rv。"}</p>
                <p>{"③ 几何性质：测量线与真实线在横轴相交于短路电流点，即 E/r 相同。"}</p>
                <p>
                  <strong className="text-red-600">④ 测量结论</strong>
                  {"：测得的电动势偏小 (E_测 < E_真)，测得电源内阻也偏小 (r_测 < r_真)。"}
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong className="text-red-500">① 误差本质</strong>
                  {"：电流表的分压作用导致电压表测得的电压 U_测 小于电源真实的端电压 U_真。"}
                </p>
                <p>{"② 数量关系：在任一电流下，都有 U_真 = U_测 + I * Ra。"}</p>
                <p>{"③ 几何性质：测量线与真实线在纵轴相交于真实电动势点，但斜率变陡。"}</p>
                <p>
                  <strong className="text-red-600">④ 测量结论</strong>
                  {"：测得的电动势等于真实值 (E_测 = E_真)，但测得的内阻偏大 (r_测 = r_真 + Ra > r_真)。"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* 交互操作区（原位于 SVG 内，现移至此处以符合规范） */}
        <div className="border-t border-neutral-100 pt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleRecord}
              disabled={trajectory.length >= 10}
              className={`flex-1 py-1.5 text-white rounded text-xs font-bold shadow-sm transition active:scale-95 flex items-center justify-center gap-1 ${
                trajectory.length >= 10 
                  ? 'bg-neutral-300 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <span>📷</span>
              <span>记录当前点 ({res.I_meas.toFixed(2)}A, {res.U_meas.toFixed(2)}V)</span>
            </button>
            <button
              onClick={handleClear}
              className="px-2.5 py-1.5 border border-red-200 text-red-600 rounded text-xs font-bold hover:bg-red-50 transition active:scale-95 flex items-center justify-center"
              title="清除所有实验记录点"
            >
              <span>🗑️ 清除</span>
            </button>
          </div>
          <div className="flex justify-between items-center text-[10px] text-neutral-500 px-0.5 select-none">
            <span>已记数据点：<strong className="text-emerald-600">{trajectory.length}</strong> / 10</span>
            <span className="text-neutral-400">（切换接线方式时自动清除）</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ExperimentErCenterExtra
