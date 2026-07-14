
import { useEffect, useMemo, useCallback } from 'react'
import { useAnimationViewport, useSceneScale, useCanvasViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { worldToDesign } from '@/scene'
import {
  calcParticleRadius,
  calcParticlePeriod,
  calculateDoubleBoundaryExit,
  calculateCircularBoundaryExit,
  lorentzForceDir,
} from '@/physics'
import { PhysicsVectorArrow, drawCanvasParticleTrajectory } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useParticleState } from './hooks/useParticleState'
import { useParticleFamily } from './hooks/useParticleFamily'
import { useFocusArc } from './hooks/useFocusArc'
import {
  drawMagneticFieldRegion,
  drawAdvancedOverlay,
  drawBasicGeometry,
  drawNonFocusParticles,
} from './components/canvasDrawing'

export function SimulationView() {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)

  const mode = params.mode ?? 0 // 0: 基础, 1: 进阶
  const boundaryType = params.boundaryType ?? 0 // 0: 单边界, 1: 双平行边界, 2: 圆形边界
  const dynamicType = params.dynamicType ?? 0 // 0: 旋转圆, 1: 缩放圆, 2: 平移圆

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: mode === 0 ? CANVAS_PRESETS.splitH : CANVAS_PRESETS.full
  })
  const { canvasRef, setupFrame, designToPixel } = useCanvasViewport({ vp, canvasSize, mode: 'raw' })

  const q = params.q ?? 1
  const m = params.m ?? 1
  const v = params.v ?? 12
  const B = params.B ?? 1.2
  const bDirection = params.bDirection ?? 1 // 1=向里⊗, -1=向外⊙
  const effectiveB = B * bDirection // 物理计算和渲染用的实际 B 值（含方向）
  const thetaParam = params.theta ?? 60
  const d = params.magneticWidth ?? 5.0
  const Rb = params.magneticRadius ?? 4.0
  const showGeometry = params.showGeometry === 1
  const showArc = params.showArc === 1
  const showEnvelope = params.showEnvelope === 1

  // 进阶模式下，不同极值模型强制对应的边界环境，与高考考点高度对齐
  const activeBoundaryType = mode === 0 ? boundaryType : (
    dynamicType === 0 ? 0 : // 旋转圆 -> 单边界
    dynamicType === 1 ? 1 : // 缩放圆 -> 双平行边界
    0 // 平移圆 -> 单边界
  )

  // 基础模式可调夹角，圆形磁场强制径向入射
  const activeTheta = activeBoundaryType === 2 ? 90 : thetaParam

  const R = calcParticleRadius(m, v, q, effectiveB)
  const sign = (q * effectiveB) >= 0 ? 1 : -1 // 1 为逆时针（向左），-1 为顺时针（向右）

  // 计算焦点粒子在磁场中偏转的时间 tOut
  const tOut = useMemo(() => {
    if (activeBoundaryType === 0) {
      const thetaRad = (activeTheta * Math.PI) / 180
      // 偏转角：逆时针 2π-2θ（长弧），顺时针 2θ（短弧）
      const deltaPhi = sign === 1 ? 2 * Math.PI - 2 * thetaRad : 2 * thetaRad
      const T = calcParticlePeriod(m, q, effectiveB)
      return T > 0 ? (deltaPhi / (2 * Math.PI)) * T : 0
    } else if (activeBoundaryType === 1) {
      return calculateDoubleBoundaryExit(q, m, v, effectiveB, activeTheta, d).t
    } else {
      return calculateCircularBoundaryExit(q, m, v, effectiveB, Rb).t
    }
  }, [q, m, v, effectiveB, activeTheta, activeBoundaryType, d, Rb, sign])

  const tSlideIn = 1.5 // 固定 1.5s 飞入，实现全局同步发射
  const progressTime = time - tSlideIn

  // ── VIEWPORT 架构 ──
  // 统一 sceneScale（设计坐标），SVG 和 Canvas 共用
  const worldWidth = activeBoundaryType === 2 ? 50 : Math.max(1.0, d * 4.8)
  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'center',
    physicsScaleDesign: preset.width / worldWidth,
    centerSource: 'custom',
    centerX: preset.width / 2,
    centerY: activeBoundaryType === 2 ? preset.height * 0.78 : preset.height * 0.70,
    maxVectorLength: Math.min(preset.width, preset.height) * 0.3,
    refMagnitudes: { force: 25, velocity: 45, lorentzForce: 25 },
  })

  // Canvas 绘制辅助：物理坐标 → 容器像素（通过 sceneScale + designToPixel）
  const toCanvasPixel = useCallback((wx: number, wy: number) => {
    const { px: dx, py: dy } = worldToDesign(wx, wy, sceneScale)
    return designToPixel(dx, dy)
  }, [sceneScale, designToPixel])

  // Canvas 绘制辅助：物理距离 → 容器像素距离
  const metersToPixels = sceneScale.scaleX * vp.scale

  // ── 提取的 Hooks ──
  const getParticleState = useParticleState(q, m, effectiveB, v, activeTheta, activeBoundaryType, d, Rb)
  const particleFamily = useParticleFamily(mode, dynamicType, v, activeTheta, R)

  // 物理状态及矢量箭头参数计算 (仅对焦点粒子展示以控制信息密度)
  const focusState = getParticleState(progressTime, 0, 0, v, activeTheta)
  const inField = progressTime >= 0 && progressTime <= focusState.tOut
  const B_dir = effectiveB > 0 ? 'intoPage' as const : 'outOfPage' as const
  const forceDir = lorentzForceDir(
    { x: focusState.vx, y: focusState.vy },
    B_dir,
    q
  )
  const forceMag = Math.abs(q) * Math.hypot(focusState.vx, focusState.vy) * Math.abs(effectiveB)
  const forceVector = {
    x: forceDir.x * forceMag,
    y: forceDir.y * forceMag
  }
  // 速度矢量全程显示（入场前、磁场内、出场后）
  const showVelocityVector = progressTime >= -tSlideIn

  // 焦点粒子全程轨迹点集
  const { focusArcPredicted, focusArcHistory, focusArcTail } = useFocusArc({
    focusStateTOut: focusState.tOut,
    tSlideIn,
    v,
    activeTheta,
    getParticleState,
    toCanvasPixel,
    progressTime,
  })

  // ── Canvas 渲染 ──
  useEffect(() => {
    const ctx = setupFrame()
    if (!ctx) return
    const { font } = canvasSize

    // 1. 磁场区域底色与边界
    drawMagneticFieldRegion({
      ctx, canvasWidth: canvasSize.width, font,
      activeBoundaryType, effectiveB, d, Rb, toCanvasPixel, metersToPixels,
    })

    // 2. 进阶模式叠加层（粒子族轨迹 + 包络 + 圆心几何）
    drawAdvancedOverlay({
      ctx, canvasWidth: canvasSize.width, canvasHeight: canvasSize.height, font,
      mode, dynamicType, showEnvelope, showGeometry, R, activeTheta, sign,
      particleFamily, getParticleState, toCanvasPixel, metersToPixels, focusState,
    })

    // 3. 基础模式几何辅助线
    drawBasicGeometry({
      ctx, font, showGeometry, showArc, mode, activeTheta, sign, R,
      focusState, toCanvasPixel, metersToPixels,
    })

    // 4. 焦点粒子轨迹（统一组件：预测虚线 + 历史虚线 + 拖尾 + 本体）
    const { px: fpx, py: fpy } = toCanvasPixel(focusState.px, focusState.py)
    drawCanvasParticleTrajectory({
      ctx,
      px: fpx,
      py: fpy,
      predictedPoints: focusArcPredicted,
      historyPoints: focusArcHistory,
      tailPoints: focusArcTail,
      isFocus: true,
      chargeSign: q > 0 ? '+' : '-',
    })

    // 5. 非焦点粒子（进阶模式，保持原有拖尾效果）
    drawNonFocusParticles({
      ctx, mode, progressTime, tSlideIn, particleFamily, getParticleState, toCanvasPixel,
    })

  }, [
    mode,
    activeBoundaryType,
    dynamicType,
    q,
    m,
    v,
    effectiveB,
    activeTheta,
    d,
    Rb,
    showGeometry,
    showArc,
    showEnvelope,
    progressTime,
    sceneScale,
    canvasSize,
    tOut,
    R,
    sign,
    tSlideIn,
    getParticleState,
    particleFamily,
    focusState,
    focusArcPredicted,
    focusArcHistory,
    focusArcTail,
    metersToPixels,
    setupFrame,
    toCanvasPixel
  ])


  // 矢量起点转为设计坐标（<g transform={vp.transform}> 内统一使用设计坐标）
  const particleDesign = worldToDesign(focusState.px, focusState.py, sceneScale)



  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      canvasRef={canvasRef}
    >
      {/* 焦点粒子速度矢量（全程显示） */}
      {showVelocityVector && (
        <PhysicsVectorArrow
          originDesign={{ x: particleDesign.px, y: particleDesign.py }}
          vector={{ x: focusState.vx, y: focusState.vy }}
          type="velocity"
          sceneScale={sceneScale}
        />
      )}
      {/* 焦点粒子洛伦兹力矢量（仅在磁场偏转区内） */}
      {inField && (
        <PhysicsVectorArrow
          originDesign={{ x: particleDesign.px, y: particleDesign.py }}
          vector={forceVector}
          type="lorentzForce"
          sceneScale={sceneScale}
        />
      )}
    </AnimationSvgCanvas>
  )
}
