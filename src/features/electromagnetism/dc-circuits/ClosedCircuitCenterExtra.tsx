import { FC, useMemo } from 'react'
import { RelationChart } from '@/components/Chart'
import { PHYSICS_COLORS, CHART_COLORS } from '@/theme/physics'
import { useAnimationStore } from '@/stores'
import { calculateClosedCircuit } from '@/physics'

const UI_DOMAIN = {
  iMax: 8,
  uMax: 8,
} as const

const PR_DOMAIN = {
  rMax: 20,
  pMinMax: 10,
} as const

export const ClosedCircuitCenterExtra: FC = () => {
  const params = useAnimationStore((s) => s.params)

  const mode = params.mode ?? 1 // 0=基础(U-I), 1=进阶(P出-R)
  const EMF = params.EMF ?? 6
  const r = params.r ?? 2
  const R = params.R ?? 10

  // 物理计算
  const { I, U_terminal, P_output, eta } = useMemo(() => {
    return calculateClosedCircuit(EMF, r, R)
  }, [EMF, r, R])

  const U_internal = I * r

  const uiPoints = useMemo(() => {
    const iShort = r > 0 ? EMF / r : UI_DOMAIN.iMax
    const iEnd = Math.min(UI_DOMAIN.iMax, iShort)
    const uEnd = Math.max(0, EMF - iEnd * r)
    return [
      { x: 0, y: EMF },
      { x: iEnd, y: uEnd },
    ]
  }, [EMF, r])

  const prPoints = useMemo(() => {
    const points: { x: number; y: number }[] = []
    const steps = 80
    for (let step = 0; step <= steps; step++) {
      const rVal = (step / steps) * PR_DOMAIN.rMax
      const pVal = rVal + r > 0 ? (EMF * EMF * rVal) / Math.pow(rVal + r, 2) : 0
      points.push({ x: rVal, y: pVal })
    }
    return points
  }, [EMF, r])

  // 最大功率极值点
  const P_max = useMemo(() => {
    return r > 0 ? (EMF * EMF) / (4 * r) : 0
  }, [EMF, r])

  const prYMax = Math.max(PR_DOMAIN.pMinMax, P_max * 1.2, P_output * 1.2)

  const chart = mode === 0 ? (
    <RelationChart
      title={`U - I 关系图像（内阻 r = ${r.toFixed(1)} Ω）`}
      xLabel="I (A)"
      yLabel="U (V)"
      points={uiPoints}
      xDomain={[0, UI_DOMAIN.iMax]}
      yDomain={[0, UI_DOMAIN.uMax]}
      color={PHYSICS_COLORS.electricPotential}
      strokeWidth={2}
      cursorX={I}
      cursorLabel={(i, u) => `(${i.toFixed(2)}A, ${u.toFixed(2)}V)`}
      markers={[
        { axis: 'point', x: 0, y: EMF, label: `E=${EMF.toFixed(1)}V`, color: PHYSICS_COLORS.emf },
        ...(EMF / r <= UI_DOMAIN.iMax
          ? [{ axis: 'point' as const, x: EMF / r, y: 0, label: `I短=${(EMF / r).toFixed(2)}A`, color: PHYSICS_COLORS.electricCurrent }]
          : []),
      ]}
    />
  ) : (
    <RelationChart
      title={`P出 - R 关系图像（内阻 r = ${r.toFixed(1)} Ω）`}
      xLabel="R (Ω)"
      yLabel="P (W)"
      points={prPoints}
      xDomain={[0, PR_DOMAIN.rMax]}
      yDomain={[0, prYMax]}
      color={PHYSICS_COLORS.power}
      strokeWidth={2}
      cursorX={R}
      cursorLabel={(rv, p) => `(${rv.toFixed(1)}Ω, ${p.toFixed(2)}W)`}
      markers={r <= PR_DOMAIN.rMax
        ? [{ axis: 'point', x: r, y: P_max, label: `Pmax=${P_max.toFixed(2)}W`, color: CHART_COLORS.criticalPt }]
        : []}
    />
  )

  return (
    <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50">
      <div className="flex-1 bg-white rounded-xl shadow-sm p-3 border border-neutral-100 flex items-center justify-center min-w-0 relative">
        <div className="w-full h-full min-h-0">
          {chart}
        </div>

        {/* 浮动实时状态卡片 */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg border border-neutral-100 shadow-sm px-3 py-1.5 flex flex-col gap-0.5 min-w-[105px] pointer-events-none">
          <div className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
            电路即时状态
          </div>
          <div className="text-[10px] flex items-center justify-between gap-3">
            <span className="text-neutral-500">电流 I</span>
            <span className="font-mono font-bold text-red-600">{I.toFixed(3)} A</span>
          </div>
          <div className="text-[10px] flex items-center justify-between gap-3">
            <span className="text-neutral-500">路端电压 U</span>
            <span className="font-mono font-bold text-amber-700">{U_terminal.toFixed(2)} V</span>
          </div>
          <div className="text-[10px] flex items-center justify-between gap-3">
            <span className="text-neutral-500">内电压 U内</span>
            <span className="font-mono font-bold text-neutral-600">{U_internal.toFixed(2)} V</span>
          </div>
          <div className="text-[10px] flex items-center justify-between gap-3">
            <span className="text-neutral-500">输出功率</span>
            <span className="font-mono font-bold text-amber-600">{P_output.toFixed(2)} W</span>
          </div>
          <div className="text-[10px] flex items-center justify-between gap-3">
            <span className="text-neutral-500">电源效率</span>
            <span className="font-mono font-bold text-emerald-600">{(eta * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClosedCircuitCenterExtra
