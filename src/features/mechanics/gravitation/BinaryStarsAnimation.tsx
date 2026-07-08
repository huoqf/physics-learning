import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
import { Ball } from '@/components/Physics/Ball'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { useBinaryStars } from './hooks/useBinaryStars'
import { useAnimationStore } from '@/stores'


export default function BinaryStarsAnimation() {
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })
  const { font } = canvasSize
  
  const showVectors = useAnimationStore((s) => s.showVectors)
  const state = useBinaryStars()

  if (!state) {
    return (
      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">
        初始化中…
      </div>
    )
  }

  // 场景中心坐标在 (175, 325)
  const cx = 175
  const cy = 325

  // 构造适合 VectorArrow 缩放参数，由于我们手动传 pixelLength，所以 sceneScale 设为相对恒定
  const sceneScale = {
    originX: cx,
    originY: cy,
    scaleX: 1,
    scaleY: 1,
    scale: 1,
    maxVectorLength: 50,
  }

  return (
    <div className="w-full h-full relative select-none">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        {/* 1. 轨道与几何背景 */}
        {state.mode === 0 ? (
          // 双星模式下的两条圆形轨道与连线
          <>
            <circle
              cx={cx}
              cy={cy}
              r={state.r1Px}
              fill="none"
              stroke={PHYSICS_COLORS.grid}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <circle
              cx={cx}
              cy={cy}
              r={state.r2Px}
              fill="none"
              stroke={PHYSICS_COLORS.grid}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            {/* 动态两星连线 */}
            <line
              x1={cx + state.pos1.x * state.scale}
              y1={cy - state.pos1.y * state.scale}
              x2={cx + state.pos2.x * state.scale}
              y2={cy - state.pos2.y * state.scale}
              stroke={PHYSICS_COLORS.textMuted}
              strokeDasharray="2 2"
              strokeWidth={1.2}
            />
          </>
        ) : (
          // 三星模式下的圆形轨道与等边三角形连线
          <>
            <circle
              cx={cx}
              cy={cy}
              r={state.rPx}
              fill="none"
              stroke={PHYSICS_COLORS.grid}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            {/* 三星之间等边三角形淡连线 */}
            <polygon
              points={`
                ${cx + state.pos1.x * state.scale},${cy - state.pos1.y * state.scale}
                ${cx + state.pos2.x * state.scale},${cy - state.pos2.y * state.scale}
                ${cx + state.pos3.x * state.scale},${cy - state.pos3.y * state.scale}
              `}
              fill="none"
              stroke={PHYSICS_COLORS.trackHistory}
              strokeDasharray="2 2"
              strokeWidth={1.2}
            />
          </>
        )}

        {/* 2. 质心点标记 */}
        <g stroke={PHYSICS_COLORS.alertRed} strokeWidth={1.8}>
          <line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} />
          <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} />
        </g>
        <text
          x={cx + 8}
          y={cy + 12}
          fontSize={font(10)}
          fill={PHYSICS_COLORS.alertRed}
          fontWeight="bold"
        >
          质心 +
        </text>

        {/* 3. 矢量箭头图解 (受力/速度) */}
        {showVectors && (
          <>
            {state.mode === 0 ? (
              // 双星矢量
              <>
                {/* 恒星 1 (橙红) 矢量 */}
                <VectorArrow
                  origin={state.pos1}
                  vector={state.forceVec1}
                  type="force"
                  sceneScale={sceneScale}
                  color={PHYSICS_COLORS.forceNet}
                  pixelLength={35}
                  label="F₁₂"
                  font={font}
                />
                <VectorArrow
                  origin={state.pos1}
                  vector={state.velVec1}
                  type="velocity"
                  sceneScale={sceneScale}
                  color={PHYSICS_COLORS.velocity}
                  pixelLength={Math.max(12, state.v1 * 18)}
                  label="v₁"
                  font={font}
                />

                {/* 恒星 2 (蓝白) 矢量 */}
                <VectorArrow
                  origin={state.pos2}
                  vector={state.forceVec2}
                  type="force"
                  sceneScale={sceneScale}
                  color={PHYSICS_COLORS.forceNet}
                  pixelLength={35}
                  label="F₂₁"
                  font={font}
                />
                <VectorArrow
                  origin={state.pos2}
                  vector={state.velVec2}
                  type="velocity"
                  sceneScale={sceneScale}
                  color={PHYSICS_COLORS.velocity}
                  pixelLength={Math.max(12, state.v2 * 18)}
                  label="v₂"
                  font={font}
                />
              </>
            ) : (
              // 三星矢量
              <>
                {/* 恒星 1 */}
                <VectorArrow
                  origin={state.pos1}
                  vector={state.forceVec1}
                  type="force"
                  sceneScale={sceneScale}
                  color={PHYSICS_COLORS.forceNet}
                  pixelLength={35}
                  label="F_合1"
                  font={font}
                />
                <VectorArrow
                  origin={state.pos1}
                  vector={state.velVec1}
                  type="velocity"
                  sceneScale={sceneScale}
                  color={PHYSICS_COLORS.velocity}
                  pixelLength={Math.max(12, state.v * 18)}
                  label="v₁"
                  font={font}
                />
                {/* 绘制分引力箭头 (细虚橙线) */}
                <VectorArrow
                  origin={state.pos1}
                  vector={state.force12}
                  type="forceComponent"
                  sceneScale={sceneScale}
                  color={withAlpha(PHYSICS_COLORS.forceNet, 0.5)}
                  pixelLength={22}
                  dashed
                  font={font}
                />
                <VectorArrow
                  origin={state.pos1}
                  vector={state.force13}
                  type="forceComponent"
                  sceneScale={sceneScale}
                  color={withAlpha(PHYSICS_COLORS.forceNet, 0.5)}
                  pixelLength={22}
                  dashed
                  font={font}
                />

                {/* 恒星 2 */}
                <VectorArrow
                  origin={state.pos2}
                  vector={state.forceVec2}
                  type="force"
                  sceneScale={sceneScale}
                  color={PHYSICS_COLORS.forceNet}
                  pixelLength={35}
                  label="F_合2"
                  font={font}
                />
                <VectorArrow
                  origin={state.pos2}
                  vector={state.velVec2}
                  type="velocity"
                  sceneScale={sceneScale}
                  color={PHYSICS_COLORS.velocity}
                  pixelLength={Math.max(12, state.v * 18)}
                  label="v₂"
                  font={font}
                />

                {/* 恒星 3 */}
                <VectorArrow
                  origin={state.pos3}
                  vector={state.forceVec3}
                  type="force"
                  sceneScale={sceneScale}
                  color={PHYSICS_COLORS.forceNet}
                  pixelLength={35}
                  label="F_合3"
                  font={font}
                />
                <VectorArrow
                  origin={state.pos3}
                  vector={state.velVec3}
                  type="velocity"
                  sceneScale={sceneScale}
                  color={PHYSICS_COLORS.velocity}
                  pixelLength={Math.max(12, state.v * 18)}
                  label="v₃"
                  font={font}
                />
              </>
            )}
          </>
        )}

        {/* 4. 星体渲染与文本标签 */}
        {state.mode === 0 ? (
          // 双星星体
          <>
            {/* 恒星 1 (大星/橙红) */}
            <Ball
              cx={cx + state.pos1.x * state.scale}
              cy={cy - state.pos1.y * state.scale}
              r={12 + state.m1 * 1.5}
              type="planetWarm"
            />
            <text
              x={cx + state.pos1.x * state.scale}
              y={cy - state.pos1.y * state.scale - (16 + state.m1 * 1.5)}
              fontSize={font(11)}
              fontWeight="bold"
              fill={PHYSICS_COLORS.forceNetArrow}
              textAnchor="middle"
            >
              m₁ ({state.m1.toFixed(1)})
            </text>

            {/* 恒星 2 (小星/蓝白) */}
            <Ball
              cx={cx + state.pos2.x * state.scale}
              cy={cy - state.pos2.y * state.scale}
              r={10 + state.m2 * 1.5}
              type="planetCool"
            />
            <text
              x={cx + state.pos2.x * state.scale}
              y={cy - state.pos2.y * state.scale - (14 + state.m2 * 1.5)}
              fontSize={font(11)}
              fontWeight="bold"
              fill={PHYSICS_COLORS.objectStroke}
              textAnchor="middle"
            >
              m₂ ({state.m2.toFixed(1)})
            </text>
          </>
        ) : (
          // 三星等质量星体
          <>
            <Ball
              cx={cx + state.pos1.x * state.scale}
              cy={cy - state.pos1.y * state.scale}
              r={15}
              type="planetCool"
            />
            <text
              x={cx + state.pos1.x * state.scale}
              y={cy - state.pos1.y * state.scale - 19}
              fontSize={font(11)}
              fontWeight="bold"
              fill={PHYSICS_COLORS.objectStroke}
              textAnchor="middle"
            >
              m (5.0)
            </text>

            <Ball
              cx={cx + state.pos2.x * state.scale}
              cy={cy - state.pos2.y * state.scale}
              r={15}
              type="planetCool"
            />
            <text
              x={cx + state.pos2.x * state.scale}
              y={cy - state.pos2.y * state.scale - 19}
              fontSize={font(11)}
              fontWeight="bold"
              fill={PHYSICS_COLORS.objectStroke}
              textAnchor="middle"
            >
              m (5.0)
            </text>

            <Ball
              cx={cx + state.pos3.x * state.scale}
              cy={cy - state.pos3.y * state.scale}
              r={15}
              type="planetCool"
            />
            <text
              x={cx + state.pos3.x * state.scale}
              y={cy - state.pos3.y * state.scale - 19}
              fontSize={font(11)}
              fontWeight="bold"
              fill={PHYSICS_COLORS.objectStroke}
              textAnchor="middle"
            >
              m (5.0)
            </text>
          </>
        )}
      </AnimationSvgCanvas>
    </div>
  )
}
