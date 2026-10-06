import React from 'react'
import { SCENE_COLORS, PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'

const ELECTRICAL = SCENE_COLORS.electricalApparatus

export interface RheostatProps {
  /** 中心 x 坐标 */
  x?: number
  /** 中心 y 坐标 */
  y?: number
  /** 当前电阻值 */
  value?: number
  /** 最小电阻值 */
  min?: number
  /** 最大电阻值 */
  max?: number
  /** 变阻器宽度 (基准大小为 140) */
  width?: number
  /** 是否显示阻值标签 */
  showLabel?: boolean
  /** 自定义标签名称（例如：'滑动变阻器 R'，或 'R₂ (变)'） */
  label?: string
  /** 阻值单位 (默认 'Ω') */
  unit?: string
  /** 是否禁用/不可见交互 */
  disabled?: boolean
  /** 字体缩放函数（由父组件 useCanvasSize 提供） */
  font?: (base: number) => number
  /** 其他 CSS 类名 */
  className?: string
  /** 是否启用动画，关闭后不仅停止时间动画，而且停止渲染任何粒子或不需要的动态修饰元素以减轻 DOM 开销 */
  animated?: boolean
  /** 电路接法模式：'current-limiting' (限流式, 默认) | 'voltage-divider' (分压式, 三端全接入) */
  wiringMode?: 'current-limiting' | 'voltage-divider'
  /** 外观模式：'realistic' (拟物, 默认) | 'symbolic' (电路原理图图例符号) */
  variant?: 'realistic' | 'symbolic'
  /** 原理图模式下是否显示滑片触头标号 'P' (默认 true) */
  showWiperMark?: boolean
}

import { getRheostatLayout } from './rheostatGeometry'

export const Rheostat: React.FC<RheostatProps> = ({
  x = 0,
  y = 0,
  value = 50,
  min = 0,
  max = 100,
  width = 140,
  showLabel = true,
  label = '滑动变阻器 R',
  unit = 'Ω',
  disabled = false,
  className = '',
  font = (base: number) => base,
  wiringMode = 'current-limiting',
  variant = 'realistic',
  showWiperMark = true,
}) => {
  const c = SCENE_COLORS.circuit
  const layout = getRheostatLayout(width)

  // 比例计算游标位置 [0, 1]
  const range = max - min
  const ratio = range > 0 ? Math.max(0, Math.min(1, (value - min) / range)) : 0

  // 游标滑片在 local 坐标系下的位置
  const wiperX = layout.wiperOffset + ratio * layout.wiperRange

  if (variant === 'symbolic') {
    const boxW = 48 * layout.scale
    const boxH = 16 * layout.scale
    const sliderY = -18 * layout.scale
    const contactY = -8 * layout.scale
    const isDivider = wiringMode === 'voltage-divider'
    
    // 游标 x 坐标限制在电阻框的有效横向区间内
    const symbolicWiperX = -18 * layout.scale + ratio * 36 * layout.scale
    
    return (
      <g
        transform={`translate(${x}, ${y})`}
        className={`${className} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      >
        {/* 电阻框符号 (标准空心长方形) */}
        <rect
          x={-boxW / 2}
          y={-boxH / 2}
          width={boxW}
          height={boxH}
          fill={CANVAS_COLORS.white}
          stroke={SCENE_COLORS.circuit.resistorStroke}
          strokeWidth={2 * layout.scale}
        />
        
        {/* 上方水平滑轨导线（与主回路导线完全统一配色与线宽） */}
        <line
          x1={-36 * layout.scale}
          y1={sliderY}
          x2={36 * layout.scale}
          y2={sliderY}
          stroke={SCENE_COLORS.circuit.wire}
          strokeWidth={2.5 * layout.scale}
        />
        {/* 滑轨两端接线柱端子圆点 */}
        <circle cx={-36 * layout.scale} cy={sliderY} r={2.2 * layout.scale} fill={SCENE_COLORS.circuit.wire} />
        <circle cx={36 * layout.scale} cy={sliderY} r={2.2 * layout.scale} fill={SCENE_COLORS.circuit.wire} />
        
        {/* ── 核心物理连线：限流式 vs 分压式（高中物理教科书标准画法） ── */}
        {isDivider ? (
          /* 分压式接法：两下端连接电阻框两端，上端滑轨引出 */
          <>
            {/* 左下引线：自外部 (-73, 0) 直通连入电阻框左侧 (-boxW / 2, 0) */}
            <line
              x1={-73 * layout.scale}
              y1={0}
              x2={-boxW / 2}
              y2={0}
              stroke={SCENE_COLORS.circuit.wire}
              strokeWidth={2.5 * layout.scale}
            />
            <circle cx={-boxW / 2} cy={0} r={2.2 * layout.scale} fill={SCENE_COLORS.circuit.wire} />
            {/* 右下引线：自电阻框右侧 (boxW / 2, 0) 直通连至外部 (73, 0) */}
            <line
              x1={boxW / 2}
              y1={0}
              x2={73 * layout.scale}
              y2={0}
              stroke={SCENE_COLORS.circuit.wire}
              strokeWidth={2.5 * layout.scale}
            />
            <circle cx={boxW / 2} cy={0} r={2.2 * layout.scale} fill={SCENE_COLORS.circuit.wire} />
            {/* 上侧分压输出引线：滑轨向左平直接出至外部 (-73, sliderY) */}
            <line
              x1={-36 * layout.scale}
              y1={sliderY}
              x2={-73 * layout.scale}
              y2={sliderY}
              stroke={SCENE_COLORS.circuit.wire}
              strokeWidth={2.5 * layout.scale}
            />
          </>
        ) : (
          /* 限流式接法：一上一下（教科书标准画法：左下进、右上出）
             - 左下回路自外部端子 (-73, 0) 平直连入电阻框左端 (-boxW / 2, 0)
             - 接入电阻丝长度严格为 [-boxW / 2, symbolicWiperX]，滑片右移阻值严格单调增大
             - 右上回路自上方滑杆右端 (36, sliderY) 正交折弯引出至外部端子 (73, 0)
             - 电阻框右端完全留空未接，与滑轨左端悬空形成严密的标准一上一下拓扑
          */
          <>
            {/* 左侧输入回路：外部水平导线平直连至电阻框左端 (-boxW / 2, 0) */}
            <line
              x1={-73 * layout.scale}
              y1={0}
              x2={-boxW / 2}
              y2={0}
              stroke={SCENE_COLORS.circuit.wire}
              strokeWidth={2.5 * layout.scale}
            />
            <circle cx={-boxW / 2} cy={0} r={2.2 * layout.scale} fill={SCENE_COLORS.circuit.wire} />
            {/* 右侧输出回路：自滑轨右端 (36, sliderY) 正交直角引下至外部端子 (73, 0) */}
            <path
              d={`M ${36 * layout.scale} ${sliderY} L ${42 * layout.scale} ${sliderY} L ${42 * layout.scale} 0 L ${73 * layout.scale} 0`}
              fill="none"
              stroke={SCENE_COLORS.circuit.wire}
              strokeWidth={2.5 * layout.scale}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        
        {/* 指向电阻框的滑动触头箭头（滑片 P） */}
        <g>
          {/* 触点垂直引线 */}
          <line
            x1={symbolicWiperX}
            y1={sliderY}
            x2={symbolicWiperX}
            y2={contactY}
            stroke={PHYSICS_COLORS.alertRed}
            strokeWidth={1.8 * layout.scale}
          />
          {/* 指向电阻框的箭头 */}
          <polygon
            points={`
              ${symbolicWiperX},${contactY}
              ${symbolicWiperX - 3.5 * layout.scale},${contactY - 6 * layout.scale}
              ${symbolicWiperX + 3.5 * layout.scale},${contactY - 6 * layout.scale}
            `}
            fill={PHYSICS_COLORS.alertRed}
          />
        </g>
        
        {/* 滑片触头符号标注 P */}
        {showWiperMark && (
          <text
            x={symbolicWiperX}
            y={sliderY - 4 * layout.scale}
            fill={PHYSICS_COLORS.alertRed}
            fontSize={font(9)}
            fontWeight="bold"
            textAnchor="middle"
            style={{ userSelect: 'none' }}
          >
            P
          </text>
        )}

        {/* 可选阻值文本标签 */}
        {showLabel && (
          <text
            x={0}
            y={24 * layout.scale}
            fill={PHYSICS_COLORS.labelText}
            fontSize={font(10.5)}
            fontWeight="bold"
            textAnchor="middle"
            style={{ userSelect: 'none' }}
          >
            {label} = {value.toFixed(1)} {unit}
          </text>
        )}
      </g>
    )
  }

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={`${className} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
    >
      {/* 1. 陶瓷瓷管底座 */}
      <rect
        x={-layout.coilW / 2}
        y={-layout.coilH / 2}
        width={layout.coilW}
        height={layout.coilH}
        rx={2 * layout.scale}
        fill={SCENE_COLORS.electricalApparatus.rheostatCeramic}
        stroke={c.resistorStroke}
        strokeWidth={1.5 * layout.scale}
      />

      {/* 2. 细密铜线螺线圈 */}
      {Array.from({ length: 36 }).map((_, i) => {
        const lx = -layout.coilW / 2 + 2 * layout.scale + i * (layout.coilW * 0.97 / 35)
        return (
          <line
            key={`coil-${i}`}
            x1={lx}
            y1={-layout.coilH / 2}
            x2={lx}
            y2={layout.coilH / 2}
            stroke={SCENE_COLORS.coil.copperBase}
            strokeWidth={0.8 * layout.scale}
            opacity={0.7}
            pointerEvents="none"
          />
        )
      })}

      {/* 3. 变阻器金属支架与滑杆 */}
      {/* 左右两侧支撑架 */}
      <path
        d={`M ${-73 * layout.scale} ${12 * layout.scale} L ${-73 * layout.scale} ${-20 * layout.scale} L ${-67 * layout.scale} ${-20 * layout.scale}`}
        fill="none"
        stroke={ELECTRICAL.terminalBody}
        strokeWidth={2 * layout.scale}
        strokeLinecap="round"
      />
      <path
        d={`M ${73 * layout.scale} ${12 * layout.scale} L ${73 * layout.scale} ${-20 * layout.scale} L ${67 * layout.scale} ${-20 * layout.scale}`}
        fill="none"
        stroke={ELECTRICAL.terminalBody}
        strokeWidth={2 * layout.scale}
        strokeLinecap="round"
      />
      {/* 上方水平金属导电滑杆 */}
      <line 
        x1={-71 * layout.scale} 
        y1={-20 * layout.scale} 
        x2={71 * layout.scale} 
        y2={-20 * layout.scale} 
        stroke={ELECTRICAL.terminalCore} 
        strokeWidth={3 * layout.scale} 
        strokeLinecap="round" 
      />

      {/* 4. 四个物理接线柱 */}
      {[-73, 73].map((cx) => [-20, 10].map((cy) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx * layout.scale} cy={cy * layout.scale} r={3.5 * layout.scale} fill={ELECTRICAL.rheostatBase} stroke={ELECTRICAL.terminalCap} strokeWidth={0.5 * layout.scale} />
          <circle cx={cx * layout.scale} cy={cy * layout.scale} r={1.2 * layout.scale} fill={ELECTRICAL.terminalCore} />
        </g>
      )))}

      {/* 5. 动态滑片游标 */}
      <g transform={`translate(${wiperX}, 0)`}>
        {/* 上部滑套 */}
        <rect x={-6 * layout.scale} y={-24 * layout.scale} width={12 * layout.scale} height={8 * layout.scale} fill={ELECTRICAL.terminalCore} stroke={ELECTRICAL.rheostatBase} strokeWidth={1 * layout.scale} rx={1 * layout.scale} />
        {/* 下垂弹簧片 */}
        <path d={`M ${-3 * layout.scale} ${-16 * layout.scale} L ${-3 * layout.scale} ${10 * layout.scale} L ${3 * layout.scale} ${10 * layout.scale} L ${3 * layout.scale} ${-16 * layout.scale} Z`} fill={ELECTRICAL.rheostatSlider} opacity="0.95" />
        <line x1={-4 * layout.scale} y1={10 * layout.scale} x2={4 * layout.scale} y2={10 * layout.scale} stroke={ELECTRICAL.rheostatWire} strokeWidth={1.5 * layout.scale} />
        {/* 指示金属小接点 */}
        <circle cx={0} cy={10 * layout.scale} r={2 * layout.scale} fill={ELECTRICAL.rheostatContact} />
        {/* 顶部红热塑料手柄 */}
        <circle cx={0} cy={-28 * layout.scale} r={5 * layout.scale} fill={SCENE_COLORS.circuit.meterNeedle} stroke={SCENE_COLORS.circuit.meterFrame} strokeWidth={1 * layout.scale} />
        <circle cx={0} cy={-28 * layout.scale} r={1.5 * layout.scale} fill={SCENE_COLORS.circuit.meterScale} />
      </g>

      {/* 6. 可选阻值文本标签 */}
      {showLabel && (
        <text
          x={0}
          y={26 * layout.scale}
          fill={PHYSICS_COLORS.labelText}
          fontSize={font(10.5)}
          fontWeight="bold"
          textAnchor="middle"
          style={{ userSelect: 'none' }}
        >
          {label} = {value.toFixed(1)} {unit}
        </text>
      )}
    </g>
  )
}


