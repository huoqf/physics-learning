import {
  CANVAS_COLORS,
  CIRCUIT_COLORS,
  EM_OSCILLATION_COLORS,
  FONT,
  PHYSICS_COLORS,
  STROKE,
  withAlpha,
} from '@/theme/physics'

interface RadioModulationSceneProps {
  modType?: number // 0: 调幅 AM, 1: 调频 FM
  time: number
  font: (size: number) => number
}

// ─── 几何布局（设计坐标，画布 840 × 325）─────────────────────────────────────
const TX_X = 230
const RX_X = 610
const CENTER_Y = 160

/**
 * 无线电调制、发射、接收与检波全链路物理场景。
 *
 * 教材依据：人教版选择性必修第二册第 4 章第 3 节图 4.3-3 与图 4.3-5。
 *
 * 对应高考题眼：
 *   1. 发射端【调制】：低频音频信号叠加到高频载波上（调幅 AM 改变振幅，调频 FM 改变频率）；
 *   2. 空间【传播】：由开放天线以光速 c 向空间发射电磁波；
 *   3. 接收端【调谐】：LC 回路电谐振选出电台；
 *   4. 接收端【检波】：利用二极管单向导电性切除负半周，再经滤波电容还原原始音频。
 */
export function RadioModulationScene({ modType = 0, time, font }: RadioModulationSceneProps) {
  const isFM = modType === 1

  // 空间行进波前（向右推移）
  const waveSpeed = 90
  const waveSpacing = 32
  const waveCount = 10
  const baseOffset = (time * waveSpeed) % waveSpacing
  const linkSpan = RX_X - TX_X

  return (
    <>
      {/* ── 0. 空间行进电磁波（AM 改变振幅包络；FM 振幅恒定、疏密交替）── */}
      <g pointerEvents="none">
        {Array.from({ length: waveCount }).map((_, idx) => {
          const linearR = baseOffset + idx * waveSpacing
          // FM 模式下波前呈疏密周期交替（正弦相位偏移），AM 模式保持等距推进
          const r = isFM
            ? linearR + 7.5 * Math.sin(time * 3 - (linearR / linkSpan) * Math.PI * 3)
            : linearR
          if (r < 20 || r > linkSpan - 10) return null
          const distFrac = r / linkSpan
          // AM 调幅波包包络波动；FM 等幅（envScale = 1）
          const envScale = isFM ? 1 : 0.7 + 0.3 * Math.cos(time * 3 - distFrac * 6)
          const opacity = Math.max(0, (0.8 - distFrac * 0.45) * (isFM ? 0.92 : envScale))

          return (
            <path
              key={`mod-wave-${idx}`}
              d={`M ${TX_X + r * 0.3} ${CENTER_Y - r * 0.85 * envScale} Q ${TX_X + r} ${CENTER_Y} ${TX_X + r * 0.3} ${CENTER_Y + r * 0.85 * envScale}`}
              fill="none"
              stroke={isFM ? EM_OSCILLATION_COLORS.current : EM_OSCILLATION_COLORS.bFieldWave}
              strokeWidth={STROKE.axis}
              strokeDasharray={idx % 2 === 0 ? undefined : '4,3'}
              opacity={opacity}
            />
          )
        })}
      </g>

      {/* ── 1. 发射系统（左侧）── */}
      <g>
        {/* 话筒/音频源 */}
        <rect
          x={36}
          y={CENTER_Y - 70}
          width={64}
          height={38}
          rx={5}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.objectLine}
        />
        <text
          x={68}
          y={CENTER_Y - 46}
          fontSize={font(FONT.small)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
          fontFamily={FONT.family}
        >
          话筒 (音频)
        </text>

        {/* 高频载波发生器 */}
        <rect
          x={36}
          y={CENTER_Y + 32}
          width={64}
          height={38}
          rx={5}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.objectLine}
        />
        <text
          x={68}
          y={CENTER_Y + 56}
          fontSize={font(FONT.small)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
          fontFamily={FONT.family}
        >
          高频载波
        </text>

        {/* 调制器主模块 */}
        <rect
          x={126}
          y={CENTER_Y - 35}
          width={72}
          height={70}
          rx={6}
          fill={withAlpha(PHYSICS_COLORS.velocity, 0.08)}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={STROKE.objectLine}
        />
        <text
          x={162}
          y={CENTER_Y - 8}
          fontSize={font(FONT.label)}
          fill={PHYSICS_COLORS.velocity}
          textAnchor="middle"
          fontWeight="bold"
          fontFamily={FONT.family}
        >
          调制器
        </text>
        <text
          x={162}
          y={CENTER_Y + 12}
          fontSize={font(FONT.annotation)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontFamily={FONT.family}
        >
          {isFM ? '调频 FM' : '调幅 AM'}
        </text>

        {/* 发射连线 */}
        <g fill="none" stroke={CIRCUIT_COLORS.wire} strokeWidth={STROKE.objectLine} strokeLinecap="round">
          {/* 音频线入调制器 */}
          <line x1={100} y1={CENTER_Y - 51} x2={126} y2={CENTER_Y - 15} />
          {/* 载波线入调制器 */}
          <line x1={100} y1={CENTER_Y + 51} x2={126} y2={CENTER_Y + 15} />
          {/* 调制器至发射天线 */}
          <line x1={198} y1={CENTER_Y} x2={TX_X} y2={CENTER_Y} />
        </g>

        {/* 发射天线立柱（Tx） */}
        <line
          x1={TX_X}
          y1={CENTER_Y + 105}
          x2={TX_X}
          y2={CENTER_Y - 105}
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={STROKE.objectLine + 1}
          strokeLinecap="round"
        />
        <circle cx={TX_X} cy={CENTER_Y - 105} r={5} fill={PHYSICS_COLORS.velocity} />
        <circle
          cx={TX_X}
          cy={CENTER_Y - 105}
          r={10 + 3 * Math.sin(time * 16)}
          fill={withAlpha(PHYSICS_COLORS.velocity, 0.28)}
        />
        <text
          x={TX_X}
          y={CENTER_Y - 116}
          fontSize={font(FONT.small)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontFamily={FONT.family}
          fontWeight="bold"
        >
          Tx 发射天线
        </text>
      </g>

      {/* ── 2. 接收系统（右侧）── */}
      <g>
        {/* 接收天线立柱（Rx） */}
        <line
          x1={RX_X}
          y1={CENTER_Y + 105}
          x2={RX_X}
          y2={CENTER_Y - 105}
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={STROKE.objectLine + 1}
          strokeLinecap="round"
        />
        <circle cx={RX_X} cy={CENTER_Y - 105} r={5} fill={EM_OSCILLATION_COLORS.current} />
        <circle
          cx={RX_X}
          cy={CENTER_Y - 105}
          r={9 + 3 * Math.sin(time * 18)}
          fill={withAlpha(EM_OSCILLATION_COLORS.current, 0.3)}
        />
        <text
          x={RX_X}
          y={CENTER_Y - 116}
          fontSize={font(FONT.small)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontFamily={FONT.family}
          fontWeight="bold"
        >
          Rx 接收天线
        </text>

        {/* 调谐选台模块 */}
        <rect
          x={RX_X + 24}
          y={CENTER_Y - 35}
          width={58}
          height={70}
          rx={6}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.objectLine}
        />
        <text
          x={RX_X + 53}
          y={CENTER_Y - 8}
          fontSize={font(FONT.label)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
          fontFamily={FONT.family}
        >
          调谐
        </text>
        <text
          x={RX_X + 53}
          y={CENTER_Y + 12}
          fontSize={font(FONT.annotation)}
          fill={EM_OSCILLATION_COLORS.current}
          textAnchor="middle"
          fontFamily={FONT.family}
        >
          电谐振
        </text>

        {/* 解调模块（AM：二极管单向检波；FM：鉴频器解调） */}
        <g transform={`translate(${RX_X + 106}, ${CENTER_Y - 35})`}>
          <rect
            x={0}
            y={0}
            width={62}
            height={70}
            rx={6}
            fill={withAlpha(EM_OSCILLATION_COLORS.charge, 0.08)}
            stroke={EM_OSCILLATION_COLORS.charge}
            strokeWidth={STROKE.objectLine}
          />
          <text
            x={31}
            y={18}
            fontSize={font(FONT.label)}
            fill={EM_OSCILLATION_COLORS.charge}
            textAnchor="middle"
            fontWeight="bold"
            fontFamily={FONT.family}
          >
            {isFM ? '鉴频器' : '检波器'}
          </text>

          {isFM ? (
            /* 鉴频解调符号（Δf → u） */
            <text
              x={31}
              y={44}
              fontSize={font(FONT.small)}
              fill={EM_OSCILLATION_COLORS.charge}
              textAnchor="middle"
              fontWeight="bold"
              fontFamily={FONT.family}
            >
              Δf → u
            </text>
          ) : (
            /* 二极管电路符号（三角形 + 竖阻挡线） */
            <g transform="translate(18, 32)">
              {/* 三角形正极 */}
              <polygon points="0,4 16,12 0,20" fill={EM_OSCILLATION_COLORS.charge} />
              {/* 负极竖线 */}
              <line
                x1={16}
                y1={2}
                x2={16}
                y2={22}
                stroke={EM_OSCILLATION_COLORS.charge}
                strokeWidth={STROKE.objectLine}
              />
            </g>
          )}
          <text
            x={31}
            y={62}
            fontSize={font(FONT.annotation)}
            fill={CANVAS_COLORS.textMuted}
            textAnchor="middle"
            fontFamily={FONT.family}
          >
            {isFM ? '频率解调' : '单向导电'}
          </text>
        </g>

        {/* 滤波与音频还原扬声器 */}
        <g transform={`translate(${RX_X + 192}, ${CENTER_Y - 30})`}>
          {/* 扬声器图标 */}
          <polygon
            points="4,16 16,16 28,6 28,42 16,32 4,32"
            fill={CANVAS_COLORS.objectFillNeutral}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={STROKE.objectLine}
          />
          {/* 声音传播弧线 */}
          <path
            d="M 33,14 A 12,12 0 0 1 33,34"
            fill="none"
            stroke={PHYSICS_COLORS.magneticField}
            strokeWidth={STROKE.axis}
          />
          <path
            d="M 38,9 A 18,18 0 0 1 38,39"
            fill="none"
            stroke={PHYSICS_COLORS.magneticField}
            strokeWidth={STROKE.axis}
          />
          <text
            x={20}
            y={58}
            fontSize={font(FONT.small)}
            fill={CANVAS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
            fontFamily={FONT.family}
          >
            扬声器
          </text>
        </g>

        {/* 接收链路连线 */}
        <g fill="none" stroke={CIRCUIT_COLORS.wire} strokeWidth={STROKE.objectLine} strokeLinecap="round">
          {/* 天线到调谐 */}
          <line x1={RX_X} y1={CENTER_Y} x2={RX_X + 24} y2={CENTER_Y} />
          {/* 调谐到检波器 */}
          <line x1={RX_X + 82} y1={CENTER_Y} x2={RX_X + 106} y2={CENTER_Y} />
          {/* 检波器到扬声器 */}
          <line x1={RX_X + 168} y1={CENTER_Y} x2={RX_X + 194} y2={CENTER_Y} />
        </g>
      </g>

      {/* ── 3. 全链路四阶段指示文字标签 ── */}
      <g fontFamily={FONT.family} fontSize={font(FONT.small)} fontWeight="bold">
        <text x={162} y={CENTER_Y + 54} fill={PHYSICS_COLORS.velocity} textAnchor="middle">
          ① 调制 (加载信号)
        </text>
        <text x={(TX_X + RX_X) / 2} y={CENTER_Y - 78} fill={EM_OSCILLATION_COLORS.bFieldWave} textAnchor="middle">
          ② 发射与传播 (光速 c)
        </text>
        <text x={RX_X + 54} y={CENTER_Y + 54} fill={EM_OSCILLATION_COLORS.current} textAnchor="middle">
          ③ 调谐 (选台)
        </text>
        <text x={RX_X + 142} y={CENTER_Y + 54} fill={EM_OSCILLATION_COLORS.charge} textAnchor="middle">
          {isFM ? '④ 鉴频 (还原)' : '④ 检波 (还原)'}
        </text>
      </g>
    </>
  )
}
