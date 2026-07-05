/**
 * 库仑定律交互动画页面
 *
 * 本模块是库仑定律动画的薄编排层，负责：
 * 1. 从 store 读取全局参数（params, showVectors, showFormulas）
 * 2. 根据 mode 参数切换基础模式或三电荷平衡模式
 * 3. 按需加载子组件（React.lazy + Suspense）
 *
 * 两种模式：
 * - mode=0: 基础模式（BasicMode）— 两点电荷 + F-r 图表 + 拖拽改变距离 + 接触起电演示
 * - mode=1: 三电荷平衡模式（ThreeChargeMode）— 固定 Q1/Q2，拖拽 Q3 寻找平衡位置
 *
 * @category M4
 */
import { lazy, Suspense } from 'react'
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'

const BasicMode = lazy(() => import('./BasicMode'))
const ThreeChargeMode = lazy(() => import('./ThreeChargeMode'))

/**
 * 库仑定律动画主组件
 *
 * @returns 包含模式切换逻辑的 React 组件
 */
export default function CoulombLaw() {
  const { params, showVectors, showFormulas } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      showVectors: s.showVectors,
      showFormulas: s.showFormulas,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })

  const mode = params.mode ?? 0

  return (
    <div ref={containerRef} className="w-full h-full">
      <Suspense fallback={null}>
        {mode === 0
          ? <BasicMode params={params} showVectors={showVectors} showFormulas={showFormulas} canvasSize={canvasSize} />
          : <ThreeChargeMode params={params} showVectors={showVectors} showFormulas={showFormulas} canvasSize={canvasSize} />
        }
      </Suspense>
    </div>
  )
}
