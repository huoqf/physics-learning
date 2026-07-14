import { DASH, FONT, OPACITY, PHYSICS_COLORS, STROKE, SCENE_COLORS } from '@/theme/physics'
import { VectorArrow, Ball, Block, SportsCar, ConductingRod, PhysicsGround, CapacitorPlates, MagneticFieldSymbols } from '@/components/Physics'
import { useForceMotionSandbox, getSpringPath } from './hooks/useForceMotionSandbox'
import type { ForceMotionSandboxProps } from './hooks/useForceMotionSandbox'

export type { ForceMotionSandboxProps }

export default function ForceMotionSandbox(props: ForceMotionSandboxProps) {
  const {
    containerRef, width, height, font,
    view, sceneScale, trackPath,
    forceArrowColor, forceLabel, terminalForceVectors,
    groundY, xWall, springPath,
    electricFieldLines, circularRadius, magneticGrid,
    showGround, tickInterval, params,
  } = useForceMotionSandbox(props)
  const { state } = props

  return (
    <div ref={containerRef} className="w-full h-full bg-white rounded-xl border border-neutral-100 overflow-hidden">
      <svg width={width} height={height} className="w-full h-full select-none" role="img" aria-label="力与运动探究沙箱">
        <defs>
        </defs>

        {/* 坐标网格 */}
        <g opacity={OPACITY.grid}>
          {Array.from({ length: 11 }, (_, i) => {
            const x = width * 0.1 * i
            return <line key={`vg-${i}`} x1={x} y1={0} x2={x} y2={height} stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} />
          })}
          {Array.from({ length: 7 }, (_, i) => {
            const y = height * 0.15 * i
            return <line key={`hg-${i}`} x1={0} y1={y} x2={width} y2={y} stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} />
          })}
        </g>

        {/* 坐标轴 (如果显示地面，则隐藏水平X坐标轴以免双线冲突) */}
        {!showGround && (
          <line x1={0} x2={width} y1={view.originY} y2={view.originY} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />
        )}
        <line x1={view.originX} x2={view.originX} y1={0} y2={height} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} />

        {/* 物理支撑面/地面（含动态标尺刻度） */}
        {showGround && (
          <PhysicsGround
            x={0}
            y={groundY}
            width={width}
            appearance={{ showHatch: true }}
            ruler={(state.mode === 'uniform-accel-line' || state.mode === 'uniform-decel-line') ? {
              domain: [-view.originX / view.scale, (width - view.originX) / view.scale],
              tickInterval: tickInterval,
              minorTicks: 4,
              showAxisLine: true,
              unit: 'm',
              axisLabel: 'x',
              axisOffset: 0,
            } : undefined}
          />
        )}

        {/* 简谐振动模式的弹簧与固定墙体 */}
        {state.mode === 'simple-harmonic' && (
          <>
            {/* 墙体本体及拟物斜线条纹 */}
            <g opacity={0.8}>
              <line x1={xWall} y1={view.body.cy - 20} x2={xWall} y2={view.body.cy + 20} stroke={PHYSICS_COLORS.axis} strokeWidth={4} />
              {Array.from({ length: 5 }).map((_, i) => (
                <line key={i} x1={xWall} y1={view.body.cy - 16 + i * 8} x2={xWall - 5} y2={view.body.cy - 12 + i * 8} stroke={PHYSICS_COLORS.axis} strokeWidth={1} />
              ))}
            </g>
            {/* 拟物弹簧折线 */}
            <path d={springPath} fill="none" stroke={SCENE_COLORS.materials.structStrokeLight} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {/* 斜抛运动发射器 (模式 3) */}
        {state.mode === 'constant-angle-curve' && (
          <g opacity={0.8} transform={`translate(${view.originX}, ${view.originY})`}>
            <line
              x1={0}
              y1={0}
              x2={20 * Math.cos((params.theta * Math.PI) / 180)}
              y2={-20 * Math.sin((params.theta * Math.PI) / 180)}
              stroke={SCENE_COLORS.materials.structStrokeMid}
              strokeWidth={6}
              strokeLinecap="round"
            />
            <path d="M-10 0 L10 0 L5 -6 L-5 -6 Z" fill={SCENE_COLORS.materials.structFill} />
          </g>
        )}

        {/* 偏转板与偏转极极板 (模式 4) */}
        {state.mode === 'projectile-like' && (
          <>
            <CapacitorPlates
              x={40}
              y={view.originY}
              width={width - 80}
              gap={height * 0.65}
              chargeSign={state.Fy > 0 ? -1 : 1}
              showField={true}
            />
            {/* 均匀分布的电场线 */}
            {electricFieldLines.map((line, idx) => {
              const isFyPositive = state.Fy > 0
              const y1 = isFyPositive ? line.y2 : line.y1
              const y2 = isFyPositive ? line.y1 : line.y2
              return (
                <g key={`ef-${idx}`} opacity={0.5}>
                  <line
                    x1={line.x}
                    y1={y1}
                    x2={line.x}
                    y2={y2}
                    stroke={PHYSICS_COLORS.electricFieldLine}
                    strokeWidth={1.5}
                    strokeDasharray={DASH.reference.join(' ')}
                  />
                  <polygon
                    points={`${line.x - 3.5},${isFyPositive ? (y1 + y2) / 2 + 3 : (y1 + y2) / 2 - 3} ${line.x + 3.5},${isFyPositive ? (y1 + y2) / 2 + 3 : (y1 + y2) / 2 - 3} ${line.x},${isFyPositive ? (y1 + y2) / 2 - 4 : (y1 + y2) / 2 + 4}`}
                    fill={PHYSICS_COLORS.electricFieldLine}
                  />
                </g>
              )
            })}
          </>
        )}

        {/* 圆周运动轨道与转轴心轴连杆拉绳 (模式 5, 6) */}
        {(state.mode === 'uniform-circular' || state.mode === 'variable-circular') && (
          <>
            {/* 圆周轨道线 */}
            <circle
              cx={view.originX}
              cy={view.originY}
              r={circularRadius}
              fill="none"
              stroke={PHYSICS_COLORS.axis}
              strokeWidth={1.5}
              strokeDasharray={DASH.guide.join(' ')}
              opacity={0.4}
            />
            {/* 拉绳/连杆 */}
            {(() => {
              const isRod = state.mode === 'variable-circular' && params.env2 > 0.5
              const isRopeSlack = state.mode === 'variable-circular' && !isRod && state.isTerminal

              if (isRod) {
                return (
                  <g opacity={0.95}>
                    <line x1={view.originX} y1={view.originY} x2={view.body.cx} y2={view.body.cy} stroke={SCENE_COLORS.materials.structStrokePale} strokeWidth={5} strokeLinecap="round" />
                    <line x1={view.originX} y1={view.originY} x2={view.body.cx} y2={view.body.cy} stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={1} strokeLinecap="round" />
                  </g>
                )
              } else {
                if (isRopeSlack) {
                  const slackPath = getSpringPath(view.originX, view.originY, view.body.cx, view.body.cy, 6, 3)
                  return (
                    <path
                      d={slackPath}
                      fill="none"
                      stroke={PHYSICS_COLORS.tension}
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      opacity={0.6}
                    />
                  )
                } else {
                  return (
                    <line
                      x1={view.originX}
                      y1={view.originY}
                      x2={view.body.cx}
                      y2={view.body.cy}
                      stroke={PHYSICS_COLORS.tension}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  )
                }
              }
            })()}
            {/* 圆心转轴销 */}
            <circle cx={view.originX} cy={view.originY} r={5} fill={SCENE_COLORS.materials.structStrokeMid} stroke={SCENE_COLORS.materials.structStroke} strokeWidth={1.5} />
            <circle cx={view.originX} cy={view.originY} r={1.5} fill={SCENE_COLORS.materials.specularWhite} />
          </>
        )}

        {/* 垂直下行马路 (模式 9 功率启动子模式) */}
        {state.mode === 'terminal-variable-force' && !(params.env3 > 0.5) && (
          <g opacity={0.6}>
            <line x1={view.originX - 45} y1={0} x2={view.originX - 45} y2={height} stroke={PHYSICS_COLORS.axis} strokeWidth={2} />
            <line x1={view.originX + 45} y1={0} x2={view.originX + 45} y2={height} stroke={PHYSICS_COLORS.axis} strokeWidth={2} />
            <line
              x1={view.originX}
              y1={0}
              x2={view.originX}
              y2={height}
              stroke={PHYSICS_COLORS.axis}
              strokeWidth={1}
              strokeDasharray="10 8"
            />
          </g>
        )}

        {/* 垂直导轨与背景磁场 (模式 9 阻力单杆子模式) */}
        {state.mode === 'terminal-variable-force' && params.env3 > 0.5 && (
          <>
            <line x1={view.originX - 35} y1={0} x2={view.originX - 35} y2={height} stroke={SCENE_COLORS.materials.structStrokeLight} strokeWidth={3} />
            <line x1={view.originX + 35} y1={0} x2={view.originX + 35} y2={height} stroke={SCENE_COLORS.materials.structStrokeLight} strokeWidth={3} />

            <MagneticFieldSymbols
              points={magneticGrid}
              direction="in"
              strokeWidth={1}
            />
          </>
        )}

        {/* 轨迹线 */}
        {trackPath && (
          <path
            d={trackPath}
            fill="none"
            stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={STROKE.trackHistory}
            strokeDasharray={DASH.trackHistory.join(' ')}
            opacity={OPACITY.trackHistory}
          />
        )}

        {/* 运动物体渲染 */}
        {(() => {
          if (state.mode === 'uniform-accel-line' || state.mode === 'uniform-decel-line') {
            const cartW = view.objectSize * 1.4
            const cartH = view.objectSize * 0.8
            return (
              <Block
                x={view.body.cx - cartW / 2}
                y={view.body.cy + view.objectSize * 0.5 - cartH}
                width={cartW}
                height={cartH}
                type="metalCart"
                label={`${params.m} kg`}
              />
            )
          }

          if (state.mode === 'terminal-variable-force') {
            const isPowerMode = !(params.env3 > 0.5)
            if (isPowerMode) {
              const carW = view.objectSize * 1.4
              const carH = view.objectSize * 0.65
              return (
                <g transform={`translate(${view.body.cx}, ${view.body.cy}) rotate(90)`}>
                  <SportsCar
                    x={-carW / 2}
                    y={-carH / 2}
                    width={carW}
                    height={carH}
                    velocity={state.v}
                    time={state.t}
                    showTailwind={true}
                  />
                </g>
              )
            } else {
              return (
                <>
                  <g transform={`translate(${view.body.cx}, ${view.body.cy}) rotate(90) translate(${-view.body.cx}, ${-height / 2})`}>
                    <ConductingRod
                      type="horizontal"
                      x={view.body.cx}
                      spacing={70}
                      height={height}
                      currentDir="in"
                    />
                  </g>
                  {/* 电位标注 */}
                  <g fontSize={font(FONT.axis)} fontWeight="bold" opacity={0.9}>
                    <text x={view.body.cx - 48} y={view.body.cy + 5} fill={PHYSICS_COLORS.negativeCharge} textAnchor="end">−</text>
                    <text x={view.body.cx + 48} y={view.body.cy + 5} fill={PHYSICS_COLORS.positiveCharge} textAnchor="start">+</text>
                  </g>
                </>
              )
            }
          }

          let ballPreset: 'steel' | 'oscillatorMetal' | 'brassWeight' | 'pendulumBob' = 'steel'
          if (state.mode === 'simple-harmonic') ballPreset = 'oscillatorMetal'
          else if (state.mode === 'constant-angle-curve') ballPreset = 'brassWeight'
          else if (state.mode === 'uniform-circular' || state.mode === 'variable-circular') ballPreset = 'pendulumBob'

          return (
            <Ball
              cx={view.body.cx}
              cy={view.body.cy}
              r={view.objectSize * 0.5}
              type={ballPreset}
            />
          )
        })()}

        {/* 合外力矢量 F/分力/合力 （依据物理语义涂色） */}
        {state.mode !== 'balance' && state.mode !== 'terminal-variable-force' && (
          <VectorArrow
            originDesign={{ x: view.body.cx, y: view.body.cy }}
            vector={{ x: view.forceVector.x, y: -view.forceVector.y }}
            type="force"
            color={forceArrowColor}
            sceneScale={sceneScale}
            pixelLength={Math.sqrt(view.forceVector.x ** 2 + view.forceVector.y ** 2)}
          />
        )}

        {/* 模式 9 收尾变力的受力分解渲染 */}
        {state.mode === 'terminal-variable-force' && terminalForceVectors && (
          <>
            {/* 1. 驱动外力 F_drive (向下) */}
            <VectorArrow
              originDesign={{ x: view.body.cx, y: view.body.cy }}
              vector={{ x: 0, y: -terminalForceVectors.driveLen }}
              type="force"
              color={PHYSICS_COLORS.appliedForce}
              sceneScale={sceneScale}
              pixelLength={terminalForceVectors.driveLen}
            />
            <text
              x={view.body.cx + 8}
              y={view.body.cy + terminalForceVectors.driveLen}
              fill={PHYSICS_COLORS.appliedForce}
              fontSize={font(FONT.axis)}
              fontWeight="bold"
            >{terminalForceVectors.isPowerMode ? 'F牵引' : 'F外'}</text>

            {/* 2. 阻力 F_resist (向上) */}
            <VectorArrow
              originDesign={{ x: view.body.cx, y: view.body.cy }}
              vector={{ x: 0, y: terminalForceVectors.resistLen }}
              type="force"
              color={terminalForceVectors.isPowerMode ? PHYSICS_COLORS.airResistance : PHYSICS_COLORS.lorentzForce}
              sceneScale={sceneScale}
              pixelLength={terminalForceVectors.resistLen}
            />
            <text
              x={view.body.cx + 8}
              y={view.body.cy - terminalForceVectors.resistLen}
              fill={terminalForceVectors.isPowerMode ? PHYSICS_COLORS.airResistance : PHYSICS_COLORS.lorentzForce}
              fontSize={font(FONT.axis)}
              fontWeight="bold"
            >{terminalForceVectors.isPowerMode ? 'f' : 'F安'}</text>

            {/* 3. 合力 F_net (向下，右侧偏移渲染) */}
            <VectorArrow
              originDesign={{ x: view.body.cx + 25, y: view.body.cy }}
              vector={{ x: 0, y: -terminalForceVectors.netLen }}
              type="force"
              color={PHYSICS_COLORS.forceNet}
              sceneScale={sceneScale}
              pixelLength={terminalForceVectors.netLen}
            />
            <text
              x={view.body.cx + 33}
              y={view.body.cy + terminalForceVectors.netLen}
              fill={PHYSICS_COLORS.forceNet}
              fontSize={font(FONT.axis)}
              fontWeight="bold"
            >F合</text>
          </>
        )}

        {/* 速度矢量 v — 蓝色 */}
        <VectorArrow
          originDesign={{ x: view.body.cx, y: view.body.cy }}
          vector={{ x: view.speedVector.x, y: -view.speedVector.y }}
          type="velocity"
          sceneScale={sceneScale}
          pixelLength={Math.sqrt(view.speedVector.x ** 2 + view.speedVector.y ** 2)}
        />
        {(() => {
          const fontSize = font(FONT.axis)
          const offset = fontSize * 1.5
          const clampY = (y: number) => Math.max(fontSize, Math.min(height - fontSize, y))

          const vLabelX = state.v < 0.1
            ? view.body.cx + view.objectSize
            : view.body.cx + view.speedVector.x + offset
          const vLabelY = state.v < 0.1
            ? view.body.cy
            : view.body.cy + view.speedVector.y

          const aLabelX = view.body.cx + view.accelVector.x + offset
          const aLabelRawY = view.body.cy + view.accelVector.y
          const aLabelY = Math.abs(aLabelRawY - vLabelY) < fontSize * 1.5
            ? clampY(Math.max(aLabelRawY, vLabelY) + fontSize * 1.5)
            : aLabelRawY

          const forceLabelRawY = view.body.cy + view.forceVector.y
          const tooCloseToV = Math.abs(forceLabelRawY - vLabelY) < fontSize * 1.5
          const tooCloseToA = Math.abs(forceLabelRawY - aLabelY) < fontSize * 1.5
          const forceLabelY = (tooCloseToV || tooCloseToA)
            ? clampY(forceLabelRawY + fontSize * 1.5)
            : forceLabelRawY

          return (
            <>
              <text
                x={vLabelX}
                y={vLabelY}
                fill={PHYSICS_COLORS.velocity}
                fontSize={fontSize}
              >v</text>

              <text
                x={aLabelX}
                y={aLabelY}
                fill={PHYSICS_COLORS.acceleration}
                fontSize={fontSize}
              >a</text>

              {/* forceLabel 在 v/a 渲染之后再定位，但需要提前计算 y */}
              <text
                x={view.body.cx + view.forceVector.x + FONT.small}
                y={forceLabelY}
                fill={forceArrowColor}
                fontSize={fontSize}
                fontWeight="bold"
              >{forceLabel}</text>
            </>
          )
        })()}
      </svg>
    </div>
  )
}
