import React from 'react'
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
 * RotatingCoil 组件的 API 接口定义与 JSDoc 自文档化说明
 */
export interface RotatingCoilProps {
  /**
   * 3D 坐标到 2D 屏幕坐标的投影函数。
   * 由父级画布统一提供，确保 3D 透视一致。
   */
  project3D: (x: number, y: number, z: number) => Point2D

  /**
   * 线圈当前旋转角，单位：弧度 (rad)。
   * 当 theta = 0 时，线圈处于中性面（垂直于磁场方向，即 Y-Z 平面）。
   */
  theta: number

  /**
   * 动画运行时间 t (秒)。用于驱动感应电流箭头的流动动画。
   */
  t?: number

  /**
   * 当前时刻的感应电动势值 (V)。
   * 用于控制电流箭头的流动方向（emf > 0 为正向流动，emf < 0 为反向流动）以及箭头的可见度/发光强度。
   */
  emf?: number

  /**
   * 最大感应电动势 Em (V)，用于对 emf 进行归一化计算，默认 1.0。
   */
  maxEmf?: number

  /**
   * 线圈宽度半径（从转轴中心到两侧边线的距离），默认 1.05。
   */
  coilWidth?: number

  /**
   * 线圈半长度（沿 Z 轴的单侧长度），默认 1.4。
   */
  coilLength?: number

  /**
   * 线圈着色模式。
   * - 'split': 红色/蓝色分立着色，用于教学追踪线圈的左右两侧。
   * - 'copper': 真实的黄铜/铜线质感着色。
   */
  colorMode?: 'split' | 'copper'

  /**
   * 是否显示滑环 (Slip Rings)，默认 true。
   */
  showSlipRings?: boolean

  /**
   * 是否显示电刷 (Brushes)，默认 true。
   */
  showBrushes?: boolean

  /**
   * 电刷引出接线颜色，默认采用 SCENE_COLORS.circuit.wire。
   */
  brushWireColor?: string
}

/**
 * RotatingCoil — 匀强磁场中 3D 旋转线圈组件
 *
 * 【设计意图】
 * 用于在电磁感应教学中展现线圈旋转切割磁感线的物理现象。
 * 支持绘制真实的双滑环（Slip Rings）与静态碳刷（Brushes）结构。
 * 具备流动的感应电流箭头与强弱发光特效，帮助理解交流电的方向交替和幅值变化。
 *
 * 【动效与美化】
 * - **多层线宽质感**：铜导线采用 3 层不同线宽与透明度的 stroke 叠加，渲染出圆润的金属光泽与边缘描边。
 * - **3D 滑环与阴影**：基于 3D 圆柱体分段投影并根据法线夹角进行实时光源着色，模拟真实的金属反光。
 * - **动态感应电流**：箭头在 3D 空间计算切线方向并投影到 2D，根据当前电动势幅值和正负实时改变流速、方向和不透明度。
 */
export const RotatingCoil: React.FC<RotatingCoilProps> = ({
  project3D,
  theta,
  t = 0,
  emf = 0,
  maxEmf = 1.0,
  coilWidth = 1.05,
  coilLength = 1.4,
  colorMode = 'split',
  showSlipRings = true,
  showBrushes = true,
  brushWireColor = SCENE_COLORS.circuit.wire,
}) => {

  // 1. 辅助函数：解析十六进制颜色为 RGB，供颜色插值使用
  const parseHex = (hex: string) => {
    const cleanHex = hex.replace('#', '')
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    }
  }

  // 2. 辅助函数：颜色线性插值
  const interpolateColor = (color1: string, color2: string, factor: number) => {
    const c1 = parseHex(color1)
    const c2 = parseHex(color2)
    const r = Math.round(c1.r + factor * (c2.r - c1.r))
    const g = Math.round(c1.g + factor * (c2.g - c1.g))
    const b = Math.round(c1.b + factor * (c2.b - c1.b))
    return `rgb(${r}, ${g}, ${b})`
  }

  // 3. 计算旋转状态下的 3D 顶点位置
  // 在 theta = 0 时，线圈垂直于磁场 (垂直于 X 轴，处于 Y-Z 面)。
  // 因此：X 轴坐标正比于 sin(theta)，Y 轴坐标正比于 cos(theta)
  const sinT = Math.sin(theta)
  const cosT = Math.cos(theta)

  // 线圈主体 4 个顶点
  const p1: Point3D = { x: coilWidth * sinT, y: coilWidth * cosT, z: coilLength } // 后右（以 theta 视角）
  const p2: Point3D = { x: -coilWidth * sinT, y: -coilWidth * cosT, z: coilLength } // 后左
  const p3: Point3D = { x: -coilWidth * sinT, y: -coilWidth * cosT, z: -coilLength } // 前左
  const p4: Point3D = { x: coilWidth * sinT, y: coilWidth * cosT, z: -coilLength } // 前右

  const pMidBack: Point3D = { x: 0, y: 0, z: coilLength }
  const pMidFront: Point3D = { x: 0, y: 0, z: -coilLength }

  // 4. 计算引出线接头与滑环的位置
  // 滑环 1 位于 z = -1.7；滑环 2 位于 z = -2.0
  const zRing1 = -coilLength - 0.3
  const zRing2 = -coilLength - 0.6
  const ringRadius = 0.28

  // 蓝侧引出线接线点 (连接至环 1)
  const bOut1: Point3D = { x: -0.2 * sinT, y: -0.2 * cosT, z: -coilLength }
  const bOut2: Point3D = { x: -0.2 * sinT, y: -0.2 * cosT, z: zRing1 }
  const bContact: Point3D = { x: -ringRadius * sinT, y: -ringRadius * cosT, z: zRing1 }

  // 红侧引出线接线点 (连接至环 2)
  const rOut1: Point3D = { x: 0.2 * sinT, y: 0.2 * cosT, z: -coilLength }
  const rOut2: Point3D = { x: 0.2 * sinT, y: 0.2 * cosT, z: zRing2 }
  const rContact: Point3D = { x: ringRadius * sinT, y: ringRadius * cosT, z: zRing2 }

  // 5. 电流状态参数
  const currentRatio = Math.abs(emf) / (maxEmf || 1)
  const flowDirection = emf > 0 ? 1 : emf < 0 ? -1 : 0
  const isCurrentActive = Math.abs(emf) > 0.02

  // 6. 定义线段颜色
  const getSegColor = (side: 'north' | 'south') => {
    if (colorMode === 'split') {
      return side === 'north' ? SCENE_COLORS.magnet.northBase : SCENE_COLORS.magnet.southBase
    }
    return SCENE_COLORS.coil.copperBase
  }

  // 7. 辅助渲染函数：绘制 3D 空间中多层描边的立体导线
  const render3DLine = (
    pA: Point3D,
    pB: Point3D,
    baseColor: string,
    key: string,
    glowColor?: string
  ) => {
    const ptA = project3D(pA.x, pA.y, pA.z)
    const ptB = project3D(pB.x, pB.y, pB.z)
    const d = `M ${ptA.x.toFixed(1)} ${ptA.y.toFixed(1)} L ${ptB.x.toFixed(1)} ${ptB.y.toFixed(1)}`

    // 获取高亮或铜光泽色
    const isCopper = colorMode === 'copper'
    const coreColor = isCopper ? SCENE_COLORS.coil.copperBase : baseColor
    const lightColor = isCopper ? SCENE_COLORS.coil.copperLight : SCENE_COLORS.coil.copperLight
    const darkColor = isCopper ? SCENE_COLORS.coil.copperDark : SCENE_COLORS.coil.copperDark

    return (
      <g key={key}>
        {/* 通电发光层 */}
        {glowColor && isCurrentActive && (
          <path
            d={d}
            fill="none"
            stroke={glowColor}
            strokeWidth={9 + currentRatio * 6}
            strokeLinecap="round"
            opacity={0.15 + currentRatio * 0.2}
            style={{ filter: 'blur(1.5px)' }}
          />
        )}
        {/* 基础外廓阴影 */}
        <path
          d={d}
          fill="none"
          stroke={darkColor}
          strokeWidth={7.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 核心导线 */}
        <path
          d={d}
          fill="none"
          stroke={coreColor}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 受光高光细线 */}
        <path
          d={d}
          fill="none"
          stroke={lightColor}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.75}
        />
      </g>
    )
  }

  // 8. 辅助渲染函数：在线段上绘制沿 3D 投影线流动的电流箭头
  const renderFlowingArrows = (pStart: Point3D, pEnd: Point3D, flowDir: number) => {
    if (!isCurrentActive || flowDir === 0) return null

    // 计算线段在 3D 空间中的向量
    const v3d = { x: pEnd.x - pStart.x, y: pEnd.y - pStart.y, z: pEnd.z - pStart.z }
    const speedFactor = 2.5
    // 依据时间 t 计算流动的 fractional offset
    const offset = (t * speedFactor * flowDir) % 1.0
    const fraction1 = offset < 0 ? offset + 1.0 : offset
    const fraction2 = (fraction1 + 0.5) % 1.0

    const fractions = [fraction1, fraction2]

    return fractions.map((f, idx) => {
      // 计算当前箭头的 3D 点
      const pt3D = {
        x: pStart.x + f * v3d.x,
        y: pStart.y + f * v3d.y,
        z: pStart.z + f * v3d.z,
      }

      // 计算微前方的 3D 点（用于算屏幕向量朝向）
      const delta = 0.05
      // 根据流动方向确定微前方
      const forwardDir = flowDir
      const pt3DForward = {
        x: pt3D.x + delta * forwardDir * v3d.x,
        y: pt3D.y + delta * forwardDir * v3d.y,
        z: pt3D.z + delta * forwardDir * v3d.z,
      }

      // 投影至屏幕
      const pt2D = project3D(pt3D.x, pt3D.y, pt3D.z)
      const pt2DForward = project3D(pt3DForward.x, pt3DForward.y, pt3DForward.z)

      // 2D 屏幕向量
      const dx = pt2DForward.x - pt2D.x
      const dy = pt2DForward.y - pt2D.y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len < 0.1) return null

      const ux = dx / len
      const uy = dy / len
      const px = -uy
      const py = ux

      // 箭头尺寸随电流强度微调
      const arrowLen = 6 + currentRatio * 2
      const arrowW = 4.5 + currentRatio * 1.5

      // 计算三角形 3 个顶点坐标
      const tipX = pt2D.x + ux * arrowLen
      const tipY = pt2D.y + uy * arrowLen
      const baseLeftX = pt2D.x - ux * 2 + px * arrowW
      const baseLeftY = pt2D.y - uy * 2 + py * arrowW
      const baseRightX = pt2D.x - ux * 2 - px * arrowW
      const baseRightY = pt2D.y - uy * 2 - py * arrowW

      return (
        <polygon
          key={`arrow-${idx}`}
          points={`${tipX.toFixed(1)},${tipY.toFixed(1)} ${baseLeftX.toFixed(1)},${baseLeftY.toFixed(1)} ${baseRightX.toFixed(1)},${baseRightY.toFixed(1)}`}
          fill={SCENE_COLORS.coil.activeGlow}
          opacity={0.4 + currentRatio * 0.6}
        />
      )
    })
  }

  // 9. 构造线圈与引线的所有渲染片段，以便进行 3D 深度排序 (Painter's Algorithm)
  // 每个 Segment 包含渲染方法与 zAvg 深度值。
  interface SortableSegment {
    zAvg: number
    render: () => React.JSX.Element
  }

  const redColor = getSegColor('north')
  const blueColor = getSegColor('south')
  const glowCol = SCENE_COLORS.coil.activeGlow

  const segments: SortableSegment[] = [
    // --- 蓝侧线圈边 ---
    {
      zAvg: (pMidBack.z + p2.z) / 2,
      render: () => (
        <g key="wire-blue-back">
          {render3DLine(pMidBack, p2, blueColor, 'wb-back', glowCol)}
          {renderFlowingArrows(pMidBack, p2, flowDirection)}
        </g>
      ),
    },
    {
      zAvg: (p2.z + p3.z) / 2,
      render: () => (
        <g key="wire-blue-side">
          {render3DLine(p2, p3, blueColor, 'wb-side', glowCol)}
          {renderFlowingArrows(p2, p3, flowDirection)}
        </g>
      ),
    },
    {
      zAvg: (p3.z + pMidFront.z) / 2,
      render: () => (
        <g key="wire-blue-front">
          {render3DLine(p3, pMidFront, blueColor, 'wb-front', glowCol)}
          {renderFlowingArrows(p3, pMidFront, flowDirection)}
        </g>
      ),
    },
    {
      zAvg: (pMidFront.z + bOut1.z) / 2,
      render: () => render3DLine(pMidFront, bOut1, blueColor, 'wb-out1', glowCol),
    },
    {
      zAvg: (bOut1.z + bOut2.z) / 2,
      render: () => (
        <g key="wire-blue-lead">
          {render3DLine(bOut1, bOut2, blueColor, 'wb-out2', glowCol)}
          {/* 电流流动到引线上 */}
          {renderFlowingArrows(bOut1, bOut2, flowDirection)}
        </g>
      ),
    },
    {
      zAvg: bOut2.z,
      render: () => (
        <g key="wire-blue-contact">
          {render3DLine(bOut2, bContact, blueColor, 'wb-contact', glowCol)}
          {renderFlowingArrows(bOut2, bContact, flowDirection)}
        </g>
      ),
    },

    // --- 红侧线圈边 ---
    {
      zAvg: (pMidBack.z + p1.z) / 2,
      render: () => (
        <g key="wire-red-back">
          {render3DLine(pMidBack, p1, redColor, 'wr-back', glowCol)}
          {/* 红侧是回流，因此流动方向与蓝侧相反 */}
          {renderFlowingArrows(pMidBack, p1, -flowDirection)}
        </g>
      ),
    },
    {
      zAvg: (p1.z + p4.z) / 2,
      render: () => (
        <g key="wire-red-side">
          {render3DLine(p1, p4, redColor, 'wr-side', glowCol)}
          {renderFlowingArrows(p1, p4, -flowDirection)}
        </g>
      ),
    },
    {
      zAvg: (p4.z + pMidFront.z) / 2,
      render: () => (
        <g key="wire-red-front">
          {render3DLine(p4, pMidFront, redColor, 'wr-front', glowCol)}
          {renderFlowingArrows(p4, pMidFront, -flowDirection)}
        </g>
      ),
    },
    {
      zAvg: (pMidFront.z + rOut1.z) / 2,
      render: () => render3DLine(pMidFront, rOut1, redColor, 'wr-out1', glowCol),
    },
    {
      zAvg: (rOut1.z + rOut2.z) / 2,
      render: () => (
        <g key="wire-red-lead">
          {render3DLine(rOut1, rOut2, redColor, 'wr-out2', glowCol)}
          {renderFlowingArrows(rOut1, rOut2, -flowDirection)}
        </g>
      ),
    },
    {
      zAvg: rOut2.z,
      render: () => (
        <g key="wire-red-contact">
          {render3DLine(rOut2, rContact, redColor, 'wr-contact', glowCol)}
          {renderFlowingArrows(rOut2, rContact, -flowDirection)}
        </g>
      ),
    },
  ]

  // 10. 渲染 3D 环形滑环 Cylinder
  const render3DSlipRing = (zCenter: number) => {
    const segmentsCount = 16
    const ringWidth = 0.16
    const zB = zCenter + ringWidth / 2
    const zF = zCenter - ringWidth / 2

    // 预生成所有圆柱侧面 Quad
    const quadElements: SortableSegment[] = []

    for (let i = 0; i < segmentsCount; i++) {
      const phi1 = (i / segmentsCount) * Math.PI * 2
      const phi2 = ((i + 1) / segmentsCount) * Math.PI * 2

      const x1 = ringRadius * Math.cos(phi1)
      const y1 = ringRadius * Math.sin(phi1)
      const x2 = ringRadius * Math.cos(phi2)
      const y2 = ringRadius * Math.sin(phi2)

      const pt1 = project3D(x1, y1, zB)
      const pt2 = project3D(x2, y2, zB)
      const pt3 = project3D(x2, y2, zF)
      const pt4 = project3D(x1, y1, zF)

      const phiMid = (phi1 + phi2) / 2
      // 简单平行光漫反射因子计算 (光源方向偏左上偏前)
      const intensity = (Math.cos(phiMid) * -0.5 + Math.sin(phiMid) * 0.8 + 1) / 2
      const blendedColor = interpolateColor(
        SCENE_COLORS.coil.copperDark,
        SCENE_COLORS.coil.copperLight,
        intensity
      )

      const pointsString = `${pt1.x.toFixed(1)},${pt1.y.toFixed(1)} ${pt2.x.toFixed(1)},${pt2.y.toFixed(1)} ${pt3.x.toFixed(1)},${pt3.y.toFixed(1)} ${pt4.x.toFixed(1)},${pt4.y.toFixed(1)}`
      const keyStr = `ring-quad-${zCenter.toFixed(2)}-${i}`

      // 计算面中点的 Z 轴作为排序键
      const zAvg = zCenter

      quadElements.push({
        zAvg,
        render: () => (
          <polygon
            key={keyStr}
            points={pointsString}
            fill={blendedColor}
            stroke={SCENE_COLORS.coil.copperStroke}
            strokeWidth={0.5}
            strokeLinejoin="round"
          />
        ),
      })
    }

    return quadElements
  }

  // 11. 渲染碳刷 Brushes (位于滑环边缘的静态块)
  const render3DBrush = (zCenter: number, isLeftSide: boolean) => {
    // 碳刷 3D box 边界
    // 左侧电刷在 X方向: [-0.44, -0.28], Y方向: [-0.1, 0.1], Z方向围绕 zCenter
    // 右侧电刷在 X方向: [0.28, 0.44], Y方向: [-0.1, 0.1], Z方向围绕 zCenter
    const brushW = 0.15
    const brushH = 0.12
    const brushD = 0.16
    const zB = zCenter + brushD / 2
    const zF = zCenter - brushD / 2

    const xL = isLeftSide ? -ringRadius - brushW : ringRadius
    const xR = isLeftSide ? -ringRadius : ringRadius + brushW
    const yT = brushH / 2
    const yB = -brushH / 2

    // 定义 8 个 3D 顶点
    const v: Point3D[] = [
      { x: xL, y: yT, z: zB }, // 0
      { x: xR, y: yT, z: zB }, // 1
      { x: xR, y: yB, z: zB }, // 2
      { x: xL, y: yB, z: zB }, // 3
      { x: xL, y: yT, z: zF }, // 4
      { x: xR, y: yT, z: zF }, // 5
      { x: xR, y: yB, z: zF }, // 6
      { x: xL, y: yB, z: zF }, // 7
    ]

    const projected = v.map((pt) => project3D(pt.x, pt.y, pt.z))

    const drawFace = (indices: number[], fill: string, stroke: string) => {
      const ptsStr = indices.map((idx) => `${projected[idx].x.toFixed(1)},${projected[idx].y.toFixed(1)}`).join(' ')
      return <polygon points={ptsStr} fill={fill} stroke={stroke} strokeWidth={1} strokeLinejoin="round" />
    }

    const baseCol = SCENE_COLORS.coil.insulation
    const strokeCol = SCENE_COLORS.coil.insulationSt
    const shadowCol = '#111827'
    const highlightCol = '#4B5563'

    const keyPrefix = `brush-${isLeftSide ? 'left' : 'right'}-${zCenter.toFixed(2)}`

    // 返回电刷的各个面渲染
    return {
      zAvg: zCenter - 0.05, // 稍微前倾，确保排在环的外面/前面
      render: () => (
        <g key={keyPrefix}>
          {/* 后表面 */}
          {drawFace([0, 1, 2, 3], shadowCol, strokeCol)}
          {/* 左/右侧面 */}
          {isLeftSide
            ? drawFace([0, 3, 7, 4], shadowCol, strokeCol)
            : drawFace([1, 2, 6, 5], highlightCol, strokeCol)}
          {/* 顶表面 */}
          {drawFace([0, 1, 5, 4], highlightCol, strokeCol)}
          {/* 底表面 */}
          {drawFace([2, 3, 7, 6], shadowCol, strokeCol)}
          {/* 前表面 */}
          {drawFace([4, 5, 6, 7], baseCol, strokeCol)}
        </g>
      ),
    }
  }

  // 12. 静态引出导线 (将电刷电流引至外部电路，位置固定在 2D 屏幕底部)
  const renderBrushWires = () => {
    // 碳刷固定引线起终点：
    // 左碳刷 (Ring 1, z=-1.7, x=-0.36) -> 下方接线柱
    // 右碳刷 (Ring 2, z=-2.0, x=0.36) -> 下方接线柱
    const leftBrushCenter = project3D(-ringRadius - 0.07, 0, zRing1)
    const rightBrushCenter = project3D(ringRadius + 0.07, 0, zRing2)

    // 外部连接线汇合至中轴下方
    const groundLeft = project3D(-0.4, -2.4, zRing1)
    const groundRight = project3D(0.4, -2.4, zRing2)

    return (
      <g key="brush-external-wires" opacity={0.85}>
        {/* 左碳刷引线 */}
        <path
          d={`M ${leftBrushCenter.x.toFixed(1)} ${leftBrushCenter.y.toFixed(1)} L ${leftBrushCenter.x.toFixed(1)} ${(leftBrushCenter.y + 40).toFixed(1)} L ${groundLeft.x.toFixed(1)} ${groundLeft.y.toFixed(1)}`}
          fill="none"
          stroke={brushWireColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 右碳刷引线 */}
        <path
          d={`M ${rightBrushCenter.x.toFixed(1)} ${rightBrushCenter.y.toFixed(1)} L ${rightBrushCenter.x.toFixed(1)} ${(rightBrushCenter.y + 50).toFixed(1)} L ${groundRight.x.toFixed(1)} ${groundRight.y.toFixed(1)}`}
          fill="none"
          stroke={brushWireColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    )
  }

  // 13. 合并所有可排序组件并依据 zAvg 排序
  const allSortables: SortableSegment[] = [...segments]

  if (showSlipRings) {
    const ring1Quads = render3DSlipRing(zRing1)
    const ring2Quads = render3DSlipRing(zRing2)
    allSortables.push(...ring1Quads)
    allSortables.push(...ring2Quads)
  }

  if (showBrushes) {
    const leftBrush = render3DBrush(zRing1, true)  // 左碳刷接触滑环 1
    const rightBrush = render3DBrush(zRing2, false) // 右碳刷接触滑环 2
    allSortables.push(leftBrush)
    allSortables.push(rightBrush)
  }

  // 深度排序：zAvg 从大到小（从后向前渲染）
  // 为了微调顺序，如果 zAvg 相同，我们微调 x 或 y 以避免重叠闪烁
  allSortables.sort((a, b) => b.zAvg - a.zAvg)

  return (
    <g>
      {/* 渲染深度排序后的所有线圈、导线、滑环和碳刷元素 */}
      {allSortables.map((item) => item.render())}

      {/* 渲染最前层的外部静态电刷引出导线 */}
      {showBrushes && renderBrushWires()}
    </g>
  )
}

export default RotatingCoil
