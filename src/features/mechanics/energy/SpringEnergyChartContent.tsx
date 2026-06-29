import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics';
import { useChartContext } from '@/components/Chart';
import { getVSStateAtTime } from '@/physics/verticalSpring';

export function SpringEnergyChartContent({
  m,
  k,
  h,
  xD_phys,
  g,
  state,
  mode,
  viewMode,
  E_max,
  font = (n: number) => n,
}: {
  m: number;
  k: number;
  h: number;
  xD_phys: number;
  g: number;
  state: ReturnType<typeof getVSStateAtTime>;
  mode: number;
  viewMode: 'y-E' | 'E-x';
  E_max: number;
  font?: (base: number) => number;
}) {
  const ctx = useChartContext();
  if (!ctx) return null;
  const { toSvgX, toSvgY } = ctx;

  const pointsCount = 80;

  if (viewMode === 'E-x') {
    const x_max_phys = mode === 1 ? xD_phys : h + xD_phys;
    const dx = x_max_phys / (pointsCount - 1);
    const epPoints: string[] = [];
    const epePoints: string[] = [];
    const ekPoints: string[] = [];

    for (let i = 0; i < pointsCount; i++) {
      const curX = i * dx;
      let ep = 0;
      let epe = 0;
      if (mode === 1) {
        ep = m * g * (xD_phys - curX);
        epe = 0.5 * k * curX * curX;
      } else {
        ep = m * g * (h + xD_phys - curX);
        if (curX <= h) {
          epe = 0;
        } else {
          const compressX = curX - h;
          epe = 0.5 * k * compressX * compressX;
        }
      }
      const ek = Math.max(0, state.Etot - ep - epe);

      epPoints.push(`${toSvgX(curX).toFixed(1)},${toSvgY(ep).toFixed(1)}`);
      epePoints.push(`${toSvgX(curX).toFixed(1)},${toSvgY(epe).toFixed(1)}`);
      ekPoints.push(`${toSvgX(curX).toFixed(1)},${toSvgY(ek).toFixed(1)}`);
    }

    const epPath = `M ${epPoints.join(' L ')}`;
    const epePath = `M ${epePoints.join(' L ')}`;
    const ekPath = `M ${ekPoints.join(' L ')}`;

    const cursorX = mode === 0 ? state.x + h : state.x;
    const showCursor = cursorX >= -0.005;
    const clampedX = Math.max(0, cursorX);
    const x_cursor = toSvgX(clampedX);

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
              y1={toSvgY(E_max)}
              x2={svgXB}
              y2={toSvgY(0)}
              stroke={CANVAS_COLORS.axis}
              strokeWidth={1}
              strokeDasharray='3,3'
            />
          )}
          <line
            x1={svgXC}
            y1={toSvgY(E_max)}
            x2={svgXC}
            y2={toSvgY(0)}
            stroke={PHYSICS_COLORS.referencePoint}
            strokeWidth={1}
            strokeDasharray='3,3'
          />
          <line
            x1={svgXD}
            y1={toSvgY(E_max)}
            x2={svgXD}
            y2={toSvgY(0)}
            stroke={PHYSICS_COLORS.heatLoss}
            strokeWidth={1}
            strokeDasharray='3,3'
          />
        </g>

        <g fontSize={font(8)} fontWeight='bold' textAnchor='middle' opacity={0.65}>
          {mode === 0 && (
            <text x={svgXA + 6} y={toSvgY(E_max) + 10} fill={CANVAS_COLORS.labelTextLight}>
              A
            </text>
          )}
          {mode === 0 && (
            <text x={svgXB} y={toSvgY(E_max) + 10} fill={CANVAS_COLORS.labelTextLight}>
              B
            </text>
          )}
          <text x={svgXC} y={toSvgY(E_max) + 10} fill={PHYSICS_COLORS.referencePoint}>
            C
          </text>
          <text x={svgXD - 6} y={toSvgY(E_max) + 10} fill={PHYSICS_COLORS.heatLoss}>
            D
          </text>
        </g>

        <path d={epPath} fill='none' stroke={PHYSICS_COLORS.potentialGravity} strokeWidth={1.8} />
        <path d={epePath} fill='none' stroke={PHYSICS_COLORS.potentialElastic} strokeWidth={1.8} />
        <path d={ekPath} fill='none' stroke={PHYSICS_COLORS.kineticEnergy} strokeWidth={2} />
        <line
          x1={toSvgX(0)}
          y1={toSvgY(state.Etot)}
          x2={toSvgX(x_max_phys)}
          y2={toSvgY(state.Etot)}
          stroke={PHYSICS_COLORS.mechanicalEnergy}
          strokeWidth={1.8}
        />

        {showCursor && (
          <>
            <line
              x1={x_cursor}
              y1={toSvgY(E_max)}
              x2={x_cursor}
              y2={toSvgY(0)}
              stroke={CANVAS_COLORS.trackHistory}
              strokeWidth={1}
              strokeDasharray='2,2'
              opacity={0.85}
            />
            <polygon
              points={`${x_cursor - 4.5},${toSvgY(0)} ${x_cursor},${toSvgY(0) - 6} ${x_cursor + 4.5},${toSvgY(0)}`}
              fill={CANVAS_COLORS.labelTextLight}
            />

            <circle
              cx={x_cursor}
              cy={toSvgY(state.Ep)}
              r={4}
              fill={PHYSICS_COLORS.potentialGravity}
              stroke='white'
              strokeWidth={1}
            />
            <circle
              cx={x_cursor}
              cy={toSvgY(state.Epe)}
              r={4}
              fill={PHYSICS_COLORS.potentialElastic}
              stroke='white'
              strokeWidth={1}
            />
            <circle
              cx={x_cursor}
              cy={toSvgY(state.Ek)}
              r={4}
              fill={PHYSICS_COLORS.kineticEnergy}
              stroke='white'
              strokeWidth={1}
            />
            <circle
              cx={x_cursor}
              cy={toSvgY(state.Etot)}
              r={4}
              fill={PHYSICS_COLORS.mechanicalEnergy}
              stroke='white'
              strokeWidth={1}
            />

            <text
              x={x_cursor}
              y={toSvgY(state.Ep) - 7}
              fontSize={font(8)}
              fill={PHYSICS_COLORS.potentialGravity}
              fontWeight='bold'
              textAnchor='middle'
            >
              {`Ep: ${state.Ep.toFixed(1)}J`}
            </text>
            <text
              x={x_cursor}
              y={toSvgY(state.Epe)}
              dy='11'
              fontSize={font(8)}
              fill={PHYSICS_COLORS.potentialElastic}
              fontWeight='bold'
              textAnchor='middle'
            >
              {`E弹: ${state.Epe.toFixed(1)}J`}
            </text>
            {state.Ek > 0.05 && (
              <text
                x={x_cursor}
                y={toSvgY(state.Ek)}
                dy='-7'
                fontSize={font(8)}
                fill={PHYSICS_COLORS.kineticEnergy}
                fontWeight='bold'
                textAnchor='middle'
              >
                {`Ek: ${state.Ek.toFixed(1)}J`}
              </text>
            )}
            <text
              x={x_cursor + 6}
              y={toSvgY(state.Etot)}
              dy='3.2'
              fontSize={font(8)}
              fill={PHYSICS_COLORS.mechanicalEnergy}
              fontWeight='bold'
              textAnchor='start'
            >
              {`E总: ${state.Etot.toFixed(1)}J`}
            </text>
          </>
        )}
      </g>
    );
  }

  const epPts: string[] = [];
  const epePts: string[] = [];
  const ekPts: string[] = [];

  if (mode === 1) {
    const dy = -xD_phys / (pointsCount - 1);
    for (let i = 0; i < pointsCount; i++) {
      const curY_phys = -xD_phys + i * -dy;
      const curX = -curY_phys;
      const ep = m * g * (curY_phys + xD_phys);
      const epe = 0.5 * k * curX * curX;
      const ek = Math.max(0, state.Etot - ep - epe);
      const y_pixel = toSvgY(curY_phys);

      epPts.push(`${toSvgX(ep).toFixed(1)},${y_pixel.toFixed(1)}`);
      epePts.push(`${toSvgX(epe).toFixed(1)},${y_pixel.toFixed(1)}`);
      ekPts.push(`${toSvgX(ek).toFixed(1)},${y_pixel.toFixed(1)}`);
    }
  } else {
    const p1Count = 40;
    const dy1 = xD_phys / (p1Count - 1);
    for (let i = 0; i < p1Count; i++) {
      const curY_phys = -xD_phys + i * dy1;
      const curX = -curY_phys;
      const ep = m * g * (curY_phys + xD_phys);
      const epe = 0.5 * k * curX * curX;
      const ek = Math.max(0, state.Etot - ep - epe);
      const y_pixel = toSvgY(curY_phys);

      epPts.push(`${toSvgX(ep).toFixed(1)},${y_pixel.toFixed(1)}`);
      epePts.push(`${toSvgX(epe).toFixed(1)},${y_pixel.toFixed(1)}`);
      ekPts.push(`${toSvgX(ek).toFixed(1)},${y_pixel.toFixed(1)}`);
    }

    const p2Count = 40;
    const dy2 = h / (p2Count - 1);
    for (let i = 0; i < p2Count; i++) {
      const curY_phys = 0 + i * dy2;
      const ep = m * g * (curY_phys + xD_phys);
      const epe = 0;
      const ek = Math.max(0, state.Etot - ep);
      const y_pixel = toSvgY(curY_phys);

      epPts.push(`${toSvgX(ep).toFixed(1)},${y_pixel.toFixed(1)}`);
      epePts.push(`${toSvgX(epe).toFixed(1)},${y_pixel.toFixed(1)}`);
      ekPts.push(`${toSvgX(ek).toFixed(1)},${y_pixel.toFixed(1)}`);
    }
  }

  const epPath = `M ${epPts.join(' L ')}`;
  const epePath = `M ${epePts.join(' L ')}`;
  const ekPath = `M ${ekPts.join(' L ')}`;

  const y_current = toSvgY(-state.x);

  return (
    <g>
      <path d={epPath} fill='none' stroke={PHYSICS_COLORS.potentialGravity} strokeWidth={1.8} />
      <path d={epePath} fill='none' stroke={PHYSICS_COLORS.potentialElastic} strokeWidth={1.8} />
      <path d={ekPath} fill='none' stroke={PHYSICS_COLORS.kineticEnergy} strokeWidth={2} />
      <line
        x1={toSvgX(state.Etot)}
        y1={toSvgY(mode === 1 ? 0 : h)}
        x2={toSvgX(state.Etot)}
        y2={toSvgY(-xD_phys)}
        stroke={PHYSICS_COLORS.mechanicalEnergy}
        strokeWidth={1.8}
      />

      <circle
        cx={toSvgX(state.Ep)}
        cy={y_current}
        r={4}
        fill={PHYSICS_COLORS.potentialGravity}
        stroke='white'
        strokeWidth={1}
      />
      <circle
        cx={toSvgX(state.Epe)}
        cy={y_current}
        r={4}
        fill={PHYSICS_COLORS.potentialElastic}
        stroke='white'
        strokeWidth={1}
      />
      <circle
        cx={toSvgX(state.Ek)}
        cy={y_current}
        r={4}
        fill={PHYSICS_COLORS.kineticEnergy}
        stroke='white'
        strokeWidth={1}
      />
      <circle
        cx={toSvgX(state.Etot)}
        cy={y_current}
        r={4}
        fill={PHYSICS_COLORS.mechanicalEnergy}
        stroke='white'
        strokeWidth={1}
      />

      <text
        x={toSvgX(state.Ep)}
        y={y_current - 7}
        fontSize={font(8)}
        fill={PHYSICS_COLORS.potentialGravity}
        fontWeight='bold'
        textAnchor='middle'
      >
        {`Ep: ${state.Ep.toFixed(1)}J`}
      </text>
      {state.x > 0.005 && (
        <text
          x={toSvgX(state.Epe)}
          y={y_current + 11}
          fontSize={font(8)}
          fill={PHYSICS_COLORS.potentialElastic}
          fontWeight='bold'
          textAnchor='middle'
        >
          {`E弹: ${state.Epe.toFixed(1)}J`}
        </text>
      )}
      {state.Ek > 0.05 && (
        <text
          x={toSvgX(state.Ek)}
          y={y_current - 7}
          fontSize={font(8)}
          fill={PHYSICS_COLORS.kineticEnergy}
          fontWeight='bold'
          textAnchor='middle'
        >
          {`Ek: ${state.Ek.toFixed(1)}J`}
        </text>
      )}
      <text
        x={toSvgX(state.Etot) + 6}
        y={y_current + 3}
        fontSize={font(8)}
        fill={PHYSICS_COLORS.mechanicalEnergy}
        fontWeight='bold'
        textAnchor='start'
      >
        {`E总: ${state.Etot.toFixed(1)}J`}
      </text>
    </g>
  );
}
