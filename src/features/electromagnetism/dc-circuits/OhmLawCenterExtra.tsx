import { FC, useState, useEffect, useMemo } from 'react'
import { RelationChart } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'
import { useAnimationStore } from '@/stores'
import { LineChart } from 'lucide-react'

const OHM_CHART_DOMAIN = {
  uMax: 10,
  iMax: 2,
} as const

export const OhmLawCenterExtra: FC = () => {
  const params = useAnimationStore((s) => s.params)

  const mode = params.mode ?? 0 // 0=定值电阻, 1=小灯泡
  const U = params.U ?? 2
  const R = params.R ?? 10
  const showChart = params.showChart ?? 1

  // 记录用户扫掠过的点集
  const [history, setHistory] = useState<{ u: number; i: number }[]>([])

  // 当模式或电阻值发生改变时，重置历史打点
  useEffect(() => {
    setHistory([])
  }, [mode, R])

  // 计算当前工作点的电流
  const currentI = useMemo(() => {
    if (mode === 0) {
      return R > 0 ? U / R : 0
    }
    const R_eff = 5 + 2 * U
    return R_eff > 0 ? U / R_eff : 0
  }, [U, R, mode])

  // 随着 U 的调节动态打点
  useEffect(() => {
    // 自动将原点 (0,0) 作为基础点
    setHistory((prev) => {
      const hasOrigin = prev.some((p) => p.u === 0)
      const base = hasOrigin ? prev : [{ u: 0, i: 0 }, ...prev]

      // 避免重复记录相近的电压值（阈值设为 0.15V）
      const threshold = 0.15
      const isClose = base.some((p) => Math.abs(p.u - U) < threshold)

      if (isClose) {
        // 更新最接近的点，保持曲线精确
        const filtered = base.filter((p) => Math.abs(p.u - U) >= threshold)
        return [...filtered, { u: U, i: currentI }].sort((a, b) => a.u - b.u)
      }

      return [...base, { u: U, i: currentI }].sort((a, b) => a.u - b.u)
    })
  }, [U, currentI])

  const referencePoints = useMemo(() => {
    const points: { x: number; y: number }[] = []
    const steps = 80
    for (let step = 0; step <= steps; step++) {
      const uVal = (step / steps) * OHM_CHART_DOMAIN.uMax
      const iVal = mode === 0
        ? (R > 0 ? uVal / R : 0)
        : uVal / (5 + 2 * uVal)
      points.push({ x: uVal, y: iVal })
    }
    return points
  }, [mode, R])

  const historyPoints = useMemo(
    () => history.map((p) => ({ x: p.u, y: p.i })),
    [history]
  )

  // 如果用户选择不显示图表，返回一个精美的提示卡片
  if (showChart === 0) {
    return (
      <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50">
        <div className="flex-1 bg-white rounded-xl shadow-sm p-4 border border-neutral-100 flex flex-col items-center justify-center text-center">
          <LineChart className="w-12 h-12 text-neutral-300 mb-2 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-neutral-600 mb-1">U-I 伏安特性图表已隐藏</h3>
          <p className="text-xs text-neutral-400 max-w-xs">
            您可以在左侧控制面板中开启「显示 U-I 实时图表」，观察定值电阻与非线性小灯泡的特性曲线。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50">
      <div className="flex-1 bg-white rounded-xl shadow-sm p-3 border border-neutral-100 flex items-center justify-center min-w-0 relative">
        <div className="w-full h-full min-h-0">
          <RelationChart
            title={mode === 0 ? `U-I 特性曲线（定值电阻 R = ${R} Ω）` : 'U-I 特性曲线（非线性小灯泡）'}
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
        </div>

      </div>
    </div>
  )
}

export default OhmLawCenterExtra
