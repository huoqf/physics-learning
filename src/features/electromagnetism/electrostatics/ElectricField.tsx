/**
 * ElectricField.tsx — 电场强度交互动画（薄壳）
 *
 * 职责：Store 订阅 + 参数提取 + 布局计算 + 组合子组件
 */
import { useState, useEffect, useRef } from 'react'
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useElectricFieldPhysics } from './hooks/useElectricFieldPhysics'
import { ElectricFieldBasicScene } from './ElectricFieldBasicScene'
import { ElectricFieldAdvancedScene } from './ElectricFieldAdvancedScene'
import { useSceneScale } from '@/hooks'

export default function ElectricField() {
  const { params } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
    }))
  )
  const updateParam = useAnimationStore((s) => s.updateParam)

  // 教学模式：0 = 基础单电荷，1 = 进阶双电荷
  const mode = params.mode ?? 0
  const qTest = params.qTest ?? 1.0
  const rTest = params.rTest ?? 3.0
  const showFieldLines = (params.showFieldLines ?? 1) === 1

  const { containerRef, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
  const svgRef = useRef<SVGSVGElement>(null)

  const w = preset.width
  const h = preset.height
  const centerY = h / 2
  const pxPerCm = w / 20

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'custom',
    customOriginX: 0,
    customOriginY: 0,
    customScaleX: 1,
    customScaleY: 1,
    maxVectorLength: Math.min(w, h) * 0.3,
  })

  // 基础模式下的物理区域源电荷中心
  const cx = w * 0.3
  const cy = centerY

  // 进阶模式下的两个固定源电荷位置
  const cx1 = w * 0.22
  const cy1 = centerY
  const cx2 = w * 0.52
  const cy2 = centerY

  // 试探电荷的实际设计坐标
  const [testX, setTestX] = useState(cx + rTest * pxPerCm)
  const [testY, setTestY] = useState(cy)
  const [isDragging, setIsDragging] = useState(false)
  const wasDraggingRef = useRef(false)

  // 源电荷电量
  const qSource = params.q ?? 5.0
  const chargeConfig = params.chargeConfig ?? 0
  const q1 = chargeConfig === 2 ? -5.0 : 5.0
  const q2 = chargeConfig === 0 ? -5.0 : (chargeConfig === 2 ? -5.0 : 5.0)

  // 监听滑块参数更新
  useEffect(() => {
    if (isDragging) {
      wasDraggingRef.current = true
      return
    }
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false
      return
    }
    if (mode === 0) {
      setTestX(cx + rTest * pxPerCm)
      setTestY(cy)
    } else {
      const midX = (cx1 + cx2) / 2
      const midY = (cy1 + cy2) / 2
      setTestX(midX + rTest * pxPerCm)
      setTestY(midY)
    }
  }, [rTest, mode, cx, cy, cx1, cx2, cy1, cy2, isDragging, pxPerCm])

  // 物理计算 (在设计空间中进行)
  const physics = useElectricFieldPhysics({
    mode, qSource, qTest, q1, q2, chargeConfig, showFieldLines,
    testX, testY, cx, cy, cx1, cy1, cx2, cy2,
    w, h, pxPerCm,
  })

  // 将屏幕坐标映射到设计坐标（用于拖拽交互）
  const clientToDesign = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const svgPt = pt.matrixTransform(ctm.inverse())
    // SVG root coords (CSS pixels) → design coords
    return {
      x: (svgPt.x - vp.tx) / vp.scale,
      y: (svgPt.y - vp.ty) / vp.scale,
    }
  }

  // 鼠标拖拽事件处理（通过 useEffect 绑定 pointer events，AnimationSvgCanvas 仅支持 mouse events）
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const onPointerDown = (e: PointerEvent) => {
      const pt = clientToDesign(e.clientX, e.clientY)
      if (!pt) return
      const { x, y } = pt

      const dist = Math.sqrt((x - testX) ** 2 + (y - testY) ** 2)
      if (dist < 24) {
        setIsDragging(true)
        svg.setPointerCapture(e.pointerId)
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      const pt = clientToDesign(e.clientX, e.clientY)
      if (!pt) return
      let { x, y } = pt

      x = Math.max(15, Math.min(w - 15, x))
      y = Math.max(15, Math.min(h - 15, y))

      if (mode === 0) {
        x = Math.min(w * 0.58, x)
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        if (d < 18) return

        setTestX(x)
        setTestY(y)

        const distCm = d / pxPerCm
        const clampedCm = Math.max(1.0, Math.min(6.0, distCm))
        updateParam('rTest', clampedCm)
      } else {
        const d1 = Math.sqrt((x - cx1) ** 2 + (y - cy1) ** 2)
        const d2 = Math.sqrt((x - cx2) ** 2 + (y - cy2) ** 2)
        if (d1 < 18 || d2 < 18) return

        setTestX(x)
        setTestY(y)

        const midX = (cx1 + cx2) / 2
        const midY = (cy1 + cy2) / 2
        const distCm = Math.sqrt((x - midX) ** 2 + (y - midY) ** 2) / pxPerCm
        const clampedCm = Math.max(0.1, Math.min(8.0, distCm))
        updateParam('rTest', clampedCm)
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging) {
        setIsDragging(false)
        svg.releasePointerCapture(e.pointerId)
      }
    }

    svg.addEventListener('pointerdown', onPointerDown)
    svg.addEventListener('pointermove', onPointerMove)
    svg.addEventListener('pointerup', onPointerUp)
    return () => {
      svg.removeEventListener('pointerdown', onPointerDown)
      svg.removeEventListener('pointermove', onPointerMove)
      svg.removeEventListener('pointerup', onPointerUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clientToDesign reads svgRef.current which is stable
  }, [isDragging, mode, testX, testY, cx, cy, cx1, cy1, cx2, cy2, w, h, pxPerCm, updateParam, vp.tx, vp.ty, vp.scale])

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      svgRef={svgRef}
      className="bg-white rounded-lg shadow-inner cursor-crosshair"
    >
      {/* Defs */}
      <defs>
        {/* 电场线方向标注，非单点物理矢量；虚线场线不适用 VectorArrow */}
        <marker
          id="arrow-efield"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.electricFieldLine} />
        </marker>
      </defs>

      {/* 1. 背景电场线（虚线场线方向标注，非单点物理矢量，不适用 VectorArrow） */}
      {physics.fieldLinesPaths.map((d, idx) => (
        <path
          key={`field-line-${idx}`}
          d={d}
          stroke={PHYSICS_COLORS.electricFieldLine}
          strokeWidth={1.2}
          strokeDasharray="4,4"
          fill="none"
          markerEnd="url(#arrow-efield)"
          opacity={0.3}
        />
      ))}

      {/* 2. 基础模式 */}
      {mode === 0 && (
        <ElectricFieldBasicScene
          w={w}
          h={h}
          cx={cx}
          cy={cy}
          qSource={qSource}
          qTest={qTest}
          testX={testX}
          testY={testY}
          isDragging={isDragging}
          basicPhysics={physics.basicPhysics}
          basicArrows={physics.basicArrows}
          chartProps={physics.chartProps}
          sceneScale={sceneScale}
        />
      )}

      {/* 3. 进阶模式 */}
      {mode === 1 && (
        <ElectricFieldAdvancedScene
          cx1={cx1}
          cy1={cy1}
          cx2={cx2}
          cy2={cy2}
          q1={q1}
          q2={q2}
          qTest={qTest}
          testX={testX}
          testY={testY}
          isDragging={isDragging}
          advancedArrows={physics.advancedArrows}
          sceneScale={sceneScale}
        />
      )}
    </AnimationSvgCanvas>
  )
}
