import { useMemo } from 'react'
import { MiniChart } from '@/components/UI'
import type { MiniChartLine, MiniChartStaticLine } from '@/components/UI'
import { maxwellBoltzmannSpeed, N_A } from '@/physics/brownianMotion'
import { THERMO_COLORS, CHART_COLORS } from '@/theme/physics'

// 液体分子质量（以水分子 H₂O 估算：摩尔质量 18g/mol，质量约 2.99 × 10⁻²⁶ kg）
// 麦克斯韦-玻尔兹曼分布是“液体/气体分子”的热运动速率统计，绝不能使用花粉大颗粒的质量
const M_MOLECULE = 0.018 / N_A 

export default function MaxwellBoltzmannChart({
  temperature,
  particleD: _particleD, // 忽略花粉直径，麦克斯韦速率只与分子本身质量和温度有关
}: {
  temperature: number
  particleD: number
}) {
  // 1. 固定速率分布的横轴与纵轴，保持坐标系静止
  const { points, vMax, fvMax, vAvg } = useMemo(() => {
    const K_B = 1.38e-23
    
    // 最高温度 373 K 下的最概然速率约为 585 m/s，X 轴固定取 1200 m/s 保证平移明显
    const vMaxVal = 1200
    
    // Y 轴最大值由最低温 273 K 的峰值决定 (约 0.002)
    const vpMinT = Math.sqrt((2 * K_B * 273) / M_MOLECULE)
    const fvMaxVal = maxwellBoltzmannSpeed(vpMinT, 273, M_MOLECULE)

    // 计算当前温度下分子平均速率 v_avg = sqrt(8k_BT/(pi*m))
    const vAvgVal = Math.sqrt((8 * K_B * temperature) / (Math.PI * M_MOLECULE))

    // 生成当前温度与 273K 低温基准两条曲线的数据点
    const steps = 80
    const curvePoints: Record<string, number>[] = []
    for (let i = 0; i <= steps; i++) {
      const v = (vMaxVal * i) / steps
      const fv = maxwellBoltzmannSpeed(v, temperature, M_MOLECULE)
      const fvBase = maxwellBoltzmannSpeed(v, 273, M_MOLECULE)
      curvePoints.push({ v, fv, fvBase })
    }

    return { points: curvePoints, vMax: vMaxVal, fvMax: fvMaxVal, vAvg: vAvgVal }
  }, [temperature])

  // 双曲线图例与样式定义
  const chartLines: MiniChartLine[] = useMemo(
    () => [
      { key: 'fv', color: THERMO_COLORS.heatAbsorb, strokeWidth: 2, name: `${temperature}K 分子速率`, showValueInLegend: false },
      { key: 'fvBase', color: CHART_COLORS.reference, strokeWidth: 1.2, strokeDasharray: '3 2', name: '273K 低温基准', showValueInLegend: false },
    ],
    [temperature]
  )

  // 静态参考线：展示当前分子平均速率
  const staticLines: MiniChartStaticLine[] = useMemo(
    () => [
      {
        value: 0, // 仅在图例显示
        color: THERMO_COLORS.temperature,
        strokeDasharray: '4 2',
        name: `平均速率 v_avg = ${vAvg.toFixed(0)} m/s`,
        showValueInLegend: false,
      },
    ],
    [vAvg]
  )

  const currentVals = useMemo(() => ({ fv: 0, fvBase: 0 }), [])

  return (
    <div className="w-full">
      <MiniChart
        title="麦克斯韦-玻尔兹曼速率分布对照"
        xMin={0}
        xMax={vMax}
        yMin={0}
        yMax={fvMax * 1.15}
        points={points}
        lines={chartLines}
        xKey="v"
        xLabel="速率 v (m/s)"
        yLabel="概率密度 f(v)"
        currentVals={currentVals}
        currentXVal={0}
        staticLines={staticLines}
        minWidth={360}
        minHeight={250}
      />
    </div>
  )
}
