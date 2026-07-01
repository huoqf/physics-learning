/**
 * CollisionAnimation.tsx
 * 弹性碰撞与非弹性碰撞动画 — 薄编排层
 *
 * 职责：Store 订读、useViewport、图表区渲染、组合场景组件
 * 计算逻辑见 collisionHooks.ts，渲染组件见 components/
 */
import { useCanvasSize, useViewport } from '@/utils'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { VelocityTimeChart } from '@/components/Chart'
import { SCENE_COLORS } from '@/theme/physics'
import {
  COL_LAYOUT,
  computeBasicMode,
  computeAdvancedMode,
  useChartData,
} from './collisionHooks'
import { CollisionBasicScene } from './components/CollisionBasicScene'
import { CollisionAdvancedScene } from './components/CollisionAdvancedScene'

export default function CollisionAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )

  const [containerRef, canvasSize] = useCanvasSize({
    width: COL_LAYOUT.designWidth,
    height: COL_LAYOUT.designHeight,
  })

  const vp = useViewport(canvasSize, {
    designWidth: COL_LAYOUT.designWidth,
    designHeight: COL_LAYOUT.designHeight,
  })

  const {
    m1 = 3, v1 = 5,
    m2 = 2, v2 = 0,
    isElastic = 1,
    mA = 3, vA = 5,
    mB = 2, kLoss = 0,
    advancedMode = 0,
  } = params

  const isAdvanced = advancedMode === 1
  const groundY = COL_LAYOUT.groundY

  const sceneScale = useMemo(() => ({
    scaleX: 1,
    scaleY: 1,
    scale: 1,
    originX: 0,
    originY: groundY,
    maxVectorLength: 80,
    refMagnitudes: { velocity: 10 },
  }), [groundY])

  // 基础模式 view model
  const basic = computeBasicMode({ m1, v1, m2, v2, isElastic }, time)

  // 进阶模式 view model
  const advanced = computeAdvancedMode({ mA, vA, mB, kLoss }, time)

  // 图表数据
  const charts = useChartData({
    isAdvanced,
    m1, v1, m2, v2,
    collisionTime: basic.collisionTime,
    v1After: basic.currentV1,
    v2After: basic.currentV2,
    EkBefore: basic.EkBefore,
    EkAfter: basic.EkAfter,
    mA, vA, mB,
    colTimeAdv: advanced.colTimeAdv,
    vAAfter: advanced.curVA,
    vBAfter: advanced.curVB,
    EkBeforeAdv: advanced.EkBeforeAdv,
    EkAfterAdv: advanced.EkAfterAdv,
    currentT: time,
  })

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 box-border bg-neutral-50 overflow-hidden">
      {/* ==================== 上方并列实时物理图像区 ==================== */}
      <div className="flex gap-4 h-[310px] shrink-0">
        {/* 速度-时间图像 (V-T) */}
        <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <VelocityTimeChart
              mode="animated"
              points={charts.currentVtPoints1}
              domainPoints={charts.currentDomainVtPoints1}
              currentTime={time}
              tMax={10}
              title="速度-时间图像 (V-T)"
              xLabel="时间 t (s)"
              yLabel="速度 v (m/s)"
              additionalSeries={[
                {
                  points: charts.currentVtPoints2,
                  domainPoints: charts.currentDomainVtPoints2,
                  label: 'B球',
                  series: 'secondary',
                }
              ]}
              showArea={false}
            />
          </div>
        </div>

        {/* 动能-时间图像 (Ek-T) */}
        <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <VelocityTimeChart
              mode="animated"
              points={charts.currentEktPoints1}
              domainPoints={charts.currentDomainEktPoints1}
              currentTime={time}
              tMax={10}
              title="动能-时间图像 (Ek-T)"
              xLabel="时间 t (s)"
              yLabel="动能 Ek (J)"
              additionalSeries={[
                {
                  points: charts.currentEktPoints2,
                  domainPoints: charts.currentDomainEktPoints2,
                  label: 'B球动能',
                  series: 'secondary',
                },
                {
                  points: charts.currentEktPointsTotal,
                  domainPoints: charts.currentDomainEktPointsTotal,
                  label: '总动能',
                  series: 'success',
                }
              ]}
              showArea={false}
            />
          </div>
        </div>
      </div>

      {/* ==================== 下方仿真动画区 ==================== */}
      <div ref={containerRef} className="flex-1 min-h-[100px] bg-white border border-neutral-200/80 rounded-xl shadow-sm relative overflow-hidden">
        <svg className="w-full h-full block">
          {/* gradients */}
          <defs>
            <radialGradient id="steel-sphere-grad-col" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
              <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
              <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
              <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
            </radialGradient>
            <radialGradient id="steel-sphere-grad-col-b" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[0]} />
              <stop offset="40%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[1]} />
              <stop offset="80%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[2]} />
              <stop offset="100%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[3]} />
            </radialGradient>
          </defs>

          {/* viewport transform 包裹所有设计空间内容 */}
          <g transform={vp.transform}>
            {!isAdvanced ? (
              <CollisionBasicScene
                isElastic={isElastic}
                R_A={basic.R_A} R_B={basic.R_B}
                posAx={basic.posAx} posBx={basic.posBx}
                currentV1={basic.currentV1} currentV2={basic.currentV2}
                hasCollided={basic.hasCollided} collisionTime={basic.collisionTime}
                EkBefore={basic.EkBefore} EkAfter={basic.EkAfter}
                time={time} showVectors={showVectors}
                sceneScale={sceneScale} canvasSize={canvasSize}
                groundY={groundY}
              />
            ) : (
              <CollisionAdvancedScene
                vA={vA}
                R_Adv={advanced.R_Adv} R_Bdv={advanced.R_Bdv}
                posAAdv={advanced.posAAdv} posBAdv={advanced.posBAdv}
                curVA={advanced.curVA} curVB={advanced.curVB}
                hasCollidedAdv={advanced.hasCollidedAdv} colTimeAdv={advanced.colTimeAdv}
                velocitySwap={advanced.velocitySwap} heavyLight={advanced.heavyLight}
                lightHeavy={advanced.lightHeavy} xCmAdv={advanced.xCmAdv}
                time={time} showVectors={showVectors}
                sceneScale={sceneScale} canvasSize={canvasSize}
                groundY={groundY}
              />
            )}
          </g>
        </svg>
      </div>
    </div>
  )
}
