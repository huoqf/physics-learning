import React from 'react';

interface MagneticFieldProps {
  w: number;            // 磁铁矩形宽度 (像素值)
  h: number;            // 磁铁矩形高度 (像素值)
  pole: 1 | -1;         // 极性驱动：1 代表右N左S；-1 代表左N右S
  canvasHeight: number; // 画布总高度，用于计算垂直边界安全裁剪
  lineColor?: string;   // 磁感线颜色，默认 Tailwind 的 green-400
}

export const ParametricMagneticField: React.FC<MagneticFieldProps> = ({
  w,
  h,
  pole,
  canvasHeight,
  lineColor = '#4ade80'
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
  const externalLoopDir = -pole;  // 空气中上下绕行回道线的场向向量
  const internalDir = pole;       // 磁铁内部中心的场向向量

  // 动态计算中圈拱顶/拱底的实际 Y 坐标，使空气箭头完美贴线
  const midLineMidY = halfH + clampY(0.55 * w);

  // 【5. 物理语义解耦的 5 点高可靠独立箭头配置表】
  const arrows = [
    {
      role: 'N 极外侧轴线',
      x: (halfW + 0.3 * w) * pole,
      y: 0,
      dir: externalAxisDir,
      meaning: '磁感线从 N 极向外发射',
    },
    {
      role: 'S 极外侧轴线',
      x: (-halfW - 0.3 * w) * pole,
      y: 0,
      dir: externalAxisDir, 
      meaning: '磁感线从外部注入 S 极（方向指向磁铁短端面）',
    },
    {
      role: '上方中圈顶点',
      x: 0,
      y: -midLineMidY,
      dir: externalLoopDir,
      meaning: '外部上方磁场由 N 绕向 S',
    },
    {
      role: '下方中圈底点',
      x: 0,
      y: midLineMidY,
      dir: externalLoopDir,
      meaning: '外部下方磁场由 N 绕向 S',
    },
    {
      role: '磁铁内部中心',
      x: 0,
      y: 0,
      dir: internalDir,
      meaning: '内部磁场由 S 回到 N',
    },
  ];

  // 统一的独立水平箭头渲染函数：dir = 1 世界坐标向右，dir = -1 世界坐标向左
  const renderArrow = (cx: number, cy: number, dir: number) => {
    const angle = dir === 1 ? 0 : 180;
    return (
      <polygon
        points="-5,-3.5 5,0 -5,3.5"
        fill={lineColor}
        opacity={0.85}
        transform={`translate(${cx}, ${cy}) rotate(${angle})`}
      />
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

      {/* 渲染 5 点高清晰降噪固定箭头系统 */}
      {arrows.map((arrow, idx) => (
        <g key={`arrow-${idx}`} data-role={arrow.role}>
          {renderArrow(arrow.x, arrow.y, arrow.dir)}
        </g>
      ))}
    </g>
  );
};

export default ParametricMagneticField;
