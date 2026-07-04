import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { HandRule } from '@/components/Physics/HandRule'
import { solveBasicAmpere, solveAdvancedAmpere } from '@/physics'
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { CANVAS_COLORS } from '@/theme/physics'

// 子组件导入
import BasicAmpereScene from './components/BasicAmpereScene'
import AmpereFIChart from './components/AmpereFIChart'
import InclinedAmpereScene from './components/InclinedAmpereScene'
import InclineForceDiagram from './components/InclineForceDiagram'
import ForcePolygon from './components/ForcePolygon'

export default function AmpereForce() {
  const {params, time, showVectors} = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full)
  const { font } = canvasSize
  const DESIGN_WIDTH = 700
  const DESIGN_HEIGHT = 400

  // 读取控制参数
  const mode = params.mode ?? 0
  const I = params.I ?? 2.0
  const B = params.B ?? 1.0
  const theta = params.theta ?? 30
  const L = params.L ?? 4.0
  const mu = params.mu ?? 0.2
  const thetaIB = params.thetaIB ?? 90
  const bFieldDir = params.bFieldDir ?? 0
  const showLeftHand = params.showLeftHand !== 0
  const showForceComponents = params.showForceComponents !== 0

  // 1. 物理层计算
  const basicResult = useMemo(() => {
    return solveBasicAmpere(I, B, thetaIB, L, 0.5, time)
  }, [I, B, thetaIB, L, time])

  const advancedResult = useMemo(() => {
    return solveAdvancedAmpere(I, B, theta, mu, bFieldDir, 4.0, 0.5, time)
  }, [I, B, theta, mu, bFieldDir, time])

  // 2. 左手定则手势姿态向量计算 (仅基础模式，严格匹配 HandRuleProps 定义)
  const handPoseParams = useMemo(() => {
    const handActive = Math.abs(I) > 0.01 && Math.abs(B) > 0.01
    
    // 中指：电流方向（向上为 {x:0, y:-1}，向下为 {x:0, y:1}）
    const middleDir = I > 0 ? { x: 0, y: -1 } : { x: 0, y: 1 }
    
    // 食指：磁场方向。由于直交基础模式磁场垂直纸面，因此 2D 平面分量为 {x:0, y:0}，组件将自动根据 B 的正负灰度渲染 ⊙ 或 ⊗ 
    const indexDir = { x: 0, y: 0 }
    
    // 拇指：安培力方向（左手定则）。向右为 {x:1, y:0}，向左为 {x:-1, y:0}
    const thumbDir = basicResult.F > 0 ? { x: 1, y: 0 } : basicResult.F < 0 ? { x: -1, y: 0 } : { x: 0, y: 0 }

    return {
      handActive,
      thumbDir,
      indexDir,
      middleDir,
    }
  }, [I, B, basicResult.F])

  return (
    <div ref={containerRef} className="w-full h-full p-2 flex items-center justify-center bg-neutral-100/40">
      <svg
        viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-h-[90vh] bg-white rounded-2xl shadow-lg select-none"
      >
        {mode === 0 ? (
          // ─── 基础模式：直交规律 (重构布局充分利用空间) ───
          <g>
            {/* 1. 左半区: 3D 导轨与安培力演示场景 */}
            <BasicAmpereScene
              x={15}
              y={15}
              w={370}
              h={370}
              physicsResult={basicResult}
              I={I}
              B={B}
              L={L}
              time={time}
              showVectors={showVectors}
              isLimited={basicResult.isLimited}
              font={font}
            />

            {/* 2. 右上区: F-I 线性图表 */}
            <AmpereFIChart
              x={400}
              y={15}
              w={280}
              h={195}
              I={I}
              B={B}
              L={L}
              font={font}
            />

            {/* 3. 右下区: 左手定则可视化面板 */}
            {showLeftHand ? (
              <g transform="translate(400, 225)">
                <text
                  x="140"
                  y="20"
                  fontSize={font(7.5)}
                  fill={CANVAS_COLORS.labelText}
                  fontWeight="bold"
                  textAnchor="middle"
                  style={{ userSelect: 'none' }}
                >
                  左手定则三维几何判定
                </text>

                {handPoseParams.handActive ? (
                  <HandRule
                    mode="left"
                    thumbDir={handPoseParams.thumbDir}
                    indexDir={handPoseParams.indexDir}
                    middleDir={handPoseParams.middleDir}
                    cx={140}
                    cy={90}
                    isBack={B < 0}
                    font={font}
                  />
                ) : (
                  <text
                    x="140"
                    y="100"
                    fontSize={font(6)}
                    fill={CANVAS_COLORS.textMuted}
                    fontStyle="italic"
                    textAnchor="middle"
                  >
                    未检测到有效电流或磁场
                  </text>
                )}
              </g>
            ) : (
              <g transform="translate(400, 225)">
                <rect
                  x="0"
                  y="0"
                  width="280"
                  height="160"
                  fill={CANVAS_COLORS.objectFillNeutral}
                  stroke={CANVAS_COLORS.grid}
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  rx="6"
                />
                <text
                  x="140"
                  y="85"
                  fontSize={font(6.5)}
                  fill={CANVAS_COLORS.textMuted}
                  fontStyle="italic"
                  textAnchor="middle"
                  style={{ userSelect: 'none' }}
                >
                  勾选左侧 "显示左手定则" 开启手势判定
                </text>
              </g>
            )}
          </g>
        ) : (
          // ─── 进阶模式：斜面受力平衡 (重构布局充分利用空间 & 修复联动的 Prop 传递) ───
          <g>
            {/* 1. 左半区: 3D 导轨斜坡场景 */}
            <InclinedAmpereScene
              x={15}
              y={15}
              w={330}
              h={370}
              physicsResult={advancedResult}
              I={I}
              B={B}
              theta={theta}
              bFieldDir={bFieldDir}
              font={font}
            />

            {/* 2. 右上区: 2D 侧面受力分析图 */}
            <InclineForceDiagram
              x={360}
              y={15}
              w={325}
              h={215}
              physicsResult={advancedResult}
              I={I}
              B={B}
              theta={theta}
              showForceComponents={showForceComponents}
              bFieldDir={bFieldDir}
              font={font}
            />

            {/* 3. 右下区: 首尾相连的力多边形合成图 */}
            <ForcePolygon
              x={360}
              y={245}
              w={325}
              h={140}
              physicsResult={advancedResult}
              theta={theta}
              font={font}
            />
          </g>
        )}
      </svg>
    </div>
  )
}
