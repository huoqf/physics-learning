import { useEffect, useRef, useState } from 'react'
import { useCanvasSize, useAnimationFrame } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { calculateCapacitor } from '@/physics'
import { PHYSICS_COLORS, EM_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { Card } from '@/components/UI'

// 物理常数定义 (SI)
const EPS0 = 8.854e-12

// 断开电源时保持的电荷基准（默认状态 S=100cm² d=5mm εᵣ=1 U=12V 充电后的电荷量）
const Q_FIXED = EPS0 * (100 * 1e-4) / (5 * 1e-3) * 12

// 联动柱状图的最大参考值（用于折算 0% - 100% 柱高）
const C_MAX = EPS0 * 5 * (200 * 1e-4) / (2 * 1e-3) * 1e12  // 约 442.7 pF
const Q_MAX = C_MAX * 12                                   // 约 5312.4 pC
const U_MAX = 48.0                                         // 约 48 V (断开时电量锁定，最窄最疏时电压)
const E_MAX = 12.0 / (2 * 1e-3)                             // 6000 V/m

export default function Capacitor() {
  const { params, showVectors, showFormulas } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      showVectors: s.showVectors,
      showFormulas: s.showFormulas,
    }))
  )

  // 底部动画 SVG 容器的自适应尺寸 Hook
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.tall)
  const { font } = canvasSize

  const { S = 100, d = 5, epsilon_r = 1, U = 12, connected = 1 } = params
  const isConnected = connected >= 0.5
  const hasDielectric = epsilon_r > 1.5

  // ---- 物理计算 ----
  const { C } = calculateCapacitor(EPS0 * epsilon_r, S * 1e-4, d * 1e-3)
  const voltage = isConnected ? U : Q_FIXED / C
  const charge = isConnected ? C * voltage : Q_FIXED
  const field = voltage / (d * 1e-3) // E = U/d (V/m)

  // 转换成 pF, pC
  const cPF = C * 1e12
  const qPC = charge * 1e12

  // ---- 电荷回流/充电动画状态 ----
  const [isFlowing, setIsFlowing] = useState(false)
  const [flowDirection, setFlowDirection] = useState(1) // 1: 充电, -1: 回流
  const [flowTime, setFlowTime] = useState(0)
  const prevChargeRef = useRef(charge)
  const lastActiveTime = useRef(0)

  useEffect(() => {
    const diff = charge - prevChargeRef.current
    if (Math.abs(diff) > 1e-13) {
      const dir = diff > 0 ? 1 : -1
      setFlowDirection(dir)
      setIsFlowing(true)
      lastActiveTime.current = performance.now()
      prevChargeRef.current = charge
    }
  }, [charge])

  useAnimationFrame((deltaMs) => {
    setFlowTime(t => t + deltaMs / 1000)
    // 超过 800ms 无电量变化，停止粒子流动
    if (performance.now() - lastActiveTime.current > 800) {
      setIsFlowing(false)
    }
  }, { playing: isFlowing })

  // ---- 100% 自适应画布几何布局 (去除任何 Y 轴写死常数) ----
  const cx = canvasSize.width * 0.35   // 电容器中心点横向自适应比例 (偏左)
  const cy = canvasSize.height / 2    // 电容器和静电计的垂直中心正好在 SVG 的中心，随高度拉伸自适应

  const gapPx = Math.max(30, Math.min(150, d * 15))    // 板距映射像素 30 - 150
  const plateW = Math.max(90, Math.min(240, S * 1.1))  // 板宽映射像素 90 - 240
  const plateThick = 12
  const topPlateY = cy - gapPx / 2
  const botPlateY = cy + gapPx / 2
  const plateLeft = cx - plateW / 2
  const plateRight = cx + plateW / 2

  // 静电计几何中心
  const ex = canvasSize.width * 0.78  // 约 546
  const ey = cy                       // 与电容器保持在同一自适应中线上

  // ---- 粒子分布计算 ----
  const particleRatio = Math.max(0, Math.min(1.0, qPC / Q_MAX))
  const numParticles = Math.max(2, Math.min(10, Math.round(particleRatio * 8) + 2))

  const particles = Array.from({ length: numParticles }, (_, i) => {
    const px = numParticles > 1
      ? plateLeft + 10 + (i * (plateW - 20)) / (numParticles - 1)
      : cx
    return px
  })

  // ---- 静电计偏转角计算 ----
  const pointerAngle = Math.min(65, Math.pow(voltage / 28.0, 0.7) * 65)

  // ---- 导线上的流动粒子路径自适应生成 ----
  const bx = plateLeft - 60
  const drawFlowingParticles = () => {
    if (!isFlowing || !isConnected) return null

    const speed = 2.5
    const dotsCount = 3
    const dots = []

    for (let i = 0; i < dotsCount; i++) {
      let phase = (flowTime * speed + i * 0.33) % 1.0
      if (flowDirection === -1) {
        phase = 1.0 - phase
      }

      let px = 0
      let py = 0
      const totalLen = (cy - 6 - (topPlateY + plateThick / 2)) + (plateLeft - bx)
      const verticalLen = cy - 6 - (topPlateY + plateThick / 2)
      const borderPhase = verticalLen / totalLen

      if (phase < borderPhase) {
        const p = phase / borderPhase
        px = bx
        py = (cy - 6) - p * verticalLen
      } else {
        const p = (phase - borderPhase) / (1 - borderPhase)
        px = bx + p * (plateLeft - bx)
        py = topPlateY + plateThick / 2
      }

      dots.push(
        <circle
          key={`f-dot-${i}`}
          cx={px}
          cy={py}
          r={3}
          fill={PHYSICS_COLORS.positiveCharge}
          className="shadow-sm"
          opacity={0.8}
        />
      )
    }
    return dots
  }

  // ---- 联动柱状图相对比例百分比 ----
  const pctC = Math.max(2, Math.min(100, (cPF / C_MAX) * 100))
  const pctQ = Math.max(2, Math.min(100, (qPC / Q_MAX) * 100))
  const pctU = Math.max(2, Math.min(100, (voltage / U_MAX) * 100))
  const pctE = Math.max(2, Math.min(100, (field / E_MAX) * 100))

  // ---- 联动柱状图的 HTML Bar 渲染器 ----
  const renderChartBar = (
    symbol: string,
    valueStr: string,
    unit: string,
    percentage: number,
    label: string,
    gradientClass: string,
    textClass: string
  ) => {
    return (
      <div className="flex flex-col items-center justify-end h-full z-10 w-20">
        {/* 实时值与单位 */}
        <span className={`font-mono font-bold ${textClass} mb-1 transition-all duration-150`} style={{ fontSize: font(10.5) }}>
          {valueStr} <span className="text-neutral-400 font-normal" style={{ fontSize: font(8.5) }}>{unit}</span>
        </span>
        {/* 柱状条背景槽与渐变填充 */}
        <div className="w-6 h-[56px] bg-neutral-100 rounded-md overflow-hidden flex items-end shadow-inner border border-neutral-200/40">
          <div
            className={`w-full ${gradientClass} rounded-t-sm transition-all duration-200 ease-out`}
            style={{ height: `${percentage}%` }}
          />
        </div>
        {/* 物理量符号与物理名称 */}
        <span className={`text-xs font-bold font-mono mt-1 leading-none ${textClass}`}>{symbol}</span>
        <span className="text-neutral-400 mt-0.5 leading-none" style={{ fontSize: font(9.5) }}>{label}</span>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col gap-3 p-3 bg-neutral-50 overflow-hidden">
      {/* 1. 顶部物理量相对百分比联动柱状图 (HTML 极简卡片卡槽设计，响应式高度) */}
      <Card className="h-[135px] shrink-0 p-3 flex flex-col justify-between relative overflow-hidden">
        {/* 柱状图头部信息 */}
        <div className="flex justify-between items-center z-10">
          <span className="text-xs font-semibold text-neutral-600">物理量相对百分比联动柱状图 (0% - 100%)</span>
          <span className="text-neutral-400 font-medium font-mono" style={{ fontSize: font(10) }}>
            S = {S} cm² | d = {d.toFixed(1)} mm | {epsilon_r > 1.5 ? '电介质 (εᵣ=5.0)' : '真空环境 (εᵣ=1.0)'}
          </span>
        </div>

        {/* 柱状图主体刻度及渲染 */}
        <div className="flex-1 flex justify-around items-end pt-3 pb-0.5 relative">
          {/* 背景纵向百分比虚线 */}
          <div className="absolute inset-x-0 top-3 border-t border-dashed border-neutral-100 flex justify-between px-2 text-neutral-300 pointer-events-none" style={{ fontSize: font(8.5) }}>
            <span>100%</span>
          </div>
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-neutral-100 flex justify-between px-2 text-neutral-300 pointer-events-none" style={{ fontSize: font(8.5) }}>
            <span>50%</span>
          </div>
          <div className="absolute inset-x-0 bottom-1 border-b border-dashed border-neutral-100 flex justify-between px-2 text-neutral-300 pointer-events-none" style={{ fontSize: font(8.5) }}>
            <span>0%</span>
          </div>

          {/* 四联并排柱 */}
          {renderChartBar('C', cPF.toFixed(1), 'pF', pctC, '电容', 'bg-gradient-to-t from-sky-600 to-sky-400', 'text-sky-600')}
          {renderChartBar('Q', qPC.toFixed(1), 'pC', pctQ, '电量', 'bg-gradient-to-t from-red-600 to-red-400', 'text-red-600')}
          {renderChartBar('U', voltage.toFixed(1), 'V', pctU, '电压', 'bg-gradient-to-t from-amber-700 to-amber-500', 'text-amber-700')}
          {renderChartBar('E', Math.round(field).toString(), 'V/m', pctE, '场强', 'bg-gradient-to-t from-amber-600 to-yellow-500', 'text-amber-600')}
        </div>
      </Card>

      {/* 2. 底部模拟动画区域 (SVG 容器，利用 flex-1 高度完全自适应) */}
      <div ref={containerRef} className="flex-1 min-h-0">
      <Card className="h-full overflow-hidden relative">
        {/* 顶部悬浮的教学卡片 (HTML绝对定位，干净美观且不遮挡极板) */}
        {showFormulas && (
          <div className="absolute left-4 top-4 z-10 bg-white/95 backdrop-blur-sm border border-neutral-100 rounded-xl p-3 shadow-md w-48 text-xs leading-relaxed transition-all">
            <h4 className="font-bold text-neutral-700 mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-3 rounded-full bg-primary-600"></span>
              实验当前状态
            </h4>
            <div className="space-y-1 text-neutral-500 font-medium">
              <p>板间介质: <span className="text-neutral-700">{epsilon_r > 1.5 ? '玻璃 (εᵣ = 5.0)' : '空气 (εᵣ = 1.0)'}</span></p>
              <p>正对面积: <span className="text-neutral-700 font-mono">{S} cm²</span></p>
              <p>极板间距: <span className="text-neutral-700 font-mono">{d.toFixed(1)} mm</span></p>
            </div>
            <div className={`mt-2 pt-2 border-t border-neutral-100 flex items-center gap-1.5 font-bold ${isConnected ? 'text-red-500' : 'text-amber-600'}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-red-500 animate-pulse' : 'bg-amber-600'}`}></span>
              {isConnected ? '电源接通: U 恒定' : '电源断开: Q 恒定'}
            </div>
          </div>
        )}

        <svg width={canvasSize.width} height={canvasSize.height} className="w-full h-full bg-white select-none">
          {/* 匀强电场线 (密度和根数直接绑定电荷粒子) */}
          {showVectors && particles.map((px, i) => (
            <g key={`E-line-${i}`}>
              <line
                x1={px}
                y1={topPlateY + plateThick}
                x2={px}
                y2={botPlateY}
                stroke={PHYSICS_COLORS.electricField}
                strokeWidth={1.5}
                strokeDasharray="5,4"
                markerEnd="url(#arrow-cap-E)"
                opacity={0.65}
              />
            </g>
          ))}

          {/* 电介质填充滑块 (CSS Transition 滑动) */}
          <g>
            <rect
              x={plateLeft}
              y={topPlateY + plateThick}
              width={plateW}
              height={gapPx - plateThick}
              fill={SCENE_COLORS.circuit.capacitorPlate} // 介质青
              fillOpacity={0.25}
              stroke={SCENE_COLORS.circuit.capacitorSt}
              strokeWidth={1.5}
              strokeDasharray="4,2"
              rx={3}
              style={{
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), height 0.1s ease-out, y 0.1s ease-out, width 0.1s ease-out',
                transform: hasDielectric ? 'translateX(0)' : `translateX(-${plateW + 40}px)`,
              }}
            />
            {/* 电介质标签 */}
            <text
              x={plateLeft - (plateW + 40) / 2}
              y={cy + 4}
              fontSize={font(10)}
              fontWeight="semibold"
              fill={SCENE_COLORS.circuit.capacitorSt}
              textAnchor="middle"
              style={{
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), y 0.1s ease-out',
                transform: hasDielectric ? `translateX(${plateW + 40}px)` : 'translateX(0)',
              }}
            >
              类玻璃介质
            </text>
          </g>

          {/* 上极板 */}
          <rect x={plateLeft} y={topPlateY} width={plateW} height={plateThick} fill={PHYSICS_COLORS.positiveCharge} rx={2} className="shadow-sm" />
          <text x={plateLeft + 10} y={topPlateY - 6} fontSize="12" fill={PHYSICS_COLORS.positiveCharge} fontWeight="bold" textAnchor="start">
            上极板 (+Q)
          </text>

          {/* 下极板 */}
          <rect x={plateLeft} y={botPlateY} width={plateW} height={plateThick} fill={PHYSICS_COLORS.negativeCharge} rx={2} className="shadow-sm" />
          <text x={plateLeft + 10} y={botPlateY + plateThick + 16} fontSize="12" fill={PHYSICS_COLORS.negativeCharge} fontWeight="bold" textAnchor="start">
            下极板 (−Q)
          </text>

          {/* 板上电荷粒子 */}
          {particles.map((px, i) => (
            <g key={`p-particles-${i}`}>
              {/* 正电荷 (+) */}
              <circle cx={px} cy={topPlateY + plateThick + 6} r={4.5} fill={PHYSICS_COLORS.positiveCharge} />
              <text x={px} y={topPlateY + plateThick + 9} fontSize={font(8)} textAnchor="middle" fill="white" fontWeight="bold">+</text>

              {/* 负电荷 (-) */}
              <circle cx={px} cy={botPlateY - 6} r={4.5} fill={PHYSICS_COLORS.negativeCharge} />
              <text x={px} y={botPlateY - 3} fontSize={font(8)} textAnchor="middle" fill="white" fontWeight="bold">-</text>
            </g>
          ))}

          {/* 板间距标尺 */}
          <line
            x1={plateRight + 15}
            y1={topPlateY + plateThick}
            x2={plateRight + 15}
            y2={botPlateY}
            stroke={PHYSICS_COLORS.axis}
            strokeWidth={1}
            markerStart="url(#tick-cap)"
            markerEnd="url(#tick-cap)"
          />
          <text x={plateRight + 22} y={cy + 4} fontSize="11" fill={PHYSICS_COLORS.labelText} fontWeight="medium">
            d = {d.toFixed(1)} mm
          </text>

          {/* 电源与连线 */}
          <g>
            {/* 上极板左侧出线 */}
            <line x1={plateLeft} y1={topPlateY + plateThick / 2} x2={bx} y2={topPlateY + plateThick / 2} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />
            <line x1={bx} y1={topPlateY + plateThick / 2} x2={bx} y2={isConnected ? cy - 18 : cy - 26} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />

            {/* 下极板左侧出线 */}
            <line x1={plateLeft} y1={botPlateY + plateThick / 2} x2={bx} y2={botPlateY + plateThick / 2} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />
            <line x1={bx} y1={botPlateY + plateThick / 2} x2={bx} y2={cy + 18} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />

            {/* 导线上流动的电荷粒子 */}
            {drawFlowingParticles()}

            {/* 电池与开关 */}
            {isConnected ? (
              <g>
                <line x1={bx - 12} y1={cy - 18} x2={bx + 12} y2={cy - 18} stroke={PHYSICS_COLORS.positiveCharge} strokeWidth={3.5} />
                <line x1={bx - 6} y1={cy - 6} x2={bx + 6} y2={cy - 6} stroke={PHYSICS_COLORS.positiveCharge} strokeWidth={1.5} />
                <line x1={bx - 12} y1={cy + 6} x2={bx + 12} y2={cy + 6} stroke={PHYSICS_COLORS.negativeCharge} strokeWidth={3.5} />
                <line x1={bx - 6} y1={cy + 18} x2={bx + 6} y2={cy + 18} stroke={PHYSICS_COLORS.negativeCharge} strokeWidth={1.5} />

                <line x1={bx} y1={cy - 26} x2={bx} y2={cy - 18} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />
                <circle cx={bx} cy={cy - 26} r={2} fill={PHYSICS_COLORS.labelText} />

                <text x={bx - 20} y={cy + 4} fontSize="11" fill={PHYSICS_COLORS.labelText} textAnchor="end" fontWeight="bold">
                  接通电源
                </text>
                <text x={bx - 20} y={cy + 16} fontSize="9.5" fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">
                  U = 12 V 恒定
                </text>
              </g>
            ) : (
              <g>
                <line x1={bx} y1={cy - 18} x2={bx} y2={cy - 26} stroke={PHYSICS_COLORS.axis} strokeWidth={2} />
                <line x1={bx} y1={cy - 26} x2={bx + 10} y2={cy - 38} stroke={PHYSICS_COLORS.labelText} strokeWidth={2.5} />
                <circle cx={bx} cy={cy - 26} r={2.5} fill={PHYSICS_COLORS.labelText} />
                <circle cx={bx} cy={cy - 18} r={2.5} fill={PHYSICS_COLORS.labelText} />

                <line x1={bx} y1={cy - 14} x2={bx} y2={cy + 14} stroke={PHYSICS_COLORS.grid} strokeWidth={2} strokeDasharray="3,3" />

                <text x={bx - 20} y={cy + 4} fontSize="11" fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontWeight="bold">
                  电源断开
                </text>
                <text x={bx - 20} y={cy + 16} fontSize="9.5" fill={PHYSICS_COLORS.positiveCharge} textAnchor="end" fontWeight="medium">
                  Q 锁定守恒
                </text>
              </g>
            )}
          </g>

          {/* 静电计绘制 */}
          <g>
            {/* 圆环外壳 */}
            <circle cx={ex} cy={ey} r={55} fill="none" stroke={colors.neutral[500]} strokeWidth={3.5} className="shadow-sm" />
            <circle cx={ex} cy={ey} r={52} fill={colors.neutral[50]} />

            {/* 底座地线 */}
            <rect x={ex - 12} y={ey + 55} width={24} height={8} fill={colors.neutral[500]} rx={1} />
            <line x1={ex} y1={ey + 63} x2={ex} y2={ey + 82} stroke={colors.neutral[500]} strokeWidth={2} />
            <line x1={ex - 10} y1={ey + 82} x2={ex + 10} y2={ey + 82} stroke={colors.neutral[500]} strokeWidth={2} />
            <line x1={ex - 6} y1={ey + 86} x2={ex + 6} y2={ey + 86} stroke={colors.neutral[500]} strokeWidth={2} />
            <line x1={ex - 2} y1={ey + 90} x2={ex + 2} y2={ey + 90} stroke={colors.neutral[500]} strokeWidth={2} />

            {/* 内部直金属杆 */}
            <line x1={ex} y1={ey - 75} x2={ex} y2={ey + 42} stroke={colors.neutral[600]} strokeWidth={3.5} strokeLinecap="round" />
            <circle cx={ex} cy={ey - 75} r={8.5} fill={colors.neutral[700]} />

            {/* 刻度弧 */}
            <path
              d={`M ${ex + 44 * Math.sin(0)} ${ey + 44 * Math.cos(0)} A 44 44 0 0 1 ${ex + 44 * Math.sin(65 * Math.PI / 180)} ${ey + 44 * Math.cos(65 * Math.PI / 180)}`}
              fill="none"
              stroke={colors.neutral[300]}
              strokeWidth={1.5}
              strokeDasharray="2,2"
            />
            {/* 刻度标记 */}
            {[0, 15, 30, 45, 60].map((angleVal, i) => {
              const rad = angleVal * Math.PI / 180
              const x1 = ex + 42 * Math.sin(rad)
              const y1 = ey + 42 * Math.cos(rad)
              const x2 = ex + 47 * Math.sin(rad)
              const y2 = ey + 47 * Math.cos(rad)
              return (
                <line key={`tick-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={CANVAS_COLORS.trackHistory} strokeWidth={1.2} />
              )
            })}

            {/* 旋转金属指针 (CSS Transition 阻尼旋转) */}
            <line
              x1={ex}
              y1={ey}
              x2={ex}
              y2={ey + 46}
              stroke={SCENE_COLORS.circuit.meterNeedle}
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{
                transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                transformOrigin: `${ex}px ${ey}px`,
                transform: `rotate(${pointerAngle}deg)`,
              }}
            />
            <circle cx={ex} cy={ey} r={4.5} fill={colors.neutral[800]} />

            <text x={ex} y={ey - 22} fontSize="9.5" fill={colors.neutral[600]} textAnchor="middle" fontWeight="bold">
              指针式静电计
            </text>
            <text x={ex} y={ey - 8} fontSize="9" fill={colors.neutral[400]} textAnchor="middle">
              (测量板间电势差 U)
            </text>

            {/* 电势差数值 */}
            <text x={ex} y={ey + 20} fontSize="11" fill={EM_COLORS.electricPotential} fontWeight="bold" textAnchor="middle" className="font-mono">
              U = {voltage.toFixed(1)} V
            </text>

            {/* 极板到静电计连线 */}
            <path
              d={`M ${plateRight} ${topPlateY + plateThick / 2} L ${ex - 40} ${topPlateY + plateThick / 2} L ${ex - 40} ${ey - 75} L ${ex - 8.5} ${ey - 75}`}
              fill="none"
              stroke={colors.neutral[500]}
              strokeWidth={1.5}
            />
            <path
              d={`M ${plateRight} ${botPlateY + plateThick / 2} L ${ex - 55} ${botPlateY + plateThick / 2} L ${ex - 55} ${ey}`}
              fill="none"
              stroke={colors.neutral[500]}
              strokeWidth={1.5}
              strokeDasharray="4,2"
              opacity={0.8}
            />
          </g>

          {/* 渐变定义 Defs */}
          <defs>
            {/* 场线方向标注，非物理矢量（虚线场线，VectorArrow 不支持 strokeDasharray），不适用铁律 1d */}
            <marker id="arrow-cap-E" markerWidth="7" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 7 3, 0 6" fill={PHYSICS_COLORS.electricField} />
            </marker>
            {/* 几何标注（板间距刻度），非物理矢量，不适用铁律 1d */}
            <marker id="tick-cap" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <line x1={0} y1={3} x2={6} y2={3} stroke={PHYSICS_COLORS.axis} strokeWidth={1.5} />
            </marker>
          </defs>
        </svg>
      </Card>
      </div>
    </div>
  )
}
