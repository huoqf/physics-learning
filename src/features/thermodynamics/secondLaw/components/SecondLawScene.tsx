import { useEffect, useMemo } from 'react'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import { VectorArrow } from '@/components/Physics'
import { SECOND_LAW_COLORS, SCENE_COLORS, STROKE, FONT } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { temperatureToColor, type Particle, type Scenario } from '@/physics/secondLaw'
import { PARTICLE_COUNT, PHYSICAL_CONTAINER } from '../hooks/useSecondLawPhysics'

// ─── 常量 ─────────────────────────────────────────────────────────────
const T_HOT = 500
const T_COLD = 200

interface SecondLawSceneProps {
  scenario: Scenario
  particlesRef: React.MutableRefObject<Particle[]>
  partitionProgressRef: React.MutableRefObject<number>
  entropy: { lnOmega: number; normalizedEntropy: number }
  isEquilibrium: boolean
  sceneScale: SceneScale
  vp: { visibleX: number; visibleY: number; visibleW: number; visibleH: number; transform: string }
  canvasSize: { font: (size: number) => number }
  setupFrame: () => CanvasRenderingContext2D | null
  designToPixel: (px: number, py: number) => { px: number; py: number }
  time: number
}

export function SecondLawScene({
  scenario,
  particlesRef,
  partitionProgressRef,
  entropy,
  isEquilibrium,
  sceneScale,
  vp,
  canvasSize,
  setupFrame,
  designToPixel,
  time,
}: SecondLawSceneProps) {
  const { font } = canvasSize

  // ─── 布局计算 (物理坐标 → 设计坐标) ──────────────────────────────
  const containerBottomLeft = useMemo(
    () => worldToDesign(PHYSICAL_CONTAINER.xMin, PHYSICAL_CONTAINER.yMin, sceneScale),
    [sceneScale]
  )
  const containerTopRight = useMemo(
    () => worldToDesign(PHYSICAL_CONTAINER.xMax, PHYSICAL_CONTAINER.yMax, sceneScale),
    [sceneScale]
  )

  const cx = containerBottomLeft.px
  const cy = containerTopRight.py
  const cw = containerTopRight.px - containerBottomLeft.px
  const ch = containerBottomLeft.py - containerTopRight.py
  const cmidX = cx + cw / 2

  // ─── Canvas 渲染 ──────────────────────────────────────────────────
  useEffect(() => {
    const ctx = setupFrame()
    if (!ctx) return

    const pBL = designToPixel(cx, containerBottomLeft.py)
    const pTR = designToPixel(containerTopRight.px, cy)

    const px = pBL.px
    const py = pTR.py
    const pw = pTR.px - pBL.px
    const ph = pBL.py - pTR.py
    const pmidX = px + pw / 2

    // 绘制容器背景
    if (scenario === 'gas-diffusion') {
      ctx.fillStyle = SECOND_LAW_COLORS.containerFill
      ctx.fillRect(px, py, pw / 2, ph)

      const midVal = PHYSICAL_CONTAINER.xMin + (PHYSICAL_CONTAINER.xMax - PHYSICAL_CONTAINER.xMin) / 2
      const rightCount = particlesRef.current.filter((p) => p.x >= midVal).length
      const diffusionRatio = rightCount / (PARTICLE_COUNT / 2)
      const vacuumAlpha = 0.15 + (0.85 - 0.15) * Math.min(1, diffusionRatio)

      ctx.fillStyle = SECOND_LAW_COLORS.vacuum
      ctx.globalAlpha = 0.15
      ctx.fillRect(pmidX, py, pw / 2, ph)
      ctx.fillStyle = SECOND_LAW_COLORS.containerFill
      ctx.globalAlpha = vacuumAlpha * 0.4
      ctx.fillRect(pmidX, py, pw / 2, ph)
      ctx.globalAlpha = 1
    } else {
      const grad = ctx.createLinearGradient(px, 0, px + pw, 0)
      grad.addColorStop(0, SECOND_LAW_COLORS.hotZone)
      grad.addColorStop(0.42, SECOND_LAW_COLORS.hotZone)
      grad.addColorStop(0.58, SECOND_LAW_COLORS.coldZone)
      grad.addColorStop(1, SECOND_LAW_COLORS.coldZone)
      ctx.fillStyle = grad
      ctx.fillRect(px, py, pw, ph)
    }

    // 绘制粒子
    const particleRadius = Math.max(1.8, Math.min(3, pw / PARTICLE_COUNT * 0.8))
    for (const p of particlesRef.current) {
      const designPos = worldToDesign(p.x, p.y, sceneScale)
      const pixelPos = designToPixel(designPos.px, designPos.py)

      if (scenario === 'heat-conduction') {
        ctx.fillStyle = temperatureToColor(p.temperature, T_HOT, T_COLD)
      } else {
        ctx.fillStyle = SECOND_LAW_COLORS.coldParticle
      }
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.arc(pixelPos.px, pixelPos.py, particleRadius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, cx, cy, containerBottomLeft.py, containerTopRight.px, designToPixel, sceneScale, time, setupFrame])

  const partitionProgress = partitionProgressRef.current

  return (
    <>
      {/* 场景标题 */}
      <text
        x={vp.visibleX + vp.visibleW / 2}
        y={vp.visibleY + vp.visibleH * 0.02 + 10}
        fontSize={font(13)}
        fontWeight="bold"
        fill={colors.neutral[800]}
        textAnchor="middle"
        fontFamily={FONT.family}
      >
        {scenario === 'heat-conduction'
          ? '演示一：热量传导方向（自发过程）'
          : '演示二：气体自由膨胀（自发过程）'}
      </text>

      {/* 标注箭头 */}
      {!isEquilibrium && (
        <VectorArrow
          originDesign={{ x: cmidX - 60, y: cy - 14 }}
          vector={{ x: 120 / sceneScale.scaleX, y: 0 }}
          type="velocity"
          arrowType="visual-only"
          sceneScale={sceneScale}
          label={scenario === 'heat-conduction' ? '自发热传导方向 Q' : '气体自发自由膨胀'}
          color={scenario === 'heat-conduction' ? SECOND_LAW_COLORS.hotParticle : SECOND_LAW_COLORS.entropyLine}
          font={font}
        />
      )}

      {/* 容器边框 */}
      <rect
        x={cx}
        y={cy}
        width={cw}
        height={ch}
        fill="none"
        stroke={SECOND_LAW_COLORS.containerWall}
        strokeWidth={STROKE.objectLine}
        rx={4}
      />

      {/* 隔板（气体扩散场景） */}
      {scenario === 'gas-diffusion' && (
        <line
          x1={cmidX}
          y1={cy + ch * partitionProgress}
          x2={cmidX}
          y2={cy + ch}
          stroke={SECOND_LAW_COLORS.partition}
          strokeWidth={STROKE.objectLine + 1}
        />
      )}

      {/* 热传导隔板 */}
      {scenario === 'heat-conduction' && (
        <line
          x1={cmidX}
          y1={cy}
          x2={cmidX}
          y2={cy + ch}
          stroke={SECOND_LAW_COLORS.partition}
          strokeWidth={1}
          opacity={0.4}
        />
      )}

      {/* 左右温度/粒子标注 */}
      {scenario === 'heat-conduction' ? (
        <>
          <text
            x={cx + cw * 0.25}
            y={cy + ch + 16}
            fontSize={font(10)}
            fill={SECOND_LAW_COLORS.hotParticle}
            textAnchor="middle"
            fontFamily={FONT.family}
          >
            高温端 (500K)
          </text>
          <text
            x={cx + cw * 0.75}
            y={cy + ch + 16}
            fontSize={font(10)}
            fill={SECOND_LAW_COLORS.coldParticle}
            textAnchor="middle"
            fontFamily={FONT.family}
          >
            低温端 (200K)
          </text>
        </>
      ) : (
        <>
          <text
            x={cx + cw * 0.25}
            y={cy + ch + 16}
            fontSize={font(10)}
            fill={SECOND_LAW_COLORS.coldParticle}
            textAnchor="middle"
            fontFamily={FONT.family}
          >
            气体（左侧）
          </text>
          <text
            x={cx + cw * 0.75}
            y={cy + ch + 16}
            fontSize={font(10)}
            fill={colors.neutral[400]}
            textAnchor="middle"
            fontFamily={FONT.family}
          >
            真空（右侧）
          </text>
        </>
      )}

      {/* 状态标注 */}
      <text
        x={vp.visibleX + vp.visibleW / 2}
        y={cy + ch + 32}
        fontSize={font(11)}
        fill={isEquilibrium ? SECOND_LAW_COLORS.equilibriumLabel : SCENE_COLORS.materials.structStrokeLight}
        textAnchor="middle"
        fontWeight={isEquilibrium ? 'bold' : 'normal'}
        fontFamily={FONT.family}
      >
        {isEquilibrium
          ? '✓ 已达热平衡 / 均匀分布'
          : `无序度 S = ${entropy.normalizedEntropy.toFixed(3)}  |  Ω = e^${entropy.lnOmega.toFixed(1)}`}
      </text>
    </>
  )
}
