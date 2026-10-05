import { useMemo } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { RelationChart } from '@/components/Chart'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { useNuclearDecayPhysics } from './hooks/useNuclearDecayPhysics'
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

// 模式2专属：静止核在匀强磁场中衰变径迹理论解析卡片
const MagneticDecayAnalysisCard: React.FC<{ decayType: number }> = ({ decayType }) => {
  const isAlpha = decayType === 0

  return (
    <div className="w-full h-full bg-slate-900 text-slate-100 rounded-lg border border-slate-700/80 p-4 flex flex-col justify-between overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-extrabold text-sm">🎯 高考压轴模型</span>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
            {isAlpha ? 'α 衰变 (外切圆轨迹)' : 'β 衰变 (内切圆轨迹)'}
          </span>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {isAlpha ? '²³⁸₉₂U → ²³⁴₉₀Th + ⁴₂He' : '¹⁴₆C → ¹⁴₇N + ⁰₋₁e'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 my-2 text-xs">
        <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700">
          <div className="text-sky-400 font-bold mb-1">① 动量守恒定理</div>
          <div className="font-mono text-slate-200">p₁ = p₂ = p</div>
          <div className="text-slate-400 text-[11px] mt-1">静止母核衰变裂解，反冲核与放射微粒动量等大反向。</div>
        </div>

        <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700">
          <div className="text-emerald-400 font-bold mb-1">② 轨迹半径与电荷反比</div>
          <div className="font-mono text-slate-200">R = p / (|q|B) ∝ 1 / |q|</div>
          <div className="text-slate-400 text-[11px] mt-1">
            {isAlpha
              ? 'R_α : R_Th = 90 : 2 = 45 : 1 (α 粒子半径极大)'
              : 'R_β : R_N = 7 : 1 (β 粒子外侧大圆)'}
          </div>
        </div>

        <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700">
          <div className="text-amber-400 font-bold mb-1">③ 轨迹几何切向判定</div>
          <div className="font-mono text-slate-200">
            {isAlpha ? '同种电荷反向受力 → 外切圆' : '异种电荷同向受力 → 内切圆'}
          </div>
          <div className="text-slate-400 text-[11px] mt-1">
            {isAlpha
              ? '两粒子均带正电，洛伦兹力指向切线相反侧。'
              : '一正一负，速度相反导致洛伦兹力指向同侧。'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded border border-slate-800 text-[11px] text-slate-300">
        <div>
          <span className="text-rose-400 font-bold">动能分配规律：</span>
          <span className="font-mono ml-1">E_k = p² / (2m) ∝ 1 / m</span>
          <span className="text-slate-400 ml-2">（质量极小的衰变微粒分得绝大部分动能）</span>
        </div>
        <div className="text-slate-400 font-mono">
          {isAlpha ? 'E_kα : E_kTh = 234 : 4 ≈ 58.5 : 1' : 'E_kβ : E_kN ≈ 25000 : 1'}
        </div>
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

  // ── 7. 渲染 ──
  return (
    <div className="w-full h-full flex flex-col gap-2 p-1">
      {/* 上半屏：图表与理论解析展示区 */}
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
              { x: 0.8, label: '强相互作用力平衡点 (r ≈ 0.8 fm)', color: PHYSICS_COLORS.amplitude },
              { x: 2.5, label: '超出强力射程 (r > 2.5 fm)', color: PHYSICS_COLORS.alertRed },
            ]}
            color={PHYSICS_COLORS.work}
            strokeWidth={2}
          />
        ) : mode === 1 ? (
          <IonizationPenetrationChart font={canvasSize.font} />
        ) : (
          <MagneticDecayAnalysisCard decayType={decayType} />
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
