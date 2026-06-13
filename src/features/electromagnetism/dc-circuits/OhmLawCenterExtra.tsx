import { FC, useState, useEffect, useMemo } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { useAnimationStore } from '@/stores'
import { LineChart } from 'lucide-react'

export const OhmLawCenterExtra: FC = () => {
  const { params } = useAnimationStore()

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
      return U / R
    } else {
      const R_eff = 5 + 2 * U
      return U / R_eff
    }
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

  // 坐标轴配置
  const margin = { left: 16, right: 10, top: 15, bottom: 15 }
  const plotW = 100 - margin.left - margin.right // 74
  const plotH = 100 - margin.top - margin.bottom // 70
  const originX = margin.left
  const originY = margin.top + plotH // 85

  // 坐标系物理范围：U ∈ [0, 10] V, I ∈ [0, 2.0] A
  const toSvgX = (u: number) => originX + (u / 10) * plotW
  const toSvgY = (i: number) => originY - (i / 2.0) * plotH

  // 生成浅色参考曲线数据
  const refPath = useMemo(() => {
    const points: string[] = []
    const steps = 50
    for (let step = 0; step <= steps; step++) {
      const uVal = (step / steps) * 10
      let iVal = 0
      if (mode === 0) {
        iVal = uVal / R
      } else {
        iVal = uVal / (5 + 2 * uVal)
      }
      points.push(`${toSvgX(uVal).toFixed(2)},${toSvgY(iVal).toFixed(2)}`)
    }
    return 'M ' + points.join(' L ')
  }, [mode, R])

  // 生成实际打点轨迹 Path
  const historyPath = useMemo(() => {
    if (history.length < 2) return ''
    return 'M ' + history.map((p) => `${toSvgX(p.u).toFixed(2)},${toSvgY(p.i).toFixed(2)}`).join(' L ')
  }, [history])

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

  const fs = 3.4 // Font size base
  const sfs = 2.6 // Small font size

  return (
    <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50">
      <div className="flex-1 bg-white rounded-xl shadow-sm p-3 border border-neutral-100 flex items-center justify-center min-w-0 relative">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* 图表标题 */}
          <text
            x={margin.left}
            y={margin.top - 6}
            fontSize={fs}
            fill={PHYSICS_COLORS.labelText}
            fontWeight="bold"
          >
            {mode === 0 ? `U - I 特性曲线 (定值电阻 R = ${R} Ω)` : 'U - I 特性曲线 (非线性小灯泡)'}
          </text>

          {/* Y 轴网格线 (0.5A, 1.0A, 1.5A) */}
          {[0.5, 1.0, 1.5].map((val) => {
            const y = toSvgY(val)
            return (
              <line
                key={`grid-y-${val}`}
                x1={originX}
                y1={y}
                x2={originX + plotW}
                y2={y}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.2}
                strokeDasharray="1,1"
              />
            )
          })}

          {/* X 轴网格线 (2V, 4V, 6V, 8V) */}
          {[2, 4, 6, 8].map((val) => {
            const x = toSvgX(val)
            return (
              <line
                key={`grid-x-${val}`}
                x1={x}
                y1={margin.top}
                x2={x}
                y2={originY}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.2}
                strokeDasharray="1,1"
              />
            )
          })}

          {/* 坐标轴 */}
          {/* X轴 */}
          <line
            x1={originX - 2}
            y1={originY}
            x2={originX + plotW + 3}
            y2={originY}
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={0.35}
          />
          {/* Y轴 */}
          <line
            x1={originX}
            y1={originY + 2}
            x2={originX}
            y2={margin.top - 3}
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={0.35}
          />

          {/* 轴标签 */}
          <text
            x={originX + plotW + 4}
            y={originY + 1}
            fontSize={fs}
            fill={PHYSICS_COLORS.electricPotential}
            fontWeight="bold"
          >
            U (V)
          </text>
          <text
            x={originX - 4}
            y={margin.top - 4}
            fontSize={fs}
            fill={PHYSICS_COLORS.electricCurrent}
            fontWeight="bold"
            textAnchor="middle"
          >
            I (A)
          </text>

          {/* 刻度值 */}
          {/* Y轴刻度 */}
          {[0.5, 1.0, 1.5, 2.0].map((val) => {
            const y = toSvgY(val)
            return (
              <g key={`tick-y-${val}`}>
                <line
                  x1={originX - 0.8}
                  y1={y}
                  x2={originX}
                  y2={y}
                  stroke={PHYSICS_COLORS.labelText}
                  strokeWidth={0.25}
                />
                <text
                  x={originX - 2}
                  y={y + 0.9}
                  fontSize={sfs}
                  fill={PHYSICS_COLORS.labelTextLight}
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            )
          })}

          {/* X轴刻度 */}
          {[2, 4, 6, 8, 10].map((val) => {
            const x = toSvgX(val)
            return (
              <g key={`tick-x-${val}`}>
                <line
                  x1={x}
                  y1={originY}
                  x2={x}
                  y2={originY + 0.8}
                  stroke={PHYSICS_COLORS.labelText}
                  strokeWidth={0.25}
                />
                <text
                  x={x}
                  y={originY + 3.6}
                  fontSize={sfs}
                  fill={PHYSICS_COLORS.labelTextLight}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            )
          })}
          <text
            x={originX - 2}
            y={originY + 3.2}
            fontSize={sfs}
            fill={PHYSICS_COLORS.labelTextLight}
            textAnchor="end"
          >
            0
          </text>

          {/* 浅色参考曲线 */}
          <path
            d={refPath}
            fill="none"
            stroke={PHYSICS_COLORS.axis}
            strokeWidth={0.4}
            strokeDasharray="1,1"
            opacity={0.7}
          />

          {/* 实际扫过的打点轨迹实线 */}
          {historyPath && (
            <path
              d={historyPath}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 绘制各个打下的历史圆点 */}
          {history.map((p, idx) => (
            <circle
              key={`hist-dot-${idx}`}
              cx={toSvgX(p.u)}
              cy={toSvgY(p.i)}
              r={0.6}
              fill={PHYSICS_COLORS.electricCurrent}
            />
          ))}

          {/* 当前工作点辅助虚线与游标 */}
          <g>
            {/* 投影到X轴 */}
            <line
              x1={toSvgX(U)}
              y1={originY}
              x2={toSvgX(U)}
              y2={toSvgY(currentI)}
              stroke={PHYSICS_COLORS.electricPotential}
              strokeWidth={0.2}
              strokeDasharray="1.5,1.5"
            />
            {/* 投影到Y轴 */}
            <line
              x1={originX}
              y1={toSvgY(currentI)}
              x2={toSvgX(U)}
              y2={toSvgY(currentI)}
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={0.2}
              strokeDasharray="1.5,1.5"
            />

            {/* 游标定位点 */}
            <circle
              cx={toSvgX(U)}
              cy={toSvgY(currentI)}
              r={1.8}
              fill={PHYSICS_COLORS.electricCurrent}
              opacity={0.2}
            />
            <circle
              cx={toSvgX(U)}
              cy={toSvgY(currentI)}
              r={0.9}
              fill={PHYSICS_COLORS.electricCurrent}
            />

            {/* 数值标签展示（做适当的防遮挡偏移） */}
            <text
              x={toSvgX(U) + (U > 7.5 ? -3 : 3)}
              y={toSvgY(currentI) - 3}
              fontSize={3.0}
              fill={PHYSICS_COLORS.labelText}
              fontWeight="bold"
              textAnchor={U > 7.5 ? 'end' : 'start'}
            >
              ({U.toFixed(1)}V, {currentI.toFixed(2)}A)
            </text>
          </g>
        </svg>

        {/* 浮动状态卡片 */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg border border-neutral-100 shadow-sm px-3 py-1.5">
          <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
            实验实时数据
          </div>
          <div className="flex flex-col gap-0.5 min-w-[90px]">
            <div className="flex items-center justify-between gap-3 text-[10px]">
              <span className="text-neutral-500">电压 U</span>
              <span className="font-bold text-primary-700">{U.toFixed(1)} V</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[10px]">
              <span className="text-neutral-500">电流 I</span>
              <span className="font-bold text-red-600">{currentI.toFixed(3)} A</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[10px]">
              <span className="text-neutral-500">等效电阻</span>
              <span className="font-bold text-neutral-700">
                {mode === 0 ? `${R} Ω` : `${(5 + 2 * U).toFixed(1)} Ω`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OhmLawCenterExtra
