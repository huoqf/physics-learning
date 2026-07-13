import { FC, useMemo } from 'react'
import { Card } from '@/components/UI'
import { RelationChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS } from '@/theme/physics'

export const ExperimentErCenterExtra: FC = () => {
  const params = useAnimationStore((s) => s.params)
  const trajectory = useAnimationStore((s) => s.physicsState.trajectory)

  const wiring = params.wiring ?? 0 // 0=电路甲, 1=电路乙
  const E_real = 6.0
  const r_real = 2.0

  const visual_RV = 6.0
  const visual_RA = 1.5

  const realPoints = useMemo(() => {
    return [
      { x: 0, y: E_real },
      { x: 3.0, y: E_real - 3.0 * r_real }
    ]
  }, [])

  const measPoints = useMemo(() => {
    if (wiring === 0) {
      const E_meas_vis = E_real / (1 + r_real / visual_RV)
      const r_meas_vis = r_real / (1 + r_real / visual_RV)
      return [
        { x: 0, y: E_meas_vis },
        { x: 3.0, y: Math.max(0, E_meas_vis - 3.0 * r_meas_vis) }
      ]
    } else {
      const E_meas_vis = E_real
      const r_meas_vis = r_real + visual_RA
      return [
        { x: 0, y: E_meas_vis },
        { x: 3.0, y: Math.max(0, E_meas_vis - 3.0 * r_meas_vis) }
      ]
    }
  }, [wiring])

  const markers = useMemo(() => {
    return trajectory.map((p) => ({
      axis: 'point' as const,
      x: p.x,
      y: p.y,
      color: '#ef4444'
    }))
  }, [trajectory])

  return (
    <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50 animate-fade-in">
      <Card className="flex-[3] p-3 min-w-0 relative">
        <div className="w-full h-full min-h-0">
          <RelationChart
            title="实验测量与真实物理关系图像 (U - I)"
            xLabel="I (A)"
            yLabel="U (V)"
            points={realPoints}
            additionalSeries={[
              {
                points: measPoints,
                label: '等效测量图线',
                color: '#ef4444',
                strokeWidth: 2
              }
            ]}
            xDomain={[0, 3.2]}
            yDomain={[0, 6.5]}
            color={PHYSICS_COLORS.axis}
            strokeWidth={1.5}
            markers={markers}
          />
          <div className="absolute top-3 right-4 flex gap-4 text-[10px] text-neutral-500 bg-white/80 px-2 py-1 rounded border border-neutral-100">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-neutral-400 inline-block"></span>
              <span>真实 U-I 直线</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-red-500 inline-block"></span>
              <span>测量 U-I 直线</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              <span>已记录测量点</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="flex-[2] p-3 flex flex-col justify-between min-w-0 bg-white border border-neutral-200/50">
        <div>
          <span className="text-xs font-bold text-neutral-700 block mb-2">
            系统误差分析：{wiring === 0 ? '电路甲 (电流表外接法)' : '电路乙 (电流表内接法)'}
          </span>
          <div className="text-[11px] text-neutral-600 space-y-1.5 leading-relaxed">
            {wiring === 0 ? (
              <>
                <p>
                  <strong className="text-red-500">① 误差本质</strong>
                  {"：电压表的分流作用导致电流表测得的电流 I_测 小于干路真实总电流 I_真。"}
                </p>
                <p>{"② 数量关系：在任一电压下，都有 I_真 = I_测 + U / Rv。"}</p>
                <p>{"③ 直观图线：在 U-I 图像上，等效测量图线位于真实图线的下方与内侧。"}</p>
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
                <p>{"③ 直观图线：当 I = 0 时电压表不分压，截距与真实线重合；当 I > 0 时，测量线斜率变陡。"}</p>
                <p>
                  <strong className="text-red-600">④ 测量结论</strong>
                  {"：测得的电动势等于真实值 (E_测 = E_真)，但测得的内阻偏大 (r_测 = r_真 + Ra > r_真)。"}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-2 text-[10px] text-neutral-400">
          * 提示：拖动主场景的变阻器滑块，点击“记录当前点”按钮在图像上累积散点，对比斜率以验证系统误差的消长趋势。
        </div>
      </Card>
    </div>
  )
}

export default ExperimentErCenterExtra
