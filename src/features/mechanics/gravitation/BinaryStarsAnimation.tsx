import { Ball, VectorArrow, PhysicsVectorArrow } from '@/components/Physics'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_COLORS, DASH, STROKE, withAlpha } from '@/theme/physics'
import { worldToDesign } from '@/scene'
import { MULTI_STAR_DISTANCE_UNIT_M } from '@/physics/celestial'
import { useBinaryStars } from './hooks/useBinaryStars'
import { useAnimationStore } from '@/stores'

/** 质点模型采用统一星体图标半径（不按质量改变球体大小，质量由标签表达） */
const STAR_ICON_RADIUS = 12
/** 引力示意箭头长度（设计坐标）：双星等长，三星合力与分力严格保持 √3 : 1 几何比例 */
const FORCE_NET_ARROW_LEN = 46
const FORCE_PAIR_ARROW_LEN = FORCE_NET_ARROW_LEN / Math.sqrt(3)
/** 双星/三星每 10¹⁰ m 对应的设计坐标缩放基准 */
const BINARY_DESIGN_PER_UNIT = 18
const TRIPLE_DESIGN_PER_UNIT = 28

export default function BinaryStarsAnimation() {
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })
  const { font } = canvasSize

  const showVectors = useAnimationStore((s) => s.showVectors)
  const state = useBinaryStars()

  const vRef = state.mode === 0 ? Math.max(state.v1, state.v2) : state.v
  const scaleDesignPerMeter =
    (state.mode === 0 ? BINARY_DESIGN_PER_UNIT : TRIPLE_DESIGN_PER_UNIT) /
    MULTI_STAR_DISTANCE_UNIT_M

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'center',
    centerSource: 'design',
    physicsScaleDesign: scaleDesignPerMeter,
    centerLayout: 'splitH',
    maxVectorLength: 50,
    refMagnitudes: { velocity: vRef },
  })

  const center = worldToDesign(0, 0, sceneScale)

  if (state.mode === 0) {
    const p1 = worldToDesign(state.pos1.x, state.pos1.y, sceneScale)
    const p2 = worldToDesign(state.pos2.x, state.pos2.y, sceneScale)
    const r1Design = state.r1 * sceneScale.scale
    const r2Design = state.r2 * sceneScale.scale

    return (
      <div className="w-full h-full relative select-none">
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          {/* 1. 轨道与几何连线 */}
          <circle
            cx={center.px}
            cy={center.py}
            r={r1Design}
            fill="none"
            stroke={PHYSICS_COLORS.grid}
            strokeDasharray={DASH.guide.join(' ')}
            strokeWidth={STROKE.grid}
          />
          <circle
            cx={center.px}
            cy={center.py}
            r={r2Design}
            fill="none"
            stroke={PHYSICS_COLORS.grid}
            strokeDasharray={DASH.guide.join(' ')}
            strokeWidth={STROKE.grid}
          />
          <line
            x1={p1.px}
            y1={p1.py}
            x2={p2.px}
            y2={p2.py}
            stroke={PHYSICS_COLORS.textMuted}
            strokeDasharray="2 2"
            strokeWidth={1.2}
          />

          {/* 2. 质心标记 */}
          <g stroke={CANVAS_COLORS.referencePoint} strokeWidth={1.8}>
            <line x1={center.px - 6} y1={center.py} x2={center.px + 6} y2={center.py} />
            <line x1={center.px} y1={center.py - 6} x2={center.px} y2={center.py + 6} />
          </g>
          <text
            x={center.px}
            y={center.py + 22}
            fontSize={font(10)}
            fill={CANVAS_COLORS.referencePoint}
            fontWeight="bold"
            textAnchor="middle"
          >
            质心
          </text>

          {/* 3. 受力与速度矢量 */}
          {showVectors && (
            <>
              <VectorArrow
                origin={state.pos1}
                vector={state.forceDir1}
                type="force"
                arrowType="physical-schematic"
                sceneScale={sceneScale}
                color={PHYSICS_COLORS.forceNet}
                pixelLength={FORCE_NET_ARROW_LEN}
                label="F₁₂"
                font={font}
              />
              <PhysicsVectorArrow
                origin={state.pos1}
                vector={state.vel1}
                type="velocity"
                sceneScale={sceneScale}
                color={PHYSICS_COLORS.velocity}
                label="v₁"
                font={font}
              />

              <VectorArrow
                origin={state.pos2}
                vector={state.forceDir2}
                type="force"
                arrowType="physical-schematic"
                sceneScale={sceneScale}
                color={PHYSICS_COLORS.forceNet}
                pixelLength={FORCE_NET_ARROW_LEN}
                label="F₂₁"
                font={font}
              />
              <PhysicsVectorArrow
                origin={state.pos2}
                vector={state.vel2}
                type="velocity"
                sceneScale={sceneScale}
                color={PHYSICS_COLORS.velocity}
                label="v₂"
                font={font}
              />
            </>
          )}

          {/* 4. 统一尺寸质点星体与质量标签 */}
          <Ball cx={p1.px} cy={p1.py} r={STAR_ICON_RADIUS} type="planetWarm" />
          <text
            x={p1.px}
            y={p1.py + STAR_ICON_RADIUS + 14}
            fontSize={font(11)}
            fontWeight="bold"
            fill={CANVAS_COLORS.labelText}
            textAnchor="middle"
          >
            m₁ ({state.m1Solar.toFixed(1)} M☉)
          </text>

          <Ball cx={p2.px} cy={p2.py} r={STAR_ICON_RADIUS} type="planetCool" />
          <text
            x={p2.px}
            y={p2.py - (STAR_ICON_RADIUS + 6)}
            fontSize={font(11)}
            fontWeight="bold"
            fill={CANVAS_COLORS.labelText}
            textAnchor="middle"
          >
            m₂ ({state.m2Solar.toFixed(1)} M☉)
          </text>
        </AnimationSvgCanvas>
      </div>
    )
  }

  // 三星系统模式
  const p1 = worldToDesign(state.pos1.x, state.pos1.y, sceneScale)
  const p2 = worldToDesign(state.pos2.x, state.pos2.y, sceneScale)
  const p3 = worldToDesign(state.pos3.x, state.pos3.y, sceneScale)
  const rDesign = state.r * sceneScale.scale

  // 星 1 受力合成菱形辅助虚线端点（F₁₂ + F₁₃ = F_合1）
  const tip12X = p1.px + state.force12Dir.x * FORCE_PAIR_ARROW_LEN
  const tip12Y = p1.py - state.force12Dir.y * FORCE_PAIR_ARROW_LEN
  const tip13X = p1.px + state.force13Dir.x * FORCE_PAIR_ARROW_LEN
  const tip13Y = p1.py - state.force13Dir.y * FORCE_PAIR_ARROW_LEN
  const tipNetX = p1.px + state.forceNetDir1.x * FORCE_NET_ARROW_LEN
  const tipNetY = p1.py - state.forceNetDir1.y * FORCE_NET_ARROW_LEN

  return (
    <div className="w-full h-full relative select-none">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        {/* 1. 圆形轨道与等边三角形几何连线 */}
        <circle
          cx={center.px}
          cy={center.py}
          r={rDesign}
          fill="none"
          stroke={PHYSICS_COLORS.grid}
          strokeDasharray={DASH.guide.join(' ')}
          strokeWidth={STROKE.grid}
        />
        <polygon
          points={`${p1.px},${p1.py} ${p2.px},${p2.py} ${p3.px},${p3.py}`}
          fill="none"
          stroke={PHYSICS_COLORS.trackHistory}
          strokeDasharray="2 2"
          strokeWidth={1.2}
        />

        {/* 2. 质心标记 */}
        <g stroke={CANVAS_COLORS.referencePoint} strokeWidth={1.8}>
          <line x1={center.px - 6} y1={center.py} x2={center.px + 6} y2={center.py} />
          <line x1={center.px} y1={center.py - 6} x2={center.px} y2={center.py + 6} />
        </g>
        <text
          x={center.px}
          y={center.py + 22}
          fontSize={font(10)}
          fill={CANVAS_COLORS.referencePoint}
          fontWeight="bold"
          textAnchor="middle"
        >
          质心
        </text>

        {/* 3. 星 1 分引力平行四边形合成 + 各星合力/速度矢量 */}
        {showVectors && (
          <>
            {/* 菱形合力构造虚线 */}
            <g
              stroke={withAlpha(PHYSICS_COLORS.forceNet, 0.45)}
              strokeWidth={1}
              strokeDasharray="3 3"
              pointerEvents="none"
            >
              <line x1={tip12X} y1={tip12Y} x2={tipNetX} y2={tipNetY} />
              <line x1={tip13X} y1={tip13Y} x2={tipNetX} y2={tipNetY} />
            </g>

            {/* 聚焦星 1：两个分引力（60° 夹角）及其合力 */}
            <VectorArrow
              origin={state.pos1}
              vector={state.force12Dir}
              type="forceComponent"
              arrowType="physical-schematic"
              sceneScale={sceneScale}
              color={withAlpha(PHYSICS_COLORS.forceNet, 0.72)}
              pixelLength={FORCE_PAIR_ARROW_LEN}
              dashed
              label="F₁₂"
              font={font}
            />
            <VectorArrow
              origin={state.pos1}
              vector={state.force13Dir}
              type="forceComponent"
              arrowType="physical-schematic"
              sceneScale={sceneScale}
              color={withAlpha(PHYSICS_COLORS.forceNet, 0.72)}
              pixelLength={FORCE_PAIR_ARROW_LEN}
              dashed
              label="F₁₃"
              font={font}
            />
            <VectorArrow
              origin={state.pos1}
              vector={state.forceNetDir1}
              type="force"
              arrowType="physical-schematic"
              sceneScale={sceneScale}
              color={PHYSICS_COLORS.forceNet}
              pixelLength={FORCE_NET_ARROW_LEN}
              label="F_合1"
              font={font}
            />
            <PhysicsVectorArrow
              origin={state.pos1}
              vector={state.vel1}
              type="velocity"
              sceneScale={sceneScale}
              color={PHYSICS_COLORS.velocity}
              label="v₁"
              font={font}
            />

            {/* 星 2 合力与速度 */}
            <VectorArrow
              origin={state.pos2}
              vector={state.forceNetDir2}
              type="force"
              arrowType="physical-schematic"
              sceneScale={sceneScale}
              color={PHYSICS_COLORS.forceNet}
              pixelLength={FORCE_NET_ARROW_LEN}
              label="F_合2"
              font={font}
            />
            <PhysicsVectorArrow
              origin={state.pos2}
              vector={state.vel2}
              type="velocity"
              sceneScale={sceneScale}
              color={PHYSICS_COLORS.velocity}
              label="v₂"
              font={font}
            />

            {/* 星 3 合力与速度 */}
            <VectorArrow
              origin={state.pos3}
              vector={state.forceNetDir3}
              type="force"
              arrowType="physical-schematic"
              sceneScale={sceneScale}
              color={PHYSICS_COLORS.forceNet}
              pixelLength={FORCE_NET_ARROW_LEN}
              label="F_合3"
              font={font}
            />
            <PhysicsVectorArrow
              origin={state.pos3}
              vector={state.vel3}
              type="velocity"
              sceneScale={sceneScale}
              color={PHYSICS_COLORS.velocity}
              label="v₃"
              font={font}
            />
          </>
        )}

        {/* 4. 统一尺寸等质量三星质点 */}
        <Ball cx={p1.px} cy={p1.py} r={STAR_ICON_RADIUS} type="planetCool" />
        <text
          x={p1.px}
          y={p1.py + STAR_ICON_RADIUS + 14}
          fontSize={font(11)}
          fontWeight="bold"
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
        >
          星1 ({state.starMassSolar.toFixed(1)} M☉)
        </text>

        <Ball cx={p2.px} cy={p2.py} r={STAR_ICON_RADIUS} type="planetWarm" />
        <text
          x={p2.px}
          y={p2.py - (STAR_ICON_RADIUS + 6)}
          fontSize={font(11)}
          fontWeight="bold"
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
        >
          星2 ({state.starMassSolar.toFixed(1)} M☉)
        </text>

        <Ball cx={p3.px} cy={p3.py} r={STAR_ICON_RADIUS} type="pendulumBob" />
        <text
          x={p3.px}
          y={p3.py + STAR_ICON_RADIUS + 14}
          fontSize={font(11)}
          fontWeight="bold"
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
        >
          星3 ({state.starMassSolar.toFixed(1)} M☉)
        </text>
      </AnimationSvgCanvas>
    </div>
  )
}
