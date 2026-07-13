import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VectorArrow, Block, PhysicsGround, Incline } from '@/components/Physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { CANVAS_COLORS, SCENE_COLORS } from '@/theme/physics'
import type { SceneScale } from '@/scene/SceneScale'
import { useInclinedPlaneSimulation } from './inclined-plane/useInclinedPlaneSimulation'

const DESIGN = CANVAS_PRESETS.splitH // 420 × 650

/** 布局比例常量 — 所有位置基于 vp.visibleH / vp.visibleW 动态计算，禁止硬编码绝对像素 */
const LAYOUT = {
  cornerXRatio: 0.14,    // 斜面直角顶点 X 占画布宽度
  groundYRatio: 0.80,    // 水平地面 Y 占画布高度
  maxWidthRatio: 0.77,   // 最大绘制宽度占画布宽度
  maxHeightRatio: 0.65,  // 最大绘制高度占画布高度
  boxSize: 36,            // px：滑块边长（尺寸常量，非位置）
  vectorScale: 1.8,       // px/N：力的像素缩放系数
} as const

// 像素尺度的虚拟 SceneScale，直接透传像素大小
const PIXEL_SCALE: SceneScale = {
  originX: 0,
  originY: 0,
  scaleX: 1,
  scaleY: 1,
  scale: 1,
  maxVectorLength: 100,
  refMagnitudes: {
    gravity: 50,
    normalForce: 50,
    friction: 50,
    appliedForce: 50,
    force: 50
  }
}

export default function InclinedPlaneAnimation() {
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: DESIGN })

  // 物理斜面底边宽 2.4 米
  const {
    theta,
    m,
    showDecomposition,
    simState,
    physicsRes,
    boardWidthPhys,
  } = useInclinedPlaneSimulation({ boardWidthPhysical: 2.4 })

  const angleRad = (theta * Math.PI) / 180

  // 1. 基于 vp 的布局位置（比例 → 像素）
  const cornerX = vp.visibleW * LAYOUT.cornerXRatio
  const groundY = vp.visibleH * LAYOUT.groundYRatio
  const W_max = vp.visibleW * LAYOUT.maxWidthRatio
  const H_max = vp.visibleH * LAYOUT.maxHeightRatio

  // 动态缩放计算，保证斜面在任意角度下不超出可视区域
  const boardHeightPhys = boardWidthPhys * Math.tan(angleRad)
  const scale = Math.min(W_max / boardWidthPhys, H_max / boardHeightPhys)

  // 像素尺寸
  const W_px = boardWidthPhys * scale
  const H_px = boardHeightPhys * scale
  const x_px = simState.x * scale

  // 2. 局部坐标系: 顶点在 (cornerX, groundY - H_px)，旋转 theta 度后 X 轴沿斜边向下
  const pivotX = cornerX
  const pivotY = groundY - H_px

  // 世界坐标系滑块质心（用于力的起点）
  const blockWorldX = pivotX + x_px * Math.cos(angleRad) + (LAYOUT.boxSize / 2) * Math.sin(angleRad)
  const blockWorldY = pivotY + x_px * Math.sin(angleRad) - (LAYOUT.boxSize / 2) * Math.cos(angleRad)

  // 3. 各力大小与矢量长度
  const weight = m * physicsRes.FN / (Math.cos(angleRad) || 1) // mg
  const G_px = weight * LAYOUT.vectorScale
  const FN_px = physicsRes.FN * LAYOUT.vectorScale
  const Ff_px = physicsRes.Ff * LAYOUT.vectorScale

  // 4. 重力在平行和垂直斜面方向的分解分量像素值
  const G_parallel_px = weight * Math.sin(angleRad) * LAYOUT.vectorScale
  const G_normal_px = weight * Math.cos(angleRad) * LAYOUT.vectorScale

  const halfBox = LAYOUT.boxSize / 2

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      {/* 1. 地面与基座 */}
      <PhysicsGround
        x={10}
        y={groundY}
        width={DESIGN.width - 20}
        type="ground"
        appearance={{
          showHatch: true,
          color: SCENE_COLORS.materials.structStrokeMid,
        }}
      />

      <Incline
        x0={cornerX}
        y0={groundY}
        width={W_px}
        height={H_px}
      />

      {/* 2. 斜面倾角弧度标注 */}
      {theta > 3 && (
        <g>
          <path
            d={`M ${cornerX + W_px - 28} ${groundY} A 28 28 0 0 0 ${cornerX + W_px - 28 * Math.cos(angleRad)} ${groundY - 28 * Math.sin(angleRad)}`}
            fill="none"
            stroke={CANVAS_COLORS.annotation}
            strokeWidth={1.2}
          />
          <text
            x={cornerX + W_px - 36}
            y={groundY - 8}
            fontSize={canvasSize.font(10)}
            fill={CANVAS_COLORS.annotation}
            fontWeight="bold"
            textAnchor="end"
          >
            θ = {theta}°
          </text>
        </g>
      )}

      {/* 3. 滑块 Block (局部坐标系内绘制) */}
      <g transform={`translate(${pivotX}, ${pivotY}) rotate(${theta})`}>
        <Block
          x={x_px - halfBox}
          y={-LAYOUT.boxSize}
          width={LAYOUT.boxSize}
          height={LAYOUT.boxSize}
          type="wood"
          label={`m = ${m.toFixed(1)}`}
          stroke={CANVAS_COLORS.objectStroke}
          strokeWidth={1.5}
        />
      </g>

      {/* 4. 重力正交分解辅助线 (在滑块之上渲染，确保虚线不被遮挡) */}
      {showDecomposition && (
        <g transform={`translate(${pivotX}, ${pivotY}) rotate(${theta})`}>
          {/* 平行斜面投影虚线 (mg·sinθ) */}
          <line
            x1={x_px}
            y1={-halfBox}
            x2={x_px + G_parallel_px}
            y2={-halfBox}
            stroke={CANVAS_COLORS.annotation}
            strokeWidth={1.5}
            strokeDasharray="5,3"
          />
          {/* 垂直斜面投影虚线 (mg·cosθ) */}
          <line
            x1={x_px}
            y1={-halfBox}
            x2={x_px}
            y2={-halfBox + G_normal_px}
            stroke={CANVAS_COLORS.annotation}
            strokeWidth={1.5}
            strokeDasharray="5,3"
          />
          {/* 封闭边界线 1 */}
          <line
            x1={x_px + G_parallel_px}
            y1={-halfBox}
            x2={x_px + G_parallel_px}
            y2={-halfBox + G_normal_px}
            stroke={CANVAS_COLORS.annotation}
            strokeWidth={1}
            strokeDasharray="4,3"
            opacity={0.5}
          />
          {/* 封闭边界线 2 */}
          <line
            x1={x_px}
            y1={-halfBox + G_normal_px}
            x2={x_px + G_parallel_px}
            y2={-halfBox + G_normal_px}
            stroke={CANVAS_COLORS.annotation}
            strokeWidth={1}
            strokeDasharray="4,3"
            opacity={0.5}
          />

          {/* 分解分量文字标注 */}
          <text
            x={x_px + G_parallel_px / 2}
            y={-halfBox - 8}
            fontSize={canvasSize.font(10)}
            fill={CANVAS_COLORS.annotation}
            fontWeight="bold"
            textAnchor="middle"
          >
            mg·sinθ
          </text>
          <text
            x={x_px - 10}
            y={-halfBox + G_normal_px / 2 + 4}
            fontSize={canvasSize.font(10)}
            fill={CANVAS_COLORS.annotation}
            fontWeight="bold"
            textAnchor="end"
          >
            mg·cosθ
          </text>
        </g>
      )}

      {/* 5. 核心受力分析矢量箭头 (在世界坐标系绘制，通过 pixelLength 固定像素大小) */}
      {/* 重力 G: 物理方向垂直向下 (y 负方向) */}
      <VectorArrow
        origin={{ x: blockWorldX, y: -blockWorldY }}
        vector={{ x: 0, y: -weight }}
        pixelLength={G_px}
        type="gravity"
        sceneScale={PIXEL_SCALE}
        label="G"
        font={canvasSize.font}
        glow
      />

      {/* 支持力 FN: 物理方向垂直斜面向上 (右上分量) */}
      <VectorArrow
        origin={{ x: blockWorldX, y: -blockWorldY }}
        vector={{
          x: physicsRes.FN * Math.sin(angleRad),
          y: physicsRes.FN * Math.cos(angleRad),
        }}
        pixelLength={FN_px}
        type="normalForce"
        sceneScale={PIXEL_SCALE}
        label="FN"
        font={canvasSize.font}
        glow
      />

      {/* 摩擦力 Ff: 物理方向沿斜面向上 (左上分量) */}
      {physicsRes.Ff > 0.1 && (
        <VectorArrow
          origin={{ x: blockWorldX, y: -blockWorldY }}
          vector={{
            x: -physicsRes.Ff * Math.cos(angleRad),
            y: physicsRes.Ff * Math.sin(angleRad),
          }}
          pixelLength={Ff_px}
          type="friction"
          sceneScale={PIXEL_SCALE}
          label="Ff"
          font={canvasSize.font}
          glow
        />
      )}
    </AnimationSvgCanvas>
  )
}
