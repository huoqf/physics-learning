import { useMemo, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { colors } from '@/theme/colors'
import { HandRule } from '@/components/Physics/HandRule'
import { solveBasicAmpere, solveAdvancedAmpere } from '@/physics'

// 子组件导入
import BasicAmpereScene from './components/BasicAmpereScene'
import AmpereFIChart from './components/AmpereFIChart'
import InclinedAmpereScene from './components/InclinedAmpereScene'
import InclineForceDiagram from './components/InclineForceDiagram'
import ForcePolygon from './components/ForcePolygon'

// 虚拟画布固定比例 (供 viewBox 相对布局使用)
const VIEW_WIDTH = 800
const VIEW_HEIGHT = 500

export default function AmpereForce() {
  const { params, time, showVectors } = useAnimationStore()
  const svgRef = useRef<SVGSVGElement | null>(null)

  // 读取控制参数
  const mode = params.mode ?? 0
  const I = params.I ?? 2.0
  const B = params.B ?? 1.0
  const L = params.L ?? 4.0
  const theta = params.theta ?? 30
  const mu = params.mu ?? 0.2
  const showLeftHand = params.showLeftHand !== 0
  const showForceComponents = params.showForceComponents !== 0

  // 1. 物理层计算
  const basicResult = useMemo(() => {
    return solveBasicAmpere(I, B, L, 0.5, time)
  }, [I, B, L, time])

  const advancedResult = useMemo(() => {
    return solveAdvancedAmpere(I, B, theta, mu, 4.0, 0.5, time)
  }, [I, B, theta, mu, time])

  // 2. 左手定则手势姿态向量计算 (仅基础模式)
  const handPoseParams = useMemo(() => {
    const hasCurrent = Math.abs(I) > 1e-4
    const hasField = Math.abs(B) > 1e-4

    let thumbDir = { x: 0, y: 0 }
    let middleDir = { x: 0, y: 0 }
    let handActive = false

    if (hasCurrent && hasField) {
      handActive = true
      // 电流方向 (中指)：+y 向上为正(I > 0)，但 Canvas 坐标中向上是 -y 轴。所以：
      // I > 0 -> middleDir 为 { x: 0, y: -1 } (向上)
      // I < 0 -> middleDir 为 { x: 0, y: 1 } (向下)
      middleDir = { x: 0, y: I > 0 ? -1 : 1 }

      // 受力方向 (大拇指)：基础模式安培力方向
      // basicResult.F > 0 -> 向右，thumbDir 为 { x: 1, y: 0 }
      // basicResult.F < 0 -> 向左，thumbDir 为 { x: -1, y: 0 }
      thumbDir = { x: basicResult.F > 0 ? 1 : -1, y: 0 }
    }

    return { thumbDir, middleDir, handActive }
  }, [I, B, basicResult.F])

  return (
    <div className="w-full h-full p-2 flex items-center justify-center bg-neutral-100/40">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="w-full h-full max-h-[90vh] bg-white rounded-2xl shadow-lg select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        {mode === 0 ? (
          // ─── 基础模式视图 (直交规律) ───
          <g>
            {/* 1. 二维水平导轨主场景 */}
            <BasicAmpereScene
              x={20}
              y={40}
              w={480}
              h={400}
              physicsResult={basicResult}
              I={I}
              B={B}
              L={L}
              time={time}
              showVectors={showVectors}
              isLimited={basicResult.isLimited}
            />

            {/* 2. F-I 线性图表 */}
            <AmpereFIChart
              x={520}
              y={40}
              w={260}
              h={210}
              I={I}
              B={B}
              L={L}
            />

            {/* 3. 左手定则可视化面板 */}
            {showLeftHand ? (
              <g transform="translate(520, 270)">
                <rect
                  x="0"
                  y="0"
                  width="260"
                  height="170"
                  fill={colors.neutral[50]}
                  stroke={colors.neutral[200]}
                  strokeWidth="1.2"
                  rx="6"
                />
                <text
                  x="130"
                  y="20"
                  fontSize="7.5"
                  fill={colors.neutral[700]}
                  fontWeight="bold"
                  textAnchor="middle"
                  style={{ userSelect: 'none' }}
                >
                  左手定则空间图景
                </text>

                {handPoseParams.handActive ? (
                  <svg
                    x="40"
                    y="30"
                    width="180"
                    height="130"
                    viewBox="0 0 120 130"
                    className="overflow-visible"
                  >
                    <HandRule
                      mode="left"
                      thumbDir={handPoseParams.thumbDir}
                      indexDir={{ x: 0, y: 0 }}
                      middleDir={handPoseParams.middleDir}
                      cx={60}
                      cy={62}
                      scale={0.72}
                      active={handPoseParams.handActive}
                      draggable={false}
                      isBack={B < 0}
                    />
                  </svg>
                ) : (
                  <text
                    x="130"
                    y="90"
                    fontSize="6"
                    fill={colors.neutral[400]}
                    textAnchor="middle"
                    style={{ userSelect: 'none' }}
                  >
                    请调节电流 I 或磁场 B 开启演示
                  </text>
                )}
              </g>
            ) : (
              <g transform="translate(520, 270)">
                <rect
                  x="0"
                  y="0"
                  width="260"
                  height="170"
                  fill={colors.neutral[50]}
                  stroke={colors.neutral[200]}
                  strokeWidth="1.2"
                  strokeDasharray="4,4"
                  rx="6"
                />
                <text
                  x="130"
                  y="88"
                  fontSize="6.5"
                  fill={colors.neutral[400]}
                  textAnchor="middle"
                  style={{ userSelect: 'none' }}
                >
                  左手定则已隐藏，可在左侧侧栏开启
                </text>
              </g>
            )}
          </g>
        ) : (
          // ─── 进阶模式视图 (斜面平衡与运动) ───
          <g>
            {/* 1. 3D 倾斜场景展示 */}
            <InclinedAmpereScene
              x={20}
              y={40}
              w={480}
              h={400}
              physicsResult={advancedResult}
              I={I}
              B={B}
              theta={theta}
            />

            {/* 2. 2D 侧视受力图 */}
            <InclineForceDiagram
              x={520}
              y={40}
              w={260}
              h={235}
              physicsResult={advancedResult}
              I={I}
              B={B}
              theta={theta}
              showForceComponents={showForceComponents}
            />

            {/* 3. 力矢量闭合/开口多边形 */}
            <ForcePolygon
              x={520}
              y={290}
              w={260}
              h={150}
              physicsResult={advancedResult}
              theta={theta}
            />
          </g>
        )}
      </svg>
    </div>
  )
}
