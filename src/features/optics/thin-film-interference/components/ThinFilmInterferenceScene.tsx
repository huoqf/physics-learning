import { useMemo } from 'react'
import type { CanvasSize } from '@/utils'
import type { ViewportInfo } from '@/utils/useViewport'
import type { CanvasPreset } from '@/hooks/useAnimationViewport'
import { PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { wavelengthToHex } from '@/physics/optics'
import type { ThinFilmInterferenceHookResult } from '../hooks/useThinFilmInterferencePhysics'

interface ThinFilmInterferenceSceneProps {
  physics: ThinFilmInterferenceHookResult
  canvasSize: CanvasSize
  preset: CanvasPreset
  vp: ViewportInfo
  mode: number
  wavelength: number
  filmThickness: number
  n_film: number
  wedgeAngle_mrad?: number
  defect?: number
}

export function ThinFilmInterferenceScene({
  physics,
  canvasSize,
  preset,
  vp,
  mode,
  wavelength,
  filmThickness,
  n_film,
  wedgeAngle_mrad = 0.3,
  defect = 0,
}: ThinFilmInterferenceSceneProps) {
  const { font } = canvasSize
  const { thinFilm, wedgeSpacingPx, newtonRings, wavePhase } = physics
  const lightColor = useMemo(() => wavelengthToHex(wavelength), [wavelength])

  // ==========================================
  // Mode 0: 增透膜原理 (Coating)
  // ==========================================
  const renderCoatingMode = () => {
    const cx = preset.width / 2
    const topY = 160
    // 薄膜视觉厚度（缩放映射）
    const filmHeightPx = Math.max(28, Math.min(110, filmThickness * 0.28))
    const bottomY = topY + filmHeightPx
    const subHeightPx = 280

    // 入射与反射波形绘制
    const wavePointsTopReflect: string[] = []
    const wavePointsBottomReflect: string[] = []
    const wavePointsTransmitted: string[] = []

    // 沿 y 轴采样波形
    const lambdaPx = 50
    for (let y = 30; y <= topY; y += 3) {
      const k = (2 * Math.PI) / lambdaPx
      // 上反射波（沿 -y 方向反向传播，有半波损失初相位 PI）
      const x1 = cx - 35 + Math.sin(k * (topY - y) + wavePhase + Math.PI) * 12
      wavePointsTopReflect.push(`${x1},${y}`)
      // 下反射波（沿 -y 方向反向传播，相位包含光程差 delta）
      const x2 = cx + 35 + Math.sin(k * (topY - y) + wavePhase + thinFilm.phaseDiff_rad) * 12
      wavePointsBottomReflect.push(`${x2},${y}`)
    }

    for (let y = bottomY; y <= bottomY + subHeightPx - 30; y += 4) {
      const k = (2 * Math.PI) / (lambdaPx / 1.52)
      // 透射波（沿 +y 方向传播）
      const x3 = cx + Math.sin(k * (y - bottomY) - wavePhase) * 14 * thinFilm.transmittance
      wavePointsTransmitted.push(`${x3},${y}`)
    }

    return (
      <g>
        {/* 背景介质区域：空气层 */}
        <rect
          x={vp.designLeft}
          y={0}
          width={vp.designVisibleW}
          height={topY}
          fill={PHYSICS_COLORS.airFill}
        />
        <text x={vp.designLeft + 25} y={45} fontSize={font(13)} fill={CANVAS_COLORS.labelTextLight}>
          入射介质：空气 (n₀ = 1.0)
        </text>

        {/* 薄膜介质层 */}
        <rect
          x={vp.designLeft}
          y={topY}
          width={vp.designVisibleW}
          height={filmHeightPx}
          fill={withAlpha(PHYSICS_COLORS.displacement, 0.22)}
          stroke={PHYSICS_COLORS.displacement}
          strokeWidth={1.5}
        />
        <text x={vp.designLeft + 25} y={topY + 22} fontSize={font(13)} fill={PHYSICS_COLORS.displacement}>
          {`薄膜介质层 (n = ${n_film.toFixed(2)})，厚度 d = ${filmThickness.toFixed(1)} nm`}
        </text>

        {/* 玻璃基底 */}
        <rect
          x={vp.designLeft}
          y={bottomY}
          width={vp.designVisibleW}
          height={subHeightPx}
          fill={PHYSICS_COLORS.glassFill}
          stroke={PHYSICS_COLORS.glassStroke}
          strokeWidth={1}
        />
        <text x={vp.designLeft + 25} y={bottomY + 30} fontSize={font(13)} fill={CANVAS_COLORS.labelTextLight}>
          基底：光学玻璃 (n_sub = 1.52)
        </text>

        {/* 入射中心光束指示箭头 */}
        <line
          x1={cx}
          y1={30}
          x2={cx}
          y2={topY}
          stroke={lightColor}
          strokeWidth={3}
          strokeDasharray="6,3"
          opacity={0.85}
        />

        {/* 反射光 1：上表面反射波 */}
        <polyline
          points={wavePointsTopReflect.join(' ')}
          fill="none"
          stroke={lightColor}
          strokeWidth={2.2}
          opacity={0.9}
        />
        <text x={cx - 100} y={100} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="end">
          {`① 上表面反射光 (有半波损失)`}
        </text>

        {/* 反射光 2：下表面反射波 */}
        <polyline
          points={wavePointsBottomReflect.join(' ')}
          fill="none"
          stroke={lightColor}
          strokeWidth={2.2}
          opacity={0.9}
        />
        <text x={cx + 100} y={100} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="start">
          {`② 下表面反射光 (光程差 2nd)`}
        </text>

        {/* 透射波 */}
        <polyline
          points={wavePointsTransmitted.join(' ')}
          fill="none"
          stroke={lightColor}
          strokeWidth={2.5}
          opacity={0.8}
        />
        <text x={cx} y={bottomY + 180} fontSize={font(13)} fill={CANVAS_COLORS.labelText} textAnchor="middle">
          {`透射光束 (透射比: ${(thinFilm.transmittance * 100).toFixed(1)}%)`}
        </text>

        {/* 关键干涉状态标签 */}
        <g transform={`translate(${cx}, ${preset.height - 65})`}>
          <rect
            x={-190}
            y={-24}
            width={380}
            height={48}
            rx={8}
            fill={thinFilm.isDestructive ? withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.15) : CANVAS_COLORS.white}
            stroke={thinFilm.isDestructive ? PHYSICS_COLORS.wavelengthGreen : CANVAS_COLORS.axis}
            strokeWidth={1.5}
          />
          <text
            x={0}
            y={5}
            fontSize={font(14)}
            fill={thinFilm.isDestructive ? PHYSICS_COLORS.wavelengthGreen : CANVAS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            {thinFilm.isDestructive
              ? '✨ 满足理想增透条件：反射相消抵消，透射极大'
              : thinFilm.isConstructive
              ? '⚡ 满足增反条件：反射同相加强，透射减弱'
              : '⚖️ 部分相消与透射混合状态'}
          </text>
        </g>
      </g>
    )
  }

  // ==========================================
  // Mode 1: 劈尖等厚干涉 (Wedge)
  // ==========================================
  const renderWedgeMode = () => {
    const leftX = 100
    const rightX = 740
    const botPlateY = 280
    // 劈尖倾斜高度
    const wedgeRisePx = Math.max(15, Math.min(80, (wedgeAngle_mrad || 0.3) * 120))
    const pivotX = leftX + 40
    const tipX = rightX - 40
    const midX = (pivotX + tipX) / 2

    // 下方等厚干涉明暗条纹渲染
    const fringeTopY = 370
    const fringeH = 140
    const fringeCount = Math.floor((tipX - pivotX) / wedgeSpacingPx)

    // 缺陷位置截面参数
    const defectW = 90
    const defectH = defect === 1 ? 16 : defect === 2 ? -14 : 0

    return (
      <g>
        {/* 上方：空气劈尖侧截面 */}
        <text x={pivotX} y={80} fontSize={font(14)} fill={CANVAS_COLORS.labelText} fontWeight="bold">
          一、空气劈尖截面与工件表面状态
        </text>

        {/* 下工件平板（底座） */}
        <rect
          x={pivotX - 20}
          y={botPlateY}
          width={tipX - pivotX + 40}
          height={30}
          fill={PHYSICS_COLORS.glassFill}
          stroke={PHYSICS_COLORS.glassStroke}
          strokeWidth={1.5}
        />

        {/* 工件表面缺陷截面渲染 */}
        {defect !== 0 && (
          <g>
            <path
              d={`M ${midX - defectW / 2} ${botPlateY} Q ${midX} ${botPlateY + defectH} ${midX + defectW / 2} ${botPlateY} Z`}
              fill={defect === 1 ? withAlpha(CANVAS_COLORS.axis, 0.4) : PHYSICS_COLORS.glassFill}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={1.5}
            />
            <text
              x={midX}
              y={botPlateY + (defect === 1 ? 24 : -18)}
              fontSize={font(12)}
              fill={PHYSICS_COLORS.velocity}
              textAnchor="middle"
              fontWeight="bold"
            >
              {defect === 1 ? '▼ 此处工件表面凹陷（膜厚变大）' : '▲ 此处工件表面凸起（膜厚变小）'}
            </text>
          </g>
        )}

        {/* 上标准样板玻璃（倾斜） */}
        <line
          x1={pivotX}
          y1={botPlateY}
          x2={tipX}
          y2={botPlateY - wedgeRisePx}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={3}
        />
        <line
          x1={pivotX}
          y1={botPlateY - 20}
          x2={tipX}
          y2={botPlateY - wedgeRisePx - 20}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={2}
          strokeDasharray="4,4"
        />

        {/* 劈尖处垫片（右侧厚度示意） */}
        <rect
          x={tipX - 10}
          y={botPlateY - wedgeRisePx}
          width={12}
          height={wedgeRisePx}
          fill={PHYSICS_COLORS.wavelengthYellow}
          stroke={PHYSICS_COLORS.wavelengthYellow}
          strokeWidth={1}
        />
        <text x={tipX + 10} y={botPlateY - wedgeRisePx / 2 + 5} fontSize={font(12)} fill={PHYSICS_COLORS.wavelengthYellow}>
          薄片
        </text>

        {/* 空气层标注 */}
        <text x={(pivotX + tipX) / 2} y={botPlateY - wedgeRisePx / 2 - 10} fontSize={font(12)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle">
          空气薄膜层 (等厚线对应直条纹)
        </text>

        {/* 下方：俯视等厚干涉条纹 */}
        <text x={pivotX} y={fringeTopY - 15} fontSize={font(14)} fill={CANVAS_COLORS.labelText} fontWeight="bold">
          二、俯视等厚干涉条纹（高考核心判据：同一条纹膜厚相等）
        </text>

        {/* 条纹外框 */}
        <rect
          x={pivotX}
          y={fringeTopY}
          width={tipX - pivotX}
          height={fringeH}
          fill={CANVAS_COLORS.black}
          rx={6}
        />

        {/* 动态明暗条纹渲染（含缺陷处的弯曲变形） */}
        {Array.from({ length: fringeCount + 1 }).map((_, i) => {
          const fx = pivotX + i * wedgeSpacingPx
          if (fx > tipX) return null

          // 若落在缺陷影响范围，条纹发生弯曲
          const distToDefect = Math.abs(fx - midX)
          const inDefectRange = defect !== 0 && distToDefect < defectW / 2 + 10

          if (inDefectRange) {
            // 凹陷 (defect=1)：膜厚变大，需移动到原先膜薄的左端，条纹向薄端（左）弯曲
            // 凸起 (defect=2)：膜厚变小，需移动到原先膜厚的右端，条纹向厚端（右）弯曲
            const bendShift = (defect === 1 ? -wedgeSpacingPx * 0.95 : wedgeSpacingPx * 0.95) * (1 - distToDefect / (defectW / 2 + 10))
            const pathD = `M ${fx} ${fringeTopY} Q ${fx + bendShift} ${fringeTopY + fringeH / 2} ${fx} ${fringeTopY + fringeH}`
            return (
              <path
                key={i}
                d={pathD}
                fill="none"
                stroke={lightColor}
                strokeWidth={wedgeSpacingPx / 2.2}
                opacity={0.88}
                strokeLinecap="round"
              />
            )
          }

          return (
            <rect
              key={i}
              x={fx}
              y={fringeTopY}
              width={wedgeSpacingPx / 2}
              height={fringeH}
              fill={lightColor}
              opacity={0.88}
            />
          )
        })}

        {/* 标出条纹间距 Δx 与高考口诀 */}
        <line
          x1={pivotX + wedgeSpacingPx * 2}
          y1={fringeTopY + fringeH + 25}
          x2={pivotX + wedgeSpacingPx * 3}
          y2={fringeTopY + fringeH + 25}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={2}
        />
        <text
          x={pivotX + wedgeSpacingPx * 2.5}
          y={fringeTopY + fringeH + 45}
          fontSize={font(12)}
          fill={PHYSICS_COLORS.velocity}
          textAnchor="middle"
        >
          {`条纹间距 Δx = ${physics.wedgeSpacing_mm.toFixed(3)} mm`}
        </text>

        {/* 高考口诀高亮牌 */}
        <g transform={`translate(${tipX - 180}, ${fringeTopY + fringeH + 30})`}>
          <text x={0} y={0} fontSize={font(13)} fill={CANVAS_COLORS.labelText} fontWeight="bold">
            {defect === 1
              ? '🎯 判据：凹向薄端（条纹向左弯说明局部凹陷）'
              : defect === 2
              ? '🎯 判据：凸向厚端（条纹向右弯说明局部凸起）'
              : '🎯 判据：平整表面对应平行等间距直条纹'}
          </text>
        </g>
      </g>
    )
  }

  // ==========================================
  // Mode 2: 牛顿环 (Newton Rings)
  // ==========================================
  const renderNewtonRingMode = () => {
    const cx = preset.width / 2
    const cy = 340
    const maxR = 210

    return (
      <g>
        <text x={cx} y={70} fontSize={font(15)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          平凸透镜与平板玻璃接触面（反射光俯视干涉圆环）
        </text>

        {/* 环形黑底视窗 */}
        <circle cx={cx} cy={cy} r={maxR + 10} fill={CANVAS_COLORS.black} stroke={CANVAS_COLORS.axis} strokeWidth={2} />

        {/* 中心接触点：中心暗斑（由于空气薄膜下表面反射存在半波损失，厚度 d->0 时相消） */}
        <circle cx={cx} cy={cy} r={8} fill={CANVAS_COLORS.black} />
        <circle cx={cx} cy={cy} r={8} fill="none" stroke={CANVAS_COLORS.textMuted} strokeWidth={1} />

        {/* 前若干级暗环与亮环 */}
        {newtonRings.map((ring) => {
          if (ring.r_px > maxR) return null
          return (
            <g key={ring.m}>
              {/* 明环带 */}
              <circle
                cx={cx}
                cy={cy}
                r={ring.r_px}
                fill="none"
                stroke={lightColor}
                strokeWidth={Math.max(2, 10 - ring.m * 0.9)}
                opacity={0.85}
              />
              {/* 暗环线标注 */}
              <circle
                cx={cx}
                cy={cy}
                r={ring.r_px + 4}
                fill="none"
                stroke={CANVAS_COLORS.black}
                strokeWidth={1.5}
                opacity={0.9}
              />
            </g>
          )
        })}

        {/* 高考核心考点提示标签 */}
        <text x={cx} y={cy + maxR + 45} fontSize={font(13)} fill={CANVAS_COLORS.labelText} textAnchor="middle">
          考点规律：圆环半径 r_m ∝ √m；中心为暗斑；由内向外条纹由疏变密
        </text>
      </g>
    )
  }

  return (
    <g>
      {mode === 0 && renderCoatingMode()}
      {mode === 1 && renderWedgeMode()}
      {mode === 2 && renderNewtonRingMode()}
    </g>
  )
}
