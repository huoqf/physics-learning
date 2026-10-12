import React from 'react'
import { CANVAS_COLORS, OPTICS_COLORS, SCENE_COLORS, withAlpha } from '@/theme/physics'

interface DoubleSlitApparatusTrackProps {
  wavelengthColor: string
  wavelength: number
  slitDistance: number
  screenDistance: number
  font: (size: number) => number
}

/**
 * 高考实验：光具座装配图组件 (DoubleSlitApparatusTrack)
 *
 * 规范展示高考核心考点——光具座上各光学元件严格从左至右的排列顺序与作用：
 * ① 光源（白炽灯）
 * ② 遮光罩 / 凸透镜（获得平行光）
 * ③ 滤光片（获得单色光）
 * ④ 单缝（获得线光源，缝须竖直且与双缝平行）
 * ⑤ 双缝（获得频率相同、相位差恒定的相干光源）
 * ⑥ 遮光筒（黑色长筒，避免外界杂光干扰，提供缝屏间距 L）
 * ⑦ 测量头（毛玻璃分划板 + 测微目镜）
 */
export const DoubleSlitApparatusTrack: React.FC<DoubleSlitApparatusTrackProps> = ({
  wavelengthColor,
  wavelength,
  slitDistance,
  screenDistance,
  font,
}) => {
  // 导轨基准尺寸
  const railX = 30
  const railY = 145
  const railW = 780
  const railH = 14

  // 各元件在光轨上的 X 中心坐标
  const compX = {
    source: 70, // ① 光源
    lens: 135, // ② 凸透镜
    filter: 195, // ③ 滤光片
    singleSlit: 255, // ④ 单缝
    doubleSlit: 315, // ⑤ 双缝
    tubeStart: 345, // ⑥ 遮光筒起点
    tubeEnd: 685, // ⑥ 遮光筒终点
    measuringHead: 720, // ⑦ 测量头
  }
  const opticalAxisY = 85

  return (
    <g className="apparatus-track">
      {/* ─── 0. 背景区域卡片 ─── */}
      <rect
        x={20}
        y={15}
        width={800}
        height={185}
        rx={8}
        fill={CANVAS_COLORS.objectFillNeutral}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={1.2}
      />
      <text
        x={35}
        y={36}
        fontSize={font(13)}
        fill={CANVAS_COLORS.labelText}
        fontWeight="bold"
      >
        光具座导轨装配示意（高考考点：严格顺序与作用）
      </text>

      {/* ─── 1. 光轴参考中心虚线 ─── */}
      <line
        x1={railX + 20}
        y1={opticalAxisY}
        x2={railX + railW - 20}
        y2={opticalAxisY}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* ─── 2. 模拟光束传播 ─── */}
      {/* ①~②: 光源发散白光 */}
      <polygon
        points={`${compX.source + 15},${opticalAxisY - 5} ${compX.lens - 5},${opticalAxisY - 20} ${compX.lens - 5},${opticalAxisY + 20} ${compX.source + 15},${opticalAxisY + 5}`}
        fill={withAlpha(CANVAS_COLORS.white, 0.25)}
      />
      {/* ②~③: 聚光平行白光 */}
      <rect
        x={compX.lens + 5}
        y={opticalAxisY - 18}
        width={compX.filter - compX.lens - 10}
        height={36}
        fill={withAlpha(CANVAS_COLORS.white, 0.3)}
      />
      {/* ③~④: 单色平行光 */}
      <rect
        x={compX.filter + 5}
        y={opticalAxisY - 16}
        width={compX.singleSlit - compX.filter - 10}
        height={32}
        fill={withAlpha(wavelengthColor, 0.35)}
      />
      {/* ④~⑤: 单缝发出的单色线光源光束 */}
      <polygon
        points={`${compX.singleSlit + 5},${opticalAxisY - 2} ${compX.doubleSlit - 5},${opticalAxisY - 16} ${compX.doubleSlit - 5},${opticalAxisY + 16} ${compX.singleSlit + 5},${opticalAxisY + 2}`}
        fill={withAlpha(wavelengthColor, 0.45)}
      />
      {/* ⑤~⑦: 双缝相干光束穿入遮光筒 */}
      <polygon
        points={`${compX.doubleSlit + 5},${opticalAxisY - 12} ${compX.tubeEnd},${opticalAxisY - 24} ${compX.tubeEnd},${opticalAxisY + 24} ${compX.doubleSlit + 5},${opticalAxisY + 12}`}
        fill={withAlpha(wavelengthColor, 0.2)}
      />

      {/* ─── 3. 导轨底座与滑座 ─── */}
      {/* 金属导轨 */}
      <rect
        x={railX}
        y={railY}
        width={railW}
        height={railH}
        rx={2}
        fill={SCENE_COLORS.materials.structStrokeDark}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={1}
      />
      {/* 导轨毫米刻度线装饰 */}
      {Array.from({ length: 26 }).map((_, i) => (
        <line
          key={i}
          x1={railX + 20 + i * 29}
          y1={railY}
          x2={railX + 20 + i * 29}
          y2={railY + (i % 5 === 0 ? 6 : 3)}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={1}
        />
      ))}
      <text
        x={railX + railW - 10}
        y={railY + 11}
        fontSize={font(9)}
        fill={CANVAS_COLORS.textMuted}
        textAnchor="end"
        fontFamily="monospace"
      >
        光学导轨 (0 ~ 100 cm)
      </text>

      {/* ─── 4. 光学元件支柱滑块 (7 个) ─── */}
      {[
        compX.source,
        compX.lens,
        compX.filter,
        compX.singleSlit,
        compX.doubleSlit,
        (compX.tubeStart + compX.tubeEnd) / 2,
        compX.measuringHead,
      ].map((x, idx) => (
        <g key={idx}>
          {/* 滑座底脚 */}
          <rect
            x={x - 14}
            y={railY - 6}
            width={28}
            height={8}
            rx={2}
            fill={SCENE_COLORS.materials.structStrokeMid}
            stroke={CANVAS_COLORS.strokeDark}
            strokeWidth={1}
          />
          {/* 支撑立柱 */}
          <rect
            x={x - 3}
            y={idx === 5 ? opticalAxisY + 28 : opticalAxisY + 22}
            width={6}
            height={idx === 5 ? railY - opticalAxisY - 34 : railY - opticalAxisY - 28}
            fill={SCENE_COLORS.materials.structStrokeLight}
            stroke={CANVAS_COLORS.strokeDark}
            strokeWidth={0.8}
          />
        </g>
      ))}

      {/* ─── 5. 元件主体 ─── */}
      {/* ① 光源 */}
      <g>
        <rect
          x={compX.source - 16}
          y={opticalAxisY - 24}
          width={32}
          height={48}
          rx={4}
          fill={SCENE_COLORS.materials.structFill}
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth={1.5}
        />
        {/* 光源发光孔 */}
        <circle cx={compX.source} cy={opticalAxisY} r={8} fill={CANVAS_COLORS.white} />
        <circle cx={compX.source} cy={opticalAxisY} r={4} fill={OPTICS_COLORS.lightRay} />
        <text
          x={compX.source}
          y={railY + 28}
          fontSize={font(10)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
        >
          ① 白炽光源
        </text>
      </g>

      {/* ② 凸透镜 */}
      <g>
        <rect
          x={compX.lens - 5}
          y={opticalAxisY - 24}
          width={10}
          height={48}
          rx={5}
          fill={withAlpha(OPTICS_COLORS.lens, 0.85)}
          stroke={OPTICS_COLORS.lensStroke}
          strokeWidth={1.5}
        />
        <text
          x={compX.lens}
          y={railY + 28}
          fontSize={font(10)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
        >
          ② 凸透镜
        </text>
      </g>

      {/* ③ 滤光片 */}
      <g>
        <rect
          x={compX.filter - 4}
          y={opticalAxisY - 22}
          width={8}
          height={44}
          rx={2}
          fill={wavelengthColor}
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth={1.5}
        />
        <text
          x={compX.filter}
          y={railY + 28}
          fontSize={font(10)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
        >
          ③ 滤光片
        </text>
        <text
          x={compX.filter}
          y={railY + 40}
          fontSize={font(8.5)}
          fill={wavelengthColor}
          textAnchor="middle"
        >
          ({wavelength}nm)
        </text>
      </g>

      {/* ④ 单缝板 */}
      <g>
        <rect
          x={compX.singleSlit - 4}
          y={opticalAxisY - 24}
          width={8}
          height={48}
          rx={2}
          fill={SCENE_COLORS.materials.structStrokeDark}
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth={1.5}
        />
        {/* 单缝发光缝 */}
        <line
          x1={compX.singleSlit}
          y1={opticalAxisY - 14}
          x2={compX.singleSlit}
          y2={opticalAxisY + 14}
          stroke={wavelengthColor}
          strokeWidth={1.5}
        />
        <text
          x={compX.singleSlit}
          y={railY + 28}
          fontSize={font(10)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
        >
          ④ 单缝
        </text>
        <text
          x={compX.singleSlit}
          y={railY + 40}
          fontSize={font(8.5)}
          fill={CANVAS_COLORS.textMuted}
          textAnchor="middle"
        >
          (线光源)
        </text>
      </g>

      {/* ⑤ 双缝板 */}
      <g>
        <rect
          x={compX.doubleSlit - 4}
          y={opticalAxisY - 24}
          width={8}
          height={48}
          rx={2}
          fill={SCENE_COLORS.materials.structStrokeDark}
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth={1.5}
        />
        {/* 双缝发光缝 */}
        <line
          x1={compX.doubleSlit}
          y1={opticalAxisY - 12}
          x2={compX.doubleSlit}
          y2={opticalAxisY - 2}
          stroke={wavelengthColor}
          strokeWidth={1.2}
        />
        <line
          x1={compX.doubleSlit}
          y1={opticalAxisY + 2}
          x2={compX.doubleSlit}
          y2={opticalAxisY + 12}
          stroke={wavelengthColor}
          strokeWidth={1.2}
        />
        <text
          x={compX.doubleSlit}
          y={railY + 28}
          fontSize={font(10)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
        >
          ⑤ 双缝
        </text>
        <text
          x={compX.doubleSlit}
          y={railY + 40}
          fontSize={font(8.5)}
          fill={CANVAS_COLORS.textMuted}
          textAnchor="middle"
        >
          (d={slitDistance}mm)
        </text>
      </g>

      {/* ⑥ 遮光筒 */}
      <g>
        <rect
          x={compX.tubeStart}
          y={opticalAxisY - 28}
          width={compX.tubeEnd - compX.tubeStart}
          height={56}
          rx={6}
          fill={SCENE_COLORS.materials.structStrokeDark}
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth={2}
          opacity={0.92}
        />
        {/* 遮光筒内部通光暗腔指示 */}
        <line
          x1={compX.tubeStart + 15}
          y1={opticalAxisY}
          x2={compX.tubeEnd - 15}
          y2={opticalAxisY}
          stroke={withAlpha(wavelengthColor, 0.4)}
          strokeWidth={18}
          strokeDasharray="8 6"
        />
        <text
          x={(compX.tubeStart + compX.tubeEnd) / 2}
          y={opticalAxisY + 5}
          fontSize={font(11)}
          fill={CANVAS_COLORS.white}
          textAnchor="middle"
          fontWeight="bold"
        >
          ⑥ 遮光筒（暗室通光腔）
        </text>
        <text
          x={(compX.tubeStart + compX.tubeEnd) / 2}
          y={railY + 28}
          fontSize={font(10)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
        >
          缝屏距离 L = {screenDistance} m
        </text>
      </g>

      {/* ⑦ 测量头 */}
      <g>
        <rect
          x={compX.measuringHead - 15}
          y={opticalAxisY - 26}
          width={30}
          height={52}
          rx={4}
          fill={SCENE_COLORS.materials.structFill}
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth={1.5}
        />
        {/* 目镜筒与微调旋钮 */}
        <rect
          x={compX.measuringHead + 15}
          y={opticalAxisY - 14}
          width={18}
          height={28}
          rx={2}
          fill={SCENE_COLORS.materials.structStrokeMid}
          stroke={CANVAS_COLORS.strokeDark}
          strokeWidth={1}
        />
        {/* 旋钮纹理 */}
        <line
          x1={compX.measuringHead + 24}
          y1={opticalAxisY - 12}
          x2={compX.measuringHead + 24}
          y2={opticalAxisY + 12}
          stroke={CANVAS_COLORS.labelText}
          strokeWidth={1}
        />
        <text
          x={compX.measuringHead}
          y={railY + 28}
          fontSize={font(10)}
          fill={CANVAS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
        >
          ⑦ 测量头
        </text>
        <text
          x={compX.measuringHead}
          y={railY + 40}
          fontSize={font(8.5)}
          fill={CANVAS_COLORS.textMuted}
          textAnchor="middle"
        >
          (目镜+手轮)
        </text>
      </g>
    </g>
  )
}
