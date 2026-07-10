import { useMemo } from 'react'
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { DialMeter, DCSource, Rheostat } from '@/components/Physics'
import { calculateCircuitAnalysis } from '@/physics'
import {
  buildSeriesLayout,
  buildParallelLayout,
  buildMixedLayout,
  SERIES_PATHS,
  PARALLEL_PATHS,
  MIXED_PATHS,
} from './circuit-analysis/model/circuitAnalysisLayout'

/**
 * 串并联电路及电路动态分析主动画
 * 支持：基础串联、基础并联、进阶混联
 *
 * 使用 CANVAS_PRESETS.splitV (840×325) 适配上下分屏布局。
 */
export default function CircuitAnalysis() {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  // 参数配置
  const mode = params.mode ?? 0
  const subMode = params.subMode ?? 0
  const R1 = params.R1 ?? 20
  const R2 = params.R2 ?? 10
  const R3 = params.R3 ?? 30
  const U = params.U ?? 12
  const isSymbolic = params.isSymbolic === 1

  // 物理计算
  const { Itotal, U2, I1, I2, I3 } = useMemo(
    () => calculateCircuitAnalysis(mode, subMode, R1, R2, R3, U),
    [mode, subMode, R1, R2, R3, U]
  )

  // 布局定义
  const seriesLayout = useMemo(() => buildSeriesLayout(), [])
  const parallelLayout = useMemo(() => buildParallelLayout(), [])
  const mixedLayout = useMemo(() => buildMixedLayout(), [])

  // ==================== 导线样式（参考 OhmLaw：灰色底色 + 铜芯线）====================

  const getWireStyle = (current: number) => {
    const w = 2 + Math.min(3, current * 2)
    const factor = Math.min(1, current / 1.0)
    const color = factor > 0.05 ? PHYSICS_COLORS.trackHistory : PHYSICS_COLORS.grid
    const pulse = 0.6 + 0.4 * Math.sin(time * 4)
    const glowRadius = factor > 0.1 ? factor * 3 * pulse : 0
    return {
      stroke: color,
      strokeWidth: w,
      fill: 'none',
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      style: {
        transition: 'stroke 250ms ease, stroke-width 250ms ease',
        filter: glowRadius > 0.1 ? `drop-shadow(0 0 ${glowRadius}px ${PHYSICS_COLORS.trackHistory})` : 'none',
      },
    }
  }

  // 电压表引线样式：实线导线（非虚线），灰色
  const voltmeterWireStyle = {
    stroke: PHYSICS_COLORS.trackHistory,
    strokeWidth: 2,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  // ==================== 绘制各物理实体 SVG 子组件 ====================

  const renderBattery = (x: number, y: number) => {
    if (isSymbolic) {
      // 符号模式：手绘电池符号
      // 电池中心 (x, y)=(100,125)
      // 正极长线 x=22, y∈[-10,10]，引线从 y=10 延伸到顶轨 y=40 (local: -85)
      // 负极短线 x=-22, y∈[-6,6]，引线从 y=6 延伸到底轨 y=290 (local: 165)
      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* 正极引出线：从符号底部 (22,10) 到顶轨 (22,-85) */}
          <line x1={22} y1={10} x2={22} y2={-85} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />
          {/* 正极：长细线 */}
          <line x1={22} y1={-10} x2={22} y2={10} stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={1.5} />
          {/* 负极：短粗线 */}
          <line x1={-22} y1={-6} x2={-22} y2={6} stroke={PHYSICS_COLORS.labelText} strokeWidth={4} />
          {/* 负极引出线：从符号底部 (-22,6) 到底轨 (-22,165) */}
          <line x1={-22} y1={6} x2={-22} y2={165} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />
          {/* 标注 */}
          <text x={0} y={-15} fill={PHYSICS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">
            E, r
          </text>
        </g>
      )
    }
    return (
      <DCSource
        type="instrument"
        x={x}
        y={y}
        voltage={U}
        label="CONSTANT DC"
        polarity="right-positive"
      />
    )
  }

  const renderResistor = (x: number, y: number, label: string, resistance: number) => (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={-18}
        y={-9}
        width={36}
        height={18}
        fill={SCENE_COLORS.circuit.resistorFill}
        stroke={SCENE_COLORS.circuit.resistorStroke}
        strokeWidth={2}
      />
      <text x={0} y={4} fill={colors.neutral[800]} fontSize={font(9.5)} fontWeight="bold" textAnchor="middle">
        {label.split(' ')[0]}
      </text>
      <text x={0} y={22} fill={PHYSICS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">
        {label} = {resistance}Ω
      </text>
    </g>
  )

  // ==================== 渲染函数入口 ====================

  const renderCircuit = () => {
    if (mode === 0) {
      if (subMode === 0) {
        // ── 1. 基础：串联电路 ──
        const l = seriesLayout
        return (
          <g>
            <path d={SERIES_PATHS.mainLoop} {...getWireStyle(Itotal)} />
            {/* 电压表引线（实线导线） */}
            <path d={SERIES_PATHS.voltmeterLead} {...voltmeterWireStyle} />
            <circle cx={437} cy={120} r={3} fill={PHYSICS_COLORS.labelText} />
            <circle cx={563} cy={120} r={3} fill={PHYSICS_COLORS.labelText} />
            {renderBattery(l.batteryCenter.x, l.batteryCenter.y)}
            {renderResistor(l.r1Center.x, l.r1Center.y, 'R₁', R1)}
            <Rheostat x={l.r2Center.x} y={l.r2Center.y} value={R2} min={0} max={100} label="R₂ (变)" width={120} variant={isSymbolic ? 'symbolic' : 'realistic'} />
            <DialMeter type="V" value={U2} max={12} x={l.voltmeterCenter.x} y={l.voltmeterCenter.y} />
            <DialMeter type="A" value={Itotal} max={1.5} x={l.ammeterCenter.x} y={l.ammeterCenter.y} />
          </g>
        )
      } else {
        // ── 2. 基础：并联电路 ──
        const l = parallelLayout
        return (
          <g>
            <path d={PARALLEL_PATHS.mainA} {...getWireStyle(Itotal)} />
            <path d={PARALLEL_PATHS.mainB} {...getWireStyle(Itotal)} />
            <path d={PARALLEL_PATHS.branch1} {...getWireStyle(I1)} />
            <path d={PARALLEL_PATHS.branch2} {...getWireStyle(I2)} />
            {/* 分流/汇合节点 */}
            <circle cx={400} cy={40} r={4.5} fill={PHYSICS_COLORS.labelText} />
            <circle cx={700} cy={40} r={4.5} fill={PHYSICS_COLORS.labelText} />
            <circle cx={487} cy={110} r={3} fill={PHYSICS_COLORS.labelText} />
            <circle cx={613} cy={110} r={3} fill={PHYSICS_COLORS.labelText} />
            {renderBattery(l.batteryCenter.x, l.batteryCenter.y)}
            {renderResistor(l.r1Center.x, l.r1Center.y, 'R₁', R1)}
            <Rheostat x={l.r2Center.x} y={l.r2Center.y} value={R2} min={0} max={100} label="R₂ (变)" width={120} variant={isSymbolic ? 'symbolic' : 'realistic'} />
            <DialMeter type="V" value={U2} max={12} x={l.voltmeterCenter.x} y={l.voltmeterCenter.y} />
            <DialMeter type="A" value={Itotal} max={1.5} x={l.ammeterCenter.x} y={l.ammeterCenter.y} />
          </g>
        )
      }
    } else {
      // ─ 3. 进阶：混联电路 ─
      const l = mixedLayout
      return (
        <g>
          <path d={MIXED_PATHS.mainA} {...getWireStyle(Itotal)} />
          <path d={MIXED_PATHS.mainB} {...getWireStyle(Itotal)} />
          <path d={MIXED_PATHS.branch1} {...getWireStyle(I2)} />
          <path d={MIXED_PATHS.branch2} {...getWireStyle(I3)} />
          <circle cx={380} cy={120} r={4.5} fill={PHYSICS_COLORS.labelText} />
          <circle cx={620} cy={120} r={4.5} fill={PHYSICS_COLORS.labelText} />
          <circle cx={417} cy={120} r={3} fill={PHYSICS_COLORS.labelText} />
          <circle cx={543} cy={120} r={3} fill={PHYSICS_COLORS.labelText} />
          {renderBattery(l.batteryCenter.x, l.batteryCenter.y)}
          {renderResistor(l.r1Center.x, l.r1Center.y, 'R₁', R1)}
          <Rheostat x={l.r2Center.x} y={l.r2Center.y} value={R2} min={0} max={100} label="R₂ (变)" width={120} variant={isSymbolic ? 'symbolic' : 'realistic'} />
          {renderResistor(l.r3Center.x, l.r3Center.y, 'R₃', R3)}
          <DialMeter type="V" value={U2} max={12} x={l.voltmeterCenter.x} y={l.voltmeterCenter.y} />
          <DialMeter type="A" value={Itotal} max={1.5} x={l.ammeterCenter.x} y={l.ammeterCenter.y} />
        </g>
      )
    }
  }

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      {renderCircuit()}
    </AnimationSvgCanvas>
  )
}
