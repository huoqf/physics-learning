import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, OptionButton, ToggleSwitch, TipCard, Slider } from '@/components/UI'

/** 重力场预设 */
const GRAVITY_PRESETS = [
  { label: '🌍 地球', g: 9.8 },
  { label: '🌙 月球', g: 1.63 },
  { label: '🔴 火星', g: 3.72 },
  { label: '🪐 木星', g: 24.79 },
] as const

/** 物体A选项 */
const OBJECT_A_OPTIONS = [
  { value: 0, label: '铁球' },
  { value: 1, label: '硬币' },
] as const

/** 物体B选项 */
const OBJECT_B_OPTIONS = [
  { value: 0, label: '羽毛' },
  { value: 1, label: '纸片' },
] as const

/** 气压语义标签 */
function pressureLabel(p: number): string {
  if (p <= 0.01) return '真空'
  if (p >= 0.99) return '标准大气压'
  return `${p.toFixed(2)} atm`
}

export default function FreeFallSidebar({
  params,
  updateParam,
  animationActions,
  showTimeSlices = false,
  toggleTimeSlices = () => {},
  showDualObjects: _showDualObjects,
  toggleDualObjects: _toggleDualObjects,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  // ── 模式切换 ──
  const handleModeChange = (value: number | string) => {
    updateParam('advancedMode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <>
      {/* ═══════ 基础模式：牛顿管实验 ═══════ */}
      {!isAdvanced && (
        <>
          {/* 1. 管内气压 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <Slider
              label="管内气压"
              value={params.pressure ?? 1}
              min={0}
              max={1}
              step={0.01}
              unit="atm"
              description={pressureLabel(params.pressure ?? 1)}
              onChange={(v) => updateParam('pressure', v)}
              disabled={disabled}
            />
          </div>

          {/* 2. 物体A材质 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <p className="text-xs font-semibold text-neutral-600 mb-2">物体A</p>
            <div className="flex gap-2 flex-wrap">
              {OBJECT_A_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={(params.objectA ?? 0) === opt.value}
                  disabled={disabled}
                  onClick={() => updateParam('objectA', opt.value)}
                />
              ))}
            </div>
          </div>

          {/* 3. 物体B材质 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <p className="text-xs font-semibold text-neutral-600 mb-2">物体B</p>
            <div className="flex gap-2 flex-wrap">
              {OBJECT_B_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={(params.objectB ?? 0) === opt.value}
                  disabled={disabled}
                  onClick={() => updateParam('objectB', opt.value)}
                />
              ))}
            </div>
          </div>

          {/* 4. 环境重力场 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <p className="text-xs font-semibold text-neutral-600 mb-2">环境重力场</p>
            <div className="flex gap-2 flex-wrap">
              {GRAVITY_PRESETS.map((preset) => (
                <OptionButton
                  key={preset.g}
                  label={preset.label}
                  selected={params.g === preset.g}
                  disabled={disabled}
                  onClick={() => updateParam('g', preset.g)}
                />
              ))}
            </div>
          </div>

          {/* 5. 时间切片 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <ToggleSwitch
              checked={showTimeSlices}
              onChange={toggleTimeSlices}
              disabled={disabled}
              label="显示 1:3:5:7 时间切片"
            />
          </div>
        </>
      )}

      {/* ═══════ 进阶模式：滴水法测g ═══════ */}
      {isAdvanced && (
        <>
          {/* 1. 滴水周期 T */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <Slider
              label="滴水周期 T"
              value={params.dripPeriod ?? 0.5}
              min={0.2}
              max={2}
              step={0.1}
              unit="s"
              onChange={(v) => updateParam('dripPeriod', v)}
              disabled={disabled}
            />
          </div>

          {/* 2. 纬度 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <Slider
              label="纬度"
              value={params.latitude ?? 45}
              min={0}
              max={90}
              step={1}
              unit="°"
              onChange={(v) => updateParam('latitude', v)}
              disabled={disabled}
            />
          </div>

          {/* 3. 海拔 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <Slider
              label="海拔"
              value={params.altitude ?? 0}
              min={0}
              max={10}
              step={0.1}
              unit="km"
              onChange={(v) => updateParam('altitude', v)}
              disabled={disabled}
            />
          </div>

          {/* 4. 当前 g 值（只读，由纬度+海拔自动计算） */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-600">重力加速度 g</span>
              <span className="font-mono text-neutral-500 italic">{(params.g ?? 9.8).toFixed(3)} m/s²</span>
            </div>
            <TipCard variant="info" className="mt-1">
              由纬度和海拔自动计算
            </TipCard>
          </div>

          {/* 5. 时间切片 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <ToggleSwitch
              checked={showTimeSlices}
              onChange={toggleTimeSlices}
              disabled={disabled}
              label="显示 1:3:5:7 时间切片"
            />
          </div>
        </>
      )}

      {/* ═══════ 模式切换 ═══════ */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="观察模式"
          options={[
            { label: '牛顿管实验', value: 0 },
            { label: '滴水法测g', value: 1 },
          ]}
          value={advancedMode}
          onChange={handleModeChange}
          disabled={disabled}
        />
      </div>
    </>
  )
}
