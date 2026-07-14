import { AnimationSvgCanvas } from '@/components/Layout'
import { VectorArrow, Ball, PhysicsGround } from '@/components/Physics'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
import { COMMON_MATERIALS, SPHERE_COLORS } from '@/theme/physics/scene/materials'
import { PENDULUM_COLORS, SURFACE_COLORS } from '@/theme/physics/scene/mechanics'
import { useCircularModelsPhysics, SCENE, PIXEL_VECTOR_SCALE, pixelVector } from './hooks/useCircularModelsPhysics'
import { CircularModelsDefs } from './components/CircularModelsDefs'

function Label({ x, y, children, font }: { x: number; y: number; children: string; font: (n: number) => number }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={font(11)}
      fill={PHYSICS_COLORS.labelTextLight}
      textAnchor="middle"
      fontWeight="bold"
    >
      {children}
    </text>
  )
}

export default function CircularModelsAnimation() {
  const {
    containerRef, canvasSize, vp,
    isConical, omega, showVectors,
    conical, disk, thetaSmooth, radiusSmooth,
    projected, tangent, tangentNorm, velocityLength,
    gForceLength, gravityVec, vecData, diskLines,
  } = useCircularModelsPhysics()

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-slate-50 rounded-xl shadow-inner">
      <CircularModelsDefs />

      {/* 旋转轴几何参考虚线（仅圆锥摆模式下，充当旋转中心轴线） */}
      {isConical && (
        <line
          x1={SCENE.centerX}
          y1={54}
          x2={SCENE.centerX}
          y2={SCENE.pivotY + SCENE.lengthPx + 30}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1.5}
          strokeDasharray={SCENE.axisDash}
        />
      )}

      {/* 悬挂天花板底座与旋转角速度 ω 指示器（仅圆锥摆模式下，还原高中课本纯悬绳圆锥摆模型） */}
      {isConical && (
        <g>
          <PhysicsGround
            x={SCENE.centerX - 24}
            y={SCENE.pivotY - 6}
            width={48}
            type="platform"
            appearance={{ thickness: 6 }}
          />
          {/* 悬挂固定环 */}
          <circle cx={SCENE.centerX} cy={SCENE.pivotY} r={4.5} fill={PENDULUM_COLORS.pivotStroke} />

          {/* 旋转角速度 ω 环形指示器 */}
          <g opacity={omega > 0.1 ? 0.85 : 0.3}>
            {/* 后侧半圆弧 (虚线) */}
            <path
              d={`M ${SCENE.centerX - 18} 120 A 18 5 0 0 1 ${SCENE.centerX + 18} 120`}
              fill="none"
              stroke={PHYSICS_COLORS.angularVelocity}
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
            {/* 前侧半圆弧 (实线，带指向左前方的箭头) */}
            <path
              d={`M ${SCENE.centerX + 18} 120 A 18 5 0 0 1 ${SCENE.centerX - 13} 123.5`}
              fill="none"
              stroke={PHYSICS_COLORS.angularVelocity}
              strokeWidth={1.8}
            />
            {/* 旋转箭头三角形 */}
            <polygon
              points={`${SCENE.centerX - 13},121.5 ${SCENE.centerX - 18},126 ${SCENE.centerX - 10},125`}
              fill={PHYSICS_COLORS.angularVelocity}
            />
            {/* ω 标注 */}
            <text
              x={SCENE.centerX - 30}
              y={122}
              fill={PHYSICS_COLORS.angularVelocity}
              fontSize={canvasSize.font(12)}
              fontWeight="bold"
              fontStyle="italic"
            >
              ω
            </text>
          </g>
        </g>
      )}

      {/* 3D 旋转轴 下半截轴（仅圆盘模式下，作为轴底段画在圆盘最底层） */}
      {!isConical && (
        <rect
          x={SCENE.centerX - 4}
          y={SCENE.diskCenterY}
          width={8}
          height={228}
          fill="url(#shaft-grad)"
          stroke={PENDULUM_COLORS.rodStroke}
          strokeWidth={1}
        />
      )}

      {isConical ? (
        // ─── 圆锥摆场景 ───
        <g>
          {/* 小球在下方的投影影子 */}
          <ellipse
            cx={projected.x}
            cy={projected.orbitY}
            rx={16}
            ry={16 * SCENE.projectionDepth}
            fill={SPHERE_COLORS.steel.shadow}
            stroke="none"
          />
          {/* 运动圆周轨迹 */}
          <ellipse
            cx={SCENE.centerX}
            cy={projected.orbitY}
            rx={Math.max(10, projected.orbitRadiusPx)}
            ry={Math.max(4, projected.orbitRadiusPx * SCENE.projectionDepth)}
            fill="none"
            stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={2}
            strokeDasharray={SCENE.orbitDash}
          />
          {/* 摆线 */}
          <line
            x1={SCENE.centerX}
            y1={SCENE.pivotY}
            x2={projected.x}
            y2={projected.y}
            stroke={SURFACE_COLORS.ropeColor}
            strokeWidth={3}
            strokeLinecap="round"
          />
          {/* 竖直中心线（参考线） */}
          <line
            x1={SCENE.centerX}
            y1={SCENE.pivotY}
            x2={SCENE.centerX}
            y2={SCENE.pivotY + SCENE.lengthPx}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={1.5}
            strokeDasharray={SCENE.axisDash}
          />
          {/* 夹角 θ 弧线 */}
          <path
            d={`M ${SCENE.centerX} ${SCENE.pivotY + 42} A 42 42 0 0 1 ${SCENE.centerX + 42 * Math.sin(thetaSmooth)} ${SCENE.pivotY + 42 * Math.cos(thetaSmooth)}`}
            fill="none"
            stroke={PHYSICS_COLORS.annotation}
            strokeWidth={2}
          />
          <Label x={SCENE.centerX + 16} y={SCENE.pivotY + 58} font={canvasSize.font}>θ</Label>
          {!conical.stable && (
            <text
              x={SCENE.centerX}
              y={594}
              fontSize={canvasSize.font(12)}
              fill={PHYSICS_COLORS.dangerText}
              textAnchor="middle"
              fontWeight="bold"
            >
              转速不足：ω &lt; √(g/L)，非零圆锥摆不稳定
            </text>
          )}
        </g>
      ) : (
        // ─── 旋转圆盘场景 ───
        <g>
          {/* 3D 具有厚度的金属盘 侧面 */}
          <path
            d={`M ${SCENE.centerX - SCENE.diskRadiusPx} ${SCENE.diskCenterY} A ${SCENE.diskRadiusPx} ${SCENE.diskRadiusPx * SCENE.projectionDepth} 0 0 0 ${SCENE.centerX + SCENE.diskRadiusPx} ${SCENE.diskCenterY} L ${SCENE.centerX + SCENE.diskRadiusPx} ${SCENE.diskCenterY + 12} A ${SCENE.diskRadiusPx} ${SCENE.diskRadiusPx * SCENE.projectionDepth} 0 0 1 ${SCENE.centerX - SCENE.diskRadiusPx} ${SCENE.diskCenterY + 12} Z`}
            fill="url(#disk-side-grad)"
            stroke={withAlpha(COMMON_MATERIALS.aluminumMetalGrad[3], 0.8)}
            strokeWidth={1.2}
          />
          {/* 3D 金属盘 顶面 */}
          <ellipse
            cx={SCENE.centerX}
            cy={SCENE.diskCenterY}
            rx={SCENE.diskRadiusPx}
            ry={SCENE.diskRadiusPx * SCENE.projectionDepth}
            fill="url(#disk-top-grad)"
            stroke={withAlpha(COMMON_MATERIALS.aluminumMetalGrad[2], 0.9)}
            strokeWidth={1.5}
          />

          {/* 圆盘旋转表面径向标记刻度线 */}
          {diskLines.map((linePt, idx) => (
            <line
              key={idx}
              x1={SCENE.centerX}
              y1={SCENE.diskCenterY}
              x2={linePt.x}
              y2={linePt.y}
              stroke={PHYSICS_COLORS.strokeDark}
              strokeWidth={1}
              opacity={0.35}
            />
          ))}

          {/* 运动轨迹虚线圈 */}
          <ellipse
            cx={SCENE.centerX}
            cy={SCENE.diskCenterY}
            rx={Math.max(8, (radiusSmooth / 2) * SCENE.diskRadiusPx)}
            ry={Math.max(3, (radiusSmooth / 2) * SCENE.diskRadiusPx * SCENE.projectionDepth)}
            fill="none"
            stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={1.8}
            strokeDasharray={SCENE.orbitDash}
          />

          {/* 物块落在圆盘面上的影子 (平抛飞出时与物块分离) */}
          {projected.opacity > 0 && (
            <ellipse
              cx={SCENE.centerX + (projected.slipState?.x ?? 0) * (SCENE.diskRadiusPx / 2.0)}
              cy={SCENE.diskCenterY - (projected.slipState?.y ?? 0) * (SCENE.diskRadiusPx / 2.0) * SCENE.projectionDepth}
              rx={14 * projected.opacity}
              ry={14 * SCENE.projectionDepth * projected.opacity}
              fill={SPHERE_COLORS.oscillatorMetal.shadow}
              opacity={projected.isFlownOut ? Math.max(0, projected.opacity - 0.3) : projected.opacity}
            />
          )}

          <Label x={SCENE.centerX} y={SCENE.diskCenterY + SCENE.diskRadiusPx * SCENE.projectionDepth + 34} font={canvasSize.font}>
            水平旋转圆盘
          </Label>
          {disk.slipping && (
            <text
              x={SCENE.centerX}
              y={594}
              fontSize={canvasSize.font(12)}
              fill={PHYSICS_COLORS.dangerText}
              textAnchor="middle"
              fontWeight="bold"
            >
              已超过临界角速度：木块打滑离心并飞出
            </text>
          )}
        </g>
      )}

      {/* ─── 动态矢量箭头 (受力分析) ─── */}
      {showVectors && projected.opacity > 0 && (
        <g opacity={projected.opacity}>
          {/* 1. 速度矢量 v (蓝色，沿切线方向) */}
          <VectorArrow
            originPixel={{ x: projected.x, y: projected.y }}
            vector={pixelVector(tangent.x / tangentNorm, tangent.y / tangentNorm)}
            type="velocity"
            sceneScale={PIXEL_VECTOR_SCALE}
            pixelLength={velocityLength}
            label="v"
            font={canvasSize.font}
          />

          {/* 2. 重力 mg (深绿色，竖直向下) */}
          <VectorArrow
            originPixel={{ x: projected.x, y: projected.y }}
            vector={gravityVec}
            type="gravity"
            sceneScale={PIXEL_VECTOR_SCALE}
            pixelLength={gForceLength}
            label="mg"
            font={canvasSize.font}
          />

          {isConical ? (
            // ─── 圆锥摆力合成 ───
            <g>
              {/* 拉力 F_T (绳索紫，斜向上沿绳) */}
              <VectorArrow
                originPixel={{ x: projected.x, y: projected.y }}
                vector={vecData.tensionVec!}
                type="tension"
                sceneScale={PIXEL_VECTOR_SCALE}
                pixelLength={vecData.tensionLength!}
                label="FT"
                font={canvasSize.font}
              />

              {/* 平行四边形定则辅助线 */}
              <line
                x1={projected.x}
                y1={projected.y + gForceLength}
                x2={projected.x + vecData.cOffX!}
                y2={projected.y}
                stroke={PHYSICS_COLORS.textMuted}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <line
                x1={projected.x + vecData.tOffX!}
                y1={projected.y - vecData.tOffY!}
                x2={projected.x + vecData.cOffX!}
                y2={projected.y}
                stroke={PHYSICS_COLORS.textMuted}
                strokeWidth={1}
                strokeDasharray="3 3"
              />

              {/* 效果向心合力 F_合 (动力亮橙，水平指向旋转轴) */}
              {vecData.centripLength! > 0 && (
                <VectorArrow
                  originPixel={{ x: projected.x, y: projected.y }}
                  vector={vecData.centripVec!}
                  type="force"
                  sceneScale={PIXEL_VECTOR_SCALE}
                  pixelLength={vecData.centripLength!}
                  color={PHYSICS_COLORS.forceNet}
                  label="F合"
                  dashed
                  font={canvasSize.font}
                />
              )}
            </g>
          ) : (
            // ─── 旋转圆盘受力平衡 ───
            <g>
              {/* 支持力 F_N (支持天蓝，竖直向上) */}
              {vecData.normalLength! > 0 && (
                <VectorArrow
                  originPixel={{ x: projected.x, y: projected.y }}
                  vector={vecData.normalVec!}
                  type="normalForce"
                  sceneScale={PIXEL_VECTOR_SCALE}
                  pixelLength={vecData.normalLength!}
                  label="FN"
                  font={canvasSize.font}
                />
              )}

              {/* 摩擦力 f (静摩擦黄褐，沿半径指向圆心) */}
              {vecData.frictionLength! > 0 && (
                <VectorArrow
                  originPixel={{ x: projected.x, y: projected.y }}
                  vector={vecData.frictionVec!}
                  type="friction"
                  sceneScale={PIXEL_VECTOR_SCALE}
                  pixelLength={vecData.frictionLength!}
                  color={disk.slipping ? PHYSICS_COLORS.friction : PHYSICS_COLORS.frictionStatic}
                  label={disk.slipping ? "f滑" : "f静"}
                  glow={disk.slipping}
                  font={canvasSize.font}
                />
              )}
            </g>
          )}
        </g>
      )}

      {/* ─── 物理实体小球 / 木块 ─── */}
      {projected.opacity > 0 && (
        <g opacity={projected.opacity}>
          {isConical ? (
            // 精致黄铜摆球
            <Ball
              cx={projected.x}
              cy={projected.y}
              r={16}
              type="pendulumBob"
              stroke={PHYSICS_COLORS.objectStroke}
              strokeWidth={1.5}
            />
          ) : (
            // 立体木质物块 (圆角矩形 + 表面木纹填充)
            <rect
              x={projected.x - SCENE.blockSize / 2}
              y={projected.y - SCENE.blockSize / 2}
              width={SCENE.blockSize}
              height={SCENE.blockSize}
              rx={3}
              fill="url(#lab-wood-grad)"
              stroke={PHYSICS_COLORS.strokeDark}
              strokeWidth={1.8}
            />
          )}
        </g>
      )}

      {/* 3D 旋转轴 上半截轴（仅圆盘模式，画在圆盘、物体和受力分析上层，以形成完美的 3D 穿插透视遮挡） */}
      {!isConical && (
        <g>
          <rect
            x={SCENE.centerX - 4}
            y={54}
            width={8}
            height={284}
            fill="url(#shaft-grad)"
            stroke={PENDULUM_COLORS.rodStroke}
            strokeWidth={1}
          />
          {/* 轴帽 */}
          <rect
            x={SCENE.centerX - 6}
            y={46}
            width={12}
            height={8}
            rx={1.5}
            fill={PENDULUM_COLORS.pivotFill}
            stroke={PENDULUM_COLORS.pivotStroke}
            strokeWidth={1}
          />
          <circle cx={SCENE.centerX} cy={SCENE.pivotY} r={3} fill={PENDULUM_COLORS.pivotStroke} />
          <Label x={SCENE.centerX} y={34} font={canvasSize.font}>旋转轴</Label>
        </g>
      )}

      {/* ─── 底部物理量图例说明 ─── */}
      <text
        x={18}
        y={626}
        fontSize={canvasSize.font(11)}
        fill={PHYSICS_COLORS.labelTextLight}
      >
        蓝：速度 v / 绿：重力 mg / 紫：拉力 FT / 天蓝：支持力 FN / 褐：摩擦力 f / 橙：合力 F合
      </text>
    </AnimationSvgCanvas>
  )
}
