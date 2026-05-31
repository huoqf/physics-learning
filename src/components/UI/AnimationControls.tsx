import React from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { colors } from '@/theme/colors'
import { duration } from '@/theme/motion'

interface AnimationControlsProps {
  isPlaying: boolean
  speed: number
  time: number
  maxTime: number
  onPlayPause: () => void
  onReset: () => void
  onSpeedChange: (speed: number) => void
  onTimeChange: (time: number) => void
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
}) => {
  const speedOptions = [0.25, 0.5, 1, 2]
  const percentage = maxTime > 0 ? (time / maxTime) * 100 : 0

  // 根据播放速度确定进度条颜色
  const getProgressBarColor = () => {
    if (speed < 1) return colors.secondary[400]
    if (speed > 1) return colors.accent[500]
    return colors.primary[500]
  }

  const progressBarColor = getProgressBarColor()

  const getHandleColor = () => {
    if (speed < 1) return colors.secondary[400]
    if (speed > 1) return colors.accent[500]
    return colors.primary[500]
  }

  const handleColor = getHandleColor()

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTimeChange(parseFloat(e.target.value))
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onPlayPause}
            className="w-10 h-10 rounded-full bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 active:scale-[0.97] flex items-center justify-center transition-all"
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

          <button
            onClick={onReset}
            className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300 active:scale-[0.97] flex items-center justify-center transition-all"
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
          <span className="text-neutral-600 min-w-[60px]">速度：</span>
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

        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{
            color: progressBarColor,
            backgroundColor: `${progressBarColor}22`
          }}>
            {speed}x
          </span>
          <span className="text-sm text-neutral-600 min-w-[40px]">
            {time.toFixed(1)}s
          </span>
          <div className="flex-1 relative h-2 bg-neutral-200 rounded-full">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all"
              style={{
                width: `${percentage}%`,
                backgroundColor: progressBarColor,
                transitionProperty: 'all',
                transitionDuration: `${duration.fast}ms`,
                transitionTimingFunction: 'ease-out',
              }}
            />
            <input
              type="range"
              min={0}
              max={maxTime}
              step={0.1}
              value={time}
              onChange={handleSliderChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-sm transition-all"
              style={{
                left: `calc(${percentage}% - 8px)`,
                borderColor: handleColor,
                borderWidth: '2px',
                borderStyle: 'solid',
                transitionProperty: 'all',
                transitionDuration: `${duration.fast}ms`,
                transitionTimingFunction: 'ease-out',
              }}
            />
          </div>
          <span className="text-sm text-neutral-600 min-w-[40px]">
            {maxTime.toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  )
}

export default AnimationControls
