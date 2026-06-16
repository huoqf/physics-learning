import React from 'react';

interface CoupledCoilFieldProps {
  primaryX: number;
  primaryW: number;
  primaryH: number;
  secondaryX: number;
  secondaryW: number;
  secondaryH: number;
  y: number;
  current: number;
  canvasHeight: number;
  lineColor?: string;
}

export const CoupledCoilField: React.FC<CoupledCoilFieldProps> = ({
  primaryX,
  primaryW,
  primaryH,
  secondaryX,
  secondaryW,
  secondaryH,
  y,
  current,
  canvasHeight,
  lineColor = '#10B981',
}) => {
  const primaryLeft = primaryX - primaryW / 2;
  const secondaryRight = secondaryX + secondaryW / 2;

  const opacity = Math.max(0.35, Math.min(0.9, Math.abs(current) * 0.8));
  const maxAllowedY = (canvasHeight / 2) * 0.85;
  const clampY = (val: number) => Math.min(maxAllowedY, Math.abs(val)) * (val >= 0 ? 1 : -1);

  // 基于线圈尺寸的缩放比例
  const halfH = Math.max(primaryH, secondaryH) / 2;
  const totalSpan = secondaryRight - primaryLeft;
  const scale = Math.min(halfH, totalSpan * 0.1); // 自适应缩放因子

  // 线宽、箭头大小、虚线间隔均随 scale 比例缩放
  const strokeW = scale * 0.08;
  const dashArray = `${scale * 0.3} ${scale * 0.2}`;
  const arrowSize = scale * 0.25;

  // 偶极子采样配置（比例值，无像素）
  const configs = [
    { yRat: 0.85, dxRat: 0.25, dyRat: 0.15 },
    { yRat: 0.50, dxRat: 0.55, dyRat: 0.45 },
    { yRat: 0.15, dxRat: 0.85, dyRat: 0.85 },
  ];

  const externalPaths: string[] = [];
  const internalPaths: string[] = [];

  configs.forEach(({ yRat, dxRat, dyRat }) => {
    const yVal = yRat * halfH;
    const dx = dxRat * totalSpan;
    const dy = clampY(dyRat * totalSpan * 0.35);

    // 外部回道线：N面→S面
    externalPaths.push(
      `M ${secondaryRight} ${y - yVal} ` +
      `C ${secondaryX + secondaryW * 0.3 + dx} ${y - halfH - dy}, ` +
      `${primaryX - primaryW * 0.3 - dx} ${y - halfH - dy}, ` +
      `${primaryLeft} ${y - yVal}`
    );
    externalPaths.push(
      `M ${secondaryRight} ${y + yVal} ` +
      `C ${secondaryX + secondaryW * 0.3 + dx} ${y + halfH + dy}, ` +
      `${primaryX - primaryW * 0.3 - dx} ${y + halfH + dy}, ` +
      `${primaryLeft} ${y + yVal}`
    );

    // 内部穿透线：S面→N面，与外部线共享 yVal
    internalPaths.push(`M ${primaryLeft} ${y - yVal} L ${secondaryRight} ${y - yVal}`);
    internalPaths.push(`M ${primaryLeft} ${y + yVal} L ${secondaryRight} ${y + yVal}`);
  });

  // 5 点方向箭头
  const midGapX = (primaryX + secondaryX) / 2;
  const midY = 0.45 * halfH + clampY(0.55 * totalSpan);

  const arrows = [
    { x: primaryX, y: y, dir: 1 },
    { x: midGapX, y: y, dir: 1 },
    { x: secondaryX, y: y, dir: 1 },
    { x: midGapX, y: y - midY, dir: -1 },
    { x: midGapX, y: y + midY, dir: -1 },
  ];

  const renderArrow = (cx: number, cy: number, dir: number) => (
    <polygon
      points={`${-arrowSize},${-arrowSize * 0.7} ${arrowSize},0 ${-arrowSize},${arrowSize * 0.7}`}
      fill={lineColor}
      opacity={0.85}
      transform={`translate(${cx}, ${cy}) rotate(${dir === 1 ? 0 : 180})`}
    />
  );

  return (
    <g className="coupled-coil-field-simulation">
      {externalPaths.map((d, i) => (
        <path key={`ext-${i}`} d={d} fill="none" stroke={lineColor} strokeWidth={strokeW} strokeDasharray={dashArray} opacity={opacity * 0.6} />
      ))}
      {internalPaths.map((d, i) => (
        <path key={`int-${i}`} d={d} fill="none" stroke={lineColor} strokeWidth={strokeW} opacity={opacity} />
      ))}
      {arrows.map((arrow, idx) => (
        <g key={`arrow-${idx}`} opacity={opacity}>
          {renderArrow(arrow.x, arrow.y, arrow.dir)}
        </g>
      ))}
    </g>
  );
};

export default CoupledCoilField;
