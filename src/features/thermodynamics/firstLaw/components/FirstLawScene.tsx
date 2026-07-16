import { SCENE_COLORS, ENERGY_COLORS, THERMO_COLORS, FIRST_LAW_COLORS, STROKE, FONT, withAlpha } from '@/theme/physics'
import { PhysicsVectorArrow } from '@/components/Physics'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import { temperatureToColor, deltaUToBgColor } from '@/physics/firstLaw'
import type { GasParticle, HeatParticle } from '@/physics/firstLaw'

// ─── Scene props ───────────────────────────────────────────────────────────
interface FirstLawSceneProps {
  mode: number
  T: number
  W: number
  Q: number
  deltaU: number
  pistonY: number
  adiabatic: number
  isWorkApplied: boolean
  forceVector: { x: number; y: number }
  forceOrigin: { x: number; y: number }
  currentStepIndex?: number
  sceneScale: SceneScale
  font: (size: number) => number
  particlesRef: React.MutableRefObject<GasParticle[]>
  heatParticlesRef: React.MutableRefObject<HeatParticle[]>
}

export function FirstLawScene({
  mode,
  T,
  W,
  Q,
  deltaU,
  pistonY,
  adiabatic,
  isWorkApplied,
  forceVector,
  forceOrigin,
  currentStepIndex,
  sceneScale,
  font,
  particlesRef,
  heatParticlesRef,
}: FirstLawSceneProps) {
  // 气缸外边界
  const cylLeftTop = worldToDesign(-0.9, 5.2, sceneScale)
  const cylWidth = 1.8 * sceneScale.scaleX
  const cylHeight = 4.7 * sceneScale.scaleY

  // 气体边界背景
  const gasLeftTop = worldToDesign(-0.87, pistonY, sceneScale)
  const gasWidth = 1.74 * sceneScale.scaleX
  const gasHeight = (pistonY - 0.6) * sceneScale.scaleY

  // 活塞
  const pistonLeftTop = worldToDesign(-0.89, pistonY + 0.1, sceneScale)
  const pistonWidth = 1.78 * sceneScale.scaleX
  const pistonHeight = 0.2 * sceneScale.scaleY

  // 内能背景色
  const gasBgColor = deltaUToBgColor(deltaU)

  return (
    <>
      {/* 1. 加热/冷却源视觉表现 */}
      {Q > 0 && (
        <g>
          <path
            d={`M ${worldToDesign(-0.7, 0.5, sceneScale).px} ${worldToDesign(0, 0.5, sceneScale).py}
               Q ${worldToDesign(-0.35, 0.45, sceneScale).px} ${worldToDesign(0, 0.45, sceneScale).py} ${worldToDesign(0, 0.5, sceneScale).px} ${worldToDesign(0, 0.5, sceneScale).py}
               T ${worldToDesign(0.7, 0.5, sceneScale).px} ${worldToDesign(0, 0.5, sceneScale).py}`}
            fill="none"
            stroke={SCENE_COLORS.thermal.heaterOn}
            strokeWidth={STROKE.objectThin}
            strokeLinecap="round"
            opacity={0.8}
          />
          <text
            x={worldToDesign(0, 0.35, sceneScale).px}
            y={worldToDesign(0, 0.35, sceneScale).py}
            fontSize={font(9)}
            fill={SCENE_COLORS.thermal.heaterOn}
            textAnchor="middle"
            fontFamily={FONT.family}
            fontWeight="bold"
          >
            热源供热 Q &gt; 0
          </text>
        </g>
      )}

      {Q < 0 && (
        <g>
          <rect
            x={worldToDesign(-0.7, 0.55, sceneScale).px}
            y={worldToDesign(-0.7, 0.55, sceneScale).py}
            width={1.4 * sceneScale.scaleX}
            height={0.15 * sceneScale.scaleY}
            fill={withAlpha(THERMO_COLORS.heatRelease, 0.4)}
            rx={2}
            opacity={0.7}
          />
          <text
            x={worldToDesign(0, 0.35, sceneScale).px}
            y={worldToDesign(0, 0.35, sceneScale).py}
            fontSize={font(9)}
            fill={THERMO_COLORS.heatRelease}
            textAnchor="middle"
            fontFamily={FONT.family}
            fontWeight="bold"
          >
            热源吸热 Q &lt; 0 (系统放热)
          </text>
        </g>
      )}

      {/* 绝热气缸标记 */}
      {adiabatic === 1 && mode === 0 && (
        <text
          x={worldToDesign(0, 0.35, sceneScale).px}
          y={worldToDesign(0, 0.35, sceneScale).py}
          fontSize={font(9)}
          fill={FIRST_LAW_COLORS.adiabaticWall}
          textAnchor="middle"
          fontFamily={FONT.family}
          fontWeight="bold"
        >
          绝热气缸 Q ＝ 0
        </text>
      )}

      {/* 2. 气缸底色背景 */}
      <rect
        x={gasLeftTop.px}
        y={gasLeftTop.py}
        width={gasWidth}
        height={gasHeight}
        fill={gasBgColor}
        stroke="none"
      />

      {/* 3. 热流粒子 */}
      {heatParticlesRef.current.map((hp, i) => {
        const dPos = worldToDesign(hp.x, hp.y, sceneScale)
        const pColor = Q > 0 ? THERMO_COLORS.heatAbsorb : THERMO_COLORS.heatRelease
        return (
          <circle
            key={`heat-${i}`}
            cx={dPos.px}
            cy={dPos.py}
            r={2.5}
            fill={pColor}
            opacity={hp.life * 0.7}
          />
        )
      })}

      {/* 4. 气缸实体框线 */}
      <rect
        x={cylLeftTop.px}
        y={cylLeftTop.py}
        width={cylWidth}
        height={cylHeight}
        fill="none"
        stroke={adiabatic && mode === 0 ? FIRST_LAW_COLORS.adiabaticWall : SCENE_COLORS.thermal.gasChamberSt}
        strokeWidth={STROKE.objectLine}
        strokeDasharray={adiabatic === 1 && mode === 0 ? '6 3' : undefined}
        rx={6}
      />

      {/* 5. 气体分子粒子 */}
      {particlesRef.current.map((p, i) => {
        if (p.y > pistonY - 0.1) return null
        const dPos = worldToDesign(p.x, p.y, sceneScale)
        const pColor = temperatureToColor(T)
        return (
          <circle
            key={`gas-${i}`}
            cx={dPos.px}
            cy={dPos.py}
            r={3}
            fill={pColor}
            opacity={0.85}
          />
        )
      })}

      {/* 6. 活塞组件 */}
      <rect
        x={pistonLeftTop.px}
        y={pistonLeftTop.py}
        width={pistonWidth}
        height={pistonHeight}
        fill={SCENE_COLORS.thermoChamber.pistonBody}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={STROKE.objectThin}
        rx={3}
      />
      <rect
        x={worldToDesign(-0.15, pistonY + 1.2, sceneScale).px}
        y={worldToDesign(-0.15, pistonY + 1.2, sceneScale).py}
        width={0.3 * sceneScale.scaleX}
        height={1.0 * sceneScale.scaleY}
        fill={SCENE_COLORS.thermoChamber.pistonBody}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={STROKE.objectThin}
        opacity={0.8}
      />

      {/* 7. 外界受力矢量箭头 */}
      {isWorkApplied && (
        <PhysicsVectorArrow
          origin={forceOrigin}
          vector={forceVector}
          type="force"
          sceneScale={sceneScale}
          color={ENERGY_COLORS.work}
          label={W > 0 ? 'F_外' : 'F_气'}
          font={font}
          glow
        />
      )}

      {/* 8. 实时文字状态标注 */}
      <g>
        <rect
          x={worldToDesign(-1.3, 5.8, sceneScale).px}
          y={worldToDesign(-1.3, 5.8, sceneScale).py}
          width={2.6 * sceneScale.scaleX}
          height={0.5 * sceneScale.scaleY}
          fill={withAlpha(SCENE_COLORS.materials.structBgLight, 0.95)}
          stroke={SCENE_COLORS.materials.structStrokePale}
          strokeWidth={1}
          rx={4}
        />
        <text
          x={worldToDesign(0, 5.6, sceneScale).px}
          y={worldToDesign(0, 5.6, sceneScale).py}
          fontSize={font(10)}
          fill={SCENE_COLORS.charts.labelText}
          textAnchor="middle"
          fontWeight="bold"
          fontFamily={FONT.family}
        >
          {mode === 1 ? `循环步骤: ${['①等压膨胀', '②等容加热', '③等压压缩', '④等容冷却'][currentStepIndex ?? 0]}` : '沙箱自由模拟'}
        </text>
        <text
          x={worldToDesign(0, 5.4, sceneScale).px}
          y={worldToDesign(0, 5.4, sceneScale).py}
          fontSize={font(9)}
          fill={ENERGY_COLORS.internalEnergy}
          textAnchor="middle"
          fontFamily={FONT.family}
        >
          T = {T.toFixed(0)} K | ΔU = {deltaU.toFixed(0)} J
        </text>
      </g>
    </>
  )
}
