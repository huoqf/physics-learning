import { useCanvasSize, useViewport } from '@/utils'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_STYLE,
} from '@/theme/physics'
import { physicsToCanvasWithOrigin, PX_PER_METER } from '@/utils/coordinate'
import { VelocityTimeChart } from '@/components/Chart'

/** 动量守恒动画布局常量 */
const MC_LAYOUT = {
  canvasPadding: 50,
  ballBaseRadius: 16,
  massRadiusScale: 2,
  vectorMaxLength: 80,
  /** 木板高度 (px) */
  boardHeight: 18,
  /** 滑块高度 (px) */
  sliderHeight: 28,
  /** 滑块宽度 (px) */
  sliderWidth: 40,
  /** 动量条最大长度 (px) */
  momentumBarMaxLength: 120,
  /** 重力加速度 (m/s²) */
  g: 9.8,
} as const

// 辅助函数：截断并插值生成当前时间刻度以前的数据点
function getPointsUpToTime(domainPoints: Array<{ t: number; v: number }>, currentTime: number) {
  if (domainPoints.length === 0) return []
  const result: Array<{ t: number; v: number }> = []
  for (let i = 0; i < domainPoints.length; i++) {
    const pt = domainPoints[i]
    if (pt.t < currentTime) {
      result.push(pt)
    } else {
      if (i > 0) {
        const prev = domainPoints[i - 1]
        const ratio = (currentTime - prev.t) / (pt.t - prev.t)
        const interpolatedV = prev.v + ratio * (pt.v - prev.v)
        result.push({ t: currentTime, v: interpolatedV })
      } else {
        result.push({ t: currentTime, v: pt.v })
      }
      break
    }
  }
  const lastPt = domainPoints[domainPoints.length - 1]
  if (currentTime >= lastPt.t) {
    if (result.length < domainPoints.length) {
      result.push(lastPt)
    }
    if (currentTime > lastPt.t) {
      result.push({ t: currentTime, v: lastPt.v })
    }
  }
  return result
}

export default function MomentumConservationAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )
  
  // 下方动画容器大小 (真实大小)
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 180 })

  // 视口架构适配：将设计画布大小定为 700 x 180
  const vp = useViewport(canvasSize, {
    designWidth: 700,
    designHeight: 180,
  })

  const {
    m1 = 3, v1 = 5,
    m2 = 2, v2 = 0,
    m_slider = 1, M_board = 3, v0 = 6, mu = 0.3, L = 2,
    advancedMode = 0,
    collisionType = 0, // 0: 弹性, 1: 完全非弹性, 2: 恢复系数可调
    e_coefficient = 0.5,
  } = params

  const isAdvanced = advancedMode === 1

  // 在设计空间 (designHeight = 180) 中，地面 Y 坐标统一设为 130 px
  const groundY = 130



  // 新增：专为设计空间像素坐标下的矢量箭头设计的 scale，使其起点不受 scaleX 缩放，与球心/质心像素坐标完美重合
  const vectorSceneScale = useMemo(() => ({
    scaleX: 1,
    scaleY: 1,
    scale: 1,
    originX: 0,
    originY: groundY,
    maxVectorLength: MC_LAYOUT.vectorMaxLength,
    refMagnitudes: {
      velocity: 10,
    },
  }), [groundY])

  // ── 基础模式：两球碰撞 ──
  const R_A = MC_LAYOUT.ballBaseRadius + m1 * MC_LAYOUT.massRadiusScale
  const R_B = MC_LAYOUT.ballBaseRadius + m2 * MC_LAYOUT.massRadiusScale

  // 在 700 px 设计空间下设定球的初始设计位置
  const initPosAx = 700 * 0.25 // 175 px
  const initPosBx = 700 * 0.65 // 455 px

  // 将设计尺寸下的球半径转换为物理单位，供碰撞计算
  const rPhysA = R_A / PX_PER_METER
  const rPhysB = R_B / PX_PER_METER
  
  // 物理坐标初始化：球A在 0 处，球B在物理坐标 gap 处
  const initPhysX_A = 0
  const initPhysX_B = (initPosBx - initPosAx) / PX_PER_METER

  // 计算恢复系数 e
  let eVal = 1.0
  if (collisionType === 1) eVal = 0.0
  else if (collisionType === 2) eVal = e_coefficient

  const approachSpeed = v1 - v2
  const gapPhys = initPhysX_B - rPhysB - (initPhysX_A + rPhysA)
  let collisionTime = Infinity
  let v1After = v1
  let v2After = v2

  if (approachSpeed > 0 && gapPhys > 0) {
    collisionTime = gapPhys / approachSpeed
    v1After = ((m1 - eVal * m2) * v1 + m2 * (1 + eVal) * v2) / (m1 + m2)
    v2After = (m1 * (1 + eVal) * v1 + (m2 - eVal * m1) * v2) / (m1 + m2)
  }

  // 时刻 t 两小球的物理坐标与速度
  let xPhysA = 0
  let xPhysB = initPhysX_B
  let currentV1 = v1
  let currentV2 = v2

  if (time < collisionTime) {
    xPhysA = initPhysX_A + v1 * time
    xPhysB = initPhysX_B + v2 * time
    currentV1 = v1
    currentV2 = v2
  } else {
    const dt = time - collisionTime
    const colXPhysA = initPhysX_A + v1 * collisionTime
    const colXPhysB = initPhysX_B + v2 * collisionTime
    xPhysA = colXPhysA + v1After * dt
    xPhysB = colXPhysB + v2After * dt
    currentV1 = v1After
    currentV2 = v2After
  }

  // 统一在设计空间中使用 physicsToCanvasWithOrigin 转换为像素位置
  const { cx: rawPosAx } = physicsToCanvasWithOrigin(xPhysA, 0, initPosAx, groundY, PX_PER_METER)
  const { cx: rawPosBx } = physicsToCanvasWithOrigin(xPhysB, 0, initPosAx, groundY, PX_PER_METER)

  // 设计空间边界截断 (防止飞出设计宽度 [MC_LAYOUT.canvasPadding, 700 - MC_LAYOUT.canvasPadding])
  const leftBound = MC_LAYOUT.canvasPadding + R_A
  const rightBound = 700 - MC_LAYOUT.canvasPadding - R_B
  const posAx = Math.max(leftBound, Math.min(rightBound + R_B - R_A, rawPosAx))
  const posBx = Math.max(leftBound - R_A + R_B, Math.min(rightBound, rawPosBx))

  // ── 进阶模式：滑块-木板 ──
  const vCommon = (m_slider * v0) / (m_slider + M_board)
  const a_rel = mu * MC_LAYOUT.g * (1 + m_slider / M_board)
  const tCommon = v0 / a_rel

  const x1AtCommon = v0 * tCommon - 0.5 * mu * MC_LAYOUT.g * tCommon * tCommon
  const x2AtCommon = 0.5 * (mu * m_slider * MC_LAYOUT.g / M_board) * tCommon * tCommon
  const deltaXAtCommon = x1AtCommon - x2AtCommon
  const isFallen = deltaXAtCommon > L

  let tFall = Infinity
  let vSliderFall = v0
  let vBoardFall = 0
  let x1AtFall = 0
  let x2AtFall = 0

  if (isFallen) {
    tFall = (v0 - Math.sqrt(v0 * v0 - 2 * a_rel * L)) / a_rel
    vSliderFall = v0 - mu * MC_LAYOUT.g * tFall
    vBoardFall = (mu * m_slider * MC_LAYOUT.g / M_board) * tFall
    x1AtFall = v0 * tFall - 0.5 * mu * MC_LAYOUT.g * tFall * tFall
    x2AtFall = 0.5 * (mu * m_slider * MC_LAYOUT.g / M_board) * tFall * tFall
  }

  // 物理坐标及平抛下落 y 轴位移
  let currentXSlider = 0
  let currentXBoard = 0
  let currentVSlider = 0
  let currentVBoard = 0
  let sliderOffBoard = false
  let yOffset = 0 // px 下落高度

  const tDrop = 0.4 // 下落时间 0.4s

  if (isFallen) {
    if (time < tFall) {
      currentVSlider = v0 - mu * MC_LAYOUT.g * time
      currentVBoard = (mu * m_slider * MC_LAYOUT.g / M_board) * time
      currentXSlider = v0 * time - 0.5 * mu * MC_LAYOUT.g * time * time
      currentXBoard = 0.5 * (mu * m_slider * MC_LAYOUT.g / M_board) * time * time
    } else {
      currentVSlider = vSliderFall
      currentVBoard = vBoardFall
      currentXSlider = x1AtFall + vSliderFall * (time - tFall)
      currentXBoard = x2AtFall + vBoardFall * (time - tFall)
      sliderOffBoard = true
      
      const dtFall = time - tFall
      if (dtFall < tDrop) {
        yOffset = MC_LAYOUT.boardHeight * (dtFall / tDrop) * (dtFall / tDrop)
      } else {
        yOffset = MC_LAYOUT.boardHeight
      }
    }
  } else {
    if (time < tCommon) {
      currentVSlider = v0 - mu * MC_LAYOUT.g * time
      currentVBoard = (mu * m_slider * MC_LAYOUT.g / M_board) * time
      currentXSlider = v0 * time - 0.5 * mu * MC_LAYOUT.g * time * time
      currentXBoard = 0.5 * (mu * m_slider * MC_LAYOUT.g / M_board) * time * time
    } else {
      currentVSlider = vCommon
      currentVBoard = vCommon
      currentXSlider = x1AtCommon + vCommon * (time - tCommon)
      currentXBoard = x2AtCommon + vCommon * (time - tCommon)
    }
  }

  const currentDeltaX = Math.min(currentXSlider - currentXBoard, L)

  // 设计空间中的像素位置
  const boardInitX = 700 * 0.25
  const { cx: boardPixelX } = physicsToCanvasWithOrigin(currentXBoard, 0, boardInitX, groundY, PX_PER_METER)
  const { cx: sliderPixelX } = physicsToCanvasWithOrigin(currentXSlider, 0, boardInitX, groundY, PX_PER_METER)
  const boardPixelW = L * PX_PER_METER

  const boardTopY = groundY - MC_LAYOUT.boardHeight
  const sliderTopY = boardTopY - MC_LAYOUT.sliderHeight + yOffset

  // ── 构建图表数据点 (domainPoints) ──

  // 1. 基础模式点集
  const baseVtDomain1 = useMemo(() => {
    if (collisionTime === Infinity) return [{ t: 0, v: v1 }, { t: 10, v: v1 }]
    return [
      { t: 0, v: v1 },
      { t: Math.max(0, collisionTime - 0.001), v: v1 },
      { t: Math.min(10, collisionTime + 0.001), v: v1After },
      { t: 10, v: v1After }
    ]
  }, [v1, collisionTime, v1After])

  const baseVtDomain2 = useMemo(() => {
    if (collisionTime === Infinity) return [{ t: 0, v: v2 }, { t: 10, v: v2 }]
    return [
      { t: 0, v: v2 },
      { t: Math.max(0, collisionTime - 0.001), v: v2 },
      { t: Math.min(10, collisionTime + 0.001), v: v2After },
      { t: 10, v: v2After }
    ]
  }, [v2, collisionTime, v2After])

  const basePtDomain1 = useMemo(() => baseVtDomain1.map(p => ({ t: p.t, v: m1 * p.v })), [baseVtDomain1, m1])
  const basePtDomain2 = useMemo(() => baseVtDomain2.map(p => ({ t: p.t, v: m2 * p.v })), [baseVtDomain2, m2])
  const basePtDomainTotal = useMemo(() => [{ t: 0, v: m1 * v1 + m2 * v2 }, { t: 10, v: m1 * v1 + m2 * v2 }], [m1, v1, m2, v2])

  // 2. 进阶模式点集
  const advVtDomain1 = useMemo(() => {
    if (isFallen) {
      return [
        { t: 0, v: v0 },
        { t: tFall, v: vSliderFall },
        { t: 10, v: vSliderFall }
      ]
    }
    return [
      { t: 0, v: v0 },
      { t: tCommon, v: vCommon },
      { t: 10, v: vCommon }
    ]
  }, [isFallen, v0, tFall, vSliderFall, tCommon, vCommon])

  const advVtDomain2 = useMemo(() => {
    if (isFallen) {
      return [
        { t: 0, v: 0 },
        { t: tFall, v: vBoardFall },
        { t: 10, v: vBoardFall }
      ]
    }
    return [
      { t: 0, v: 0 },
      { t: tCommon, v: vCommon },
      { t: 10, v: vCommon }
    ]
  }, [isFallen, tFall, vBoardFall, tCommon, vCommon])

  const advPtDomain1 = useMemo(() => advVtDomain1.map(p => ({ t: p.t, v: m_slider * p.v })), [advVtDomain1, m_slider])
  const advPtDomain2 = useMemo(() => advVtDomain2.map(p => ({ t: p.t, v: M_board * p.v })), [advVtDomain2, M_board])
  const advPtDomainTotal = useMemo(() => [{ t: 0, v: m_slider * v0 }, { t: 10, v: m_slider * v0 }], [m_slider, v0])

  // 选择正确的数据集
  const currentDomainVtPoints1 = isAdvanced ? advVtDomain1 : baseVtDomain1
  const currentDomainVtPoints2 = isAdvanced ? advVtDomain2 : baseVtDomain2
  const currentDomainPtPoints1 = isAdvanced ? advPtDomain1 : basePtDomain1
  const currentDomainPtPoints2 = isAdvanced ? advPtDomain2 : basePtDomain2
  const currentDomainPtPointsTotal = isAdvanced ? advPtDomainTotal : basePtDomainTotal

  // 动态截断得到当前渲染曲线
  const currentT = time
  const currentVtPoints1 = useMemo(() => getPointsUpToTime(currentDomainVtPoints1, currentT), [currentDomainVtPoints1, currentT])
  const currentVtPoints2 = useMemo(() => getPointsUpToTime(currentDomainVtPoints2, currentT), [currentDomainVtPoints2, currentT])
  const currentPtPoints1 = useMemo(() => getPointsUpToTime(currentDomainPtPoints1, currentT), [currentDomainPtPoints1, currentT])
  const currentPtPoints2 = useMemo(() => getPointsUpToTime(currentDomainPtPoints2, currentT), [currentDomainPtPoints2, currentT])
  const currentPtPointsTotal = useMemo(() => getPointsUpToTime(currentDomainPtPointsTotal, currentT), [currentDomainPtPointsTotal, currentT])

  // 速度/动量矢量映射
  const vMaxRef = 10
  const mapArrowLen = (val: number) => (Math.abs(val) / vMaxRef) * MC_LAYOUT.vectorMaxLength

  // 总动量条映射
  const pTotal = isAdvanced ? m_slider * v0 : m1 * v1 + m2 * v2
  const pMaxRef = 10 * 10
  const mapMomentumBar = (p: number) => (Math.abs(p) / pMaxRef) * MC_LAYOUT.momentumBarMaxLength

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 box-border bg-neutral-50 overflow-hidden">
      {/* ==================== 上方并列图表区 (高度进一步增大，更适合清晰展示 V-T / P-T 细节) ==================== */}
      <div className="flex gap-4 h-[310px] shrink-0">
        <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <VelocityTimeChart
              mode="animated"
              points={currentVtPoints1}
              domainPoints={currentDomainVtPoints1}
              currentTime={currentT}
              tMax={10}
              title="速度-时间图像 (V-T)"
              xLabel="时间 t (s)"
              yLabel="速度 v (m/s)"
              additionalSeries={[
                {
                  points: currentVtPoints2,
                  domainPoints: currentDomainVtPoints2,
                  label: isAdvanced ? '木板' : 'B球',
                  series: 'secondary',
                }
              ]}
              showArea={false}
            />
          </div>
        </div>
        <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <VelocityTimeChart
              mode="animated"
              points={currentPtPoints1}
              domainPoints={currentDomainPtPoints1}
              currentTime={currentT}
              tMax={10}
              title="动量-时间图像 (P-T)"
              xLabel="时间 t (s)"
              yLabel="动量 p (kg·m/s)"
              additionalSeries={[
                {
                  points: currentPtPoints2,
                  domainPoints: currentDomainPtPoints2,
                  label: isAdvanced ? '木板' : 'B球',
                  series: 'secondary',
                },
                {
                  points: currentPtPointsTotal,
                  domainPoints: currentDomainPtPointsTotal,
                  label: '总动量',
                  series: 'success',
                }
              ]}
              showArea={false}
            />
          </div>
        </div>
      </div>

      {/* ==================== 下方仿真动画区 (高度占用很小，由 viewport 架构自适应 contain 居中渲染) ==================== */}
      <div ref={containerRef} className="flex-1 min-h-[100px] bg-white border border-neutral-200/80 rounded-xl shadow-sm relative overflow-hidden">
        <svg
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full h-full"
        >
          {/* Defs */}
          <defs>
            <radialGradient id="steel-sphere-grad-mc" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
              <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
              <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
              <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
            </radialGradient>
            <radialGradient id="steel-sphere-grad-mc-b" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[0]} />
              <stop offset="40%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[1]} />
              <stop offset="80%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[2]} />
              <stop offset="100%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[3]} />
            </radialGradient>
            {/* 实验室粗糙木板渐变，由 SCENE_COLORS.materials.labWoodGrad 注入，提升拟真度 */}
            <linearGradient id="wood-board-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={SCENE_COLORS.materials.labWoodGrad[0]} />
              <stop offset="30%" stopColor={SCENE_COLORS.materials.labWoodGrad[1]} />
              <stop offset="70%" stopColor={SCENE_COLORS.materials.labWoodGrad[2]} />
              <stop offset="100%" stopColor={SCENE_COLORS.materials.labWoodGrad[3]} />
            </linearGradient>
          </defs>

          {/* 将所有画面核心内容包裹在 viewport transform 中，由设计空间（700x180）自动缩放 */}
          <g transform={vp.transform}>
            {/* 地面线 */}
            <PhysicsGround
              x={MC_LAYOUT.canvasPadding} y={groundY}
              width={700 - 2 * MC_LAYOUT.canvasPadding}
              appearance={{ color: PHYSICS_COLORS.labelText }}
            />

            {/* 基础模式：两球碰撞 */}
            {!isAdvanced && (
              <g>
                {/* A球 */}
                <circle
                  cx={posAx}
                  cy={groundY - R_A}
                  r={R_A}
                  fill="url(#steel-sphere-grad-mc)"
                  stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
                  strokeWidth={CANVAS_STYLE.stroke.objectLine}
                />
                <text x={posAx} y={groundY - R_A + 4} fontSize={canvasSize.font(10)} fill="white" textAnchor="middle" fontWeight="bold">
                  A
                </text>

                {/* B球 */}
                <circle
                  cx={posBx}
                  cy={groundY - R_B}
                  r={R_B}
                  fill="url(#steel-sphere-grad-mc-b)"
                  stroke={SCENE_COLORS.materials.vacuumSphereGrad[2]}
                  strokeWidth={CANVAS_STYLE.stroke.objectLine}
                />
                <text x={posBx} y={groundY - R_B + 4} fontSize={canvasSize.font(10)} fill="white" textAnchor="middle" fontWeight="bold">
                  B
                </text>

                {/* 碰撞闪光 */}
                {time >= collisionTime && Math.abs(time - collisionTime) < 0.3 && (
                  <circle
                    cx={(posAx + posBx) / 2}
                    cy={groundY - Math.max(R_A, R_B)}
                    r={8 + (0.3 - Math.abs(time - collisionTime)) * 30}
                    fill={PHYSICS_COLORS.kineticEnergy}
                    opacity={0.3}
                  />
                )}

                {/* 速度/动量矢量箭头 (从小球质心出发向运动方向延伸，符合物理规范) */}
                {showVectors && (
                  <g>
                    {currentV1 !== 0 && (
                      <VectorArrow
                        origin={{ x: posAx, y: R_A }}
                        vector={{ x: currentV1, y: 0 }}
                        type="velocity"
                        sceneScale={vectorSceneScale}
                      />
                    )}
                    <text x={posAx} y={groundY - R_A * 2 - 12} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.velocity} textAnchor="middle" fontWeight="bold">
                      v₁={currentV1.toFixed(1)}
                    </text>

                    {currentV2 !== 0 && (
                      <VectorArrow
                        origin={{ x: posBx, y: R_B }}
                        vector={{ x: currentV2, y: 0 }}
                        type="velocity"
                        sceneScale={vectorSceneScale}
                        color={PHYSICS_COLORS.elasticForce}
                      />
                    )}
                    <text x={posBx} y={groundY - R_B * 2 - 12} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.elasticForce} textAnchor="middle" fontWeight="bold">
                      v₂={currentV2.toFixed(1)}
                    </text>
                  </g>
                )}

                {/* 总动量双色长条图 */}
                <g transform={`translate(${MC_LAYOUT.canvasPadding}, ${groundY + 22})`}>
                  {m1 * currentV1 >= 0 ? (
                    // 正向拼接
                    <>
                      {/* p1 段 */}
                      <rect
                        x={0}
                        y={0}
                        width={mapMomentumBar(m1 * currentV1)}
                        height={10}
                        fill={PHYSICS_COLORS.momentum}
                        opacity={0.7}
                        rx={2}
                      />
                      {m1 * currentV1 > 1.0 && (
                        <text x={mapMomentumBar(m1 * currentV1) / 2} y={8} fontSize={canvasSize.font(8)} fill="white" textAnchor="middle" fontWeight="bold">
                          p₁
                        </text>
                      )}

                      {/* p2 段 */}
                      <rect
                        x={mapMomentumBar(m1 * currentV1)}
                        y={0}
                        width={mapMomentumBar(m2 * currentV2)}
                        height={10}
                        fill={PHYSICS_COLORS.impulse}
                        opacity={0.7}
                        rx={2}
                      />
                      {m2 * currentV2 > 1.0 && (
                        <text x={mapMomentumBar(m1 * currentV1) + mapMomentumBar(m2 * currentV2) / 2} y={8} fontSize={canvasSize.font(8)} fill="white" textAnchor="middle" fontWeight="bold">
                          p₂
                        </text>
                      )}
                    </>
                  ) : (
                    // 反弹抵消展示：p1 < 0, p2 > p_total
                    <>
                      {/* p2 大段 (正向) */}
                      <rect
                        x={0}
                        y={0}
                        width={mapMomentumBar(m2 * currentV2)}
                        height={10}
                        fill={PHYSICS_COLORS.impulse}
                        opacity={0.7}
                        rx={2}
                      />
                      <text x={mapMomentumBar(m2 * currentV2) / 2} y={8} fontSize={canvasSize.font(8)} fill="white" textAnchor="middle" fontWeight="bold">
                        p₂
                      </text>

                      {/* p1 反向抵消段 (向左画，红色) */}
                      <rect
                        x={mapMomentumBar(m2 * currentV2) - mapMomentumBar(Math.abs(m1 * currentV1))}
                        y={1}
                        width={mapMomentumBar(Math.abs(m1 * currentV1))}
                        height={8}
                        fill={PHYSICS_COLORS.forceArrowRed}
                        opacity={0.8}
                        rx={1}
                      />
                      <text 
                        x={mapMomentumBar(m2 * currentV2) - mapMomentumBar(Math.abs(m1 * currentV1)) / 2} 
                        y={8} 
                        fontSize={canvasSize.font(8)} 
                        fill="white" 
                        textAnchor="middle" 
                        fontWeight="bold"
                      >
                        -p₁
                      </text>
                    </>
                  )}

                  {/* 总动量标注 */}
                  <text x={mapMomentumBar(pTotal) + 8} y={9} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.momentum} fontWeight="bold">
                    p_总 = {pTotal.toFixed(1)} kg·m/s
                  </text>
                </g>
              </g>
            )}

            {/* 进阶模式：滑块-木板 */}
            {isAdvanced && (
              <g>
                {/* 木板 (木纹材质渐变) */}
                <rect
                  x={boardPixelX}
                  y={boardTopY}
                  width={boardPixelW}
                  height={MC_LAYOUT.boardHeight}
                  rx={3}
                  fill="url(#wood-board-grad)"
                  stroke={SCENE_COLORS.materials.labWoodGrad[3]}
                  strokeWidth={CANVAS_STYLE.stroke.objectLine}
                />
                <text
                  x={boardPixelX + boardPixelW / 2}
                  y={boardTopY + MC_LAYOUT.boardHeight / 2 + 3}
                  fontSize={canvasSize.font(10)}
                  fill="white"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  M = {M_board.toFixed(1)} kg
                </text>

                {/* 滑块 */}
                <rect
                  x={sliderPixelX - MC_LAYOUT.sliderWidth / 2}
                  y={sliderTopY}
                  width={MC_LAYOUT.sliderWidth}
                  height={MC_LAYOUT.sliderHeight}
                  rx={4}
                  fill="url(#steel-sphere-grad-mc)"
                  stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
                  strokeWidth={CANVAS_STYLE.stroke.objectLine}
                  opacity={sliderOffBoard ? 0.8 : 1}
                />
                <text
                  x={sliderPixelX}
                  y={sliderTopY + MC_LAYOUT.sliderHeight / 2 + 3}
                  fontSize={canvasSize.font(10)}
                  fill="white"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  m = {m_slider.toFixed(1)} kg
                </text>

                {/* 相对滑动划痕 */}
                {!sliderOffBoard && currentVSlider !== currentVBoard && currentDeltaX > 0 && (
                  <line
                    x1={Math.max(boardPixelX, sliderPixelX - MC_LAYOUT.sliderWidth / 2)}
                    y1={boardTopY + 1}
                    x2={sliderPixelX + MC_LAYOUT.sliderWidth / 2}
                    y2={boardTopY + 1}
                    stroke={PHYSICS_COLORS.elasticForce}
                    strokeWidth={2}
                    opacity={0.4}
                    strokeDasharray="3,2"
                  />
                )}

                {/* 质心标志 */}
                <circle
                  cx={boardInitX + (m_slider * currentXSlider + M_board * currentXBoard) / (m_slider + M_board) * PX_PER_METER}
                  cy={boardTopY - 3}
                  r={3}
                  fill={PHYSICS_COLORS.referencePoint}
                />
                <text
                  x={boardInitX + (m_slider * currentXSlider + M_board * currentXBoard) / (m_slider + M_board) * PX_PER_METER}
                  y={boardTopY - 8}
                  fontSize={canvasSize.font(10)}
                  fill={PHYSICS_COLORS.referencePoint}
                  textAnchor="middle"
                >
                  质心
                </text>

                {/* 共同速度虚线 */}
                {!isFallen && time >= tCommon && (
                  <line
                    x1={MC_LAYOUT.canvasPadding}
                    y1={sliderTopY - 5}
                    x2={700 - MC_LAYOUT.canvasPadding}
                    y2={sliderTopY - 5}
                    stroke={PHYSICS_COLORS.kineticEnergy}
                    strokeWidth={1}
                    strokeDasharray="6,4"
                    opacity={0.5}
                  />
                )}

                {/* 速度/动量矢量 */}
                {showVectors && (
                  <g>
                    {/* 滑块速度 */}
                    {currentVSlider > 0 && (
                      <VectorArrow
                        origin={{ x: sliderPixelX, y: groundY - sliderTopY - 14 }}
                        vector={{ x: currentVSlider, y: 0 }}
                        type="velocity"
                        sceneScale={vectorSceneScale}
                      />
                    )}
                    <text
                      x={sliderPixelX + mapArrowLen(currentVSlider) / 2}
                      y={sliderTopY - 12}
                      fontSize={canvasSize.font(10)}
                      fill={PHYSICS_COLORS.velocity}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      v_滑块 = {currentVSlider.toFixed(2)}
                    </text>

                    {/* 木板速度 */}
                    {currentVBoard > 0 && (
                      <VectorArrow
                        origin={{ x: boardPixelX + boardPixelW / 2, y: groundY - boardTopY - 9 }}
                        vector={{ x: currentVBoard, y: 0 }}
                        type="velocity"
                        sceneScale={vectorSceneScale}
                        color={PHYSICS_COLORS.elasticForce}
                      />
                    )}
                    <text
                      x={boardPixelX + boardPixelW / 2 + mapArrowLen(currentVBoard) / 2}
                      y={boardTopY + MC_LAYOUT.boardHeight + 14}
                      fontSize={canvasSize.font(10)}
                      fill={PHYSICS_COLORS.elasticForce}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      v_木板 = {currentVBoard.toFixed(2)}
                    </text>

                    {/* 共速标注 */}
                    {!isFallen && time >= tCommon && (
                      <text
                        x={700 * 0.5}
                        y={sliderTopY - 12}
                        fontSize={canvasSize.font(10)}
                        fill={PHYSICS_COLORS.kineticEnergy}
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        v_共 = {vCommon.toFixed(2)} m/s
                      </text>
                    )}
                  </g>
                )}

                {/* 警告/临界结论 */}
                {sliderOffBoard && (
                  <g transform={`translate(${700 * 0.5}, 25)`}>
                    <rect
                      x={-180}
                      y={-14}
                      width={360}
                      height={22}
                      rx={6}
                      fill={SCENE_COLORS.labels.glassPanelBg}
                      stroke={PHYSICS_COLORS.forceArrowRed}
                      strokeWidth={1}
                    />
                    <text
                      fontSize={canvasSize.font(10)}
                      fill={PHYSICS_COLORS.forceArrowRed}
                      fontWeight="bold"
                      textAnchor="middle"
                      y={1}
                    >
                      临界：板长 L &lt; 共速位移 Δx，滑块已滑落！
                    </text>
                  </g>
                )}
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  )
}
