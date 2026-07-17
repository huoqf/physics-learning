import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { RelationChart } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'
import { NUCLIDES } from './model/constants'
import { useNuclearReactionPhysics } from './hooks/useNuclearReactionPhysics'
import { NuclearReactionScene } from './components/NuclearReactionScene'

export default function NuclearReactionAnimation() {
  // ── 1. Zustand Store ──
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  // ── 2. Viewport ──
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV, // 水平展开，上图下动画
  })

  // ── 3. 参数解构 ──
  const mode = params.mode ?? 0
  const nuclide = params.nuclide ?? 3
  const showMassDefectWeight = params.showMassDefectWeight ?? 0
  const reactionType = params.reactionType ?? 0

  // ── 4. 物理计算 ──
  const physics = useNuclearReactionPhysics({
    mode,
    nuclide,
    showMassDefectWeight,
    reactionType,
    time,
  })

  // ── 5. SceneScale ──
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'viewport',
    originSource: 'center',
    physicsWidth: 10.0,
    physicsHeight: 6.5,
  })

  const currentNuclide = NUCLIDES[nuclide] ?? NUCLIDES[3]

  // ── 6. 根据不同模式定制图表的标记点 (markers) ──
  const chartMarkers = (() => {
    if (mode === 0) {
      return [
        {
          axis: 'point' as const,
          x: physics.currentPointOnCurve.x,
          y: physics.currentPointOnCurve.y,
          label: `${currentNuclide.name} (E_avg = ${physics.currentPointOnCurve.y.toFixed(2)} MeV)`,
          color: PHYSICS_COLORS.alertRed,
        },
      ]
    } else {
      if (reactionType === 0) {
        // 聚变反应
        return [
          { axis: 'point' as const, x: 2, y: 1.11, label: '氘 ²H (1.11 MeV)', color: PHYSICS_COLORS.velocity },
          { axis: 'point' as const, x: 3, y: 2.83, label: '氚 ³H (2.83 MeV)', color: PHYSICS_COLORS.velocity },
          { axis: 'point' as const, x: 4, y: 7.07, label: '生成氦 ⁴He (7.07 MeV)', color: PHYSICS_COLORS.alertRed },
        ]
      } else {
        // 裂变或链式反应
        return [
          { axis: 'point' as const, x: 235, y: 7.59, label: '原料铀 ²³⁵U (7.59 MeV)', color: PHYSICS_COLORS.velocity },
          { axis: 'point' as const, x: 144, y: 8.30, label: '生成钡 ¹⁴⁴Ba (8.30 MeV)', color: PHYSICS_COLORS.alertRed },
          { axis: 'point' as const, x: 89, y: 8.60, label: '生成氪 ⁸⁹Kr (8.60 MeV)', color: PHYSICS_COLORS.alertRed },
        ]
      }
    }
  })()

  // 定制图表标题
  const chartTitle = mode === 0 
    ? `原子核比结合能曲线 - 当前高亮：${currentNuclide.name}`
    : reactionType === 0
      ? `比结合能变化：轻核聚变 (比结合能增加，释放能量)`
      : `比结合能变化：重核裂变 (比结合能增加，释放能量)`

  return (
    <div className="w-full h-full flex flex-col gap-2 p-1">
      {/* 上半屏：比结合能关系曲线图 */}
      <div className="h-[310px] shrink-0 w-full overflow-hidden">
        <RelationChart
          points={physics.smoothPoints}
          xLabel="质量数 A"
          yLabel="比结合能 E_avg (MeV/nucleon)"
          title={chartTitle}
          xDomain={[0, 250]}
          yDomain={[0, 10.0]}
          showGrid={true}
          markers={chartMarkers}
          series="primary"
          mainLabel="比结合能经典曲线"
        />
      </div>

      {/* 下半屏：动画画布区 */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-neutral-200/60 overflow-hidden relative">
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <NuclearReactionScene
            mode={mode}
            showMassDefectWeight={showMassDefectWeight}
            reactionType={reactionType}
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
