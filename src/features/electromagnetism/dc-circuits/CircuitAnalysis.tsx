import { useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { DialMeter, DCSource, Rheostat } from '@/components/Physics'

interface Point {
  x: number
  y: number
}

// 路径线性插值函数
function getPointOnPath(points: Point[], progress: number): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return points[0]

  const segments: number[] = []
  let totalLength = 0
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x
    const dy = points[i + 1].y - points[i].y
    const len = Math.sqrt(dx * dx + dy * dy)
    segments.push(len)
    totalLength += len
  }

  if (totalLength === 0) return points[0]

  let targetLen = (progress % 1.0) * totalLength
  if (targetLen < 0) targetLen += totalLength

  let accumulated = 0
  for (let i = 0; i < segments.length; i++) {
    const len = segments[i]
    if (accumulated + len >= targetLen) {
      const ratio = (targetLen - accumulated) / len
      const pStart = points[i]
      const pEnd = points[i + 1]
      return {
        x: pStart.x + (pEnd.x - pStart.x) * ratio,
        y: pStart.y + (pEnd.y - pStart.y) * ratio,
      }
    }
    accumulated += len
  }

  return points[points.length - 1]
}

/**
 * 串并联电路及电路动态分析主动画
 * 支持：基础串联、基础并联、进阶混联
 */
export default function CircuitAnalysis() {
    const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.mediumWide)
  const { font } = canvasSize

  // 参数配置
  const mode = params.mode ?? 0 // 0=基础, 1=进阶
  const subMode = params.subMode ?? 0 // 0=串联, 1=并联
  const R1 = params.R1 ?? 20
  const R2 = params.R2 ?? 10
  const R3 = params.R3 ?? 30
  const U = params.U ?? 12

  // 物理计算
  const { Rtotal, Itotal, U2, I1, I2, I3 } = useMemo(() => {
    let Rtotal = 0
    let Itotal = 0
    let U1 = 0
    let U2 = 0
    let I1 = 0
    let I2 = 0
    let I3 = 0

    if (mode === 0) {
      if (subMode === 0) {
        Rtotal = R1 + R2
        Itotal = Rtotal > 0 ? U / Rtotal : 0
        I1 = I2 = Itotal
        U1 = I1 * R1
        U2 = I2 * R2
      } else {
        const R2_eff = R2 > 0 ? R2 : 0.01
        Rtotal = (R1 * R2_eff) / (R1 + R2_eff)
        Itotal = U / Rtotal
        I1 = U / R1
        I2 = U / R2_eff
        U1 = U2 = U
      }
    } else {
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

  // ==================== 定义三种模式下的几何位置和电荷路径 ====================

  // 1. 串联电路
  const seriesLayout = useMemo(() => {
    // 关键器件坐标
    const batteryCenter = { x: 80, y: 180 }
    const r1Center = { x: 250, y: 80 }
    const r2Center = { x: 440, y: 80 }
    const ammeterCenter = { x: 570, y: 180 }
    const voltmeterCenter = { x: 440, y: 30 }

    // 完整的电荷闭合回路路径 (电源正极->R1->R2->电流表->电源负极)
    const loopPoints: Point[] = [
      { x: 80, y: 140 }, // 电源正极
      { x: 80, y: 80 },
      { x: 200, y: 80 }, // R1左侧
      { x: 300, y: 80 }, // R1右侧
      { x: 380, y: 80 }, // R2左侧 (变阻器接入端)
      { x: 500, y: 80 }, // R2右侧 (滑杆输出端)
      { x: 570, y: 80 },
      { x: 570, y: 140 }, // 电流表顶端
      { x: 570, y: 220 }, // 电流表底端
      { x: 570, y: 280 },
      { x: 80, y: 280 },
      { x: 80, y: 220 }, // 电源负极
      { x: 80, y: 140 }, // 回到起点
    ]

    return { batteryCenter, r1Center, r2Center, ammeterCenter, voltmeterCenter, loopPoints }
  }, [])

  // 2. 并联电路
  const parallelLayout = useMemo(() => {
    const batteryCenter = { x: 80, y: 180 }
    const ammeterCenter = { x: 190, y: 80 } // 串在干路
    const r1Center = { x: 390, y: 130 }   // 支路1
    const r2Center = { x: 390, y: 230 }   // 支路2
    const voltmeterCenter = { x: 390, y: 300 } // 并联在 R2 两端

    // 并联分段电荷路径：干路 + 支路1 + 支路2
    const mainA: Point[] = [
      { x: 80, y: 140 }, // 电源正极
      { x: 80, y: 80 },
      { x: 150, y: 80 }, // 电流表左
      { x: 230, y: 80 }, // 电流表右
      { x: 290, y: 80 }, // 左分流点
    ]
    const branch1: Point[] = [
      { x: 290, y: 80 }, // 左分流点
      { x: 290, y: 130 },
      { x: 330, y: 130 }, // R1 左
      { x: 450, y: 130 }, // R1 右
      { x: 490, y: 130 },
      { x: 490, y: 80 }, // 右汇合点
    ]
    const branch2: Point[] = [
      { x: 290, y: 80 }, // 左分流点
      { x: 290, y: 230 },
      { x: 330, y: 230 }, // R2 左
      { x: 450, y: 230 }, // R2 右
      { x: 490, y: 230 },
      { x: 490, y: 80 }, // 右汇合点
    ]
    const mainB: Point[] = [
      { x: 490, y: 80 }, // 右汇合点
      { x: 570, y: 80 },
      { x: 570, y: 280 },
      { x: 80, y: 280 },
      { x: 80, y: 220 }, // 电源负极
      { x: 80, y: 140 }, // 回到起点
    ]

    return { batteryCenter, ammeterCenter, r1Center, r2Center, voltmeterCenter, mainA, branch1, branch2, mainB }
  }, [])

  // 3. 混联电路
  const mixedLayout = useMemo(() => {
    const batteryCenter = { x: 80, y: 180 }
    const r1Center = { x: 200, y: 80 }   // 串在干路
    const ammeterCenter = { x: 320, y: 80 } // 串在干路测量总电流
    const r2Center = { x: 490, y: 130 }   // 并联支路1
    const r3Center = { x: 490, y: 230 }   // 并联支路2
    const voltmeterCenter = { x: 490, y: 30 } // 跨接在 R2 两端

    const mainA: Point[] = [
      { x: 80, y: 140 }, // 电源正极
      { x: 80, y: 80 },
      { x: 140, y: 80 }, // R1左
      { x: 260, y: 80 }, // R1右
      { x: 280, y: 80 }, // 电流表左
      { x: 360, y: 80 }, // 电流表右
      { x: 410, y: 80 }, // 左分流点
    ]
    const branch1: Point[] = [
      { x: 410, y: 80 },
      { x: 410, y: 130 },
      { x: 430, y: 130 }, // R2左
      { x: 550, y: 130 }, // R2右
      { x: 580, y: 130 },
      { x: 580, y: 80 }, // 右汇合点
    ]
    const branch2: Point[] = [
      { x: 410, y: 80 },
      { x: 410, y: 240 },
      { x: 430, y: 240 }, // R3左
      { x: 550, y: 240 }, // R3右
      { x: 580, y: 240 },
      { x: 580, y: 80 }, // 右汇合点
    ]
    const mainB: Point[] = [
      { x: 580, y: 80 },
      { x: 580, y: 280 },
      { x: 80, y: 280 },
      { x: 80, y: 220 }, // 电源负极
      { x: 80, y: 140 },
    ]

    return { batteryCenter, r1Center, ammeterCenter, r2Center, r3Center, voltmeterCenter, mainA, branch1, branch2, mainB }
  }, [])

  // ==================== 微观电荷流速与粒子生成 ====================
  
  // 粒子流速常数
  const speedMultiplier = 160

  // 1. 渲染串联粒子
  const renderSeriesCharges = () => {
    const numCharges = 24
    return Array.from({ length: numCharges }, (_, idx) => {
      const progress = (idx * (1 / numCharges) + time * speedMultiplier * Itotal * 0.08) % 1.0
      const pt = getPointOnPath(seriesLayout.loopPoints, progress)
      return (
        <circle
          key={`series-charge-${idx}`}
          cx={pt.x}
          cy={pt.y}
          r={3.2}
          fill={PHYSICS_COLORS.electricCurrent}
          style={{ filter: `drop-shadow(0 0 1.5px ${PHYSICS_COLORS.electricCurrent})` }}
        />
      )
    })
  }

  // 2. 渲染并联粒子
  const renderParallelCharges = () => {
    // 根据各段电流流速分配粒子
    // 干路
    const mainACharges = Array.from({ length: 8 }, (_, idx) => {
      const progress = (idx * (1 / 8) + time * speedMultiplier * Itotal * 0.08) % 1.0
      const pt = getPointOnPath(parallelLayout.mainA, progress)
      return <circle key={`par-ma-${idx}`} cx={pt.x} cy={pt.y} r={3.2} fill={PHYSICS_COLORS.electricCurrent} />
    })
    const mainBCharges = Array.from({ length: 10 }, (_, idx) => {
      const progress = (idx * (1 / 10) + time * speedMultiplier * Itotal * 0.08) % 1.0
      const pt = getPointOnPath(parallelLayout.mainB, progress)
      return <circle key={`par-mb-${idx}`} cx={pt.x} cy={pt.y} r={3.2} fill={PHYSICS_COLORS.electricCurrent} />
    })
    // 支路 1 (I1)
    const branch1Charges = Array.from({ length: 6 }, (_, idx) => {
      const progress = (idx * (1 / 6) + time * speedMultiplier * I1 * 0.08) % 1.0
      const pt = getPointOnPath(parallelLayout.branch1, progress)
      return <circle key={`par-b1-${idx}`} cx={pt.x} cy={pt.y} r={3.2} fill={PHYSICS_COLORS.electricCurrent} />
    })
    // 支路 2 (I2)
    // 限制在最大电流的粒子移动，防止短路时粒子重叠过多
    const limitedI2 = Math.min(2.5, I2)
    const branch2Charges = Array.from({ length: 6 }, (_, idx) => {
      const progress = (idx * (1 / 6) + time * speedMultiplier * limitedI2 * 0.08) % 1.0
      const pt = getPointOnPath(parallelLayout.branch2, progress)
      return <circle key={`par-b2-${idx}`} cx={pt.x} cy={pt.y} r={3.2} fill={PHYSICS_COLORS.electricCurrent} />
    })

    return [...mainACharges, ...branch1Charges, ...branch2Charges, ...mainBCharges]
  }

  // 3. 渲染混联粒子
  const renderMixedCharges = () => {
    // 干路A
    const mainACharges = Array.from({ length: 12 }, (_, idx) => {
      const progress = (idx * (1 / 12) + time * speedMultiplier * Itotal * 0.08) % 1.0
      const pt = getPointOnPath(mixedLayout.mainA, progress)
      return <circle key={`mix-ma-${idx}`} cx={pt.x} cy={pt.y} r={3.2} fill={PHYSICS_COLORS.electricCurrent} />
    })
    // 支路 1 (R2，电流 I2)
    const limitedI2 = Math.min(2.5, I2)
    const branch1Charges = Array.from({ length: 6 }, (_, idx) => {
      const progress = (idx * (1 / 6) + time * speedMultiplier * limitedI2 * 0.08) % 1.0
      const pt = getPointOnPath(mixedLayout.branch1, progress)
      return <circle key={`mix-b1-${idx}`} cx={pt.x} cy={pt.y} r={3.2} fill={PHYSICS_COLORS.electricCurrent} />
    })
    // 支路 2 (R3，电流 I3)
    const branch2Charges = Array.from({ length: 6 }, (_, idx) => {
      const progress = (idx * (1 / 6) + time * speedMultiplier * I3 * 0.08) % 1.0
      const pt = getPointOnPath(mixedLayout.branch2, progress)
      return <circle key={`mix-b2-${idx}`} cx={pt.x} cy={pt.y} r={3.2} fill={PHYSICS_COLORS.electricCurrent} />
    })
    // 干路B
    const mainBCharges = Array.from({ length: 8 }, (_, idx) => {
      const progress = (idx * (1 / 8) + time * speedMultiplier * Itotal * 0.08) % 1.0
      const pt = getPointOnPath(mixedLayout.mainB, progress)
      return <circle key={`mix-mb-${idx}`} cx={pt.x} cy={pt.y} r={3.2} fill={PHYSICS_COLORS.electricCurrent} />
    })

    return [...mainACharges, ...branch1Charges, ...branch2Charges, ...mainBCharges]
  }

  // ==================== 绘制各物理实体 SVG 子组件 ====================

  // 1. 直流稳压电源
  const renderBattery = (x: number, y: number) => {
    return (
      <DCSource type="instrument" x={x} y={y} voltage={U} label="CONSTANT DC" polarity="right-positive" />
    )
  }

  // 2. 高考标准电阻器符号
  const renderResistor = (x: number, y: number, label: string, resistance: number) => {
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* 电阻器符号 (高考标准矩形框) */}
        <rect
          x={-18}
          y={-9}
          width={36}
          height={18}
          fill={SCENE_COLORS.circuit.resistorFill}
          stroke={SCENE_COLORS.circuit.resistorStroke}
          strokeWidth={2}
        />
        {/* 电阻标号 R1 / R3 */}
        <text x={0} y={4} fill={colors.neutral[800]} fontSize={font(9.5)} fontWeight="bold" textAnchor="middle">
          {label.split(' ')[0]}
        </text>
        {/* 下方阻值标注 */}
        <text x={0} y={22} fill={PHYSICS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">
          {label} = {resistance}Ω
        </text>
      </g>
    )
  }



  // ==================== 渲染函数入口 ====================

  const renderCircuit = () => {
    // 根据电流值控制发光线宽与亮度
    const getWireStyle = (current: number) => {
      const w = 2.5 + Math.min(3.5, current * 2.5)
      // 随着电流增大颜色逐渐变红发光
      const factor = Math.min(1, current / 1.0)
      const color = factor > 0.05 ? PHYSICS_COLORS.electricCurrent : PHYSICS_COLORS.labelTextLight
      return {
        stroke: color,
        strokeWidth: w,
        fill: 'none',
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        style: {
          transition: 'stroke 250ms ease, stroke-width 250ms ease',
          filter: factor > 0.1 ? `drop-shadow(0 0 ${factor * 3}px ${PHYSICS_COLORS.electricCurrent})` : 'none',
        },
      }
    }

    const inactiveWireStyle = {
      stroke: PHYSICS_COLORS.axis,
      strokeWidth: 1.5,
      fill: 'none',
      strokeDasharray: '2,2',
    }

    if (mode === 0) {
      if (subMode === 0) {
        // ── 1. 基础：串联电路 ──
        const l = seriesLayout
        return (
          <g>
            {/* 导线回路 */}
            <path d="M 80,180 L 80,80 L 230,80 M 270,80 L 410,80 M 470,80 L 570,80 L 570,180 M 570,180 L 570,280 L 80,280 L 80,180" {...getWireStyle(Itotal)} />
            
            {/* 电压表并联引线 (无电流) */}
            <path d="M 390,80 L 390,30 L 412,30 M 468,30 L 490,30 L 490,80" {...inactiveWireStyle} />
            <circle cx={390} cy={80} r={3} fill={PHYSICS_COLORS.labelText} />
            <circle cx={490} cy={80} r={3} fill={PHYSICS_COLORS.labelText} />

            {/* 粒子动画 */}
            {renderSeriesCharges()}

            {/* 电学元件 */}
            {renderBattery(l.batteryCenter.x, l.batteryCenter.y)}
            {renderResistor(l.r1Center.x, l.r1Center.y, 'R₁', R1)}
            <Rheostat x={l.r2Center.x} y={l.r2Center.y} value={R2} min={0} max={100} label="R₂ (变)" width={120} />

            {/* 表盘仪表 */}
            <DialMeter type="V" value={U2} max={12} x={l.voltmeterCenter.x} y={l.voltmeterCenter.y} />
            <DialMeter type="A" value={Itotal} max={1.5} x={l.ammeterCenter.x} y={l.ammeterCenter.y} />
          </g>
        )
      } else {
        // ── 2. 基础：并联电路 ──
        const l = parallelLayout
        return (
          <g>
            {/* 导线干路 A */}
            <path d="M 80,180 L 80,80 L 190,80 M 190,80 L 290,80" {...getWireStyle(Itotal)} />
            {/* 导线干路 B */}
            <path d="M 490,80 L 570,80 L 570,280 L 80,280 L 80,180" {...getWireStyle(Itotal)} />
            
            {/* 支路 1 (R1) */}
            <path d="M 290,80 L 290,130 L 370,130 M 410,130 L 490,130 L 490,80" {...getWireStyle(I1)} />
            {/* 支路 2 (R2) */}
            <path d="M 290,80 L 290,230 L 340,230 M 440,230 L 490,230 L 490,80" {...getWireStyle(I2)} />

            {/* 并联分流节点 */}
            <circle cx={290} cy={80} r={4.5} fill={PHYSICS_COLORS.labelText} />
            <circle cx={490} cy={80} r={4.5} fill={PHYSICS_COLORS.labelText} />

            {/* 电压表并联引线 */}
            <path d="M 340,230 L 340,300 L 362,300 M 418,300 L 440,300 L 440,230" {...inactiveWireStyle} />
            <circle cx={340} cy={230} r={3} fill={PHYSICS_COLORS.labelText} />
            <circle cx={440} cy={230} r={3} fill={PHYSICS_COLORS.labelText} />

            {/* 粒子动画 */}
            {renderParallelCharges()}

            {/* 电学元件 */}
            {renderBattery(l.batteryCenter.x, l.batteryCenter.y)}
            {renderResistor(l.r1Center.x, l.r1Center.y, 'R₁', R1)}
            <Rheostat x={l.r2Center.x} y={l.r2Center.y} value={R2} min={0} max={100} label="R₂ (变)" width={120} />

            {/* 表盘仪表 */}
            <DialMeter type="V" value={U2} max={12} x={l.voltmeterCenter.x} y={l.voltmeterCenter.y} />
            <DialMeter type="A" value={Itotal} max={1.5} x={l.ammeterCenter.x} y={l.ammeterCenter.y} />
          </g>
        )
      }
    } else {
      // ── 3. 进阶：混联电路 ──
      const l = mixedLayout
      return (
        <g>
          {/* 干路 A (含 R1 与 电流表) */}
          <path d="M 80,180 L 80,80 L 180,80 M 220,80 L 320,80 M 320,80 L 410,80" {...getWireStyle(Itotal)} />
          {/* 干路 B */}
          <path d="M 580,80 L 580,280 L 80,280 L 80,180" {...getWireStyle(Itotal)} />
          
          {/* 支路 1 (R2，变阻器) */}
          <path d="M 410,80 L 410,130 L 440,130 M 540,130 L 580,130 L 580,80" {...getWireStyle(I2)} />
          {/* 支路 2 (R3，定值电阻) */}
          <path d="M 410,80 L 410,240 L 470,240 M 510,240 L 580,240 L 580,80" {...getWireStyle(I3)} />

          {/* 并联分流节点 */}
          <circle cx={410} cy={80} r={4.5} fill={PHYSICS_COLORS.labelText} />
          <circle cx={580} cy={80} r={4.5} fill={PHYSICS_COLORS.labelText} />

          {/* 电压表并联引线 */}
          <path d="M 440,130 L 440,30 L 462,30 M 518,30 L 540,30 L 540,130" {...inactiveWireStyle} />
          <circle cx={440} cy={130} r={3} fill={PHYSICS_COLORS.labelText} />
          <circle cx={540} cy={130} r={3} fill={PHYSICS_COLORS.labelText} />

          {/* 粒子动画 */}
          {renderMixedCharges()}

          {/* 电学元件 */}
          {renderBattery(l.batteryCenter.x, l.batteryCenter.y)}
          {renderResistor(l.r1Center.x, l.r1Center.y, 'R₁', R1)}
          <Rheostat x={l.r2Center.x} y={l.r2Center.y} value={R2} min={0} max={100} label="R₂ (变)" width={120} />
          {renderResistor(l.r3Center.x, l.r3Center.y, 'R₃', R3)}

          {/* 表盘仪表 */}
          <DialMeter type="V" value={U2} max={12} x={l.voltmeterCenter.x} y={l.voltmeterCenter.y} />
          <DialMeter type="A" value={Itotal} max={1.5} x={l.ammeterCenter.x} y={l.ammeterCenter.y} />
        </g>
      )
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center p-2 relative">
      <svg
        viewBox="0 0 650 360"
        className="w-full h-full bg-white rounded-xl shadow-inner border border-neutral-100"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 绘制主体电路 */}
        {renderCircuit()}
      </svg>
      
      {/* 浮动简易标注 (展示当前总阻值和总电流，营造精密测量感) */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg border border-neutral-150 shadow-sm px-3 py-1.5 pointer-events-none">
        <div style={{ fontSize: font(9) }} className="font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
          电路状态参量
        </div>
        <div className="flex flex-col gap-0.5 min-w-[100px]">
          <div style={{ fontSize: font(10) }} className="flex items-center justify-between">
            <span className="text-neutral-500">等效总电阻</span>
            <span className="font-bold text-neutral-700 font-mono">{Rtotal.toFixed(2)} Ω</span>
          </div>
          <div style={{ fontSize: font(10) }} className="flex items-center justify-between">
            <span className="text-neutral-500">干路总电流</span>
            <span className="font-bold text-red-600 font-mono">{Itotal.toFixed(3)} A</span>
          </div>
          <div style={{ fontSize: font(10) }} className="flex items-center justify-between">
            <span className="text-neutral-500">电压表读数</span>
            <span className="font-bold text-amber-600 font-mono">{U2.toFixed(2)} V</span>
          </div>
        </div>
      </div>
    </div>
  )
}
