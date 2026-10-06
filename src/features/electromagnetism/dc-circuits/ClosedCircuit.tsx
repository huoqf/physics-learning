import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { calculateClosedCircuit } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, CIRCUIT_COLORS } from '@/theme/physics'
import { DialMeter, Rheostat } from '@/components/Physics'
import { useClosedCircuitScene } from './hooks/useClosedCircuitScene'

const LAYOUT = {
  // 回路边框：宽 480，高 180，左 170，右 650，顶 50，底 230
  loop: { left: 170, top: 50, right: 650, bottom: 230 },
  // 电源区域：中心在底线上
  batteryBox: { x: 265, y: 190, width: 285, height: 75 },
  // 仪表半径
  meterR: 28,
  rheostat: { x: 410, y: 50, width: 120 },
} as const

export default function ClosedCircuit() {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })
  const { font } = canvasSize

  const EMF = params.EMF ?? 6
  const r = params.r ?? 2
  const R = params.R ?? 10
  const highlightLoss = (params.highlightLoss ?? 0) === 1

  const { I, U_terminal } = calculateClosedCircuit(EMF, r, R)
  const { heatOpacity } = useClosedCircuitScene(I, time, highlightLoss)

  // 坐标解构
  const { left, right, top, bottom } = LAYOUT.loop
  const rhScale = LAYOUT.rheostat.width / 140
  const rhLeft = LAYOUT.rheostat.x - 73 * rhScale
  const rhRight = LAYOUT.rheostat.x + 73 * rhScale
  const ammeterY = 140
  const voltmeterY = 120
  const voltmeterX = 410

  // 电源端子坐标
  const batteryTermLeft = LAYOUT.batteryBox.x
  const batteryTermRight = LAYOUT.batteryBox.x + LAYOUT.batteryBox.width

  // 电池符号极板坐标
  const cellNegX = 330
  const cellPosX = 350

  // 内阻 r 矩形坐标
  const rBoxX = 430
  const rBoxW = 40
  const rBoxH = 20

  const wireColor = CIRCUIT_COLORS.wire
  const activeColor = PHYSICS_COLORS.electricCurrent

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-white rounded-xl">
      <defs>
        {/* 内阻发热暗红色系渐变 */}
        <radialGradient id="heat-grad" cx="70%" cy="50%" r="50%">
          <stop offset="0%" stopColor={CANVAS_COLORS.dangerDark} stopOpacity="1" />
          <stop offset="70%" stopColor={CANVAS_COLORS.dangerGradient} stopOpacity="0.8" />
          <stop offset="100%" stopColor={CANVAS_COLORS.dangerGradient} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g>
        {/* ==================== 1. 主回路导线系统 (端子级精确定位，杜绝穿透) ==================== */}
        <g stroke={wireColor} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* 顶路导线 1：左上拐角 -> 滑动变阻器左端子 */}
          <line x1={left} y1={top} x2={rhLeft} y2={top} />
          {/* 顶路导线 2：滑动变阻器右端子 -> 右上拐角 */}
          <line x1={rhRight} y1={top} x2={right} y2={top} />

          {/* 右竖导线 1：右上拐角 -> 电流表顶端子 (避开表盘 R=28) */}
          <line x1={right} y1={top} x2={right} y2={ammeterY - LAYOUT.meterR} />
          {/* 右竖导线 2：电流表底端子 -> 右下拐角 */}
          <line x1={right} y1={ammeterY + LAYOUT.meterR} x2={right} y2={bottom} />

          {/* 底路导线 1：右下拐角 -> 电源右接线柱 (正极/内阻输出) */}
          <line x1={right} y1={bottom} x2={batteryTermRight} y2={bottom} />
          {/* 底路导线 2：电源左接线柱 (负极输入) -> 左下拐角 */}
          <line x1={batteryTermLeft} y1={bottom} x2={left} y2={bottom} />

          {/* 左竖导线：左下拐角 -> 左上拐角 */}
          <line x1={left} y1={bottom} x2={left} y2={top} />

          {/* 并联电压表引线：从电源左右两端接线柱引出，沿外侧上升接入电压表左右端子 */}
          <path
            d={`M ${batteryTermLeft} ${bottom} V ${voltmeterY} H ${voltmeterX - LAYOUT.meterR}`}
            stroke={PHYSICS_COLORS.axis}
            strokeWidth={2}
          />
          <path
            d={`M ${batteryTermRight} ${bottom} V ${voltmeterY} H ${voltmeterX + LAYOUT.meterR}`}
            stroke={PHYSICS_COLORS.axis}
            strokeWidth={2}
          />
        </g>

        {/* 关键电气节点圆点 */}
        <circle cx={batteryTermLeft} cy={bottom} r={4} fill={PHYSICS_COLORS.labelText} />
        <circle cx={batteryTermRight} cy={bottom} r={4} fill={PHYSICS_COLORS.labelText} />

        {/* ==================== 2. 高中物理规范电流矢量指示 ==================== */}
        {I > 0.02 && (
          <g fill={activeColor} stroke="none" opacity={0.9}>
            {/* 顶路向右 */}
            <polygon points={`240,${top - 4} 248,${top} 240,${top + 4}`} />
            <polygon points={`550,${top - 4} 558,${top} 550,${top + 4}`} />
            {/* 右路向下 */}
            <polygon points={`${right - 4},85 ${right},93 ${right + 4},85`} />
            <polygon points={`${right - 4},195 ${right},203 ${right + 4},195`} />
            {/* 底路向左回流 */}
            <polygon points={`590,${bottom - 4} 582,${bottom} 590,${bottom + 4}`} />
            <polygon points={`210,${bottom - 4} 202,${bottom} 210,${bottom + 4}`} />
            {/* 左路向上 */}
            <polygon points={`${left - 4},145 ${left},137 ${left + 4},145`} />
          </g>
        )}

        {/* ==================== 3. 真实电源组件 (虚线框内) ==================== */}
        <g>
          {/* 电源虚线框 */}
          <rect
            x={LAYOUT.batteryBox.x}
            y={LAYOUT.batteryBox.y}
            width={LAYOUT.batteryBox.width}
            height={LAYOUT.batteryBox.height}
            fill="none"
            stroke={PHYSICS_COLORS.axis}
            strokeWidth={1.5}
            strokeDasharray="5,4"
            rx={6}
          />
          {/* 虚线框标题 */}
          <text
            x={LAYOUT.batteryBox.x + LAYOUT.batteryBox.width / 2}
            y={LAYOUT.batteryBox.y - 7}
            fill={PHYSICS_COLORS.labelText}
            fontSize={font(11)}
            fontWeight="bold"
            textAnchor="middle"
          >
            真实电源 (电动势 E, 内阻 r)
          </text>

          {/* 内阻热效应半透明高亮遮罩 */}
          <rect
            x={LAYOUT.batteryBox.x + 2}
            y={LAYOUT.batteryBox.y + 2}
            width={LAYOUT.batteryBox.width - 4}
            height={LAYOUT.batteryBox.height - 4}
            rx={5}
            fill="url(#heat-grad)"
            opacity={heatOpacity}
            style={{ transition: 'opacity 0.2s ease-out' }}
            pointerEvents="none"
          />

          {/* 电源内部接线：从左接线端至负极片 */}
          <line x1={batteryTermLeft} y1={bottom} x2={cellNegX} y2={bottom} stroke={wireColor} strokeWidth={2.8} />

          {/* 负极片：短而粗 */}
          <line x1={cellNegX} y1={bottom - 10} x2={cellNegX} y2={bottom + 10} stroke={CIRCUIT_COLORS.batteryNeg} strokeWidth={4} strokeLinecap="round" />
          <text x={cellNegX - 10} y={bottom - 12} fill={CIRCUIT_COLORS.batteryNeg} fontSize={font(11)} fontWeight="bold" textAnchor="middle">-</text>

          {/* 正极片：长而细 */}
          <line x1={cellPosX} y1={bottom - 18} x2={cellPosX} y2={bottom + 18} stroke={CIRCUIT_COLORS.batteryPos} strokeWidth={2.2} strokeLinecap="round" />
          <text x={cellPosX + 10} y={bottom - 12} fill={CIRCUIT_COLORS.batteryPos} fontSize={font(11)} fontWeight="bold" textAnchor="middle">+</text>

          {/* 非静电力做功指示 F非 (自负极指向正极) */}
          {I > 0.05 && (
            <g transform={`translate(${(cellNegX + cellPosX) / 2}, ${bottom - 16})`}>
              <line x1={-8} y1={0} x2={8} y2={0} stroke={CIRCUIT_COLORS.wireActive} strokeWidth={2} />
              <path d="M 4 -3 L 8 0 L 4 3" fill="none" stroke={CIRCUIT_COLORS.wireActive} strokeWidth={1.5} />
              <text x={0} y={-4} fill={CIRCUIT_COLORS.wireActive} fontSize={font(9)} fontWeight="bold" textAnchor="middle">F非</text>
            </g>
          )}

          {/* 电池正极至内阻 r 过渡导线 */}
          <line x1={cellPosX} y1={bottom} x2={rBoxX} y2={bottom} stroke={wireColor} strokeWidth={2.8} />

          {/* 串联内阻 r 标准矩形 */}
          <g transform={`translate(${rBoxX}, ${bottom - rBoxH / 2})`}>
            <rect
              x={0}
              y={0}
              width={rBoxW}
              height={rBoxH}
              fill={SCENE_COLORS.circuit.resistorFill}
              stroke={SCENE_COLORS.circuit.resistorStroke}
              strokeWidth={2}
              rx={2}
            />
            <text x={rBoxW / 2} y={rBoxH / 2 + 4} fill={CANVAS_COLORS.labelText} fontSize={font(11)} fontWeight="bold" textAnchor="middle">
              r
            </text>
          </g>

          {/* 内阻 r 至右接线端过渡导线 */}
          <line x1={rBoxX + rBoxW} y1={bottom} x2={batteryTermRight} y2={bottom} stroke={wireColor} strokeWidth={2.8} />
        </g>

        {/* ==================== 4. 滑动变阻器元件 R (教科书标准符号) ==================== */}
        <Rheostat
          x={LAYOUT.rheostat.x}
          y={LAYOUT.rheostat.y}
          value={R}
          min={0.1}
          max={20}
          width={LAYOUT.rheostat.width}
          variant="symbolic"
          showLabel={false}
          font={font}
        />
        <text
          x={LAYOUT.rheostat.x}
          y={LAYOUT.rheostat.y - 38}
          fill={PHYSICS_COLORS.labelText}
          fontSize={font(11)}
          fontWeight="bold"
          textAnchor="middle"
        >
          滑动变阻器 R = {R.toFixed(1)} Ω
        </text>

        {/* ==================== 5. 测量电表 (原理图统一符号模式) ==================== */}
        {/* 路端电压表 V：并联在电源两端 */}
        <DialMeter
          type="V"
          variant="symbolic"
          value={U_terminal}
          max={12}
          x={voltmeterX}
          y={voltmeterY}
          r={LAYOUT.meterR}
          showLabel={false}
          font={font}
        />
        <text
          x={voltmeterX}
          y={voltmeterY + LAYOUT.meterR + 14}
          fill={PHYSICS_COLORS.emf}
          fontSize={font(11)}
          fontWeight="bold"
          textAnchor="middle"
        >
          U外 = {U_terminal.toFixed(2)} V
        </text>

        {/* 干路电流表 A：串联在干路右侧 */}
        <DialMeter
          type="A"
          variant="symbolic"
          value={I}
          max={4}
          x={right}
          y={ammeterY}
          r={LAYOUT.meterR}
          showLabel={false}
          font={font}
        />
        <text
          x={right + LAYOUT.meterR + 12}
          y={ammeterY + 4}
          fill={PHYSICS_COLORS.electricCurrent}
          fontSize={font(11)}
          fontWeight="bold"
          textAnchor="start"
        >
          I = {I.toFixed(2)} A
        </text>
      </g>
    </AnimationSvgCanvas>
  )
}

