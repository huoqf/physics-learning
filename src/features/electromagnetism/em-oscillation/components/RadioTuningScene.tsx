import { useMemo } from 'react'
import {
  CANVAS_COLORS,
  CIRCUIT_COLORS,
  EM_OSCILLATION_COLORS,
  FONT,
  PHYSICS_COLORS,
  STROKE,
  withAlpha,
} from '@/theme/physics'
import { Solenoid, VectorArrow } from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { calculateRadioResonance } from '@/physics'

interface RadioTuningSceneProps {
  cRx: number
  time: number
  font: (size: number) => number
}

// ─── 几何布局（画布 840 × 325）─────────────────────────────────────────────
const TX = { x: 130, y: 160, antennaTop: 45, antennaBottom: 265 } as const
const RX = { x: 710, y: 160, antennaTop: 45, antennaBottom: 265 } as const
const RX_LC = { left: 560, right: 670, top: 100, bottom: 230 } as const

/**
 * 无线电发射天线辐射与接收回路调谐电谐振场景。
 *
 * 对应高考考点：
 * 1. 发射需开放电路天线与高频振荡；
 * 2. 空间以光速 c 辐射传播电磁波；
 * 3. 接收端通过旋转可变电容器改变回路固有频率，当 f₀ = f_发射 时发生电谐振（选台）。
 */
export function RadioTuningScene({ cRx, time, font }: RadioTuningSceneProps) {
  // 假定目标发射电台频率为 100 MHz（基准调谐点对应 cRx = 1.0 μF）
  // 固有频率 f₀ ∝ 1 / √C，故 fRx / fTx = 1 / √cRx
  const fTx = 100e6
  const fRx = fTx / Math.sqrt(Math.max(0.2, cRx))
  const { response, isTuned } = useMemo(
    () => calculateRadioResonance(fTx, fRx, 14),
    [fTx, fRx],
  )

  // 空间行进波前（向右推移）
  const waveSpeed = 120 // 像素/秒
  const waveSpacing = 36
  const waveCount = 9
  const baseOffset = (time * waveSpeed) % waveSpacing

  return (
    <>
      {/* ── 0. 发射电台向外辐射的电磁波弧线 ── */}
      <g pointerEvents="none">
        {Array.from({ length: waveCount }).map((_, idx) => {
          const r = baseOffset + idx * waveSpacing
          if (r < 25 || r > RX.x - TX.x + 30) return null
          const opacity = Math.max(0, 0.75 - (r / (RX.x - TX.x)) * 0.55)

          return (
            <path
              key={`wave-${idx}`}
              d={`M ${TX.x + r * 0.28} ${TX.y - r * 0.9} Q ${TX.x + r} ${TX.y} ${TX.x + r * 0.28} ${TX.y + r * 0.9}`}
              fill="none"
              stroke={EM_OSCILLATION_COLORS.bFieldWave}
              strokeWidth={STROKE.axis}
              strokeDasharray={idx % 2 === 0 ? undefined : '5,3'}
              opacity={opacity}
            />
          )
        })}
      </g>

      {/* ── 1. 发射端设备与偶极开放天线 ── */}
      <g>
        {/* 发射基座外壳 */}
        <rect
          x={TX.x - 50}
          y={TX.y + 40}
          width={65}
          height={65}
          rx={6}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.objectLine}
        />
        <text
          x={TX.x - 18}
          y={TX.y + 70}
          fontSize={font(FONT.small)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
          fontFamily={FONT.family}
        >
          发射源
        </text>
        <text
          x={TX.x - 18}
          y={TX.y + 88}
          fontSize={font(FONT.annotation)}
          fill={EM_OSCILLATION_COLORS.propagation}
          textAnchor="middle"
          fontFamily={FONT.family}
        >
          100 MHz
        </text>

        {/* 发射天线立柱（开放振荡回路） */}
        <line
          x1={TX.x}
          y1={TX.antennaBottom}
          x2={TX.x}
          y2={TX.antennaTop}
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={STROKE.objectLine + 1}
          strokeLinecap="round"
        />
        <circle cx={TX.x} cy={TX.antennaTop} r={5} fill={EM_OSCILLATION_COLORS.eFieldWave} />
        {/* 天线顶端电磁发射电晕 */}
        <circle
          cx={TX.x}
          cy={TX.antennaTop}
          r={10 + 4 * Math.sin(time * 16)}
          fill={withAlpha(EM_OSCILLATION_COLORS.eFieldWave, 0.25)}
        />

        <text
          x={TX.x - 12}
          y={TX.antennaTop + 4}
          fontSize={font(FONT.small)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="end"
          fontFamily={FONT.family}
          fontWeight="bold"
        >
          Tx 发射天线
        </text>
      </g>

      {/* ── 2. 接收天线（Rx）与连接导线 ── */}
      <g>
        {/* 接收天线 */}
        <line
          x1={RX.x}
          y1={RX.antennaBottom}
          x2={RX.x}
          y2={RX.antennaTop}
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={STROKE.objectLine + 1}
          strokeLinecap="round"
        />
        <circle cx={RX.x} cy={RX.antennaTop} r={5} fill={EM_OSCILLATION_COLORS.current} />
        {isTuned && (
          <circle
            cx={RX.x}
            cy={RX.antennaTop}
            r={12 + 5 * Math.sin(time * 20)}
            fill={withAlpha(EM_OSCILLATION_COLORS.current, 0.35)}
          />
        )}
        <text
          x={RX.x + 14}
          y={RX.antennaTop + 4}
          fontSize={font(FONT.small)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="start"
          fontFamily={FONT.family}
          fontWeight="bold"
        >
          Rx 接收天线
        </text>

        {/* 接收回路导线 */}
        <g fill="none" stroke={CIRCUIT_COLORS.wire} strokeWidth={STROKE.objectLine} strokeLinecap="round">
          {/* 天线引入调谐回路顶端 */}
          <line x1={RX.x} y1={RX_LC.top} x2={RX_LC.right} y2={RX_LC.top} />
          {/* 回路顶边 */}
          <line x1={RX_LC.right} y1={RX_LC.top} x2={RX_LC.left} y2={RX_LC.top} />
          {/* 回路左边（含电感） */}
          <line x1={RX_LC.left} y1={RX_LC.top} x2={RX_LC.left} y2={RX_LC.bottom} />
          {/* 回路底边 */}
          <line x1={RX_LC.left} y1={RX_LC.bottom} x2={RX_LC.right} y2={RX_LC.bottom} />
          {/* 回路右边引入天线地线端 */}
          <line x1={RX_LC.right} y1={RX_LC.bottom} x2={RX.x} y2={RX_LC.bottom} />
        </g>
      </g>

      {/* ── 3. 调谐回路元件：电感线圈 L 与 可变电容器 C ── */}
      <g>
        {/* 左侧接收电感线圈 */}
        <Solenoid
          x={RX_LC.left}
          y={(RX_LC.top + RX_LC.bottom) / 2}
          width={80}
          height={32}
          turns={5}
          current={response * Math.sin(time * 12)}
          leadType="horizontal"
          showPolarity={false}
          showWindingArrows={false}
          showIronCore={false}
          animated={false}
        />
        <text
          x={RX_LC.left - 26}
          y={(RX_LC.top + RX_LC.bottom) / 2 + 5}
          fontSize={font(FONT.label)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
          fontFamily={FONT.family}
          fontStyle="italic"
        >
          L
        </text>

        {/* 右侧可变电容器符号与调节斜箭头 */}
        <g transform={`translate(${RX_LC.right}, ${(RX_LC.top + RX_LC.bottom) / 2})`}>
          {/* 两个电容平行极板 */}
          <line x1={-18} y1={-7} x2={18} y2={-7} stroke={CIRCUIT_COLORS.wire} strokeWidth={STROKE.objectLine + 1} />
          <line x1={-18} y1={7} x2={18} y2={7} stroke={CIRCUIT_COLORS.wire} strokeWidth={STROKE.objectLine + 1} />
          {/* 引线 */}
          <line x1={0} y1={-25} x2={0} y2={-7} stroke={CIRCUIT_COLORS.wire} strokeWidth={STROKE.objectLine} />
          <line x1={0} y1={7} x2={0} y2={25} stroke={CIRCUIT_COLORS.wire} strokeWidth={STROKE.objectLine} />
          {/* 可变电容贯穿箭头 */}
          <line
            x1={-20}
            y1={16}
            x2={20}
            y2={-16}
            stroke={EM_OSCILLATION_COLORS.charge}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <polygon
            points="23,-19 16,-19 19,-13"
            fill={EM_OSCILLATION_COLORS.charge}
          />
          <text
            x={28}
            y={5}
            fontSize={font(FONT.label)}
            fill={CANVAS_COLORS.labelText}
            textAnchor="start"
            fontWeight="bold"
            fontFamily={FONT.family}
            fontStyle="italic"
          >
            C
          </text>
        </g>
      </g>

      {/* ── 4. 调谐共振指示状态（LED灯 / 检波喇叭） ── */}
      <g transform={`translate(615, 276)`}>
        {/* 指示灯底座 */}
        <rect
          x={-44}
          y={-14}
          width={88}
          height={28}
          rx={14}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={isTuned ? PHYSICS_COLORS.velocity : CANVAS_COLORS.axis}
          strokeWidth={isTuned ? 2 : 1}
        />
        {/* 发光发亮核心 */}
        <circle
          cx={-24}
          cy={0}
          r={isTuned ? 8 : 5}
          fill={isTuned ? PHYSICS_COLORS.velocity : CANVAS_COLORS.axis}
        />
        {isTuned && (
          <circle
            cx={-24}
            cy={0}
            r={14}
            fill={withAlpha(PHYSICS_COLORS.velocity, 0.35)}
          />
        )}
        <text
          x={-8}
          y={4}
          fontSize={font(FONT.small)}
          fill={isTuned ? PHYSICS_COLORS.velocity : CANVAS_COLORS.textMuted}
          fontWeight="bold"
          fontFamily={FONT.family}
          textAnchor="start"
        >
          {isTuned ? '电谐振·调谐成功' : '未谐振'}
        </text>
      </g>

      {/* ── 5. 回路感应电流流动矢量 ── */}
      {response > 0.15 && (
        <VectorArrow
          originDesign={{ x: (RX_LC.left + RX_LC.right) / 2 - 20, y: RX_LC.top }}
          vector={{ x: 1, y: 0 }}
          type="currentDirection"
          arrowType="visual-only"
          sceneScale={IDENTITY_SCENE_SCALE}
          pixelLength={20 + 26 * response}
          strokeWidth={STROKE.vectorSub}
          label="i_感"
          font={font}
        />
      )}
    </>
  )
}
