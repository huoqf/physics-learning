import { useEffect, useRef, useState } from 'react'
import { useCanvasSize, useAnimationFrame } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { calculateCapacitor } from '@/physics'
import { PHYSICS_COLORS, EM_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { Card } from '@/components/UI'

// 物理常数定义 (SI)
const EPS0 = 8.854e-12

// 断开电源时保持的电荷基准（默认状态 S=100cm² d=5mm εᵣ=1 U=12V 充电后的电荷量）
const Q_FIXED = EPS0 * (100 * 1e-4) / (5 * 1e-3) * 12

// 粒子分布参考最大值
const C_MAX = EPS0 * 5 * (200 * 1e-4) / (2 * 1e-3) * 1e12
const Q_MAX = C_MAX * 12

// SVG 设计坐标系常量（对应 CANVAS_PRESETS.full）
const DESIGN_WIDTH = 700
const DESIGN_HEIGHT = 650

// 布局比例常量
const LAYOUT = {
  cxRatio: 0.35,    // 电容器中心 X 比例
  exRatio: 0.78,    // 静电计中心 X 比例
  gapMin: 30,       // 板距像素下限
  gapMax: 150,      // 板距像素上限
  gapScale: 15,     // d → px 缩放因子
  plateWMin: 90,
  plateWMax: 240,
  plateWScale: 1.1,
  plateThick: 12,
} as const

export default function Capacitor() {
  const { params, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      showVectors: s.showVectors,
    }))
  )

  // 容器尺寸（方式A：无 overlay）
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const { font } = canvasSize

  const { S = 100, d = 5, epsilon_r = 1, U = 12, connected = 1 } = params
  const isConnected = connected >= 0.5
  const hasDielectric = epsilon_r > 1.5

  // ---- 物理计算 ----
  const { C } = calculateCapacitor(EPS0 * epsilon_r, S * 1e-4, d * 1e-3)
  const voltage = isConnected ? U : Q_FIXED / C
  const charge = isConnected ? C * voltage : Q_FIXED

  // 转换成 pC
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

  // ---- 画布几何布局（使用设计坐标系）----
  const cx = DESIGN_WIDTH * LAYOUT.cxRatio
  const cy = DESIGN_HEIGHT / 2

  const gapPx = Math.max(LAYOUT.gapMin, Math.min(LAYOUT.gapMax, d * LAYOUT.gapScale))
  const plateW = Math.max(LAYOUT.plateWMin, Math.min(LAYOUT.plateWMax, S * LAYOUT.plateWScale))
  const plateThick = LAYOUT.plateThick
  const topPlateY = cy - gapPx / 2
  const botPlateY = cy + gapPx / 2
  const plateLeft = cx - plateW / 2
  const plateRight = cx + plateW / 2

  // 静电计几何中心
  const ex = DESIGN_WIDTH * LAYOUT.exRatio
  const ey = cy

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

  return (
    <div ref={containerRef} className="w-full h-full">
      <Card className="w-full h-full overflow-hidden relative">
        <svg
          viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full bg-white select-none"
        >
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
              fill={SCENE_COLORS.circuit.capacitorPlate}
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
          <text x={plateLeft + 10} y={topPlateY - 6} fontSize={font(12)} fill={PHYSICS_COLORS.positiveCharge} fontWeight="bold" textAnchor="start">
            上极板 (+Q)
          </text>

          {/* 下极板 */}
          <rect x={plateLeft} y={botPlateY} width={plateW} height={plateThick} fill={PHYSICS_COLORS.negativeCharge} rx={2} className="shadow-sm" />
          <text x={plateLeft + 10} y={botPlateY + plateThick + 16} fontSize={font(12)} fill={PHYSICS_COLORS.negativeCharge} fontWeight="bold" textAnchor="start">
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
          <text x={plateRight + 22} y={cy + 4} fontSize={font(11)} fill={PHYSICS_COLORS.labelText} fontWeight="medium">
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

                <text x={bx - 20} y={cy + 4} fontSize={font(11)} fill={PHYSICS_COLORS.labelText} textAnchor="end" fontWeight="bold">
                  接通电源
                </text>
                <text x={bx - 20} y={cy + 16} fontSize={font(9.5)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">
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

                <text x={bx - 20} y={cy + 4} fontSize={font(11)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontWeight="bold">
                  电源断开
                </text>
                <text x={bx - 20} y={cy + 16} fontSize={font(9.5)} fill={PHYSICS_COLORS.positiveCharge} textAnchor="end" fontWeight="medium">
                  Q 锁定守恒
                </text>
              </g>
            )}
          </g>

          {/* 静电计绘制 */}
          <g>
            {/* 圆环外壳 */}
            <circle cx={ex} cy={ey} r={55} fill="none" stroke={CANVAS_COLORS.textMuted} strokeWidth={3.5} className="shadow-sm" />
            <circle cx={ex} cy={ey} r={52} fill={CANVAS_COLORS.objectFillNeutral} />

            {/* 底座地线 */}
            <rect x={ex - 12} y={ey + 55} width={24} height={8} fill={CANVAS_COLORS.textMuted} rx={1} />
            <line x1={ex} y1={ey + 63} x2={ex} y2={ey + 82} stroke={CANVAS_COLORS.textMuted} strokeWidth={2} />
            <line x1={ex - 10} y1={ey + 82} x2={ex + 10} y2={ey + 82} stroke={CANVAS_COLORS.textMuted} strokeWidth={2} />
            <line x1={ex - 6} y1={ey + 86} x2={ex + 6} y2={ey + 86} stroke={CANVAS_COLORS.textMuted} strokeWidth={2} />
            <line x1={ex - 2} y1={ey + 90} x2={ex + 2} y2={ey + 90} stroke={CANVAS_COLORS.textMuted} strokeWidth={2} />

            {/* 内部直金属杆 */}
            <line x1={ex} y1={ey - 75} x2={ex} y2={ey + 42} stroke={CANVAS_COLORS.labelTextLight} strokeWidth={3.5} strokeLinecap="round" />
            <circle cx={ex} cy={ey - 75} r={8.5} fill={CANVAS_COLORS.strokeDark} />

            {/* 刻度弧 */}
            <path
              d={`M ${ex + 44 * Math.sin(0)} ${ey + 44 * Math.cos(0)} A 44 44 0 0 1 ${ex + 44 * Math.sin(65 * Math.PI / 180)} ${ey + 44 * Math.cos(65 * Math.PI / 180)}`}
              fill="none"
              stroke={CANVAS_COLORS.axis}
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
            <circle cx={ex} cy={ey} r={4.5} fill={CANVAS_COLORS.labelText} />

            <text x={ex} y={ey - 22} fontSize={font(9.5)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">
              指针式静电计
            </text>
            <text x={ex} y={ey - 8} fontSize={font(9)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">
              (测量板间电势差 U)
            </text>

            {/* 电势差数值 */}
            <text x={ex} y={ey + 20} fontSize={font(11)} fill={EM_COLORS.electricPotential} fontWeight="bold" textAnchor="middle" className="font-mono">
              U = {voltage.toFixed(1)} V
            </text>

            {/* 极板到静电计连线 */}
            <path
              d={`M ${plateRight} ${topPlateY + plateThick / 2} L ${ex - 40} ${topPlateY + plateThick / 2} L ${ex - 40} ${ey - 75} L ${ex - 8.5} ${ey - 75}`}
              fill="none"
              stroke={CANVAS_COLORS.textMuted}
              strokeWidth={1.5}
            />
            <path
              d={`M ${plateRight} ${botPlateY + plateThick / 2} L ${ex - 55} ${botPlateY + plateThick / 2} L ${ex - 55} ${ey}`}
              fill="none"
              stroke={CANVAS_COLORS.textMuted}
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
  )
}
