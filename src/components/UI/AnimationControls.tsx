import React, { useEffect, useMemo, useState } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  StepBack,
  StepForward,
  Pin,
  Repeat,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Camera,
  X,
  Layers,
} from 'lucide-react'
import { colors } from '@/theme/colors'
import { duration } from '@/theme/motion'
import { withAlpha } from '@/theme/physics'
import { STROBE_INTERVAL_OPTIONS } from '@/utils/strobe'
import type { CriticalTimePoint, TimeStageSegment } from '@/data/types'
import type { DeepLinkFreezeHint } from '@/utils/animationDeepLink'

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 1] as const
const STEP_SIZE_OPTIONS = [0.01, 0.02, 0.05, 0.1] as const
const CRITICAL_MATCH_EPSILON = 0.015

const STAGE_VARIANT_ORDER: NonNullable<TimeStageSegment['variant']>[] = [
  'primary',
  'secondary',
  'accent',
  'danger',
]

function getStagePalette(variant: TimeStageSegment['variant'], index: number) {
  const resolved = variant ?? STAGE_VARIANT_ORDER[index % STAGE_VARIANT_ORDER.length]
  if (resolved === 'secondary') {
    return {
      trackBg: withAlpha(colors.secondary[500], 0.22),
      chipBg: colors.secondary[50],
      chipText: colors.secondary[700],
      chipBorder: colors.secondary[300],
    }
  }
  if (resolved === 'accent') {
    return {
      trackBg: withAlpha(colors.accent[500], 0.24),
      chipBg: colors.accent[50],
      chipText: colors.accent[700],
      chipBorder: colors.accent[300],
    }
  }
  if (resolved === 'danger') {
    return {
      trackBg: withAlpha(colors.danger[500], 0.2),
      chipBg: colors.danger[50],
      chipText: colors.danger[700],
      chipBorder: colors.danger[300],
    }
  }
  if (resolved === 'neutral') {
    return {
      trackBg: withAlpha(colors.neutral[500], 0.18),
      chipBg: colors.neutral[100],
      chipText: colors.neutral[700],
      chipBorder: colors.neutral[300],
    }
  }
  return {
    trackBg: withAlpha(colors.primary[500], 0.22),
    chipBg: colors.primary[50],
    chipText: colors.primary[700],
    chipBorder: colors.primary[300],
  }
}

function getCriticalPalette(variant?: CriticalTimePoint['variant']) {
  if (variant === 'critical') {
    return {
      dot: colors.danger[500],
      chipBg: colors.danger[50],
      chipText: colors.danger[700],
      chipBorder: colors.danger[300],
      activeBg: colors.danger[600],
    }
  }
  if (variant === 'warning') {
    return {
      dot: colors.accent[500],
      chipBg: colors.accent[50],
      chipText: colors.accent[700],
      chipBorder: colors.accent[300],
      activeBg: colors.accent[600],
    }
  }
  return {
    dot: colors.primary[500],
    chipBg: colors.primary[50],
    chipText: colors.primary[700],
    chipBorder: colors.primary[300],
    activeBg: colors.primary[600],
  }
}

/**
 * 定格提示条 —— 「你停在哪一帧、这一帧该看什么」。
 *
 * 学生从错因打靶台 / 错题本点「直达定格帧」进来时，页面把时间停到某一刻并暂停。
 * 那是一个**不动的画面**：没有这行字，他只会以为页面卡住了，或者以为自己点错了。
 *
 * 提示的消失不在这里处理，也不靠 URL 清理 —— 由父级按「时间是否仍停在这一帧 +
 * 是否在播放」派生（见 AnimationPage 的 visibleDeepLinkHint），学生一拖进度条
 * 或点播放，传进来的 hint 就变成 null。
 */
const DeepLinkHintRow: React.FC<{ hint: DeepLinkFreezeHint }> = ({ hint }) => (
  <div className="mb-1.5 pb-1.5 border-b border-neutral-100">
    <div className="flex items-start gap-1.5 text-xs">
      <span
        className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium"
        style={{ color: colors.secondary[700], backgroundColor: colors.secondary[100] }}
      >
        <Pin className="w-3 h-3" />
        已定格 {hint.time.toFixed(2)}s
      </span>
      {hint.note && (
        <span className="min-w-0 text-neutral-600 leading-relaxed" title={hint.note}>
          {hint.note}
        </span>
      )}
    </div>
    <div className="mt-1 text-xs text-neutral-400">
      拖动进度条或点播放即可继续，看这一刻前后怎么变
    </div>
  </div>
)

const SpeedSelector: React.FC<{
  speed: number
  onSpeedChange: (speed: number) => void
}> = ({ speed, onSpeedChange }) => (
  <div className="flex items-center gap-1.5 text-sm shrink-0">
    <span className="text-neutral-600 text-xs whitespace-nowrap">倍速：</span>
    <div className="flex gap-1">
      {SPEED_OPTIONS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSpeedChange(s)}
          title={s < 1 ? `慢放 ${s}x` : s === 1 ? '正常速度 1x' : `快放 ${s}x`}
          className={[
            'px-2 py-1 rounded text-xs font-medium whitespace-nowrap shrink-0 active:scale-[0.97] transition-all cursor-pointer',
            speed === s
              ? 'bg-primary-600 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
          ].join(' ')}
          style={{
            transitionProperty: 'all',
            transitionDuration: `${duration.fast}ms`,
            transitionTimingFunction: 'ease-out',
          }}
        >
          {s}x
        </button>
      ))}
    </div>
  </div>
)

interface AnimationControlsProps {
  isPlaying: boolean
  speed: number
  time: number
  maxTime: number
  onPlayPause: () => void
  onReset: () => void
  onSpeedChange: (speed: number) => void
  onTimeChange: (time: number) => void
  /** 控制器渲染模式，默认 'timed' */
  controlsMode?: 'timed' | 'loop' | 'param' | 'pause-only'
  /** 高考临界时刻点配置，用于进度条标注与点击精准吸附定格 */
  criticalTimes?: CriticalTimePoint[]
  /** 物理过程阶段分段配置，用于进度条分段着色与当前阶段提示 */
  timeStages?: TimeStageSegment[]
  /** 是否开启微步逐帧分析按钮，默认 true */
  enableFrameStep?: boolean
  /** 微步步进大小（秒），默认 0.05s；支持在 0.01s / 0.02s / 0.05s / 0.1s 间切换 */
  stepSize?: number
  /** timed 模式下是否循环重播 */
  repeatLoop?: boolean
  /** 切换 timed 模式的单次/循环重播 */
  onToggleRepeatLoop?: () => void
  /** 播放经过关键临界点时是否自动暂停 */
  autoPauseCritical?: boolean
  /** 切换关键临界点自动暂停 */
  onToggleAutoPauseCritical?: () => void
  /** 是否处于控制变量参照对照（Ghost）模式 */
  ghostActive?: boolean
  /** 对照组与当前实验组的参数差异摘要 */
  ghostDiffSummary?: string | null
  /** 锁定/更新控制变量参照快照 */
  onCaptureGhost?: () => void
  /** 清除参照快照 */
  onClearGhost?: () => void
  /** 是否开启频闪残影模式 */
  showTimeSlices?: boolean
  /** 频闪采样周期（秒） */
  timeSliceInterval?: number
  /** 切换频闪残影模式 */
  onToggleTimeSlices?: () => void
  /** 切换频闪采样周期 */
  onTimeSliceIntervalChange?: (interval: number) => void
  /** 深链定格提示；非空时在控制条顶部显示「已定格到哪一帧 + 该看什么」 */
  deepLinkHint?: DeepLinkFreezeHint | null
}

export const AnimationControls: React.FC<AnimationControlsProps> = ({
  isPlaying,
  speed,
  time,
  maxTime,
  onPlayPause,
  onReset,
  onSpeedChange,
  onTimeChange,
  controlsMode = 'timed',
  criticalTimes,
  timeStages,
  enableFrameStep = true,
  stepSize = 0.05,
  repeatLoop = false,
  onToggleRepeatLoop,
  autoPauseCritical = false,
  onToggleAutoPauseCritical,
  ghostActive = false,
  ghostDiffSummary = null,
  onCaptureGhost,
  onClearGhost,
  showTimeSlices = false,
  timeSliceInterval = 0.1,
  onToggleTimeSlices,
  onTimeSliceIntervalChange,
  deepLinkHint,
}) => {
  const [activeStepSize, setActiveStepSize] = useState(stepSize)

  useEffect(() => {
    setActiveStepSize(stepSize)
  }, [stepSize])

  const sortedCriticals = useMemo(() => {
    if (!criticalTimes || criticalTimes.length === 0) return []
    return criticalTimes
      .filter(
        (ct) =>
          ct &&
          Number.isFinite(ct.time) &&
          ct.time >= 0 &&
          (!(maxTime > 0) || ct.time <= maxTime),
      )
      .slice()
      .sort((a, b) => a.time - b.time)
  }, [criticalTimes, maxTime])

  const normalizedStages = useMemo(() => {
    if (!timeStages || timeStages.length === 0 || !(maxTime > 0)) return []
    return timeStages
      .map((s, idx) => ({
        ...s,
        from: Math.max(0, Math.min(maxTime, s.from)),
        to: Math.max(0, Math.min(maxTime, s.to)),
        index: idx,
      }))
      .filter((s) => Number.isFinite(s.from) && Number.isFinite(s.to) && s.to > s.from)
      .sort((a, b) => a.from - b.from)
  }, [timeStages, maxTime])

  const activeStage = useMemo(() => {
    if (normalizedStages.length === 0) return null
    return (
      normalizedStages.find((s) => time >= s.from - 1e-6 && time <= s.to + 1e-6) ??
      normalizedStages[normalizedStages.length - 1]
    )
  }, [normalizedStages, time])

  const percentage = maxTime > 0 ? Math.min(100, Math.max(0, (time / maxTime) * 100)) : 0

  // 根据播放速度确定颜色
  const getSpeedColor = () => {
    if (speed < 1) return colors.secondary[500]
    if (speed > 1) return colors.accent[500]
    return colors.primary[500]
  }

  const speedColor = getSpeedColor()

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTimeChange(parseFloat(e.target.value))
  }

  const jumpToTime = (targetTime: number) => {
    if (isPlaying) onPlayPause()
    const clamped = maxTime > 0 ? Math.min(maxTime, Math.max(0, targetTime)) : Math.max(0, targetTime)
    onTimeChange(clamped)
  }

  const handleStep = (direction: -1 | 1, clampToMax: boolean) => {
    if (isPlaying) onPlayPause()
    const rawNext = time + direction * activeStepSize
    const nextTime = clampToMax ? Math.min(maxTime, Math.max(0, rawNext)) : Math.max(0, rawNext)
    onTimeChange(Number(nextTime.toFixed(3)))
  }

  const cycleStepSize = () => {
    const idx = STEP_SIZE_OPTIONS.indexOf(activeStepSize as (typeof STEP_SIZE_OPTIONS)[number])
    const nextIdx = idx === -1 ? 0 : (idx + 1) % STEP_SIZE_OPTIONS.length
    setActiveStepSize(STEP_SIZE_OPTIONS[nextIdx])
  }

  const cycleStrobeInterval = () => {
    if (!onTimeSliceIntervalChange) return
    const idx = STROBE_INTERVAL_OPTIONS.indexOf(
      timeSliceInterval as (typeof STROBE_INTERVAL_OPTIONS)[number],
    )
    const nextIdx = idx === -1 ? 0 : (idx + 1) % STROBE_INTERVAL_OPTIONS.length
    onTimeSliceIntervalChange(STROBE_INTERVAL_OPTIONS[nextIdx])
  }

  const hasLabTools = Boolean(onToggleTimeSlices || onCaptureGhost)

  const renderLabTools = () => {
    if (!hasLabTools) return null
    return (
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {onToggleTimeSlices && (
          <div className="inline-flex items-center">
            <button
              type="button"
              onClick={onToggleTimeSlices}
              aria-pressed={showTimeSlices}
              title={showTimeSlices ? '关闭频闪等时残影' : '开启频闪等时残影（部分场景支持）'}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              style={
                showTimeSlices
                  ? {
                      backgroundColor: colors.secondary[50],
                      color: colors.secondary[700],
                      borderColor: colors.secondary[300],
                    }
                  : {
                      backgroundColor: colors.neutral[50],
                      color: colors.neutral[600],
                      borderColor: colors.neutral[200],
                    }
              }
            >
              <Layers className="w-3 h-3" />
              <span>频闪</span>
            </button>
            {showTimeSlices && onTimeSliceIntervalChange && (
              <button
                type="button"
                onClick={cycleStrobeInterval}
                title="点击切换频闪采样周期"
                aria-label={`频闪周期 ${timeSliceInterval}s`}
                className="ml-1 px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-secondary-50 text-secondary-700 border border-secondary-200 hover:bg-secondary-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                T={timeSliceInterval}s
              </button>
            )}
          </div>
        )}

        {onCaptureGhost && (
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={onCaptureGhost}
              title={ghostActive ? '点击以当前参数刷新对照组快照' : '锁定当前参数为对照组，改参数后同屏虚影对比'}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              style={
                ghostActive
                  ? {
                      backgroundColor: colors.primary[50],
                      color: colors.primary[700],
                      borderColor: colors.primary[300],
                    }
                  : {
                      backgroundColor: colors.neutral[50],
                      color: colors.neutral[600],
                      borderColor: colors.neutral[200],
                    }
              }
            >
              <Camera className="w-3 h-3" />
              <span>{ghostActive ? '更新对照' : '锁定对照'}</span>
            </button>
            {ghostActive && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 whitespace-nowrap"
                title={ghostDiffSummary ?? '已锁定对照参数，调整左屏参数即可同屏对比'}
              >
                <span>{ghostDiffSummary ? `对照: ${ghostDiffSummary}` : '对照已锁定(调参对比)'}</span>
                {onClearGhost && (
                  <button
                    type="button"
                    onClick={onClearGhost}
                    aria-label="清除对照快照"
                    title="清除对照快照"
                    className="text-neutral-500 hover:text-neutral-800 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── param 型：不渲染底部控制栏 ──
  if (controlsMode === 'param') {
    return null
  }

  // ── pause-only 型：仅暂停/继续按钮（无播放启动、无重置、无速度、无进度条）──
  // 适用场景：动画由左屏开关/交互触发，不需要"播放"启动按钮，但需要暂停分析。
  // 按钮仅在"动画已激活"（播放中或曾播放过 time>0）时显示，
  // 避免未触发交互前出现无效的播放按钮。
  if (controlsMode === 'pause-only') {
    const hasStarted = isPlaying || time > 0
    if (!hasStarted) return null

    return (
      <div className="w-full bg-white rounded-lg shadow-sm border border-neutral-200 px-4 py-2">
        {deepLinkHint && <DeepLinkHintRow hint={deepLinkHint} />}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onPlayPause}
            className="w-9 h-9 rounded-full bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 active:scale-[0.97] flex items-center justify-center transition-all cursor-pointer"
            style={{
              transitionProperty: 'all',
              transitionDuration: `${duration.fast}ms`,
              transitionTimingFunction: 'ease-out',
            }}
            aria-label={isPlaying ? '暂停' : '继续播放'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── loop 型：支持暂停/定格、逐帧微步、重置、当前时刻读数与倍速控制 ──
  if (controlsMode === 'loop') {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm border border-neutral-200 px-4 py-2 space-y-1.5">
        {deepLinkHint && <DeepLinkHintRow hint={deepLinkHint} />}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {enableFrameStep && (
              <button
                type="button"
                onClick={() => handleStep(-1, false)}
                title={`后退 ${activeStepSize}s（逐帧微步）`}
                aria-label={`后退 ${activeStepSize} 秒`}
                className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:scale-[0.95] flex items-center justify-center transition-all cursor-pointer"
              >
                <StepBack className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onPlayPause}
              className="w-9 h-9 rounded-full bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 active:scale-[0.97] flex items-center justify-center transition-all cursor-pointer"
              style={{
                transitionProperty: 'all',
                transitionDuration: `${duration.fast}ms`,
                transitionTimingFunction: 'ease-out',
              }}
              aria-label={isPlaying ? '暂停' : '播放'}
              title={isPlaying ? '暂停当前状态以便观察' : '继续循环演示'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            {enableFrameStep && (
              <button
                type="button"
                onClick={() => handleStep(1, false)}
                title={`前进 ${activeStepSize}s（逐帧微步）`}
                aria-label={`前进 ${activeStepSize} 秒`}
                className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:scale-[0.95] flex items-center justify-center transition-all cursor-pointer"
              >
                <StepForward className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onReset}
              className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] flex items-center justify-center transition-all cursor-pointer"
              style={{
                transitionProperty: 'all',
                transitionDuration: `${duration.fast}ms`,
                transitionTimingFunction: 'ease-out',
              }}
              aria-label="重置"
              title="重置到初始时刻"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {enableFrameStep && (
              <button
                type="button"
                onClick={cycleStepSize}
                title="点击切换逐帧步长：0.01s / 0.02s(50Hz) / 0.05s / 0.1s(计数周期)"
                aria-label={`切换微步步长，当前 ${activeStepSize}s`}
                className="px-2 py-1 rounded text-xs font-mono font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                {activeStepSize}s/步
              </button>
            )}

            {/* 状态徽章 */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 whitespace-nowrap"
              style={{
                backgroundColor: isPlaying ? colors.secondary[100] : colors.neutral[100],
                color: isPlaying ? colors.secondary[700] : colors.neutral[600],
              }}
            >
              {isPlaying ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '2s' }} />
                  <span>循环演示中</span>
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3" />
                  <span>已定格暂停</span>
                </>
              )}
            </div>

            <span className="text-xs font-mono text-neutral-500 tabular-nums whitespace-nowrap px-1">
              t = {time.toFixed(1)}s
            </span>
          </div>

          <SpeedSelector speed={speed} onSpeedChange={onSpeedChange} />
        </div>
        {hasLabTools && (
          <div className="pt-1 border-t border-neutral-100 flex flex-wrap items-center justify-end gap-2">
            {renderLabTools()}
          </div>
        )}
      </div>
    )
  }

  const prevCritical = [...sortedCriticals].reverse().find((ct) => ct.time < time - CRITICAL_MATCH_EPSILON)
  const nextCritical = sortedCriticals.find((ct) => ct.time > time + CRITICAL_MATCH_EPSILON)

  // ── timed 型：完整控制栏（默认）──
  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-neutral-200 px-4 py-2 space-y-2">
      {deepLinkHint && <DeepLinkHintRow hint={deepLinkHint} />}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 shrink-0">
          {enableFrameStep && (
            <button
              type="button"
              onClick={() => handleStep(-1, true)}
              title={`后退 ${activeStepSize}s（逐帧微步）`}
              aria-label={`后退 ${activeStepSize} 秒`}
              className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:scale-[0.95] flex items-center justify-center transition-all cursor-pointer"
            >
              <StepBack className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onPlayPause}
            className="w-9 h-9 rounded-full bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 active:scale-[0.97] flex items-center justify-center transition-all cursor-pointer"
            style={{
              transitionProperty: 'all',
              transitionDuration: `${duration.fast}ms`,
              transitionTimingFunction: 'ease-out',
            }}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {enableFrameStep && (
            <button
              type="button"
              onClick={() => handleStep(1, true)}
              title={`前进 ${activeStepSize}s（逐帧微步）`}
              aria-label={`前进 ${activeStepSize} 秒`}
              className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:scale-[0.95] flex items-center justify-center transition-all cursor-pointer"
            >
              <StepForward className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] flex items-center justify-center transition-all cursor-pointer"
            style={{
              transitionProperty: 'all',
              transitionDuration: `${duration.fast}ms`,
              transitionTimingFunction: 'ease-out',
            }}
            aria-label="重置"
            title="重置到 0.00s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {enableFrameStep && (
            <button
              type="button"
              onClick={cycleStepSize}
              title="点击切换逐帧步长：0.01s 精细网格 / 0.02s 打点周期(50Hz) / 0.05s 标准微步 / 0.1s 计数点周期"
              aria-label={`切换微步步长，当前 ${activeStepSize}s`}
              className="px-2 py-1 rounded text-xs font-mono font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              {activeStepSize}s/步
            </button>
          )}

          {onToggleRepeatLoop && (
            <button
              type="button"
              onClick={onToggleRepeatLoop}
              aria-pressed={repeatLoop}
              aria-label={repeatLoop ? '关闭循环重播' : '开启循环重播'}
              title={repeatLoop ? '循环播放中（到终点自动重播）' : '单次播放（到终点暂停）'}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer border"
              style={
                repeatLoop
                  ? {
                      backgroundColor: colors.primary[50],
                      color: colors.primary[700],
                      borderColor: colors.primary[300],
                    }
                  : {
                      backgroundColor: colors.neutral[50],
                      color: colors.neutral[600],
                      borderColor: colors.neutral[200],
                    }
              }
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>循环</span>
            </button>
          )}
        </div>

        <SpeedSelector speed={speed} onSpeedChange={onSpeedChange} />

        <div className="flex-1 min-w-[180px] flex items-center gap-2.5">
          {speed !== 1 && (
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap shrink-0"
              style={{
                color: speedColor,
                backgroundColor: `${speedColor}22`,
              }}
            >
              {speed}x
            </span>
          )}
          <span className="text-sm font-mono text-neutral-700 min-w-[46px] tabular-nums">
            {time.toFixed(2)}s
          </span>
          <div className="flex-1 relative h-2 bg-neutral-200 rounded-full flex items-center">
            {/* 物理过程阶段分段底色 */}
            {normalizedStages.length > 0 && (
              <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                {normalizedStages.map((stage) => {
                  const leftPct = (stage.from / maxTime) * 100
                  const widthPct = ((stage.to - stage.from) / maxTime) * 100
                  const palette = getStagePalette(stage.variant, stage.index)
                  return (
                    <div
                      key={`${stage.label}-${stage.index}`}
                      className="absolute top-0 bottom-0 border-r border-white/80 last:border-r-0"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: palette.trackBg,
                      }}
                    />
                  )
                })}
              </div>
            )}

            {/* 临界时刻刻度标记 */}
            {sortedCriticals.length > 0 && maxTime > 0 && (
              <div className="absolute inset-x-0 -top-2.5 h-2 pointer-events-none z-20">
                {sortedCriticals.map((ct, idx) => {
                  const pct = Math.min(100, Math.max(0, (ct.time / maxTime) * 100))
                  const palette = getCriticalPalette(ct.variant)
                  return (
                    <button
                      key={`${ct.time}-${idx}`}
                      type="button"
                      title={`临界点：${ct.label} (${ct.time.toFixed(2)}s)`}
                      aria-label={`跳至临界点 ${ct.label}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        jumpToTime(ct.time)
                      }}
                      style={{ left: `${pct}%`, backgroundColor: palette.dot }}
                      className="pointer-events-auto absolute top-0 -translate-x-1/2 w-3 h-3 rounded-full hover:scale-125 border-2 border-white shadow transition-all cursor-pointer"
                    />
                  )
                })}
              </div>
            )}
            <input
              type="range"
              min={0}
              max={maxTime}
              step={0.01}
              value={time}
              onChange={handleSliderChange}
              aria-label="播放进度"
              className="peer absolute -inset-y-2 left-0 w-full h-6 opacity-0 cursor-pointer z-10"
            />
            <div
              className="absolute left-0 top-0 h-full rounded-full pointer-events-none transition-all duration-150"
              style={{
                width: `${percentage}%`,
                backgroundColor: speedColor,
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-sm pointer-events-none transition-all duration-150 peer-hover:scale-115 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300 peer-focus-visible:ring-offset-1 peer-active:scale-95"
              style={{
                left: `calc(${percentage}% - 8px)`,
                borderColor: speedColor,
                borderWidth: '2px',
                borderStyle: 'solid',
              }}
            />
          </div>
          <span className="text-sm font-mono text-neutral-500 min-w-[40px] tabular-nums">
            {maxTime.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* 物理过程阶段 + 临界时刻快捷芯片 + 教学实验工具条 */}
      {(sortedCriticals.length > 0 || normalizedStages.length > 0 || hasLabTools) && (
        <div className="pt-1.5 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
            {normalizedStages.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {normalizedStages.map((stage) => {
                  const isCurrent = activeStage?.index === stage.index
                  const palette = getStagePalette(stage.variant, stage.index)
                  return (
                    <button
                      key={`stage-chip-${stage.label}-${stage.index}`}
                      type="button"
                      onClick={() => jumpToTime(stage.from)}
                      title={`跳至阶段起点：${stage.label} (${stage.from.toFixed(2)}s–${stage.to.toFixed(2)}s)`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap shrink-0 cursor-pointer transition-all"
                      style={
                        isCurrent
                          ? {
                              backgroundColor: palette.chipBg,
                              color: palette.chipText,
                              borderColor: palette.chipBorder,
                              fontWeight: 600,
                            }
                          : {
                              backgroundColor: colors.neutral[50],
                              color: colors.neutral[500],
                              borderColor: colors.neutral[200],
                            }
                      }
                    >
                      <span>{stage.label}</span>
                      <span className="font-mono opacity-80">
                        {stage.from.toFixed(1)}–{stage.to.toFixed(1)}s
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {sortedCriticals.length > 0 && (
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={!prevCritical}
                    onClick={() => prevCritical && jumpToTime(prevCritical.time)}
                    title={prevCritical ? `上一关键点：${prevCritical.label} (${prevCritical.time.toFixed(2)}s)` : '已是首个关键点前'}
                    aria-label="上一关键点"
                    className="w-6 h-6 rounded border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!nextCritical}
                    onClick={() => nextCritical && jumpToTime(nextCritical.time)}
                    title={nextCritical ? `下一关键点：${nextCritical.label} (${nextCritical.time.toFixed(2)}s)` : '已过最后一个关键点'}
                    aria-label="下一关键点"
                    className="w-6 h-6 rounded border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto py-0.5">
                  {sortedCriticals.map((ct, idx) => {
                    const isActive = Math.abs(time - ct.time) <= CRITICAL_MATCH_EPSILON
                    const palette = getCriticalPalette(ct.variant)
                    return (
                      <button
                        key={`${ct.time}-${idx}`}
                        type="button"
                        onClick={() => jumpToTime(ct.time)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap shrink-0 transition-all cursor-pointer active:scale-[0.97]"
                        style={
                          isActive
                            ? {
                                backgroundColor: palette.activeBg,
                                color: colors.neutral.white,
                                borderColor: palette.activeBg,
                              }
                            : {
                                backgroundColor: palette.chipBg,
                                color: palette.chipText,
                                borderColor: palette.chipBorder,
                              }
                        }
                      >
                        <span>{ct.label}</span>
                        <span className="font-mono opacity-85">{ct.time.toFixed(2)}s</span>
                      </button>
                    )
                  })}
                </div>

                {onToggleAutoPauseCritical && (
                  <button
                    type="button"
                    onClick={onToggleAutoPauseCritical}
                    aria-pressed={autoPauseCritical}
                    title={autoPauseCritical ? '已开启：播放经过关键点时自动暂停定格' : '已关闭：连续播放不停靠关键点'}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                    style={
                      autoPauseCritical
                        ? {
                            backgroundColor: colors.accent[50],
                            color: colors.accent[700],
                            borderColor: colors.accent[300],
                          }
                        : {
                            backgroundColor: colors.neutral[50],
                            color: colors.neutral[500],
                            borderColor: colors.neutral[200],
                          }
                    }
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>遇临界暂停</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {renderLabTools()}
        </div>
      )}
    </div>
  )
}
