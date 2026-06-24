import { ReactNode } from 'react';
import { CANVAS_STYLE, SCENE_COLORS, CHART_COLORS, PHYSICS_COLORS } from '@/theme/physics';

export interface TickMark {
  value: number;
  isMinor: boolean;
  label: string;
}

/**
 * 自动计算尺子/坐标轴的所有刻度
 */
export function createRulerTicks(
  domain: [number, number],
  tickInterval: number,
  minorTicks: number = 0
): TickMark[] {
  const [start, end] = domain;
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  const ticks: TickMark[] = [];
  const epsilon = 1e-10;

  if (tickInterval <= 0) return [];
  
  // 主刻度
  let currentMajor = Math.ceil(min / tickInterval - epsilon) * tickInterval;
  
  while (currentMajor <= max + epsilon) {
    const valMajor = parseFloat(currentMajor.toFixed(6));
    ticks.push({ value: valMajor, isMinor: false, label: String(valMajor) });
    
    if (minorTicks > 0) {
      const step = tickInterval / (minorTicks + 1);
      for (let i = 1; i <= minorTicks; i++) {
        const minorVal = currentMajor + i * step;
        if (minorVal <= max + epsilon) {
          ticks.push({ value: parseFloat(minorVal.toFixed(6)), isMinor: true, label: '' });
        }
      }
    }
    currentMajor += tickInterval;
  }

  if (minorTicks > 0 && ticks.length > 0) {
    const firstMajor = ticks[0].value;
    const step = tickInterval / (minorTicks + 1);
    for (let i = 1; i <= minorTicks; i++) {
      const minorVal = firstMajor - i * step;
      if (minorVal >= min - epsilon) {
        ticks.push({ value: parseFloat(minorVal.toFixed(6)), isMinor: true, label: '' });
      }
    }
  }

  return ticks.sort((a, b) => a.value - b.value);
}

export interface PhysicsGroundProps {
  // === 1. 基础位置与尺寸 ===
  x: number;
  y: number;
  width: number;
  
  // === 2. 支撑面形态 ===
  type?: 'ground' | 'platform' | 'wall' | 'bracket';
  appearance?: {
    thickness?: number;    // platform: 平台厚度 (默认 20)
    showHatch?: boolean;   // 斜线纹理 (ground/wall/bracket 通用)
    showBaseShadow?: boolean; // 平行细线 (向后兼容)
    color?: string;        // 覆盖线框色
    fillColor?: string;    // platform/wall 填充色
  };

  // === 3. wall 专属配置 ===
  wall?: {
    height: number;           // 墙体高度 (必填)
    hatchCount?: number;      // hatch 斜线数量 (默认 8)
    hatchSide?: 'left' | 'right'; // hatch 方向 (默认 'right')
  };

  // === 4. 物理标尺配置 (可选) ===
  ruler?: {
    position?: 'top' | 'bottom'; // 标尺在平面的上方还是下方 (默认 bottom)
    domain: [number, number];    // 物理量起止范围
    pixelPerUnit?: number;       // 可选覆盖（默认: width / 范围跨度）
    
    // 刻度细节
    tickInterval?: number;       // 主刻度间距
    minorTicks?: number;         // 次级小刻度数
    unit?: string;               // 附加单位（如 'm'）
    
    // 轴与方向
    showAxisLine?: boolean;      // 强制绘制坐标轴长线（不带箭头）
    showAxisArrow?: boolean;     // 尾端绘制坐标轴箭头（自动包含线）
    axisLabel?: string;          // 坐标轴末端标注
    axisOffset?: number;         // 坐标轴离地面的独立 Y 偏移（默认 0：紧贴地面）
  };

  children?: ReactNode;
}

/**
 * 通用物理支撑面组件 (地面/平台/标尺)
 */
export function PhysicsGround({
  x,
  y,
  width,
  type = 'ground',
  appearance,
  wall,
  ruler,
  children
}: PhysicsGroundProps) {
  // 面基础样式
  const strokeColor = appearance?.color || PHYSICS_COLORS.labelText;
  const fillColor = appearance?.fillColor || SCENE_COLORS.surface.groundFill;
  const thickness = appearance?.thickness || 20;

  // 生成一个随机 ID 给 pattern，避免同一页面多个组件冲突
  const hatchId = `hatch-${Math.round(x)}-${Math.round(y)}-${Math.round(width)}`;

  // 计算刻度
  const hasTicks = ruler?.tickInterval !== undefined && ruler.tickInterval > 0;
  let ticks: TickMark[] = [];
  let pxPerUnit = 0;
  
  if (ruler) {
    const span = ruler.domain[1] - ruler.domain[0];
    pxPerUnit = ruler.pixelPerUnit || (span === 0 ? 1 : width / span);
    
    if (ruler.tickInterval !== undefined) {
      ticks = createRulerTicks(ruler.domain, ruler.tickInterval, ruler.minorTicks);
    }
  }

  // 标尺 Y 位置计算：如果不提供 offset，则紧贴表面 (对于地面，baseline = y)
  const rPos = ruler?.position || 'bottom';
  const isBottom = rPos === 'bottom';
  const baselineY = ruler?.axisOffset !== undefined 
    ? y + ruler.axisOffset 
    : (isBottom ? y + (type === 'platform' ? thickness : 0) : y);

  const tickDir = isBottom ? 1 : -1;

  // === 渲染支撑面 ===
  const renderSurface = () => {
    if (type === 'platform') {
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={thickness}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
      );
    }

    if (type === 'wall') {
      if (!wall) {
        console.error('PhysicsGround: type="wall" requires wall prop');
        return null;
      }
      const { height: h, hatchCount = 8, hatchSide = 'right' } = wall;
      return (
        <g>
          {/* 墙体矩形主体 */}
          <rect
            x={x}
            y={y}
            width={width}
            height={h}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
          />
          {/* 斜线 hatch */}
          {appearance?.showHatch && Array.from({ length: hatchCount }).map((_, i) => {
            const step = h / hatchCount;
            // left: 左下→右上 (/)  |  right: 左上→右下 (\)
            const x1 = x;
            const y1 = hatchSide === 'left' ? y + i * step + step : y + i * step;
            const x2 = x + width;
            const y2 = hatchSide === 'left' ? y + i * step : y + i * step + step;
            return (
              <line key={i}
                x1={x1} y1={y1}
                x2={x2} y2={y2}
                stroke={strokeColor} strokeWidth={1.5} opacity={0.4} />
            );
          })}
        </g>
      );
    }

    if (type === 'bracket') {
      return (
        <g>
          {/* 横梁主线 */}
          <line
            x1={x} y1={y}
            x2={x + width} y2={y}
            stroke={strokeColor}
            strokeWidth={CANVAS_STYLE.stroke.groundLine}
          />
          {/* 可选平行细线（粗糙面效果） */}
          {appearance?.showBaseShadow && (
            <line
              x1={x} y1={y + 3}
              x2={x + width} y2={y + 3}
              stroke={strokeColor}
              strokeWidth={1}
              opacity={0.3}
            />
          )}
          {/* 可选斜线纹理（MomentumTheoremAnimation 支架样式） */}
          {/* NOTE: showHatch 的默认布局 (y-80, 8条线) 为 MomentumTheoremAnimation 兼容，
              如遇更复杂支架结构，优先用 children 组合而非继续加 props */}
          {appearance?.showHatch && (
            <g opacity={0.4}>
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={i}
                  x1={x} y1={y - 80 + i * 15}
                  x2={x + width} y2={y - 80 + i * 15 + 15}
                  stroke={strokeColor} strokeWidth={1.5} />
              ))}
            </g>
          )}
        </g>
      );
    }
    
    // ground (物理地面)
    return (
      <g>
        {/* 斜线阴影纹理（教科书经典地面画法） */}
        {appearance?.showHatch && (
          <>
            <defs>
              <pattern id={hatchId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="10" stroke={strokeColor} strokeWidth="1.5" opacity={0.35} />
              </pattern>
            </defs>
            <rect x={x} y={y} width={width} height={12} fill={`url(#${hatchId})`} />
          </>
        )}
        
        {/* 备用的平行细线 */}
        {appearance?.showBaseShadow && !appearance?.showHatch && (
          <line
            x1={x} y1={y + 3}
            x2={x + width} y2={y + 3}
            stroke={strokeColor}
            strokeWidth={1}
            opacity={0.3}
          />
        )}

        {/* 主地面线 */}
        <line 
          x1={x} y1={y} 
          x2={x + width} y2={y} 
          stroke={strokeColor} 
          strokeWidth={CANVAS_STYLE.stroke.groundLine} 
        />
      </g>
    );
  };

  // === 渲染标尺轴线与刻度 ===
  const renderRuler = () => {
    if (!ruler) return null;
    
    const axisY = baselineY;
    const arrowLen = 8;
    const showLine = ruler.showAxisArrow || ruler.showAxisLine;
    
    // 如果附着在地面上，就用主色，如果是悬空，使用 chart 色
    const elementColor = ruler.axisOffset ? CHART_COLORS.axisLine : strokeColor;
    const textColor = ruler.axisOffset ? CHART_COLORS.labelText : strokeColor;

    return (
      <g className="physics-ruler">
        {showLine && (
          <g>
            <line
              x1={x} y1={axisY}
              x2={x + width - (ruler.showAxisArrow ? arrowLen : 0)} y2={axisY}
              stroke={elementColor}
              strokeWidth={CANVAS_STYLE.stroke.axis}
            />
            {/* 箭头 */}
            {ruler.showAxisArrow && (
              <polygon
                points={`${x + width},${axisY} ${x + width - arrowLen},${axisY - 4} ${x + width - arrowLen},${axisY + 4}`}
                fill={elementColor}
              />
            )}
            {ruler.axisLabel && (
              <text
                x={x + width + 6}
                y={axisY + 4}
                fontSize={CANVAS_STYLE.font.axis}
                fill={textColor}
              >
                {ruler.axisLabel}
              </text>
            )}
          </g>
        )}

        {hasTicks && ticks.map((t, idx) => {
          const tx = x + (t.value - ruler.domain[0]) * pxPerUnit;
          // 增加 1e-4 的容差，避免末尾刻度被浮点误差过滤掉
          if (tx < x - 1e-4 || tx > x + width + 1e-4) return null;
          
          const tickLen = t.isMinor ? 4 : 8;
          return (
            <g key={`tick-${t.value}-${t.isMinor ? 'minor' : 'major'}-${idx}`}>
              <line
                x1={tx} y1={axisY}
                x2={tx} y2={axisY + tickLen * tickDir}
                stroke={elementColor}
                strokeWidth={t.isMinor ? 1 : CANVAS_STYLE.stroke.tickBold}
              />
              {!t.isMinor && (
                <text
                  x={tx}
                  y={axisY + (tickLen + 14) * tickDir + (isBottom ? 0 : 4)}
                  fontSize={CANVAS_STYLE.font.small}
                  fill={textColor}
                  textAnchor="middle"
                >
                  {t.label}{ruler.unit ? ruler.unit : ''}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <g className="physics-ground-container">
      {renderSurface()}
      {renderRuler()}
      {children}
    </g>
  );
}
