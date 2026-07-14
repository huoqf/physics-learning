/**
 * 弹力演示 — 胡克定律（基础模式）
 */

import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import SpringForceHookeLawScene from './components/SpringForceHookeLawScene'
import ElasticNormalForceScene from './components/ElasticNormalForceScene'
import ElasticTensionForceScene from './components/ElasticTensionForceScene'

export default function SpringForceAnimation() {
  const { mode } = useAnimationStore(
    useShallow((s) => ({
      mode: s.params.mode ?? 0,
    })),
  )

  return (
    <div className="w-full h-full">
      {mode === 0 && <SpringForceHookeLawScene />}
      {mode === 1 && <ElasticNormalForceScene />}
      {mode === 2 && <ElasticTensionForceScene />}
    </div>
  )
}
