import { FC, useMemo } from 'react'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { useAnimationStore } from '@/stores'
import { useCanvasSize } from '@/utils'
import { BarChart3 } from 'lucide-react'
import { Card } from '@/components/UI'

export const CircuitAnalysisCenterExtra: FC = () => {
    const params = useAnimationStore((s) => s.params)
  const [, canvasSize] = useCanvasSize({ width: 400, height: 200 })
  const { font } = canvasSize

  const mode = params.mode ?? 0 // 0=基础, 1=进阶
  const subMode = params.subMode ?? 0 // 0=串联, 1=并联
  const R1 = params.R1 ?? 20
  const R2 = params.R2 ?? 10
  const R3 = params.R3 ?? 30
  const U = params.U ?? 12
  const showChart = params.showChart ?? 1

  // 物理量实时计算 (与右侧看板和电路一致)
  const circuitData = useMemo(() => {
    let Rtotal = 0
    let Itotal = 0
    let U1 = 0
    let U2 = 0
    let I1 = 0
    let I2 = 0
    let I3 = 0

    if (mode === 0) {
      if (subMode === 0) {
        // 串联电路
        Rtotal = R1 + R2
        Itotal = Rtotal > 0 ? U / Rtotal : 0
        I1 = I2 = Itotal
        U1 = I1 * R1
        U2 = I2 * R2
      } else {
        // 并联电路
        const R2_eff = R2 > 0 ? R2 : 0.01
        Rtotal = (R1 * R2_eff) / (R1 + R2_eff)
        Itotal = U / Rtotal
        I1 = U / R1
        I2 = U / R2_eff
        U1 = U2 = U
      }
    } else {
      // 混联电路
      const R2_eff = R2 > 0 ? R2 : 0.001
      const R_parallel = (R2_eff * R3) / (R2_eff + R3)
      Rtotal = R1 + R_parallel
      Itotal = U / Rtotal
      U1 = Itotal * R1
      U2 = U - U1
      I3 = U2 / R3
      I2 = R2 > 0 ? U2 / R2 : Itotal
      I1 = Itotal
    }

    return { Rtotal, Itotal, U1, U2, I1, I2, I3 }
  }, [mode, subMode, R1, R2, R3, U])

  if (showChart === 0) {
    return (
      <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50">
        <Card className="flex-1 p-4 flex flex-col items-center justify-center text-center">
          <BarChart3 className="w-12 h-12 text-neutral-300 mb-2 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-neutral-600 mb-1">分配对比柱状图已隐藏</h3>
          <p className="text-xs text-neutral-400 max-w-xs">
            您可以在左侧控制面板中开启「显示分配对比柱状图」，直观观察电压、电流在不同元件之间的此消彼长分配规律。
          </p>
        </Card>
      </div>
    )
  }

  // 柱状图坐标映射
  // viewBox="0 0 240 100"
  // 电压轴 (左半边 x: 10~110, y: 15~85)
  // 电流轴 (右半边 x: 130~230, y: 15~85)
  const plotH = 65
  const originY = 82
  const topY = 17

  const toSvgY_U = (u: number) => originY - (u / 12) * plotH
  // 电流最大参考值为 1.2 A (并联短路除外，做截断限制)
  const toSvgY_I = (i: number) => originY - (Math.min(1.2, i) / 1.2) * plotH

  const items = mode === 0 
    ? [
        { label: 'R₁', u: circuitData.U1, i: circuitData.I1, color: SCENE_COLORS.charts.circuitR1 },
        { label: 'R₂ (变)', u: circuitData.U2, i: circuitData.I2, color: SCENE_COLORS.charts.circuitR2 },
        { label: '总电路', u: U, i: circuitData.Itotal, color: SCENE_COLORS.charts.circuitTotal },
      ]
    : [
        { label: 'R₁', u: circuitData.U1, i: circuitData.I1, color: SCENE_COLORS.charts.circuitR1 },
        { label: 'R₂ (变)', u: circuitData.U2, i: circuitData.I2, color: SCENE_COLORS.charts.circuitR2 },
        { label: 'R₃', u: circuitData.U2, i: circuitData.I3, color: SCENE_COLORS.charts.circuitR3 },
        { label: '总电路', u: U, i: circuitData.Itotal, color: SCENE_COLORS.charts.circuitTotal },
      ]

  const numItems = items.length
  const colWidth = 12

  // 柱体 x 坐标计算
  const getX = (idx: number, side: 'left' | 'right') => {
    const startX = side === 'left' ? 22 : 142
    const totalW = 80
    const dx = totalW / (numItems + 1)
    return startX + dx * (idx + 1) - colWidth / 2
  }

  return (
    <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50">
      <Card className="flex-1 p-3 flex items-center justify-center min-w-0 relative">
        <svg viewBox="0 0 240 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* ================= 左半部分：电压分配 U (V) ================= */}
          <text x={22} y={11} fontSize={font(4.5)} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            电压分配 U (V) — 串联分压
          </text>
          
          {/* 电压网格线 */}
          {[3, 6, 9, 12].map((v) => (
            <g key={`grid-u-${v}`}>
              <line
                x1={22}
                y1={toSvgY_U(v)}
                x2={102}
                y2={toSvgY_U(v)}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.25}
                strokeDasharray="1,1"
              />
              <text x={18} y={toSvgY_U(v) + 1.2} fontSize={font(3)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">
                {v}
              </text>
            </g>
          ))}

          {/* 电压轴 */}
          <line x1={22} y1={originY} x2={104} y2={originY} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.4} />
          <line x1={22} y1={originY} x2={22} y2={topY} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.4} />

          {/* 电压柱体 */}
          {items.map((item, idx) => {
            const x = getX(idx, 'left')
            const y = toSvgY_U(item.u)
            const h = Math.max(0, originY - y)
            return (
              <g key={`bar-u-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={colWidth}
                  height={h}
                  fill={item.color}
                  fillOpacity={0.8}
                  stroke={item.color}
                  strokeWidth={0.3}
                  rx={1}
                  style={{ transition: 'height 250ms ease-out, y 250ms ease-out' }}
                />
                <text
                  x={x + colWidth / 2}
                  y={y - 2}
                  fontSize={font(3.2)}
                  fill={PHYSICS_COLORS.labelText}
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                  style={{ transition: 'y 250ms ease-out' }}
                >
                  {item.u.toFixed(1)}V
                </text>
                <text x={x + colWidth / 2} y={originY + 4.5} fontSize={font(3.2)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
                  {item.label}
                </text>
              </g>
            )
          })}

          {/* ================= 右半部分：电流分配 I (A) ================= */}
          <text x={142} y={11} fontSize={font(4.5)} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            电流分配 I (A) — 并联分流
          </text>
          
          {/* 电流网格线 */}
          {[0.3, 0.6, 0.9, 1.2].map((i) => (
            <g key={`grid-i-${i}`}>
              <line
                x1={142}
                y1={toSvgY_I(i)}
                x2={222}
                y2={toSvgY_I(i)}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.25}
                strokeDasharray="1,1"
              />
              <text x={138} y={toSvgY_I(i) + 1.2} fontSize={font(3)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">
                {i.toFixed(1)}
              </text>
            </g>
          ))}

          {/* 电流轴 */}
          <line x1={142} y1={originY} x2={224} y2={originY} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.4} />
          <line x1={142} y1={originY} x2={142} y2={topY} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.4} />

          {/* 电流柱体 */}
          {items.map((item, idx) => {
            const x = getX(idx, 'right')
            const isOver = item.i > 1.2
            const y = toSvgY_I(item.i)
            const h = Math.max(0, originY - y)
            return (
              <g key={`bar-i-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={colWidth}
                  height={h}
                  fill={PHYSICS_COLORS.electricCurrent}
                  fillOpacity={0.8}
                  stroke={PHYSICS_COLORS.electricCurrent}
                  strokeWidth={0.3}
                  rx={1}
                  style={{ transition: 'height 250ms ease-out, y 250ms ease-out' }}
                />
                {isOver && (
                  // 溢出指示符（并联短路状态）
                  <path
                    d={`M ${x + 2} ${y + 2} L ${x + colWidth / 2} ${y - 1} L ${x + colWidth - 2} ${y + 2}`}
                    fill="none"
                    stroke={SCENE_COLORS.materials.edgeHighlightWhite}
                    strokeWidth={0.6}
                  />
                )}
                <text
                  x={x + colWidth / 2}
                  y={y - 2}
                  fontSize={font(3.2)}
                  fill={isOver ? PHYSICS_COLORS.electricCurrent : PHYSICS_COLORS.labelText}
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                  style={{ transition: 'y 250ms ease-out' }}
                >
                  {item.i.toFixed(2)}A
                </text>
                <text x={x + colWidth / 2} y={originY + 4.5} fontSize={font(3.2)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
                  {item.label}
                </text>
              </g>
            )
          })}
        </svg>
      </Card>
    </div>
  )
}

export default CircuitAnalysisCenterExtra
