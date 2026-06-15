import { useAnimationStore } from '@/stores'
import FreeFallAnimation from './FreeFallAnimation'
import FreeFallDripAnimation from './FreeFallDripAnimation'

/**
 * 自由落体动画入口组件
 * 根据 advancedMode 参数切换渲染基础模式（牛顿管）或进阶模式（滴水法测g）
 */
export default function FreeFallWrapper() {
    const params = useAnimationStore((s) => s.params)
  const advancedMode = params.advancedMode ?? 0

  if (advancedMode === 1) {
    return <FreeFallDripAnimation />
  }
  return <FreeFallAnimation />
}
