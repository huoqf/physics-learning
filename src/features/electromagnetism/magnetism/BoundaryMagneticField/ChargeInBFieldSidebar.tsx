import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch, TipCard } from '@/components/UI'

export default function ChargeInBFieldSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const boundaryType = params.boundaryType ?? 0
  const dynamicType = params.dynamicType ?? 0
  const showGeometry = params.showGeometry === 1
  const showArc = params.showArc === 1
  const showEnvelope = params.showEnvelope === 1

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  const handleBoundaryChange = (value: number | string) => {
    updateParam('boundaryType', value as number)
    animationActions.resetAnimation()
  }

  const handleDynamicChange = (value: number | string) => {
    updateParam('dynamicType', value as number)
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      {/* ─── 顶部演示模式选择（参数设置框下方第一项） ─── */}
      <SegmentedControl
        label="演示模式"
        options={[
          { value: 0, label: '基础：定性边界偏转' },
          { value: 1, label: '进阶：高考动态圆族' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      {/* ─── 下方次级参数与特定开关（以线分隔） ─── */}
      <div className="border-t border-neutral-100 pt-4 flex flex-col gap-4">
        {mode === 0 ? (
          <>
            <SegmentedControl
              label="磁场边界类型"
              options={[
                { value: 0, label: '单边界' },
                { value: 1, label: '平行双边界' },
                { value: 2, label: '圆形边界' },
              ]}
              value={boundaryType}
              onChange={handleBoundaryChange}
              disabled={disabled}
            />
            <ToggleSwitch
              label="显示几何辅助线"
              checked={showGeometry}
              onChange={(checked) => updateParam('showGeometry', checked ? 1 : 0)}
              disabled={disabled}
            />
            {(boundaryType === 0 || boundaryType === 2) && (
              <ToggleSwitch
                label="显示圆心角扇形"
                checked={showArc}
                onChange={(checked) => updateParam('showArc', checked ? 1 : 0)}
                disabled={disabled}
              />
            )}
            <TipCard>
              💡 调节速度和磁场大小可改变半径。如果选择平行双边界，试着调节速度以找到恰好切于上边界的穿透临界半径。
            </TipCard>
          </>
        ) : (
          <>
            <SegmentedControl
              label="动态圆极值类型"
              options={[
                { value: 0, label: '旋转圆 (方向变)' },
                { value: 1, label: '缩放圆 (大小变)' },
                { value: 2, label: '平移圆 (位置变)' },
              ]}
              value={dynamicType}
              onChange={handleDynamicChange}
              disabled={disabled}
            />
            <ToggleSwitch
              label="显示几何辅助线"
              checked={showGeometry}
              onChange={(checked) => updateParam('showGeometry', checked ? 1 : 0)}
              disabled={disabled}
            />
            {dynamicType === 0 && (
              <ToggleSwitch
                label="显示包络区与放电边界"
                checked={showEnvelope}
                onChange={(checked) => updateParam('showEnvelope', checked ? 1 : 0)}
                disabled={disabled}
              />
            )}
            <TipCard>
              💡 高考压轴核心：旋转圆轨迹圆心在圆弧上移动，其无边界包络为 2R 的圆；放缩圆各轨迹圆心在射线上平移；平移圆各轨迹圆心在平行线上平移。
            </TipCard>
          </>
        )}
      </div>
    </div>
  )
}
