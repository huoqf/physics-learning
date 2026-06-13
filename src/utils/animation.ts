import { useEffect, useRef } from 'react';

type AnimationCallback = (deltaTime: number) => void;

function clampSpeed(speed: number): number {
  return Math.max(0.1, Math.min(speed, 10));
}

export interface UseAnimationFrameOptions {
  /** 是否正在播放 */
  playing: boolean;
  /** 播放速度倍率（钳制在 0.1–10） */
  speed?: number;
}

/**
 * 按组件实例运行的动画帧 Hook（统一动画控制入口，遵循「禁止组件自行调用 rAF」铁律）。
 *
 * - 每个调用方持有独立 rAF 循环，支持多动画同屏 / 对比；
 * - 生命周期跟随组件，卸载自动清理，规避 StrictMode 双挂载与快速切换的竞态；
 * - 无共享可变状态，便于隔离测试。
 *
 * @param callback 每帧回调，入参为按 speed 缩放后的 deltaTime（毫秒）
 * @param options  playing / speed 控制
 */
export function useAnimationFrame(
  callback: AnimationCallback,
  { playing, speed = 1 }: UseAnimationFrameOptions
): void {
  const callbackRef = useRef(callback);
  const speedRef = useRef(speed);

  // 始终保存最新的回调与速度，避免因其变化重启 rAF 循环
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    speedRef.current = clampSpeed(speed);
  }, [speed]);

  useEffect(() => {
    if (!playing) return;

    let frameId: number;
    // 用 null 作未初始化哨兵，避免首帧时间戳恰为 0 被误判为未初始化
    let lastTime: number | null = null;

    const loop = (currentTime: number) => {
      if (lastTime === null) {
        lastTime = currentTime;
      }
      const deltaTime = (currentTime - lastTime) * speedRef.current;
      lastTime = currentTime;
      callbackRef.current(deltaTime);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [playing]);
}

export interface UseSimulationFrameOptions {
  /**
   * 是否激活仿真循环。
   * 与 `useAnimationFrame` 的 `playing` 不同：
   * - `playing` 受全局动画播放/暂停控制，暂停时 rAF 停止；
   * - `active` 仅控制仿真是否推进，rAF 循环始终运行（即使暂停也保持帧驱动，
   *   以便物理交互如拖拽仍能响应）。
   *
   * 默认 `true`（组件挂载即运行）。
   */
  active?: boolean;
  /**
   * 最大允许 deltaTime（毫秒）。
   * 超过此值的帧会被截断，防止窗口失焦或卡顿导致积分发散。
   * 默认 33ms（约 30fps）。
   */
  maxDeltaMs?: number;
}

/**
 * 物理仿真专用帧 Hook（统一 rAF 入口，遵循「禁止组件自行调用 rAF」铁律）。
 *
 * 与 `useAnimationFrame` 的区别：
 * - **始终运行**：组件挂载即启动 rAF 循环，不受全局 `isPlaying` 控制；
 *   适用于需要持续物理响应的场景（如拖拽交互、弹簧仿真）。
 * - **deltaTime 截断**：内置 `maxDeltaMs` 保护，防止大步长导致数值积分发散。
 * - **active 控制**：通过 `active` 参数暂停/恢复仿真推进（rAF 循环不中断，
 *   仅跳过回调），保持帧驱动以便恢复后无冷启动延迟。
 *
 * @param callback 每帧回调，入参为 deltaTime（毫秒，已截断）
 * @param options  active / maxDeltaMs 控制
 */
export function useSimulationFrame(
  callback: AnimationCallback,
  { active = true, maxDeltaMs = 33 }: UseSimulationFrameOptions = {}
): void {
  const callbackRef = useRef(callback);
  const activeRef = useRef(active);
  const maxDeltaRef = useRef(maxDeltaMs);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    maxDeltaRef.current = maxDeltaMs;
  }, [maxDeltaMs]);

  useEffect(() => {
    let frameId: number;
    let lastTime: number | null = null;

    const loop = (currentTime: number) => {
      if (lastTime !== null && activeRef.current) {
        let deltaTime = currentTime - lastTime;
        if (deltaTime > maxDeltaRef.current) {
          deltaTime = maxDeltaRef.current;
        }
        callbackRef.current(deltaTime);
      }
      lastTime = currentTime;
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);
}
