import type { SidebarExtraProps } from '@/data/types'
import { Button, SegmentedControl, TipCard } from '@/components/UI'

export default function SecondLawSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const scene = params.scene ?? 0

  const handleSceneChange = (value: number | string) => {
    updateParam('scene', value as number)
    animationActions.setDirection(1)
    animationActions.resetAnimation()
  }

  const handleForward = () => {
    animationActions.setDirection(1)
    animationActions.restartAnimation()
  }

  const handleReverse = () => {
    animationActions.resetAnimation()
    animationActions.setDirection(-1)
    // 通过 animationActions 无法直接 setIsPlaying，需要 reset 后手动触发
    // 这里 resetAnimation 已经 setTime(0) + setIsPlaying(false)
    // 需要额外启动播放 — 通过 updateParam 触发重渲染后由用户点击播放
    // 或者在 resetAnimation 后重启
    animationActions.restartAnimation()
    animationActions.setDirection(-1)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 操作控件（上方） */}
      <Button
        variant="primary"
        size="sm"
        onClick={handleForward}
        disabled={disabled}
        className="w-full"
      >
        正向自然播放
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={handleReverse}
        disabled={disabled}
        className="w-full"
      >
        强行逆向倒带
      </Button>

      {/* 提示信息（中间） */}
      <TipCard>
        点击「逆向倒带」观察在无外界干预下，分子是否会自动退回有序状态。
      </TipCard>

      {/* 模式切换（底部） */}
      <div className="border-t border-neutral-200 pt-3">
        <SegmentedControl
          label="演示场景"
          options={[
            { value: 0, label: '热量传导方向' },
            { value: 1, label: '气体自由膨胀' },
          ]}
          value={scene}
          onChange={handleSceneChange}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
