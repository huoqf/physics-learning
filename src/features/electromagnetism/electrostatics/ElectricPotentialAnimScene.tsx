import React, { type RefObject } from 'react'
import { PHYSICS_COLORS, EM_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { radius } from '@/theme/radius'
import { shadow } from '@/theme/shadow'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import type { ElectricPotentialPhysicsResult, PathPoint } from './hooks/useElectricPotentialPhysics'

interface Props {
  w: number
  hAnim: number
  physics: ElectricPotentialPhysicsResult
  drawMode: number
  isPlaying: boolean
  runProgress: number
  qProbe: number
  handPath: PathPoint[]
  handPathD: string
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void
  animSvgRef: RefObject<SVGSVGElement | null>
  font: (v: number) => number
}

export function ElectricPotentialAnimScene({
  w,
  hAnim,
  physics,
  drawMode,
  isPlaying,
  runProgress,
  qProbe,
  handPath,
  handPathD,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  animSvgRef,
  font,
}: Props) {
  const {
    posA,
    posB,
    posQ,
    particleCanvasPos,
    particlePhysics,
    eFieldVectors,
    hoverIndicator,
    particleForceArrow,
  } = physics

  return (
    <div className="w-full flex-1 relative bg-white border-t border-neutral-100">
      <svg
        ref={animSvgRef}
        width={w}
        height={hAnim}
        className={`w-full h-full block ${drawMode === 1 && !isPlaying ? 'cursor-crosshair' : 'cursor-default'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* 定义箭头和渐变 */}
        <defs>
          {/* 接地符号 Marker，电路符号非物理矢量，不适用铁律 1d */}
          <marker id="ground-symbol" viewBox="0 0 10 10" refX="5" refY="0" markerWidth="10" markerHeight="10" orient="auto">
            <line x1={5} y1={0} x2={5} y2={6} stroke={CANVAS_COLORS.trackHistory} strokeWidth={1.5} />
            <line x1={1} y1={6} x2={9} y2={6} stroke={CANVAS_COLORS.trackHistory} strokeWidth={1.5} />
            <line x1={2.5} y1={8} x2={7.5} y2={8} stroke={CANVAS_COLORS.trackHistory} strokeWidth={1.5} />
            <line x1={4} y1={10} x2={6} y2={10} stroke={CANVAS_COLORS.trackHistory} strokeWidth={1.5} />
          </marker>
          {/* 场源正电荷光晕渐变 */}
          <radialGradient id="source-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PHYSICS_COLORS.positiveCharge} stopOpacity="0.22" />
            <stop offset="100%" stopColor={PHYSICS_COLORS.positiveCharge} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. 地面 0V 刻画 (地线) */}
        <line
          x1={0}
          y1={hAnim}
          x2={w}
          y2={hAnim}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={3}
        />
        {/* 接地引脚符号 */}
        <rect x={w / 2 - 2} y={hAnim - 1} width={4} height={1} fill="none" markerEnd="url(#ground-symbol)" opacity={0.65} />

        {/* 2. 背景非匀强矢量电场箭头网格 */}
        <g opacity={0.85}>
          {eFieldVectors.map((v, i) => {
            const len = Math.sqrt(v.dx * v.dx + v.dy * v.dy)
            return len > 0.1 ? (
              <VectorArrow
                key={`ev-${i}`}
                origin={{ x: v.cx, y: v.cy }}
                vector={{ x: v.dx, y: -v.dy }}
                type="electricField"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={len}
                strokeWidth={1.0}
              />
            ) : null
          })}
        </g>

        {/* 3. A、B 端点与水平辅助虚线 */}
        <line
          x1={posA.cx}
          y1={posA.cy}
          x2={posB.cx}
          y2={posB.cy}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={1.5}
          strokeDasharray="4,6"
        />

        {/* A 锚点 */}
        {drawMode === 1 && !isPlaying && handPath.length === 0 && (
          <circle
            cx={posA.cx}
            cy={posA.cy}
            r={22}
            fill="none"
            stroke={EM_COLORS.electricPotential}
            strokeWidth={2}
            className="animate-ping"
            opacity={0.65}
            style={{ pointerEvents: 'none' }}
          />
        )}
        <circle
          cx={posA.cx}
          cy={posA.cy}
          r={12}
          fill="white"
          stroke={drawMode === 1 && !isPlaying ? EM_COLORS.electricPotential : colors.neutral[400]}
          strokeWidth={1.8}
          style={{ cursor: drawMode === 1 && !isPlaying ? 'crosshair' : 'default' }}
        />
        <circle cx={posA.cx} cy={posA.cy} r={4} fill={drawMode === 1 && !isPlaying ? EM_COLORS.electricPotential : colors.neutral[500]} />
        <text
          x={posA.cx}
          y={posA.cy + 24}
          fontSize={font(10.5)}
          fontWeight="black"
          fill={drawMode === 1 && !isPlaying ? EM_COLORS.electricPotential : colors.neutral[600]}
          textAnchor="middle"
        >
          A (起点)
        </text>

        {/* B 锚点 */}
        <circle cx={posB.cx} cy={posB.cy} r={12} fill="white" stroke={colors.neutral[400]} strokeWidth={1.5} />
        <circle cx={posB.cx} cy={posB.cy} r={4} fill={colors.neutral[500]} />
        <text x={posB.cx} y={posB.cy + 24} fontSize={font(10.5)} fontWeight="black" fill={colors.neutral[600]} textAnchor="middle">
          B (终点)
        </text>

        {/* 4. 场源正电荷 */}
        <circle cx={posQ.cx} cy={posQ.cy} r={45} fill="url(#source-glow)" />
        <circle cx={posQ.cx} cy={posQ.cy} r={18} fill={PHYSICS_COLORS.positiveCharge} stroke="white" strokeWidth={1.8} className="drop-shadow-md" />
        <text x={posQ.cx} y={posQ.cy} fontSize={font(16)} fontWeight="bold" fill="white" textAnchor="middle" dominantBaseline="middle">
          +Q
        </text>
        <text x={posQ.cx} y={posQ.cy - 24} fontSize={font(9.5)} fontWeight="bold" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
          固电荷场源 (+2μC)
        </text>

        {/* 5. 轨道路径渲染 */}
        {/* 如果是直线路径 */}
        {drawMode === 0 && (
          <line
            x1={posA.cx}
            y1={posA.cy}
            x2={posB.cx}
            y2={posB.cy}
            stroke={EM_COLORS.electricPotential}
            strokeWidth={3}
            opacity={0.8}
            strokeLinecap="round"
          />
        )}

        {/* 如果是手绘路径 */}
        {drawMode === 1 && handPathD && (
          <path
            d={handPathD}
            fill="none"
            stroke={EM_COLORS.electricPotential}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
        )}

        {/* 如果开启手绘且还没有画，给出浅灰色连线提示 */}
        {drawMode === 1 && handPath.length === 0 && (
          <g opacity={0.5}>
            <path
              d={`M ${posA.cx},${posA.cy} C ${(posA.cx + posB.cx)/2},${posA.cy - 120} ${(posA.cx + posB.cx)/2},${posA.cy - 120} ${posB.cx},${posB.cy}`}
              fill="none"
              stroke={colors.neutral[400]}
              strokeWidth={2}
              strokeDasharray="4,4"
            />
            <text x={(posA.cx + posB.cx)/2} y={posA.cy - 70} fontSize={font(11)} fill={colors.neutral[500]} textAnchor="middle" fontWeight="bold">
              ✍️ 按住 A 拖动鼠标绘制自定义轨迹至 B
            </text>
          </g>
        )}

        {/* 6. Hover 图像时，在动画直线上显示的高亮黄色场强矢量 */}
        {!isPlaying && (
          <g>
            {/* 垂直指示线虚线段 */}
            <line
              x1={hoverIndicator.cx}
              y1={0}
              x2={hoverIndicator.cx}
              y2={hAnim}
              stroke={PHYSICS_COLORS.tangentLine}
              strokeWidth={1}
              strokeDasharray="2,4"
              opacity={0.5}
            />
            {/* 场强指示矢量箭头 */}
            <VectorArrow
              origin={{ x: hoverIndicator.cx, y: hoverIndicator.cy }}
              vector={{ x: hoverIndicator.dx, y: -hoverIndicator.dy }}
              type="electricField"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={Math.sqrt(hoverIndicator.dx * hoverIndicator.dx + hoverIndicator.dy * hoverIndicator.dy)}
              strokeWidth={hoverIndicator.thickness}
            />
            <text
              x={hoverIndicator.cx + hoverIndicator.dx + (hoverIndicator.dx >= 0 ? 12 : -12)}
              y={hoverIndicator.cy + hoverIndicator.dy - 6}
              fontSize={font(11.5)}
              fontWeight="black"
              fill={PHYSICS_COLORS.electricField}
              textAnchor="middle"
            >
              Eₓ
            </text>
            <circle cx={hoverIndicator.cx} cy={hoverIndicator.cy} r={4} fill={PHYSICS_COLORS.electricField} />
          </g>
        )}

        {/* 7. 粒子主体 (带虚线交互外圈) */}
        {(isPlaying || runProgress > 0) && (
          <g>
            {/* 受力橙色箭头 */}
            {particleForceArrow && (
              <g>
                <VectorArrow
                  origin={{ x: particleCanvasPos.cx, y: particleCanvasPos.cy }}
                  vector={{ x: particleForceArrow.dx, y: -particleForceArrow.dy }}
                  type="electricForce"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  pixelLength={Math.sqrt(particleForceArrow.dx * particleForceArrow.dx + particleForceArrow.dy * particleForceArrow.dy)}
                  strokeWidth={2.8}
                />
                <text
                  x={particleCanvasPos.cx + particleForceArrow.dx + (particleForceArrow.dx >= 0 ? 12 : -12)}
                  y={particleCanvasPos.cy + particleForceArrow.dy + 4}
                  fontSize={font(11)}
                  fontWeight="black"
                  fill={PHYSICS_COLORS.electricForce}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  F_电
                </text>
              </g>
            )}

            {/* 粒子外环 */}
            <circle
              cx={particleCanvasPos.cx}
              cy={particleCanvasPos.cy}
              r={16}
              fill="none"
              stroke={PHYSICS_COLORS.electricForce}
              strokeWidth={1.2}
              strokeDasharray="3,3"
              opacity={0.8}
              className="animate-[spin_8s_linear_infinite]"
            />
            {/* 粒子白色衬底 */}
            <circle cx={particleCanvasPos.cx} cy={particleCanvasPos.cy} r={10} fill="white" opacity={0.85} />
            {/* 粒子实体球 */}
            <circle
              cx={particleCanvasPos.cx}
              cy={particleCanvasPos.cy}
              r={8.5}
              fill={qProbe >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
              stroke="white"
              strokeWidth={1.2}
              className="drop-shadow-md"
            />
            {/* 电性符号 */}
            <text
              x={particleCanvasPos.cx}
              y={particleCanvasPos.cy + 0.2}
              fontSize={font(12)}
              fontWeight="black"
              fill="white"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {qProbe >= 0 ? '+' : '−'}
            </text>
            {/* 粒子标注 */}
            <text
              x={particleCanvasPos.cx}
              y={particleCanvasPos.cy - 18}
              fontSize={font(9.5)}
              fontWeight="bold"
              fill={PHYSICS_COLORS.labelText}
              textAnchor="middle"
            >
              试探电荷 ({qProbe >= 0 ? '+' : ''}{qProbe.toFixed(1)}μC)
            </text>
          </g>
        )}
      </svg>

      {/* 玻璃拟态卡片：实时能量堆栈槽 */}
      <div
        className="absolute right-4 bottom-4 z-10 bg-white/80 backdrop-blur-md border border-neutral-200/50 rounded-xl p-3 flex flex-col items-center select-none"
        style={{
          boxShadow: shadow.md,
          borderRadius: radius.lg,
          width: '150px',
        }}
      >
        <span className="font-bold text-neutral-500 mb-2.5" style={{ fontSize: font(10) }}>实时能量变化 (守恒)</span>
        
        <div className="h-28 flex justify-around items-end w-full relative px-2">
          {/* 中间百分比虚线 */}
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-neutral-200 flex justify-between text-neutral-300 font-mono pointer-events-none" style={{ fontSize: font(7.5) }}>
            <span>总能 E</span>
          </div>
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-neutral-200 flex justify-between text-neutral-300 font-mono pointer-events-none" style={{ fontSize: font(7.5) }}>
            <span>50%</span>
          </div>

          {/* 动能柱 (青色) */}
          <div className="flex flex-col items-center h-full justify-end w-10">
            <div className="w-4.5 h-full bg-neutral-100/50 border border-neutral-200/30 rounded-full flex items-end overflow-hidden">
              <div
                className="w-full rounded-full transition-all duration-150 ease-out"
                style={{ height: `${isPlaying || runProgress > 0 ? particlePhysics.pctEk : 50}%`, backgroundColor: PHYSICS_COLORS.kineticEnergy }}
              />
            </div>
            <span className="font-bold mt-1 font-mono" style={{ fontSize: font(10), color: PHYSICS_COLORS.kineticEnergy }}>Ek</span>
            <span className="font-medium" style={{ fontSize: font(8), color: PHYSICS_COLORS.kineticEnergy }}>动能</span>
          </div>

          {/* 势能柱 (紫色) */}
          <div className="flex flex-col items-center h-full justify-end w-10">
            <div className="w-4.5 h-full bg-neutral-100/50 border border-neutral-200/30 rounded-full flex items-end overflow-hidden">
              <div
                className="w-full rounded-full transition-all duration-150 ease-out"
                style={{ height: `${isPlaying || runProgress > 0 ? particlePhysics.pctEp : 50}%`, backgroundColor: PHYSICS_COLORS.potentialEnergy }}
              />
            </div>
            <span className="font-bold mt-1 font-mono" style={{ fontSize: font(10), color: PHYSICS_COLORS.potentialEnergy }}>Ep</span>
            <span className="font-medium" style={{ fontSize: font(8), color: PHYSICS_COLORS.potentialEnergy }}>电势能</span>
          </div>
        </div>
      </div>

      {/* 标题与操作提示 */}
      <div className="absolute left-4 top-2 pointer-events-none bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs flex items-center gap-2 border border-neutral-200/50 shadow-sm">
        <span className="font-bold text-neutral-600">非匀强电场物理动画 (匀强场 + 点电荷)</span>
        {drawMode === 1 && !isPlaying && handPath.length === 0 && (
          <span className="alert-card-info py-0.5 px-2 font-bold" style={{ fontSize: font(10) }}>
            ✍️ 请按住 A 点拖拽画线至 B
          </span>
        )}
      </div>
    </div>
  )
}
