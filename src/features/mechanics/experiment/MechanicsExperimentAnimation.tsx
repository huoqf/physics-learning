import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VelocityTimeChart, RelationChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useMechanicsExperimentPhysics } from './hooks/useMechanicsExperimentPhysics'
import { MechanicsExperimentScene } from './components/MechanicsExperimentScene'

/**
 * 高考力学实验基础 - 主编排动画组件 (MechanicsExperimentAnimation)
 * 采用 50%/50% flex splitV 经典分屏布局（上屏物理图表 + 下屏实验 SVG 画布）
 */
export default function MechanicsExperimentAnimation() {
  // 1. Zustand Store 订阅
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  // 安全数值转化与默认值回退
  const modeNum = Number.isFinite(Number(params?.mode)) ? Number(params.mode) : 0
  const v0Num = Number.isFinite(Number(params?.v0)) ? Number(params.v0) : 1.0
  const aNum = Number.isFinite(Number(params?.a)) ? Number(params.a) : 1.5
  const freqNum = Number.isFinite(Number(params?.freq)) ? Number(params.freq) : 50
  const dNum = Number.isFinite(Number(params?.d)) ? Number(params.d) : 0.01
  const kNum = Number.isFinite(Number(params?.k)) && Number(params.k) > 0 ? Number(params.k) : 100
  const mNum = Number.isFinite(Number(params?.m)) ? Number(params.m) : 0.2
  const timeNum = Number.isFinite(Number(time)) ? Number(time) : 0

  // 2. Viewport & Scale 适配 (根据 new-animation-page 规范)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  // 2. Viewport & Scale 适配 (使用规范 anchor: 'center' 契合 840x325 设计坐标系)
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'center',
    physicsScaleDesign: 500,
    refMagnitudes: { velocity: Math.max(v0Num, 5) },
  })

  // 3. 物理 Hooks 计算
  const physics = useMechanicsExperimentPhysics({
    mode: modeNum,
    v0: v0Num,
    a: aNum,
    freq: freqNum,
    d: dNum,
    k: kNum,
    m: mNum,
    time: timeNum,
  })

  // v-t 图点集格式为 { t, v }
  const vtPoints = Array.from({ length: 21 }).map((_, i) => {
    const tStep = (i / 20) * 3
    const vVal = v0Num + aNum * tStep
    return { t: tStep, v: Number.isFinite(vVal) ? vVal : 0 }
  })

  // 胡克定律 F-Δx 图点集格式为 { x, y }
  const hookePoints = Array.from({ length: 6 }).map((_, i) => {
    const mStep = i * 0.1
    const fStep = mStep * 9.8
    const deltaXVal = fStep / Math.max(1, kNum)
    return {
      x: Number.isFinite(deltaXVal) ? deltaXVal : 0,
      y: Number.isFinite(fStep) ? fStep : 0,
    }
  })

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      {/* 1. 上分屏 (50%)：高考物理拟合图表 */}
      <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm overflow-hidden">
        {modeNum === 2 ? (
          <RelationChart
            points={hookePoints}
            xDomain={[0, 0.25]}
            yDomain={[0, 6]}
            title="胡克定律 F - Δx 拟合直线"
            xLabel="Δx / m"
            yLabel="F / N"
          />
        ) : (
          <VelocityTimeChart
            mode="static"
            points={vtPoints}
            currentTime={timeNum}
            tMax={3}
            title="匀变速直线运动 v-t 图"
          />
        )}
      </div>

      {/* 2. 下分屏 (50%)：主实验 SVG 画布主屏 */}
      <div
        className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm relative overflow-hidden"
        ref={containerRef}
      >
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <MechanicsExperimentScene
            mode={modeNum}
            physics={physics}
            canvasSize={canvasSize}
            sceneScale={sceneScale}
            time={timeNum}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
