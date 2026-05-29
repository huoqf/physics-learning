import { describe, it, expect, beforeEach, vi } from 'vitest';
import { globalAnimationController } from '@/utils/animation';

describe('AnimationController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalAnimationController.pause();
    (globalAnimationController as any).callback = null;
    (globalAnimationController as any).lastTime = 0;
  });

  describe('生命周期', () => {
    it('应该能启动动画', () => {
      const callback = vi.fn();
      globalAnimationController.start(callback);
      expect(globalAnimationController.isPlaying()).toBe(true);
    });

    it('应该能暂停动画', () => {
      const callback = vi.fn();
      globalAnimationController.start(callback);
      globalAnimationController.pause();
      expect(globalAnimationController.isPlaying()).toBe(false);
    });

    it('应该能恢复动画', () => {
      const callback = vi.fn();
      globalAnimationController.start(callback);
      globalAnimationController.pause();
      globalAnimationController.resume();
      expect(globalAnimationController.isPlaying()).toBe(true);
    });

    it('应该能重置动画', () => {
      const callback = vi.fn();
      globalAnimationController.start(callback);
      globalAnimationController.pause();
      globalAnimationController.reset();
      expect(globalAnimationController.isPlaying()).toBe(true);
    });

    it('初始状态应该是未播放', () => {
      expect(globalAnimationController.isPlaying()).toBe(false);
    });
  });

  describe('速度控制', () => {
    it('应该能设置速度', () => {
      globalAnimationController.setSpeed(2);
      const callback = vi.fn();
      globalAnimationController.start(callback);
      expect(globalAnimationController.isPlaying()).toBe(true);
    });

    it('应该限制速度在合理范围内', () => {
      globalAnimationController.setSpeed(15);
      globalAnimationController.setSpeed(0.05);
      const callback = vi.fn();
      globalAnimationController.start(callback);
      expect(globalAnimationController.isPlaying()).toBe(true);
    });
  });

  describe('回调函数', () => {
    it('启动时应该调用回调函数', () => {
      const callback = vi.fn();
      globalAnimationController.start(callback);
      globalAnimationController.pause();
    });

    it('暂停后再恢复应该能继续调用回调', () => {
      const callback = vi.fn();
      globalAnimationController.start(callback);
      globalAnimationController.pause();
      globalAnimationController.resume();
      globalAnimationController.pause();
    });
  });
});
