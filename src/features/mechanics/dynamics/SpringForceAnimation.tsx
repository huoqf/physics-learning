/**
 * 弹力演示 — 主组件（薄壳）
 *
 * 根据 mode 路由到对应场景：
 *   - mode=0：胡克定律演示（splitV 上下分区）
 *   - mode=1：绳与弹簧瞬时切断（splitH 左右分区）
 */

import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import SpringForceHookeLawScene from './components/SpringForceHookeLawScene'
import SpringForceCutRopeScene from './components/SpringForceCutRopeScene'

export default function SpringForceAnimation() {
  const { mode } = useAnimationStore(
    useShallow((s) => ({
      mode: s.params.mode ?? 0,
    })),
  )

  return (
    <div className="w-full h-full">
      {mode === 0 ? <SpringForceHookeLawScene /> : <SpringForceCutRopeScene />}
    </div>
  )
}
