import { FC } from 'react'
import {
  CapacitorPlates,
  CoilBase,
  DCSource,
  DC_SOURCE_SYMBOL_OFFSET,
  DialMeter,
  LightBulb,
  VectorArrow,
} from '@/components/Physics'
import { AC_COIL_DC_RESISTANCE } from '@/physics/electromagnetism/acImpedance'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import {
  CANVAS_COLORS,
  EM_COLORS,
  PHYSICS_COLORS,
  SCENE_COLORS,
  STROKE,
  withAlpha,
} from '@/theme/physics'
import type { CanvasSize } from '@/utils'
import type { ACImpedancePhysicsResult, BranchState } from '../hooks/useACImpedancePhysics'

interface ACImpedanceSceneProps {
  physics: ACImpedancePhysicsResult
  canvasSize: CanvasSize
  time: number
}

const AC_SOURCE_RADIUS = 20

function ACSourceSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle
        cx={0}
        cy={0}
        r={AC_SOURCE_RADIUS}
        fill={CANVAS_COLORS.white}
        stroke={EM_COLORS.electricPotential}
        strokeWidth={STROKE.objectLine}
      />
      <path
        d="M -11 0 Q -5.5 -9, 0 0 T 11 0"
        fill="none"
        stroke={EM_COLORS.electricPotential}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </g>
  )
}

/**
 * 水平导线上的微观载流子微粒：
 * - dc-flow：持续向右流动，直观表现恒定/爬升电流；
 * - dc-charge / oscillate：绕平衡位置往复或充电单次位移，绝不越过电容极板绝缘空隙。
 */
function WireChargeDots({
  x1,
  x2,
  y,
  motionMode,
  phase,
  amplitudeScale,
  active,
}: {
  x1: number
  x2: number
  y: number
  motionMode: 'oscillate' | 'dc-flow' | 'dc-charge'
  phase: number
  amplitudeScale: number
  active: boolean
}) {
  if (!active || x2 - x1 < 24) return null

  const span = x2 - x1
  const spacing = 22
  const positions: number[] = []

  if (motionMode === 'dc-flow') {
    const count = Math.max(1, Math.floor(span / spacing))
    const step = span / count
    for (let i = 0; i < count; i++) {
      const px = x1 + ((i + phase) % count) * step
      if (px >= x1 + 3 && px <= x2 - 3) positions.push(px)
    }
  } else {
    const count = Math.max(1, Math.floor((span - 16) / spacing))
    const step = (span - 16) / count
    const shift =
      motionMode === 'dc-charge'
        ? phase * 10
        : phase * 7 * amplitudeScale
    for (let i = 0; i < count; i++) {
      const anchor = x1 + 8 + (i + 0.5) * step
      const px = Math.max(x1 + 3, Math.min(x2 - 3, anchor + shift))
      positions.push(px)
    }
  }

  return (
    <g pointerEvents="none">
      {positions.map((px, idx) => (
        <circle
          key={idx}
          cx={px}
          cy={y}
          r={2.5}
          fill={PHYSICS_COLORS.electricCurrent}
          stroke={CANVAS_COLORS.white}
          strokeWidth={0.8}
        />
      ))}
    </g>
  )
}

export const ACImpedanceScene: FC<ACImpedanceSceneProps> = ({
  physics,
  canvasSize,
  time,
}) => {
  const { font } = canvasSize
  const {
    mode,
    isDC,
    filterType,
    hasCore,
    voltage,
    frequency,
    capacitance,
    resistance,
    branches,
    totalCurrent,
    totalInstantSign,
    transient,
    filterState,
  } = physics

  // ── 模式 2：扼流圈与旁路电容滤波电路 ───────────────────────────────────
  if (mode === 2) {
    const topY = 86
    const bottomY = 238
    const sourceX = 95
    const sourceY = 162
    const coilX = 255
    const coilHalfW = 50
    const srcResX = 195
    const srcResHalfW = 24
    const capX = 320
    const capPlateWidth = 36
    const capGap = 30
    const capThickness = 5
    const capTopOuterY = sourceY - capGap / 2 - capThickness
    const capBottomOuterY = sourceY + capGap / 2 + capThickness
    const loadX = 450
    const loadHalfH = 28
    const outX = 515

    const isChoke = filterType === 0 || filterType === 1
    const isLowFreqChoke = filterType === 0
    const visualCoilCurrent = isLowFreqChoke ? 0.55 : 0.9 * Math.sin(time * 5)
    const visualCapSign = Math.sin(time * 8) >= 0 ? '+' : '-'

    const gainRows = [
      { label: '直流 (0Hz)', gain: filterState.dcGain, color: EM_COLORS.electricPotential },
      { label: '低频 (50Hz)', gain: filterState.lfGain, color: EM_COLORS.capacitor },
      { label: '高频 (2kHz)', gain: filterState.hfGain, color: EM_COLORS.electricCurrent },
    ]

    return (
      <g className="ac-impedance-scene select-none">
        <g
          fill="none"
          stroke={SCENE_COLORS.circuit.wire}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points={`${sourceX},${sourceY - AC_SOURCE_RADIUS} ${sourceX},${topY}`} />
          <polyline points={`${sourceX},${sourceY + AC_SOURCE_RADIUS} ${sourceX},${bottomY}`} />

          {isChoke ? (
            <>
              <line x1={sourceX} y1={topY} x2={coilX - coilHalfW} y2={topY} />
              <line x1={coilX + coilHalfW} y1={topY} x2={outX} y2={topY} />
            </>
          ) : (
            <>
              <line x1={sourceX} y1={topY} x2={srcResX - srcResHalfW} y2={topY} />
              <line x1={srcResX + srcResHalfW} y1={topY} x2={outX} y2={topY} />
              <line x1={capX} y1={topY} x2={capX} y2={capTopOuterY} />
              <line x1={capX} y1={capBottomOuterY} x2={capX} y2={bottomY} />
            </>
          )}

          <line x1={sourceX} y1={bottomY} x2={outX} y2={bottomY} />
          <line x1={loadX} y1={topY} x2={loadX} y2={sourceY - loadHalfH} />
          <line x1={loadX} y1={sourceY + loadHalfH} x2={loadX} y2={bottomY} />
        </g>

        <circle cx={loadX} cy={topY} r={3.5} fill={SCENE_COLORS.circuit.node} />
        <circle cx={loadX} cy={bottomY} r={3.5} fill={SCENE_COLORS.circuit.node} />
        {!isChoke && (
          <>
            <circle cx={capX} cy={topY} r={3.5} fill={SCENE_COLORS.circuit.node} />
            <circle cx={capX} cy={bottomY} r={3.5} fill={SCENE_COLORS.circuit.node} />
          </>
        )}

        <circle cx={outX} cy={topY} r={4} fill={CANVAS_COLORS.white} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2} />
        <circle cx={outX} cy={bottomY} r={4} fill={CANVAS_COLORS.white} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2} />

        <ACSourceSymbol x={sourceX} y={sourceY} />
        <text
          x={sourceX}
          y={bottomY + 22}
          textAnchor="middle"
          fontSize={font(10.5)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
        >
          混合输入 (直+低+高)
        </text>

        {isChoke ? (
          <g>
            <CoilBase
              x={coilX}
              y={topY}
              width={coilHalfW * 2}
              height={isLowFreqChoke ? 28 : 24}
              turns={isLowFreqChoke ? 7 : 4}
              leadType="horizontal"
              ironCorePadX={4}
              ironCorePadY={4}
              showIronCore={isLowFreqChoke}
              current={visualCoilCurrent}
              time={time}
              animated
              leadEndpointRadius={2.5}
            />
            <text
              x={coilX}
              y={topY - 24}
              textAnchor="middle"
              fontSize={font(11)}
              fill={EM_COLORS.inductor}
              fontWeight="bold"
            >
              {isLowFreqChoke ? '低频扼流圈 (大 L · 铁芯)' : '高频扼流圈 (小 L · 少匝)'}
            </text>
          </g>
        ) : (
          <g>
            <rect
              x={srcResX - srcResHalfW}
              y={topY - 9}
              width={srcResHalfW * 2}
              height={18}
              rx={2}
              fill={SCENE_COLORS.circuit.resistorFill}
              stroke={SCENE_COLORS.circuit.resistorStroke}
              strokeWidth={STROKE.objectLine}
            />
            <text
              x={srcResX}
              y={topY - 16}
              textAnchor="middle"
              fontSize={font(10)}
              fill={CANVAS_COLORS.labelText}
              fontWeight="bold"
            >
              限流电阻
            </text>

            <CapacitorPlates
              x={capX - capPlateWidth / 2}
              y={sourceY}
              width={capPlateWidth}
              gap={capGap}
              thickness={capThickness}
              orientation="horizontal"
              chargeSign={visualCapSign}
              showField={true}
              showElectricFieldLines={true}
              chargeDensity={2}
            />
            <text
              x={capX - 24}
              y={sourceY + 4}
              textAnchor="end"
              fontSize={font(10.5)}
              fill={EM_COLORS.capacitor}
              fontWeight="bold"
            >
              旁路电容 C
            </text>
          </g>
        )}

        <rect
          x={loadX - 11}
          y={sourceY - loadHalfH}
          width={22}
          height={loadHalfH * 2}
          rx={2}
          fill={SCENE_COLORS.circuit.resistorFill}
          stroke={SCENE_COLORS.circuit.resistorStroke}
          strokeWidth={STROKE.objectLine}
        />
        <text
          x={loadX - 18}
          y={sourceY + 4}
          textAnchor="end"
          fontSize={font(10.5)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
        >
          {`负载 R=${resistance}Ω`}
        </text>
        <text
          x={outX + 10}
          y={sourceY + 4}
          textAnchor="start"
          fontSize={font(10.5)}
          fill={EM_COLORS.electricCurrent}
          fontWeight="bold"
        >
          输出
        </text>

        <g transform="translate(570, 48)">
          <rect
            x={0}
            y={0}
            width={248}
            height={220}
            rx={8}
            fill={CANVAS_COLORS.objectFillNeutral}
            stroke={CANVAS_COLORS.grid}
            strokeWidth={1.2}
          />
          <text
            x={16}
            y={26}
            fontSize={font(11.5)}
            fill={CANVAS_COLORS.labelText}
            fontWeight="bold"
          >
            各频率成分输出通过率
          </text>
          <line x1={14} y1={38} x2={234} y2={38} stroke={CANVAS_COLORS.grid} strokeWidth={1} />

          {gainRows.map((row, idx) => {
            const rowY = 66 + idx * 54
            const barW = 216
            const fillW = Math.max(2, barW * row.gain)
            const pct = Math.round(row.gain * 100)
            return (
              <g key={row.label} transform={`translate(16, ${rowY})`}>
                <text x={0} y={0} fontSize={font(10.5)} fill={CANVAS_COLORS.labelText} fontWeight="bold">
                  {row.label}
                </text>
                <text
                  x={216}
                  y={0}
                  textAnchor="end"
                  fontSize={font(10.5)}
                  fill={row.color}
                  fontWeight="bold"
                >
                  {`${pct}%`}
                </text>
                <rect
                  x={0}
                  y={10}
                  width={barW}
                  height={12}
                  rx={6}
                  fill={withAlpha(row.color, 0.14)}
                />
                <rect
                  x={0}
                  y={10}
                  width={Math.min(barW, fillW)}
                  height={12}
                  rx={6}
                  fill={row.color}
                />
              </g>
            )
          })}
        </g>
      </g>
    )
  }

  // ── 模式 0（扫频三灯）& 模式 1（充放交直双灯）────────────────────────────
  const isThreeBranch = mode === 0
  const busLeftX = 115
  const busRightX = 740
  const branchYs = isThreeBranch ? [54, 128, 202] : [82, 178]
  const busBottomY = isThreeBranch ? 274 : 268

  const deviceX = 315
  const meterX = 485
  const bulbX = 645
  const sourceCenterX = 425

  const meterR = isThreeBranch ? 17 : 20
  const bulbScale = isThreeBranch ? 0.78 : 0.85
  const bulbHalfBase = 12 * bulbScale
  const resHalfW = 30
  const coilHalfW = 44
  // 极板间距 [20, 30] 随 C 增大变窄，且留出充裕空间保证电荷符号与电场线清晰不碰撞
  const capGap = Math.round(30 - ((capacitance - 5) / 95) * 10)
  const capThickness = 5
  const capHalfSpan = capGap / 2 + capThickness

  const getDeviceHalfSpan = (branch: BranchState) => {
    if (branch.deviceType === 'resistor') return resHalfW
    if (branch.deviceType === 'inductor') return coilHalfW
    return capHalfSpan
  }

  const renderBranchDevice = (branch: BranchState, y: number) => {
    if (branch.deviceType === 'resistor') {
      const rw = resHalfW * 2
      const rh = 18
      return (
        <g>
          <rect
            x={deviceX - resHalfW}
            y={y - rh / 2}
            width={rw}
            height={rh}
            fill={SCENE_COLORS.circuit.resistorFill}
            stroke={SCENE_COLORS.circuit.resistorStroke}
            strokeWidth={STROKE.objectLine}
            rx={2}
          />
          <text
            x={deviceX}
            y={y + 3.5}
            textAnchor="middle"
            fontSize={font(9.5)}
            fill={CANVAS_COLORS.labelText}
            fontWeight="bold"
          >
            {branch.seriesResistance > 0 ? `R=${AC_COIL_DC_RESISTANCE}Ω` : '直通'}
          </text>
        </g>
      )
    }

    if (branch.deviceType === 'inductor') {
      return (
        <g>
          <CoilBase
            x={deviceX}
            y={y}
            width={coilHalfW * 2}
            height={26}
            turns={6}
            leadType="horizontal"
            ironCorePadX={4}
            ironCorePadY={4}
            showIronCore={hasCore}
            current={branch.displayCurrent * branch.instantCurrent}
            time={time}
            animated
            leadEndpointRadius={2.5}
          />
          {!isThreeBranch && (
            <text
              x={deviceX}
              y={y - 23}
              textAnchor="middle"
              fontSize={font(10)}
              fill={EM_COLORS.inductor}
              fontWeight="bold"
            >
              {isDC
                ? `自感阻碍 · i₂ = ${branch.displayCurrent.toFixed(2)} A`
                : `X_L = ${branch.reactance.toFixed(1)} Ω`}
            </text>
          )}
        </g>
      )
    }

    // 电容器（竖直两板 + 极板电荷 + 绝缘隙电场线，绝不让粒子穿过极板）
    const chargeSign =
      Math.abs(branch.instantCharge) < 0.08
        ? 'none'
        : branch.instantCharge >= 0
          ? '+'
          : '-'
    const capH = isThreeBranch ? 32 : 38

    return (
      <g>
        <CapacitorPlates
          x={deviceX}
          y={y}
          height={capH}
          gap={capGap}
          thickness={capThickness}
          orientation="vertical"
          chargeSign={chargeSign}
          showField={true}
          showElectricFieldLines={true}
          chargeDensity={2}
        />
        {!isThreeBranch && (
          <>
            <text
              x={deviceX}
              y={y - 25}
              textAnchor="middle"
              fontSize={font(10)}
              fill={EM_COLORS.capacitor}
              fontWeight="bold"
            >
              {isDC
                ? `极板电荷 ${Math.round(Math.abs(branch.instantCharge) * 100)}%`
                : Number.isFinite(branch.reactance)
                  ? `X_C = ${branch.reactance.toFixed(1)} Ω`
                  : 'X_C = ∞ (隔直)'}
            </text>
            <text
              x={deviceX}
              y={y + 32}
              textAnchor="middle"
              fontSize={font(9.5)}
              fill={CANVAS_COLORS.labelTextLight}
            >
              {isDC
                ? Math.abs(branch.instantCharge) > 0.95
                  ? '已充满 · 绝缘断路'
                  : '电荷涌向极板充电'
                : '极板外往复充放电'}
            </text>
          </>
        )}
      </g>
    )
  }

  return (
    <g className="ac-impedance-scene select-none">
      {/* 右上角实时运行语义标注 */}
      <text
        x={826}
        y={18}
        textAnchor="end"
        fontSize={font(9.5)}
        fill={CANVAS_COLORS.labelTextLight}
        fontWeight="bold"
      >
        {isThreeBranch
          ? `扫频 f = ${frequency.toFixed(0)} Hz`
          : isDC
            ? '直流接通暂态慢放'
            : '交流慢放示波'}
      </text>

      {/* 1. 标准阶梯并联导线网络（端子级精准对齐） */}
      <g
        fill="none"
        stroke={SCENE_COLORS.circuit.wire}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1={busLeftX} y1={busBottomY} x2={busLeftX} y2={branchYs[0]} />
        <line x1={busRightX} y1={busBottomY} x2={busRightX} y2={branchYs[0]} />

        {branches.map((branch, idx) => {
          const y = branchYs[idx]
          const devHalf = getDeviceHalfSpan(branch)
          return (
            <g key={branch.id}>
              <line x1={busLeftX} y1={y} x2={deviceX - devHalf} y2={y} />
              <line x1={deviceX + devHalf} y1={y} x2={meterX - meterR} y2={y} />
              <line x1={meterX + meterR} y1={y} x2={bulbX - bulbHalfBase} y2={y} />
              <line x1={bulbX + bulbHalfBase} y1={y} x2={busRightX} y2={y} />
            </g>
          )
        })}

        <line
          x1={busLeftX}
          y1={busBottomY}
          x2={sourceCenterX - (isDC ? DC_SOURCE_SYMBOL_OFFSET : AC_SOURCE_RADIUS)}
          y2={busBottomY}
        />
        <line
          x1={sourceCenterX + (isDC ? DC_SOURCE_SYMBOL_OFFSET : AC_SOURCE_RADIUS)}
          y1={busBottomY}
          x2={busRightX}
          y2={busBottomY}
        />
      </g>

      {branchYs.map((y) => (
        <g key={`node-${y}`}>
          <circle cx={busLeftX} cy={y} r={3.8} fill={SCENE_COLORS.circuit.node} />
          <circle cx={busRightX} cy={y} r={3.8} fill={SCENE_COLORS.circuit.node} />
        </g>
      ))}

      {/* 2. 各支路元件 + 导线微粒 + 电流表 + 灯泡 */}
      {branches.map((branch, idx) => {
        const y = branchYs[idx]
        const devHalf = getDeviceHalfSpan(branch)
        const currentDir = isDC ? 1 : branch.instantCurrent >= 0 ? 1 : -1
        const showBranchArrow =
          branch.displayCurrent > 0.02 && (isDC || Math.abs(branch.instantCurrent) > 0.08)
        const dotsActive =
          branch.dotMotionMode === 'dc-charge'
            ? true
            : branch.displayCurrent > 0.02 || (!isDC && branch.current > 0.02)

        return (
          <g key={`branch-${branch.id}`}>
            <text
              x={busLeftX - 10}
              y={y + 4}
              textAnchor="end"
              fontSize={font(10.5)}
              fill={CANVAS_COLORS.labelText}
              fontWeight="bold"
            >
              {branch.shortLabel}
            </text>

            {/* 极板/元件左右两侧外电路导线上的微观电荷微粒（绝不穿过电容绝缘隙） */}
            <WireChargeDots
              x1={busLeftX + 10}
              x2={deviceX - devHalf - 4}
              y={y}
              motionMode={branch.dotMotionMode}
              phase={branch.dotPhase}
              amplitudeScale={branch.dotAmplitudeScale}
              active={dotsActive}
            />
            <WireChargeDots
              x1={deviceX + devHalf + 4}
              x2={meterX - meterR - 4}
              y={y}
              motionMode={branch.dotMotionMode}
              phase={branch.dotPhase}
              amplitudeScale={branch.dotAmplitudeScale}
              active={dotsActive}
            />

            {renderBranchDevice(branch, y)}

            {showBranchArrow && (
              <VectorArrow
                originDesign={{ x: currentDir > 0 ? 178 : 198, y }}
                vector={{ x: currentDir, y: 0 }}
                type="currentDirection"
                arrowType="visual-only"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={20}
                font={font}
              />
            )}

            <DialMeter
              type="A"
              variant="symbolic"
              value={branch.displayCurrent}
              max={4}
              x={meterX}
              y={y}
              r={meterR}
              font={font}
              showLabel={false}
            />
            <text
              x={meterX}
              y={y + meterR + 13}
              textAnchor="middle"
              fontSize={font(10)}
              fill={EM_COLORS.electricCurrent}
              fontWeight="bold"
            >
              {`${branch.displayCurrent.toFixed(2)} A`}
            </text>

            <LightBulb
              x={bulbX}
              y={y - bulbHalfBase}
              power={branch.displayPower}
              time={time}
              scale={bulbScale}
              showLabel={false}
              font={font}
            />
            <text
              x={bulbX}
              y={y + (isThreeBranch ? 22 : 24)}
              textAnchor="middle"
              fontSize={font(9.5)}
              fill={CANVAS_COLORS.labelTextLight}
              fontWeight="bold"
            >
              {isDC && isThreeBranch === false && transient
                ? `${branch.bulbLabel} · ${(branch.displayCurrent * branch.displayCurrent * resistance).toFixed(1)}W`
                : `${branch.bulbLabel} · ${branch.bulbPower.toFixed(1)}W`}
            </text>
          </g>
        )
      })}

      {/* 3. 底部电源组件 */}
      {isDC ? (
        <DCSource
          type="symbol"
          orientation="horizontal"
          polarity="left-positive"
          x={sourceCenterX}
          y={busBottomY}
          label=""
        />
      ) : (
        <ACSourceSymbol x={sourceCenterX} y={busBottomY} />
      )}
      <text
        x={sourceCenterX}
        y={busBottomY + 34}
        textAnchor="middle"
        fontSize={font(10.5)}
        fill={CANVAS_COLORS.labelText}
        fontWeight="bold"
      >
        {isDC
          ? `稳压直流源 U = ${voltage}V`
          : `正弦交流源 U = ${voltage}V (f = ${frequency.toFixed(0)}Hz)`}
      </text>

      {/* 4. 干路总电流箭头与读数 */}
      {totalCurrent > 0.02 && totalInstantSign !== 0 && (
        <VectorArrow
          originDesign={{
            x: totalInstantSign > 0 ? 270 : 250,
            y: busBottomY,
          }}
          vector={{ x: -totalInstantSign, y: 0 }}
          type="currentDirection"
          arrowType="visual-only"
          sceneScale={IDENTITY_SCENE_SCALE}
          pixelLength={22}
          font={font}
        />
      )}
      <text
        x={260}
        y={busBottomY - 11}
        textAnchor="middle"
        fontSize={font(10)}
        fill={PHYSICS_COLORS.electricCurrent}
        fontWeight="bold"
      >
        {isDC && !isThreeBranch ? `i_总 = ${totalCurrent.toFixed(2)} A` : `I_总 = ${totalCurrent.toFixed(2)} A`}
      </text>
    </g>
  )
}
