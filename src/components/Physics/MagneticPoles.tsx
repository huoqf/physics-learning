import React from 'react'
import { useUniqueSvgId } from '@/hooks'
import { SCENE_COLORS } from '@/theme/physics'

/**
 * 3D 坐标类型描述
 */
interface Point3D {
  x: number
  y: number
  z: number
}

/**
 * 2D 屏幕坐标类型描述
 */
interface Point2D {
  x: number
  y: number
}

/**
 * MagneticPoles 组件的 API 接口定义与 JSDoc 自文档化
 */
export interface MagneticPolesProps {
  /**
   * 3D 坐标到 2D 屏幕坐标的投影函数。
   * 由父级画布（通常基于 useCanvasSize）统一提供，确保 3D 透视关系一致。
   */
  project3D: (x: number, y: number, z: number) => Point2D

  /**
   * 渲染分层模式。
   * - 'back': 仅绘制磁铁的后层表面（如顶面、右侧面、以及内凹圆弧面），应先于线圈绘制。
   * - 'front': 仅绘制磁铁的前侧主表面及 N/S 文本标签，应后于线圈绘制，以实现遮挡遮盖。
   * - 'all': 在同一个 `<g>` 中绘制所有层（若线圈不需要夹在磁极中间时使用）。
   */
  layer: 'back' | 'front' | 'all'

  /**
   * 磁极前端的 Z 轴位置，默认 -1.6
   */
  zF?: number

  /**
   * 磁极尾端的 Z 轴位置，默认 1.6
   */
  zB?: number

  /**
   * 磁极顶部的 Y 轴位置，默认 1.7
   */
  yT?: number

  /**
   * 磁极底部的 Y 轴位置，默认 -1.7
   */
  yB?: number

  /**
   * N极左边界的 X 轴位置，默认 -3.8
   */
  nXLeft?: number

  /**
   * N极内侧凹槽边缘的 X 轴位置，默认 -1.3
   */
  nXEdge?: number

  /**
   * N极内凹曲率强度（为负值表示向左内凹），默认 -0.9
   */
  nDip?: number

  /**
   * S极右边界的 X 轴位置，默认 3.8
   */
  sXRight?: number

  /**
   * S极内侧凹槽边缘的 X 轴位置，默认 1.3
   */
  sDip?: number

  /**
   * S极内凹曲率强度（为正值表示向右内凹），默认 0.9
   */
  sXEdge?: number

  /**
   * 是否显示 N/S 磁极标签，默认 true
   */
  showLabels?: boolean

  /**
   * 磁极整体不透明度，默认 1.0
   */
  opacity?: number

  /**
   * 描边粗细等级，默认 1.2
   */
  strokeWidth?: number

  /**
   * 字体缩放函数（由父组件 useCanvasSize 提供）
   */
  font?: (base: number) => number
}

/**
 * MagneticPoles — 匀强磁场中 3D 曲面磁极组件
 *
 * 【设计意图】
 * 用于展现具有立体弧度的南北磁极（N极红，S极蓝）。
 * 通过 3D 投影和分层渲染技术，可以实现线圈在磁极间空腔中旋转的遮挡关系。
 *
 * 【动效与美化】
 * - 使用 `SCENE_COLORS.magnet` 内置的 3D 拟物色阶，配置线性渐变，实现金属/漆面质感与高光阴影。
 * - 曲面磁极表面增添高光与阴影层。
 * - 支持分层渲染。
 */
export const MagneticPoles: React.FC<MagneticPolesProps> = ({
  project3D,
  layer,
  zF = -1.6,
  zB = 1.6,
  yT = 1.7,
  yB = -1.7,
  nXLeft = -3.8,
  nXEdge = -1.3,
  nDip = -0.9,
  sXRight = 3.8,
  sXEdge = 1.3,
  sDip = 0.9,
  showLabels = true,
  opacity = 1.0,
  strokeWidth = 1.2,
  font = (n: number) => n,
}) => {
  const uniqueId = useUniqueSvgId()

  // 1. 辅助函数：生成内凹曲面圆弧上的离散 3D 点
  const getXYArc = (
    xBase: number,
    yTop: number,
    yBottom: number,
    zVal: number,
    dipStrength: number,
    steps = 20
  ): Point3D[] => {
    const pts: Point3D[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const curY = yTop + (yBottom - yTop) * t
      const curX = xBase + dipStrength * 4 * t * (1 - t)
      pts.push({ x: curX, y: curY, z: zVal })
    }
    return pts
  }

  // 2. 辅助函数：3D 点数组转换为 SVG Path 字符串
  const getPathString = (points3D: Point3D[], close = true): string => {
    let d = ''
    points3D.forEach((p, i) => {
      const p2d = project3D(p.x, p.y, p.z)
      d += i === 0 ? `M ${p2d.x.toFixed(1)} ${p2d.y.toFixed(1)} ` : `L ${p2d.x.toFixed(1)} ${p2d.y.toFixed(1)} `
    })
    if (close) d += 'Z'
    return d
  }

  // 3. 计算各个面的 3D 圆弧与多边形
  const nFrontArc = getXYArc(nXEdge, yT, yB, zF, nDip)
  const nBackArc = getXYArc(nXEdge, yT, yB, zB, nDip)
  const sFrontArc = getXYArc(sXEdge, yT, yB, zF, sDip)
  const sBackArc = getXYArc(sXEdge, yT, yB, zB, sDip)

  // 4. 磁极各表面路径计算
  // N 极前表面
  const nFrontPoly: Point3D[] = [
    { x: nXLeft, y: yT, z: zF },
    ...nFrontArc,
    { x: nXLeft, y: yB, z: zF },
  ]
  // S 极前表面
  const sFrontPoly: Point3D[] = [
    { x: sXRight, y: yT, z: zF },
    { x: sXRight, y: yB, z: zF },
    ...sFrontArc.slice().reverse(),
  ]

  // N 极内凹弯曲表面 (前弧 -> 后弧拼合)
  const nBackSurfacePath = getPathString([...nFrontArc, ...nBackArc.slice().reverse()])
  // S 极内凹弯曲表面 (前弧 -> 后弧拼合)
  const sBackSurfacePath = getPathString([...sFrontArc, ...sBackArc.slice().reverse()])

  // S 极右侧外表面
  const sRightSidePath = getPathString([
    { x: sXRight, y: yT, z: zF },
    { x: sXRight, y: yB, z: zF },
    { x: sXRight, y: yB, z: zB },
    { x: sXRight, y: yT, z: zB },
  ])

  // N 极顶部平表面
  const nTopSurfacePath = getPathString([
    { x: nXLeft, y: yT, z: zF },
    { x: nXEdge, y: yT, z: zF },
    { x: nXEdge, y: yT, z: zB },
    { x: nXLeft, y: yT, z: zB },
  ])

  // S 极顶部平表面
  const sTopSurfacePath = getPathString([
    { x: sXEdge, y: yT, z: zF },
    { x: sXRight, y: yT, z: zF },
    { x: sXRight, y: yT, z: zB },
    { x: sXEdge, y: yT, z: zB },
  ])

  // 5. N/S 文本标签的投影位置
  const nTextPos = project3D(nXLeft + 0.9, -0.3, zF)
  const sTextPos = project3D(sXRight - 1.5, -0.3, zF)

  // 6. 定义美化渐变 IDs
  const nFrontGradId = `n-front-grad-${uniqueId}`
  const sFrontGradId = `s-front-grad-${uniqueId}`
  const nCurvedGradId = `n-curved-grad-${uniqueId}`
  const sCurvedGradId = `s-curved-grad-${uniqueId}`
  const nTopGradId = `n-top-grad-${uniqueId}`
  const sTopGradId = `s-top-grad-${uniqueId}`
  const sSideGradId = `s-side-grad-${uniqueId}`

  // 7. 渲染内容
  const renderBack = () => (
    <g id="layer-back-poles">
      {/* S 极右侧表面 */}
      <path
        d={sRightSidePath}
        fill={`url(#${sSideGradId})`}
        stroke={SCENE_COLORS.magnet.southStroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* N 极内侧凹曲面 */}
      <path
        d={nBackSurfacePath}
        fill={`url(#${nCurvedGradId})`}
        stroke={SCENE_COLORS.magnet.northStroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* S 极内侧凹曲面 */}
      <path
        d={sBackSurfacePath}
        fill={`url(#${sCurvedGradId})`}
        stroke={SCENE_COLORS.magnet.southStroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </g>
  )

  const renderFront = () => (
    <g id="layer-front-poles">
      {/* N 极前主表面 */}
      <path
        d={getPathString(nFrontPoly)}
        fill={`url(#${nFrontGradId})`}
        stroke={SCENE_COLORS.magnet.northStroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* S 极前主表面 */}
      <path
        d={getPathString(sFrontPoly)}
        fill={`url(#${sFrontGradId})`}
        stroke={SCENE_COLORS.magnet.southStroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* N 极顶表面 */}
      <path
        d={nTopSurfacePath}
        fill={`url(#${nTopGradId})`}
        stroke={SCENE_COLORS.magnet.northStroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* S 极顶表面 */}
      <path
        d={sTopSurfacePath}
        fill={`url(#${sTopGradId})`}
        stroke={SCENE_COLORS.magnet.southStroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* N / S 文字立体标签 */}
      {showLabels && (
        <g>
          {/* N 字阴影面 */}
          <text
            x={nTextPos.x + 1}
            y={nTextPos.y + 1}
            fontWeight="bold"
            fontSize={font(36)}
            fill={SCENE_COLORS.magnet.northStroke}
            fontFamily="Times New Roman"
            style={{ userSelect: 'none' }}
          >
            N
          </text>
          {/* N 字主字 */}
          <text
            x={nTextPos.x}
            y={nTextPos.y}
            fontWeight="bold"
            fontSize={font(36)}
            fill={SCENE_COLORS.magnet.northLabel}
            fontFamily="Times New Roman"
            style={{ userSelect: 'none' }}
          >
            N
          </text>

          {/* S 字阴影面 */}
          <text
            x={sTextPos.x + 1}
            y={sTextPos.y + 1}
            fontWeight="bold"
            fontSize={font(36)}
            fill={SCENE_COLORS.magnet.southStroke}
            fontFamily="Times New Roman"
            style={{ userSelect: 'none' }}
          >
            S
          </text>
          {/* S 字主字 */}
          <text
            x={sTextPos.x}
            y={sTextPos.y}
            fontWeight="bold"
            fontSize={font(36)}
            fill={SCENE_COLORS.magnet.southLabel}
            fontFamily="Times New Roman"
            style={{ userSelect: 'none' }}
          >
            S
          </text>
        </g>
      )}
    </g>
  )

  return (
    <g opacity={opacity}>
      <defs>
        {/* N 极前表面渐变 - 从亮红到暗红 */}
        <linearGradient id={nFrontGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SCENE_COLORS.magnet.northLight} />
          <stop offset="50%" stopColor={SCENE_COLORS.magnet.northBase} />
          <stop offset="100%" stopColor={SCENE_COLORS.magnet.northDark} />
        </linearGradient>

        {/* S 极前表面渐变 - 从亮蓝到深蓝 */}
        <linearGradient id={sFrontGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SCENE_COLORS.magnet.southLight} />
          <stop offset="50%" stopColor={SCENE_COLORS.magnet.southBase} />
          <stop offset="100%" stopColor={SCENE_COLORS.magnet.southDark} />
        </linearGradient>

        {/* N 极顶表面渐变 */}
        <linearGradient id={nTopGradId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={SCENE_COLORS.magnet.northLight} />
          <stop offset="60%" stopColor={SCENE_COLORS.magnet.northBase} />
          <stop offset="100%" stopColor={SCENE_COLORS.magnet.northMid} />
        </linearGradient>

        {/* S 极顶表面渐变 */}
        <linearGradient id={sTopGradId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={SCENE_COLORS.magnet.southLight} />
          <stop offset="60%" stopColor={SCENE_COLORS.magnet.southBase} />
          <stop offset="100%" stopColor={SCENE_COLORS.magnet.southMid} />
        </linearGradient>

        {/* S 极右侧表面渐变 */}
        <linearGradient id={sSideGradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={SCENE_COLORS.magnet.southMid} />
          <stop offset="100%" stopColor={SCENE_COLORS.magnet.southShadow} />
        </linearGradient>

        {/* N 极弯曲内壁渐变 (圆柱背光过渡) */}
        <linearGradient id={nCurvedGradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={SCENE_COLORS.magnet.northDark} />
          <stop offset="40%" stopColor={SCENE_COLORS.magnet.northMid} />
          <stop offset="100%" stopColor={SCENE_COLORS.magnet.northBase} />
        </linearGradient>

        {/* S 极弯曲内壁渐变 (圆柱背光过渡) */}
        <linearGradient id={sCurvedGradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={SCENE_COLORS.magnet.southBase} />
          <stop offset="60%" stopColor={SCENE_COLORS.magnet.southMid} />
          <stop offset="100%" stopColor={SCENE_COLORS.magnet.southDark} />
        </linearGradient>
      </defs>

      {/* 根据分层属性进行绘制 */}
      {layer === 'back' && renderBack()}
      {layer === 'front' && renderFront()}
      {layer === 'all' && (
        <>
          {renderBack()}
          {renderFront()}
        </>
      )}
    </g>
  )
}


