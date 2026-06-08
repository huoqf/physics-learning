import { SegmentedControl, OptionButton, TipCard } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

/**
 * 加速度动画侧边栏扩展
 *
 * 基础版：Δt 三档切换 + 经典对比快捷按钮
 * 进阶版：负加速度实验快捷按钮
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
    animationActions.resetAnimation()
  }

  // ── 进阶版：转向点验证快捷 ──
  const handleTurnPointVerify = () => {
    updateParam('v0', 12)
    updateParam('a', -3)
    updateParam('motionMode', 0)
    animationActions.resetAnimation()
  }

  // ── 进阶版：变加速探究快捷 ──
  const handleVariableAccel = () => {
    updateParam('v0', 0)
    updateParam('a', 4)
    updateParam('motionMode', 1)
    animationActions.resetAnimation()
  }

  // ── 模式切换 ──
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
            label="经典对比：v_A=300, a_B=10"
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
          试试把初速度或加速度设为负值，观察运动状态的变化
        </TipCard>
      )}

      {/* ── 进阶版：教学快捷操作 ── */}
      {isAdvanced && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <p className="text-xs font-semibold text-neutral-600 mb-2">教学快捷操作</p>
          <div className="flex flex-col gap-2">
            <OptionButton
              label="转向点验证：v₀=12, a=-3"
              variant="danger"
              disabled={disabled}
              onClick={handleTurnPointVerify}
            />
            <OptionButton
              label="变加速探究：v₀=0, a₀=4, 变加速"
              variant="preset"
              disabled={disabled}
              onClick={handleVariableAccel}
            />
          </div>
          <TipCard variant="info" className="mt-2">
            验证 v=0 时 a≠0 转向点特征，或观察变加速运动斜率直角三角形的连续变扁过程。
          </TipCard>
        </div>
      )}
    </>
  )
}
