import type { SidebarExtraProps } from '@/data/types'
import { useAnimationStore } from '@/stores'

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

/** 按钮选中/未选中 className */
function btnCls(selected: boolean): string {
  return `px-3 py-1.5 text-xs rounded-md transition-all active:scale-95 ${
    selected
      ? 'bg-primary-100 text-primary-700 border border-primary-300'
      : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
  }`
}

export default function FreeFallSidebar({
  params,
  updateParam,
  showTimeSlices,
  toggleTimeSlices,
  showDualObjects: _showDualObjects,
  toggleDualObjects: _toggleDualObjects,
  disabled,
}: SidebarExtraProps) {
  const { setTime, setIsPlaying } = useAnimationStore()
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  const toggleAdvanced = () => {
    updateParam('advancedMode', isAdvanced ? 0 : 1)
    setTime(0)
    setIsPlaying(false)
  }

  return (
    <>
      {/* ═══════ 基础模式：牛顿管实验 ═══════ */}
      {!isAdvanced && (
        <>
          {/* 1. 管内气压 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-600">管内气压</span>
              <span className="font-mono text-neutral-700">
                {(params.pressure ?? 1).toFixed(2)} atm（{pressureLabel(params.pressure ?? 1)}）
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={params.pressure ?? 1}
              onChange={(e) => updateParam('pressure', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
              <span>真空</span>
              <span>标准大气压</span>
            </div>
          </div>

          {/* 2. 物体A材质 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <p className="text-xs font-semibold text-neutral-600 mb-2">物体A</p>
            <div className="flex gap-2 flex-wrap">
              {OBJECT_A_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateParam('objectA', opt.value)}
                  disabled={disabled}
                  className={btnCls((params.objectA ?? 0) === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 物体B材质 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <p className="text-xs font-semibold text-neutral-600 mb-2">物体B</p>
            <div className="flex gap-2 flex-wrap">
              {OBJECT_B_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateParam('objectB', opt.value)}
                  disabled={disabled}
                  className={btnCls((params.objectB ?? 0) === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. 环境重力场 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <p className="text-xs font-semibold text-neutral-600 mb-2">环境重力场</p>
            <div className="flex gap-2 flex-wrap">
              {GRAVITY_PRESETS.map((preset) => (
                <button
                  key={preset.g}
                  onClick={() => updateParam('g', preset.g)}
                  disabled={disabled}
                  className={btnCls(params.g === preset.g)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. 时间切片 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <button
              onClick={toggleTimeSlices}
              disabled={disabled}
              className={`w-full py-2 rounded-md text-sm font-medium transition-all ${
                showTimeSlices
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {showTimeSlices ? '隐藏' : '显示'} 1:3:5:7 时间切片
            </button>
          </div>
        </>
      )}

      {/* ═══════ 进阶模式：滴水法测g ═══════ */}
      {isAdvanced && (
        <>
          {/* 1. 滴水周期 T */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-600">滴水周期 T</span>
              <span className="font-mono text-neutral-700">{(params.dripPeriod ?? 0.5).toFixed(1)} s</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={2}
              step={0.1}
              value={params.dripPeriod ?? 0.5}
              onChange={(e) => updateParam('dripPeriod', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
            />
          </div>

          {/* 2. 纬度 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-600">纬度</span>
              <span className="font-mono text-neutral-700">{params.latitude ?? 45}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={90}
              step={1}
              value={params.latitude ?? 45}
              onChange={(e) => updateParam('latitude', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
            />
          </div>

          {/* 3. 海拔 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-600">海拔</span>
              <span className="font-mono text-neutral-700">{(params.altitude ?? 0).toFixed(1)} km</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={params.altitude ?? 0}
              onChange={(e) => updateParam('altitude', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
            />
          </div>

          {/* 4. 当前 g 值（只读，由纬度+海拔自动计算） */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-600">重力加速度 g</span>
              <span className="font-mono text-primary-700 font-semibold">{(params.g ?? 9.8).toFixed(3)} m/s²</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">由纬度和海拔自动计算</p>
          </div>

          {/* 5. 时间切片 */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <button
              onClick={toggleTimeSlices}
              disabled={disabled}
              className={`w-full py-2 rounded-md text-sm font-medium transition-all ${
                showTimeSlices
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {showTimeSlices ? '隐藏' : '显示'} 1:3:5:7 时间切片
            </button>
          </div>
        </>
      )}

      {/* ═══════ 模式切换按钮 ═══════ */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <button
          onClick={toggleAdvanced}
          disabled={disabled}
          className={[
            'w-full px-3 py-2 rounded-lg text-sm font-medium transition-all',
            isAdvanced
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
            disabled && 'opacity-40 pointer-events-none',
          ].join(' ')}
        >
          {isAdvanced ? '✓ 滴水法测g' : '滴水法测g'}
        </button>
      </div>
    </>
  )
}
