import React, { useMemo } from 'react'
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_STYLE, CANVAS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { Block, PhysicsGround, VectorArrow, VectorDefs } from '@/components/Physics'
import { Spring } from '@/components/UI'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateElasticNormalForceState } from '@/physics/dynamics/spring-force'

export const ElasticNormalForceScene: React.FC = () => {
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
  const kAtoms = params.kAtoms ?? 120

  // 物理计算
  const { normalForce, gravityForce, displacement } = useMemo(() => {
    return calculateElasticNormalForceState(m, kAtoms)
  }, [m, kAtoms])

  // 布局尺寸
  const groundY = 220
  const blockW = 100
  const blockH = 70
  const blockX = 220

  // 放大镜参数
  const zoomCX = 620
  const zoomCY = 150
  const zoomR = 85

  // 放大比例：形变量 1m 对应 150 像素的微观压缩量
  const microScale = 150
  const dy = displacement * microScale

  // 宏观力矢量大小
  const forceScale = 4 // 1N 对应 4 像素
  const F_grav_len = gravityForce * forceScale
  const F_normal_len = normalForce * forceScale

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <defs>
        <VectorDefs colors={[PHYSICS_COLORS.normalForce, PHYSICS_COLORS.gravity]} />
        {/* 放大镜圆形裁剪区域 */}
        <clipPath id="zoom-clip">
          <circle cx={zoomCX} cy={zoomCY} r={zoomR} />
        </clipPath>
      </defs>

      {/* ─── 左侧：宏观物理场景 ─── */}
      <PhysicsGround
        x={20}
        y={groundY}
        width={400}
        type="ground"
        appearance={{ color: PHYSICS_COLORS.axis, showBaseShadow: true }}
      />

      <Block
        x={blockX - blockW / 2}
        y={groundY - blockH}
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
            originDesign={{ x: blockX, y: groundY - blockH / 2 }}
            vector={{ x: 0, y: -gravityForce }}
            type="gravity"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            pixelLength={F_grav_len}
            label="G"
            font={font}
          />
          {/* 支持力 FN */}
          <VectorArrow
            originDesign={{ x: blockX, y: groundY }}
            vector={{ x: 0, y: normalForce }}
            type="normalForce"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            pixelLength={F_normal_len}
            label="FN"
            font={font}
          />
        </g>
      )}

      {/* ─── 中间：形变放大指示虚线 ─── */}
      <path
        d={`M ${blockX + blockW / 2} ${groundY} L ${zoomCX - zoomR + 10} ${zoomCY}`}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={1}
        strokeDasharray="4,4"
        opacity={0.8}
      />
      <circle cx={blockX + blockW / 2} cy={groundY} r={4} fill={CANVAS_COLORS.textMuted} />

      {/* ─── 右侧：微观放大镜场景 ─── */}
      {/* 放大镜内背景与结构 */}
      <g clipPath="url(#zoom-clip)">
        <circle cx={zoomCX} cy={zoomCY} r={zoomR} fill={CANVAS_COLORS.objectFillNeutral} />

        {/* 微观接触分界线 */}
        <line
          x1={zoomCX - zoomR}
          y1={zoomCY + 15}
          x2={zoomCX + zoomR}
          y2={zoomCY + 15}
          stroke={CANVAS_COLORS.gridSubtle}
          strokeWidth={1.5}
          strokeDasharray="3,3"
        />

        {/* 桌面底层原子（固定原子 — 浅灰金属） */}
        <g>
          {[zoomCX - 50, zoomCX, zoomCX + 50].map((x, idx) => (
            <g key={`blue-${idx}`}>
              <circle cx={x} cy={zoomCY + 50} r={10} fill={SCENE_COLORS.materials.structFillPale} opacity={0.8} stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={1} />
              <text x={x} y={zoomCY + 53} fontSize={font(8)} fill="white" fontWeight="bold" textAnchor="middle">基底</text>
            </g>
          ))}
        </g>

        {/* 物体底层原子（随重压向下位移 — 深灰金属） */}
        <g>
          {[zoomCX - 50, zoomCX, zoomCX + 50].map((x, idx) => (
            <g key={`green-${idx}`}>
              <circle cx={x} cy={zoomCY - 30 + dy} r={10} fill={SCENE_COLORS.materials.structStrokeMid} opacity={0.8} stroke={SCENE_COLORS.materials.structStroke} strokeWidth={1} />
              <text x={x} y={zoomCY - 27 + dy} fontSize={font(8)} fill="white" fontWeight="bold" textAnchor="middle">物体</text>
            </g>
          ))}
        </g>

        {/* 原子间的弹性键 (微弹簧) */}
        {[zoomCX - 50, zoomCX, zoomCX + 50].map((x, idx) => (
          <Spring
            key={`atom-spring-${idx}`}
            x1={x}
            y1={zoomCY + 40}
            x2={x}
            y2={zoomCY - 20 + dy}
            coils={5}
            radius={7}
            isLightWeight
          />
        ))}

        {/* 局部受力与位移说明 */}
        <text x={zoomCX} y={zoomCY - 50} fontSize={font(10)} fill={CANVAS_COLORS.labelTextLight} fontWeight="bold" textAnchor="middle">
          微观原子弹簧受压
        </text>
        <text x={zoomCX} y={zoomCY + 72} fontSize={font(9)} fill={CANVAS_COLORS.labelText} fontWeight="bold" textAnchor="middle">
          压缩量 x = {(displacement * 100).toFixed(2)} cm
        </text>
      </g>

      {/* 放大镜外金属边框 */}
      <circle
        cx={zoomCX}
        cy={zoomCY}
        r={zoomR}
        fill="none"
        stroke={CANVAS_COLORS.textMuted}
        strokeWidth={3}
        filter="drop-shadow(0px 4px 6px rgba(0,0,0,0.15))"
      />
      <text
        x={zoomCX}
        y={zoomCY - zoomR - 8}
        fontSize={font(11)}
        fill={CANVAS_COLORS.textMuted}
        fontWeight="bold"
        textAnchor="middle"
      >
        微观接触面放大 (×200)
      </text>
    </AnimationSvgCanvas>
  )
}

export default ElasticNormalForceScene
