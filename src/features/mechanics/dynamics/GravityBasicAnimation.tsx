import { FC, useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, STROKE, FONT } from '@/theme/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

// 定义悬挂薄板的本地顶点
const PLATE_VERTICES = [
  { x: -70, y: -45 },
  { x: 65, y: -55 },
  { x: 85, y: 35 },
  { x: -15, y: 75 },
  { x: -85, y: 25 }
]

// 定义 3 个悬挂孔的本地坐标
const HANGER_HOLES = [
  { x: -50, y: -25 },
  { x: 45, y: -35 },
  { x: 55, y: 15 }
]

// 未加配重时薄板的本地重心
const BASE_CENTER = { x: 5, y: 5 }

export const GravityBasicAnimation: FC = () => {
    const {params, time, showVectors, isPlaying} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    isPlaying: s.isPlaying,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 450 })

  // 参数解析
  const mode = params.mode ?? 0 // 0=地球自转重力分解, 1=悬挂重心实验
  const latitude = params.latitude ?? 45 // 纬度 (0~90度)
  const omegaScale = params.omegaScale ?? 80 // 向心力放大倍数
  const activeHoleIdx = Math.max(0, Math.min(params.suspendPoint ?? 0, 2)) // 悬挂孔索引 (0~2)
  const showWeight = params.showWeight ?? 0 // 是否启用配重
  const weightX = params.weightX ?? 25 // 配重本地 X 坐标 (-50 ~ 50)
  const weightY = params.weightY ?? 25 // 配重本地 Y 坐标 (-40 ~ 40)
  const weightMass = params.weightMass ?? 1.2 // 配重相对质量 (0.2 ~ 2.0)
  const showLines = params.showLines ?? 1 // 是否显示悬挂垂线

  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2

  const gravBasicScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: 0,
    originY: 0,
  }
  const gravBasicSceneScale = createSceneScale(gravBasicScene)

  // ─── 物理引擎计算 ───

  // 1. 模式一：地球自转重力分解数据
  const earthData = useMemo(() => {
    if (mode !== 0) return null

    // ── 动画驱动：播放时纬度在 0°~85° 之间正弦变化 ──
    const effectiveLat = isPlaying
      ? ((Math.sin(time * 0.3) + 1) / 2) * 85
      : latitude
    const latRad = (effectiveLat * Math.PI) / 180

    const R_earth = 135 // 地球绘制半径

    // 物体在地球表面上的坐标 (物理坐标系：原点地心，Y轴向上)
    const objX = cx + R_earth * Math.cos(latRad)
    const objY = cy - R_earth * Math.sin(latRad) // Canvas 坐标，Y向下

    // 计算三力大小 (基准万有引力设为 110 像素长度)
    const F_gravitation = 110
    const ratioAtEquator = 0.00346 * omegaScale // 赤道离心力比例（真实值约 0.00346）
    const F_centrifugal = F_gravitation * ratioAtEquator * Math.cos(latRad)

    // 矢量分量 (物理坐标系，Y 轴向上；渲染时通过 objY - Fy 转换为 Canvas Y 向下)
    // 万有引力：指向地心
    const Fx_grav = -F_gravitation * Math.cos(latRad)
    const Fy_grav = -F_gravitation * Math.sin(latRad)

    // 离心力（非惯性系）：背离自转轴，水平向外
    const Fx_centrifugal = +F_centrifugal
    const Fy_centrifugal = 0

    // 重力 G = F_grav + F_离心（非惯性系中矢量合成）
    const Gx = Fx_grav + Fx_centrifugal
    const Gy = Fy_grav + Fy_centrifugal
    const G_force = Math.sqrt(Gx * Gx + Gy * Gy)

    // 夹角偏角：重力与万有引力的夹角
    const dotProduct = Gx * Fx_grav + Gy * Fy_grav
    const cosTheta = Math.max(-1, Math.min(1, dotProduct / (G_force * F_gravitation)))
    const angleDeviation = (Math.acos(cosTheta) * 180) / Math.PI

    return {
      objX, objY, R_earth, effectiveLat,
      Fx_grav, Fy_grav,
      Fx_centrifugal, Fy_centrifugal,
      Gx, Gy, G_force,
      F_centrifugal, F_gravitation,
      angleDeviation
    }
  }, [mode, latitude, omegaScale, cx, cy, isPlaying, time])

  // 2. 模式二：薄板重心与悬挂平衡数据
  const plateData = useMemo(() => {
    if (mode !== 1) return null

    // 钉子在 Canvas 上的固定坐标
    const pinX = cx
    const pinY = cy - 60

    // 计算当前系统的本地重心坐标 (考虑配重)
    let localCenterX = BASE_CENTER.x
    let localCenterY = BASE_CENTER.y

    if (showWeight === 1) {
      const totalMass = 1.0 + weightMass
      localCenterX = (BASE_CENTER.x * 1.0 + weightX * weightMass) / totalMass
      localCenterY = (BASE_CENTER.y * 1.0 + weightY * weightMass) / totalMass
    }

    const localCenter = { x: localCenterX, y: localCenterY }
    const hole = HANGER_HOLES[activeHoleIdx]

    // 本地向量：从悬挂孔指向重心
    const dx = localCenter.x - hole.x
    const dy = localCenter.y - hole.y
    const theta0 = Math.atan2(dy, dx) // 初始本地夹角

    // 平衡状态下，重心必须在悬挂孔正下方，即旋转后向量角度为 Math.PI / 2
    const targetRotation = Math.PI / 2 - theta0

    // ── 模拟物理阻尼摆动 ──
    const omega = 4.2  // 摆动频率
    const gamma = 0.75 // 阻尼系数
    const initAmplitude = 1.1 // 初始最大偏角 (rad)
    
    // 使用正弦阻尼衰减函数计算当前旋转角度
    const swingAngle = initAmplitude * Math.exp(-gamma * time) * Math.cos(omega * time)
    const currentRotation = targetRotation + swingAngle

    // 坐标变换函数：将本地坐标点转换为当前 Canvas 坐标点
    const toCanvasCoords = (pt: { x: number; y: number }) => {
      // 绕悬挂孔 H 旋转
      const rx = (pt.x - hole.x) * Math.cos(currentRotation) - (pt.y - hole.y) * Math.sin(currentRotation)
      const ry = (pt.x - hole.x) * Math.sin(currentRotation) + (pt.y - hole.y) * Math.cos(currentRotation)
      return {
        cx: pinX + rx,
        cy: pinY + ry
      }
    }

    // 旋转后的薄板顶点
    const canvasVertices = PLATE_VERTICES.map(toCanvasCoords)
    // 旋转后的重心
    const canvasCenter = toCanvasCoords(localCenter)
    // 旋转后的三个孔
    const canvasHoles = HANGER_HOLES.map(toCanvasCoords)
    // 旋转后的配重位置
    const canvasWeight = toCanvasCoords({ x: weightX, y: weightY })

    // 计算三个孔在板的本地坐标系中，通过孔 H_k 到重心 C 的射线。
    // 在平衡时，这条射线必然在 Canvas 中垂直向下。这就是我们要画的悬挂线。
    const getLocalPlumbLine = (idx: number) => {
      const hPt = HANGER_HOLES[idx]
      // 射线方向向量：从悬挂孔指向重心
      const vX = localCenter.x - hPt.x
      const vY = localCenter.y - hPt.y
      const len = Math.sqrt(vX * vX + vY * vY)
      if (len === 0) return { x1: hPt.x, y1: hPt.y, x2: hPt.x, y2: hPt.y }
      
      // 沿射线方向向两端延伸
      return {
        x1: hPt.x - (vX / len) * 40,
        y1: hPt.y - (vY / len) * 40,
        x2: hPt.x + (vX / len) * 200,
        y2: hPt.y + (vY / len) * 200
      }
    }

    const localPlumbLines = HANGER_HOLES.map((_, idx) => getLocalPlumbLine(idx))
    const canvasPlumbLines = localPlumbLines.map((line) => {
      const pt1 = toCanvasCoords({ x: line.x1, y: line.y1 })
      const pt2 = toCanvasCoords({ x: line.x2, y: line.y2 })
      return { x1: pt1.cx, y1: pt1.cy, x2: pt2.cx, y2: pt2.cy }
    })

    return {
      pinX, pinY,
      canvasVertices,
      canvasCenter,
      canvasHoles,
      canvasWeight,
      canvasPlumbLines,
      currentRotation,
      isSettled: Math.exp(-gamma * time) < 0.05 // 是否已经基本静止
    }
  }, [mode, activeHoleIdx, showWeight, weightX, weightY, weightMass, time, cx, cy])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
          {/* 地球剖面径向高光渐变 */}
          <radialGradient id="earth-grad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[0]} />
            <stop offset="65%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[2]} />
          </radialGradient>
          {/* 不锈钢薄板金属质感渐变 */}
          <linearGradient id="plate-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.earthTech.landGradient[0]} />
            <stop offset="50%" stopColor={SCENE_COLORS.sphere.earthTech.landGradient[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.earthTech.landGradient[2]} />
          </linearGradient>
          {/* 黄铜配重渐变 */}
          <radialGradient id="brass-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[0]} />
            <stop offset="50%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[2]} />
          </radialGradient>
          {/* 力的箭头定义 */}
          <VectorDefs colors={[PHYSICS_COLORS.gravity, PHYSICS_COLORS.forceNet]} />
        </defs>

        {/* ─── 模式一：地球自转重力分解渲染 ─── */}
        {mode === 0 && earthData && (
          <g>
            {/* 地球自转轴 */}
            <line
              x1={cx} y1={cy - earthData.R_earth - 30}
              x2={cx} y2={cy + earthData.R_earth + 30}
              stroke={PHYSICS_COLORS.axis}
              strokeWidth={1.5}
              strokeDasharray="5,4"
            />
            <text x={cx} y={cy - earthData.R_earth - 36} fontSize="11" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">自转轴 (北极 N)</text>
            <text x={cx} y={cy + earthData.R_earth + 44} fontSize="11" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">南极 S</text>

            {/* 地球圆形本体 */}
            <circle
              cx={cx} cy={cy} r={earthData.R_earth}
              fill="url(#earth-grad)"
              stroke={SCENE_COLORS.sphere.earthTech.stroke}
              strokeWidth={2}
            />

            {/* 绘制赤道面 */}
            <line
              x1={cx - earthData.R_earth} y1={cy}
              x2={cx + earthData.R_earth} y2={cy}
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            <text x={cx - earthData.R_earth + 16} y={cy - 4} fontSize="9" fill="rgba(255, 255, 255, 0.7)" fontWeight="bold">赤道面</text>

            {/* 绘制纬度虚线圈 (物体所在纬度) */}
            {earthData.effectiveLat > 0 && earthData.effectiveLat < 90 && (
              <line
                x1={cx - earthData.R_earth * Math.cos((earthData.effectiveLat * Math.PI) / 180)}
                y1={earthData.objY}
                x2={cx + earthData.R_earth * Math.cos((earthData.effectiveLat * Math.PI) / 180)}
                y2={earthData.objY}
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth={0.8}
                strokeDasharray="2,2"
              />
            )}

            {/* 绘制物体到地心的辅助连线 (半径尺寸线) */}
            <line
              x1={cx} y1={cy}
              x2={earthData.objX} y2={earthData.objY}
              stroke={PHYSICS_COLORS.axis}
              strokeWidth={1}
              strokeDasharray="3,3"
            />

            {/* 绘制平行四边形力分解虚线 */}
            {showVectors && (
              <g opacity={0.6}>
                {/* 从引力端点连向重力端点 */}
                <line
                  x1={earthData.objX + earthData.Fx_grav}
                  y1={earthData.objY - earthData.Fy_grav}
                  x2={earthData.objX + earthData.Gx}
                  y2={earthData.objY - earthData.Gy}
                  stroke={PHYSICS_COLORS.labelTextLight}
                  strokeWidth={0.8}
                  strokeDasharray="2,2"
                />
                {/* 从离心力端点连向重力端点 */}
                <line
                  x1={earthData.objX + earthData.Fx_centrifugal}
                  y1={earthData.objY - earthData.Fy_centrifugal}
                  x2={earthData.objX + earthData.Gx}
                  y2={earthData.objY - earthData.Gy}
                  stroke={PHYSICS_COLORS.labelTextLight}
                  strokeWidth={0.8}
                  strokeDasharray="2,2"
                />
              </g>
            )}

            {/* 绘制力矢量 */}
            {showVectors && (
              <g>
                {/* 1. 万有引力 (指向地心) */}
                <VectorArrow
                  origin={{ x: earthData.objX, y: -earthData.objY }}
                  vector={{ x: earthData.Fx_grav, y: earthData.Fy_grav }}
                  type="gravity"
                  sceneScale={gravBasicSceneScale}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  pixelLength={Math.hypot(earthData.Fx_grav, earthData.Fy_grav)}
                />
                <text
                  x={earthData.objX + earthData.Fx_grav * 0.65 - 12}
                  y={earthData.objY - earthData.Fy_grav * 0.65 - 4}
                  fontSize={FONT.axisSize} fill={PHYSICS_COLORS.gravity} fontWeight="bold"
                >
                  F引
                </text>

                {/* 2. 离心力 (非惯性系，水平背离自转轴) */}
                {earthData.F_centrifugal > 1.5 && (
                  <VectorArrow
                    origin={{ x: earthData.objX, y: -earthData.objY }}
                    vector={{ x: earthData.Fx_centrifugal, y: earthData.Fy_centrifugal }}
                    type="force"
                    sceneScale={gravBasicSceneScale}
                    strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                    pixelLength={Math.hypot(earthData.Fx_centrifugal, earthData.Fy_centrifugal)}
                  />
                )}
                {earthData.F_centrifugal > 5 && (
                  <text
                    x={earthData.objX + earthData.Fx_centrifugal + 6}
                    y={earthData.objY - 6}
                    fontSize={FONT.axisSize} fill={PHYSICS_COLORS.forceNet} fontWeight="bold" textAnchor="start"
                  >
                    F离
                  </text>
                )}

                {/* 3. 重力 (万有引力和自转向心力的矢量差) */}
                <VectorArrow
                  origin={{ x: earthData.objX, y: -earthData.objY }}
                  vector={{ x: earthData.Gx, y: earthData.Gy }}
                  type="force"
                  sceneScale={gravBasicSceneScale}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  pixelLength={Math.hypot(earthData.Gx, earthData.Gy)}
                />
                <text
                  x={earthData.objX + earthData.Gx + (earthData.Gx > 0 ? 6 : -18)}
                  y={earthData.objY - earthData.Gy + (earthData.Gy > 0 ? 12 : -4)}
                  fontSize={FONT.axisSize} fill={PHYSICS_COLORS.forceNet} fontWeight="bold"
                >
                  G (重力)
                </text>

                {/* 偏角文字标注 (仅当有可见偏角且在 15~75 度之间时显示) */}
                {earthData.angleDeviation > 0.5 && earthData.effectiveLat > 10 && earthData.effectiveLat < 80 && (
                  <text
                    x={earthData.objX + 18} y={earthData.objY - 22}
                    fontSize="10" fill={PHYSICS_COLORS.forceNet} fontWeight="bold"
                  >
                    偏角 θ ≈ {earthData.angleDeviation.toFixed(1)}°
                  </text>
                )}
              </g>
            )}

            {/* 放置在地球表面的滑块小球 */}
            <circle
              cx={earthData.objX} cy={earthData.objY} r={8}
              fill="url(#brass-grad)"
              stroke={PHYSICS_COLORS.labelText}
              strokeWidth={1.5}
            />
            {/* 标注球体质量 (可见标注 1/5) */}
            <text x={earthData.objX} y={earthData.objY - 14} fontSize="11" fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
              m
            </text>
            {/* 纬度数值标注 (可见标注 2/5) */}
            <text x={cx + 10} y={cy - 10} fontSize="11" fill="white" fontWeight="bold">
              φ = {earthData.effectiveLat.toFixed(1)}°
            </text>
          </g>
        )}

        {/* ─── 模式二：悬挂法重心实验渲染 ─── */}
        {mode === 1 && plateData && (
          <g>
            {/* 绘制背景物理支架/黑板刻度 */}
            <line
              x1={cx - 150} y1={plateData.pinY - 40}
              x2={cx + 150} y2={plateData.pinY - 40}
              stroke={PHYSICS_COLORS.axis}
              strokeWidth={STROKE.groundLine}
            />
            {/* 悬挂钉子 (固定点) */}
            <circle
              cx={plateData.pinX} cy={plateData.pinY} r={5}
              fill={PHYSICS_COLORS.gravity}
              stroke={SCENE_COLORS.pendulum.rodStroke}
              strokeWidth={1.5}
            />

            {/* 绘制不规则薄板 (金属拉丝渐变) */}
            <polygon
              points={plateData.canvasVertices.map((v) => `${v.cx},${v.cy}`).join(' ')}
              fill="url(#plate-grad)"
              stroke={PHYSICS_COLORS.labelText}
              strokeWidth={1.8}
              filter="drop-shadow(2px 4px 6px rgba(0,0,0,0.15))"
            />

            {/* 绘制已经画出的重力铅垂线 (对应 3 个悬挂孔) */}
            {showLines === 1 && (
              <g>
                {plateData.canvasPlumbLines.map((line, idx) => {
                  const isCurrent = idx === activeHoleIdx
                  return (
                    <line
                      key={`plumbline-${idx}`}
                      x1={line.x1} y1={line.y1}
                      x2={line.x2} y2={line.y2}
                      stroke={isCurrent ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.trackHistory}
                      strokeWidth={isCurrent ? 1.5 : 0.8}
                      strokeDasharray={isCurrent ? "4,3" : "2,2"}
                      opacity={isCurrent ? 0.95 : 0.6}
                    />
                  )
                })}
              </g>
            )}

            {/* 绘制 3 个悬挂孔 */}
            {plateData.canvasHoles.map((hole, idx) => {
              const isActive = idx === activeHoleIdx
              return (
                <circle
                  key={`hole-${idx}`}
                  cx={hole.cx} cy={hole.cy} r={isActive ? 2.5 : 4}
                  fill={isActive ? PHYSICS_COLORS.gravity : SCENE_COLORS.sphere.steel.specular} // 正在悬挂的孔内缩为钉子轴
                  stroke={PHYSICS_COLORS.labelText}
                  strokeWidth={1.2}
                />
              )
            })}
            
            {/* 悬挂孔的文字编号标注 (可见标注 1/5) */}
            {plateData.canvasHoles.map((hole, idx) => (
              <text
                key={`hole-label-${idx}`}
                x={hole.cx + (idx === 0 ? -10 : idx === 1 ? 10 : 8)}
                y={hole.cy + (idx === 2 ? 12 : -8)}
                fontSize="9"
                fill={PHYSICS_COLORS.labelTextLight}
                fontWeight="bold"
                textAnchor="middle"
              >
                A{idx + 1}
              </text>
            ))}

            {/* 绘制黄铜配重块 (如果启用) */}
            {showWeight === 1 && (
              <g>
                <circle
                  cx={plateData.canvasWeight.cx}
                  cy={plateData.canvasWeight.cy}
                  r={8 + weightMass * 2.5}
                  fill="url(#brass-grad)"
                  stroke={SCENE_COLORS.sphere.brassWeight.stroke}
                  strokeWidth={1.5}
                />
                <circle
                  cx={plateData.canvasWeight.cx}
                  cy={plateData.canvasWeight.cy}
                  r={2.5}
                  fill={SCENE_COLORS.sphere.brassWeight.stroke}
                />
                {/* 配重块的质量文字 (可见标注 2/5) */}
                <text
                  x={plateData.canvasWeight.cx}
                  y={plateData.canvasWeight.cy - 12 - weightMass * 2}
                  fontSize="9"
                  fill={SCENE_COLORS.sphere.brassWeight.stroke}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  配重 M
                </text>
              </g>
            )}

            {/* 绘制重心点 C */}
            <g>
              {/* 重心十字定位符 */}
              <line
                x1={plateData.canvasCenter.cx - 6} y1={plateData.canvasCenter.cy}
                x2={plateData.canvasCenter.cx + 6} y2={plateData.canvasCenter.cy}
                stroke={PHYSICS_COLORS.forceNet}
                strokeWidth={1.2}
              />
              <line
                x1={plateData.canvasCenter.cx} y1={plateData.canvasCenter.cy - 6}
                x2={plateData.canvasCenter.cx} y2={plateData.canvasCenter.cy + 6}
                stroke={PHYSICS_COLORS.forceNet}
                strokeWidth={1.2}
              />
              <circle
                cx={plateData.canvasCenter.cx} cy={plateData.canvasCenter.cy} r={2.5}
                fill={PHYSICS_COLORS.forceNet}
              />
              {/* 重心标注 (可见标注 3/5) */}
              <text
                x={plateData.canvasCenter.cx + 10}
                y={plateData.canvasCenter.cy - 4}
                fontSize="11"
                fill={PHYSICS_COLORS.forceNet}
                fontWeight="bold"
              >
                重心 C
              </text>
            </g>

            {/* 平衡静止后向下悬挂的红色铅垂线指示文字 (可见标注 4/5) */}
            {plateData.isSettled && showLines === 1 && (
              <text
                x={plateData.pinX + 16}
                y={plateData.pinY + 140}
                fontSize="10"
                fill={PHYSICS_COLORS.acceleration}
                fontWeight="bold"
              >
                铅垂重力线
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  )
}

export default GravityBasicAnimation
