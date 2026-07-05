/**
 * 安培力 F=BIL 动画组件
 *
 * @agent-rule 物理计算通过 ampereForceModel 代理层消费，禁止直接从 @/physics 引入
 * @agent-rule 遵循 useViewport + useCanvasSize + CANVAS_PRESETS + PHYSICS_COLORS theme token
 * @agent-rule 布局分区常量定义于 TOP_SECTION_H / BOTTOM_SECTION_H / CARD_W
 */
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { HandRule } from '@/components/Physics/HandRule'
import { solveBasicAmpere, solveAdvancedAmpere, AMPERE_BASIC_SCENE } from './ampereForceModel'
import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { CANVAS_COLORS } from '@/theme/physics'

// 子组件导入
import BasicAmpereScene from './components/BasicAmpereScene'
import AmpereFIChart from './components/AmpereFIChart'
import InclinedAmpereScene from './components/InclinedAmpereScene'
import InclineForceDiagram from './components/InclineForceDiagram'
import ForcePolygon from './components/ForcePolygon'

const { width: DESIGN_WIDTH, height: DESIGN_HEIGHT } = CANVAS_PRESETS.full

// ─── 布局分区常量（派生自 CANVAS_PRESETS.full 700×650）───
const TOP_SECTION_H = 310
const BOTTOM_SECTION_H = CANVAS_PRESETS.splitV.height // 325
const CARD_GAP = 15
const CARD_W = (DESIGN_WIDTH - CARD_GAP) / 2 // 342.5

export default function AmpereForce() {
  const {params, time, showVectors} = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full)
  // 方式 A（无 overlay）：viewBox 绑定固定设计尺寸，preserveAspectRatio 自动居中
  useViewport(canvasSize, { designWidth: DESIGN_WIDTH, designHeight: DESIGN_HEIGHT })
  const { font } = canvasSize

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
    return solveBasicAmpere(I, B, thetaIB, L, AMPERE_BASIC_SCENE.mass, time)
  }, [I, B, thetaIB, L, time])

  const advancedResult = useMemo(() => {
    return solveAdvancedAmpere(I, B, theta, mu, bFieldDir, L, AMPERE_BASIC_SCENE.mass, time)
  }, [I, B, theta, mu, bFieldDir, L, time])

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

  // 2. 动态测量像素宽度，用于在 HTML 下平滑自适应分栏
  const chartW = canvasSize.width > 0 ? (canvasSize.width - CARD_GAP) / 2 : CARD_W

  return (
    <div ref={containerRef} className="w-full h-full p-2 flex items-center justify-center bg-neutral-100/40">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: DESIGN_HEIGHT,
        }}
        className="w-full h-full max-h-[90vh] select-none"
      >
        {mode === 0 ? (
          // ─── 基础模式：直交规律 (图表在上，动画在下) ───
          <>
            {/* 1. 上半区: 图表与左手定则并列 */}
            <div
              style={{
                height: TOP_SECTION_H,
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              {/* 左上: F-I 线性图表卡片 (纯 HTML) */}
              <div
                className="bg-white rounded-2xl shadow-lg border border-neutral-100 overflow-hidden"
                style={{ width: `calc(50% - ${CARD_GAP / 2}px)`, height: TOP_SECTION_H }}
              >
                <AmpereFIChart
                  w={chartW}
                  h={TOP_SECTION_H}
                  I={I}
                  B={B}
                  L={L}
                  font={font}
                />
              </div>

              {/* 右上: 左手定则可视化面板卡片 (独立 SVG) */}
              <div
                className="bg-white rounded-2xl shadow-lg border border-neutral-100 overflow-hidden"
                style={{ width: `calc(50% - ${CARD_GAP / 2}px)`, height: TOP_SECTION_H }}
              >
                {showLeftHand ? (
                  <svg
                    viewBox={`0 0 ${CARD_W} ${TOP_SECTION_H}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-full"
                  >
                    <text
                      x="171.25"
                      y="30"
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
                        cx={171.25}
                        cy={175}
                        isBack={B < 0}
                        font={font}
                      />
                    ) : (
                      <text
                        x="171.25"
                        y="150"
                        fontSize={font(6)}
                        fill={CANVAS_COLORS.textMuted}
                        fontStyle="italic"
                        textAnchor="middle"
                      >
                        未检测到有效电流或磁场
                      </text>
                    )}
                  </svg>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-50/50 p-4 text-center">
                    <p className="text-neutral-400 italic text-sm">
                      勾选左侧 "显示左手定则" 开启手势判定
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. 下半区: 3D 导轨与安培力演示场景 SVG */}
            <svg
              viewBox={`0 0 ${DESIGN_WIDTH} ${BOTTOM_SECTION_H}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full bg-white rounded-2xl shadow-lg border border-neutral-100"
              style={{ height: BOTTOM_SECTION_H }}
            >
              <BasicAmpereScene
                x={0}
                y={0}
                w={DESIGN_WIDTH}
                h={BOTTOM_SECTION_H}
                physicsResult={basicResult}
                I={I}
                B={B}
                L={L}
                time={time}
                showVectors={showVectors}
                isLimited={basicResult.isLimited}
                font={font}
              />
            </svg>
          </>
        ) : (
          // ─── 进阶模式：斜面受力平衡 (图表在上，动画在下) ───
          <>
            {/* 1. 上半区: 2D受力分析图与力多边形并列 */}
            <div
              style={{
                height: TOP_SECTION_H,
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              {/* 左上: 2D 侧面受力分析图 (独立 SVG) */}
              <svg
                viewBox={`0 0 ${CARD_W} ${TOP_SECTION_H}`}
                preserveAspectRatio="xMidYMid meet"
                className="bg-white rounded-2xl shadow-lg border border-neutral-100"
                style={{ width: `calc(50% - ${CARD_GAP / 2}px)`, height: TOP_SECTION_H }}
              >
                <InclineForceDiagram
                  x={0}
                  y={0}
                  w={CARD_W}
                  h={TOP_SECTION_H}
                  physicsResult={advancedResult}
                  I={I}
                  B={B}
                  theta={theta}
                  showForceComponents={showForceComponents}
                  bFieldDir={bFieldDir}
                  font={font}
                />
              </svg>

              {/* 右上: 首尾相连的力多边形合成图 (独立 SVG) */}
              <svg
                viewBox={`0 0 ${CARD_W} ${TOP_SECTION_H}`}
                preserveAspectRatio="xMidYMid meet"
                className="bg-white rounded-2xl shadow-lg border border-neutral-100"
                style={{ width: `calc(50% - ${CARD_GAP / 2}px)`, height: TOP_SECTION_H }}
              >
                <ForcePolygon
                  x={0}
                  y={0}
                  w={CARD_W}
                  h={TOP_SECTION_H}
                  physicsResult={advancedResult}
                  theta={theta}
                  font={font}
                />
              </svg>
            </div>

            {/* 2. 下半区: 3D 导轨斜坡场景 SVG */}
            <svg
              viewBox={`0 0 ${DESIGN_WIDTH} ${BOTTOM_SECTION_H}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full bg-white rounded-2xl shadow-lg border border-neutral-100"
              style={{ height: BOTTOM_SECTION_H }}
            >
              <InclinedAmpereScene
                x={0}
                y={0}
                w={DESIGN_WIDTH}
                h={BOTTOM_SECTION_H}
                physicsResult={advancedResult}
                I={I}
                B={B}
                theta={theta}
                mu={mu}
                bFieldDir={bFieldDir}
                showVectors={showVectors}
                font={font}
              />
            </svg>
          </>
        )}
      </div>
    </div>
  )
}
