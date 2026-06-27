import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useCanvasSize, useViewport } from '@/utils'
import { CurvedSlotCharts, CurvedSlotSvg } from './CurvedSlotModel'
import { SpringBlocksCharts, SpringBlocksSvg } from './SpringBlocksModel'
import { ManBoatCharts, ManBoatSvg } from './ManBoatModel'

const CANVAS_DESIGN = { width: 700, height: 180 }
const GROUND_Y = 130
const SLOT_PX_PER_M = 40
const SLOT_ORIGIN_X = 350
const SPRING_PX_PER_M = 40
const SPRING_ORIGIN_X = 350
const BOAT_PX_PER_M = 30
const BOAT_ORIGIN_X = 350

export default function MomentumApplicationAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_DESIGN)
  const vp = useViewport(canvasSize, { designWidth: CANVAS_DESIGN.width, designHeight: CANVAS_DESIGN.height })

  const {
    modelType = 0,
    m_block = 2,
    M_slot = 5,
    R_slot = 1.5,
    mA_spring = 2,
    mB_spring = 3,
    v0_spring = 5,
    k_spring = 20,
    m_person = 50,
    M_boat = 150,
    L_boat = 4,
    manBoatControl = 0,
  } = params

  const sceneScaleSlot = useMemo(() => ({
    scaleX: SLOT_PX_PER_M, scaleY: SLOT_PX_PER_M, scale: SLOT_PX_PER_M,
    originX: SLOT_ORIGIN_X, originY: GROUND_Y, maxVectorLength: 45,
    refMagnitudes: { force: 25, normalForce: 25, appliedForce: 25, forceComponent: 25, velocity: 5 }
  }), [])

  const sceneScaleSpring = useMemo(() => ({
    scaleX: SPRING_PX_PER_M, scaleY: SPRING_PX_PER_M, scale: SPRING_PX_PER_M,
    originX: SPRING_ORIGIN_X, originY: GROUND_Y, maxVectorLength: 40,
    refMagnitudes: { velocity: 6 }
  }), [])

  const sceneScaleBoat = useMemo(() => ({
    scaleX: BOAT_PX_PER_M, scaleY: BOAT_PX_PER_M, scale: BOAT_PX_PER_M,
    originX: BOAT_ORIGIN_X, originY: GROUND_Y, maxVectorLength: 40,
    refMagnitudes: { velocity: 2.0 }
  }), [])

  const slotProps = { time, canvasSize, m_block, M_slot, R_slot, sceneScale: sceneScaleSlot }
  const springProps = { time, canvasSize, mA_spring, mB_spring, v0_spring, k_spring, sceneScale: sceneScaleSpring }
  const boatProps = { time, canvasSize, m_person, M_boat, L_boat, manBoatControl, sceneScale: sceneScaleBoat }

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 box-border bg-neutral-50 overflow-hidden">
      {/* 上方图表/教学板区域 */}
      <div className="flex gap-4 h-[220px] shrink-0">
        {modelType === 0 && <CurvedSlotCharts {...slotProps} />}
        {modelType === 1 && <SpringBlocksCharts {...springProps} />}
        {modelType === 2 && <ManBoatCharts {...boatProps} />}
      </div>

      {/* 下方物理仿真动画区 */}
      <div
        ref={containerRef}
        className="flex-grow bg-white border border-neutral-200/80 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between"
      >
        <svg
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full h-full"
        >
          <g transform={vp.transform}>
            {modelType === 0 && <CurvedSlotSvg {...slotProps} />}
            {modelType === 1 && <SpringBlocksSvg {...springProps} />}
            {modelType === 2 && <ManBoatSvg {...boatProps} />}
          </g>
        </svg>

        <div className="p-3 bg-neutral-50 border-t border-neutral-200/80 text-[11px] text-neutral-600 flex items-center justify-between">
          <div>
            {modelType === 0 && (
              <p>💡 <strong>弧形槽-滑块</strong>：在下滑时，相互弹力大小和方向随接触点实时改变，如果用微积分计算会十分痛苦。而联立水平方向动量守恒与机械能守恒，能一枪封喉求得最低点速度。</p>
            )}
            {modelType === 1 && (
              <p>💡 <strong>弹簧双滑块</strong>：胡克定律的变力让物体做正弦/余弦式的变加速运动。但动量守恒锁定了两条速度曲线波动的"黄色平均中轴线"，能量守恒则决定了两条曲线的上下波幅。</p>
            )}
            {modelType === 2 && (
              <p>💡 <strong>人船与质心</strong>：没有外力时，不论人怎么在船上乱跑（手动模式下使用键盘 ←/→ 键行走），金色质心十字星在屏幕的绝对坐标一动不动，强烈展示了空间均匀性（空间平移对称）。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
