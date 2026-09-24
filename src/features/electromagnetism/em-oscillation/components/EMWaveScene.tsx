import { useMemo } from 'react'
import {
  CANVAS_COLORS,
  EM_OSCILLATION_COLORS,
  SCENE_COLORS,
  STROKE,
  FONT,
} from '@/theme/physics'
import { WAVE_WINDOW_METERS } from '../hooks/useEMWavePhysics'
import type { EMWavePhysicsResult } from '../hooks/useEMWavePhysics'

interface EMWaveSceneProps {
  physics: EMWavePhysicsResult
  font: (size: number) => number
}

// ─── 绘图区几何（设计坐标，画布 840×325）───────────────────────────────────
const PLOT = { x: 120, width: 620 } as const
const PLOT_RIGHT = PLOT.x + PLOT.width

const AXIS_Y = 150
/** 电场强度示意振幅（高中不作定量要求，仅示意方向与相位） */
const E_AMPLITUDE = 62
/** 磁场强度示意振幅 */
const B_AMPLITUDE = 50
/**
 * 磁场坐标轴的斜向投影方向（设计坐标，y↓为正）。
 *
 * 采用固定投影方向角（纸面斜向左下约 124°）：
 * dx: -0.36, dy: 0.54（空间深度方向），保持三维正交透视恒定，彻底杜绝高频塌缩。
 */
const B_AXIS = { dx: -0.36, dy: 0.54 } as const

const RULER_Y = 292
/** 空间坐标尺的分段数（每段 1.0 m） */
const RULER_TICKS = 3
const LAMBDA_MARK_Y = 236
/** 每多少个采样点画一根"梳齿"连线 */
const COMB_STEP = 8
/**
 * 波长数超过该值时不再画梳齿连线。
 *
 * 高频工况下梳齿过密会掩盖两条正弦曲线，此时只保留 E、B 曲线与主轴。
 */
const COMB_MAX_WAVELENGTHS = 4

function toPath(samples: { x: number; y: number }[], map: (s: { x: number; y: number }) => [number, number]): string {
  if (samples.length === 0) return ''
  return (
    'M ' +
    samples
      .map((s) => {
        const [px, py] = map(s)
        return `${px.toFixed(1)},${py.toFixed(1)}`
      })
      .join(' L ')
  )
}

/**
 * 电磁波场次：真空中平面电磁波的三维结构示意。
 *
 * 定量内容只有一条 —— c = λf：
 *   - 横轴为真实长度（0 → 3.0 m），波长按真实比例落位；
 *   - 频率越高，窗口内完整波长数越多，λ 标注随之变短。
 *
 * E 与 B 同相（真空平面波），共用归一化采样，B 沿固定透视三维轴投影。
 */
export function EMWaveScene({ physics, font }: EMWaveSceneProps) {
  const { wave, wavelengthCount } = physics
  const lambdaPx = PLOT.width / Math.max(wavelengthCount, 1e-6)

  const eY = (y: number) => AXIS_Y - y * E_AMPLITUDE
  // 采用固定斜向投影偏移，消除频率漂移与角度塌缩，配合竖直辅助线锚定同相截面
  const bOffset = (y: number) => ({
    x: y * B_AMPLITUDE * B_AXIS.dx,
    y: y * B_AMPLITUDE * B_AXIS.dy,
  })

  const ePath = toPath(wave, (s) => [PLOT.x + s.x * PLOT.width, eY(s.y)])
  const bPath = toPath(wave, (s) => {
    const off = bOffset(s.y)
    return [PLOT.x + s.x * PLOT.width + off.x, AXIS_Y + off.y]
  })

  // 构造闭合波幕光带路径（由波形向中轴封闭）
  const eRibbonPath =
    wave.length > 0
      ? `${ePath} L ${PLOT.x + wave[wave.length - 1].x * PLOT.width} ${AXIS_Y} L ${PLOT.x} ${AXIS_Y} Z`
      : ''

  const bRibbonPath =
    wave.length > 0
      ? `${bPath} L ${PLOT.x + wave[wave.length - 1].x * PLOT.width} ${AXIS_Y} L ${PLOT.x} ${AXIS_Y} Z`
      : ''

  // 密集梳齿填充：波长数较少时渲染，高频过密时关闭
  const combs =
    wavelengthCount <= COMB_MAX_WAVELENGTHS
      ? wave.filter((_, i) => i % COMB_STEP === 0)
      : []

  // 同相特征截面（与梳齿解耦）：提取波峰与波谷，全频段（100~1000 MHz）恒定保证 E 与 B 具有显式贯通投影虚线
  const peakSamples = useMemo(() => {
    const rawPeaks: typeof wave = []
    for (let i = 1; i < wave.length - 1; i++) {
      const prev = wave[i - 1].y
      const curr = wave[i].y
      const next = wave[i + 1].y
      const isLocalMax = curr > prev && curr >= next && curr > 0.75
      const isLocalMin = curr < prev && curr <= next && curr < -0.75
      if (isLocalMax || isLocalMin) {
        rawPeaks.push(wave[i])
      }
    }
    // 超过 10 个特征点时隔一个采样，避免 1000 MHz 下连线过密
    return rawPeaks.length > 10
      ? rawPeaks.filter((_, idx) => idx % 2 === 0)
      : rawPeaks
  }, [wave])

  return (
    <>
      {/* ── 0. 渐变与滤镜定义 ── */}
      <defs>
        <linearGradient id="em-efield-ribbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={EM_OSCILLATION_COLORS.eFieldWave} stopOpacity="0.28" />
          <stop offset="50%" stopColor={EM_OSCILLATION_COLORS.eFieldWave} stopOpacity="0.04" />
          <stop offset="100%" stopColor={EM_OSCILLATION_COLORS.eFieldWave} stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id="em-bfield-ribbon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={EM_OSCILLATION_COLORS.bFieldWave} stopOpacity="0.22" />
          <stop offset="100%" stopColor={EM_OSCILLATION_COLORS.bFieldWave} stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* ── 1. 三维空间正交参考轴（c 传播轴、E 电场轴、B 磁场透视轴）── */}
      <g>
        {/* 1.1 传播方向轴（x 轴 / c 方向） */}
        <line
          x1={PLOT.x - 24}
          y1={AXIS_Y}
          x2={PLOT_RIGHT + 26}
          y2={AXIS_Y}
          stroke={EM_OSCILLATION_COLORS.propagation}
          strokeWidth={STROKE.axis + 2}
          opacity={0.2}
        />
        <line
          x1={PLOT.x - 20}
          y1={AXIS_Y}
          x2={PLOT_RIGHT + 24}
          y2={AXIS_Y}
          stroke={EM_OSCILLATION_COLORS.propagation}
          strokeWidth={STROKE.axis}
        />
        <polygon
          points={`${PLOT_RIGHT + 36},${AXIS_Y} ${PLOT_RIGHT + 24},${AXIS_Y - 5.5} ${PLOT_RIGHT + 24},${
            AXIS_Y + 5.5
          }`}
          fill={EM_OSCILLATION_COLORS.propagation}
        />

        {/* 1.2 原点处的电场 E 轴基准线 */}
        <line
          x1={PLOT.x}
          y1={AXIS_Y + 16}
          x2={PLOT.x}
          y2={AXIS_Y - E_AMPLITUDE - 18}
          stroke={EM_OSCILLATION_COLORS.eFieldWave}
          strokeWidth={STROKE.axis}
          opacity={0.7}
        />
        <polygon
          points={`${PLOT.x},${AXIS_Y - E_AMPLITUDE - 24} ${PLOT.x - 4},${AXIS_Y - E_AMPLITUDE - 17} ${PLOT.x + 4},${AXIS_Y - E_AMPLITUDE - 17}`}
          fill={EM_OSCILLATION_COLORS.eFieldWave}
        />

        {/* 1.3 原点处的磁场 B 轴透视斜轴基准线 */}
        <line
          x1={PLOT.x - 28 * B_AXIS.dx}
          y1={AXIS_Y - 28 * B_AXIS.dy}
          x2={PLOT.x + 42 * B_AXIS.dx}
          y2={AXIS_Y + 42 * B_AXIS.dy}
          stroke={EM_OSCILLATION_COLORS.bFieldWave}
          strokeWidth={STROKE.axis}
          opacity={0.7}
        />
        {(() => {
          const tipX = PLOT.x + 46 * B_AXIS.dx
          const tipY = AXIS_Y + 46 * B_AXIS.dy
          const angle = Math.atan2(B_AXIS.dy, B_AXIS.dx)
          return (
            <polygon
              points={`${tipX},${tipY} ${tipX - 7 * Math.cos(angle - 0.4)},${tipY - 7 * Math.sin(angle - 0.4)} ${tipX - 7 * Math.cos(angle + 0.4)},${tipY - 7 * Math.sin(angle + 0.4)}`}
              fill={EM_OSCILLATION_COLORS.bFieldWave}
            />
          )
        })()}
      </g>

      {/* ── 2. 磁场 B：立体渐变光幕与正弦主线 ── */}
      <g>
        {bRibbonPath && (
          <path d={bRibbonPath} fill="url(#em-bfield-ribbon)" pointerEvents="none" />
        )}
        <path
          d={bPath}
          fill="none"
          stroke={EM_OSCILLATION_COLORS.bFieldWave}
          strokeWidth={STROKE.chartMain}
          strokeLinecap="round"
        />
      </g>

      {/* ── 3. 电场 E：立体渐变光幕与正弦主线 ── */}
      <g>
        {eRibbonPath && (
          <path d={eRibbonPath} fill="url(#em-efield-ribbon)" pointerEvents="none" />
        )}
        <path
          d={ePath}
          fill="none"
          stroke={EM_OSCILLATION_COLORS.eFieldWave}
          strokeWidth={STROKE.chartMain}
          strokeLinecap="round"
        />
      </g>

      {/* ── 4. 梳齿连线（低频背景辅助）与同相特征截面贯穿虚线（全频段恒定生效）── */}
      <g>
        {/* 4.1 低频梳齿背景细线 */}
        {combs.map((s, i) => {
          const off = bOffset(s.y)
          const px = PLOT.x + s.x * PLOT.width
          const tipBX = px + off.x
          const tipBY = AXIS_Y + off.y
          const tipEY = eY(s.y)

          return (
            <g key={`comb-bg-${i}`}>
              <line
                x1={px}
                y1={AXIS_Y}
                x2={px}
                y2={tipEY}
                stroke={EM_OSCILLATION_COLORS.eFieldWave}
                strokeWidth={STROKE.fieldLineThin}
                opacity={0.25}
              />
              <line
                x1={px}
                y1={AXIS_Y}
                x2={tipBX}
                y2={tipBY}
                stroke={EM_OSCILLATION_COLORS.bFieldWave}
                strokeWidth={STROKE.fieldLineThin}
                opacity={0.25}
              />
            </g>
          )
        })}

        {/* 4.2 同相特征截面贯通虚线与正交峰值微矢量（全频段 100~1000 MHz 均保持渲染，彻底锚定同相几何） */}
        {peakSamples.map((s, i) => {
          const off = bOffset(s.y)
          const px = PLOT.x + s.x * PLOT.width
          const tipBX = px + off.x
          const tipBY = AXIS_Y + off.y
          const tipEY = eY(s.y)
          const bAngle = Math.atan2(off.y, off.x)

          return (
            <g key={`peak-inphase-${i}`}>
              {/* E 峰与 B 峰之间的同截面贯穿虚线：直观证明两者源自同一空间位置 x，消除横向视差 */}
              <line
                x1={px}
                y1={tipEY}
                x2={tipBX}
                y2={tipBY}
                stroke={CANVAS_COLORS.labelTextLight}
                strokeWidth={STROKE.annotation}
                strokeDasharray="3,3"
                opacity={0.8}
              />

              {/* 中轴公共锚点：表明两场源自空间同一位置 x */}
              <circle
                cx={px}
                cy={AXIS_Y}
                r={2.2}
                fill={CANVAS_COLORS.axis}
                opacity={0.9}
              />

              {/* 电场主矢量线与尖端微箭头 */}
              <line
                x1={px}
                y1={AXIS_Y}
                x2={px}
                y2={tipEY}
                stroke={EM_OSCILLATION_COLORS.eFieldWave}
                strokeWidth={STROKE.axis}
                opacity={0.7}
              />
              <polygon
                points={`${px},${tipEY} ${px - 3.5},${tipEY + (s.y > 0 ? 6 : -6)} ${px + 3.5},${tipEY + (s.y > 0 ? 6 : -6)}`}
                fill={EM_OSCILLATION_COLORS.eFieldWave}
                opacity={0.9}
              />

              {/* 磁场主矢量线与斜向尖端微箭头 */}
              <line
                x1={px}
                y1={AXIS_Y}
                x2={tipBX}
                y2={tipBY}
                stroke={EM_OSCILLATION_COLORS.bFieldWave}
                strokeWidth={STROKE.axis}
                opacity={0.7}
              />
              <polygon
                points={`${tipBX},${tipBY} ${tipBX - 6 * Math.cos(bAngle - 0.45)},${tipBY - 6 * Math.sin(bAngle - 0.45)} ${tipBX - 6 * Math.cos(bAngle + 0.45)},${tipBY - 6 * Math.sin(bAngle + 0.45)}`}
                fill={EM_OSCILLATION_COLORS.bFieldWave}
                opacity={0.9}
              />
            </g>
          )
        })}
      </g>

      {/* ── 4. 波长 λ 标注（按真实比例缩放）── */}
      <g>
        <line
          x1={PLOT.x}
          y1={LAMBDA_MARK_Y}
          x2={PLOT.x + lambdaPx}
          y2={LAMBDA_MARK_Y}
          stroke={CANVAS_COLORS.labelTextLight}
          strokeWidth={STROKE.annotation}
        />
        <line
          x1={PLOT.x}
          y1={LAMBDA_MARK_Y - 6}
          x2={PLOT.x}
          y2={LAMBDA_MARK_Y + 6}
          stroke={CANVAS_COLORS.labelTextLight}
          strokeWidth={STROKE.annotation}
        />
        <line
          x1={PLOT.x + lambdaPx}
          y1={LAMBDA_MARK_Y - 6}
          x2={PLOT.x + lambdaPx}
          y2={LAMBDA_MARK_Y + 6}
          stroke={CANVAS_COLORS.labelTextLight}
          strokeWidth={STROKE.annotation}
        />
        <text
          x={PLOT.x + lambdaPx / 2}
          y={LAMBDA_MARK_Y - 10}
          fontSize={font(FONT.small)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
          fontFamily={FONT.family}
        >
          {`λ = ${physics.lambdaLabel}`}
        </text>
      </g>

      {/* ── 5. 空间坐标尺（真实长度 0 → 3.0 m）── */}
      <g>
        <line
          x1={PLOT.x}
          y1={RULER_Y}
          x2={PLOT_RIGHT}
          y2={RULER_Y}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.axis}
        />
        {Array.from({ length: RULER_TICKS + 1 }).map((_, i) => {
          const px = PLOT.x + i * (PLOT.width / RULER_TICKS)
          return (
            <g key={`ruler-${i}`}>
              <line
                x1={px}
                y1={RULER_Y}
                x2={px}
                y2={RULER_Y + 7}
                stroke={CANVAS_COLORS.axis}
                strokeWidth={STROKE.tick}
              />
              <text
                x={px}
                y={RULER_Y + 20}
                fontSize={font(FONT.small)}
                fill={SCENE_COLORS.charts.tickLabel}
                textAnchor="middle"
                fontFamily={FONT.family}
              >
                {(i * (WAVE_WINDOW_METERS / RULER_TICKS)).toFixed(0)}
              </text>
            </g>
          )
        })}
        <text
          x={PLOT_RIGHT + 26}
          y={RULER_Y + 20}
          fontSize={font(FONT.small)}
          fill={SCENE_COLORS.charts.tickLabel}
          textAnchor="start"
          fontFamily={FONT.family}
        >
          x / m
        </text>
      </g>

      {/* ── 6. 场量符号标注 ── */}
      <g fontFamily={FONT.family} fontStyle="italic" fontWeight="bold" textAnchor="middle">
        <text
          x={PLOT.x - 16}
          y={AXIS_Y - E_AMPLITUDE - 20}
          fontSize={font(FONT.label)}
          fill={EM_OSCILLATION_COLORS.eFieldWave}
        >
          E
        </text>
        <text
          x={PLOT.x + 58 * B_AXIS.dx}
          y={AXIS_Y + 58 * B_AXIS.dy + 4}
          fontSize={font(FONT.label)}
          fill={EM_OSCILLATION_COLORS.bFieldWave}
        >
          B
        </text>
        <text
          x={PLOT_RIGHT + 28}
          y={AXIS_Y - 14}
          fontSize={font(FONT.label)}
          fill={EM_OSCILLATION_COLORS.propagation}
        >
          c
        </text>
      </g>
    </>
  )
}
