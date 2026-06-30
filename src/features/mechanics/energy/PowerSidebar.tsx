import type { FC } from 'react'
import { SegmentedControl, Button } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

interface Preset {
  name: string
  icon: string
  P: number
  m: number
  f: number
  a: number
  carType: number
}

const PRESETS: Preset[] = [
  { name: '超跑起动', icon: '🏎️', P: 120000, m: 1500, f: 2000, a: 3.0, carType: 1 },
  { name: '重卡满载', icon: '🚛', P: 160000, m: 8000, f: 4000, a: 0.8, carType: 2 },
  { name: '雪地起动', icon: '❄️', P: 60000, m: 2000, f: 1000, a: 1.0, carType: 0 },
  { name: '爬坡起动', icon: '⛰️', P: 80000, m: 2000, f: 5000, a: 1.2, carType: 0 },
]

/**
 * 功率侧边栏扩展 — 模式切换与教学预设
 *
 * 物理量看板、公式、高考要点由右侧 PhysicsPanel 展示
 */
const PowerSidebar: FC<SidebarExtraProps> = ({
  params,
  updateParam,
  animationActions,
  disabled,
}) => {
  const mode = params.mode ?? 0

  const handleModeChange = (value: number | string) => {
    const nextMode = value as number
    updateParam('mode', nextMode)
    // 切换到普通模式时，需要将 f 重置到安全初始值（与 paramMeta 的 defaultParams 对齐），且重置 carType 为 0
    if (nextMode === 0) {
      updateParam('f', 2000)
      updateParam('carType', 0)
    }
    animationActions.resetAnimation()
  }

  const applyPreset = (preset: Preset) => {
    updateParam('P', preset.P)
    updateParam('m', preset.m)
    updateParam('f', preset.f)
    updateParam('a', preset.a)
    updateParam('carType', preset.carType)
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      <SegmentedControl
        label="起动模型"
        options={[
          { value: 0, label: '恒定功率' },
          { value: 1, label: '恒定加速度' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />
      
      <p className="text-ui-base text-neutral-400 leading-tight">
        {mode === 0
          ? '汽车以额定功率 P 起动，牵引力 F=P/v 随速度增大而减小，加速度逐渐降为零。'
          : '先匀加速（F 恒定），当功率达到额定值后切换为恒功率变加速，直至匀速。'}
      </p>

      {mode === 1 && (
        <div className="flex flex-col gap-2 mt-2">
          <h4 className="text-xs font-semibold text-neutral-700">高考经典预设</h4>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => applyPreset(preset)}
                className="flex items-center gap-1 justify-start font-normal"
              >
                <span>{preset.icon}</span>
                <span>{preset.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default PowerSidebar
