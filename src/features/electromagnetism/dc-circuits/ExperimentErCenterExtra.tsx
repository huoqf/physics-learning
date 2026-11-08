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

  // 2. 等效测量 U-I 直线数据点（严格依据物理截距与斜率计算，避免被截断导致斜率失真）
  const measPoints = useMemo(() => {
    const E_meas = wiring === 0 ? E_real / (1 + r_real / RV) : E_real
    const r_meas = wiring === 0 ? r_real / (1 + r_real / RV) : r_real + RA
    const xIntercept = E_meas / r_meas
    const xEnd = Math.min(3.0, xIntercept)
    const yEnd = Math.max(0, E_meas - xEnd * r_meas)
    return [
      { x: 0, y: E_meas },
      { x: xEnd, y: yEnd }
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
        </div>
      </Card>

      {/* 右侧：实验测量数据记录台 */}
      <Card className="flex-[2] p-3 flex flex-col justify-between min-w-0 bg-white border border-neutral-200/50">
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-xs font-semibold text-neutral-600">
              实验测量数据台
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">
              {wiring === 0 ? '电路甲 (外接法)' : '电路乙 (内接法)'}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto border border-neutral-100 rounded-lg p-1 bg-neutral-50/50">
            {trajectory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-3 text-neutral-400">
                <span className="text-xs mb-1">暂无测量点</span>
                <span className="text-[11px] text-neutral-400 leading-tight">
                  调节变阻器 R 阻值后，点击下方按钮记录 U-I 实验散点
                </span>
              </div>
            ) : (
              <table className="w-full text-[11px] text-center border-collapse">
                <thead>
                  <tr className="text-neutral-400 border-b border-neutral-200/60">
                    <th className="py-1 font-normal">序号</th>
                    <th className="py-1 font-normal">电流 I (A)</th>
                    <th className="py-1 font-normal">端电压 U (V)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {trajectory.map((p, idx) => (
                    <tr key={idx} className="text-neutral-600 hover:bg-neutral-100/60">
                      <td className="py-1 text-neutral-400">{idx + 1}</td>
                      <td className="py-1 font-mono font-medium">{p.x.toFixed(2)}</td>
                      <td className="py-1 font-mono font-medium">{p.y.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 交互操作区 */}
        <div className="border-t border-neutral-100 pt-2.5 mt-2 flex flex-col gap-1.5 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleRecord}
              disabled={trajectory.length >= 10}
              className={`flex-1 py-1.5 text-white rounded-lg text-xs font-semibold shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 ${
                trajectory.length >= 10 
                  ? 'bg-neutral-300 cursor-not-allowed' 
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              <span>记录点 ({res.I_meas.toFixed(2)} A, {res.U_meas.toFixed(2)} V)</span>
            </button>
            <button
              onClick={handleClear}
              disabled={trajectory.length === 0}
              className="px-3 py-1.5 border border-neutral-200 text-neutral-600 rounded-lg text-xs font-medium hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95 flex items-center justify-center"
              title="清除所有实验记录点"
            >
              清空
            </button>
          </div>
          <div className="flex justify-between items-center text-[10px] text-neutral-400 px-0.5 select-none">
            <span>已记录：<strong className="text-neutral-700">{trajectory.length}</strong> / 10 组</span>
            <span>切换接线时自动重置</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ExperimentErCenterExtra
