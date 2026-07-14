import { useRef, useState, useCallback, useEffect } from 'react'
import { VectorDefs, VectorArrow, Block, Incline, DragHandle } from '@/components/Physics'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { computeScale, canvasToPhysics } from '@/utils/coordinate'
import { clientToContainerPoint, snapAngle, snapForce } from '@/utils'
import { useOrthogonalDecompositionPhysics } from './useOrthogonalDecompositionPhysics'
import { VectorGrid } from './VectorGrid'
import { AnimationSvgCanvas } from '@/components/Layout'

export default function OrthogonalDecompositionAnimation() {
  const { params, showVectors, showGrid, updateParam } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      showVectors: s.showVectors,
      showGrid: s.showGrid,
      updateParam: s.updateParam,
    }))
  )

  const mode = params.mode ?? 0

  // 模式 0 变量
  const f1 = params.f1 ?? 10
  const theta1 = params.theta1 ?? 30
  const f2 = params.f2 ?? 8
  const theta2 = params.theta2 ?? 120
  const f3 = params.f3 ?? 6
  const theta3 = params.theta3 ?? 250
  const axisAngle = params.axisAngle ?? 0

  // 模式 1 变量
  const theta = params.theta ?? 30
  const m = params.m ?? 2.0
  const axisSelect = params.axisSelect ?? 0

  // 1. 使用标准视口 Hook (设计尺寸满屏预设)
  const { containerRef, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
    presetCompensation: 1.2
  })
  const svgRef = useRef<SVGSVGElement>(null)

  // 2. 标定物理比例尺 (WORLD 物理范围是 [-10, 10]，使用设计尺寸确保坐标变换一致)
  const WORLD = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 } as const
  const scale = computeScale(preset.width, preset.height, WORLD) * 0.6

  // 3. 构建标准场景比例尺
  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'viewport',
    physicsWidth: preset.width,
    physicsHeight: preset.height
  })

  // 4. 计算正交分解物理数据 (使用设计尺寸确保坐标变换一致)
  const physicsData = useOrthogonalDecompositionPhysics({
    f1, theta1, f2, theta2, f3, theta3, axisAngle,
    theta, m, axisSelect,
    mode, canvasWidth: preset.width, canvasHeight: preset.height, scale
  })

  const { origin, forces, netForce, axisAngleRad, slopeGeom, slopeForces } = physicsData

  // ==========================================
  // 模式 0 拖拽逻辑（Pointer Events 统一处理）
  // ==========================================
  const [activeDrag, setActiveDrag] = useState<'f1' | 'f2' | 'f3' | null>(null)

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!activeDrag || !svgRef.current || vp.visibleW === 0 || vp.scale === 0) return
    const { x: cx, y: cy } = clientToContainerPoint(clientX, clientY, svgRef.current.getBoundingClientRect())
    // 容器像素 → 设计坐标
    const designX = (cx - vp.tx) / vp.scale
    const designY = (cy - vp.ty) / vp.scale
    const { x: px, y: py } = canvasToPhysics(designX, designY, preset.width, preset.height, scale)

    const rawMag = Math.sqrt(px * px + py * py)
    const rawDir = (Math.atan2(py, px) * 180) / Math.PI

    const finalAngle = snapAngle(rawDir)
    const finalMag = Math.max(1, Math.min(8, snapForce(rawMag)))

    if (activeDrag === 'f1') {
      updateParam('f1', finalMag)
      updateParam('theta1', finalAngle)
    } else if (activeDrag === 'f2') {
      updateParam('f2', finalMag)
      updateParam('theta2', finalAngle)
    } else if (activeDrag === 'f3') {
      updateParam('f3', finalMag)
      updateParam('theta3', finalAngle)
    }
  }, [activeDrag, scale, vp.visibleW, vp.scale, vp.tx, vp.ty, preset.width, preset.height, updateParam])

  const handlePointerDown = useCallback((target: 'f1' | 'f2' | 'f3', e: React.PointerEvent<SVGGElement>) => {
    e.preventDefault()
    setActiveDrag(target)
  }, [])

  useEffect(() => {
    if (!activeDrag) return
    const handlePointerUp = () => setActiveDrag(null)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [activeDrag])

  // 可视区域的坐标原点（设计坐标）
  const centerX = preset.width / 2
  const centerY = preset.height / 2

  // 绘制坐标轴旋转的角度圆弧（设计分辨率下绘制）
  const renderAxisArc = () => {
    if (mode !== 0 || axisAngle === 0) return null
    const arcRadius = 45
    const startX = origin.cx + arcRadius
    const startY = origin.cy
    const endX = origin.cx + arcRadius * Math.cos(axisAngleRad)
    const endY = origin.cy - arcRadius * Math.sin(axisAngleRad)
    const pathD = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 0 ${endX} ${endY}`

    const midAngle = axisAngleRad / 2
    const textX = origin.cx + (arcRadius + 15) * Math.cos(midAngle)
    const textY = origin.cy - (arcRadius + 15) * Math.sin(midAngle)

    return (
      <g>
        <path d={pathD} fill="none" stroke={colors.danger[400]} strokeWidth={1.5} strokeDasharray="2,2" />
        <text x={textX} y={textY} fontSize={11} fill={colors.danger[600]} fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
          {axisAngle.toFixed(0)}°
        </text>
      </g>
    )
  }

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      svgRef={svgRef}
      onPointerMove={(e) => handleDragMove(e.clientX, e.clientY)}
    >
      {/* 网格底纹 */}
      <VectorGrid
        centerX={mode === 0 ? centerX : slopeGeom.blockCenter.cx}
        centerY={mode === 0 ? centerY : slopeGeom.blockCenter.cy}
        scale={scale} visibleW={preset.width} visibleH={preset.height} showGrid={showGrid}
      />

      {/* ========================================================
          模式 0：多力合成与建系优化
          ======================================================== */}
      {mode === 0 && (
        <g>
          {/* 旋转直角坐标轴 (x' 和 y') */}
          <g transform={`translate(${origin.cx}, ${origin.cy}) rotate(${-axisAngle})`}>
            {/* x' 轴 */}
            <line x1={-preset.width * 0.45} y1={0} x2={preset.width * 0.45} y2={0}
              stroke={CANVAS_COLORS.axis} strokeWidth={2} strokeDasharray="6,4" />
            <text x={preset.width * 0.42} y={-10} fontSize={12} fill={colors.neutral[700]} fontWeight="bold">x'</text>

            {/* y' 轴 */}
            <line x1={0} y1={-preset.height * 0.45} x2={0} y2={preset.height * 0.45}
              stroke={CANVAS_COLORS.axis} strokeWidth={2} strokeDasharray="6,4" />
            <text x={10} y={-preset.height * 0.42} fontSize={12} fill={colors.neutral[700]} fontWeight="bold">y'</text>
          </g>

          {/* 坐标轴旋转偏角弧线 */}
          {renderAxisArc()}

          {/* 物理分矢量投影辅助线与分量箭头 */}
          {showVectors && forces.map((f, idx) => (
            <g key={`proj-${idx}`}>
              {/* 投影到旋转坐标轴上的虚线 */}
              <line x1={f.end.cx} y1={f.end.cy} x2={f.xProjEnd.cx} y2={f.xProjEnd.cy}
                stroke={CANVAS_COLORS.trackHistory} strokeWidth={1.2} strokeDasharray="3,3" />
              <line x1={f.end.cx} y1={f.end.cy} x2={f.yProjEnd.cx} y2={f.yProjEnd.cy}
                stroke={CANVAS_COLORS.trackHistory} strokeWidth={1.2} strokeDasharray="3,3" />

              {/* 沿 x' 和 y' 轴的分矢量投影箭头 */}
              {Math.abs(f.fxPrime) > 0.05 && (
                <g opacity={0.6}>
                  <VectorArrow originDesign={{ x: origin.cx, y: origin.cy }}
                    vector={{ x: f.xProjEnd.cx - origin.cx, y: -(f.xProjEnd.cy - origin.cy) }}
                    type="forceComponent" arrowType="physical-schematic" sceneScale={sceneScale} color={f.color}
                    strokeWidth={1.5} pixelLength={Math.hypot(f.xProjEnd.cx - origin.cx, f.xProjEnd.cy - origin.cy)} />
                </g>
              )}
              {Math.abs(f.fyPrime) > 0.05 && (
                <g opacity={0.6}>
                  <VectorArrow originDesign={{ x: origin.cx, y: origin.cy }}
                    vector={{ x: f.yProjEnd.cx - origin.cx, y: -(f.yProjEnd.cy - origin.cy) }}
                    type="forceComponent" arrowType="physical-schematic" sceneScale={sceneScale} color={f.color}
                    strokeWidth={1.5} pixelLength={Math.hypot(f.yProjEnd.cx - origin.cx, f.yProjEnd.cy - origin.cy)} />
                </g>
              )}
            </g>
          ))}

          {/* 合力的投影辅助线 */}
          {showVectors && (
            <g>
              <line x1={netForce.end.cx} y1={netForce.end.cy} x2={netForce.xProjEnd.cx} y2={netForce.xProjEnd.cy}
                stroke={CANVAS_COLORS.alertRed} strokeWidth={1.2} strokeDasharray="3,3" opacity={0.5} />
              <line x1={netForce.end.cx} y1={netForce.end.cy} x2={netForce.yProjEnd.cx} y2={netForce.yProjEnd.cy}
                stroke={CANVAS_COLORS.alertRed} strokeWidth={1.2} strokeDasharray="3,3" opacity={0.5} />
            </g>
          )}

          {/* 绘制三个原力矢量 */}
          {showVectors && forces.map((f, idx) => {
            const target = idx === 0 ? 'f1' : idx === 1 ? 'f2' : 'f3'
            return (
              <g key={`force-${idx}`}>
                <VectorArrow originDesign={{ x: origin.cx, y: origin.cy }}
                  vector={{ x: f.end.cx - origin.cx, y: -(f.end.cy - origin.cy) }}
                  type="force" arrowType="physical-schematic" sceneScale={sceneScale} color={f.color} strokeWidth={3}
                  pixelLength={Math.hypot(f.end.cx - origin.cx, f.end.cy - origin.cy)} />

                {/* 力文字标签 */}
                <text x={f.end.cx + (f.end.cx > origin.cx ? 8 : -20)}
                  y={f.end.cy + (f.end.cy > origin.cy ? 15 : -8)}
                  fontSize={12} fill={f.color} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
                  {f.name}
                </text>

                {/* 拖拽点手柄 */}
                <DragHandle
                  cx={f.end.cx}
                  cy={f.end.cy}
                  color={f.color}
                  onPointerDown={(e) => handlePointerDown(target, e)}
                />
              </g>
            )
          })}

          {/* 绘制最终合成的合力（红粗轴） */}
          {showVectors && (
            <g>
              <VectorArrow originDesign={{ x: origin.cx, y: origin.cy }}
                vector={{ x: netForce.end.cx - origin.cx, y: -(netForce.end.cy - origin.cy) }}
                type="force" arrowType="physical-schematic" sceneScale={sceneScale} color={CANVAS_COLORS.alertRed} strokeWidth={4.5}
                pixelLength={Math.hypot(netForce.end.cx - origin.cx, netForce.end.cy - origin.cy)} />
              <text x={netForce.end.cx + (netForce.end.cx > origin.cx ? 8 : -25)}
                y={netForce.end.cy + (netForce.end.cy > origin.cy ? 15 : -8)}
                fontSize={13} fill={CANVAS_COLORS.alertRed} fontWeight="extrabold" fontFamily={CANVAS_STYLE.font.family}>
                F合
              </text>
            </g>
          )}

          {/* 中心锚点 */}
          <circle cx={origin.cx} cy={origin.cy} r={4.5} fill={CANVAS_COLORS.originMark} stroke={CANVAS_COLORS.white} strokeWidth={1.5} />
        </g>
      )}

      {/* ========================================================
          模式 1：斜面平衡建系对比
          ======================================================== */}
      {mode === 1 && (
        <g>
          {/* 斜面基座 */}
          <Incline x0={slopeGeom.x0} y0={slopeGeom.y0} width={slopeGeom.slideW} height={slopeGeom.slideH} />

          {/* 斜面倾角弧线与标注 (在右下角底角顶点处) */}
          <path d={`M ${slopeGeom.x0 + slopeGeom.slideW - 50} ${slopeGeom.y0} A 50 50 0 0 0 ${slopeGeom.x0 + slopeGeom.slideW - 50 * Math.cos((theta * Math.PI) / 180)} ${slopeGeom.y0 - 50 * Math.sin((theta * Math.PI) / 180)}`}
            fill="none" stroke={CANVAS_COLORS.axis} strokeWidth={1} strokeDasharray="3,2" />
          <text x={slopeGeom.x0 + slopeGeom.slideW - 65} y={slopeGeom.y0 - 15} fontSize={11} fill={colors.neutral[600]} fontWeight="bold">
            θ = {theta.toFixed(0)}°
          </text>

          {/* 物块直角坐标系 (根据方案选择绘制旋转角度) */}
          <g transform={`translate(${slopeGeom.blockCenter.cx}, ${slopeGeom.blockCenter.cy}) rotate(${axisSelect === 0 ? theta : 0})`}>
            {/* x 坐标轴 */}
            <line x1={-150} y1={0} x2={150} y2={0} stroke={CANVAS_COLORS.axis} strokeWidth={1.5} strokeDasharray="5,3" />
            <text x={140} y={-10} fontSize={11} fill={colors.neutral[600]} fontWeight="bold">{axisSelect === 0 ? "x'" : "x"}</text>

            {/* y 坐标轴 */}
            <line x1={0} y1={-150} x2={0} y2={150} stroke={CANVAS_COLORS.axis} strokeWidth={1.5} strokeDasharray="5,3" />
            <text x={10} y={-135} fontSize={11} fill={colors.neutral[600]} fontWeight="bold">{axisSelect === 0 ? "y'" : "y"}</text>
          </g>

          {/* 绘制物块 (利用 rotate 使之完美贴在斜面上) */}
          <g transform={`translate(${slopeGeom.blockCenter.cx}, ${slopeGeom.blockCenter.cy}) rotate(${theta})`}>
            <Block
              x={-28}
              y={-18}
              width={56}
              height={36}
              type="standard"
              showCenterOfMass={true}
              label="m"
            />
          </g>

          {/* 绘制重力 G、支持力 FN、摩擦力 f 投影辅助线与分量箭头 */}
          {showVectors && (
            <g>
              {/* 1. 重力 G 的投影 */}
              <line x1={slopeForces.G.end.cx} y1={slopeForces.G.end.cy} x2={slopeForces.G.xProjEnd.cx} y2={slopeForces.G.xProjEnd.cy}
                stroke={CANVAS_COLORS.trackHistory} strokeWidth={1} strokeDasharray="3,3" />
              <line x1={slopeForces.G.end.cx} y1={slopeForces.G.end.cy} x2={slopeForces.G.yProjEnd.cx} y2={slopeForces.G.yProjEnd.cy}
                stroke={CANVAS_COLORS.trackHistory} strokeWidth={1} strokeDasharray="3,3" />

              {axisSelect === 0 && (
                <>
                  {/* 方案A：绘制重力的沿斜面分量 G_x 和垂直斜面分量 G_y */}
                  <g opacity={0.65}>
                    <VectorArrow originDesign={{ x: slopeGeom.blockCenter.cx, y: slopeGeom.blockCenter.cy }}
                      vector={{ x: slopeForces.G.xProjEnd.cx - slopeGeom.blockCenter.cx, y: -(slopeForces.G.xProjEnd.cy - slopeGeom.blockCenter.cy) }}
                      type="forceComponent" arrowType="physical-schematic" sceneScale={sceneScale} color="#ef4444"
                      strokeWidth={1.8} pixelLength={Math.hypot(slopeForces.G.xProjEnd.cx - slopeGeom.blockCenter.cx, slopeForces.G.xProjEnd.cy - slopeGeom.blockCenter.cy)} />
                  </g>
                  <text x={slopeForces.G.xProjEnd.cx - 22} y={slopeForces.G.xProjEnd.cy + 16} fontSize={10} fill="#ef4444" fontWeight="bold">Gx</text>

                  <g opacity={0.65}>
                    <VectorArrow originDesign={{ x: slopeGeom.blockCenter.cx, y: slopeGeom.blockCenter.cy }}
                      vector={{ x: slopeForces.G.yProjEnd.cx - slopeGeom.blockCenter.cx, y: -(slopeForces.G.yProjEnd.cy - slopeGeom.blockCenter.cy) }}
                      type="forceComponent" arrowType="physical-schematic" sceneScale={sceneScale} color="#ef4444"
                      strokeWidth={1.8} pixelLength={Math.hypot(slopeForces.G.yProjEnd.cx - slopeGeom.blockCenter.cx, slopeForces.G.yProjEnd.cy - slopeGeom.blockCenter.cy)} />
                  </g>
                  <text x={slopeForces.G.yProjEnd.cx - 18} y={slopeForces.G.yProjEnd.cy + 4} fontSize={10} fill="#ef4444" fontWeight="bold">Gy</text>
                </>
              )}

              {/* 2. 方案 B 下需要分解支持力 FN 和摩擦力 f */}
              {axisSelect === 1 && (
                <g>
                  {/* 支持力 FN 的投影线和分量 */}
                  <line x1={slopeForces.FN.end.cx} y1={slopeForces.FN.end.cy} x2={slopeForces.FN.xProjEnd.cx} y2={slopeForces.FN.xProjEnd.cy}
                    stroke={CANVAS_COLORS.trackHistory} strokeWidth={1} strokeDasharray="3,3" />
                  <line x1={slopeForces.FN.end.cx} y1={slopeForces.FN.end.cy} x2={slopeForces.FN.yProjEnd.cx} y2={slopeForces.FN.yProjEnd.cy}
                    stroke={CANVAS_COLORS.trackHistory} strokeWidth={1} strokeDasharray="3,3" />

                  <g opacity={0.65}>
                    <VectorArrow originDesign={{ x: slopeGeom.blockCenter.cx, y: slopeGeom.blockCenter.cy }}
                      vector={{ x: slopeForces.FN.xProjEnd.cx - slopeGeom.blockCenter.cx, y: -(slopeForces.FN.xProjEnd.cy - slopeGeom.blockCenter.cy) }}
                      type="forceComponent" arrowType="physical-schematic" sceneScale={sceneScale} color="#3b82f6"
                      strokeWidth={1.8} pixelLength={Math.hypot(slopeForces.FN.xProjEnd.cx - slopeGeom.blockCenter.cx, slopeForces.FN.xProjEnd.cy - slopeGeom.blockCenter.cy)} />
                  </g>
                  <text x={slopeForces.FN.xProjEnd.cx - 24} y={slopeForces.FN.xProjEnd.cy - 6} fontSize={10} fill="#3b82f6" fontWeight="bold">FNx</text>

                  <g opacity={0.65}>
                    <VectorArrow originDesign={{ x: slopeGeom.blockCenter.cx, y: slopeGeom.blockCenter.cy }}
                      vector={{ x: slopeForces.FN.yProjEnd.cx - slopeGeom.blockCenter.cx, y: -(slopeForces.FN.yProjEnd.cy - slopeGeom.blockCenter.cy) }}
                      type="forceComponent" arrowType="physical-schematic" sceneScale={sceneScale} color="#3b82f6"
                      strokeWidth={1.8} pixelLength={Math.hypot(slopeForces.FN.yProjEnd.cx - slopeGeom.blockCenter.cx, slopeForces.FN.yProjEnd.cy - slopeGeom.blockCenter.cy)} />
                  </g>
                  <text x={slopeForces.FN.yProjEnd.cx + 8} y={slopeForces.FN.yProjEnd.cy + 12} fontSize={10} fill="#3b82f6" fontWeight="bold">FNy</text>

                  {/* 摩擦力 f 的投影线和分量 */}
                  <line x1={slopeForces.f.end.cx} y1={slopeForces.f.end.cy} x2={slopeForces.f.xProjEnd.cx} y2={slopeForces.f.xProjEnd.cy}
                    stroke={CANVAS_COLORS.trackHistory} strokeWidth={1} strokeDasharray="3,3" />
                  <line x1={slopeForces.f.end.cx} y1={slopeForces.f.end.cy} x2={slopeForces.f.yProjEnd.cx} y2={slopeForces.f.yProjEnd.cy}
                    stroke={CANVAS_COLORS.trackHistory} strokeWidth={1} strokeDasharray="3,3" />

                  <g opacity={0.65}>
                    <VectorArrow originDesign={{ x: slopeGeom.blockCenter.cx, y: slopeGeom.blockCenter.cy }}
                      vector={{ x: slopeForces.f.xProjEnd.cx - slopeGeom.blockCenter.cx, y: -(slopeForces.f.xProjEnd.cy - slopeGeom.blockCenter.cy) }}
                      type="forceComponent" arrowType="physical-schematic" sceneScale={sceneScale} color="#10b981"
                      strokeWidth={1.8} pixelLength={Math.hypot(slopeForces.f.xProjEnd.cx - slopeGeom.blockCenter.cx, slopeForces.f.xProjEnd.cy - slopeGeom.blockCenter.cy)} />
                  </g>
                  <text x={slopeForces.f.xProjEnd.cx + 4} y={slopeForces.f.xProjEnd.cy + 14} fontSize={10} fill="#10b981" fontWeight="bold">fx</text>

                  <g opacity={0.65}>
                    <VectorArrow originDesign={{ x: slopeGeom.blockCenter.cx, y: slopeGeom.blockCenter.cy }}
                      vector={{ x: slopeForces.f.yProjEnd.cx - slopeGeom.blockCenter.cx, y: -(slopeForces.f.yProjEnd.cy - slopeGeom.blockCenter.cy) }}
                      type="forceComponent" arrowType="physical-schematic" sceneScale={sceneScale} color="#10b981"
                      strokeWidth={1.8} pixelLength={Math.hypot(slopeForces.f.yProjEnd.cx - slopeGeom.blockCenter.cx, slopeForces.f.yProjEnd.cy - slopeGeom.blockCenter.cy)} />
                  </g>
                  <text x={slopeForces.f.yProjEnd.cx - 16} y={slopeForces.f.yProjEnd.cy - 6} fontSize={10} fill="#10b981" fontWeight="bold">fy</text>
                </g>
              )}
            </g>
          )}

          {/* 绘制三个原受力矢量 */}
          {showVectors && (
            <g>
              {/* 重力 G */}
              <VectorArrow originDesign={{ x: slopeGeom.blockCenter.cx, y: slopeGeom.blockCenter.cy }}
                vector={{ x: slopeForces.G.end.cx - slopeGeom.blockCenter.cx, y: -(slopeForces.G.end.cy - slopeGeom.blockCenter.cy) }}
                type="force" arrowType="physical-schematic" sceneScale={sceneScale} color={slopeForces.G.color} strokeWidth={3}
                pixelLength={Math.hypot(slopeForces.G.end.cx - slopeGeom.blockCenter.cx, slopeForces.G.end.cy - slopeGeom.blockCenter.cy)} />
              <text x={slopeForces.G.end.cx - 15} y={slopeForces.G.end.cy + 4} fontSize={12} fill={slopeForces.G.color} fontWeight="bold">G</text>

              {/* 支持力 FN */}
              <VectorArrow originDesign={{ x: slopeGeom.blockCenter.cx, y: slopeGeom.blockCenter.cy }}
                vector={{ x: slopeForces.FN.end.cx - slopeGeom.blockCenter.cx, y: -(slopeForces.FN.end.cy - slopeGeom.blockCenter.cy) }}
                type="force" arrowType="physical-schematic" sceneScale={sceneScale} color={slopeForces.FN.color} strokeWidth={3}
                pixelLength={Math.hypot(slopeForces.FN.end.cx - slopeGeom.blockCenter.cx, slopeForces.FN.end.cy - slopeGeom.blockCenter.cy)} />
              <text x={slopeForces.FN.end.cx + 8} y={slopeForces.FN.end.cy - 6} fontSize={12} fill={slopeForces.FN.color} fontWeight="bold">FN</text>

              {/* 摩擦力 f */}
              <VectorArrow originDesign={{ x: slopeGeom.blockCenter.cx, y: slopeGeom.blockCenter.cy }}
                vector={{ x: slopeForces.f.end.cx - slopeGeom.blockCenter.cx, y: -(slopeForces.f.end.cy - slopeGeom.blockCenter.cy) }}
                type="force" arrowType="physical-schematic" sceneScale={sceneScale} color={slopeForces.f.color} strokeWidth={3}
                pixelLength={Math.hypot(slopeForces.f.end.cx - slopeGeom.blockCenter.cx, slopeForces.f.end.cy - slopeGeom.blockCenter.cy)} />
              <text x={slopeForces.f.end.cx - 8} y={slopeForces.f.end.cy - 12} fontSize={12} fill={slopeForces.f.color} fontWeight="bold">f</text>
            </g>
          )}
        </g>
      )}

      <defs>
        <VectorDefs colors={[PHYSICS_COLORS.forceNet, PHYSICS_COLORS.appliedForce, PHYSICS_COLORS.tension, PHYSICS_COLORS.forceComponent, '#ef4444', '#3b82f6', '#10b981']} />
      </defs>
    </AnimationSvgCanvas>
  )
}
