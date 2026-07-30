import React from 'react'

export interface MicrometerProps {
  /** 螺旋测微器中心左侧 X 坐标 */
  x: number
  /** 螺旋测微器中心 Y 坐标 */
  y: number
  /** 当前测得读数 (单位: mm, 精确到 0.001mm, 如 5.382) */
  measuredValue: number
  /** 缩放比例 */
  scale?: number
  /** 是否开启读数放大观察框 */
  showMagnifier?: boolean
  /** 字体族 */
  fontFamily?: string
}

/**
 * 高中物理高考实验 - 螺旋测微器/千分尺组件 (Micrometer)
 * 精密渲染 U 型砧台、固定套管 (0.5mm/1mm 刻度)、可动微分筒 (50分度旋钮)
 */
export const Micrometer: React.FC<MicrometerProps> = ({
  x,
  y,
  measuredValue,
  scale = 1,
  showMagnifier = false,
  fontFamily = 'monospace, sans-serif',
}) => {
  // 固定套管主尺整数与半毫米数 (mm)
  const fixedMm = Math.floor(measuredValue)
  const hasHalfMm = measuredValue - fixedMm >= 0.5

  // 可动微分筒 50 等分估读格数 (0~50)
  const thimbleValue = (measuredValue % 0.5) / 0.01

  return (
    <g
      className="micrometer"
      transform={`translate(${x}, ${y}) scale(${scale})`}
    >
      {/* 弓形 U 型框架 (Frame) */}
      <path
        d="M 20 -40 C -50 -40, -50 40, 20 40 L 40 40 C -30 35, -30 -35, 40 -35 Z"
        fill="#475569"
        stroke="#1E293B"
        strokeWidth={1.5}
      />
      {/* 测砧 (Anvil) */}
      <rect x={20} y={-8} width={12} height={16} fill="#CBD5E1" stroke="#475569" />

      {/* 测微螺杆 (Spindle, 伸缩显示) */}
      <rect
        x={32}
        y={-8}
        width={Math.max(2, 40 - measuredValue * 4)}
        height={16}
        fill="#E2E8F0"
        stroke="#475569"
      />

      {/* 固定套管 (Sleeve, 包含 0.5mm 刻度线) */}
      <g className="sleeve" transform="translate(80, 0)">
        <rect x={0} y={-14} width={70} height={28} fill="#CBD5E1" stroke="#334155" strokeWidth={1} />
        {/* 基准线 */}
        <line x1={0} y1={0} x2={65} y2={0} stroke="#0F172A" strokeWidth={1.2} />

        {/* 1mm 与 0.5mm 刻度线 */}
        {Array.from({ length: 11 }).map((_, mm) => (
          <g key={mm}>
            {/* 上侧 1mm 刻度 */}
            <line x1={mm * 5} y1={0} x2={mm * 5} y2={-8} stroke="#0F172A" strokeWidth={1} />
            {mm % 5 === 0 && (
              <text x={mm * 5} y={-10} fill="#0F172A" fontSize={8} textAnchor="middle" fontFamily={fontFamily}>
                {mm}
              </text>
            )}
            {/* 下侧 0.5mm 刻度 */}
            {mm < 10 && (
              <line x1={mm * 5 + 2.5} y1={0} x2={mm * 5 + 2.5} y2={7} stroke="#0F172A" strokeWidth={0.8} />
            )}
          </g>
        ))}
      </g>

      {/* 可动微分筒 (Thimble) */}
      <g className="thimble" transform={`translate(${110 + fixedMm * 5 + (hasHalfMm ? 2.5 : 0)}, 0)`}>
        <rect x={0} y={-18} width={50} height={36} rx={2} fill="#94A3B8" stroke="#1E293B" strokeWidth={1.2} />
        {/* 棘轮旋钮 (Ratchet) */}
        <rect x={50} y={-12} width={20} height={24} fill="#475569" stroke="#1E293B" />

        {/* 可动微分筒 50 等分刻度线 */}
        {[-2, -1, 0, 1, 2].map((offset) => {
          const tickVal = (Math.round(thimbleValue) + offset + 50) % 50
          const posY = -offset * 6

          return (
            <g key={offset}>
              <line
                x1={0}
                y1={posY}
                x2={12}
                y2={posY}
                stroke={offset === 0 ? '#DC2626' : '#0F172A'}
                strokeWidth={offset === 0 ? 1.5 : 0.8}
              />
              <text
                x={15}
                y={posY + 3}
                fill={offset === 0 ? '#DC2626' : '#1E293B'}
                fontSize={8}
                fontWeight={offset === 0 ? 'bold' : 'normal'}
                fontFamily={fontFamily}
              >
                {tickVal}
              </text>
            </g>
          )
        })}
      </g>

      {/* 读数特写放大标注 */}
      {showMagnifier && (
        <g className="micrometer-readout" transform="translate(100, -50)">
          <rect x={-50} y={-16} width={100} height={26} rx={4} fill="#0F172A" opacity={0.9} />
          <text x={0} y={1} fill="#F59E0B" fontSize={11} fontWeight="bold" textAnchor="middle" fontFamily={fontFamily}>
            {measuredValue.toFixed(3)} mm
          </text>
        </g>
      )}
    </g>
  )
}
