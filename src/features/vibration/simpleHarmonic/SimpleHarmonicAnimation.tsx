import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, ENERGY_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { EnergyBars } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useSHMAnimation } from './hooks/useSHMAnimation'
import { HorizontalSpringScene } from './components/HorizontalSpringScene'
import { VerticalSpringScene } from './components/VerticalSpringScene'

export default function SimpleHarmonicAnimation() {
  const {
    time, showVectors, showFormulas,
    A, mass, k, omega, phase, x, v, a,
    isVertical, showEnergy,
    T, energy, showGraph, showHelper,
  } = useSHMAnimation()

  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
  const { font } = canvasSize

  // 共享场景布局
  const sceneX0 = vp.visibleX + vp.visibleW * 0.05
  const sceneX1 = vp.visibleX + vp.visibleW * 0.56
  const sceneW = sceneX1 - sceneX0

  // 能量分配（能量守恒分析模式 2）
  const energyItems = [
    {
      key: 'kinetic',
      label: '动能 Eₖ',
      value: energy.kinetic,
      color: ENERGY_COLORS.kineticEnergy,
      displayValue: `${energy.kinetic.toFixed(2)} J`,
    },
    {
      key: 'potential',
      label: '弹性势能 Eₚ',
      value: energy.potential,
      color: ENERGY_COLORS.potentialElastic,
      displayValue: `${energy.potential.toFixed(2)} J`,
    },
    {
      key: 'total',
      label: '总机械能 E',
      value: energy.total,
      color: ENERGY_COLORS.mechanicalEnergy,
      displayValue: `${energy.total.toFixed(2)} J`,
    },
  ]
  const energyX = vp.visibleX + vp.visibleW * 0.6
  const energyY = vp.visibleY + vp.visibleH * 0.58
  const energyW = vp.visibleW * 0.36
  const energyH = vp.visibleH * 0.34

  const smallFs = font(11)

  return (
    <div className="w-full h-full relative">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-slate-50 rounded-lg shadow-inner">
        {/* ── 渲染分支 A：水平弹簧振子 ── */}
        {!isVertical && (
          <HorizontalSpringScene
            vp={vp} font={font} x={x} v={v} a={a}
            A={A} omega={omega} phase={phase} time={time} mass={mass}
            showVectors={showVectors} showGraph={showGraph} showHelper={showHelper}
            sceneX0={sceneX0} sceneX1={sceneX1} sceneW={sceneW}
          />
        )}

        {/* ── 渲染分支 B：竖直弹簧振子 ── */}
        {isVertical && (
          <VerticalSpringScene
            vp={vp} font={font} x={x}
            A={A} omega={omega} phase={phase} time={time} mass={mass}
            k={k}
            showVectors={showVectors} showGraph={showGraph} sceneW={sceneW}
          />
        )}

        {/* ── 统一部分 ────────────────────────────────────────────────────── */}
        <g fontFamily={CANVAS_STYLE.FONT.family} fontSize={smallFs} transform={`translate(0, 0)`}>
          <rect x={sceneX0} y={vp.visibleY + 10} width={260} height={26} rx={4} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1} />
          <circle cx={sceneX0 + 12} cy={vp.visibleY + 23} r={4.5} fill={PHYSICS_COLORS.displacement} />
          <text x={sceneX0 + 22} y={vp.visibleY + 27} fill={colors.neutral[600]}>
            位移 x/y
          </text>
          <circle cx={sceneX0 + 96} cy={vp.visibleY + 23} r={4.5} fill={PHYSICS_COLORS.velocity} />
          <text x={sceneX0 + 106} y={vp.visibleY + 27} fill={colors.neutral[600]}>
            速度 v
          </text>
          <circle cx={sceneX0 + 176} cy={vp.visibleY + 23} r={4.5} fill={PHYSICS_COLORS.acceleration} />
          <text x={sceneX0 + 186} y={vp.visibleY + 27} fill={colors.neutral[600]}>
            加速度 a/F_回
          </text>
        </g>

        {/* 动态公式看板 */}
        {showFormulas && (
          <text
            x={sceneX0}
            y={vp.visibleY + vp.visibleH - 12}
            fontSize={font(12)}
            fill={colors.neutral[500]}
            fontFamily={CANVAS_STYLE.FONT.family}
          >
            运动方程: x = A·cos(ωt + φ) | 周期: T = 2π√(m/k) = {T.toFixed(2)}s | ω = {omega.toFixed(2)} rad/s
          </text>
        )}
      </AnimationSvgCanvas>

      {/* 能量柱（HTML 层，无 foreignObject） */}
      {showEnergy && (
        <div
          className="absolute"
          style={{ left: energyX, top: energyY, width: energyW, height: energyH }}
        >
          <EnergyBars
            items={energyItems}
            initialEtot={energy.total}
            title="机械能分配与守恒 (J)"
            font={font}
            compact
          />
        </div>
      )}
    </div>
  )
}
