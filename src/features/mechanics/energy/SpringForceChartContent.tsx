import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics';
import { useChartContext } from '@/components/Chart';
import { getVSStateAtTime } from '@/physics/verticalSpring';

export function SpringForceChartContent({
  m,
  k,
  h,
  xD_phys,
  g,
  state,
  mode,
  yPhysMax,
  viewMode,
  F_max,
  font = (n: number) => n,
}: {
  m: number;
  k: number;
  h: number;
  xD_phys: number;
  g: number;
  state: ReturnType<typeof getVSStateAtTime>;
  mode: number;
  yPhysMax: number;
  viewMode: 'y-E' | 'E-x';
  F_max: number;
  font?: (base: number) => number;
}) {
  const ctx = useChartContext();
  if (!ctx) return null;
  const { toSvgX, toSvgY, toSvgY2 } = ctx;

  let leftLabel = '← F合<0：向上';
  let rightLabel = 'F合>0：向下 →';

  if (viewMode === 'E-x') {
    leftLabel = 'F合 > 0：向下';
    rightLabel = 'F合 < 0：向上';
  } else {
    if (state.v > 0.01) {
      leftLabel = '← F合<0：向上 (减速)';
      rightLabel = 'F合>0：向下 (加速) →';
    } else if (state.v < -0.01) {
      leftLabel = '← F合<0：向上 (加速)';
      rightLabel = 'F合>0：向下 (减速) →';
    } else {
      leftLabel = '← F合<0：向上';
      rightLabel = 'F合>0：向下 →';
    }
  }

  if (viewMode === 'E-x') {
    const y_current = toSvgY(state.F_net);
    const cursorX = mode === 0 ? state.x + h : state.x;
    const x_current = toSvgX(Math.max(0, cursorX));

    const x_max_phys = mode === 1 ? xD_phys : h + xD_phys;
    const forcePoints: string[] = [];
    const vPoints: string[] = [];
    const pointsCount = 80;
    const dx = x_max_phys / (pointsCount - 1);

    for (let i = 0; i < pointsCount; i++) {
      const curX = i * dx;
      let F_net_val = 0;
      let ep = 0;
      let epe = 0;
      if (mode === 1) {
        F_net_val = m * g - k * curX;
        ep = m * g * (xD_phys - curX);
        epe = 0.5 * k * curX * curX;
      } else {
        if (curX <= h) {
          F_net_val = m * g;
          ep = m * g * (h + xD_phys - curX);
          epe = 0;
        } else {
          F_net_val = m * g - k * (curX - h);
          ep = m * g * (h + xD_phys - curX);
          epe = 0.5 * k * (curX - h) * (curX - h);
        }
      }
      const ek = Math.max(0, state.Etot - ep - epe);
      const vVal = Math.sqrt((2 * ek) / m);

      forcePoints.push(`${toSvgX(curX).toFixed(1)},${toSvgY(F_net_val).toFixed(1)}`);
      vPoints.push(`${toSvgX(curX).toFixed(1)},${toSvgY2 ? toSvgY2(vVal).toFixed(1) : 0}`);
    }
    for (let i = pointsCount - 1; i >= 0; i--) {
      const curX = i * dx;
      let ep = 0;
      let epe = 0;
      if (mode === 1) {
        ep = m * g * (xD_phys - curX);
        epe = 0.5 * k * curX * curX;
      } else {
        if (curX <= h) {
          ep = m * g * (h + xD_phys - curX);
          epe = 0;
        } else {
          ep = m * g * (h + xD_phys - curX);
          epe = 0.5 * k * (curX - h) * (curX - h);
        }
      }
      const ek = Math.max(0, state.Etot - ep - epe);
      const vVal = -Math.sqrt((2 * ek) / m);
      vPoints.push(`${toSvgX(curX).toFixed(1)},${toSvgY2 ? toSvgY2(vVal).toFixed(1) : 0}`);
    }

    const forcePath = `M ${forcePoints.join(' L ')}`;
    const vPath = `M ${vPoints.join(' L ')} Z`;
    const showCursor = cursorX >= -0.005;

    const xA = 0;
    const xB = mode === 1 ? 0 : h;
    const xC = mode === 1 ? (m * g) / k : h + (m * g) / k;
    const xD = x_max_phys;

    const svgXA = toSvgX(xA);
    const svgXB = toSvgX(xB);
    const svgXC = toSvgX(xC);
    const svgXD = toSvgX(xD);

    return (
      <g>
        <g opacity={0.4}>
          {mode === 0 && (
            <line
              x1={svgXB}
              y1={toSvgY(F_max)}
              x2={svgXB}
              y2={toSvgY(-F_max)}
              stroke={CANVAS_COLORS.axis}
              strokeWidth={1}
              strokeDasharray='3,3'
            />
          )}
          <line
            x1={svgXC}
            y1={toSvgY(F_max)}
            x2={svgXC}
            y2={toSvgY(-F_max)}
            stroke={PHYSICS_COLORS.referencePoint}
            strokeWidth={1}
            strokeDasharray='3,3'
          />
          <line
            x1={svgXD}
            y1={toSvgY(F_max)}
            x2={svgXD}
            y2={toSvgY(-F_max)}
            stroke={PHYSICS_COLORS.heatLoss}
            strokeWidth={1}
            strokeDasharray='3,3'
          />
        </g>

        <g fontSize={font(8)} fontWeight='bold' textAnchor='middle' opacity={0.65}>
          {mode === 0 && (
            <text x={svgXA + 6} y={toSvgY(F_max) + 10} fill={CANVAS_COLORS.labelTextLight}>
              A
            </text>
          )}
          {mode === 0 && (
            <text x={svgXB} y={toSvgY(F_max) + 10} fill={CANVAS_COLORS.labelTextLight}>
              B
            </text>
          )}
          <text x={svgXC} y={toSvgY(F_max) + 10} fill={PHYSICS_COLORS.referencePoint}>
            C
          </text>
          <text x={svgXD - 6} y={toSvgY(F_max) + 10} fill={PHYSICS_COLORS.heatLoss}>
            D
          </text>
        </g>

        <text
          x={20}
          y={toSvgY(F_max * 0.5)}
          fontSize={font(7.5)}
          fill={PHYSICS_COLORS.gravity}
          fontWeight='semibold'
          textAnchor='start'
        >
          {leftLabel}
        </text>
        <text
          x={20}
          y={toSvgY(-F_max * 0.5)}
          fontSize={font(7.5)}
          fill={PHYSICS_COLORS.acceleration}
          fontWeight='semibold'
          textAnchor='start'
        >
          {rightLabel}
        </text>

        <path d={forcePath} fill='none' stroke={PHYSICS_COLORS.forceNet} strokeWidth={2} />
        {toSvgY2 && (
          <path d={vPath} fill='none' stroke={PHYSICS_COLORS.velocity} strokeWidth={1.8} />
        )}

        {showCursor && (
          <>
            <line
              x1={x_current}
              y1={toSvgY(F_max)}
              x2={x_current}
              y2={toSvgY(-F_max)}
              stroke={CANVAS_COLORS.trackHistory}
              strokeWidth={1}
              strokeDasharray='2,2'
              opacity={0.8}
            />
            <circle
              cx={x_current}
              cy={y_current}
              r={4}
              fill={PHYSICS_COLORS.forceNet}
              stroke='white'
              strokeWidth={1}
            />
            <text
              x={x_current}
              y={y_current - 7}
              fontSize={font(8)}
              fill={PHYSICS_COLORS.forceNet}
              fontWeight='bold'
              textAnchor='middle'
            >
              {`F合: ${state.F_net.toFixed(1)}N`}
            </text>

            {toSvgY2 && (
              <>
                <circle
                  cx={x_current}
                  cy={toSvgY2(state.v)}
                  r={4}
                  fill={PHYSICS_COLORS.velocity}
                  stroke='white'
                  strokeWidth={1}
                />
                <text
                  x={x_current}
                  y={toSvgY2(state.v)}
                  dy='11'
                  fontSize={font(8)}
                  fill={PHYSICS_COLORS.velocity}
                  fontWeight='bold'
                  textAnchor='middle'
                >
                  {`v: ${state.v.toFixed(1)}m/s`}
                </text>
              </>
            )}
          </>
        )}
      </g>
    );
  }

  const y_current = toSvgY(-state.x);

  const y_A_local = toSvgY(mode === 1 ? 0 : yPhysMax);
  const y_B_local = toSvgY(0);
  const y_D_local = toSvgY(-xD_phys);

  const F_A = m * g;
  const F_B = m * g;
  const F_D = m * g - k * xD_phys;

  let forcePath = '';
  if (mode === 0) {
    forcePath = `M ${toSvgX(F_A).toFixed(1)} ${y_A_local.toFixed(1)} L ${toSvgX(F_B).toFixed(1)} ${y_B_local.toFixed(1)} L ${toSvgX(F_D).toFixed(1)} ${y_D_local.toFixed(1)}`;
  } else {
    forcePath = `M ${toSvgX(F_B).toFixed(1)} ${y_B_local.toFixed(1)} L ${toSvgX(F_D).toFixed(1)} ${y_D_local.toFixed(1)}`;
  }

  return (
    <g>
      <text
        x={toSvgX(-F_max * 0.45)}
        y={48}
        fontSize={font(7.5)}
        fill={PHYSICS_COLORS.acceleration}
        fontWeight='semibold'
        textAnchor='middle'
      >
        {leftLabel}
      </text>
      <text
        x={toSvgX(F_max * 0.45)}
        y={48}
        fontSize={font(7.5)}
        fill={PHYSICS_COLORS.gravity}
        fontWeight='semibold'
        textAnchor='middle'
      >
        {rightLabel}
      </text>

      <path d={forcePath} fill='none' stroke={PHYSICS_COLORS.forceNet} strokeWidth={2} />

      <circle
        cx={toSvgX(state.F_net)}
        cy={y_current}
        r={4}
        fill={PHYSICS_COLORS.forceNet}
        stroke='white'
        strokeWidth={1}
      />

      <text
        x={toSvgX(state.F_net)}
        y={y_current - 7}
        fontSize={font(8)}
        fill={PHYSICS_COLORS.forceNet}
        fontWeight='bold'
        textAnchor='middle'
      >
        {`F合: ${state.F_net.toFixed(1)}N`}
      </text>
    </g>
  );
}
