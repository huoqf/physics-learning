import { SegmentedControl, OptionButton } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function ConnectedBodiesSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {

  const advancedMode = params.advancedMode ?? 0
  const connectionType = params.connectionType ?? 0 // 0=细绳, 1=弹簧
  const analysisView = params.analysisView ?? 0 // 0=普通, 1=整体, 2=隔离m1, 3=隔离m2

  // ── 模式切换 ──
  const handleModeChange = (value: number | string) => {
    updateParam('advancedMode', value as number)
    animationActions.resetAnimation()
  }

  const handleConnectionTypeChange = (value: number | string) => {
    updateParam('connectionType', value as number)
    animationActions.resetAnimation()
  }

  const handleAnalysisViewChange = (view: number) => {
    updateParam('analysisView', view)
    // 切换分析视角时不重置时间，方便用户在运动中对比不同受力模式
  }

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200 flex flex-col gap-4">
      {/* 观察模式切换 */}
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

      {/* 连接介质类型 */}
      <SegmentedControl
        label="连接传动介质"
        options={[
          { label: '编制细绳', value: 0 },
          { label: '轻质弹簧', value: 1 },
        ]}
        value={connectionType}
        onChange={handleConnectionTypeChange}
        disabled={disabled}
      />

      {/* 演示受力分析视图 */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-neutral-600">受力分析视图</p>
        <div className="flex flex-col gap-1.5">
          {[
            { value: 0, label: '普通受力视图' },
            { value: 1, label: '整体法分析系统' },
            { value: 2, label: '隔离法分析物体 m₁' },
            { value: 3, label: '隔离法分析物体 m₂' },
          ].map((item) => (
            <OptionButton
              key={item.value}
              label={item.label}
              selected={analysisView === item.value}
              disabled={disabled}
              onClick={() => handleAnalysisViewChange(item.value)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
