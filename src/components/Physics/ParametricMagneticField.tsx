import React from 'react';
import { MAGNET_COLORS, PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics';
import { bezierAt, bezierTangent, FieldArrow } from './magneticFieldUtils';

/**
 * 参数化磁感线组件 Props
 */
interface MagneticFieldProps {
  /** 磁铁矩形宽度 (px) */
  w: number
  /** 磁铁矩形高度 (px) */
  h: number
  /** 极性驱动：1 = 右N左S，-1 = 左N右S */
  pole: 1 | -1
  /** 画布总高度 (px)，用于计算垂直边界安全裁剪 */
  canvasHeight: number
  /** 磁感线颜色，默认 '#4ade80' */
  lineColor?: string
  /** 是否展示小磁针探针，默认 false */
  showCompasses?: boolean
}

/**
 * 参数化磁感线组件
 *
 * 为条形磁铁绘制完整的磁感线分布：
 * - 外部回道线（虚线）：从 N 极出发经空气绕回 S 极，分内/中/外三圈
 * - 内部闭合线（实线）：在磁铁内部从 S 极回到 N 极，体现磁感线闭合本质
 * - 两端轴线延伸段（虚线）：N 极外侧发射、S 极外侧注入
 * - 5 点方向箭头：标注 N 外侧、S 外侧、上下中圈、内部中心的场向（有磁针时可由磁针替代）
 * - 边界安全裁剪：防止磁感线飞出画布
 */
export const ParametricMagneticField: React.FC<MagneticFieldProps> = ({
  w,
  h,
  pole,
  canvasHeight,
  lineColor = PHYSICS_COLORS.magneticField,
  showCompasses = false
}) => {
  const halfW = w / 2;
  const halfH = h / 2;

  // 【1. 边界安全裁剪】 限制磁感线最高/最深不能超过可视留白区域的 85%，防止飞出画布
  const maxAllowedY = (canvasHeight / 2) * 0.85;
  const clampY = (targetY: number) => Math.min(maxAllowedY, targetY);

  // 【2. 偶极子采样反转配置】 yRat越接近1越靠近棱角(内圈)；yRat越接近0越靠近轴线(外圈)
  const configs = [
    { yRat: 0.75, dxRat: 0.25, dyRat: 0.20, name: 'inner' },  // 内圈：发自边角，紧包裹四角断层
    { yRat: 0.45, dxRat: 0.55, dyRat: 0.55, name: 'middle' }, // 中圈：标准蝴蝶翼，用于锚定空气箭头
    { yRat: 0.15, dxRat: 0.85, dyRat: 1.00, name: 'outer' },  // 外圈：发自中部，宏大包络
  ];

  const externalPaths: string[] = [];
  const internalPaths: string[] = [];

  // 【3. 严格依据物理流向构建线段路径】
  configs.forEach(({ yRat, dxRat, dyRat }) => {
    const yVal = yRat * halfH;
    const dx = dxRat * w;
    const dy = clampY(dyRat * w);

    // 外部回道线：起点永远在 N 端面，终点永远在 S 端面 (Flow: N -> S)
    // 当 pole=1 时，从右侧端面出发绕回左侧端面；pole=-1 时，从左侧出发绕回右侧
    // 上方回道线
    externalPaths.push(
      `M ${halfW * pole} ${-yVal} ` +
      `C ${(halfW + dx) * pole} ${-halfH - dy}, ` +
      `${(-halfW - dx) * pole} ${-halfH - dy}, ` +
      `${-halfW * pole} ${-yVal}`
    );

    // 下方回道线
    externalPaths.push(
      `M ${halfW * pole} ${yVal} ` +
      `C ${(halfW + dx) * pole} ${halfH + dy}, ` +
      `${(-halfW - dx) * pole} ${halfH + dy}, ` +
      `${-halfW * pole} ${yVal}`
    );

    // 内部闭合线：起点永远在 S 端面，终点永远在 N 端面 (Flow: S -> N)
    internalPaths.push(`M ${-halfW * pole} ${yVal} L ${halfW * pole} ${yVal}`);
    internalPaths.push(`M ${-halfW * pole} ${-yVal} L ${halfW * pole} ${-yVal}`);
  });

  // 两端外轴线延伸段 (世界坐标大方向与 pole 保持共线轴向)
  const outerX = halfW + 1.2 * w;
  const axisN = `M ${halfW * pole} 0 L ${outerX * pole} 0`;
  const axisS = `M ${-outerX * pole} 0 L ${-halfW * pole} 0`;

  // 【4. 核心方向驱动矩阵】 纯线性映射，无任何特例判断
  const externalAxisDir = pole;   // 两端外轴线附近的场向向量
  const internalDir = pole;       // 磁铁内部中心的场向向量

  // 【5. 贝塞尔曲线精确计算】在 t=0.5 处计算曲线点和切线方向
  // 使用中间圈（middle）计算上下回路箭头位置
  const midConfig = configs[1]; // middle: yRat=0.45, dxRat=0.55, dyRat=0.55
  const midYVal = midConfig.yRat * halfH;
  const midDx = midConfig.dxRat * w;
  const midDy = clampY(midConfig.dyRat * w);

  // 上方回路箭头：在 t=0.5 处计算精确位置和切线角度
  const topP0x = halfW * pole;
  const topP0y = -midYVal;
  const topP1x = (halfW + midDx) * pole;
  const topP1y = -halfH - midDy;
  const topP2x = (-halfW - midDx) * pole;
  const topP2y = -halfH - midDy;
  const topP3x = -halfW * pole;
  const topP3y = -midYVal;

  const topArrowX = bezierAt(0.5, topP0x, topP1x, topP2x, topP3x);
  const topArrowY = bezierAt(0.5, topP0y, topP1y, topP2y, topP3y);
  const topDx = bezierTangent(0.5, topP0x, topP1x, topP2x, topP3x);
  const topDy = bezierTangent(0.5, topP0y, topP1y, topP2y, topP3y);
  const topAngle = Math.atan2(topDy, topDx) * 180 / Math.PI;

  // 下方回路箭头：在 t=0.5 处计算精确位置和切线角度
  const botP0x = halfW * pole;
  const botP0y = midYVal;
  const botP1x = (halfW + midDx) * pole;
  const botP1y = halfH + midDy;
  const botP2x = (-halfW - midDx) * pole;
  const botP2y = halfH + midDy;
  const botP3x = -halfW * pole;
  const botP3y = midYVal;

  const botArrowX = bezierAt(0.5, botP0x, botP1x, botP2x, botP3x);
  const botArrowY = bezierAt(0.5, botP0y, botP1y, botP2y, botP3y);
  const botDx = bezierTangent(0.5, botP0x, botP1x, botP2x, botP3x);
  const botDy = bezierTangent(0.5, botP0y, botP1y, botP2y, botP3y);
  const botAngle = Math.atan2(botDy, botDx) * 180 / Math.PI;

  // 【6. 物理语义解耦的 5 点高可靠独立箭头配置表】
  const arrows = [
    {
      role: 'N 极外侧轴线',
      x: (halfW + 0.3 * w) * pole,
      y: 0,
      angle: externalAxisDir === 1 ? 0 : 180,
      meaning: '磁感线从 N 极向外发射',
    },
    {
      role: 'S 极外侧轴线',
      x: (-halfW - 0.3 * w) * pole,
      y: 0,
      angle: externalAxisDir === 1 ? 0 : 180,
      meaning: '磁感线从外部注入 S 极（方向指向磁铁短端面）',
    },
    {
      role: '上方中圈顶点',
      x: topArrowX,
      y: topArrowY,
      angle: topAngle,
      meaning: '外部上方磁场由 N 绕向 S',
    },
    {
      role: '下方中圈底点',
      x: botArrowX,
      y: botArrowY,
      angle: botAngle,
      meaning: '外部下方磁场由 N 绕向 S',
    },
    {
      role: '磁铁内部中心',
      x: 0,
      y: 0,
      angle: internalDir === 1 ? 0 : 180,
      meaning: '内部磁场由 S 回到 N',
    },
  ];

  // 统一的小磁针渲染函数：支持按磁场切线偏转，红端指N，蓝端指S
  const renderCompass = (cx: number, cy: number, angle: number) => {
    const r = 8.5; // 直径 17px
    const borderStroke = MAGNET_COLORS.bodyStroke || '#737373';
    return (
      <g transform={`translate(${cx}, ${cy})`} className="magnetic-compass">
        {/* 外表壳 */}
        <circle r={r} fill={SCENE_COLORS.materials.specularWhite} stroke={borderStroke} strokeWidth={1} />
        {/* 指针组 */}
        <g transform={`rotate(${angle})`}>
          {/* N 极指向右端面，涂红色 */}
          <polygon points={`0,-2.5 ${r - 2.5},0 0,2.5`} fill={MAGNET_COLORS.northBase} />
          {/* S 极指向左端面，涂蓝色 */}
          <polygon points={`0,-2.5 ${-r + 2.5},0 0,2.5`} fill={MAGNET_COLORS.southBase} />
          {/* 转轴铜钉 */}
          <circle r={1.5} fill={borderStroke} />
        </g>
      </g>
    );
  };

  return (
    <g className="parametric-magnetic-field-simulation">
      {/* 渲染外部磁感线 (虚线) */}
      {externalPaths.map((d, i) => (
        <path key={`ext-${i}`} d={d} fill="none" stroke={lineColor} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.35} />
      ))}
      <path d={axisN} fill="none" stroke={lineColor} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.35} />
      <path d={axisS} fill="none" stroke={lineColor} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.35} />

      {/* 渲染内部闭合磁感线 (实线，体现闭合本质：S→N) */}
      {internalPaths.map((d, i) => (
        <path key={`int-${i}`} d={d} fill="none" stroke={lineColor} strokeWidth={1.5} opacity={0.6} />
      ))}
      <line x1={-halfW * pole} y1={0} x2={halfW * pole} y2={0} stroke={lineColor} strokeWidth={1.5} opacity={0.6} />

      {/* 渲染 5 点高清晰降噪固定箭头系统 (非展示磁针模式下) */}
      {!showCompasses && arrows.map((arrow, idx) => (
        <g key={`arrow-${idx}`} data-role={arrow.role}>
          <FieldArrow cx={arrow.x} cy={arrow.y} angle={arrow.angle} size={5} color={lineColor} />
        </g>
      ))}

      {/* 渲染 5 点偏转小磁针探针 */}
      {showCompasses && arrows.map((arrow, idx) => (
        <g key={`compass-${idx}`} data-role={arrow.role}>
          {renderCompass(arrow.x, arrow.y, arrow.angle)}
        </g>
      ))}
    </g>
  );
};


