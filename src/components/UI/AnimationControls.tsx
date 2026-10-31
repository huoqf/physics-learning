import React from 'react'
import { Play, Pause, RotateCcw, RefreshCw, StepBack, StepForward, Pin } from 'lucide-react'
import { colors } from '@/theme/colors'
import { duration } from '@/theme/motion'
import type { CriticalTimePoint } from '@/data/types'
import type { DeepLinkFreezeHint } from '@/utils/animationDeepLink'

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
  /** 是否开启微步逐帧分析按钮，默认 true */
  enableFrameStep?: boolean
  /** 微步步进大小（秒），默认 0.05s */
  stepSize?: number
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
  enableFrameStep = false,
  stepSize = 0.05,
  deepLinkHint,
}) => {
  const speedOptions = [0.25, 0.5, 1, 2]
  const percentage = maxTime > 0 ? (time / maxTime) * 100 : 0

  // 根据播放速度确定颜色
  const getSpeedColor = () => {
    if (speed < 1) return colors.secondary[400]
    if (speed > 1) return colors.accent[500]
    return colors.primary[500]
  }

  const speedColor = getSpeedColor()

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTimeChange(parseFloat(e.target.value))
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
            onClick={onPlayPause}
            className="w-9 h-9 rounded-full bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 active:scale-[0.97] flex items-center justify-center transition-all"
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

  // ── loop 型：仅速度选择器 + 徽章 ──
  if (controlsMode === 'loop') {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm border border-neutral-200 px-4 py-2">
        <div className="flex items-center gap-4">
          {/* 循环运行中徽章 */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
            style={{ backgroundColor: `${colors.secondary[100]}`, color: colors.secondary[700] }}
          >
            <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '2s' }} />
            循环运行中
          </div>

          {/* 速度选择器 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-600 min-w-[30px]">速度：</span>
            <div className="flex gap-1">
              {speedOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={[
                    'px-3 py-1 rounded text-sm font-medium active:scale-[0.97] transition-all',
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
        </div>
      </div>
    )
  }

  const handleStep = (direction: -1 | 1) => {
    if (isPlaying) onPlayPause()
    const nextTime = Math.min(maxTime, Math.max(0, time + direction * stepSize))
    onTimeChange(Number(nextTime.toFixed(3)))
  }

  // ── timed 型：完整控制栏（默认）──
  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-neutral-200 px-4 py-2">
      {deepLinkHint && <DeepLinkHintRow hint={deepLinkHint} />}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {enableFrameStep && (
            <button
              onClick={() => handleStep(-1)}
              title={`后退 ${stepSize}s (微步逐帧)`}
              className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:scale-[0.95] flex items-center justify-center transition-all"
            >
              <StepBack className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onPlayPause}
            className="w-9 h-9 rounded-full bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 active:scale-[0.97] flex items-center justify-center transition-all"
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
              onClick={() => handleStep(1)}
              title={`前进 ${stepSize}s (微步逐帧)`}
              className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:scale-[0.95] flex items-center justify-center transition-all"
            >
              <StepForward className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onReset}
            className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] flex items-center justify-center transition-all"
            style={{
              transitionProperty: 'all',
              transitionDuration: `${duration.fast}ms`,
              transitionTimingFunction: 'ease-out',
            }}
            aria-label="重置"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-600 min-w-[50px]">速度：</span>
          <div className="flex gap-1">
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={[
                  'px-2.5 py-1 rounded text-xs font-medium active:scale-[0.97] transition-all',
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

        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{
            color: speedColor,
            backgroundColor: `${speedColor}22`
          }}>
            {speed}x
          </span>
          <span className="text-sm font-mono text-neutral-700 min-w-[45px]">
            {time.toFixed(2)}s
          </span>
          <div className="flex-1 relative h-2 bg-neutral-200 rounded-full flex items-center">
            {/* 临界时刻刻度标记 */}
            {criticalTimes && criticalTimes.length > 0 && (
              <div className="absolute inset-x-0 -top-2.5 h-2 pointer-events-none z-20">
                {criticalTimes.map((ct, idx) => {
                  const pct = Math.min(100, Math.max(0, (ct.time / maxTime) * 100))
                  return (
                    <button
                      key={idx}
                      type="button"
                      title={`⚡ 临界点: ${ct.label} (${ct.time.toFixed(2)}s)`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isPlaying) onPlayPause()
                        onTimeChange(ct.time)
                      }}
                      style={{ left: `${pct}%` }}
                      className="pointer-events-auto absolute top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 hover:scale-125 border-2 border-white shadow transition-all cursor-pointer"
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
          <span className="text-sm font-mono text-neutral-500 min-w-[40px]">
            {maxTime.toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  )
}
