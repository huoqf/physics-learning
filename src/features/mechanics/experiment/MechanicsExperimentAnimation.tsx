import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VelocityTimeChart, RelationChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { TRACK_MAX_M, hookeSeries, timeToReach, velocityAt } from '@/physics/experimentMechanics'
import { useMechanicsExperimentPhysics } from './hooks/useMechanicsExperimentPhysics'
import { MechanicsExperimentScene } from './components/MechanicsExperimentScene'
import { TRACK_ORIGIN_DESIGN_X, TRACK_PX_PER_M, TRACK_GROUND_Y } from './mechanicsExperimentLayout'

/** v-t / F-Δx 图采样点数 */
const CHART_SAMPLES = 40

/**
 * 高考力学实验基础 - 主编排动画组件 (MechanicsExperimentAnimation)
 *
 * 采用 50%/50% flex splitV 经典分屏布局（上屏物理图表 + 下屏实验 SVG 画布）。
 * 上屏图表与中屏场景共用 `@/physics/experimentMechanics` 的运动学真源：
 * 小车行程受轨道末端挡块限制，图表时间轴同样截到挡块时刻，杜绝"图在加速、
 * 车已停住"的两张皮。
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

  // 2. Viewport & Scale 适配：物理原点固定在轨道起点（计时器纸带出口），
  //    设计比例与轨道常量同源，保证小车全程留在画布内且与刻度尺读数一致。
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'custom',
    customScaleX: TRACK_PX_PER_M,
    customScaleY: TRACK_PX_PER_M,
    customOriginX: TRACK_ORIGIN_DESIGN_X,
    customOriginY: TRACK_GROUND_Y,
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

  // 4. 上屏图表：横轴上限取"到达轨道末端挡块的时刻"，与中屏运动时长同源
  const travelTime = timeToReach(v0Num, aNum, TRACK_MAX_M)
  const chartTimeMax = Number.isFinite(travelTime) && travelTime > 0.3 ? travelTime : 3

  const vtPoints = Array.from({ length: CHART_SAMPLES + 1 }).map((_, i) => {
    const tStep = (i / CHART_SAMPLES) * chartTimeMax
    return { t: tStep, v: velocityAt(v0Num, aNum, tStep) }
  })

  // 胡克定律 F-Δx 图：依次挂 1…6 个钩码，图线过原点，斜率即劲度系数 k
  const hookeData = hookeSeries(mNum, kNum, 6)
  const hookePoints = [
    { x: 0, y: 0 },
    ...hookeData.map((point) => ({ x: point.extension, y: point.force })),
  ]
  const hookeMaxExtension = hookeData.length > 0 ? hookeData[hookeData.length - 1].extension : 0
  const hookeMaxForce = hookeData.length > 0 ? hookeData[hookeData.length - 1].force : 0

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      {/* 1. 上分屏 (50%)：高考物理拟合图表 */}
      <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm overflow-hidden">
        {modeNum === 2 ? (
          <RelationChart
            points={hookePoints}
            xDomain={[0, Math.max(0.05, hookeMaxExtension * 1.15)]}
            yDomain={[0, Math.max(0.5, hookeMaxForce * 1.15)]}
            cursorX={physics.deltaX}
            title="胡克定律 F - Δx 拟合直线"
            xLabel="Δx / m"
            yLabel="F / N"
          />
        ) : (
          <VelocityTimeChart
            mode="static"
            points={vtPoints}
            currentTime={Math.min(timeNum, chartTimeMax)}
            tMax={chartTimeMax}
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
            d={dNum}
            time={timeNum}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
