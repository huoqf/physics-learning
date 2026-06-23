import { useCanvasSize } from '@/utils'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  calculateMomentumScalar,
  calculateMomentum1D,
  calculateTotalMomentum,
  calculateCenterOfMass,
  kineticEnergyFromMomentum,
  generateMomentumEnergyCurve,
  elasticCollision1D,
} from '@/physics/momentum'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { RelationChart } from '@/components/Chart'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CHART_COLORS,
  CANVAS_STYLE,
  FONT,
} from '@/theme/physics'

/** 动量动画参数范围 */
const MOMENTUM_PARAM_BOUNDS = {
  mMin: 1, mMax: 10,
  vMin: -10, vMax: 10,
} as const

/** 动量动画布局常量 */
const MOMENTUM_LAYOUT = {
  /** 钢珠基础半径 (px) */
  steelBallBaseRadius: 14,
  /** 质量缩放半径系数 (px/kg) */
  massRadiusScale: 1.8,
  /** Canvas 安全余量 (px) */
  canvasPadding: 60,
  /** 矢量最大绘制长度 (px) */
  vectorMaxLength: 90,
  /** 动量矩形图最大高度 (px) */
  momentumBarMaxHeight: 80,
  /** 动量矩形图宽度 (px) */
  momentumBarWidth: 30,
  /** 正方向标尺长度 (px) */
  directionScaleLen: 40,
  /** Ek-p 关系图卡片最小宽度 (px) */
  ekCardMinWidth: 220,
  /** Ek-p 关系图卡片最小高度 (px) */
  ekCardMinHeight: 150,
  /** Ek-p 关系图卡片右侧偏移 (px) */
  ekCardRightOffset: 20,
  /** Ek-p 关系图卡片内边距 */
  ekCardPadding: { left: 40, right: 15, top: 25, bottom: 25 },
  /** 地面线 Y 偏移 (px) */
  groundOffset: 80,
  /** 球心离地面高度 (px) */
  ballAboveGround: 40,
  /** 动量矢量轴 Y 偏移 (px) */
  momentumAxisY: 45,
  /** 总动量轴 Y 偏移 (px) */
  totalMomentumAxisY: 60,
  /** 速度-像素缩放因子 (px per m/s·s) */
  velocityScale: 25,
  /** 动画循环周期 (s) */
  cyclePeriod: 6,
} as const

export default function MomentumAnimation() {
    const {params, time, showVectors} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 450 })
  // canvasSize.font removed: chart text handled by RelationChart

  const {
    m = 3,
    v = 4,
    mA = 3,
    vA = 5,
    mB = 2,
    vB = -3,
    advancedMode = 0,
    showEkChart = 1,
  } = params

  const isAdvanced = advancedMode === 1
  const groundY = canvasSize.height - MOMENTUM_LAYOUT.groundOffset
  const ballCenterY = groundY - MOMENTUM_LAYOUT.ballAboveGround

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: {
      x: 0,
      y: 0,
      width: canvasSize.width - MOMENTUM_LAYOUT.canvasPadding * 2,
      height: canvasSize.height - MOMENTUM_LAYOUT.canvasPadding,
    },
    originX: 0,
    originY: groundY,
    worldWidth: canvasSize.width,
    worldHeight: canvasSize.height,
    refMagnitudes: {
      velocity: MOMENTUM_PARAM_BOUNDS.vMax,
      momentum: MOMENTUM_PARAM_BOUNDS.mMax * MOMENTUM_PARAM_BOUNDS.vMax,
    },
  }), [canvasSize.width, canvasSize.height, groundY]);

  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  // ── 基础模式：单球 ──────────────────────────────────────────
  const p_basic = calculateMomentumScalar(m, v)
  const R_basic = MOMENTUM_LAYOUT.steelBallBaseRadius + m * MOMENTUM_LAYOUT.massRadiusScale
  const basicBallX = canvasSize.width * 0.35

  // ── 进阶模式：双球一维对冲动画 ──────────────────────────────
  const R_A = MOMENTUM_LAYOUT.steelBallBaseRadius + mA * MOMENTUM_LAYOUT.massRadiusScale
  const R_B = MOMENTUM_LAYOUT.steelBallBaseRadius + mB * MOMENTUM_LAYOUT.massRadiusScale

  // 动画区域边界
  const leftBound = MOMENTUM_LAYOUT.canvasPadding + R_A
  const rightBound = canvasSize.width - MOMENTUM_LAYOUT.canvasPadding - R_B

  // 初始位置：A在左侧，B在右侧
  const initPosAx = canvasSize.width * 0.25
  const initPosBx = canvasSize.width * 0.75

  // 计算碰撞时刻和碰后速度
  const { collisionTime, posAx, posBx, currentVA, currentVB } = useMemo(() => {
    const scale = MOMENTUM_LAYOUT.velocityScale
    // A和B的相对接近速度（像素/秒）
    const relVA = vA * scale
    const relVB = vB * scale
    // 碰撞条件：A球右侧边缘碰到B球左侧边缘
    const gap = initPosBx - R_B - (initPosAx + R_A)
    const approachSpeed = relVA - relVB // A追B的相对速度

    let tCollision = Infinity
    let vAf = vA
    let vBf = vB

    // 只有A追上B才会碰撞（approachSpeed > 0 表示A在接近B）
    if (approachSpeed > 0 && gap > 0) {
      tCollision = gap / approachSpeed
      // 弹性碰撞
      const [va, vb] = elasticCollision1D(mA, vA, mB, vB)
      vAf = va
      vBf = vb
    }

    // 当前时刻球的位置和速度
    const t = time
    let curVA = vA
    let curVB = vB
    let curPosAx: number
    let curPosBx: number

    if (t < tCollision) {
      // 碰撞前：匀速运动
      curPosAx = initPosAx + vA * t * scale
      curPosBx = initPosBx + vB * t * scale
      curVA = vA
      curVB = vB
    } else {
      // 碰撞后：以碰后速度匀速运动
      const dt = t - tCollision
      const colPosAx = initPosAx + vA * tCollision * scale
      const colPosBx = initPosBx + vB * tCollision * scale
      curPosAx = colPosAx + vAf * dt * scale
      curPosBx = colPosBx + vBf * dt * scale
      curVA = vAf
      curVB = vBf
    }

    return {
      collisionTime: tCollision,
      posAx: curPosAx,
      posBx: curPosBx,
      currentVA: curVA,
      currentVB: curVB,
    }
  }, [time, vA, vB, mA, mB, R_A, R_B, initPosAx, initPosBx])

  // 边界约束：球不能飞出画面
  const clampedPosAx = Math.max(leftBound, Math.min(rightBound + R_B - R_A, posAx))
  const clampedPosBx = Math.max(leftBound - R_A + R_B, Math.min(rightBound, posBx))

  // 当前动量与动能（实时跟随碰前/碰后速度）
  const pA = calculateMomentum1D(mA, currentVA)
  const pB = calculateMomentum1D(mB, currentVB)
  const pTotal = calculateTotalMomentum(pA, pB)
  const EkA = kineticEnergyFromMomentum(Math.abs(pA), mA)
  const EkB = kineticEnergyFromMomentum(Math.abs(pB), mB)

  // 质心位置
  const xCm = calculateCenterOfMass(mA, clampedPosAx, mB, clampedPosBx)

  // 碰撞标记
  const hasCollided = time >= collisionTime

  // ── 进阶模式：Ek-p 关系图 ───────────────────────────────────
  const showEkCard = isAdvanced && showEkChart === 1

  const cardWidth = Math.max(MOMENTUM_LAYOUT.ekCardMinWidth, canvasSize.width * 0.32)
  const cardHeight = Math.max(MOMENTUM_LAYOUT.ekCardMinHeight, canvasSize.height * 0.35)
  const cardX = canvasSize.width - cardWidth - MOMENTUM_LAYOUT.ekCardRightOffset
  const cardY = 20

  // RelationChart 数据：A球/B球各自 Ek=p²/(2m) 曲线
  const ekCurvePointsA = useMemo(() => {
    const fixedP = Math.abs(pA) || 0.1
    return generateMomentumEnergyCurve(fixedP, 0.5, 10, 30).map(d => ({ x: d.m, y: d.Ek }))
  }, [pA])

  const ekCurvePointsB = useMemo(() => {
    const fixedP = Math.abs(pB) || 0.1
    return generateMomentumEnergyCurve(fixedP, 0.5, 10, 30).map(d => ({ x: d.m, y: d.Ek }))
  }, [pB])

  const ekMax = useMemo(() => {
    const allEks = [...ekCurvePointsA.map(d => d.y), ...ekCurvePointsB.map(d => d.y), EkA, EkB]
    return Math.max(...allEks, 1)
  }, [ekCurvePointsA, ekCurvePointsB, EkA, EkB])

  // ── 矢量安全映射长度 ────────────────────────────────────────
  const vMaxRef = MOMENTUM_PARAM_BOUNDS.vMax
  const mapArrowLen = (val: number) => {
    const maxLen = MOMENTUM_LAYOUT.vectorMaxLength
    return (Math.abs(val) / vMaxRef) * maxLen
  }

  // 动量矩形条高度映射
  const mapMomentumBarH = (pVal: number) => {
    const maxP = MOMENTUM_PARAM_BOUNDS.mMax * MOMENTUM_PARAM_BOUNDS.vMax
    return (Math.abs(pVal) / maxP) * MOMENTUM_LAYOUT.momentumBarMaxHeight
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
      >
        {/* ========== defs 渐变与材质 ========== */}
        <defs>
          {/* 3D 渐变钢珠材质 — 复用 Centripetal 球模型 */}
          <radialGradient id="steel-sphere-grad-mom" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
          </radialGradient>

          {/* B球渐变 — 使用 SCENE_COLORS */}
          <radialGradient id="steel-sphere-grad-mom-b" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[3]} />
          </radialGradient>

        </defs>

        {/* ========== 地面与标尺 ========== */}
        <PhysicsGround
          x={MOMENTUM_LAYOUT.canvasPadding}
          y={groundY}
          width={canvasSize.width - MOMENTUM_LAYOUT.canvasPadding * 2}
          appearance={{ showHatch: true }}
          ruler={{
            domain: [0, 100], // 任意domain，这里我们只关心axisArrow
            showAxisArrow: true,
            axisLabel: isAdvanced ? 'x 正方向' : 'x',
            axisOffset: 20
          }}
        />

        {/* ========== 基础模式：单球 ========== */}
        {!isAdvanced && (
          <g>
            {/* 钢球 */}
            <circle
              cx={basicBallX}
              cy={ballCenterY}
              r={R_basic}
              fill="url(#steel-sphere-grad-mom)"
              stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />

            {/* 质量标签 */}
            <text
              x={basicBallX}
              y={ballCenterY - R_basic - 8}
              fontSize={FONT.bodySize}
              fill={PHYSICS_COLORS.labelTextLight}
              textAnchor="middle"
              fontWeight="bold"
            >
              m = {m.toFixed(1)} kg
            </text>

            {/* 速度箭头 */}
            {showVectors && v > 0 && (
              <VectorArrow
                origin={{ x: basicBallX + R_basic + 4, y: groundY - ballCenterY }}
                vector={{ x: v, y: 0 }}
                type="velocity"
                sceneScale={sceneScale}
              />
            )}

            {/* 动量矩形图 */}
            <g transform={`translate(${basicBallX + R_basic + mapArrowLen(v) + 30}, ${ballCenterY})`}>
              <rect
                x={-MOMENTUM_LAYOUT.momentumBarWidth / 2}
                y={p_basic >= 0 ? -mapMomentumBarH(p_basic) : 0}
                width={MOMENTUM_LAYOUT.momentumBarWidth}
                height={mapMomentumBarH(p_basic)}
                fill={PHYSICS_COLORS.momentum}
                opacity={0.7}
                rx={3}
              />
              <text
                x={0}
                y={p_basic >= 0 ? -mapMomentumBarH(p_basic) - 6 : mapMomentumBarH(p_basic) + 14}
                fontSize={FONT.smallSize}
                fill={PHYSICS_COLORS.momentum}
                fontWeight="bold"
                textAnchor="middle"
              >
                p = {p_basic.toFixed(1)}
              </text>
            </g>
          </g>
        )}

        {/* ========== 进阶模式：双球一维对冲动画 ========== */}
        {isAdvanced && (
          <g>
            {/* A球 */}
            <circle
              cx={clampedPosAx}
              cy={ballCenterY}
              r={R_A}
              fill="url(#steel-sphere-grad-mom)"
              stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            <text
              x={clampedPosAx}
              y={ballCenterY + 4}
              fontSize={FONT.smallSize}
              fill="white"
              textAnchor="middle"
              fontWeight="bold"
            >
              A
            </text>
            <text
              x={clampedPosAx}
              y={ballCenterY - R_A - 8}
              fontSize={FONT.axisSize}
              fill={PHYSICS_COLORS.labelTextLight}
              textAnchor="middle"
              fontWeight="bold"
            >
              m_A = {mA.toFixed(1)} kg
            </text>

            {/* B球 */}
            <circle
              cx={clampedPosBx}
              cy={ballCenterY}
              r={R_B}
              fill="url(#steel-sphere-grad-mom-b)"
              stroke={SCENE_COLORS.materials.vacuumSphereGrad[2]}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            <text
              x={clampedPosBx}
              y={ballCenterY + 4}
              fontSize={FONT.smallSize}
              fill="white"
              textAnchor="middle"
              fontWeight="bold"
            >
              B
            </text>
            <text
              x={clampedPosBx}
              y={ballCenterY - R_B - 8}
              fontSize={FONT.axisSize}
              fill={PHYSICS_COLORS.labelTextLight}
              textAnchor="middle"
              fontWeight="bold"
            >
              m_B = {mB.toFixed(1)} kg
            </text>

            {/* 质心点 */}
            <circle
              cx={xCm}
              cy={ballCenterY}
              r={4}
              fill={PHYSICS_COLORS.referencePoint}
              stroke={PHYSICS_COLORS.referencePoint}
              strokeWidth={1}
            />
            <text
              x={xCm}
              y={ballCenterY + 18}
              fontSize={FONT.smallSize}
              fill={PHYSICS_COLORS.referencePoint}
              textAnchor="middle"
            >
              质心
            </text>

            {/* 碰撞闪光效果 */}
            {hasCollided && Math.abs(time - collisionTime) < 0.3 && (
              <circle
                cx={(clampedPosAx + clampedPosBx) / 2}
                cy={ballCenterY}
                r={8 + (0.3 - Math.abs(time - collisionTime)) * 30}
                fill={PHYSICS_COLORS.kineticEnergy}
                opacity={0.3}
              />
            )}

            {/* 速度箭头 */}
            {showVectors && (
              <g>
                {/* A球速度箭头 */}
                {currentVA !== 0 && (
                  <VectorArrow
                    origin={{ x: clampedPosAx, y: groundY - ballCenterY + R_A + 20 }}
                    vector={{ x: currentVA, y: 0 }}
                    type="velocity"
                    sceneScale={sceneScale}
                  />
                )}
                <text
                  x={clampedPosAx + mapArrowLen(currentVA) * Math.sign(currentVA) / 2}
                  y={ballCenterY - R_A - 26}
                  fontSize={FONT.smallSize}
                  fill={PHYSICS_COLORS.velocity}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  v_A = {currentVA > 0 ? '+' : ''}{currentVA.toFixed(1)}
                </text>

                {/* B球速度箭头 */}
                {currentVB !== 0 && (
                  <VectorArrow
                    origin={{ x: clampedPosBx, y: groundY - ballCenterY + R_B + 20 }}
                    vector={{ x: currentVB, y: 0 }}
                    type="velocity"
                    sceneScale={sceneScale}
                    color={PHYSICS_COLORS.elasticForce}
                  />
                )}
                <text
                  x={clampedPosBx + mapArrowLen(currentVB) * Math.sign(currentVB) / 2}
                  y={ballCenterY - R_B - 26}
                  fontSize={FONT.smallSize}
                  fill={PHYSICS_COLORS.elasticForce}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  v_B = {currentVB > 0 ? '+' : ''}{currentVB.toFixed(1)}
                </text>

                {/* 动量矢量轴 — 在地面下方 */}
                {/* A球动量 */}
                {pA !== 0 && (
                  <VectorArrow
                    origin={{ x: clampedPosAx, y: -(groundY + MOMENTUM_LAYOUT.momentumAxisY - groundY) }}
                    vector={{ x: pA, y: 0 }}
                    type="momentum"
                    sceneScale={sceneScale}
                  />
                )}
                <text x={clampedPosAx} y={groundY + MOMENTUM_LAYOUT.momentumAxisY - 6} fontSize={FONT.smallSize} fill={PHYSICS_COLORS.momentum} textAnchor="middle">
                  p_A = {pA > 0 ? '+' : ''}{pA.toFixed(1)}
                </text>

                {/* B球动量 */}
                {pB !== 0 && (
                  <VectorArrow
                    origin={{ x: clampedPosBx, y: -(groundY + MOMENTUM_LAYOUT.momentumAxisY - groundY) }}
                    vector={{ x: pB, y: 0 }}
                    type="momentum"
                    sceneScale={sceneScale}
                    color={PHYSICS_COLORS.impulse}
                  />
                )}
                <text x={clampedPosBx} y={groundY + MOMENTUM_LAYOUT.momentumAxisY - 6} fontSize={FONT.smallSize} fill={PHYSICS_COLORS.impulse} textAnchor="middle">
                  p_B = {pB > 0 ? '+' : ''}{pB.toFixed(1)}
                </text>

                {/* 总动量 — 在质心位置下方 */}
                {pTotal !== 0 && (
                  <VectorArrow
                    origin={{ x: xCm, y: -(groundY + MOMENTUM_LAYOUT.totalMomentumAxisY - groundY) }}
                    vector={{ x: pTotal, y: 0 }}
                    type="momentum"
                    sceneScale={sceneScale}
                  />
                )}
                <text x={xCm} y={groundY + MOMENTUM_LAYOUT.totalMomentumAxisY - 6} fontSize={FONT.smallSize} fill={PHYSICS_COLORS.momentum} textAnchor="middle" fontWeight="bold">
                  p_总 = {pTotal > 0 ? '+' : ''}{pTotal.toFixed(1)}
                </text>
              </g>
            )}
          </g>
        )}

        {/* ========== 进阶模式：Ek-p 关系图（RelationChart 画中画） ========== */}
        {showEkCard && (
          <g transform={`translate(${cardX}, ${cardY})`}>
            {/* 毛玻璃卡片背景 */}
            <rect
              width={cardWidth}
              height={cardHeight}
              fill={SCENE_COLORS.labels.glassPanelBg}
              rx={8}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={0.8}
              filter="drop-shadow(0 4px 12px rgba(0, 0, 0, 0.12))"
            />

            {/* RelationChart 主体 */}
            <foreignObject
              x={4} y={4}
              width={cardWidth - 8} height={cardHeight - 8}
              style={{ pointerEvents: 'none' }}
            >
              <div style={{ width: '100%', height: '100%' }}>
                <RelationChart
                  points={ekCurvePointsA}
                  additionalSeries={[
                    {
                      points: ekCurvePointsB,
                      label: 'B球',
                      series: 'secondary',
                      strokeDasharray: [4, 3],
                    },
                  ]}
                  xDomain={[0.5, 10]}
                  yDomain={[0, ekMax * 1.15]}
                  xLabel="m (kg)"
                  yLabel="E_k (J)"
                  title="E_k = p²/(2m) 关系图"
                  color={PHYSICS_COLORS.momentum}
                  strokeWidth={1.5}
                  series="primary"
                  markers={[
                    { axis: 'point', x: mA, y: EkA, label: 'A', color: PHYSICS_COLORS.momentum },
                    { axis: 'point', x: mB, y: EkB, label: 'B', color: PHYSICS_COLORS.impulse },
                  ]}
                />
              </div>
            </foreignObject>
          </g>
        )}
      </svg>
    </div>
  )
}
