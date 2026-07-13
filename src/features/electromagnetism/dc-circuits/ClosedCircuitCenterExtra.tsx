import { FC, useMemo } from 'react'
import { RelationChart } from '@/components/Chart'
import { PHYSICS_COLORS, CHART_COLORS } from '@/theme/physics'
import { useAnimationStore } from '@/stores'
import { calculateClosedCircuit } from '@/physics'
import { Card } from '@/components/UI'

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

  const mode = params.mode ?? 1 // 0=U-I关系, 1=输出功率与效率, 2=全电路电势分布
  const EMF = params.EMF ?? 6
  const r = params.r ?? 2
  const R = params.R ?? 10

  // 物理计算
  const { I, U_terminal, P_output } = useMemo(() => {
    return calculateClosedCircuit(EMF, r, R)
  }, [EMF, r, R])

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

  const P_max = useMemo(() => {
    return r > 0 ? (EMF * EMF) / (4 * r) : 0
  }, [EMF, r])

  const prYMax = Math.max(PR_DOMAIN.pMinMax, P_max * 1.2, P_output * 1.2)

  // 全电路电势分布曲线数据
  const potPoints = useMemo(() => {
    const U_internal = I * r
    // 纵坐标代表电势，横坐标代表回路位置
    return [
      { x: 0, y: 0 },                    // 电源负极起
      { x: 2, y: EMF },                  // 理想电源内部非静电力泵升电势至 E
      { x: 4, y: EMF },                  // 内阻前
      { x: 6, y: EMF - U_internal },     // 经过电源内阻r电势降落 Ir
      { x: 7, y: EMF - U_internal },     // 出电源正极导线
      { x: 11, y: 0 },                   // 经滑动变阻器R电势降落 IR
      { x: 12, y: 0 }                    // 回到负极导线
    ]
  }, [EMF, r, I])

  const chart = useMemo(() => {
    if (mode === 0) {
      return (
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
      )
    } else if (mode === 1) {
      return (
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
    } else {
      // 电势降落分布折线图
      return (
        <RelationChart
          title="全回路电势分布图线 (V - x 展开)"
          xLabel="回路展开距离"
          yLabel="电势 V (V)"
          points={potPoints}
          xDomain={[0, 12]}
          yDomain={[0, Math.max(8, EMF * 1.15)]}
          color={PHYSICS_COLORS.electricPotential}
          strokeWidth={2.2}
          markers={[
            { axis: 'point', x: 0, y: 0, label: '负极 (0V)', color: PHYSICS_COLORS.electricCurrent },
            { axis: 'point', x: 2, y: EMF, label: `正极板 (E=${EMF}V)`, color: PHYSICS_COLORS.emf },
            { axis: 'point', x: 6, y: EMF - I * r, label: `路端电压 U=${U_terminal.toFixed(2)}V`, color: PHYSICS_COLORS.electricPotential },
            { axis: 'point', x: 11, y: 0, label: '负极 (0V)', color: PHYSICS_COLORS.electricCurrent }
          ]}
        />
      )
    }
  }, [mode, r, EMF, uiPoints, I, prPoints, prYMax, R, P_max, potPoints, U_terminal])

  return (
    <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50">
      <Card className="flex-1 p-3 flex items-center justify-center min-w-0 relative">
        <div className="w-full h-full min-h-0">
          {chart}
        </div>
      </Card>
    </div>
  )
}

export default ClosedCircuitCenterExtra
