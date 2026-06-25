import { ReactNode } from 'react';
import { CANVAS_STYLE, SCENE_COLORS, CHART_COLORS, PHYSICS_COLORS } from '@/theme/physics';
import { calculateNiceStep, createRulerTicks as coreCreateRulerTicks, TickMark } from '@/utils/ruler';

export type { TickMark };

/**
 * 自动计算尺子/坐标轴的所有刻度
 */
export function createRulerTicks(
  domain: [number, number],
  tickInterval: number,
  minorTicks: number = 0
): TickMark[] {
  return coreCreateRulerTicks(domain, tickInterval, minorTicks);
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

  // === 5. 接触面物理性质 (可选) ===
  isSmooth?: boolean;           // 是否是光滑镜面 (优先级最高，高光白线 + 冰蓝发光影)
  roughness?: number;           // 粗糙度 (0 到 1 之间)，大于 0 时绘制锯齿摩擦点

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
  isSmooth = false,
  roughness = 0,
  children
}: PhysicsGroundProps) {
  // 面基础样式
  const strokeColor = appearance?.color || PHYSICS_COLORS.labelText;
  const fillColor = appearance?.fillColor || SCENE_COLORS.surface.groundFill;
  const thickness = appearance?.thickness || 20;

  // 生成一个随机 ID 给 pattern，避免同一页面多个组件冲突
  const hatchId = `hatch-${Math.round(x)}-${Math.round(y)}-${Math.round(width)}`;

  // 计算刻度
  let ticks: TickMark[] = [];
  let pxPerUnit = 0;
  
  if (ruler) {
    const span = ruler.domain[1] - ruler.domain[0];
    pxPerUnit = ruler.pixelPerUnit || (span === 0 ? 1 : width / span);
    
    let interval = ruler.tickInterval;
    let minor = ruler.minorTicks || 0;
    
    if (interval === undefined || interval <= 0) {
      const stepInfo = calculateNiceStep(ruler.domain, width);
      interval = stepInfo.tickInterval;
      minor = stepInfo.minorTicks;
    }
    
    ticks = coreCreateRulerTicks(ruler.domain, interval, minor);
  }

  const hasTicks = ruler !== undefined && ticks.length > 0;

  // 标尺 Y 位置计算：如果不提供 offset，则紧贴表面 (对于地面，baseline = y)
  const rPos = ruler?.position || 'bottom';
  const isBottom = rPos === 'bottom';
  const baselineY = ruler?.axisOffset !== undefined 
    ? y + ruler.axisOffset 
    : (isBottom ? y + (type === 'platform' ? thickness : 0) : y);

  const tickDir = isBottom ? 1 : -1;

  // === 渲染支撑面 ===
  const renderSurface = () => {
    // 绘制粗糙度锯齿
    const renderRoughness = (baseY: number) => {
      if (isSmooth || !roughness || roughness <= 0) return null;
      const clampedRough = Math.max(0, Math.min(1, roughness));
      const step = Math.max(8, width / 80); // 自适应锯齿步长，减少超宽地面下的 DOM 节点压力
      const count = Math.floor(width / step);
      const points: string[] = [];
      for (let i = 0; i <= count; i++) {
        const px = x + i * step;
        const py = baseY + (i % 2 === 0 ? 0 : 3 * clampedRough);
        points.push(`${px},${py}`);
      }
      return (
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.2}
          opacity={0.4 + clampedRough * 0.4}
        />
      );
    };

    if (type === 'platform') {
      const hasCustomFill = !!appearance?.fillColor;
      const platformFill = hasCustomFill ? fillColor : `url(#platform-grad-${hatchId})`;

      return (
        <g>
          <defs>
            {/* 3D金属质感渐变，复用系统标准的 springMetalGrad */}
            {!hasCustomFill && (
              <linearGradient id={`platform-grad-${hatchId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={SCENE_COLORS.spring.springMetalGrad[0]} />
                <stop offset="25%" stopColor={SCENE_COLORS.spring.springMetalGrad[1]} />
                <stop offset="50%" stopColor={SCENE_COLORS.spring.springMetalGrad[2]} />
                <stop offset="100%" stopColor={SCENE_COLORS.spring.springMetalGrad[3]} />
              </linearGradient>
            )}
            {/* 光滑冰蓝渐变 */}
            {isSmooth && (
              <linearGradient id={`smooth-glow-${hatchId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
              </linearGradient>
            )}
          </defs>

          {/* 镜面冰蓝发光（顶层上方悬浮） */}
          {isSmooth && (
            <rect
              x={x}
              y={y - 6}
              width={width}
              height={6}
              fill={`url(#smooth-glow-${hatchId})`}
            />
          )}

          {/* 平台本体 */}
          <rect
            x={x}
            y={y}
            width={width}
            height={thickness}
            fill={platformFill}
            stroke={strokeColor}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
          />

          {/* 粗糙锯齿 (如果不是光滑的) */}
          {renderRoughness(y)}

          {/* 镜面高光白线 */}
          {isSmooth && (
            <line
              x1={x + 1}
              y1={y + 1}
              x2={x + width - 1}
              y2={y + 1}
              stroke="#F0F9FF"
              strokeWidth={1.5}
              opacity={0.9}
            />
          )}
        </g>
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
        <defs>
          {/* 斜线阴影纹理 */}
          {appearance?.showHatch && (
            <pattern id={hatchId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="10" stroke={strokeColor} strokeWidth="1.5" opacity={0.35} />
            </pattern>
          )}
          {/* 光滑冰蓝渐变 */}
          {isSmooth && (
            <linearGradient id={`smooth-glow-${hatchId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
            </linearGradient>
          )}
        </defs>

        {/* 斜线阴影纹理 */}
        {appearance?.showHatch && !isSmooth && (
          <rect x={x} y={y} width={width} height={12} fill={`url(#${hatchId})`} />
        )}

        {/* 镜面冰蓝发光（地面线下方发光） */}
        {isSmooth && (
          <rect
            x={x}
            y={y}
            width={width}
            height={8}
            fill={`url(#smooth-glow-${hatchId})`}
          />
        )}
        
        {/* 备用的平行细线 (非光滑、非斜线纹理时展示) */}
        {appearance?.showBaseShadow && !appearance?.showHatch && !isSmooth && (
          <line
            x1={x} y1={y + 3}
            x2={x + width} y2={y + 3}
            stroke={strokeColor}
            strokeWidth={1}
            opacity={0.3}
          />
        )}

        {/* 粗糙锯齿 (如果不是光滑的) */}
        {renderRoughness(y)}

        {/* 主地面线 */}
        <line 
          x1={x} y1={y} 
          x2={x + width} y2={y} 
          stroke={strokeColor} 
          strokeWidth={CANVAS_STYLE.stroke.groundLine} 
        />

        {/* 镜面高光白线 */}
        {isSmooth && (
          <line
            x1={x}
            y1={y}
            x2={x + width}
            y2={y}
            stroke="#F0F9FF"
            strokeWidth={2}
            opacity={0.9}
          />
        )}
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
