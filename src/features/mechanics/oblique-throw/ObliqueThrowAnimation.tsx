import { useEffect } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { resolveVelocityRefs } from '@/utils/vectorRefs'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VelocityTimeChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useObliqueThrowPhysics } from './hooks/useObliqueThrowPhysics'
import { ObliqueThrowScene } from './components/ObliqueThrowScene'

export default function ObliqueThrowAnimation() {
  // 1. Store 精确订阅
  const { params, time, showVectors, showGrid, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      showGrid: s.showGrid,
      setIsPlaying: s.setIsPlaying,
    }))
  )

  // 2. Viewport 绑定 (splitV: 840 x 325 宽幅视口)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  // 3. 参数提取
  const {
    v0 = 20,
    angle = 45,
    g = 9.8,
    airResistance = 0,
    advancedMode = 0,
    viewMode = 0,
    showPrevTrajectory = 1,
    showVacuumCompare = 0,
  } = params

  // 4. 纯物理计算 Hook
  const physics = useObliqueThrowPhysics({
    v0,
    angle,
    g,
    time,
    airResistance,
    advancedMode,
  })

  // 落地自动暂停
  useEffect(() => {
    if (physics.isLanded && time > 0) {
      setIsPlaying(false)
    }
  }, [physics.isLanded, time, setIsPlaying])

  // 视口缩放模式：viewMode === 1 为固定 100m 物理量程；viewMode === 0 为自适应数值刻度视口
  const needWidth = viewMode === 1 ? 100 : Math.max(physics.range * 1.15, 20)
  const needHeight = viewMode === 1 ? 35 : Math.max(physics.maxHeight * 1.35, 8)

  // 内容安全边距（设计坐标）：给「画在原点外侧」的元素留位置。
  //
  // 物理原点按 `bottomLeft` 落在可视区底边，于是地面线（球心下方 10px）、
  // 地面阴影带（再往下 12px）、横轴刻度数字（`groundY + 22`）整排掉到可视区之外，
  // 纵轴刻度数字与 `y / m` 则被左缘切掉——画了但看不见（压字守卫查不出这类，
  // 因为它们不和任何东西重叠，只是不在画面里）。
  // 数字按 `font()` 走：字号随画布缩放，边距不跟着变就会在大屏上贴边、小屏上留白过多。
  const insetLeft = font(11) * 3.6
  const insetRight = font(10) * 1.2
  const insetTop = font(10) * 1.4
  // 地面线 10 + 阴影带 12 + 刻度数字底缘 ~32，留 38 的余量
  const insetBottom = font(10) * 3.8

  // 物理窗口必须与**安全区**同宽高比，否则 x/y 两轴缩放比不等（anchor='viewport' 会各自撑满）：
  //   轨迹经 worldToDesign 受两轴缩放，起始方向被拉成 atan((scaleY/scaleX)·tanθ) ≠ θ；
  //   而炮筒、扇形与「θ = xx°」标注是屏幕空间画的（恒等于 θ），速度矢量箭头也在屏幕空间归一化。
  //   三者互相矛盾 —— 默认参数下轨迹实测偏离 48.6°，标注却是 45°，tanθ=2tanα 这类角度结论在画面上不成立。
  // 取「保留所需量程、把较小的那一维按安全区宽高比补足」，使 scaleX === scaleY（等比，角度真实）。
  // 代价：细长轨迹（如 θ=80°、v0=40）会按高度贴合，横向留白，但不再牺牲角度正确性。
  // ⚠️ 这里必须用安全区而不是可视区：加了边距后两条轴各少一截，用可视区比例补齐
  //    会让 scaleX ≠ scaleY 重新出现（角度失真回归）。
  const safeW = Math.max(1, vp.designVisibleW - insetLeft - insetRight)
  const safeH = Math.max(1, vp.designVisibleH - insetTop - insetBottom)
  const viewAspect = safeW / safeH
  const targetWidth = Math.max(needWidth, needHeight * viewAspect)
  const targetHeight = targetWidth / viewAspect

  // 5. 物理坐标比例尺 SceneScale
  //
  // 场景里同时画 vₓ / v_y / v 三个矢量，三者的 refMagnitude 必须由 resolveVelocityRefs 成对配：
  // 只配 velocity 时分量拿到 ref=0 被回退成恒定 minLength，vₓ 与 v_y 全程等长，
  // 等于在说「两个分速度都不变」，与斜抛的真实关系相反。规则与理由见 utils/vectorRefs。
  const angleRad = (angle * Math.PI) / 180
  const peakComponent = v0 * Math.max(Math.abs(Math.cos(angleRad)), Math.abs(Math.sin(angleRad)))
  const velRefs = resolveVelocityRefs(v0, peakComponent)
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'viewport',
    physicsWidth: targetWidth,
    physicsHeight: targetHeight,
    contentInset: { left: insetLeft, right: insetRight, top: insetTop, bottom: insetBottom },
    refMagnitudes: { velocity: velRefs.main, velocityX: velRefs.component, velocityY: velRefs.component },
  })

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      {/* ── 1. 上平级分区：v-t 图表 ── */}
      <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm flex flex-col">
        <VelocityTimeChart
          mode="animated"
          points={physics.vtChartData.pointsVx}
          domainPoints={physics.vtChartData.domainVx}
          additionalSeries={[
            {
              points: physics.vtChartData.pointsVy,
              domainPoints: physics.vtChartData.domainVy,
              label: 'vᵧ (竖直速度)',
              series: 'secondary',
            },
          ]}
          currentTime={physics.activeTime}
          tMax={physics.groundTime * 1.1}
          vRange={[-v0 * 1.1, v0 * 1.1]}
          title={`斜抛运动 速度分量-时间 (v-t) 关系 (v₀=${v0}m/s, θ=${angle}°)`}
          showCursor={!physics.isLanded}
          showGrid
        />
      </div>

      {/* ── 2. 下平级分区：AnimationSvgCanvas 斜抛动画场景 ── */}
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        <AnimationSvgCanvas
          containerRef={containerRef}
          transform={vp.transform}
          className="bg-white rounded-lg shadow-inner border border-slate-200"
        >
          <ObliqueThrowScene
            physics={physics}
            canvasSize={canvasSize}
            sceneScale={sceneScale}
            vp={vp}
            angle={angle}
            showVectors={showVectors}
            showGrid={showGrid}
            showVacuumCompare={Boolean(showVacuumCompare && advancedMode === 1 && airResistance > 0)}
            showPrevTrajectory={Boolean(showPrevTrajectory)}
            targetWidth={targetWidth}
            targetHeight={targetHeight}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
