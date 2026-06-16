/**
 * FaradayFieldSandbox.tsx — 法拉第电磁感应进阶模式场景（匀变磁场）
 *
 * 从 FaradayLaw.tsx 拆分：进阶模式 (mode=1) 的中间屏渲染。
 */
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { colors } from '@/theme/colors'
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
      {fieldDots.map((pt, i) => (
        <g key={`fdot-${i}`} transform={`translate(${pt.x}, ${pt.y})`} opacity={magneticFieldOpacity}>
          {B_is_in ? (
            <g>
              <circle cx="0" cy="0" r="6" fill="none"
                stroke={PHYSICS_COLORS.magneticFieldCross} strokeWidth="1.2" />
              <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5"
                stroke={PHYSICS_COLORS.magneticFieldCross} strokeWidth="1.2" />
              <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5"
                stroke={PHYSICS_COLORS.magneticFieldCross} strokeWidth="1.2" />
            </g>
          ) : (
            <g>
              <circle cx="0" cy="0" r="6" fill="none"
                stroke={PHYSICS_COLORS.magneticFieldDot} strokeWidth="1.2" />
              <circle cx="0" cy="0" r="1.8" fill={PHYSICS_COLORS.magneticFieldDot} />
            </g>
          )}
        </g>
      ))}

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
          fill="none" stroke={colors.accent[400]} strokeWidth={glowWidth}
          strokeLinecap="round" strokeDasharray="14, 18"
          strokeDashoffset={inducedCurrentDir !== 0 ? time * 140 * inducedCurrentDir : 0}
          opacity={glowOpacity}
          style={{ filter: `drop-shadow(0px 0px 4px ${colors.accent[300]})` }} />
      )}

      {/* 电流方向辅助指示箭头 */}
      {inducedCurrentDir !== 0 && (
        <g transform={`translate(${sandboxW / 2}, ${coilY - COIL_RY * 1.5 + 10})`}>
          <path d={inducedCurrentDir > 0 ? "M -15 -10 L 15 -10" : "M 15 -10 L -15 -10"}
            stroke={colors.accent[600]} strokeWidth="2" markerEnd="url(#arrFluxGold)" />
          <text x="0" y="-15" fontSize={font(9)} fill={colors.accent[700]}
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
