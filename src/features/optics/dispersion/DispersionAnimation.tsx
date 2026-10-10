import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useDispersionPhysics, type DispersionMode } from './hooks/useDispersionPhysics'
import DispersionScene from './components/DispersionScene'

/** 默认入射角 (°)：接近等边棱镜的最小偏向角对称光路 (i_min ≈ 49°) */
const DEFAULT_INCIDENCE_DEG = 50

/**
 * 光的色散与光谱综合 —— 三棱镜白光色散与红紫极值矩阵。
 *
 * 中屏上下分区（840×650 设计坐标系）：
 *   上带 840×325：三棱镜白光色散光路，出射连续光谱在深色观察屏上展开彩带；
 *   下带 840×325：柯西色散曲线 n(λ) 与红/紫两端七大物理量联动对比。
 *
 * 稳态光学现象，无时间轴 → 由注册表声明 controlsMode: 'param'。
 */
export default function DispersionAnimation() {
  const { params } = useAnimationStore(useShallow((s) => ({ params: s.params })))
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full })

  const mode: DispersionMode = (params.mode ?? 0) === 1 ? 'dual' : 'spectrum'
  const incidenceDeg = params.incidenceAngle ?? DEFAULT_INCIDENCE_DEG
  const showAngleMarks = (params.showAngleMarks ?? 1) === 1

  const physics = useDispersionPhysics({ mode, incidenceDeg })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <DispersionScene
        physics={physics}
        font={canvasSize.font}
        mode={mode}
        showAngleMarks={showAngleMarks}
      />
    </AnimationSvgCanvas>
  )
}
