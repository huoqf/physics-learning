import type { SidebarExtraProps } from '@/data/types'
import { Card, Slider, TipCard, OptionButton } from '@/components/UI'
import {
  FORCE_MOTION_MODES,
  FORCE_MOTION_PARAM_CONFIGS,
} from './forceMotionLayout'
import { getForceMotionDefaultEnv } from '@/physics'

export default function ForceMotionSidebar({
  params,
  updateParam,
  setParams,
  animationActions,
  disabled = false,
}: SidebarExtraProps) {
  const modeIndex = Math.round(params.mode ?? 0)
  const paramConfigs = FORCE_MOTION_PARAM_CONFIGS[modeIndex] ?? FORCE_MOTION_PARAM_CONFIGS[0]

  const handleModeChange = (nextMode: number) => {
    if (disabled || nextMode === modeIndex) return

    // 构建新模式的默认参数
    const newParams: Record<string, number> = { mode: nextMode }
    const newConfigs = FORCE_MOTION_PARAM_CONFIGS[nextMode] ?? FORCE_MOTION_PARAM_CONFIGS[0]
    newConfigs.forEach((cfg) => {
      newParams[cfg.key] = cfg.defaultValue
    })
    // 环境参数默认值
    newParams.env1 = getForceMotionDefaultEnv(nextMode)

    setParams(newParams)
    animationActions.resetAnimation()
  }

  const handleParamChange = (key: string, value: number) => {
    updateParam(key, value)
    animationActions.pauseAnimation()
  }

  const currentMode = FORCE_MOTION_MODES[modeIndex]

  return (
    <div className="space-y-3">
      {/* 模式选择 */}
      <Card className="p-3">
        <h3 className="text-xs font-semibold text-neutral-600 mb-2">运动模式选择</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {FORCE_MOTION_MODES.map((mode) => (
            <OptionButton
              key={mode.value}
              label={`${mode.value + 1}. ${mode.label}`}
              selected={mode.value === modeIndex}
              disabled={disabled}
              onClick={() => handleModeChange(mode.value)}
            />
          ))}
        </div>
        {currentMode && (
          <div className="mt-2 text-ui-md text-neutral-500 pt-2 border-t border-neutral-100">
            {currentMode.description}
          </div>
        )}
      </Card>

      {/* 参数调节 */}
      <Card className="p-3 space-y-3">
        <h3 className="text-xs font-semibold text-neutral-600">参数调节</h3>
        {paramConfigs.map((cfg) => (
          <Slider
            key={cfg.key}
            label={cfg.label}
            value={params[cfg.key] ?? cfg.defaultValue}
            min={cfg.min}
            max={cfg.max}
            step={cfg.step}
            unit={cfg.unit}
            disabled={disabled}
            onChange={(value) => handleParamChange(cfg.key, value)}
          />
        ))}
      </Card>

      {/* 播放控制提示 */}
      <TipCard variant="info">
        选择模式后调节参数，点击播放观察小球运动、矢量箭头与三图表同步变化。
      </TipCard>
    </div>
  )
}
