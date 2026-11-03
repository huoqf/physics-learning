import { useAnimationViewport, useSceneScale } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VelocityTimeChart, RelationChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  SPRING_MAX_MEASURABLE_EXTENSION_M,
  TRACK_MAX_M,
  hookeSeries,
  timeToReach,
  velocityAt,
} from '@/physics/experimentMechanics'
import { useMechanicsExperimentPhysics } from './hooks/useMechanicsExperimentPhysics'
import { MechanicsExperimentScene } from './components/MechanicsExperimentScene'
import { getSceneProfile } from './mechanicsExperimentLayout'

/** v-t / F-Δx 图采样点数 */
const CHART_SAMPLES = 40

/**
 * 高考力学实验基础 - 主编排动画组件 (MechanicsExperimentAnimation)
 *
 * **分区方向按模式切换**（依据 `ui/07_CANVAS_SVG_CHART_RULES.md §2.8`）：
 *   · 模式 0/1（小车沿轨道水平运动）→ `splitV` 840×325，图表在上、场景在下；
 *   · 模式 2/3（弹簧竖直伸缩 / 重物竖直下落）→ `splitH` 420×650，场景在左、图表在右。
 * preset / 设计比例 / 物理原点一律取自 `getSceneProfile(mode)` 的单一来源，
 * 组件内不再各写一份，避免"preset 一套、比例另一套"的双重缩放与越界。
 *
 * 图表与中屏场景共用 `@/physics/experimentMechanics` 的运动学真源：小车行程受轨道
 * 末端挡块限制，图表时间轴同样截到挡块时刻，杜绝"图在加速、车已停住"的两张皮。
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
  const frictionNum = Number.isFinite(Number(params?.friction)) ? Number(params.friction) : 2
  const timeNum = Number.isFinite(Number(time)) ? Number(time) : 0

  // 2. 该模式的画布契约（preset / 分区方向 / 比例 / 原点）
  const profile = getSceneProfile(modeNum)
  const isSideSplit = profile.split === 'h'

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: profile.preset,
  })

  const sceneScale = useSceneScale({
    vp,
    preset: profile.preset,
    anchor: 'custom',
    customScaleX: profile.pxPerMeter,
    customScaleY: profile.pxPerMeter,
    customOriginX: profile.originX,
    customOriginY: profile.originY,
    // 左右分区只剩 420 宽，矢量必须限长：否则箭头端会顶到竖尺与读数块。
    // 轨道模式沿用默认（可视区短边 × 0.3）。
    maxVectorLength: isSideSplit ? 64 : undefined,
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
    friction: frictionNum,
    time: timeNum,
  })

  // 4. 上屏图表：横轴上限取"到达轨道末端挡块的时刻"，与中屏运动时长同源
  const travelTime = timeToReach(v0Num, aNum, TRACK_MAX_M)
  const chartTimeMax = Number.isFinite(travelTime) && travelTime > 0.3 ? travelTime : 3

  const vtPoints = Array.from({ length: CHART_SAMPLES + 1 }).map((_, i) => {
    const tStep = (i / CHART_SAMPLES) * chartTimeMax
    return { t: tStep, v: velocityAt(v0Num, aNum, tStep) }
  })

  // 验证机械能守恒：以纸带首点为零势能参考，两条曲线共用同一横轴（下落高度 h）
  const energyPoints = physics.energyPoints
  const epPoints = [{ x: 0, y: 0 }, ...energyPoints.map((p) => ({ x: p.h, y: p.deltaEp }))]
  const ekPoints = [{ x: 0, y: 0 }, ...energyPoints.map((p) => ({ x: p.h, y: p.deltaEk }))]
  const maxFallHeight = energyPoints.length > 0 ? energyPoints[energyPoints.length - 1].h : 0
  const maxEnergy = energyPoints.length > 0 ? energyPoints[energyPoints.length - 1].deltaEp : 0

  // 胡克定律 F-Δx 图：依次挂 1…6 个钩码，图线过原点，斜率即劲度系数 k。
  // 序列受竖尺量程限制——超过可测伸长量的点不画，避免"图上有 6 个点、尺上只有 2 个读数"。
  const hookeData = hookeSeries(mNum, kNum, 6, SPRING_MAX_MEASURABLE_EXTENSION_M)
  const hookePoints = [
    { x: 0, y: 0 },
    ...hookeData.map((point) => ({ x: point.extension, y: point.force })),
  ]
  const hookeMaxExtension = hookeData.length > 0 ? hookeData[hookeData.length - 1].extension : 0
  const hookeMaxForce = hookeData.length > 0 ? hookeData[hookeData.length - 1].force : 0

  return (
    // 分区方向由场景主运动方向决定：上下（图表在上）或左右（场景在左）。
    // 用 order-* 换序而不是改 JSX 顺序——挂载 containerRef 的节点必须保持同一个 DOM
    // 位置，否则切模式时 ResizeObserver 会以零尺寸重新观测一帧，画布闪一下。
    <div
      className={`w-full h-full flex ${isSideSplit ? 'flex-row' : 'flex-col'} gap-2 p-2 bg-slate-50 rounded-lg`}
    >
      {/* 1. 图表分屏：上下分区时在上半屏（占半高），左右分区时在右栏（占半宽） */}
      <div
        className={`bg-white rounded-lg p-2 border border-slate-200 shadow-sm overflow-hidden ${
          isSideSplit ? 'order-2 flex-1 min-w-0 h-full' : 'order-1 flex-1 min-h-0'
        }`}
      >
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
        ) : modeNum === 3 ? (
          <RelationChart
            points={epPoints}
            additionalSeries={[
              {
                points: ekPoints,
                // 图例压到 2 字：满写「ΔEₖ = ½mv²」会与 ΔEₚ 图例在右上角叠行
                label: 'ΔEₖ',
                series: 'secondary',
                strokeDasharray: [5, 4],
              },
            ]}
            mainLabel="ΔEₚ"
            xDomain={[0, Math.max(0.05, maxFallHeight * 1.15)]}
            // 能量恒为正，锁 0 基准：否则自动域会拉到负值，两条曲线被压扁到上半屏
            yDomain={[0, Math.max(0.01, maxEnergy * 1.15)]}
            // 不画游标：曲线末端正是图例所在位置，游标数值标签会与 ΔEₚ/ΔEₖ 叠字；
            // 实时读数由右屏「该点速度/ΔEₚ/ΔEₖ」精确给出，图表只承担趋势比对
            title="验证机械能守恒：ΔEₚ 与 ΔEₖ 逐点比对"
            xLabel="下落高度 h / m"
            yLabel="能量 E / J"
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

      {/* 2. 场景分屏：上下分区时在下半屏，左右分区时在左栏（宽度对齐 splitH 的 420） */}
      <div
        className={`bg-white rounded-lg p-2 border border-slate-200 shadow-sm relative overflow-hidden ${
          isSideSplit ? 'order-1 w-[52%] max-w-[420px] min-w-[300px] shrink-0 h-full' : 'order-2 flex-1 min-h-0'
        }`}
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
