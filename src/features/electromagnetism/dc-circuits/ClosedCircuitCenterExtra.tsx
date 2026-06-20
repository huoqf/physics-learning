import { FC, useMemo } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { useAnimationStore } from '@/stores'
import { useCanvasSize } from '@/utils'
import { calculateClosedCircuit } from '@/physics'

export const ClosedCircuitCenterExtra: FC = () => {
    const params = useAnimationStore((s) => s.params)
  const [_containerRef, canvasSize] = useCanvasSize({ width: 400, height: 200 })
  const { font } = canvasSize

  const mode = params.mode ?? 1 // 0=基础(U-I), 1=进阶(P出-R)
  const EMF = params.EMF ?? 6
  const r = params.r ?? 2
  const R = params.R ?? 10

  // 物理计算
  const { I, U_terminal, P_output, eta } = useMemo(() => {
    return calculateClosedCircuit(EMF, r, R)
  }, [EMF, r, R])

  const U_internal = I * r

  // 1. 图表坐标系及边距定义
  const margin = { left: 14, right: 10, top: 15, bottom: 15 }
  const plotW = 100 - margin.left - margin.right // 76
  const plotH = 100 - margin.top - margin.bottom // 70
  const originX = margin.left
  const originY = margin.top + plotH // 85

  // 2. 基础模式 (U-I 图): U ∈ [0, 8] V, I ∈ [0, 8] A
  const toUiX = (iVal: number) => originX + (iVal / 8) * plotW
  const toUiY = (uVal: number) => originY - (uVal / 8) * plotH

  // 3. 进阶模式 (P出-R 图): R ∈ [0, 20] Ω, P ∈ [0, 10] W
  const toPrX = (rVal: number) => originX + (rVal / 20) * plotW
  const toPrY = (pVal: number) => originY - (pVal / 10) * plotH

  // 4. 计算 U-I 图像的参考线 (U = E - I*r)
  const uiPath = useMemo(() => {
    if (mode !== 0) return ''
    // 直线起于 I=0, U=E，止于短路 I = E/r, U=0
    // 我们为了美观，将直线延长至 I_max = 8 的切面
    const x0 = toUiX(0)
    const y0 = toUiY(EMF)
    const iShort = EMF / r
    // 限制在轴内
    const iEnd = Math.min(8, iShort)
    const uEnd = Math.max(0, EMF - iEnd * r)
    const xEnd = toUiX(iEnd)
    const yEnd = toUiY(uEnd)
    return `M ${x0.toFixed(2)},${y0.toFixed(2)} L ${xEnd.toFixed(2)},${yEnd.toFixed(2)}`
  }, [mode, EMF, r])

  // 5. 计算 P出-R 图像的单峰曲线 (P = E^2*R / (R+r)^2)
  const prPath = useMemo(() => {
    if (mode !== 1) return ''
    const points: string[] = []
    const steps = 60
    for (let step = 0; step <= steps; step++) {
      const rVal = (step / steps) * 20
      const pVal = (EMF * EMF * rVal) / Math.pow(rVal + r, 2)
      points.push(`${toPrX(rVal).toFixed(2)},${toPrY(pVal).toFixed(2)}`)
    }
    return 'M ' + points.join(' L ')
  }, [mode, EMF, r])

  // 最大功率极值点
  const P_max = useMemo(() => {
    return (EMF * EMF) / (4 * r)
  }, [EMF, r])

  const fs = 3.3 // 基础字号
  const sfs = 2.4 // 轴刻度字号

  return (
    <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50">
      <div className="flex-1 bg-white rounded-xl shadow-sm p-3 border border-neutral-100 flex items-center justify-center min-w-0 relative">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* 标题 */}
          <text
            x={margin.left}
            y={margin.top - 6}
            fontSize={fs}
            fill={PHYSICS_COLORS.labelText}
            fontWeight="bold"
          >
            {mode === 0 
              ? `U - I 关系图像 (路端电压随干路电流变化，内阻 r = ${r.toFixed(1)} Ω)` 
              : `P_出 - R 关系图像 (输出功率随外电阻变化，内阻 r = ${r.toFixed(1)} Ω)`
            }
          </text>

          {/* ==================== 坐标轴与网格 (U-I 模式) ==================== */}
          {mode === 0 && (
            <>
              {/* 网格线 */}
              {[2, 4, 6, 8].map((val) => {
                const y = toUiY(val)
                const x = toUiX(val)
                return (
                  <g key={`grid-ui-${val}`}>
                    {/* 水平网格 */}
                    <line x1={originX} y1={y} x2={originX + plotW} y2={y} stroke={PHYSICS_COLORS.grid} strokeWidth={0.2} strokeDasharray="1,1" />
                    {/* 垂直网格 */}
                    <line x1={x} y1={margin.top} x2={x} y2={originY} stroke={PHYSICS_COLORS.grid} strokeWidth={0.2} strokeDasharray="1,1" />
                  </g>
                )
              })}

              {/* 刻度值 */}
              {/* Y轴 (U) */}
              {[2, 4, 6, 8].map((val) => (
                <g key={`tick-ui-y-${val}`}>
                  <line x1={originX - 0.8} y1={toUiY(val)} x2={originX} y2={toUiY(val)} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.25} />
                  <text x={originX - 2} y={toUiY(val) + 0.8} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">{val}</text>
                </g>
              ))}
              {/* X轴 (I) */}
              {[2, 4, 6, 8].map((val) => (
                <g key={`tick-ui-x-${val}`}>
                  <line x1={toUiX(val)} y1={originY} x2={toUiX(val)} y2={originY + 0.8} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.25} />
                  <text x={toUiX(val)} y={originY + 3.4} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontFamily="monospace">{val}</text>
                </g>
              ))}

              {/* U-I 图像参考线 */}
              <path d={uiPath} fill="none" stroke={PHYSICS_COLORS.electricPotential} strokeWidth={0.8} strokeLinecap="round" />

              {/* 截距标注与物理意义 */}
              {/* 纵轴截距: E */}
              <circle cx={toUiX(0)} cy={toUiY(EMF)} r={0.7} fill={PHYSICS_COLORS.emf} />
              <text x={toUiX(0) + 2} y={toUiY(EMF) + 1} fontSize={font(2.5)} fill={PHYSICS_COLORS.emf} fontWeight="bold">E = {EMF}V (断路电压)</text>

              {/* 横轴截距: I短 = E/r */}
              {EMF / r <= 8 && (
                <g>
                  <circle cx={toUiX(EMF / r)} cy={toUiY(0)} r={0.7} fill={PHYSICS_COLORS.electricCurrent} />
                  <text x={toUiX(EMF / r)} y={toUiY(0) - 2.5} fontSize={font(2.5)} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold" textAnchor="middle">
                    I_短 = { (EMF/r).toFixed(2) }A
                  </text>
                </g>
              )}

              {/* 当前工作点 */}
              {I <= 8 && (
                <g>
                  {/* 虚线投影 */}
                  <line x1={toUiX(I)} y1={originY} x2={toUiX(I)} y2={toUiY(U_terminal)} stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={0.15} strokeDasharray="1.5,1.5" />
                  <line x1={originX} y1={toUiY(U_terminal)} x2={toUiX(I)} y2={toUiY(U_terminal)} stroke={PHYSICS_COLORS.electricPotential} strokeWidth={0.15} strokeDasharray="1.5,1.5" />
                  {/* 游标圆点 */}
                  <circle cx={toUiX(I)} cy={toUiY(U_terminal)} r={1.5} fill={PHYSICS_COLORS.electricCurrent} opacity={0.25} />
                  <circle cx={toUiX(I)} cy={toUiY(U_terminal)} r={0.7} fill={PHYSICS_COLORS.electricCurrent} />
                  {/* 数据气泡 */}
                  <text x={toUiX(I) + (I > 5.5 ? -3 : 3)} y={toUiY(U_terminal) - 3} fontSize={font(2.8)} fill={PHYSICS_COLORS.labelText} fontWeight="bold" textAnchor={I > 5.5 ? 'end' : 'start'}>
                    ({I.toFixed(2)}A, {U_terminal.toFixed(2)}V)
                  </text>
                </g>
              )}
            </>
          )}

          {/* ==================== 坐标轴与网格 (P出-R 模式) ==================== */}
          {mode === 1 && (
            <>
              {/* 网格线 */}
              {/* 水平 (2W, 4W, 6W, 8W, 10W) */}
              {[2, 4, 6, 8, 10].map((val) => (
                <line key={`grid-pr-y-${val}`} x1={originX} y1={toPrY(val)} x2={originX + plotW} y2={toPrY(val)} stroke={PHYSICS_COLORS.grid} strokeWidth={0.2} strokeDasharray="1,1" />
              ))}
              {/* 垂直 (5Ω, 10Ω, 15Ω, 20Ω) */}
              {[5, 10, 15, 20].map((val) => (
                <line key={`grid-pr-x-${val}`} x1={toPrX(val)} y1={margin.top} x2={toPrX(val)} y2={originY} stroke={PHYSICS_COLORS.grid} strokeWidth={0.2} strokeDasharray="1,1" />
              ))}

              {/* 刻度值 */}
              {/* Y轴 (P) */}
              {[2, 4, 6, 8, 10].map((val) => (
                <g key={`tick-pr-y-${val}`}>
                  <line x1={originX - 0.8} y1={toPrY(val)} x2={originX} y2={toPrY(val)} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.25} />
                  <text x={originX - 2} y={toPrY(val) + 0.8} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">{val}</text>
                </g>
              ))}
              {/* X轴 (R) */}
              {[5, 10, 15, 20].map((val) => (
                <g key={`tick-pr-x-${val}`}>
                  <line x1={toPrX(val)} y1={originY} x2={toPrX(val)} y2={originY + 0.8} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.25} />
                  <text x={toPrX(val)} y={originY + 3.4} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontFamily="monospace">{val}</text>
                </g>
              ))}

              {/* P出-R 图像参考曲线 */}
              <path d={prPath} fill="none" stroke={PHYSICS_COLORS.power} strokeWidth={0.8} strokeLinecap="round" />

              {/* 极值顶点标示 (R = r) */}
              {r <= 20 && (
                <g>
                  {/* 顶点投影 */}
                  <line x1={toPrX(r)} y1={originY} x2={toPrX(r)} y2={toPrY(P_max)} stroke={PHYSICS_COLORS.resistance} strokeWidth={0.15} strokeDasharray="1.5,1.5" />
                  <line x1={originX} y1={toPrY(P_max)} x2={toPrX(r)} y2={toPrY(P_max)} stroke={PHYSICS_COLORS.power} strokeWidth={0.15} strokeDasharray="1.5,1.5" />
                  {/* 顶点标记 */}
                  <circle cx={toPrX(r)} cy={toPrY(P_max)} r={1.0} fill={colors.danger[500]} />
                  <text x={toPrX(r)} y={toPrY(P_max) - 2.5} fontSize={font(2.4)} fill={colors.danger[500]} fontWeight="bold" textAnchor="middle">
                    P_max = {P_max.toFixed(2)}W (R = r = {r.toFixed(1)}Ω)
                  </text>
                </g>
              )}

              {/* 当前工作点 */}
              <g>
                {/* 投影线 */}
                <line x1={toPrX(R)} y1={originY} x2={toPrX(R)} y2={toPrY(P_output)} stroke={PHYSICS_COLORS.resistance} strokeWidth={0.15} strokeDasharray="1.5,1.5" />
                <line x1={originX} y1={toPrY(P_output)} x2={toPrX(R)} y2={toPrY(P_output)} stroke={PHYSICS_COLORS.power} strokeWidth={0.15} strokeDasharray="1.5,1.5" />
                {/* 游标圆点 */}
                <circle cx={toPrX(R)} cy={toPrY(P_output)} r={1.6} fill={PHYSICS_COLORS.power} opacity={0.25} />
                <circle cx={toPrX(R)} cy={toPrY(P_output)} r={0.7} fill={PHYSICS_COLORS.power} />
                {/* 气泡标签 */}
                <text x={toPrX(R) + (R > 14 ? -3 : 3)} y={toPrY(P_output) - 2.5} fontSize={font(2.8)} fill={PHYSICS_COLORS.labelText} fontWeight="bold" textAnchor={R > 14 ? 'end' : 'start'}>
                  ({R.toFixed(1)}Ω, {P_output.toFixed(2)}W)
                </text>
              </g>
            </>
          )}

          {/* ==================== 统一坐标轴线 ==================== */}
          {/* X轴 */}
          <line x1={originX - 2} y1={originY} x2={originX + plotW + 3} y2={originY} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.35} />
          {/* Y轴 */}
          <line x1={originX} y1={originY + 2} x2={originX} y2={margin.top - 3} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.35} />

          {/* 轴标签 */}
          <text x={originX + plotW + 4} y={originY + 1} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold" textAnchor="start">
            {mode === 0 ? 'I (A)' : 'R (Ω)'}
          </text>
          <text x={originX - 4} y={margin.top - 4} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold" textAnchor="middle">
            {mode === 0 ? 'U (V)' : 'P (W)'}
          </text>

          {/* 原点 0 */}
          <text x={originX - 2} y={originY + 3.2} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">0</text>
        </svg>

        {/* 浮动实时状态卡片 */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg border border-neutral-100 shadow-sm px-3 py-1.5 flex flex-col gap-0.5 min-w-[105px]">
          <div style={{ fontSize: font(8) }} className="font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
            电路即时状态
          </div>
          <div style={{ fontSize: font(10) }} className="flex items-center justify-between">
            <span className="text-neutral-500">电流 I</span>
            <span className="font-mono font-bold text-red-600">{I.toFixed(3)} A</span>
          </div>
          <div style={{ fontSize: font(10) }} className="flex items-center justify-between">
            <span className="text-neutral-500">路端电压 U</span>
            <span className="font-mono font-bold text-amber-700">{U_terminal.toFixed(2)} V</span>
          </div>
          <div style={{ fontSize: font(10) }} className="flex items-center justify-between">
            <span className="text-neutral-500">内电压 U内</span>
            <span className="font-mono font-bold text-neutral-600">{U_internal.toFixed(2)} V</span>
          </div>
          <div style={{ fontSize: font(10) }} className="flex items-center justify-between">
            <span className="text-neutral-500">输出功率</span>
            <span className="font-mono font-bold text-amber-600">{P_output.toFixed(2)} W</span>
          </div>
          <div style={{ fontSize: font(10) }} className="flex items-center justify-between">
            <span className="text-neutral-500">电源效率</span>
            <span className="font-mono font-bold text-emerald-600">{ (eta * 100).toFixed(1) }%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClosedCircuitCenterExtra
