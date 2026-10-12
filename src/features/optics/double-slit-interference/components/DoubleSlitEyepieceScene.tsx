import React, { useMemo } from 'react'
import { Micrometer } from '@/components/Physics'
import { CANVAS_COLORS, PHYSICS_COLORS, SCENE_COLORS, withAlpha } from '@/theme/physics'
import { hexToRgb } from '@/utils'
import type { DoubleSlitInterferencePhysicsResult } from '../hooks/useDoubleSlitInterferencePhysics'

interface DoubleSlitEyepieceSceneProps {
  physics: DoubleSlitInterferencePhysicsResult
  wavelength: number
  font: (size: number) => number
}

/**
 * 测微目镜视场与手轮读数场景组件 (DoubleSlitEyepieceScene)
 *
 * 规范展示高考实验核心环节：
 * 1. 测微目镜视场：观察干涉条纹，十字分划丝瞄准亮条纹中心；
 * 2. 螺旋测微器读数：固定刻度与可动刻度读数及估读；
 * 3. 测量数据记录与逐差计算看板。
 */
export const DoubleSlitEyepieceScene: React.FC<DoubleSlitEyepieceSceneProps> = ({
  physics,
  wavelength,
  font,
}) => {
  const {
    fringeSpacing,
    wavelengthColor,
    baseReadingMm,
    x1,
    xn,
    activeFringe,
    measuredDeltaX,
    measuredWavelength,
    currentReading,
    relativeErrorPercent,
  } = physics

  // ── 1. 目镜圆形视场参数 ──
  const fieldCenterX = 185
  const fieldCenterY = 425
  const fieldRadius = 145

  // 视场内条纹视觉像素映射比例（使条纹在目镜圆筒中清晰可辨）
  // 1 mm 物理位移对应约 28 px 视场像素
  const pxPerMm = 28
  const fringeSpacingPx = Math.max(12, Math.min(80, fringeSpacing * pxPerMm))

  // 视场内中心亮纹处于视场正中心偏左位置，使第 1~7 级亮纹均能容纳在圆内
  const zeroFringeX = fieldCenterX - 2 * fringeSpacingPx

  // 动态生成目镜视场干涉条纹背景
  const stripeDataUrl = useMemo(() => {
    if (typeof document === 'undefined') return ''
    const canvas = document.createElement('canvas')
    canvas.width = fieldRadius * 2
    canvas.height = fieldRadius * 2
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    const rgb = hexToRgb(wavelengthColor) || { r: 255, g: 0, b: 0 }
    const imgData = ctx.createImageData(canvas.width, canvas.height)

    // 在水平方向按余弦平方分布生成干涉亮暗条纹
    for (let x = 0; x < canvas.width; x++) {
      const dx = x - (zeroFringeX - (fieldCenterX - fieldRadius))
      const val = Math.cos((Math.PI * dx) / fringeSpacingPx)
      const intensity = val * val
      for (let y = 0; y < canvas.height; y++) {
        // 圆形视场裁剪
        const rx = x - fieldRadius
        const ry = y - fieldRadius
        const idx = (y * canvas.width + x) * 4
        if (rx * rx + ry * ry <= fieldRadius * fieldRadius) {
          imgData.data[idx] = Math.round(rgb.r * intensity * 0.9)
          imgData.data[idx + 1] = Math.round(rgb.g * intensity * 0.9)
          imgData.data[idx + 2] = Math.round(rgb.b * intensity * 0.9)
          imgData.data[idx + 3] = 255
        } else {
          imgData.data[idx + 3] = 0
        }
      }
    }
    ctx.putImageData(imgData, 0, 0)
    return canvas.toDataURL()
  }, [wavelengthColor, fringeSpacingPx, fieldRadius, zeroFringeX, fieldCenterX])

  // 当前十字丝所处 X 坐标
  const readingOffsetMm = currentReading - baseReadingMm
  const crosshairX = zeroFringeX + readingOffsetMm * pxPerMm

  // 拆解当前读数（用于文字标注）
  const fixedMm = Math.floor(currentReading)
  const hasHalfMm = currentReading - fixedMm >= 0.5
  const thimbleValue = ((currentReading % 0.5) / 0.01).toFixed(1)

  const targetFringe = physics.targetFringe ?? 4
  const subDigits = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉']
  const subN = subDigits[targetFringe] ?? String(targetFringe)

  return (
    <g className="eyepiece-scene">
      {/* ─── 1. 左侧：测微目镜圆形视场 (x: 20 ~ 350) ─── */}
      <g>
        {/* 外侧卡片底板 */}
        <rect
          x={20}
          y={215}
          width={330}
          height={415}
          rx={8}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth={1.2}
        />
        <text
          x={35}
          y={238}
          fontSize={font(13)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
        >
          测微目镜视场（十字分划丝瞄准）
        </text>

        {/* 目镜金属外圆环外框 */}
        <circle
          cx={fieldCenterX}
          cy={fieldCenterY}
          r={fieldRadius + 8}
          fill={SCENE_COLORS.materials.structStrokeDark}
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth={3}
        />
        <circle
          cx={fieldCenterX}
          cy={fieldCenterY}
          r={fieldRadius + 2}
          fill={CANVAS_COLORS.black}
        />

        {/* 视场内干涉条纹 */}
        {stripeDataUrl && (
          <image
            href={stripeDataUrl}
            x={fieldCenterX - fieldRadius}
            y={fieldCenterY - fieldRadius}
            width={fieldRadius * 2}
            height={fieldRadius * 2}
          />
        )}

        {/* 视场内条纹标号辅助提示 */}
        {[-1, 0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
          const kx = zeroFringeX + k * fringeSpacingPx
          if (Math.abs(kx - fieldCenterX) > fieldRadius - 15) return null
          return (
            <text
              key={k}
              x={kx}
              y={fieldCenterY + fieldRadius - 16}
              fontSize={font(9)}
              fill={withAlpha(CANVAS_COLORS.white, 0.7)}
              textAnchor="middle"
            >
              {k === 0 ? '中央' : `第${k}条`}
            </text>
          )
        })}

        {/* 十字分划板 (分划板中心细黑丝 + 红色高亮准星) */}
        {crosshairX >= fieldCenterX - fieldRadius + 5 &&
          crosshairX <= fieldCenterX + fieldRadius - 5 && (
            <g>
              {/* 竖直分划丝（高考核心：对准条纹中心） */}
              <line
                x1={crosshairX}
                y1={fieldCenterY - fieldRadius + 4}
                x2={crosshairX}
                y2={fieldCenterY + fieldRadius - 4}
                stroke={PHYSICS_COLORS.alertRed}
                strokeWidth={1.5}
              />
              {/* 水平辅助丝 */}
              <line
                x1={fieldCenterX - fieldRadius + 4}
                y1={fieldCenterY}
                x2={fieldCenterX + fieldRadius - 4}
                y2={fieldCenterY}
                stroke={PHYSICS_COLORS.alertRed}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {/* 中心十字准星交点小圆环 */}
              <circle
                cx={crosshairX}
                cy={fieldCenterY}
                r={4}
                fill="none"
                stroke={PHYSICS_COLORS.alertRed}
                strokeWidth={1.5}
              />
              <text
                x={crosshairX}
                y={fieldCenterY - fieldRadius + 22}
                fontSize={font(10)}
                fill={PHYSICS_COLORS.alertRed}
                textAnchor="middle"
                fontWeight="bold"
              >
                分划线
              </text>
            </g>
          )}

        {/* 视场底部状态文字 */}
        <rect
          x={35}
          y={585}
          width={300}
          height={32}
          rx={4}
          fill={withAlpha(CANVAS_COLORS.black, 0.6)}
        />
        <text
          x={185}
          y={605}
          fontSize={font(11)}
          fill={PHYSICS_COLORS.alertRed}
          textAnchor="middle"
          fontWeight="bold"
        >
          {activeFringe > 0
            ? `十字丝瞄准第 ${activeFringe} 条亮条纹 (x = ${currentReading.toFixed(3)} mm)`
            : `十字丝位于中央基准 (x = ${currentReading.toFixed(3)} mm)`}
        </text>
      </g>

      {/* ─── 2. 右侧上部：测微目镜手轮读数 (x: 360 ~ 820) ─── */}
      <g>
        <rect
          x={360}
          y={215}
          width={460}
          height={215}
          rx={8}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth={1.2}
        />
        <text
          x={375}
          y={238}
          fontSize={font(13)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
        >
          测量头螺旋测微手轮读数
        </text>
        {physics.isOverRange && (
          <text
            x={800}
            y={238}
            fontSize={font(11)}
            fill={PHYSICS_COLORS.alertRed}
            textAnchor="end"
            fontWeight="bold"
          >
            ⚠️ 读数已超出 10.0mm 标称量程
          </text>
        )}

        {/* 复用精密 Micrometer 组件 (放置在中央，量程安全 clamp 在 0~10mm 内) */}
        <g transform="translate(18, 0)">
          <Micrometer
            x={400}
            y={325}
            measuredValue={Math.min(10.0, Math.max(0, currentReading))}
            scale={1.2}
            showMagnifier={false}
          />
        </g>

        {/* 读数详细拆解卡片 */}
        <g transform="translate(375, 370)">
          <rect
            x={0}
            y={0}
            width={430}
            height={50}
            rx={4}
            fill={CANVAS_COLORS.white}
            stroke={physics.isOverRange ? PHYSICS_COLORS.alertRed : CANVAS_COLORS.axis}
            strokeWidth={physics.isOverRange ? 1.5 : 1}
          />
          <text
            x={12}
            y={20}
            fontSize={font(11)}
            fill={physics.isOverRange ? PHYSICS_COLORS.alertRed : CANVAS_COLORS.labelText}
          >
            {physics.isOverRange
              ? '主尺刻度: > 10.0 mm (超出标称量程) | 动尺刻度: 读数无效'
              : `主尺刻度: ${fixedMm} mm ${hasHalfMm ? '+ 0.5 mm' : ''} | 动尺刻度: ${thimbleValue} × 0.01 mm`}
          </text>
          <text x={12} y={39} fontSize={font(12)} fill={CANVAS_COLORS.labelText}>
            当前手轮读数：
            <tspan
              fontWeight="bold"
              fill={physics.isOverRange ? PHYSICS_COLORS.alertRed : PHYSICS_COLORS.displacement}
              fontSize={font(13)}
              fontFamily="monospace"
            >
              x = {currentReading.toFixed(3)} mm
            </tspan>
            {physics.isOverRange ? (
              <tspan fill={PHYSICS_COLORS.alertRed} fontSize={font(10)} fontWeight="bold">
                {' '}
                (已超过螺旋测微器 10.000 mm 最大量程，请增大 d 或减小 L)
              </tspan>
            ) : (
              <tspan fill={CANVAS_COLORS.textMuted} fontSize={font(10)}>
                {' '}
                (精确至 0.001 mm，含估读位)
              </tspan>
            )}
          </text>
        </g>
      </g>

      {/* ─── 3. 右侧下部：逐差法数据记录与计算看板 (x: 360 ~ 820) ─── */}
      <g>
        <rect
          x={360}
          y={440}
          width={460}
          height={190}
          rx={8}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth={1.2}
        />
        <text
          x={375}
          y={464}
          fontSize={font(13)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
        >
          测量数据记录与逐差计算
        </text>

        {/* 测量数据表格 */}
        <g transform="translate(375, 478)">
          <rect
            x={0}
            y={0}
            width={430}
            height={70}
            rx={4}
            fill={CANVAS_COLORS.white}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={1}
          />
          {/* 表格分割线 */}
          <line x1={0} y1={24} x2={430} y2={24} stroke={CANVAS_COLORS.grid} strokeWidth={1} />
          <line x1={140} y1={0} x2={140} y2={70} stroke={CANVAS_COLORS.grid} strokeWidth={1} />
          <line x1={285} y1={0} x2={285} y2={70} stroke={CANVAS_COLORS.grid} strokeWidth={1} />

          <text x={70} y={16} fontSize={font(10)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">
            第 1 条亮纹读数 x₁
          </text>
          <text x={212} y={16} fontSize={font(10)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">
            第 {targetFringe} 条亮纹读数 x{subN}
          </text>
          <text x={357} y={16} fontSize={font(10)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">
            总跨距 (x{subN} − x₁)
          </text>

          {/* 表格数值 */}
          <text
            x={70}
            y={48}
            fontSize={font(12)}
            fill={PHYSICS_COLORS.position}
            textAnchor="middle"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {x1.toFixed(3)} mm
          </text>
          <text
            x={212}
            y={48}
            fontSize={font(12)}
            fill={PHYSICS_COLORS.displacement}
            textAnchor="middle"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {xn.toFixed(3)} mm
          </text>
          <text
            x={357}
            y={48}
            fontSize={font(12)}
            fill={PHYSICS_COLORS.wavelengthRed}
            textAnchor="middle"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {(xn - x1).toFixed(3)} mm
          </text>
        </g>

        {/* 逐差计算结果看板 */}
        <g transform="translate(375, 560)">
          <text x={10} y={18} fontSize={font(11)} fill={CANVAS_COLORS.labelText}>
            实测条纹间距：
            <tspan fontWeight="bold" fill={PHYSICS_COLORS.wavelengthRed}>
              Δx = (x{subN} − x₁) / {targetFringe - 1} = {measuredDeltaX.toFixed(3)} mm
            </tspan>
          </text>
          <text x={10} y={42} fontSize={font(11)} fill={CANVAS_COLORS.labelText}>
            实测单色波长：
            <tspan fontWeight="bold" fill={wavelengthColor} fontSize={font(12)}>
              λ = (d / L) · Δx = {measuredWavelength.toFixed(1)} nm
            </tspan>
            <tspan fill={CANVAS_COLORS.textMuted} fontSize={font(10)}>
              {' '}
              (理论真值: {wavelength} nm，测量相对误差: {relativeErrorPercent.toFixed(2)}%)
            </tspan>
          </text>
        </g>
      </g>
    </g>
  )
}
