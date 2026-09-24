import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationStore } from '@/stores'
import { RelationChart } from '@/components/Chart'
import type { RelationDataSeries, RelationMarker } from '@/components/Chart'
import { EnergyBars } from '@/components/Physics'
import type { EnergyBarItem } from '@/components/Physics'
import {
  CANVAS_COLORS,
  EM_OSCILLATION_COLORS,
  SCENE_COLORS,
  VISIBLE_SPECTRUM_COLORS,
  withAlpha,
} from '@/theme/physics'
import {
  EM_SPECTRUM_BANDS,
  wavelengthFromFrequency,
  formatWavelength,
  formatLCEnergy,
} from '@/physics'
import { useLCPhysics } from './hooks/useLCPhysics'
import {
  EM_WAVE_FREQ_MIN_MHZ,
  EM_WAVE_FREQ_MAX_MHZ,
} from './hooks/useEMWavePhysics'
import { DampingEnvelopeOverlay } from './components/DampingEnvelopeOverlay'

/** 默认参数（与 registry / 薄壳保持一致） */
const LC_DEFAULTS = { L: 1, C: 1, Q0: 1 } as const

/**
 * 中屏上半屏图表区（splitV）。
 *
 * 三个场次各自消费自己的图表：
 *   - LC 振荡：q(t)/i(t) 归一化波形 + 能量转化柱状图
 *   - 电磁波：λ–f 反比曲线（c = λf 的几何表达）+ 当前工作点
 *   - 电磁波谱：等宽谱段顺序条（补足对数轴上被压窄的谱段）
 */
export default function EMOscillationCenterExtra() {
  const scene = useAnimationStore((s) => s.params.scene ?? 0)

  if (scene === 1) return <EMWavePanel />
  if (scene === 2) return <EMSpectrumPanel />
  return <LCPanel />
}

// ─── 场次 0：LC 振荡 ───────────────────────────────────────────────────────

function LCPanel() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time })),
  )

  const showDamping = (params.showDamping ?? 0) === 1

  const physics = useLCPhysics({
    L: params.L ?? LC_DEFAULTS.L,
    C: params.C ?? LC_DEFAULTS.C,
    Q0: params.Q0 ?? LC_DEFAULTS.Q0,
    time,
    showDamping,
  })

  const {
    chargeCurve,
    currentCurve,
    dampingCurve,
    curveSpan,
    T,
    eElectric,
    eMagnetic,
    eTotal,
  } = physics

  const series = useMemo<RelationDataSeries[]>(
    () => [
      {
        points: currentCurve,
        label: 'i / (ωQ₀)',
        color: EM_OSCILLATION_COLORS.current,
        strokeWidth: 1.8,
      },
    ],
    [currentCurve],
  )

  const markers = useMemo<RelationMarker[]>(
    () => [
      { axis: 'vertical', x: T / 4, label: 'T/4' },
      { axis: 'vertical', x: T / 2, label: 'T/2' },
      { axis: 'vertical', x: T, label: 'T' },
    ],
    [T],
  )

  const safeElectric = Math.abs(eElectric) < 1e-4 ? 0 : eElectric
  const safeMagnetic = Math.abs(eMagnetic) < 1e-4 ? 0 : eMagnetic

  const barItems: EnergyBarItem[] = [
    {
      key: 'ee',
      label: '电场能',
      value: safeElectric,
      color: EM_OSCILLATION_COLORS.electricEnergy,
      displayValue: formatLCEnergy(safeElectric),
    },
    {
      key: 'em',
      label: '磁场能',
      value: safeMagnetic,
      color: EM_OSCILLATION_COLORS.magneticEnergy,
      displayValue: formatLCEnergy(safeMagnetic),
    },
  ]

  const cursorX = Math.min(time, curveSpan)

  return (
    <div className="w-full h-full flex flex-row gap-2 p-2 bg-white rounded-xl border border-neutral-100 shadow-sm">
      {/* 左：归一化波形（占满中屏上半屏高度）*/}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="shrink-0 flex justify-between items-center mb-0.5">
          <span className="text-xs font-bold text-neutral-800">归一化波形 q(t) 与 i(t)</span>
          <span className="text-[9px] text-neutral-400">两者相位相差 90°</span>
        </div>
        <div className="flex-1 min-h-0">
          <RelationChart
            points={chargeCurve}
            additionalSeries={series}
            xLabel="时间 t (s)"
            yLabel="归一化值"
            xDomain={[0, curveSpan]}
            yDomain={[-1.15, 1.15]}
            cursorX={cursorX}
            cursorLabel={(_x, y) => (Math.abs(y) < 1e-6 ? 0 : y).toFixed(2)}
            showZeroLine
            showGrid
            color={EM_OSCILLATION_COLORS.charge}
            strokeWidth={2.2}
            mainLabel="q / Q₀"
            markers={markers}
          >
            {showDamping && dampingCurve.length > 0 ? (
              <DampingEnvelopeOverlay points={dampingCurve} />
            ) : null}
          </RelationChart>
        </div>
      </div>

      {/* 右：能量转化柱状图 */}
      <div className="w-[300px] shrink-0 self-start h-[196px]">
        <EnergyBars
          items={barItems}
          initialEtot={eTotal}
          normalizeMax={eTotal}
          showConservationTotal
          conservationFormat={(total) => `${formatLCEnergy(total)} J`}
          title="能量转化 Ee ⇄ Em"
          compact
        />
      </div>
    </div>
  )
}

// ─── 场次 1：电磁波（λ–f 反比曲线）────────────────────────────────────────

function EMWavePanel() {
  const fEM = useAnimationStore((s) => s.params.fEM ?? 100)

  /** λ = c / f 的整条函数曲线（复用物理层参数范围，消除双真源） */
  const curve = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const step = 10
    for (let f = EM_WAVE_FREQ_MIN_MHZ; f <= EM_WAVE_FREQ_MAX_MHZ; f += step) {
      pts.push({ x: f, y: wavelengthFromFrequency(f * 1e6) })
    }
    return pts
  }, [])

  const lambda = wavelengthFromFrequency(fEM * 1e6)

  return (
    <div className="w-full h-full flex flex-col p-2 bg-white rounded-xl border border-neutral-100 shadow-sm">
      <div className="shrink-0 flex justify-between items-center mb-0.5 px-0.5">
        <span className="text-xs font-bold text-neutral-800">波长–频率关系 λ = c / f</span>
        <span className="text-[9px] text-neutral-400 font-mono">
          工作点 f = {fEM} MHz，λ = {formatWavelength(lambda)}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        {/*
          只画整条 λ = c/f 曲线 + 游标：不再另加 axis:'point' 标记 —— 标记点与游标
          落在同一位置，两者的文字标签会完全叠印（实测 x 相差 0.7 px、y 相差 2.4 px）。
          工作点读数已由标题行的“工作点 f = …，λ = …”与游标标签共同给出。
        */}
        <RelationChart
          points={curve}
          xLabel="频率 f (MHz)"
          yLabel="波长 λ (m)"
          xDomain={[EM_WAVE_FREQ_MIN_MHZ - 20, EM_WAVE_FREQ_MAX_MHZ + 20]}
          yDomain={[0, 3.2]}
          cursorX={fEM}
          cursorLabel={(_x, y) => `λ = ${y.toFixed(2)} m`}
          showGrid
          color={EM_OSCILLATION_COLORS.bFieldWave}
          strokeWidth={2.2}
        />
      </div>
    </div>
  )
}

// ─── 场次 2：电磁波谱（等宽谱段顺序条）─────────────────────────────────────

const BAND_COLOR_TOKENS = [
  'bandRadio',
  'bandMicrowave',
  'bandInfrared',
  'bandVisible',
  'bandUltraviolet',
  'bandXRay',
  'bandGamma',
] as const

const BAND_ORDER_LABELS = ['①', '②', '③', '④', '⑤', '⑥', '⑦']

const BAND_SCALE_REFERENCES = [
  '高楼大厦 (~100m)',
  '蜜蜂/硬币 (~1cm)',
  '针尖大小 (~10μm)',
  '细胞/细菌 (~0.5μm)',
  '大分子/病毒 (~200nm)',
  '小分子/DNA (~1nm)',
  '原子核级 (~1pm)',
]

/**
 * 可见光卡片的七色底纹。
 *
 * 彩虹只有压在等宽卡片上（≈100 px）才有分辨力：画布色带里可见光仅 12.7 px，
 * 七色会被压成一条模糊色线。色值全部来自 theme 层令牌（§11.3）。
 */
const VISIBLE_RAINBOW_BACKGROUND = `linear-gradient(180deg, ${VISIBLE_SPECTRUM_COLORS.map(
  (color, i) =>
    `${withAlpha(color, 0.14)} ${(((i / (VISIBLE_SPECTRUM_COLORS.length - 1)) * 100).toFixed(1))}%`,
).join(', ')})`

/** 可见光卡片激活时的描边色：取七色中段的黄，与底纹同源，不另立硬编码 */
const VISIBLE_ACCENT_COLOR = VISIBLE_SPECTRUM_COLORS[2]

/** 非激活卡片的底纹色（替代裸 rgba(0,0,0,0.03)） */
const INACTIVE_CHIP_BACKGROUND = withAlpha(CANVAS_COLORS.labelText, 0.03)

/**
 * 等宽谱段顺序条。
 *
 * 对数轴上可见光等窄谱段会被压成一条线，无法标注；
 * 本面板改用等宽卡片排列，融合"高考顺序记忆"、"典型波长"与"宏微观尺度物理参照物"，
 * 支持点击卡片直接聚焦该谱段。
 */
function EMSpectrumPanel() {
  const bandIndex = useAnimationStore((s) => s.params.band ?? 0)

  const handleSelectBand = (index: number) => {
    // 关键修正：必须调用 updateParam 做字段局部合并，严禁调用 setParams 整体覆写（会导致 scene 丢失脱节）
    useAnimationStore.getState().updateParam('band', index)
  }

  return (
    <div className="w-full h-full flex flex-col p-2 bg-white rounded-xl border border-neutral-100 shadow-sm">
      <div className="shrink-0 flex justify-between items-center mb-1.5 px-0.5">
        <span className="text-xs font-bold text-neutral-800">电磁波谱（波长递减 · 穿透能力与频率递增）</span>
        <span className="text-[9px] text-neutral-400">点击卡片可聚焦谱段</span>
      </div>
      <div className="flex-1 min-h-0 flex flex-row items-center gap-1.5">
        {EM_SPECTRUM_BANDS.map((band, i) => {
          const isActive = i === bandIndex
          const isVisible = band.key === 'visible'
          const color = EM_OSCILLATION_COLORS[BAND_COLOR_TOKENS[i] ?? 'bandRadio']
          return (
            <button
              type="button"
              key={band.key}
              onClick={() => handleSelectBand(i)}
              className="flex-1 min-w-0 h-[132px] rounded-xl border flex flex-col items-center justify-between py-2 px-1 text-center transition-all cursor-pointer hover:shadow-sm"
              style={{
                borderColor: isActive
                  ? isVisible
                    ? VISIBLE_ACCENT_COLOR
                    : color
                  : SCENE_COLORS.charts.gridLine,
                backgroundColor: isActive
                  ? withAlpha(color, 0.09)
                  : CANVAS_COLORS.objectFillNeutral,
                borderWidth: isActive ? 2 : 1,
                backgroundImage: isVisible ? VISIBLE_RAINBOW_BACKGROUND : undefined,
              }}
            >
              <div className="w-full flex items-center justify-center gap-1">
                <span className="text-[10px] font-mono" style={{ color: SCENE_COLORS.charts.tickLabel }}>
                  {BAND_ORDER_LABELS[i]}
                </span>
                <span
                  className="text-xs font-bold truncate"
                  style={{ color: isActive ? color : CANVAS_COLORS.labelText }}
                >
                  {band.label}
                </span>
              </div>

              <div className="w-full my-auto flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-mono text-neutral-500 font-semibold">
                  {formatWavelength(band.representativeLambda)}
                </span>
                {isVisible && (
                  <span className="text-[8px] text-amber-600/80 font-mono tracking-tighter">
                    七色彩虹光谱
                  </span>
                )}
              </div>

              <div
                className="w-full px-1 py-0.5 rounded text-[9px] truncate font-medium"
                style={{
                  backgroundColor: isActive
                    ? withAlpha(color, 0.16)
                    : INACTIVE_CHIP_BACKGROUND,
                  color: isActive ? color : CANVAS_COLORS.textMuted,
                }}
                title={BAND_SCALE_REFERENCES[i]}
              >
                {BAND_SCALE_REFERENCES[i]}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

