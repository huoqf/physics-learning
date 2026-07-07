import { useState, useMemo, useRef, useEffect } from 'react';
import { useAnimationStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics';
import { Ball } from '@/components/Physics/Ball';
import { Spring } from '@/components/UI/Spring';
import { PhysicsGround } from '@/components/Physics/PhysicsGround';
import { VectorArrow } from '@/components/Physics/VectorArrow';
import { createSceneScaleFromViewport } from '@/scene/SceneScale';
import { precomputeVerticalSpringTrajectory, getVSStateAtTime } from '@/physics/verticalSpring';
import { BasePhysicsChart } from '@/components/Chart';
import { GRAVITY } from '@/physics/constants';
import { useCanvasSize, clientToContainerPoint } from '@/utils';
import { SpringEnergyChartContent } from './SpringEnergyChartContent';
import { SpringForceChartContent } from './SpringForceChartContent';

// 设计空间常量（基准 700×650，高度按容器宽高比动态缩放）
const DW = 700;
const DH_BASE = 650;

export default function SpringCompositeAnimation() {
  const { params, time, isPlaying, setIsPlaying, setTime } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
      setTime: s.setTime,
    }))
  );

  const svgRef = useRef<SVGSVGElement>(null);
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 650 });
  const { font } = canvasSize;

  // 动态设计高度：保证 vp.scale 均匀填满容器、零边距
  const s = canvasSize.width / DW;
  const DH = canvasSize.height / s;

  // ── 物理参数 ──
  const m = params.m ?? 0.5;
  const k = params.k ?? 50;
  const h = params.h ?? 0.8;
  const g = GRAVITY;
  const mode = params.mode ?? 0;
  const showVectors = params.showVectors !== 0;
  const autoPause = params.autoPause !== 0;
  const viewMode: 'y-E' | 'E-x' = (params.viewMode ?? 1) === 0 ? 'y-E' : 'E-x';

  // ── Y 坐标缩放因子（650 → DH） ──
  const yF = DH / DH_BASE;

  // ── 预计算轨迹 ──
  const trajectory = useMemo(() => {
    return precomputeVerticalSpringTrajectory(m, k, h, g, 15, 0.02, mode);
  }, [m, k, h, g, mode]);

  const state = useMemo(() => getVSStateAtTime(trajectory, time), [trajectory, time]);

  const xD_phys = useMemo(() => {
    if (trajectory.length === 0) return 0.5;
    return Math.max(...trajectory.map((pt) => pt.x));
  }, [trajectory]);

  // ── 图表 / 动画区 Y 映射 ──
  const yPhysMin = -xD_phys;
  const yPhysMax = mode === 1 ? 0 : h;
  const chartHeight = 520 * yF;
  const marginTop = 22 * yF;
  const marginBottom = 31 * yF;
  const plotH = chartHeight - marginTop - marginBottom;

  const toLocalSvgY = (physY: number) => {
    const ratio = (physY - yPhysMin) / (yPhysMax - yPhysMin);
    return marginTop + plotH - ratio * plotH;
  };

  // ── 动画区坐标（设计空间） ──
  const centerX = 116;
  const y_B = 30 * yF + toLocalSvgY(0);
  const y_A = 30 * yF + toLocalSvgY(mode === 1 ? 0 : h);
  const xC_phys = (m * g) / k;
  const y_C = 30 * yF + toLocalSvgY(-xC_phys);
  const y_D = 30 * yF + toLocalSvgY(-xD_phys);
  const ballY = 30 * yF + toLocalSvgY(-state.x);
  const y_ground = 570 * yF;

  let springTopY: number;
  let springBottomY: number;
  if (mode === 1) {
    springTopY = 20 * yF;
    springBottomY = ballY - 14;
  } else {
    springTopY = state.x < 0 ? y_B : ballY + 14;
    springBottomY = y_ground;
  }

  // ── 自动暂停 ──
  const omega = Math.sqrt(k / m);
  let T: number;
  let t_cross: number;
  if (mode === 1) {
    T = (2 * Math.PI) / omega;
    t_cross = Math.PI / (2 * omega);
  } else {
    const t0 = Math.sqrt((2 * h) / g);
    const v0 = g * t0;
    const phi = Math.PI + Math.atan(v0 / (omega * xC_phys));
    const tSpring = (2 * (2 * Math.PI - phi)) / omega;
    T = 2 * t0 + tSpring;
    t_cross = t0 + (1.5 * Math.PI - phi) / omega;
  }

  // ── 矢量归一化 ──
  const vMax = useMemo(() => {
    if (trajectory.length === 0) return 1;
    return Math.max(1e-6, ...trajectory.map((pt) => Math.abs(pt.v)));
  }, [trajectory]);

  const springSceneScale = useMemo(
    () =>
      createSceneScaleFromViewport(
        { visibleX: 0, visibleY: 0, visibleW: DW, visibleH: DH, centerX: DW / 2, centerY: DH / 2 },
        'transform',
        {
          designWidth: 230,
          designHeight: chartHeight,
          refMagnitudes: {
            gravity: m * g,
            elasticForce: k * xD_phys,
            velocity: Math.max(vMax, 1),
            acceleration: g * 2,
          },
        }
      ),
    [m, g, k, xD_phys, vMax, chartHeight, DH]
  );

  const lastTimeRef = useRef(time);
  const lastCrossTimeRef = useRef(-1);
  const [showPauseTip, setShowPauseTip] = useState(false);

  useEffect(() => {
    if (!autoPause || !isPlaying) { lastTimeRef.current = time; return; }
    const Tp = T;
    const cS = Math.floor(lastTimeRef.current / Tp);
    const cE = Math.floor(time / Tp);
    for (let c = cS; c <= cE; c++) {
      const tc = c * Tp + t_cross;
      if (lastTimeRef.current < tc && time >= tc && lastCrossTimeRef.current !== tc) {
        lastCrossTimeRef.current = tc;
        setTime(tc);
        setIsPlaying(false);
        setShowPauseTip(true);
        break;
      }
    }
    lastTimeRef.current = time;
  }, [time, autoPause, isPlaying, T, t_cross, setTime, setIsPlaying]);

  useEffect(() => { if (isPlaying) setShowPauseTip(false); }, [isPlaying]);

  // ── 拖拽 ──
  const [isDragging, setIsDragging] = useState(false);

  const getDesignCoords = (e: React.MouseEvent<SVGSVGElement> | MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const { x: px, y: py } = clientToContainerPoint(e.clientX, e.clientY, rect);
    return { x: px / s, y: py / s };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPlaying) return;
    const { x, y } = getDesignCoords(e);
    if (Math.hypot(x - centerX, y - ballY) <= 25) {
      setIsDragging(true);
      setShowPauseTip(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const { y } = getDesignCoords(e);
    const local_y = y - 30 * yF;
    const clamped = Math.min(Math.max(local_y, marginTop), marginTop + plotH);
    const ratio = (marginTop + plotH - clamped) / plotH;
    const x_drag = xD_phys - ratio * ((mode === 1 ? 0 : h) + xD_phys);
    const pts = trajectory.filter((pt) => pt.v >= -0.02);
    const search = pts.length > 0 ? pts : trajectory;
    let best = search[0];
    let minD = Infinity;
    search.forEach((pt) => { const d = Math.abs(pt.x - x_drag); if (d < minD) { minD = d; best = pt; } });
    if (best) setTime(best.t);
  };

  const handleMouseUpOrLeave = () => { if (isDragging) setIsDragging(false); };

  const E_max = state.Etot * 1.15;
  const F_max = k * xD_phys * 1.15;
  const v_max = vMax * 1.15;
  const x_max_phys = mode === 1 ? xD_phys : h + xD_phys;

  // ── 三列等宽分割（设计空间 X） ──
  const colW = DW / 3; // ≈233.3
  const chart1X = colW;
  const chart2X = colW * 2;
  const chartFixedW = Math.floor(colW) - 4; // 留 4px 间隙
  const animLineX2 = colW - 10; // 动画区参考线右端

  // vp.transform: translate(0,0) scale(s) — 填满容器、零边距
  const vpTransform = `translate(0 0) scale(${s})`;

  return (
    <div ref={containerRef} className='relative w-full h-full bg-white rounded-xl shadow-inner overflow-hidden select-none'>
      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className='block'
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{ cursor: isDragging ? 'grabbing' : !isPlaying ? 'grab' : 'default' }}
      >
        <defs>
          <clipPath id='anim-clip'>
            <rect x={0} y={0} width={colW} height={DH} />
          </clipPath>
        </defs>

        <g transform={vpTransform}>
          {/* ═══ 左列：物理动画（0 ~ colW） ═══ */}
          <g clipPath='url(#anim-clip)'>
            {/* 提示 */}
            {!isPlaying && !isDragging && (
              <text x={35} y={20} fontSize={font(9.5)} fill={CANVAS_COLORS.labelTextLight} fontWeight='semibold'>
                {mode === 1 ? '💡 挂球扫查：按住小球拖拽' : '💡 下落扫查：按住小球拖拽'}
              </text>
            )}

            {/* 参考虚线 */}
            <g opacity={0.65}>
              {mode === 0 && (
                <line x1={30} y1={y_A} x2={animLineX2} y2={y_A} stroke={CANVAS_COLORS.axis} strokeWidth={1} strokeDasharray='3,3' />
              )}
              <line x1={30} y1={y_B} x2={animLineX2} y2={y_B} stroke={CANVAS_COLORS.axis} strokeWidth={1.2} strokeDasharray='3,3' />
              <line x1={30} y1={y_C} x2={animLineX2} y2={y_C} stroke={PHYSICS_COLORS.referencePoint} strokeWidth={1.2} strokeDasharray='3,3' />
              <line x1={30} y1={y_D} x2={animLineX2} y2={y_D} stroke={PHYSICS_COLORS.heatLoss} strokeWidth={1.2} strokeDasharray='3,3' />
            </g>

            {/* 字母徽章 */}
            <g fontSize={font(11)} fontWeight='bold' textAnchor='middle'>
              {mode === 0 && (
                <g transform={`translate(18, ${y_A + 3})`}>
                  <circle r={8} fill={CANVAS_COLORS.axis} fillOpacity={0.2} stroke={CANVAS_COLORS.axis} strokeWidth={1} />
                  <text fill={CANVAS_COLORS.labelTextLight} fontSize={font(9)} dy='0.31em'>A</text>
                </g>
              )}
              <g transform={`translate(18, ${y_B + 3})`}>
                <circle r={8} fill={CANVAS_COLORS.axis} fillOpacity={0.2} stroke={CANVAS_COLORS.axis} strokeWidth={1.2} />
                <text fill={CANVAS_COLORS.labelTextLight} fontSize={font(9)} dy='0.31em'>B</text>
              </g>
              <g transform={`translate(18, ${y_C + 3})`}>
                <circle r={8} fill={PHYSICS_COLORS.referencePoint} fillOpacity={0.15} stroke={PHYSICS_COLORS.referencePoint} strokeWidth={1.2} />
                <text fill={PHYSICS_COLORS.referencePoint} fontSize={font(9)} dy='0.31em'>C</text>
              </g>
              <g transform={`translate(18, ${y_D + 3})`}>
                <circle r={8} fill={PHYSICS_COLORS.heatLoss} fillOpacity={0.15} stroke={PHYSICS_COLORS.heatLoss} strokeWidth={1.2} />
                <text fill={PHYSICS_COLORS.heatLoss} fontSize={font(9)} dy='0.31em'>D</text>
              </g>
            </g>

            {/* 物理元素 */}
            {mode === 1 ? (
              <PhysicsGround x={centerX - 40} y={y_ground - 30} width={80} type='bracket' appearance={{ color: CANVAS_COLORS.labelTextLight }} />
            ) : (
              <>
                <PhysicsGround x={centerX - 40} y={y_ground} width={80} type='bracket' appearance={{ color: CANVAS_COLORS.labelTextLight }} />
                <PhysicsGround x={centerX - 80} y={y_ground + 8} width={160} type='ground' appearance={{ color: CANVAS_COLORS.trackHistory }} />
              </>
            )}

            <Spring x1={centerX} y1={springTopY} x2={centerX} y2={springBottomY} coils={12} radius={11} />
            <Ball cx={centerX} cy={ballY} r={14} type='oscillatorMetal' stroke={SCENE_COLORS.sphere.oscillatorMetal.stroke} strokeWidth={1.5} />

            {showVectors && (
              <g>
                <VectorArrow origin={{ x: centerX, y: -ballY }} vector={{ x: 0, y: -m * g }} type='gravity' color={PHYSICS_COLORS.gravity} sceneScale={springSceneScale} label='G' />
                {mode === 1
                  ? state.x > 0 && <VectorArrow origin={{ x: centerX, y: -(ballY - 14) }} vector={{ x: 0, y: state.F_spring }} type='elasticForce' color={PHYSICS_COLORS.elasticForce} sceneScale={springSceneScale} label='F弹' />
                  : state.x >= 0 && <VectorArrow origin={{ x: centerX, y: -(ballY + 14) }} vector={{ x: 0, y: state.F_spring }} type='elasticForce' color={PHYSICS_COLORS.elasticForce} sceneScale={springSceneScale} label='F弹' />
                }
                {Math.abs(state.v) > 0.05 && <VectorArrow origin={{ x: centerX - 23, y: -ballY }} vector={{ x: 0, y: -state.v }} type='velocity' color={PHYSICS_COLORS.velocity} sceneScale={springSceneScale} label='v' />}
                {Math.abs(state.a) > 0.05 && <VectorArrow origin={{ x: centerX + 23, y: -ballY }} vector={{ x: 0, y: -state.a }} type='acceleration' color={PHYSICS_COLORS.acceleration} sceneScale={springSceneScale} label='a' />}
              </g>
            )}

            {/* 小球光标 */}
            <line x1={30} y1={ballY} x2={animLineX2} y2={ballY} stroke={CANVAS_COLORS.trackHistory} strokeWidth={1} strokeDasharray='2,2' opacity={0.8} />
            <polygon points={`30,${ballY - 4.5} 36,${ballY} 30,${ballY + 4.5}`} fill={CANVAS_COLORS.labelTextLight} />
          </g>

          {/* ── 分隔线 ── */}
          <line x1={colW} y1={0} x2={colW} y2={DH} stroke='#e5e7eb' strokeWidth={1} />
          <line x1={chart2X} y1={0} x2={chart2X} y2={DH} stroke='#e5e7eb' strokeWidth={1} />

          {/* ═══ 中列：能量图表 ═══ */}
          <g transform={`translate(${chart1X}, 0)`}>
            <BasePhysicsChart
              xDomain={viewMode === 'E-x' ? [0, x_max_phys] : [0, E_max]}
              yDomain={viewMode === 'E-x' ? [0, E_max] : [-xD_phys, mode === 1 ? 0 : h]}
              xLabel={viewMode === 'E-x' ? 'x (m)' : 'E (J)'}
              yLabel={viewMode === 'E-x' ? 'E (J)' : 'y (m)'}
              title={viewMode === 'E-x' ? '能量-位移 (E-x)' : '能量-高度 (E-y)'}
              fixedSize={{ width: chartFixedW, height: Math.floor(DH) }}
              showGrid={false}
              gridCount={{ x: 4, y: 5 }}
              formatX={viewMode === 'E-x' ? (v: number) => `${v.toFixed(1)}m` : (v: number) => `${v.toFixed(0)}J`}
              formatY={viewMode === 'E-x' ? (v: number) => `${v.toFixed(0)}J` : () => ''}
            >
              <SpringEnergyChartContent m={m} k={k} h={mode === 1 ? 0 : h} xD_phys={xD_phys} g={g} state={state} mode={mode} viewMode={viewMode} E_max={E_max} font={font} />
            </BasePhysicsChart>
          </g>

          {/* ═══ 右列：合外力图表 ═══ */}
          <g transform={`translate(${chart2X}, 0)`}>
            <BasePhysicsChart
              xDomain={viewMode === 'E-x' ? [0, x_max_phys] : [-F_max, F_max]}
              yDomain={viewMode === 'E-x' ? [-F_max, F_max] : [-xD_phys, mode === 1 ? 0 : h]}
              yDomain2={viewMode === 'E-x' ? [-v_max, v_max] : undefined}
              xLabel={viewMode === 'E-x' ? 'x (m)' : 'F合 (N)'}
              yLabel={viewMode === 'E-x' ? 'F合 (N)' : ''}
              yLabel2={viewMode === 'E-x' ? 'v (m/s)' : undefined}
              title={viewMode === 'E-x' ? '合外力/速度-位移' : '合外力-高度'}
              fixedSize={{ width: chartFixedW, height: Math.floor(DH) }}
              showGrid={false}
              gridCount={{ x: 4, y: 5 }}
              formatX={viewMode === 'E-x' ? (v: number) => `${v.toFixed(1)}m` : (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}N`}
              formatY={viewMode === 'E-x' ? (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}N` : () => ''}
              formatY2={viewMode === 'E-x' ? (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}` : undefined}
              yBaseline={0}
              yBaseline2={0}
            >
              <SpringForceChartContent m={m} k={k} h={mode === 1 ? 0 : h} xD_phys={xD_phys} g={g} state={state} mode={mode} yPhysMax={mode === 1 ? 0 : h} viewMode={viewMode} F_max={F_max} font={font} />
            </BasePhysicsChart>
          </g>
        </g>
      </svg>

      {/* 自动暂停卡片 */}
      {showPauseTip && (
        <div className='absolute top-4 left-1/2 -translate-x-1/2 alert-card-warning shadow-xl flex items-start gap-2.5 max-w-[85%] animate-in fade-in slide-in-from-top-2 duration-300 z-50'>
          <span className='shrink-0 text-amber-500 font-bold text-sm leading-none'>💡</span>
          <div className='leading-normal'>
            <strong>已在平衡位置（C点）自动定格：</strong>重力等于弹力，合外力为零，速度与动能达到最大值。点击播放继续。
          </div>
          <button onClick={() => setShowPauseTip(false)} className='shrink-0 text-amber-400 hover:text-amber-600 ml-1 font-bold text-base leading-none transition-colors'>×</button>
        </div>
      )}
    </div>
  );
}
