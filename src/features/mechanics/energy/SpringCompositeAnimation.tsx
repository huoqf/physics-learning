import { useState, useMemo, useRef, useEffect } from 'react';
import { useAnimationStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics';
import { Ball } from '@/components/Physics/Ball';
import { Spring } from '@/components/UI/Spring';
import { PhysicsGround } from '@/components/Physics/PhysicsGround';
import { VectorArrow } from '@/components/Physics/VectorArrow';
import { createSceneScale } from '@/scene/SceneScale';
import type { SceneConfig } from '@/scene/SceneConfig';
import { precomputeVerticalSpringTrajectory, getVSStateAtTime } from '@/physics/verticalSpring';
import { BasePhysicsChart } from '@/components/Chart';
import { SegmentedControl } from '@/components/UI';
import { GRAVITY } from '@/physics/constants';
import { useCanvasSize, useViewport } from '@/utils';
import { CANVAS_PRESETS } from '@/theme/spacing';
import { SpringEnergyChartContent } from './SpringEnergyChartContent';
import { SpringForceChartContent } from './SpringForceChartContent';

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

  // 1. 画布基准尺寸 (700 x 420)
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.extraWide);
  const { font } = canvasSize;

  const DESIGN_WIDTH = 700;
  const DESIGN_HEIGHT = 420;

  const vp = useViewport(canvasSize, {
    designWidth: DESIGN_WIDTH,
    designHeight: DESIGN_HEIGHT,
  });

  // 图像视图模式状态：'y-E' (直观对齐) | 'E-x' (高考标准)
  const [viewMode, setViewMode] = useState<'y-E' | 'E-x'>('y-E');

  // 2. 物理参数提取
  const m = params.m ?? 0.5;
  const k = params.k ?? 50;
  const h = params.h ?? 0.8;
  const g = GRAVITY;
  const mode = params.mode ?? 0;

  const showVectors = params.showVectors !== 0;
  const autoPause = params.autoPause !== 0;

  // 3. 预计算轨迹
  const trajectory = useMemo(() => {
    return precomputeVerticalSpringTrajectory(m, k, h, g, 15, 0.02, mode);
  }, [m, k, h, g, mode]);

  // 当前时刻插值状态
  const state = useMemo(() => {
    return getVSStateAtTime(trajectory, time);
  }, [trajectory, time]);

  // 动态分析轨迹中的最低点物理位移 (即 x 轴最大值，用于三图 Y 轴物理量 1:1 精确映射)
  const xD_phys = useMemo(() => {
    if (trajectory.length === 0) return 0.5;
    return Math.max(...trajectory.map((pt) => pt.x));
  }, [trajectory]);

  // 4. 三图高度 1:1 精确同步映射推导 (总高度 420, 图表高度 350)
  const yPhysMin = -xD_phys; // 最小值（最低点在下，物理高度负值）
  const yPhysMax = mode === 1 ? 0 : h; // 最大值（释放点在上，物理高度正值）
  const chartHeight = 350;
  const marginTop = 25;
  const marginBottom = 35;
  const plotH = chartHeight - marginTop - marginBottom; // 290px

  // 物理坐标 (向上为正) 转换到图表局部的 Y 像素
  const toLocalSvgY = (physY: number) => {
    const ratio = (physY - yPhysMin) / (yPhysMax - yPhysMin);
    return marginTop + plotH - ratio * plotH;
  };

  const centerX = 85;
  // 变换原点至平移容器 Y=25 对齐
  const y_B = 25 + toLocalSvgY(0);
  const y_A = 25 + toLocalSvgY(mode === 1 ? 0 : h);
  const xC_phys = (m * g) / k;
  const y_C = 25 + toLocalSvgY(-xC_phys);
  const y_D = 25 + toLocalSvgY(-xD_phys);
  const ballY = 25 + toLocalSvgY(-state.x);
  const y_ground = 380;

  // 弹簧在设计画布上的顶底端 Y 坐标计算
  let springTopY: number;
  let springBottomY: number;

  if (mode === 1) {
    springTopY = 20; // 顶部悬挂点（支架视觉位置）
    springBottomY = ballY - 14;
  } else {
    springTopY = state.x < 0 ? y_B : ballY + 14;
    springBottomY = y_ground;
  }

  // 5. 特征点平衡位置自动暂停逻辑
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

  // 矢量归一化 SceneScale（refMagnitudes 驱动箭头长度随状态变化）
  const vMax = mode === 1 ? xC_phys * omega : Math.sqrt(2 * g * (h + xC_phys));
  const springSceneConfig: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: 170, height: 350 },
    originX: 0,
    originY: 0,
    refMagnitudes: {
      gravity: m * g,
      elasticForce: k * xD_phys,
      velocity: Math.max(vMax, 1),
      acceleration: g * 2,
    },
  };
  const springSceneScale = createSceneScale(springSceneConfig);

  const lastTimeRef = useRef(time);
  const lastCrossTimeRef = useRef(-1);
  const [showPauseTip, setShowPauseTip] = useState(false);

  useEffect(() => {
    if (!autoPause || !isPlaying) {
      lastTimeRef.current = time;
      return;
    }

    const T_period = T;
    const cycleStart = Math.floor(lastTimeRef.current / T_period);
    const cycleEnd = Math.floor(time / T_period);

    for (let c = cycleStart; c <= cycleEnd; c++) {
      const t_cross_c = c * T_period + t_cross;
      if (
        lastTimeRef.current < t_cross_c &&
        time >= t_cross_c &&
        lastCrossTimeRef.current !== t_cross_c
      ) {
        lastCrossTimeRef.current = t_cross_c;
        setTime(t_cross_c);
        setIsPlaying(false);
        setShowPauseTip(true); // 自动定格气泡显示
        break;
      }
    }

    lastTimeRef.current = time;
  }, [time, autoPause, isPlaying, T, t_cross, setTime, setIsPlaying]);

  // 监听播放状态，播放时自动隐藏定格气泡
  useEffect(() => {
    if (isPlaying) {
      setShowPauseTip(false);
    }
  }, [isPlaying]);

  // 6. 静定态联动扫查交互拖拽反算
  const [isDragging, setIsDragging] = useState(false);

  const getSVGCoords = (e: React.MouseEvent<SVGSVGElement> | MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const containerX = e.clientX - rect.left;
    const containerY = e.clientY - rect.top;

    const x = (containerX - vp.tx) / vp.scale;
    const y = (containerY - vp.ty) / vp.scale;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPlaying) return;
    const { x, y } = getSVGCoords(e);
    const distToBall = Math.hypot(x - centerX, y - ballY);
    if (distToBall <= 25) {
      setIsDragging(true);
      setShowPauseTip(false); // 手动拖拽时关闭暂停提示
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const { y } = getSVGCoords(e);

    // 从设计像素坐标精准反算为物理位移
    const local_y = y - 25;
    const clampedLocalY = Math.min(Math.max(local_y, 25), 315);
    const ratio = (315 - clampedLocalY) / 290;
    const x_drag = xD_phys - ratio * ((mode === 1 ? 0 : h) + xD_phys);

    const fallingPoints = trajectory.filter((pt) => pt.v >= -0.02);
    const searchTarget = fallingPoints.length > 0 ? fallingPoints : trajectory;

    let bestPoint = searchTarget[0];
    let minDiff = Infinity;

    searchTarget.forEach((pt) => {
      const diff = Math.abs(pt.x - x_drag);
      if (diff < minDiff) {
        minDiff = diff;
        bestPoint = pt;
      }
    });

    if (bestPoint) {
      setTime(bestPoint.t);
    }
  };

  const handleMouseUpOrLeave = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const E_max = state.Etot * 1.15;
  const F_max = k * xD_phys * 1.15;
  const v_max = vMax * 1.15;
  const x_max_phys = mode === 1 ? xD_phys : h + xD_phys;

  return (
    <div
      ref={containerRef}
      className='relative w-full h-full flex items-center justify-center bg-white rounded-xl shadow-inner overflow-hidden select-none'
    >
      {/* ── 高考标准与直观对齐双态视图切换按钮 ── */}
      <div className='absolute top-4 right-4 z-30'>
        <SegmentedControl
          options={[
            { label: '直观对齐 (y - E)', value: 'y-E' },
            { label: '高考标准 (E - x)', value: 'E-x' },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as 'y-E' | 'E-x')}
        />
      </div>

      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className='bg-transparent overflow-hidden'
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{ cursor: isDragging ? 'grabbing' : !isPlaying ? 'grab' : 'default' }}
      >
        <g transform={vp.transform}>
          {!isPlaying && !isDragging && (
            <text
              x={35}
              y={20}
              fontSize={font(9.5)}
              fill={CANVAS_COLORS.labelTextLight}
              fontWeight='semibold'
              className='animate-pulse'
            >
              {mode === 1
                ? '💡 挂球扫查：在小球上按住并上下拖拽，联动扫查图线交点'
                : '💡 下落扫查：按住小球拖拽进行慢动作扫查；高度 h 可在左侧滑块修改'}
            </text>
          )}

          {/* ── 左侧物理动画高度特征参考虚线 (仅限左侧指示，防右侧污染) ── */}
          <g opacity={0.65}>
            {mode === 0 && (
              <line
                x1={30}
                y1={y_A}
                x2={viewMode === 'y-E' ? 645 : 105}
                y2={y_A}
                stroke={CANVAS_COLORS.axis}
                strokeWidth={1}
                strokeDasharray='3,3'
              />
            )}
            <line
              x1={30}
              y1={y_B}
              x2={viewMode === 'y-E' ? 645 : 105}
              y2={y_B}
              stroke={CANVAS_COLORS.axis}
              strokeWidth={1.2}
              strokeDasharray='3,3'
            />
            <line
              x1={30}
              y1={y_C}
              x2={viewMode === 'y-E' ? 645 : 105}
              y2={y_C}
              stroke={PHYSICS_COLORS.referencePoint}
              strokeWidth={1.2}
              strokeDasharray='3,3'
            />
            <line
              x1={30}
              y1={y_D}
              x2={viewMode === 'y-E' ? 645 : 105}
              y2={y_D}
              stroke={PHYSICS_COLORS.heatLoss}
              strokeWidth={1.2}
              strokeDasharray='3,3'
            />
          </g>

          {/* 左侧特征字母徽章 */}
          <g fontSize={11} fontWeight='bold' textAnchor='middle'>
            {mode === 0 && (
              <g transform={`translate(18, ${y_A + 3})`}>
                <circle
                  r={8}
                  fill={CANVAS_COLORS.axis}
                  fillOpacity={0.2}
                  stroke={CANVAS_COLORS.axis}
                  strokeWidth={1}
                />
                <text fill={CANVAS_COLORS.labelTextLight} fontSize={9} dy='0.31em'>
                  A
                </text>
              </g>
            )}
            <g transform={`translate(18, ${y_B + 3})`}>
              <circle
                r={8}
                fill={CANVAS_COLORS.axis}
                fillOpacity={0.2}
                stroke={CANVAS_COLORS.axis}
                strokeWidth={1.2}
              />
              <text fill={CANVAS_COLORS.labelTextLight} fontSize={9} dy='0.31em'>
                B
              </text>
            </g>
            <g transform={`translate(18, ${y_C + 3})`}>
              <circle
                r={8}
                fill={PHYSICS_COLORS.referencePoint}
                fillOpacity={0.15}
                stroke={PHYSICS_COLORS.referencePoint}
                strokeWidth={1.2}
              />
              <text fill={PHYSICS_COLORS.referencePoint} fontSize={9} dy='0.31em'>
                C
              </text>
            </g>
            <g transform={`translate(18, ${y_D + 3})`}>
              <circle
                r={8}
                fill={PHYSICS_COLORS.heatLoss}
                fillOpacity={0.15}
                stroke={PHYSICS_COLORS.heatLoss}
                strokeWidth={1.2}
              />
              <text fill={PHYSICS_COLORS.heatLoss} fontSize={9} dy='0.31em'>
                D
              </text>
            </g>
          </g>

          {/* 右侧特征文字标签 (仅直观高度对齐视图下显示) */}
          {viewMode === 'y-E' && (
            <g fontSize={9.5} fill={CANVAS_COLORS.labelTextLight} textAnchor='start'>
              {mode === 0 && (
                <text x={650} y={y_A + 3}>
                  A (释放点)
                </text>
              )}
              <text x={650} y={y_B + 3}>
                B (原长点)
              </text>
              <text x={650} y={y_C + 3} fill={PHYSICS_COLORS.frictionStatic}>
                C (平衡位置)
              </text>
              <text x={650} y={y_D + 3} fill={PHYSICS_COLORS.tangentLine}>
                D (最低点)
              </text>
            </g>
          )}

          {/* ── 左区：物理动画 ── */}
          <g>
            {mode === 1 ? (
              <g transform='scale(1, -1) translate(0, -100)'>
                <PhysicsGround
                  x={centerX - 40}
                  y={80}
                  width={80}
                  type='bracket'
                  appearance={{ color: CANVAS_COLORS.labelTextLight }}
                />
              </g>
            ) : (
              <PhysicsGround
                x={centerX - 40}
                y={y_ground}
                width={80}
                type='bracket'
                appearance={{ color: CANVAS_COLORS.labelTextLight }}
              />
            )}

            {mode === 0 && (
              <PhysicsGround
                x={centerX - 65}
                y={y_ground + 8}
                width={130}
                type='ground'
                appearance={{ color: CANVAS_COLORS.trackHistory }}
              />
            )}

            <Spring
              x1={centerX}
              y1={springTopY}
              x2={centerX}
              y2={springBottomY}
              coils={12}
              radius={11}
            />

            <Ball
              cx={centerX}
              cy={ballY}
              r={14}
              type='oscillatorMetal'
              stroke={SCENE_COLORS.sphere.oscillatorMetal.stroke}
              strokeWidth={1.5}
            />

            {showVectors && (
              <g>
                <VectorArrow
                  origin={{ x: centerX, y: -ballY }}
                  vector={{ x: 0, y: -m * g }}
                  type='gravity'
                  color={PHYSICS_COLORS.gravity}
                  sceneScale={springSceneScale}
                  label='G'
                />

                {mode === 1
                  ? state.x > 0 && (
                    <VectorArrow
                      origin={{ x: centerX, y: -(ballY - 14) }}
                      vector={{ x: 0, y: state.F_spring }}
                      type='elasticForce'
                      color={PHYSICS_COLORS.elasticForce}
                      sceneScale={springSceneScale}
                      label='F弹'
                    />
                  )
                  : state.x >= 0 && (
                    <VectorArrow
                      origin={{ x: centerX, y: -(ballY + 14) }}
                      vector={{ x: 0, y: state.F_spring }}
                      type='elasticForce'
                      color={PHYSICS_COLORS.elasticForce}
                      sceneScale={springSceneScale}
                      label='F弹'
                    />
                  )}

                {Math.abs(state.v) > 0.05 && (
                  <VectorArrow
                    origin={{ x: centerX - 23, y: -ballY }}
                    vector={{ x: 0, y: -state.v }}
                    type='velocity'
                    color={PHYSICS_COLORS.velocity}
                    sceneScale={springSceneScale}
                    label='v'
                  />
                )}

                {Math.abs(state.a) > 0.05 && (
                  <VectorArrow
                    origin={{ x: centerX + 23, y: -ballY }}
                    vector={{ x: 0, y: -state.a }}
                    type='acceleration'
                    color={PHYSICS_COLORS.acceleration}
                    sceneScale={springSceneScale}
                    label='a'
                  />
                )}
              </g>
            )}
          </g>

          {/* ── 中区：能量图表 ── */}
          <g transform='translate(195, 25)'>
            <BasePhysicsChart
              xDomain={viewMode === 'E-x' ? [0, x_max_phys] : [0, E_max]}
              yDomain={viewMode === 'E-x' ? [0, E_max] : [-xD_phys, mode === 1 ? 0 : h]}
              xLabel={viewMode === 'E-x' ? 'x (m)' : 'E (J)'}
              yLabel={viewMode === 'E-x' ? 'E (J)' : 'y (m)'}
              title={viewMode === 'E-x' ? '能量 - 位移图像 (E - x)' : '能量 - 高度图像 (E - y)'}
              fixedSize={{ width: 230, height: 350 }}
              showGrid={false}
              gridCount={{ x: 4, y: 5 }}
              formatX={
                viewMode === 'E-x'
                  ? (v: number) => `${v.toFixed(1)}m`
                  : (v: number) => `${v.toFixed(0)}J`
              }
              formatY={viewMode === 'E-x' ? (v: number) => `${v.toFixed(0)}J` : () => ''}
            >
              <SpringEnergyChartContent
                m={m}
                k={k}
                h={mode === 1 ? 0 : h}
                xD_phys={xD_phys}
                g={g}
                state={state}
                mode={mode}
                viewMode={viewMode}
                E_max={E_max}
              />
            </BasePhysicsChart>
          </g>

          {/* ── 右区：合外力图表 ── */}
          <g transform='translate(445, 25)'>
            <BasePhysicsChart
              xDomain={viewMode === 'E-x' ? [0, x_max_phys] : [-F_max, F_max]}
              yDomain={viewMode === 'E-x' ? [-F_max, F_max] : [-xD_phys, mode === 1 ? 0 : h]}
              yDomain2={viewMode === 'E-x' ? [-v_max, v_max] : undefined}
              xLabel={viewMode === 'E-x' ? 'x (m)' : 'F合 (N)'}
              yLabel={viewMode === 'E-x' ? 'F合 (N)' : ''}
              yLabel2={viewMode === 'E-x' ? 'v (m/s)' : undefined}
              title={
                viewMode === 'E-x' ? '合外力 / 速度 - 位移图像 (F/v - x)' : '合外力 - 高度图像 (F合 - y)'
              }
              fixedSize={{ width: 200, height: 350 }}
              showGrid={false}
              gridCount={{ x: 4, y: 5 }}
              formatX={
                viewMode === 'E-x'
                  ? (v: number) => `${v.toFixed(1)}m`
                  : (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}N`
              }
              formatY={
                viewMode === 'E-x' ? (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}N` : () => ''
              }
              formatY2={
                viewMode === 'E-x' ? (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}` : undefined
              }
              yBaseline={0}
              yBaseline2={0}
            >
              <SpringForceChartContent
                m={m}
                k={k}
                h={mode === 1 ? 0 : h}
                xD_phys={xD_phys}
                g={g}
                state={state}
                mode={mode}
                yPhysMax={mode === 1 ? 0 : h}
                viewMode={viewMode}
                F_max={F_max}
              />
            </BasePhysicsChart>
          </g>

          {/* ── 左区小球实时滑动高度光标 (仅在直观对齐或左侧动画区边界内渲染，不跨越干扰标准图像) ── */}
          <g>
            <line
              x1={30}
              y1={ballY}
              x2={viewMode === 'y-E' ? 645 : 105}
              y2={ballY}
              stroke={CANVAS_COLORS.trackHistory}
              strokeWidth={1}
              strokeDasharray='2,2'
              opacity={0.8}
            />
            <polygon
              points={`30,${ballY - 4.5} 36,${ballY} 30,${ballY + 4.5}`}
              fill={CANVAS_COLORS.labelTextLight}
            />
          </g>
        </g>
      </svg>

      {/* 自动暂停教学定格卡片 (毛玻璃+微动效) */}
      {showPauseTip && (
        <div className='absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-amber-50/95 backdrop-blur-md border border-amber-200 shadow-xl rounded-lg text-xs text-amber-950 flex items-start gap-2.5 max-w-[85%] animate-in fade-in slide-in-from-top-2 duration-300 z-50'>
          <span className='shrink-0 text-amber-500 font-bold text-sm leading-none'>💡</span>
          <div className='leading-normal'>
            <strong>已在平衡位置（C点）自动定格：</strong>此时重力等于弹力，合外力为零（a =
            0），小球的<strong>速度与动能达到全过程的最大值</strong>。点击下方播放按钮可继续运动。
          </div>
          <button
            onClick={() => setShowPauseTip(false)}
            className='shrink-0 text-amber-400 hover:text-amber-600 ml-1 font-bold text-base leading-none transition-colors'
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
