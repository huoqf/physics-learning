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
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CHART_COLORS,
  CANVAS_STYLE,
  STROKE,
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
  const { font } = canvasSize

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

  const cardInnerPad = MOMENTUM_LAYOUT.ekCardPadding
  const cardInnerW = cardWidth - cardInnerPad.left - cardInnerPad.right
  const cardInnerH = cardHeight - cardInnerPad.top - cardInnerPad.bottom

  // Ek-p 关系图：每个球各自的曲线，与动画同步
  const ekCurveDataA = useMemo(() => {
    const fixedP = Math.abs(pA) || 0.1
    return generateMomentumEnergyCurve(fixedP, 0.5, 10, 30)
  }, [pA])

  const ekCurveDataB = useMemo(() => {
    const fixedP = Math.abs(pB) || 0.1
    return generateMomentumEnergyCurve(fixedP, 0.5, 10, 30)
  }, [pB])

  const ekMax = useMemo(() => {
    const allEks = [...ekCurveDataA.map(d => d.Ek), ...ekCurveDataB.map(d => d.Ek), EkA, EkB]
    return Math.max(...allEks, 1)
  }, [ekCurveDataA, ekCurveDataB, EkA, EkB])

  const toCardX = (mass: number) => cardInnerPad.left + ((mass - 0.5) / 9.5) * cardInnerW
  const toCardY = (ek: number) => {
    const bottomY = cardInnerPad.top + cardInnerH
    return bottomY - (ek / ekMax) * cardInnerH
  }

  // A球 Ek-p 曲线路径
  const ekCurvePathA = useMemo(() => {
    if (ekCurveDataA.length < 2) return ''
    const points = ekCurveDataA.map(d => `${toCardX(d.m)},${toCardY(d.Ek)}`)
    return `M ${points[0]} L ${points.slice(1).join(' L ')}`
  }, [ekCurveDataA, ekMax, cardInnerW, cardInnerH])

  // B球 Ek-p 曲线路径
  const ekCurvePathB = useMemo(() => {
    if (ekCurveDataB.length < 2) return ''
    const points = ekCurveDataB.map(d => `${toCardX(d.m)},${toCardY(d.Ek)}`)
    return `M ${points[0]} L ${points.slice(1).join(' L ')}`
  }, [ekCurveDataB, ekMax, cardInnerW, cardInnerH])

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

        {/* ========== 地面线 ========== */}
        <line
          x1={MOMENTUM_LAYOUT.canvasPadding}
          y1={groundY}
          x2={canvasSize.width - MOMENTUM_LAYOUT.canvasPadding}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />

        {/* ========== x 轴正方向标尺 ========== */}
        <line
          x1={canvasSize.width - MOMENTUM_LAYOUT.canvasPadding - MOMENTUM_LAYOUT.directionScaleLen}
          y1={groundY + 20}
          x2={canvasSize.width - MOMENTUM_LAYOUT.canvasPadding - 8}
          y2={groundY + 20}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={STROKE.axis}
        />
        <polygon
          points={`${canvasSize.width - MOMENTUM_LAYOUT.canvasPadding},${groundY + 20} ${canvasSize.width - MOMENTUM_LAYOUT.canvasPadding - 8},${groundY + 16} ${canvasSize.width - MOMENTUM_LAYOUT.canvasPadding - 8},${groundY + 24}`}
          fill={PHYSICS_COLORS.axis}
        />
        <text
          x={canvasSize.width - MOMENTUM_LAYOUT.canvasPadding + 5}
          y={groundY + 24}
          fontSize={FONT.axisSize}
          fill={PHYSICS_COLORS.labelTextLight}
        >
          {isAdvanced ? 'x 正方向' : 'x'}
        </text>

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

        {/* ========== 进阶模式：Ek-p 关系图（画中画） ========== */}
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
            <text
              x={cardWidth / 2}
              y={16}
              fontSize={font(8)}
              fill={CHART_COLORS.titleText}
              textAnchor="middle"
              fontWeight="bold"
            >
              E_k = p²/(2m) 关系图
            </text>

            {/* 图例 */}
            <line x1={cardInnerPad.left} y1={cardInnerPad.top - 8} x2={cardInnerPad.left + 14} y2={cardInnerPad.top - 8} stroke={PHYSICS_COLORS.momentum} strokeWidth={1.5} />
            <text x={cardInnerPad.left + 17} y={cardInnerPad.top - 5} fontSize={font(6)} fill={PHYSICS_COLORS.momentum}>A球</text>
            <line x1={cardInnerPad.left + 42} y1={cardInnerPad.top - 8} x2={cardInnerPad.left + 56} y2={cardInnerPad.top - 8} stroke={PHYSICS_COLORS.impulse} strokeWidth={1.5} strokeDasharray="3,2" />
            <text x={cardInnerPad.left + 59} y={cardInnerPad.top - 5} fontSize={font(6)} fill={PHYSICS_COLORS.impulse}>B球</text>

            {/* 坐标轴 */}
            <line
              x1={cardInnerPad.left}
              y1={cardInnerPad.top + cardInnerH}
              x2={cardInnerPad.left + cardInnerW}
              y2={cardInnerPad.top + cardInnerH}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={0.8}
            />
            <line
              x1={cardInnerPad.left}
              y1={cardInnerPad.top}
              x2={cardInnerPad.left}
              y2={cardInnerPad.top + cardInnerH}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={0.8}
            />

            {/* X轴标签：质量 m */}
            <text
              x={cardInnerPad.left + cardInnerW}
              y={cardInnerPad.top + cardInnerH + 12}
              fontSize={font(7)}
              fill={CHART_COLORS.labelText}
              textAnchor="end"
            >
              m (kg)
            </text>

            {/* Y轴标签：动能 E_k */}
            <text
              x={cardInnerPad.left - 5}
              y={cardInnerPad.top - 6}
              fontSize={font(7)}
              fill={CHART_COLORS.labelText}
              textAnchor="middle"
            >
              E_k (J)
            </text>

            {/* X轴刻度 */}
            {[1, 3, 5, 7, 10].map((val) => (
              <g key={`ek-x-${val}`}>
                <line
                  x1={toCardX(val)}
                  y1={cardInnerPad.top + cardInnerH}
                  x2={toCardX(val)}
                  y2={cardInnerPad.top + cardInnerH + 3}
                  stroke={CHART_COLORS.axisLine}
                  strokeWidth={0.8}
                />
                <text
                  x={toCardX(val)}
                  y={cardInnerPad.top + cardInnerH + 9}
                  fontSize={font(7)}
                  fill={CHART_COLORS.labelText}
                  textAnchor="middle"
                >
                  {val}
                </text>
              </g>
            ))}

            {/* A球 Ek-p 曲线（实线） */}
            {ekCurvePathA && (
              <path
                d={ekCurvePathA}
                fill="none"
                stroke={PHYSICS_COLORS.momentum}
                strokeWidth={1.5}
              />
            )}

            {/* B球 Ek-p 曲线（虚线） */}
            {ekCurvePathB && (
              <path
                d={ekCurvePathB}
                fill="none"
                stroke={PHYSICS_COLORS.impulse}
                strokeWidth={1.5}
                strokeDasharray="4,3"
              />
            )}

            {/* 当前 A球 和 B球 标注点 */}
            <circle
              cx={toCardX(mA)}
              cy={toCardY(EkA)}
              r={3}
              fill={PHYSICS_COLORS.momentum}
            />
            <text
              x={toCardX(mA) + 6}
              y={toCardY(EkA) - 2}
              fontSize={font(7)}
              fill={PHYSICS_COLORS.momentum}
              fontWeight="bold"
            >
              A
            </text>

            <circle
              cx={toCardX(mB)}
              cy={toCardY(EkB)}
              r={3}
              fill={PHYSICS_COLORS.impulse}
            />
            <text
              x={toCardX(mB) + 6}
              y={toCardY(EkB) - 2}
              fontSize={font(7)}
              fill={PHYSICS_COLORS.impulse}
              fontWeight="bold"
            >
              B
            </text>

            {/* 关键结论标注 */}
            <text
              x={cardWidth / 2}
              y={cardHeight - 6}
              fontSize={font(7)}
              fill={PHYSICS_COLORS.kineticEnergy}
              textAnchor="middle"
              fontWeight="bold"
            >
              p 不变时，m↑ → E_k↓
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
