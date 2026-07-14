/**
 * FaradayFieldSandbox.tsx — 法拉第电磁感应进阶模式场景（匀变磁场）
 *
 * 从 FaradayLaw.tsx 拆分：进阶模式 (mode=1) 的中间屏渲染。
 */
import { PHYSICS_COLORS, EM_COLORS, SCENE_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { VectorArrow, MagneticFieldSymbols } from '@/components/Physics'
import { COIL_RX, COIL_RY } from './hooks/useFaradayPhysics'

interface Props {
  N: number
  dBdt: number
  time: number
  sandboxW: number
  coilY: number
  fieldDots: { x: number; y: number }[]
  currentB: number
  B_is_in: boolean
  magneticFieldOpacity: number
  glowOpacity: number
  glowWidth: number
  inducedCurrentDir: number
  font: (base: number) => number
}

export function FaradayFieldSandbox({
  N, dBdt, time,
  sandboxW, coilY,
  fieldDots, currentB, B_is_in, magneticFieldOpacity,
  glowOpacity, glowWidth, inducedCurrentDir,
  font,
}: Props) {
  return (
    <g>
      {/* 1. 动态磁场 6x5 阵列 */}
      <MagneticFieldSymbols
        points={fieldDots}
        direction={B_is_in ? 'in' : 'out'}
        opacity={magneticFieldOpacity}
      />

      {/* 2. 磁感应强度状态条 */}
      <text x="16" y="30" fontSize={CANVAS_STYLE.font.axisSize}
        fill={PHYSICS_COLORS.magneticFieldCross} fontWeight="bold">
        B(t) = k·t (B₀ = 0)
      </text>
      <text x="16" y="46" fontSize={font(10)} fill={PHYSICS_COLORS.labelText}>
        当前 B = {currentB.toFixed(2)} T ({B_is_in ? '向里 ⊗' : '向外 ⊙'})
      </text>
      <text x="16" y="62" fontSize={font(10)} fill={PHYSICS_COLORS.trackHistory}>
        变化率 k = {dBdt.toFixed(1)} T/s（图表 0–10s 循环）
      </text>

      {/* 3. 线圈圆环 */}
      <ellipse cx={sandboxW / 2} cy={coilY + 10} rx={COIL_RX * 1.5} ry={COIL_RY * 1.5}
        fill="none" stroke={SCENE_COLORS.coil.copperBase}
        strokeWidth={CANVAS_STYLE.stroke.objectLine * 1.8} />

      {/* 4. 黄色高亮环 */}
      {glowOpacity > 0.02 && (
        <ellipse cx={sandboxW / 2} cy={coilY + 10} rx={COIL_RX * 1.5} ry={COIL_RY * 1.5}
          fill="none" stroke={EM_COLORS.emf} strokeWidth={glowWidth}
          strokeLinecap="round" strokeDasharray="14, 18"
          strokeDashoffset={inducedCurrentDir !== 0 ? time * 140 * inducedCurrentDir : 0}
          opacity={glowOpacity}
          style={{ filter: `drop-shadow(0px 0px 4px ${EM_COLORS.emf})` }} />
      )}

      {/* 电流方向辅助指示箭头 */}
      {inducedCurrentDir !== 0 && (
        <g transform={`translate(${sandboxW / 2}, ${coilY - COIL_RY * 1.5 + 10})`}>
          <VectorArrow
            originDesign={{ x: 0, y: 10 }}
            vector={{ x: inducedCurrentDir > 0 ? 1 : -1, y: 0 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={30}
            strokeWidth={2}
          />
          <text x="0" y="-15" fontSize={font(9)} fill={EM_COLORS.electricCurrent}
            textAnchor="middle" fontWeight="bold">
            感应电流 {inducedCurrentDir > 0 ? '顺时针' : '逆时针'}
          </text>
        </g>
      )}

      {/* 线圈匝数回显 */}
      <text x={sandboxW / 2} y={coilY + COIL_RY * 1.5 + 32} fontSize={CANVAS_STYLE.font.axisSize}
        fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
        线圈: {N} 匝
      </text>
    </g>
  )
}
