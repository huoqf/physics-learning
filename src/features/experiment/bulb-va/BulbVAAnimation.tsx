import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { RelationChart, type RelationMarker } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { useBulbVAPhysics } from './hooks/useBulbVAPhysics'
import { BulbVAScene } from './components/BulbVAScene'

export default function BulbVAAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const circuitMode = Number(params?.circuitMode ?? 0)
  const meterMode = Number(params?.meterMode ?? 0)
  const sliderRatio = Number(params?.sliderRatio ?? 0.5)
  const E = Number(params?.E ?? 6.0)
  const R_slider_max = Number(params?.R_slider_max ?? 20)
  const showLoadLine = Number(params?.showLoadLine ?? 0) === 1
  const E_load = Number(params?.E_load ?? 3.5)
  const r_load = Number(params?.r_load ?? 5.0)

  const physics = useBulbVAPhysics({
    circuitMode,
    meterMode,
    sliderRatio,
    E,
    R_slider_max,
    showLoadLine,
    E_load,
    r_load,
  })

  // 图表扩展曲线序列配置
  const additionalSeries = useMemo(() => {
    const list = []

    // 1. 实测伏安曲线
    list.push({
      points: physics.measuredCurvePoints,
      label: meterMode === 0 ? '实测 I-U (外接法略偏高)' : '实测 I-U (内接法略偏右)',
      color: PHYSICS_COLORS.emf,
      strokeWidth: 2,
    })

    // 2. 电源外特性负载线（绿色虚线）
    if (showLoadLine) {
      list.push({
        points: physics.loadLinePoints,
        label: `电源负载线 (E=${E_load}V, r=${r_load}Ω)`,
        color: colors.success[500],
        strokeWidth: 1.5,
        strokeDasharray: [4, 4],
      })
    }

    return list
  }, [physics.measuredCurvePoints, physics.loadLinePoints, meterMode, showLoadLine, E_load, r_load])

  // 图表标记点 (当前测量工作点 + 负载线交点)
  const markers = useMemo(() => {
    const m: RelationMarker[] = [
      {
        x: physics.U_meas,
        y: physics.I_meas,
        label: `测量点: (${physics.U_meas.toFixed(2)}V, ${physics.I_meas.toFixed(3)}A)`,
        color: PHYSICS_COLORS.acceleration,
      },
    ]

    if (showLoadLine && physics.workPoint.U > 0) {
      m.push({
        x: physics.workPoint.U,
        y: physics.workPoint.I,
        label: `工作点交点: (${physics.workPoint.U.toFixed(2)}V, ${physics.workPoint.I.toFixed(3)}A)`,
        color: colors.success[600],
      })
    }

    return m
  }, [physics.U_meas, physics.I_meas, showLoadLine, physics.workPoint])

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 select-none">
      {/* 上半屏 (50%)：HTML 数据处理屏（I-U 伏安曲线与负载线） */}
      <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <RelationChart
          title="数据分析屏：小灯泡 I - U 伏安特性曲线与工作点分析"
          xLabel="端电压 U (V)"
          yLabel="通过电流 I (A)"
          xDomain={[0, 4.5]}
          yDomain={[0, 0.45]}
          points={physics.realCurvePoints}
          color={CANVAS_COLORS.textMuted}
          additionalSeries={additionalSeries}
          markers={markers}
          cursorX={physics.U_meas}
        />
      </div>

      {/* 下半屏 (50%)：SVG 实验器材与电路仿真 */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm relative overflow-hidden"
      >
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <BulbVAScene physics={physics} font={canvasSize.font} time={time} />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}

export { BulbVAAnimation }
