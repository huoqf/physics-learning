import { AnimationSvgCanvas } from '@/components/Layout'
import { RelationChart, type RelationMarker } from '@/components/Chart'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { CHART_COLORS, PHYSICS_COLORS } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { EQUAL_CHARGE_PLAY_DURATION, EQUAL_CHARGE_SCAN_HALF_CM } from '@/physics'
import { useShallow } from 'zustand/react/shallow'
import { useEqualChargeFieldPhysics } from './hooks/useEqualChargeFieldPhysics'
import { EqualChargeFieldScene } from './components/EqualChargeFieldScene'

/**
 * 等量电荷场线与图像模型（上下 splitV 分区：上方空间场线与等势面 + 下方 E-s / φ-s 双图联动）。
 */
export default function EqualChargeFieldAnimation() {
  const { params, time, showVectors, setTime } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      setTime: s.setTime,
    })),
  )

  const chargeType = params.chargeType ?? 0
  const axis = params.axis ?? 0
  const qMicroC = params.qMicroC ?? 5
  const halfSepCm = params.halfSepCm ?? 3
  const showFieldLines = (params.showFieldLines ?? 1) === 1
  const showEquipotentials = (params.showEquipotentials ?? 1) === 1

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const physics = useEqualChargeFieldPhysics({
    chargeType,
    axis,
    qMicroC,
    halfSepCm,
    time,
    showFieldLines,
    showEquipotentials,
  })

  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'center',
    physicsScaleDesign: 1500,
    maxVectorLength: 52,
    refMagnitudes: {
      electricField: physics.refFieldMagnitude,
      electricForce: physics.refFieldMagnitude,
    },
  })

  const { profile, snapshot } = physics
  const scanMin = -EQUAL_CHARGE_SCAN_HALF_CM
  const scanMax = EQUAL_CHARGE_SCAN_HALF_CM

  const markers: RelationMarker[] = [
    { axis: 'vertical', x: 0, label: 'O', color: CHART_COLORS.equilibrium, position: 'top' },
  ]
  if (axis === 0) {
    markers.push(
      { axis: 'vertical', x: -halfSepCm, label: 'Q₁', color: PHYSICS_COLORS.positiveCharge, position: 'top' },
      { axis: 'vertical', x: halfSepCm, label: 'Q₂', color: chargeType === 0 ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.positiveCharge, position: 'top' },
    )
  } else if (chargeType !== 0) {
    markers.push(
      { axis: 'vertical', x: -profile.yMaxCm, label: '−0.71a', color: PHYSICS_COLORS.electricField, position: 'top' },
      { axis: 'vertical', x: profile.yMaxCm, label: '+0.71a', color: PHYSICS_COLORS.electricField, position: 'top' },
    )
  }

  const handleScrubS = (sCm: number) => {
    const clamped = Math.max(scanMin, Math.min(scanMax, sCm))
    const targetTime = ((clamped - scanMin) / (scanMax - scanMin)) * EQUAL_CHARGE_PLAY_DURATION
    setTime(targetTime)
  }

  const axisLabel = axis === 0 ? '连线位置 x / cm' : '中垂线位置 y / cm'

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      {/* 上半屏：二维电场线与等势面空间模型 */}
      <div className="flex-1 min-h-0 relative bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <AnimationSvgCanvas
          containerRef={containerRef}
          transform={vp.transform}
          title="等量电荷场线与等势面空间模型"
          desc="展示等量异种与等量同种电荷的电场线、等势面分布，以及探针沿连线或中垂线移动时的合场强矢量变化。"
        >
          <EqualChargeFieldScene
            physics={physics}
            canvasSize={canvasSize}
            sceneScale={sceneScale}
            vp={vp}
            showFieldLines={showFieldLines}
            showEquipotentials={showEquipotentials}
            showVectors={showVectors}
            chargeType={chargeType}
            axis={axis}
          />
        </AnimationSvgCanvas>
      </div>

      {/* 下半屏：E-s 与 φ-s 双曲线实时联动 */}
      <div className="flex-1 min-h-0 flex gap-2">
        <div className="flex-1 min-w-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm flex flex-col">
          <RelationChart
            points={profile.ePoints}
            xDomain={[scanMin, scanMax]}
            yDomain={profile.eDomain}
            xLabel={axisLabel}
            yLabel={profile.eComponentLabel}
            title={axis === 0 ? '沿连线场强分布 Eₓ–x' : '沿中垂线场强分布'}
            showZeroLine
            cursorX={snapshot.sCm}
            cursorLabel={(_x, y) => `${y.toFixed(2)} MV/m`}
            markers={markers}
            color={PHYSICS_COLORS.electricForce}
            strokeWidth={2}
            onScrubX={handleScrubS}
          />
        </div>
        <div className="flex-1 min-w-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm flex flex-col">
          <RelationChart
            points={profile.phiPoints}
            xDomain={[scanMin, scanMax]}
            yDomain={profile.phiDomain}
            xLabel={axisLabel}
            yLabel="φ / MV"
            title={axis === 0 ? '沿连线电势分布 φ–x' : '沿中垂线电势分布 φ–y'}
            showZeroLine
            cursorX={snapshot.sCm}
            cursorLabel={(_x, y) => `${y.toFixed(2)} MV`}
            markers={markers}
            color={PHYSICS_COLORS.electricPotential}
            strokeWidth={2}
            onScrubX={handleScrubS}
          />
        </div>
      </div>
    </div>
  )
}
