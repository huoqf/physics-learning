import { useMemo } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { RelationChart } from '@/components/Chart'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { useNuclearDecayPhysics, DECAY_CHARGES } from './hooks/useNuclearDecayPhysics'
import { NuclearDecayScene } from './components/NuclearDecayScene'

// 模式1专属：三种放射线穿透与电离本领的对比柱状图组件
const IonizationPenetrationChart: React.FC<{ font: (size: number) => number }> = ({ font }) => {
  return (
    <div className="w-full h-full flex items-center justify-around bg-neutral-50 rounded-lg border border-neutral-200/60 p-4">
      {/* 1. 电离本领柱状图 */}
      <div className="flex flex-col items-center w-[45%] h-full">
        <div className="text-neutral-700 fontSize-[13px] font-bold mb-2">⚡ 相对电离能力 (α &gt; β &gt; γ)</div>
        <svg className="w-full flex-1" viewBox="0 0 300 180">
          <defs>
            <linearGradient id="alphaBarGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PHYSICS_COLORS.accelerationY} />
              <stop offset="100%" stopColor={PHYSICS_COLORS.photonInfrared} />
            </linearGradient>
            <linearGradient id="betaBarGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PHYSICS_COLORS.velocityY} />
              <stop offset="100%" stopColor={PHYSICS_COLORS.velocity} />
            </linearGradient>
            <linearGradient id="gammaBarGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PHYSICS_COLORS.photon} />
              <stop offset="100%" stopColor={PHYSICS_COLORS.wavelength} />
            </linearGradient>
          </defs>

          <line x1={30} y1={20} x2={290} y2={20} stroke={CANVAS_COLORS.gridSubtle} strokeWidth={0.5} strokeDasharray="3,3" />
          <line x1={30} y1={80} x2={290} y2={80} stroke={CANVAS_COLORS.gridSubtle} strokeWidth={0.5} strokeDasharray="3,3" />
          <line x1={30} y1={140} x2={290} y2={140} stroke={CANVAS_COLORS.gridSubtle} strokeWidth={0.5} strokeDasharray="3,3" />
          
          <text x={24} y={24} fill={CANVAS_COLORS.textMuted} fontSize={font(9)} textAnchor="end">极强</text>
          <text x={24} y={84} fill={CANVAS_COLORS.textMuted} fontSize={font(9)} textAnchor="end">中等</text>
          <text x={24} y={144} fill={CANVAS_COLORS.textMuted} fontSize={font(9)} textAnchor="end">极弱</text>

          <rect x={55} y={20} width={36} height={130} fill="url(#alphaBarGrad1)" rx={4} />
          <text x={73} y={15} fill={PHYSICS_COLORS.photonInfrared} fontSize={font(10)} textAnchor="middle" fontWeight="bold">α (约10⁴)</text>

          <rect x={135} y={75} width={36} height={75} fill="url(#betaBarGrad1)" rx={4} />
          <text x={153} y={70} fill={PHYSICS_COLORS.velocity} fontSize={font(10)} textAnchor="middle" fontWeight="bold">β (约10²)</text>

          <rect x={215} y={142} width={36} height={8} fill="url(#gammaBarGrad1)" rx={2} />
          <text x={233} y={137} fill={PHYSICS_COLORS.wavelength} fontSize={font(10)} textAnchor="middle" fontWeight="bold">γ (1)</text>

          <line x1={30} y1={150} x2={290} y2={150} stroke={CANVAS_COLORS.axis} strokeWidth={1} />
          <text x={73} y={166} fill={CANVAS_COLORS.labelText} fontSize={font(10)} textAnchor="middle" fontWeight="bold">α 射线</text>
          <text x={153} y={166} fill={CANVAS_COLORS.labelText} fontSize={font(10)} textAnchor="middle" fontWeight="bold">β 射线</text>
          <text x={233} y={166} fill={CANVAS_COLORS.labelText} fontSize={font(10)} textAnchor="middle" fontWeight="bold">γ 射线</text>
        </svg>
      </div>

      <div className="h-[80%] w-[1px] bg-neutral-200" />

      {/* 2. 穿透本领柱状图 */}
      <div className="flex flex-col items-center w-[45%] h-full">
        <div className="text-neutral-700 fontSize-[13px] font-bold mb-2">🛡️ 相对穿透能力 (γ &gt; β &gt; α)</div>
        <svg className="w-full flex-1" viewBox="0 0 300 180">
          <defs>
            <linearGradient id="alphaBarGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PHYSICS_COLORS.accelerationY} />
              <stop offset="100%" stopColor={PHYSICS_COLORS.photonInfrared} />
            </linearGradient>
            <linearGradient id="betaBarGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PHYSICS_COLORS.velocityY} />
              <stop offset="100%" stopColor={PHYSICS_COLORS.velocity} />
            </linearGradient>
            <linearGradient id="gammaBarGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PHYSICS_COLORS.photon} />
              <stop offset="100%" stopColor={PHYSICS_COLORS.wavelength} />
            </linearGradient>
          </defs>

          <line x1={30} y1={20} x2={290} y2={20} stroke={CANVAS_COLORS.gridSubtle} strokeWidth={0.5} strokeDasharray="3,3" />
          <line x1={30} y1={80} x2={290} y2={80} stroke={CANVAS_COLORS.gridSubtle} strokeWidth={0.5} strokeDasharray="3,3" />
          <line x1={30} y1={140} x2={290} y2={140} stroke={CANVAS_COLORS.gridSubtle} strokeWidth={0.5} strokeDasharray="3,3" />

          <text x={24} y={24} fill={CANVAS_COLORS.textMuted} fontSize={font(9)} textAnchor="end">极强</text>
          <text x={24} y={84} fill={CANVAS_COLORS.textMuted} fontSize={font(9)} textAnchor="end">中等</text>
          <text x={24} y={144} fill={CANVAS_COLORS.textMuted} fontSize={font(9)} textAnchor="end">极弱</text>

          <rect x={55} y={146} width={36} height={4} fill="url(#alphaBarGrad2)" rx={1} />
          <text x={73} y={141} fill={PHYSICS_COLORS.photonInfrared} fontSize={font(10)} textAnchor="middle" fontWeight="bold">一张纸阻挡</text>

          <rect x={135} y={75} width={36} height={75} fill="url(#betaBarGrad2)" rx={4} />
          <text x={153} y={70} fill={PHYSICS_COLORS.velocity} fontSize={font(10)} textAnchor="middle" fontWeight="bold">数毫米铝板</text>

          <rect x={215} y={20} width={36} height={130} fill="url(#gammaBarGrad2)" rx={4} />
          <text x={233} y={15} fill={PHYSICS_COLORS.wavelength} fontSize={font(10)} textAnchor="middle" fontWeight="bold">数厘米铅板</text>

          <line x1={30} y1={150} x2={290} y2={150} stroke={CANVAS_COLORS.axis} strokeWidth={1} />
          <text x={73} y={166} fill={CANVAS_COLORS.labelText} fontSize={font(10)} textAnchor="middle" fontWeight="bold">α 射线</text>
          <text x={153} y={166} fill={CANVAS_COLORS.labelText} fontSize={font(10)} textAnchor="middle" fontWeight="bold">β 射线</text>
          <text x={233} y={166} fill={CANVAS_COLORS.labelText} fontSize={font(10)} textAnchor="middle" fontWeight="bold">γ 射线</text>
        </svg>
      </div>
    </div>
  )
}



export default function NuclearDecayAnimation() {
  // ── 1. Zustand Store ──
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  // ── 2. Viewport ──
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  // ── 3. 参数解构 ──
  const mode = params.mode ?? 0
  const nuclide = params.nuclide ?? 3
  const nucleonDistance = params.nucleonDistance ?? 1.2
  const fieldType = params.fieldType ?? 0
  const bField = params.bField ?? 1.5
  const eField = params.eField ?? 5.0
  const initVelocity = params.initVelocity ?? 4.0
  const showObstacles = params.showObstacles ?? 0
  const decayType = params.decayType ?? 0

  // ── 4. 物理计算 (无条件调用 hooks) ──
  const physics = useNuclearDecayPhysics({
    mode,
    nuclide,
    nucleonDistance,
    fieldType,
    bField,
    eField,
    initVelocity,
    showObstacles,
    decayType,
    time,
  })

  // ── 5. SceneScale (无条件调用 hooks) ──
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'viewport',
    originSource: 'center',
    physicsWidth: 10.0,
    physicsHeight: 6.5,
  })

  // ── 6. 曲线生成 (用于 RelationChart) ──
  const forceCurvePoints = useMemo(() => {
    const pts = []
    for (let r = 0.4; r <= 3.5; r += 0.05) {
      const F = 20 * (Math.exp(-2.5 * (r - 0.8)) - Math.exp(-1.2 * (r - 0.8)))
      pts.push({ x: r, y: F })
    }
    return pts
  }, [])

  // 模式2专属：轨迹半径与核电荷反比关系曲线 R = p/(|q|B) ∝ 1/|q|
  //
  // 横坐标取真实电荷量绝对值 |q|（单位 e）；纵轴以「新核半径 = 1」归一化，
  // 于是微粒散点的 y 值恰等于半径比本身（α → 45，β → 7），
  // 图上两点的高度比与右屏文案 R_微粒 : R_新核 数值完全一致，不再出现
  // 「图里 4.5 : 1、文案 45 : 1」这类两处各自写死导致的漂移。
  // 电荷量一律取自 DECAY_CHARGES 唯一真源。
  const decayCharges = decayType === 0 ? DECAY_CHARGES.alpha : DECAY_CHARGES.beta
  const radiusChart = useMemo(() => {
    const { particle, daughter } = decayCharges
    const ratio = daughter / particle
    const isAlpha = decayType === 0

    // R(|q|) = daughter / |q|：从微粒电荷量（半径最大）采样到新核电荷量（半径最小）
    const curve: { x: number; y: number }[] = []
    const step = Math.max(0.05, (daughter - particle) / 240)
    for (let q = particle; q <= daughter + 1e-9; q += step) {
      curve.push({ x: q, y: daughter / q })
    }

    return {
      ratio,
      curve,
      // x 轴右侧留 50% 余量：既避免反冲核标签被 SVG 视口裁掉，也让新核散点不贴边框
      xDomain: [0, daughter * 1.5] as [number, number],
      yDomain: [0, ratio * 1.15] as [number, number],
      markers: [
        {
          axis: 'point' as const,
          x: particle,
          y: ratio,
          label: `${isAlpha ? 'α 粒子' : 'β 粒子'} |q|=${particle}e`,
          color: isAlpha ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge,
        },
        {
          axis: 'point' as const,
          x: daughter,
          y: 1,
          label: `${isAlpha ? '反冲钍核' : '反冲氮核'} |q|=${daughter}e`,
          color: PHYSICS_COLORS.appliedForce,
        },
      ],
    }
  }, [decayCharges, decayType])

  // ── 7. 渲染 ──
  return (
    <div className="w-full h-full flex flex-col gap-2 p-1">
      {/* 上半屏：图表展示区 (flex-1 min-h-0 自适应，严禁写死固定高度) */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {mode === 0 ? (
          <RelationChart
            points={forceCurvePoints}
            xLabel="距离 r (fm)"
            yLabel="相互作用力 F (定性)"
            title="强相互作用力与距离关系曲线 (Yukawa 势拟合)"
            xDomain={[0.4, 3.5]}
            yDomain={[-6.0, 16.0]}
            showZeroLine={true}
            cursorX={nucleonDistance}
            cursorLabel={(x, y) => `r = ${x.toFixed(2)} fm, F = ${y.toFixed(1)}`}
            markers={[
              { x: 0.8, label: '强相互作用力平衡点 (r ≈ 0.8 fm)', color: PHYSICS_COLORS.amplitude },
              { x: 2.5, label: '超出强力射程 (r > 2.5 fm)', color: PHYSICS_COLORS.alertRed },
            ]}
            color={PHYSICS_COLORS.work}
            strokeWidth={2}
          />
        ) : mode === 1 ? (
          <IonizationPenetrationChart font={canvasSize.font} />
        ) : (
          <RelationChart
            points={radiusChart.curve}
            xLabel="核电荷量绝对值 |q| (e)"
            yLabel="轨迹半径 R (以新核为 1)"
            title={`匀强磁场衰变径迹半径与电荷反比曲线 R ∝ 1/|q| — ${decayType === 0 ? 'α 衰变 (外切圆)' : 'β 衰变 (内切圆)'}`}
            xDomain={radiusChart.xDomain}
            yDomain={radiusChart.yDomain}
            showGrid={true}
            markers={radiusChart.markers}
            series="primary"
          />
        )}
      </div>

      {/* 下半屏：动画画布区 */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-neutral-200/60 overflow-hidden relative">
        {/* 电磁场参数标签浮层 (仅在偏转模式下) */}
        {mode === 1 && fieldType !== 2 && (
          <div className="absolute top-2 left-2 z-10 bg-slate-900/90 text-slate-200 fontSize-[11px] px-2 py-1 rounded border border-slate-700/80 font-mono shadow">
            {fieldType === 0 ? (
              <span>外加磁场 B = <span className="text-emerald-400 font-bold">{bField.toFixed(1)} T</span></span>
            ) : (
              <span>外加电场 E = <span className="text-amber-400 font-bold">{eField.toFixed(1)} kV/m</span></span>
            )}
          </div>
        )}

        {mode === 2 && (
          <div className="absolute top-2 left-2 z-10 bg-slate-900/90 text-slate-200 fontSize-[11px] px-2 py-1 rounded border border-slate-700/80 font-mono shadow flex gap-3">
            <span>垂直纸面向里磁场 B = <span className="text-emerald-400 font-bold">{bField.toFixed(1)} T</span></span>
            <span>切向几何：<span className={decayType === 0 ? "text-amber-400 font-bold" : "text-sky-400 font-bold"}>{decayType === 0 ? "外切圆 (α 衰变)" : "内切圆 (β 衰变)"}</span></span>
          </div>
        )}

        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <NuclearDecayScene
            mode={mode}
            nuclide={nuclide}
            nucleonDistance={nucleonDistance}
            fieldType={fieldType}
            bField={bField}
            eField={eField}
            showObstacles={showObstacles}
            time={time}
            physics={physics}
            canvasSize={canvasSize}
            sceneScale={sceneScale}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
