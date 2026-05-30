import { useEffect, useRef } from 'react';

type AnimationCallback = (deltaTime: number) => void;

interface AnimationController {
  start: (callback: AnimationCallback) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  isPlaying: () => boolean;
}

class AnimationControllerImpl implements AnimationController {
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private callback: AnimationCallback | null = null;
  private speed: number = 1;
  private playing: boolean = false;

  private loop = (currentTime: number) => {
    if (!this.playing || !this.callback) return;

    if (this.lastTime === 0) {
      this.lastTime = currentTime;
    }

    const deltaTime = (currentTime - this.lastTime) * this.speed;
    this.lastTime = currentTime;

    this.callback(deltaTime);
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  start(callback: AnimationCallback) {
    this.callback = callback;
    this.playing = true;
    this.lastTime = 0;
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  pause() {
    this.playing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume() {
    if (!this.playing && this.callback) {
      this.playing = true;
      this.lastTime = 0;
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  }

  reset() {
    this.pause();
    this.lastTime = 0;
    if (this.callback) {
      this.start(this.callback);
    }
  }

  setSpeed(speed: number) {
    this.speed = Math.max(0.1, Math.min(speed, 10));
  }

  isPlaying(): boolean {
    return this.playing;
  }
}

export const globalAnimationController = new AnimationControllerImpl();

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
 * 相比全局单例 `globalAnimationController`：
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
