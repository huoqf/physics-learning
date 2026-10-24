import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS } from '@/theme/physics'
import { RelationChart } from '@/components/Chart'
import type { RelationMarker } from '@/components/Chart'
import { useCentripetalPhysics } from './hooks/useCentripetalPhysics'
import { CENTRIPETAL_CHART_RANGE } from './hooks/useCentripetalPhysics'
import { CentripetalScene } from './components/CentripetalScene'
import { sampleFitLine } from '@/physics'

export default function CentripetalAnimation() {
  // 旋转对称场景必须用 square：改成 splitV / splitH 会把圆周轨道拉成椭圆。
  // 实验图层因此只能"原地升级右上角卡片"，不新开分区。
  const DESIGN = CANVAS_PRESETS.square
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: DESIGN })
  const physics = useCentripetalPhysics(vp, containerRef)

  const isFitMode = physics.fitMode === 1
  const { fit } = physics
  const showCompare = physics.params.showCompare === 1

  // ── 模式 B：F–ω² 实验探究 ────────────────────────────────────────────────
  // markers 画 5 个离散采样点；主曲线是「过原点最小二乘」的拟合直线；
  // 理论线（k = m·r）用虚线叠在同一坐标系里 —— 两者几乎重合，正是实验要说明的结论。
  const fitChart = (() => {
    const fitLine = sampleFitLine(fit)
    const theoryLine = fitLine.map((p) => ({ x: p.x, y: fit.slope * p.x }))
    const compareLine = fitLine.map((p) => ({ x: p.x, y: fit.compareSlope * p.x }))
    const markers: RelationMarker[] = fit.samples.map((s) => ({
      axis: 'point' as const,
      x: s.omegaSq,
      y: s.fMeasured,
      color: PHYSICS_COLORS.appliedForce,
    }))
    const yMax = (showCompare ? fit.compareSlope : fit.slope) * fit.omegaSqMax * 1.12

    return (
      <RelationChart
        points={fitLine}
        additionalSeries={[
          {
            points: theoryLine,
            label: '理论 m·r·ω²',
            series: 'secondary',
            strokeDasharray: [4, 4],
            strokeWidth: 1.5,
          },
          ...(showCompare
            ? [
                {
                  points: compareLine,
                  label: '对照 2m',
                  series: 'accent' as const,
                  strokeDasharray: [2, 3],
                  strokeWidth: 1.5,
                },
              ]
            : []),
        ]}
        xDomain={[0, fit.omegaSqMax]}
        yDomain={[0, yMax]}
        xLabel="ω² (rad²/s²)"
        yLabel="F (N)"
        title="F–ω² 拟合  k = m·r"
        color={PHYSICS_COLORS.appliedForce}
        strokeWidth={2}
        mainLabel="拟合直线"
        cursorX={physics.omega * physics.omega}
        cursorLabel={(_x, f) => `F=${f.toFixed(1)}N`}
        markers={markers}
        onScrubX={physics.setVFromChartX}
      />
    )
  })()

  return (
    <div
      ref={containerRef}
      data-viewport
      className="w-full h-full relative bg-white rounded-lg shadow-inner"
    >
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <CentripetalScene physics={physics} font={canvasSize.font} />
      </AnimationSvgCanvas>
      {physics.showFaCard && (
        <div
          className="absolute"
          style={{
            right: DESIGN.width - physics.cardX - physics.cardWidth,
            top: physics.cardY,
            width: physics.cardWidth,
            height: physics.cardHeight,
          }}
        >
          {isFitMode ? (
            fitChart
          ) : (
            <RelationChart
              points={physics.faPoints}
              xDomain={[0, CENTRIPETAL_CHART_RANGE.aMax]}
              yDomain={[0, CENTRIPETAL_CHART_RANGE.fMax]}
              xLabel="a (m/s²)"
              yLabel="F (N)"
              title={`动力学联动  m = ${physics.params.m.toFixed(1)} kg`}
              color={PHYSICS_COLORS.appliedForce}
              strokeWidth={1.5}
              cursorX={physics.a_c}
              cursorLabel={(_x, f) => `F=${f.toFixed(1)}N`}
              markers={[]}
              onScrubX={physics.setVFromChartX}
            />
          )}
        </div>
      )}
    </div>
  )
}
