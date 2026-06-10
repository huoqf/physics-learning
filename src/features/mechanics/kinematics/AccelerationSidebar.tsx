import { SegmentedControl, OptionButton, TipCard } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

/**
 * 加速度动画侧边栏扩展
 *
 * 基础版：Δt 三档切换 + 经典对比快捷按钮
 * 进阶版：警车追击问题参数控制
 */
export default function AccelerationSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  // ── 基础版：Δt 三档选项 ──
  const deltaTSteps = [
    { label: '1.0s', value: 1.0 },
    { label: '0.5s', value: 0.5 },
    { label: '0.1s', value: 0.1 },
  ]

  // ── 基础版：经典对比快捷按钮 ──
  const handleClassicCompare = () => {
    updateParam('vA', 300)
    updateParam('aB', 10)
    animationActions.restartAnimation()
  }

  // ── 进阶版：高速追击快捷 ──
  const handleHighSpeedChase = () => {
    updateParam('vA', 40)
    updateParam('deltaX0', 100)
    updateParam('t0', 1.5)
    updateParam('aB', 4)
    updateParam('vMax', 50)
    animationActions.restartAnimation()
  }

  // ── 进阶版：近距离反应快捷 ──
  const handleCloseReaction = () => {
    updateParam('vA', 20)
    updateParam('deltaX0', 30)
    updateParam('t0', 0.5)
    updateParam('aB', 5)
    updateParam('vMax', 40)
    animationActions.restartAnimation()
  }

  // ── 进阶版：极限加速快捷 ──
  const handleMaxAccel = () => {
    updateParam('vA', 35)
    updateParam('deltaX0', 80)
    updateParam('t0', 2)
    updateParam('aB', 7)
    updateParam('vMax', 55)
    animationActions.restartAnimation()
  }

  // ── 观察模式切换 ──
  const handleModeChange = (value: number | string) => {
    updateParam('advancedMode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <>
      {/* ── 基础版：Δt 三档切换 ── */}
      {!isAdvanced && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <p className="text-xs font-semibold text-neutral-600 mb-2">观测时间微元 Δt</p>
          <div className="grid grid-cols-3 gap-2">
            {deltaTSteps.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={Math.abs((params.deltaT ?? 1) - opt.value) < 0.001}
                disabled={disabled}
                onClick={() => updateParam('deltaT', opt.value)}
              />
            ))}
          </div>
          <TipCard variant="info" className="mt-2">
            调小 Δt 观察速度变化的精细程度
          </TipCard>
        </div>
      )}

      {/* ── 基础版：经典对比快捷按钮 ── */}
      {!isAdvanced && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <p className="text-xs font-semibold text-neutral-600 mb-2">教学快捷操作</p>
          <OptionButton
            label="经典对比：vₐ=300, aᵦ=10"
            variant="preset"
            disabled={disabled}
            onClick={handleClassicCompare}
          />
          <TipCard variant="info" className="mt-2">
            飞机速度极大但 Δv=0，跑车从静止但 Δv 不断增长
          </TipCard>
        </div>
      )}

      {/* ── 观察模式切换 ── */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="观察模式"
          options={[
            { label: '基础', value: 0 },
            { label: '进阶', value: 1 },
          ]}
          value={advancedMode}
          onChange={handleModeChange}
          disabled={disabled}
        />
      </div>

      {/* ── 进阶版：轻量提示 ── */}
      {isAdvanced && (
        <TipCard variant="info" className="mt-3">
          调整反应时间和加速度，观察共速时刻与最大间距的关系
        </TipCard>
      )}

      {/* ── 进阶版：教学快捷操作 ── */}
      {isAdvanced && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <p className="text-xs font-semibold text-neutral-600 mb-2">教学快捷操作</p>
          <div className="flex flex-col gap-2">
            <OptionButton
              label="高速追击：vₐ=40, Δx₀=100"
              variant="preset"
              disabled={disabled}
              onClick={handleHighSpeedChase}
            />
            <OptionButton
              label="近距离反应：vₐ=20, Δx₀=30"
              variant="danger"
              disabled={disabled}
              onClick={handleCloseReaction}
            />
            <OptionButton
              label="极限加速：aᵦ=7, vₘₐₓ=55"
              variant="preset"
              disabled={disabled}
              onClick={handleMaxAccel}
            />
          </div>
          <TipCard variant="info" className="mt-2">
            观察 v-t 图阴影面积与 x-t 图线间距的几何对应关系
          </TipCard>
        </div>
      )}
    </>
  )
}
