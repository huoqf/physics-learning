import React from 'react';
import { PHYSICS_COLORS } from '@/theme/physics';
import { bezierAt, bezierTangent, FieldArrow } from './magneticFieldUtils';

/**
 * 耦合线圈磁感线组件 Props
 */
interface CoupledCoilFieldProps {
  /** 原线圈中心 x (px) */
  primaryX: number
  /** 原线圈宽度 (px) */
  primaryW: number
  /** 原线圈高度 (px) */
  primaryH: number
  /** 副线圈中心 x (px) */
  secondaryX: number
  /** 副线圈宽度 (px) */
  secondaryW: number
  /** 副线圈高度 (px) */
  secondaryH: number
  /** 线圈垂直中心 y (px) */
  y: number
  /** 感应电流大小（决定磁感线透明度和箭头可见性） */
  current: number
  /** 画布总高度 (px)，用于边界安全裁剪 */
  canvasHeight: number
  /** 磁感线颜色，默认 '#10B981' */
  lineColor?: string
}

/**
 * 耦合线圈磁感线组件
 *
 * 为互感实验中的原/副线圈绘制耦合磁感线分布：
 * - 外部回道线（虚线）：从副线圈 N 面出发绕回原线圈 S 面，分三圈
 * - 内部穿透线（实线）：从原线圈 S 面穿透到副线圈 N 面
 * - 5 点方向箭头：标注原线圈内、中间间隙、副线圈内、上下外圈的场向
 * - 磁感线透明度随电流大小动态变化
 * - 线宽、箭头大小均基于线圈尺寸自适应缩放
 */
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
  lineColor = PHYSICS_COLORS.magneticField,
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

  // 使用中间圈（middle）计算上下回路箭头位置
  const midConfig = configs[1]; // middle: yRat=0.50, dxRat=0.55, dyRat=0.45
  const midYVal = midConfig.yRat * halfH;
  const midDx = midConfig.dxRat * totalSpan;
  const midDy = clampY(midConfig.dyRat * totalSpan * 0.35);

  // 5 点方向箭头
  const midGapX = (primaryX + secondaryX) / 2;

  // 上方回路箭头：在 t=0.5 处计算精确位置和切线角度
  const topP0x = secondaryRight;
  const topP0y = y - midYVal;
  const topP1x = secondaryX + secondaryW * 0.3 + midDx;
  const topP1y = y - halfH - midDy;
  const topP2x = primaryX - primaryW * 0.3 - midDx;
  const topP2y = y - halfH - midDy;
  const topP3x = primaryLeft;
  const topP3y = y - midYVal;

  const topArrowX = bezierAt(0.5, topP0x, topP1x, topP2x, topP3x);
  const topArrowY = bezierAt(0.5, topP0y, topP1y, topP2y, topP3y);
  const topDx = bezierTangent(0.5, topP0x, topP1x, topP2x, topP3x);
  const topDy = bezierTangent(0.5, topP0y, topP1y, topP2y, topP3y);
  const topAngle = Math.atan2(topDy, topDx) * 180 / Math.PI;

  // 下方回路箭头：在 t=0.5 处计算精确位置和切线角度
  const botP0x = secondaryRight;
  const botP0y = y + midYVal;
  const botP1x = secondaryX + secondaryW * 0.3 + midDx;
  const botP1y = y + halfH + midDy;
  const botP2x = primaryX - primaryW * 0.3 - midDx;
  const botP2y = y + halfH + midDy;
  const botP3x = primaryLeft;
  const botP3y = y + midYVal;

  const botArrowX = bezierAt(0.5, botP0x, botP1x, botP2x, botP3x);
  const botArrowY = bezierAt(0.5, botP0y, botP1y, botP2y, botP3y);
  const botDx = bezierTangent(0.5, botP0x, botP1x, botP2x, botP3x);
  const botDy = bezierTangent(0.5, botP0y, botP1y, botP2y, botP3y);
  const botAngle = Math.atan2(botDy, botDx) * 180 / Math.PI;

  const arrows = [
    { x: primaryX, y: y, angle: 0 },      // 原线圈内部，向右
    { x: midGapX, y: y, angle: 0 },       // 中间间隙，向右
    { x: secondaryX, y: y, angle: 0 },    // 副线圈内部，向右
    { x: topArrowX, y: topArrowY, angle: topAngle },  // 上方回路，贴线
    { x: botArrowX, y: botArrowY, angle: botAngle },  // 下方回路，贴线
  ];

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
          <FieldArrow cx={arrow.x} cy={arrow.y} angle={arrow.angle} size={arrowSize} color={lineColor} />
        </g>
      ))}
    </g>
  );
};


