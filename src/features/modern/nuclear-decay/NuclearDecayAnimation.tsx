import { useMemo } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { RelationChart } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'
import { useNuclearDecayPhysics } from './hooks/useNuclearDecayPhysics'
import { NuclearDecayScene } from './components/NuclearDecayScene'

// 模式1专属：三种放射线穿透与电离本领的对比柱状图组件
const IonizationPenetrationChart: React.FC<{ font: (size: number) => number }> = ({ font }) => {
  return (
    <div className="w-full h-full flex items-center justify-around bg-slate-900/40 rounded-lg border border-slate-700/50 p-4">
      {/* 1. 电离本领柱状图 */}
      <div className="flex flex-col items-center w-[45%] h-full">
        <div className="text-slate-300 fontSize-[13px] font-bold mb-2">⚡ 相对电离能力 (α &gt; β &gt; γ)</div>
        <svg className="w-full flex-1" viewBox="0 0 300 180">
          <line x1={30} y1={20} x2={290} y2={20} stroke="#475569" strokeWidth={0.5} strokeDasharray="3,3" />
          <line x1={30} y1={80} x2={290} y2={80} stroke="#475569" strokeWidth={0.5} strokeDasharray="3,3" />
          <line x1={30} y1={140} x2={290} y2={140} stroke="#475569" strokeWidth={0.5} strokeDasharray="3,3" />
          
          <text x={24} y={24} fill="#94A3B8" fontSize={font(9)} textAnchor="end">极强</text>
          <text x={24} y={84} fill="#94A3B8" fontSize={font(9)} textAnchor="end">中等</text>
          <text x={24} y={144} fill="#94A3B8" fontSize={font(9)} textAnchor="end">极弱</text>

          <rect x={55} y={20} width={36} height={130} fill="url(#alphaBarGrad)" rx={4} />
          <text x={73} y={15} fill={PHYSICS_COLORS.white} fontSize={font(10)} textAnchor="middle" fontWeight="bold">α (约10⁴)</text>

          <rect x={135} y={75} width={36} height={75} fill="url(#betaBarGrad)" rx={4} />
          <text x={153} y={70} fill={PHYSICS_COLORS.white} fontSize={font(10)} textAnchor="middle" fontWeight="bold">β (约10²)</text>

          <rect x={215} y={142} width={36} height={8} fill="url(#gammaBarGrad)" rx={2} />
          <text x={233} y={137} fill={PHYSICS_COLORS.white} fontSize={font(10)} textAnchor="middle" fontWeight="bold">γ (1)</text>

          <line x1={30} y1={150} x2={290} y2={150} stroke="#94A3B8" strokeWidth={1} />
          <text x={73} y={166} fill="#CBD5E1" fontSize={font(10)} textAnchor="middle">α 射线</text>
          <text x={153} y={166} fill="#CBD5E1" fontSize={font(10)} textAnchor="middle">β 射线</text>
          <text x={233} y={166} fill="#CBD5E1" fontSize={font(10)} textAnchor="middle">γ 射线</text>
        </svg>
      </div>

      <div className="h-[80%] w-[1px] bg-slate-700/50" />

      {/* 2. 穿透本领柱状图 */}
      <div className="flex flex-col items-center w-[45%] h-full">
        <div className="text-slate-300 fontSize-[13px] font-bold mb-2">🛡️ 相对穿透能力 (γ &gt; β &gt; α)</div>
        <svg className="w-full flex-1" viewBox="0 0 300 180">
          <line x1={30} y1={20} x2={290} y2={20} stroke="#475569" strokeWidth={0.5} strokeDasharray="3,3" />
          <line x1={30} y1={80} x2={290} y2={80} stroke="#475569" strokeWidth={0.5} strokeDasharray="3,3" />
          <line x1={30} y1={140} x2={290} y2={140} stroke="#475569" strokeWidth={0.5} strokeDasharray="3,3" />

          <text x={24} y={24} fill="#94A3B8" fontSize={font(9)} textAnchor="end">极强</text>
          <text x={24} y={84} fill="#94A3B8" fontSize={font(9)} textAnchor="end">中等</text>
          <text x={24} y={144} fill="#94A3B8" fontSize={font(9)} textAnchor="end">极弱</text>

          <rect x={55} y={146} width={36} height={4} fill="url(#alphaBarGrad)" rx={1} />
          <text x={73} y={141} fill={PHYSICS_COLORS.white} fontSize={font(10)} textAnchor="middle" fontWeight="bold">一张纸</text>

          <rect x={135} y={75} width={36} height={75} fill="url(#betaBarGrad)" rx={4} />
          <text x={153} y={70} fill={PHYSICS_COLORS.white} fontSize={font(10)} textAnchor="middle" fontWeight="bold">数毫米铝板</text>

          <rect x={215} y={20} width={36} height={130} fill="url(#gammaBarGrad)" rx={4} />
          <text x={233} y={15} fill={PHYSICS_COLORS.white} fontSize={font(10)} textAnchor="middle" fontWeight="bold">数厘米铅板</text>

          <line x1={30} y1={150} x2={290} y2={150} stroke="#94A3B8" strokeWidth={1} />
          <text x={73} y={166} fill="#CBD5E1" fontSize={font(10)} textAnchor="middle">α 射线</text>
          <text x={153} y={166} fill="#CBD5E1" fontSize={font(10)} textAnchor="middle">β 射线</text>
          <text x={233} y={166} fill="#CBD5E1" fontSize={font(10)} textAnchor="middle">γ 射线</text>

          <defs>
            <linearGradient id="alphaBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F87171" />
              <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
            <linearGradient id="betaBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="gammaBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
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

  // ── 7. 渲染 ──
  return (
    <div className="w-full h-full flex flex-col gap-2 p-1">
      {/* 上半屏：图表展示区 */}
      <div className="h-[310px] shrink-0 w-full overflow-hidden">
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
              { x: 0.8, label: '强相互作用力平衡点 (r ≈ 0.8 fm)', color: '#10B981' },
              { x: 2.5, label: '超出强力射程 (r > 2.5 fm)', color: '#EF4444' },
            ]}
            color={PHYSICS_COLORS.work}
            strokeWidth={2}
          />
        ) : (
          <IonizationPenetrationChart font={canvasSize.font} />
        )}
      </div>

      {/* 下半屏：动画画布区 */}
      <div className="flex-1 min-h-0 bg-slate-950/65 rounded-lg border border-slate-800/80 overflow-hidden relative">
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
