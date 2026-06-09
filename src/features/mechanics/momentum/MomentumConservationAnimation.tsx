import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { elasticCollision1D } from '@/physics/momentum'
import {
  calculateCommonVelocity,
  calculateCommonVelocityTime,
  calculateSliderDisplacement,
  calculateBoardDisplacement,
  calculateSliderVelocity,
  calculateBoardVelocity,
  calculateRelativeDisplacement,
  willSliderFallOff,
} from '@/physics/momentumConservation'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_STYLE,
  STROKE,
  FONT,
} from '@/theme/physics'

/** 动量守恒动画布局常量 */
const MC_LAYOUT = {
  canvasPadding: 50,
  groundOffset: 80,
  ballBaseRadius: 16,
  massRadiusScale: 2,
  vectorMaxLength: 80,
  /** 基础模式速度缩放 (px per m/s) */
  basicVelocityScale: 25,
  /** 进阶模式位移缩放 (px per m) */
  advancedDisplacementScale: 40,
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

export default function MomentumConservationAnimation() {
  const { params, time, showVectors } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 450 })

  const {
    m1 = 3, v1 = 5,
    m2 = 2, v2 = 0,
    m_slider = 1, M_board = 3, v0 = 6, mu = 0.3, L = 2,
    advancedMode = 0,
  } = params

  const isAdvanced = advancedMode === 1
  const groundY = canvasSize.height - MC_LAYOUT.groundOffset

  // ── 基础模式：两球碰撞 ──────────────────────────────────
  const R_A = MC_LAYOUT.ballBaseRadius + m1 * MC_LAYOUT.massRadiusScale
  const R_B = MC_LAYOUT.ballBaseRadius + m2 * MC_LAYOUT.massRadiusScale

  const initPosAx = canvasSize.width * 0.25
  const initPosBx = canvasSize.width * 0.7

  // 碰撞计算
  const gap = initPosBx - R_B - (initPosAx + R_A)
  const approachSpeed = (v1 - v2) * MC_LAYOUT.basicVelocityScale
  let collisionTime = Infinity
  let v1After = v1
  let v2After = v2

  if (approachSpeed > 0 && gap > 0) {
    collisionTime = gap / approachSpeed
    const [va, vb] = elasticCollision1D(m1, v1, m2, v2)
    v1After = va
    v2After = vb
  }

  // 当前位置和速度
  const scale = MC_LAYOUT.basicVelocityScale
  let posAx: number, posBx: number, currentV1: number, currentV2: number
  const hasCollided = time >= collisionTime

  if (time < collisionTime) {
    posAx = initPosAx + v1 * time * scale
    posBx = initPosBx + v2 * time * scale
    currentV1 = v1
    currentV2 = v2
  } else {
    const dt = time - collisionTime
    const colPosAx = initPosAx + v1 * collisionTime * scale
    const colPosBx = initPosBx + v2 * collisionTime * scale
    posAx = colPosAx + v1After * dt * scale
    posBx = colPosBx + v2After * dt * scale
    currentV1 = v1After
    currentV2 = v2After
  }

  // 边界约束
  const leftBound = MC_LAYOUT.canvasPadding + R_A
  const rightBound = canvasSize.width - MC_LAYOUT.canvasPadding - R_B
  posAx = Math.max(leftBound, Math.min(rightBound + R_B - R_A, posAx))
  posBx = Math.max(leftBound - R_A + R_B, Math.min(rightBound, posBx))

  // 动量计算
  const pTotal = m1 * v1 + m2 * v2 // 守恒量

  // 动量条映射
  const pMaxRef = 10 * 10
  const mapMomentumBar = (p: number) => (Math.abs(p) / pMaxRef) * MC_LAYOUT.momentumBarMaxLength

  // ── 进阶模式：滑块-木板 ──────────────────────────────────
  const vCommon = calculateCommonVelocity(m_slider, v0, M_board)
  const tCommon = calculateCommonVelocityTime(M_board, vCommon, mu, m_slider, MC_LAYOUT.g)
  const currentT = time

  // 判断滑块是否掉落
  const x1AtCommon = calculateSliderDisplacement(v0, mu, tCommon, MC_LAYOUT.g)
  const x2AtCommon = calculateBoardDisplacement(mu, m_slider, M_board, tCommon, MC_LAYOUT.g)
  const deltaXAtCommon = calculateRelativeDisplacement(x1AtCommon, x2AtCommon)
  const sliderFallsOff = willSliderFallOff(deltaXAtCommon, L)

  // 当前时刻的速度和位移
  const isBeforeCommon = currentT < tCommon
  const currentVSlider = isBeforeCommon
    ? calculateSliderVelocity(v0, mu, currentT, MC_LAYOUT.g)
    : vCommon
  const currentVBoard = isBeforeCommon
    ? calculateBoardVelocity(mu, m_slider, M_board, currentT, v0, MC_LAYOUT.g)
    : vCommon
  const currentXSlider = isBeforeCommon
    ? calculateSliderDisplacement(v0, mu, currentT, MC_LAYOUT.g)
    : x1AtCommon + vCommon * (currentT - tCommon)
  const currentXBoard = isBeforeCommon
    ? calculateBoardDisplacement(mu, m_slider, M_board, currentT, MC_LAYOUT.g)
    : x2AtCommon + vCommon * (currentT - tCommon)
  const currentDeltaX = calculateRelativeDisplacement(currentXSlider, currentXBoard)

  // 掉落判断
  const sliderOffBoard = sliderFallsOff && currentDeltaX >= L

  // 像素位置
  const dScale = MC_LAYOUT.advancedDisplacementScale
  const boardInitX = canvasSize.width * 0.3
  const boardPixelW = L * dScale
  const boardPixelX = boardInitX + currentXBoard * dScale
  const sliderPixelX = boardInitX + currentXSlider * dScale

  const boardTopY = groundY - MC_LAYOUT.boardHeight
  const sliderTopY = boardTopY - MC_LAYOUT.sliderHeight

  // 矢量映射
  const vMaxRef = 10
  const mapArrowLen = (val: number) => (Math.abs(val) / vMaxRef) * MC_LAYOUT.vectorMaxLength

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
      >
        {/* ========== defs ========== */}
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
          <marker id="arrowhead-mc-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-mc-p" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.momentum} />
          </marker>
        </defs>

        {/* ========== 地面线 ========== */}
        <line
          x1={MC_LAYOUT.canvasPadding}
          y1={groundY}
          x2={canvasSize.width - MC_LAYOUT.canvasPadding}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />

        {/* ========== 基础模式：两球碰撞 ========== */}
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
            <text x={posAx} y={groundY - R_A + 4} fontSize={FONT.smallSize} fill="white" textAnchor="middle" fontWeight="bold">
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
            <text x={posBx} y={groundY - R_B + 4} fontSize={FONT.smallSize} fill="white" textAnchor="middle" fontWeight="bold">
              B
            </text>

            {/* 碰撞闪光 */}
            {hasCollided && Math.abs(time - collisionTime) < 0.3 && (
              <circle
                cx={(posAx + posBx) / 2}
                cy={groundY - Math.max(R_A, R_B)}
                r={8 + (0.3 - Math.abs(time - collisionTime)) * 30}
                fill={PHYSICS_COLORS.kineticEnergy}
                opacity={0.3}
              />
            )}

            {/* 速度箭头 */}
            {showVectors && (
              <g>
                {currentV1 !== 0 && (
                  <line
                    x1={posAx}
                    y1={groundY - R_A * 2 - 10}
                    x2={posAx + mapArrowLen(currentV1) * Math.sign(currentV1)}
                    y2={groundY - R_A * 2 - 10}
                    stroke={PHYSICS_COLORS.velocity}
                    strokeWidth={STROKE.vectorMain}
                    markerEnd="url(#arrowhead-mc-v)"
                  />
                )}
                <text x={posAx} y={groundY - R_A * 2 - 16} fontSize={FONT.smallSize} fill={PHYSICS_COLORS.velocity} textAnchor="middle" fontWeight="bold">
                  v₁={currentV1.toFixed(1)}
                </text>

                {currentV2 !== 0 && (
                  <line
                    x1={posBx}
                    y1={groundY - R_B * 2 - 10}
                    x2={posBx + mapArrowLen(currentV2) * Math.sign(currentV2)}
                    y2={groundY - R_B * 2 - 10}
                    stroke={PHYSICS_COLORS.elasticForce}
                    strokeWidth={STROKE.vectorMain}
                    markerEnd="url(#arrowhead-mc-v)"
                  />
                )}
                <text x={posBx} y={groundY - R_B * 2 - 16} fontSize={FONT.smallSize} fill={PHYSICS_COLORS.elasticForce} textAnchor="middle" fontWeight="bold">
                  v₂={currentV2.toFixed(1)}
                </text>
              </g>
            )}

            {/* 总动量双色长条图 */}
            <g transform={`translate(${MC_LAYOUT.canvasPadding}, ${groundY + 30})`}>
              {/* p1 段 */}
              <rect
                x={0}
                y={0}
                width={mapMomentumBar(m1 * v1)}
                height={12}
                fill={PHYSICS_COLORS.momentum}
                opacity={0.7}
                rx={2}
              />
              <text x={mapMomentumBar(m1 * v1) / 2} y={10} fontSize={FONT.smallSize} fill="white" textAnchor="middle" fontWeight="bold">
                p₁
              </text>

              {/* p2 段 */}
              <rect
                x={mapMomentumBar(m1 * v1)}
                y={0}
                width={mapMomentumBar(m2 * v2)}
                height={12}
                fill={PHYSICS_COLORS.impulse}
                opacity={0.7}
                rx={2}
              />
              <text x={mapMomentumBar(m1 * v1) + mapMomentumBar(m2 * v2) / 2} y={10} fontSize={FONT.smallSize} fill="white" textAnchor="middle" fontWeight="bold">
                p₂
              </text>

              {/* 总动量标注 */}
              <text x={mapMomentumBar(pTotal)} y={-4} fontSize={FONT.smallSize} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
                p_总 = {pTotal.toFixed(1)} kg·m/s
              </text>
            </g>
          </g>
        )}

        {/* ========== 进阶模式：滑块-木板 ========== */}
        {isAdvanced && (
          <g>
            {/* 木板 */}
            <rect
              x={boardPixelX}
              y={boardTopY}
              width={boardPixelW}
              height={MC_LAYOUT.boardHeight}
              rx={3}
              fill={SCENE_COLORS.materials.vacuumSphereGrad[1]}
              stroke={SCENE_COLORS.materials.vacuumSphereGrad[2]}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            <text
              x={boardPixelX + boardPixelW / 2}
              y={boardTopY + MC_LAYOUT.boardHeight / 2 + 3}
              fontSize={FONT.smallSize}
              fill="white"
              textAnchor="middle"
              fontWeight="bold"
            >
              M = {M_board.toFixed(1)} kg
            </text>

            {/* 滑块 */}
            {!sliderOffBoard && (
              <rect
                x={sliderPixelX - MC_LAYOUT.sliderWidth / 2}
                y={sliderTopY}
                width={MC_LAYOUT.sliderWidth}
                height={MC_LAYOUT.sliderHeight}
                rx={4}
                fill={SCENE_COLORS.materials.steelSphereGrad[1]}
                stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
              />
            )}
            {sliderOffBoard && (
              <rect
                x={boardPixelX + boardPixelW + 5}
                y={sliderTopY + 20}
                width={MC_LAYOUT.sliderWidth}
                height={MC_LAYOUT.sliderHeight}
                rx={4}
                fill={SCENE_COLORS.materials.steelSphereGrad[1]}
                stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
                opacity={0.6}
              />
            )}
            <text
              x={sliderOffBoard ? boardPixelX + boardPixelW + 5 + MC_LAYOUT.sliderWidth / 2 : sliderPixelX}
              y={sliderTopY + MC_LAYOUT.sliderHeight / 2 + 3}
              fontSize={FONT.smallSize}
              fill="white"
              textAnchor="middle"
              fontWeight="bold"
            >
              m = {m_slider.toFixed(1)} kg
            </text>

            {/* 相对滑动划痕 */}
            {isBeforeCommon && currentDeltaX > 0 && (
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
              cx={boardInitX + (m_slider * currentXSlider + M_board * currentXBoard) / (m_slider + M_board) * dScale}
              cy={boardTopY - 3}
              r={3}
              fill={PHYSICS_COLORS.referencePoint}
            />
            <text
              x={boardInitX + (m_slider * currentXSlider + M_board * currentXBoard) / (m_slider + M_board) * dScale}
              y={boardTopY - 8}
              fontSize={FONT.smallSize}
              fill={PHYSICS_COLORS.referencePoint}
              textAnchor="middle"
            >
              质心
            </text>

            {/* 共同速度虚线 */}
            {!isBeforeCommon && (
              <line
                x1={MC_LAYOUT.canvasPadding}
                y1={sliderTopY - 5}
                x2={canvasSize.width - MC_LAYOUT.canvasPadding}
                y2={sliderTopY - 5}
                stroke={PHYSICS_COLORS.kineticEnergy}
                strokeWidth={1}
                strokeDasharray="6,4"
                opacity={0.5}
              />
            )}

            {/* 速度箭头 */}
            {showVectors && (
              <g>
                {/* 滑块速度 */}
                {currentVSlider > 0 && (
                  <line
                    x1={sliderOffBoard ? boardPixelX + boardPixelW + 5 + MC_LAYOUT.sliderWidth / 2 : sliderPixelX}
                    y1={sliderTopY - 10}
                    x2={(sliderOffBoard ? boardPixelX + boardPixelW + 5 + MC_LAYOUT.sliderWidth / 2 : sliderPixelX) + mapArrowLen(currentVSlider)}
                    y2={sliderTopY - 10}
                    stroke={PHYSICS_COLORS.velocity}
                    strokeWidth={STROKE.vectorMain}
                    markerEnd="url(#arrowhead-mc-v)"
                  />
                )}
                <text
                  x={(sliderOffBoard ? boardPixelX + boardPixelW + 5 + MC_LAYOUT.sliderWidth / 2 : sliderPixelX) + mapArrowLen(currentVSlider) / 2}
                  y={sliderTopY - 16}
                  fontSize={FONT.smallSize}
                  fill={PHYSICS_COLORS.velocity}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  v_滑块 = {currentVSlider.toFixed(2)}
                </text>

                {/* 木板速度 */}
                {currentVBoard > 0 && (
                  <line
                    x1={boardPixelX + boardPixelW / 2}
                    y1={boardTopY + MC_LAYOUT.boardHeight + 15}
                    x2={boardPixelX + boardPixelW / 2 + mapArrowLen(currentVBoard)}
                    y2={boardTopY + MC_LAYOUT.boardHeight + 15}
                    stroke={PHYSICS_COLORS.elasticForce}
                    strokeWidth={STROKE.vectorMain}
                    markerEnd="url(#arrowhead-mc-v)"
                  />
                )}
                <text
                  x={boardPixelX + boardPixelW / 2 + mapArrowLen(currentVBoard) / 2}
                  y={boardTopY + MC_LAYOUT.boardHeight + 12}
                  fontSize={FONT.smallSize}
                  fill={PHYSICS_COLORS.elasticForce}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  v_木板 = {currentVBoard.toFixed(2)}
                </text>

                {/* 共速标注 */}
                {!isBeforeCommon && (
                  <text
                    x={canvasSize.width * 0.5}
                    y={sliderTopY - 12}
                    fontSize={FONT.smallSize}
                    fill={PHYSICS_COLORS.kineticEnergy}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    v_共 = {vCommon.toFixed(2)} m/s
                  </text>
                )}
              </g>
            )}

            {/* 掉落警告 */}
            {sliderOffBoard && (
              <text
                x={canvasSize.width * 0.5}
                y={30}
                fontSize={FONT.bodySize}
                fill={PHYSICS_COLORS.forceNet}
                fontWeight="bold"
                textAnchor="middle"
              >
                滑块从木板右端掉落！L &lt; Δx，守恒条件被破坏
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  )
}
