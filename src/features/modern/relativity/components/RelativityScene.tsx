import React from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS, SCENE_COLORS, withAlpha } from '@/theme/physics'
import { useRelativityPhysics } from '../hooks/useRelativityPhysics'

interface RelativitySceneProps {
  physics: ReturnType<typeof useRelativityPhysics>
  font: (size: number) => number
}

export const RelativityScene: React.FC<RelativitySceneProps> = ({ physics, font }) => {
  const {
    beta,
    gamma,
    shipL0,
    shipL,
    clockH,
    shipX,
    pulseY0,
    pulseYGround,
    triangleH,
    triangleBase,
    groundClockAngle,
    shipClockAngle,
    energyData,
    mode,
    showGeometry,
  } = physics

  // 上半屏中心与下半屏中心
  // Preset full: 840 x 650
  // S' 参考系：y 范围 40 ~ 300，基线 y = 220
  // S 参考系：y 范围 330 ~ 620，基线 y = 530
  const sPrimeBaseY = 230
  const sBaseY = 530
  const sPrimeShipX = 380

  // 飞船半高
  const shipH = 70

  // 绘制迷你表盘
  const renderClock = (cx: number, cy: number, r: number, angle: number, label: string) => (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle
        r={r}
        fill={CANVAS_COLORS.white}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={1.5}
      />
      {/* 刻度线 12, 3, 6, 9 */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const x1 = (r - 4) * Math.sin(rad)
        const y1 = -(r - 4) * Math.cos(rad)
        const x2 = r * Math.sin(rad)
        const y2 = -r * Math.cos(rad)
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={1}
          />
        )
      })}
      {/* 指针 */}
      {(() => {
        const rad = (angle * Math.PI) / 180
        const px = (r - 6) * Math.sin(rad)
        const py = -(r - 6) * Math.cos(rad)
        return (
          <line
            x1={0}
            y1={0}
            x2={px}
            y2={py}
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={2}
            strokeLinecap="round"
          />
        )
      })()}
      <circle r={2.5} fill={PHYSICS_COLORS.velocity} />
      <text
        y={r + font(12)}
        textAnchor="middle"
        fill={CANVAS_COLORS.labelText}
        fontSize={font(11)}
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  )

  return (
    <g className="relativity-scene">
      {/* 背景分割线 */}
      <line
        x1={30}
        y1={310}
        x2={810}
        y2={310}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />

      {/* ────────────────── S' 参考系（飞船静止系） ────────────────── */}
      <g className="frame-s-prime">
        {/* 参考系标签 */}
        <rect
          x={40}
          y={25}
          width={180}
          height={26}
          rx={4}
          fill={withAlpha(PHYSICS_COLORS.displacement, 0.15)}
          stroke={PHYSICS_COLORS.displacement}
          strokeWidth={1}
        />
        <text
          x={130}
          y={42}
          textAnchor="middle"
          fill={PHYSICS_COLORS.displacement}
          fontSize={font(12)}
          fontWeight="bold"
        >
          S&apos; 参考系（飞船内静止观测）
        </text>

        {/* 飞船主体（静止，居中） */}
        <rect
          x={sPrimeShipX - shipL0 / 2}
          y={sPrimeBaseY - shipH}
          width={shipL0}
          height={shipH}
          rx={10}
          fill={withAlpha(SCENE_COLORS.modernPhysics.cathodePlate, 0.25)}
          stroke={SCENE_COLORS.modernPhysics.anodeWire}
          strokeWidth={2}
        />
        {/* 船头驾驶舱 */}
        <polygon
          points={`
            ${sPrimeShipX + shipL0 / 2},${sPrimeBaseY - shipH}
            ${sPrimeShipX + shipL0 / 2 + 25},${sPrimeBaseY - shipH / 2}
            ${sPrimeShipX + shipL0 / 2},${sPrimeBaseY}
          `}
          fill={withAlpha(SCENE_COLORS.modernPhysics.cathodePlate, 0.4)}
          stroke={SCENE_COLORS.modernPhysics.anodeWire}
          strokeWidth={2}
        />
        {/* 飞船尺寸标注 L0 */}
        <line
          x1={sPrimeShipX - shipL0 / 2}
          y1={sPrimeBaseY + 16}
          x2={sPrimeShipX + shipL0 / 2}
          y2={sPrimeBaseY + 16}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1}
        />
        <text
          x={sPrimeShipX}
          y={sPrimeBaseY + 30}
          textAnchor="middle"
          fill={CANVAS_COLORS.textMuted}
          fontSize={font(11)}
        >
          固有长度 L₀ = 1.0 (静止)
        </text>

        {/* 光钟：上下反光镜 */}
        {/* 上底镜 */}
        <rect
          x={sPrimeShipX - 25}
          y={sPrimeBaseY - shipH + 8}
          width={50}
          height={6}
          fill={PHYSICS_COLORS.glassFill}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={1.5}
        />
        {/* 下底镜 */}
        <rect
          x={sPrimeShipX - 25}
          y={sPrimeBaseY - 14}
          width={50}
          height={6}
          fill={PHYSICS_COLORS.glassFill}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={1.5}
        />
        {/* 光脉冲往返轨迹（竖直线） */}
        <line
          x1={sPrimeShipX}
          y1={sPrimeBaseY - shipH + 14}
          x2={sPrimeShipX}
          y2={sPrimeBaseY - 14}
          stroke={withAlpha(PHYSICS_COLORS.wavelengthGreen, 0.4)}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
        {/* 正在飞行的光子脉冲 */}
        <circle
          cx={sPrimeShipX}
          cy={sPrimeBaseY - 14 - (pulseY0 / clockH) * (shipH - 28)}
          r={5}
          fill={PHYSICS_COLORS.wavelengthGreen}
        />
        <circle
          cx={sPrimeShipX}
          cy={sPrimeBaseY - 14 - (pulseY0 / clockH) * (shipH - 28)}
          r={9}
          fill="none"
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={1}
          opacity={0.6}
        />

        {/* 光钟高度标注 h */}
        <text
          x={sPrimeShipX - 35}
          y={sPrimeBaseY - shipH / 2 + 4}
          textAnchor="end"
          fill={PHYSICS_COLORS.wavelengthGreen}
          fontSize={font(11)}
        >
          h = c·Δτ/2
        </text>

        {/* S' 固有表盘 */}
        {renderClock(680, 160, 32, shipClockAngle, '固有时间 τ (飞船钟)')}
      </g>

      {/* ────────────────── S 参考系（地面观测系） ────────────────── */}
      <g className="frame-s">
        {/* 参考系标签 */}
        <rect
          x={40}
          y={330}
          width={180}
          height={26}
          rx={4}
          fill={withAlpha(PHYSICS_COLORS.velocity, 0.15)}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={1}
        />
        <text
          x={130}
          y={347}
          textAnchor="middle"
          fill={PHYSICS_COLORS.velocity}
          fontSize={font(12)}
          fontWeight="bold"
        >
          S 参考系（地面静止观测）
        </text>

        {/* 速度说明 */}
        <text
          x={240}
          y={347}
          fill={CANVAS_COLORS.labelText}
          fontSize={font(12)}
        >
          飞船航速: <tspan fill={PHYSICS_COLORS.velocity} fontWeight="bold">v = {beta.toFixed(2)} c</tspan>
          ，洛伦兹因子: <tspan fill={PHYSICS_COLORS.acceleration} fontWeight="bold">γ = {gamma.toFixed(3)}</tspan>
        </text>

        {/* 模式 1：尺缩效应专属视觉对比 */}
        {mode === 1 && (
          <g className="length-contraction-overlay">
            {/* 静止原长虚线框 */}
            <rect
              x={shipX - shipL0 / 2}
              y={sBaseY - shipH}
              width={shipL0}
              height={shipH}
              rx={10}
              fill="none"
              stroke={CANVAS_COLORS.axis}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <text
              x={shipX}
              y={sBaseY - shipH - 10}
              textAnchor="middle"
              fill={CANVAS_COLORS.textMuted}
              fontSize={font(11)}
            >
              原长 L₀ (虚线)
            </text>
          </g>
        )}

        {/* 运动飞船（实际观测长度为 shipL，沿运动方向收缩） */}
        <rect
          x={shipX - shipL / 2}
          y={sBaseY - shipH}
          width={shipL}
          height={shipH}
          rx={10}
          fill={withAlpha(SCENE_COLORS.modernPhysics.cathodePlate, 0.35)}
          stroke={SCENE_COLORS.modernPhysics.anodeWire}
          strokeWidth={2}
        />
        {/* 船头 */}
        <polygon
          points={`
            ${shipX + shipL / 2},${sBaseY - shipH}
            ${shipX + shipL / 2 + 20 * (shipL / shipL0)},${sBaseY - shipH / 2}
            ${shipX + shipL / 2},${sBaseY}
          `}
          fill={withAlpha(SCENE_COLORS.modernPhysics.cathodePlate, 0.5)}
          stroke={SCENE_COLORS.modernPhysics.anodeWire}
          strokeWidth={2}
        />

        {/* 长度收缩数值标注 */}
        <line
          x1={shipX - shipL / 2}
          y1={sBaseY + 16}
          x2={shipX + shipL / 2}
          y2={sBaseY + 16}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={1.5}
        />
        <text
          x={shipX}
          y={sBaseY + 32}
          textAnchor="middle"
          fill={PHYSICS_COLORS.velocity}
          fontSize={font(11)}
          fontWeight="bold"
        >
          观测长度 L = L₀/γ = {(1 / gamma).toFixed(3)}
        </text>

        {/* 光钟上下镜在地面系的位置 */}
        <rect
          x={shipX - 18}
          y={sBaseY - shipH + 8}
          width={36}
          height={6}
          fill={PHYSICS_COLORS.glassFill}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={1.5}
        />
        <rect
          x={shipX - 18}
          y={sBaseY - 14}
          width={36}
          height={6}
          fill={PHYSICS_COLORS.glassFill}
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={1.5}
        />

        {/* 正在飞行的光子脉冲（地面观测） */}
        <circle
          cx={shipX}
          cy={sBaseY - 14 - (pulseYGround / clockH) * (shipH - 28)}
          r={5}
          fill={PHYSICS_COLORS.wavelengthGreen}
        />
        <circle
          cx={shipX}
          cy={sBaseY - 14 - (pulseYGround / clockH) * (shipH - 28)}
          r={9}
          fill="none"
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={1}
          opacity={0.6}
        />

        {/* 几何辅助图解（直角三角形与勾股定理推导） */}
        {showGeometry && (
          <g className="geometry-diagram" transform="translate(60, 420)">
            {/* 固定的直角三角形图解 */}
            {(() => {
              const bX = 0
              const bY = 120
              // 缩放适应面板
              const geomScale = 0.7
              const gBase = Math.min(triangleBase * geomScale, 180)
              const gH = triangleH * geomScale

              return (
                <g>
                  {/* 底边: v·Δt/2 */}
                  <line
                    x1={bX}
                    y1={bY}
                    x2={bX + gBase}
                    y2={bY}
                    stroke={PHYSICS_COLORS.velocity}
                    strokeWidth={2}
                  />
                  {/* 垂直高: h = c·Δτ/2 */}
                  <line
                    x1={bX}
                    y1={bY}
                    x2={bX}
                    y2={bY - gH}
                    stroke={PHYSICS_COLORS.displacement}
                    strokeWidth={2}
                  />
                  {/* 斜边: c·Δt/2 */}
                  <line
                    x1={bX}
                    y1={bY - gH}
                    x2={bX + gBase}
                    y2={bY}
                    stroke={PHYSICS_COLORS.wavelengthGreen}
                    strokeWidth={2.5}
                  />
                  {/* 直角符号 */}
                  <path
                    d={`M ${bX} ${bY - 12} L ${bX + 12} ${bY - 12} L ${bX + 12} ${bY}`}
                    fill="none"
                    stroke={CANVAS_COLORS.axis}
                    strokeWidth={1}
                  />

                  {/* 边长标签 */}
                  <text
                    x={bX - 6}
                    y={bY - gH / 2}
                    textAnchor="end"
                    fill={PHYSICS_COLORS.displacement}
                    fontSize={font(11)}
                    fontWeight="bold"
                  >
                    h = c·Δτ/2
                  </text>
                  <text
                    x={bX + gBase / 2}
                    y={bY + 16}
                    textAnchor="middle"
                    fill={PHYSICS_COLORS.velocity}
                    fontSize={font(11)}
                    fontWeight="bold"
                  >
                    v·Δt/2
                  </text>
                  <text
                    x={bX + gBase / 2 + 10}
                    y={bY - gH / 2 - 6}
                    textAnchor="start"
                    fill={PHYSICS_COLORS.wavelengthGreen}
                    fontSize={font(11)}
                    fontWeight="bold"
                  >
                    c·Δt/2
                  </text>

                  {/* 勾股定理结论小字 */}
                  <text
                    x={bX + gBase + 24}
                    y={bY - gH / 2}
                    fill={CANVAS_COLORS.labelText}
                    fontSize={font(12)}
                  >
                    (cΔt/2)² = h² + (vΔt/2)²
                  </text>
                  <text
                    x={bX + gBase + 24}
                    y={bY - gH / 2 + 20}
                    fill={PHYSICS_COLORS.acceleration}
                    fontSize={font(12)}
                    fontWeight="bold"
                  >
                    ⇒ Δt = γ·Δτ (动钟走得更慢)
                  </text>
                </g>
              )
            })()}
          </g>
        )}

        {/* 模式 2：质速关系与能量构成对比 */}
        {mode === 2 && (
          <g className="energy-diagram" transform="translate(60, 430)">
            <rect
              x={0}
              y={0}
              width={340}
              height={90}
              rx={6}
              fill={withAlpha(CANVAS_COLORS.axis, 0.08)}
              stroke={CANVAS_COLORS.axis}
              strokeWidth={1}
            />
            <text
              x={12}
              y={22}
              fill={CANVAS_COLORS.labelText}
              fontSize={font(11)}
              fontWeight="bold"
            >
              相对论质量: m = γ·m₀ = {(gamma * energyData.relativisticMass / energyData.gamma).toFixed(2)} kg
            </text>
            {/* 能量条: 静能 E0 + 动能 Ek */}
            <text
              x={12}
              y={44}
              fill={CANVAS_COLORS.textMuted}
              fontSize={font(10)}
            >
              总能 E = mc² = E₀ + E_k
            </text>
            <rect
              x={12}
              y={54}
              width={160}
              height={18}
              fill={PHYSICS_COLORS.potentialEnergy}
              rx={2}
            />
            <rect
              x={172}
              y={54}
              width={Math.min(160 * (gamma - 1), 140)}
              height={18}
              fill={PHYSICS_COLORS.kineticEnergy}
              rx={2}
            />
            <text
              x={92}
              y={67}
              textAnchor="middle"
              fill={CANVAS_COLORS.white}
              fontSize={font(10)}
            >
              静能 E₀ = m₀c²
            </text>
            <text
              x={176}
              y={67}
              fill={CANVAS_COLORS.white}
              fontSize={font(10)}
            >
              动能 E_k
            </text>
          </g>
        )}

        {/* 地面参考系表盘 */}
        {renderClock(680, 480, 32, groundClockAngle, '地面参考系时间 t')}
      </g>
    </g>
  )
}
