import React, { useMemo } from 'react'
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_STYLE, SCENE_COLORS } from '@/theme/physics'
import { Block, PhysicsGround, VectorArrow, VectorDefs } from '@/components/Physics'
import { Spring } from '@/components/UI'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateElasticTensionState } from '@/physics/dynamics/spring-force'

export const ElasticTensionForceScene: React.FC = () => {
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const { params, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      showVectors: s.showVectors,
    })),
  )

  const m = params.m ?? 1.5
  const kRope = params.kRope ?? 150

  // 物理计算
  const { tensionForce, gravityForce, displacement } = useMemo(() => {
    return calculateElasticTensionState(m, kRope)
  }, [m, kRope])

  // 布局尺寸
  const ceilY = 40
  const blockW = 100
  const blockH = 70
  const blockX = 220
  const blockY = 150

  // 放大镜参数
  const zoomCX = 620
  const zoomCY = 150
  const zoomR = 85

  // 放大比例：形变量 1m 对应 150 像素的拉伸量
  const microScale = 150
  const dy = displacement * microScale

  // 宏观力矢量大小
  const forceScale = 4 // 1N 对应 4 像素
  const F_grav_len = gravityForce * forceScale
  const F_tension_len = tensionForce * forceScale

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <defs>
        <VectorDefs colors={[PHYSICS_COLORS.tension, PHYSICS_COLORS.gravity]} />
        <clipPath id="zoom-clip-rope">
          <circle cx={zoomCX} cy={zoomCY} r={zoomR} />
        </clipPath>
      </defs>

      {/* ─── 左侧：宏观物理场景 ─── */}
      {/* 天花板 */}
      <PhysicsGround
        x={20}
        y={ceilY}
        width={400}
        type="wall"
        wall={{ height: 15, hatchCount: 16, hatchSide: 'right' }}
        appearance={{ color: PHYSICS_COLORS.axis, showHatch: true }}
      />

      {/* 悬挂细绳 */}
      <line
        x1={blockX}
        y1={ceilY + 15}
        x2={blockX}
        y2={blockY}
        stroke={SCENE_COLORS.surface.ropeActive}
        strokeWidth={2}
      />

      {/* 悬吊物体 */}
      <Block
        x={blockX - blockW / 2}
        y={blockY}
        width={blockW}
        height={blockH}
        type="standard"
        label={`m = ${m.toFixed(1)}kg`}
        font={font}
        showCenterOfMass
        translucent
      />

      {/* 宏观力矢量 */}
      {showVectors && (
        <g>
          {/* 重力 G */}
          <VectorArrow
            originPixel={{ x: blockX, y: blockY + blockH / 2 }}
            vector={{ x: 0, y: -gravityForce }}
            type="gravity"
            sceneScale={IDENTITY_SCENE_SCALE}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            pixelLength={F_grav_len}
            label="G"
            font={font}
          />
          {/* 绳子拉力 T */}
          <VectorArrow
            originPixel={{ x: blockX, y: blockY }}
            vector={{ x: 0, y: tensionForce }}
            type="tension"
            sceneScale={IDENTITY_SCENE_SCALE}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            pixelLength={F_tension_len}
            label="T"
            font={font}
          />
        </g>
      )}

      {/* ─── 中间：形变放大指示虚线 ─── */}
      <path
        d={`M ${blockX} ${(ceilY + blockY) / 2} L ${zoomCX - zoomR + 10} ${zoomCY}`}
        stroke="#94a3b8"
        strokeWidth={1}
        strokeDasharray="4,4"
        opacity={0.8}
      />
      <circle cx={blockX} cy={(ceilY + blockY) / 2} r={4} fill="#64748b" />

      {/* ─── 右侧：微观放大镜场景 ─── */}
      <g clipPath="url(#zoom-clip-rope)">
        <circle cx={zoomCX} cy={zoomCY} r={zoomR} fill="#f8fafc" />

        {/* 绳子微观分子链：绘制固定在顶部的原子和在拉力下向下移动的原子 */}
        <g>
          {/* 顶端原子（固定） */}
          <circle cx={zoomCX} cy={zoomCY - 50} r={10} fill="#64748b" opacity={0.8} stroke="#475569" strokeWidth={1} />
          <text x={zoomCX} y={zoomCY - 47} fontSize={font(8)} fill="white" fontWeight="bold" textAnchor="middle">悬点</text>

          {/* 底端原子（随拉伸位移） */}
          <circle cx={zoomCX} cy={zoomCY + 30 + dy} r={10} fill="#f59e0b" opacity={0.8} stroke="#d97706" strokeWidth={1} />
          <text x={zoomCX} y={zoomCY + 33 + dy} fontSize={font(8)} fill="white" fontWeight="bold" textAnchor="middle">重物</text>
        </g>

        {/* 分子间的弹性键 (微弹簧) */}
        <Spring
          x1={zoomCX}
          y1={zoomCY - 40}
          x2={zoomCX}
          y2={zoomCY + 20 + dy}
          coils={7}
          radius={8}
          isLightWeight
        />

        {/* 局部受力与位移说明 */}
        <text x={zoomCX} y={zoomCY - 68} fontSize={font(10)} fill="#475569" fontWeight="bold" textAnchor="middle">
          微观细绳分子受拉
        </text>
        <text x={zoomCX} y={zoomCY + 72} fontSize={font(9)} fill="#0284c7" fontWeight="bold" textAnchor="middle">
          伸长量 Δx = {(displacement * 100).toFixed(2)} cm
        </text>
      </g>

      {/* 放大镜外金属边框 */}
      <circle
        cx={zoomCX}
        cy={zoomCY}
        r={zoomR}
        fill="none"
        stroke="#64748b"
        strokeWidth={3}
        filter="drop-shadow(0px 4px 6px rgba(0,0,0,0.15))"
      />
      <text
        x={zoomCX}
        y={zoomCY - zoomR - 8}
        fontSize={font(11)}
        fill="#64748b"
        fontWeight="bold"
        textAnchor="middle"
      >
        细绳受拉放大 (×200)
      </text>
    </AnimationSvgCanvas>
  )
}

export default ElasticTensionForceScene
